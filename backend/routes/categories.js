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

// GET /api/categories — публічний список активних категорій
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true) AS products_count
       FROM categories c
       WHERE c.is_active = true
       ORDER BY c.sort_order ASC, c.id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання категорій' });
  }
});

// POST /api/categories — створити категорію (адмін)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Поле name обовʼязкове' });
    const slug = slugify(name);
    const { rows } = await pool.query(
      `INSERT INTO categories (name, slug, icon, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, slug, icon || null, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка створення категорії' });
  }
});

// PUT /api/categories/:id — редагувати категорію (адмін)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, icon, sort_order, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE categories SET
         name = COALESCE($1, name),
         icon = COALESCE($2, icon),
         sort_order = COALESCE($3, sort_order),
         is_active = COALESCE($4, is_active)
       WHERE id = $5 RETURNING *`,
      [name || null, icon || null, sort_order ?? null, is_active ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Категорію не знайдено' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка оновлення категорії' });
  }
});

// DELETE /api/categories/:id — видалити категорію (адмін)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка видалення категорії' });
  }
});

module.exports = router;
