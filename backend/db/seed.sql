-- ========================================================
-- Початкові дані для MuratTeхніка
-- Товари поки що ЗАГЛУШКИ — заміните ціни/описи/фото коли клієнт надішле інформацію
-- (через адмін-панель або прямо тут)
-- ========================================================

INSERT INTO categories (name, slug, icon, sort_order) VALUES
    ('AirPods 2',      'airpods-2',      '🎧', 1),
    ('AirPods 3',      'airpods-3',      '🎧', 2),
    ('AirPods 4',      'airpods-4',      '🎧', 3),
    ('AirPods Pro 2',  'airpods-pro-2',  '🎧', 4),
    ('AirPods Pro 3',  'airpods-pro-3',  '🎧', 5)
ON CONFLICT (slug) DO NOTHING;

-- Приклад по одному товару в кожній категорії — відредагуйте/додайте свої
INSERT INTO products (category_id, name, slug, short_description, description, price, old_price, image_url, in_stock, sort_order)
SELECT id, 'AirPods 2 (копія, 1:1)', 'airpods-2-standard',
       'Найпопулярніша модель. Автономність до 24 год з кейсом.',
       'AirPods 2 — точна копія навушників Apple. Сенсорне керування, автопідключення до iPhone/Android, індикатор заряду, чохол для бездротової зарядки. Ідеальний баланс ціни та якості звуку.',
       699.00, 899.00, '', true, 1
FROM categories WHERE slug = 'airpods-2'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, short_description, description, price, old_price, image_url, in_stock, sort_order)
SELECT id, 'AirPods 3 (копія, 1:1)', 'airpods-3-standard',
       'Оновлений дизайн, покращений бас та автономність.',
       'AirPods 3 — покращена версія з адаптивним EQ, просторовим звуком та вологозахистом. Швидке підключення, зручна посадка, кейс MagSafe (імітація бездротової зарядки).',
       799.00, NULL, '', true, 1
FROM categories WHERE slug = 'airpods-3'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, short_description, description, price, old_price, image_url, in_stock, sort_order)
SELECT id, 'AirPods 4 (копія, 1:1)', 'airpods-4-standard',
       'Найновіша лінійка. Легкі, компактні, чіткий звук.',
       'AirPods 4 — сучасна модель з покращеним чипом, стабільним Bluetooth-з''єднанням та тривалою автономністю. Підходить як для дзвінків, так і для музики/ігор.',
       899.00, NULL, '', true, 1
FROM categories WHERE slug = 'airpods-4'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, short_description, description, price, old_price, image_url, in_stock, sort_order)
SELECT id, 'AirPods Pro 2 (копія, 1:1)', 'airpods-pro-2-standard',
       'Активне шумозаглушення (ANC) та прозорий режим.',
       'AirPods Pro 2 — топова копія з активним шумозаглушенням, режимом прозорості, персоналізованим просторовим звуком та захистом від вологи. У комплекті змінні насадки різних розмірів.',
       1199.00, 1399.00, '', true, 1
FROM categories WHERE slug = 'airpods-pro-2'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, short_description, description, price, old_price, image_url, in_stock, sort_order)
SELECT id, 'AirPods Pro 3 (копія, 1:1)', 'airpods-pro-3-standard',
       'Флагманська модель з найкращим ANC на ринку копій.',
       'AirPods Pro 3 — найдосконаліша модель лінійки: покращене активне шумозаглушення, датчики визначення посадки, індивідуальна калібровка звуку. Максимально наближено до оригіналу за відчуттями.',
       1399.00, NULL, '', true, 1
FROM categories WHERE slug = 'airpods-pro-3'
ON CONFLICT (slug) DO NOTHING;

-- Приклади відгуків
INSERT INTO reviews (product_id, author_name, rating, text)
SELECT id, 'Олександр', 5, 'Звук дуже гарний, автопідключення працює як треба. Рекомендую!'
FROM products WHERE slug = 'airpods-pro-2-standard';

INSERT INTO reviews (product_id, author_name, rating, text)
SELECT id, 'Марина', 4, 'Прийшло швидко, Новою поштою. Якість хороша за такі гроші.'
FROM products WHERE slug = 'airpods-2-standard';
