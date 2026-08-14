const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const adminAuth = require('../middleware/adminAuth');

// POST /api/reviews — залишити відгук (публічно, доступно всім відвідувачам)
router.post('/', async (req, res) => {
  try {
    const { product_id, author_name, rating, text } = req.body;

    if (!product_id || !author_name || !rating) {
      return res.status(400).json({ error: 'Поля product_id, author_name, rating обовʼязкові' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Оцінка має бути від 1 до 5' });
    }

    const { rows } = await pool.query(
      `INSERT INTO reviews (product_id, author_name, rating, text) VALUES ($1,$2,$3,$4) RETURNING *`,
      [product_id, author_name, rating, text || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка додавання відгуку' });
  }
});

// GET /api/reviews?product_id=... — усі відгуки товару
router.get('/', async (req, res) => {
  try {
    const { product_id } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM reviews WHERE product_id = $1 AND is_approved = true ORDER BY created_at DESC`,
      [product_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання відгуків' });
  }
});

// DELETE /api/reviews/:id — видалити/промодерувати відгук (адмін)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка видалення відгуку' });
  }
});

module.exports = router;
