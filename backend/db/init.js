// Створює таблиці в Neon (schema.sql) і, якщо вони порожні, наповнює прикладами (seed.sql)
// Запуск: npm run db:init

const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

  console.log('▶ Створюю таблиці...');
  await pool.query(schema);
  console.log('✅ Таблиці готові.');

  console.log('▶ Додаю приклади даних (категорії/товари/відгуки)...');
  await pool.query(seed);
  console.log('✅ Дані додано (якщо ще не існували).');

  await pool.end();
  console.log('🎉 Готово! База даних Neon налаштована.');
}

run().catch((err) => {
  console.error('❌ Помилка ініціалізації БД:', err);
  process.exit(1);
});
