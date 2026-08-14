const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const adminAuth = require('../middleware/adminAuth');
const { sendTelegramMessage, formatOrderMessage } = require('../utils/telegram');

// POST /api/orders — оформити замовлення (публічно, з кошика на сайті)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_name, phone, city,
      delivery_method, payment_method, comment,
      np_city_name, np_city_ref, np_warehouse_name, np_warehouse_ref,
      ukrposhta_index, ukrposhta_address,
      items, // [{ product_id, quantity }]
    } = req.body;

    if (!customer_name || !phone || !delivery_method || !payment_method || !items?.length) {
      return res.status(400).json({ error: 'Заповніть імʼя, телефон, спосіб доставки, спосіб оплати і додайте товари в кошик' });
    }

    if (delivery_method === 'novaposhta' && (!np_city_name || !np_warehouse_name)) {
      return res.status(400).json({ error: 'Оберіть місто та відділення Нової пошти' });
    }
    if (delivery_method === 'ukrposhta' && (!ukrposhta_index || !ukrposhta_address)) {
      return res.status(400).json({ error: 'Вкажіть поштовий індекс і точну адресу для Укрпошти' });
    }

    await client.query('BEGIN');

    // Рахуємо суму по реальних цінах з БД (щоб не довіряти цінам з фронтенду)
    let total = 0;
    const preparedItems = [];
    for (const item of items) {
      const { rows } = await client.query('SELECT id, name, price FROM products WHERE id = $1', [item.product_id]);
      if (!rows.length) continue;
      const product = rows[0];
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      total += parseFloat(product.price) * qty;
      preparedItems.push({ product_id: product.id, product_name: product.name, price: product.price, quantity: qty });
    }

    if (!preparedItems.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Жоден товар із кошика не знайдено' });
    }

    const orderResult = await client.query(
      `INSERT INTO orders
        (customer_name, phone, city, delivery_method, payment_method, comment, total,
         np_city_name, np_city_ref, np_warehouse_name, np_warehouse_ref,
         ukrposhta_index, ukrposhta_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        customer_name, phone, city || null, delivery_method, payment_method, comment || null, total,
        np_city_name || null, np_city_ref || null, np_warehouse_name || null, np_warehouse_ref || null,
        ukrposhta_index || null, ukrposhta_address || null,
      ]
    );
    const order = orderResult.rows[0];

    for (const item of preparedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.product_id, item.product_name, item.price, item.quantity]
      );
    }

    await client.query('COMMIT');

    // Сповіщення в Telegram — не блокує відповідь клієнту, якщо Telegram недоступний
    sendTelegramMessage(formatOrderMessage(order, preparedItems)).catch(() => {});

    res.status(201).json({ ...order, items: preparedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Помилка оформлення замовлення' });
  } finally {
    client.release();
  }
});

// GET /api/orders — список замовлень з товарами (адмін)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { rows: orders } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const { rows: items } = await pool.query('SELECT * FROM order_items ORDER BY id ASC');
    const itemsByOrder = {};
    items.forEach((i) => {
      if (!itemsByOrder[i.order_id]) itemsByOrder[i.order_id] = [];
      itemsByOrder[i.order_id].push(i);
    });
    const result = orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання замовлень' });
  }
});

// GET /api/orders/:id — деталі замовлення (адмін)
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const order = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Замовлення не знайдено' });
    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ ...order.rows[0], items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання замовлення' });
  }
});

// PATCH /api/orders/:id/shipped — позначити замовлення відправленим / не відправленим (адмін)
router.patch('/:id/shipped', adminAuth, async (req, res) => {
  try {
    const { is_shipped } = req.body;
    const { rows } = await pool.query(
      `UPDATE orders SET is_shipped = $1, status = CASE WHEN $1 THEN 'shipped' ELSE 'processing' END WHERE id = $2 RETURNING *`,
      [!!is_shipped, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Замовлення не знайдено' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка оновлення статусу відправки' });
  }
});

// PATCH /api/orders/:id/status — змінити довільний статус замовлення (адмін)
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'processing', 'shipped', 'done', 'canceled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Статус має бути одним з: ${allowed.join(', ')}` });
    }
    const { rows } = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Замовлення не знайдено' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка оновлення статусу' });
  }
});

module.exports = router;
