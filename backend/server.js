require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const categoriesRouter = require('./routes/categories');
const productsRouter = require('./routes/products');
const reviewsRouter = require('./routes/reviews');
const ordersRouter = require('./routes/orders');
const uploadRouter = require('./routes/upload');
const novaposhtaRouter = require('./routes/novaposhta');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Завантажені фото товарів (папка backend/uploads) — доступні за /uploads/файл.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/novaposhta', novaposhtaRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Динамічний sitemap.xml — завжди відображає актуальні товари й категорії з БД
app.get('/sitemap.xml', async (req, res) => {
  try {
    const pool = require('./db/pool');
    const SITE_URL = process.env.SITE_URL || 'https://murattehnika.com.ua';
    const products = await pool.query('SELECT slug, updated_at FROM products WHERE is_active = true');
    const categories = await pool.query('SELECT slug FROM categories WHERE is_active = true');

    const urls = [
      { loc: `${SITE_URL}/`, priority: '1.0' },
      ...categories.rows.map((c) => ({ loc: `${SITE_URL}/?category=${c.slug}`, priority: '0.7' })),
      ...products.rows.map((p) => ({ loc: `${SITE_URL}/product.html?slug=${p.slug}`, priority: '0.8', lastmod: p.updated_at })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Помилка генерації sitemap');
  }
});

// Роздаємо фронтенд (папку ../frontend) як статичні файли
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Для всіх інших маршрутів (крім /api/*) — віддаємо index.html (SPA-fallback)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MuratTeхніка сервер запущено: http://localhost:${PORT}`);
});
