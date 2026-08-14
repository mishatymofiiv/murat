const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ Не знайдено DATABASE_URL у .env. Скопіюйте .env.example у .env і вкажіть рядок підключення з Neon.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Неочікувана помилка пулу підключень до БД', err);
});

module.exports = pool;
