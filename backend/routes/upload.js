const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');

// Папка, куди зберігаються завантажені фото товарів.
// Роздається статично в server.js як /uploads
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('Дозволені лише формати JPG, PNG або WebP'));
    }
    cb(null, true);
  },
});

// POST /api/upload — завантажити одне фото (адмін). Повертає публічний URL.
router.post('/', adminAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Помилка завантаження файлу' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не отримано' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({
      url,
      filename: req.file.filename,
      size: req.file.size,
      recommendation: 'Для найкращої якості й швидкості завантаження сайту рекомендуємо WebP або JPG, квадратне фото 1200×1200px, до 500 КБ.',
    });
  });
});

module.exports = router;
