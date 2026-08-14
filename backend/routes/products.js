const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const adminAuth = require('../middleware/adminAuth');

function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// GET /api/products?category=airpods-pro-2&search=... — публічний список
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const conditions = ['p.is_active = true'];
    const params = [];

    if (category) {
      params.push(category);
      conditions.push(`c.slug = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`p.name ILIKE $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              COALESCE(AVG(r.rating), 0)::numeric(3,2) AS rating_avg,
              COUNT(r.id) AS reviews_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r ON r.product_id = p.id AND r.is_approved = true
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id, c.name, c.slug
       ORDER BY p.sort_order ASC, p.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання товарів' });
  }
});

// GET /api/products/:slug — публічна картка товару (з фото і відгуками)
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1 AND p.is_active = true`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Товар не знайдено' });
    const product = rows[0];

    const images = await pool.query(
      `SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC`,
      [product.id]
    );
    const reviews = await pool.query(
      `SELECT * FROM reviews WHERE product_id = $1 AND is_approved = true ORDER BY created_at DESC`,
      [product.id]
    );

    res.json({ ...product, images: images.rows, reviews: reviews.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання товару' });
  }
});

// POST /api/products — створити товар (адмін)
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      category_id, name, short_description, description,
      price, old_price, image_url, in_stock, sort_order,
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Поля name і price обовʼязкові' });
    }

    const slug = slugify(name) + '-' + Date.now().toString(36);

    const { rows } = await pool.query(
      `INSERT INTO products
        (category_id, name, slug, short_description, description, price, old_price, image_url, in_stock, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        category_id || null, name, slug, short_description || null, description || null,
        price, old_price || null, image_url || null, in_stock ?? true, sort_order || 0,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка створення товару' });
  }
});

// PUT /api/products/:id — редагувати товар (адмін)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const {
      category_id, name, short_description, description,
      price, old_price, image_url, in_stock, is_active, sort_order,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE products SET
         category_id = COALESCE($1, category_id),
         name = COALESCE($2, name),
         short_description = COALESCE($3, short_description),
         description = COALESCE($4, description),
         price = COALESCE($5, price),
         old_price = $6,
         image_url = COALESCE($7, image_url),
         in_stock = COALESCE($8, in_stock),
         is_active = COALESCE($9, is_active),
         sort_order = COALESCE($10, sort_order),
         updated_at = now()
       WHERE id = $11 RETURNING *`,
      [
        category_id ?? null, name || null, short_description ?? null, description ?? null,
        price ?? null, old_price ?? null, image_url ?? null, in_stock ?? null,
        is_active ?? null, sort_order ?? null, req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Товар не знайдено' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка оновлення товару' });
  }
});

// DELETE /api/products/:id — видалити товар (адмін)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка видалення товару' });
  }
});

// POST /api/products/:id/images — додати фото товару (адмін)
router.post('/:id/images', adminAuth, async (req, res) => {
  try {
    const { image_url, sort_order } = req.body;
    if (!image_url) return res.status(400).json({ error: 'Поле image_url обовʼязкове' });
    const { rows } = await pool.query(
      `INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, image_url, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка додавання фото' });
  }
});

// DELETE /api/products/images/:imageId — видалити конкретне фото (адмін)
router.delete('/images/:imageId', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM product_images WHERE id = $1', [req.params.imageId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка видалення фото' });
  }
});

module.exports = router;
