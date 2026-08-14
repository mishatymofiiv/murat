-- ========================================================
-- MuratTeхніка — схема бази даних (Neon Postgres)
-- ========================================================

CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) UNIQUE NOT NULL,
    icon        VARCHAR(10),              -- емодзі-іконка категорії, напр. "🎧"
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id                SERIAL PRIMARY KEY,
    category_id       INT REFERENCES categories(id) ON DELETE SET NULL,
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) UNIQUE NOT NULL,
    short_description VARCHAR(500),        -- короткий опис для картки товару
    description       TEXT,                -- повний опис для сторінки товару
    price             NUMERIC(10,2) NOT NULL,
    old_price         NUMERIC(10,2),        -- якщо є знижка, показуємо закреслену ціну
    image_url         TEXT,                 -- головне фото
    in_stock          BOOLEAN DEFAULT true,
    is_active         BOOLEAN DEFAULT true, -- щоб адмін міг "приховати" товар не видаляючи
    sort_order        INT DEFAULT 0,
    created_at        TIMESTAMP DEFAULT now(),
    updated_at        TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
    id          SERIAL PRIMARY KEY,
    product_id  INT REFERENCES products(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,
    sort_order  INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
    id           SERIAL PRIMARY KEY,
    product_id   INT REFERENCES products(id) ON DELETE CASCADE,
    author_name  VARCHAR(255) NOT NULL,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text         TEXT,
    is_approved  BOOLEAN DEFAULT true,   -- на майбутнє: адмін зможе модерувати відгуки
    created_at   TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id               SERIAL PRIMARY KEY,
    customer_name    VARCHAR(255) NOT NULL,
    phone            VARCHAR(50)  NOT NULL,
    city             VARCHAR(255),
    delivery_method  VARCHAR(50)  NOT NULL,  -- 'ukrposhta' | 'novaposhta'

    -- Нова пошта: обране відділення
    np_city_name       VARCHAR(255),
    np_city_ref        VARCHAR(100),
    np_warehouse_name  VARCHAR(255),
    np_warehouse_ref   VARCHAR(100),

    -- Укрпошта: індекс і точна адреса
    ukrposhta_index    VARCHAR(20),
    ukrposhta_address  TEXT,

    payment_method   VARCHAR(50)  NOT NULL,  -- 'prepay_full' | 'online'
    comment          TEXT,
    status           VARCHAR(50) DEFAULT 'new', -- new -> processing -> shipped -> done / canceled
    is_shipped       BOOLEAN DEFAULT false,      -- простий прапорець "відправлено / не відправлено" для адмінки
    total            NUMERIC(10,2) NOT NULL,
    created_at       TIMESTAMP DEFAULT now()
);

-- На випадок, якщо таблиця orders вже існувала до цього оновлення схеми —
-- додаємо нові колонки, якщо їх ще немає (безпечно виконувати повторно)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_city_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_city_ref VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_warehouse_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_warehouse_ref VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ukrposhta_index VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ukrposhta_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_shipped BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS order_items (
    id            SERIAL PRIMARY KEY,
    order_id      INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id    INT REFERENCES products(id) ON DELETE SET NULL,
    product_name  VARCHAR(255) NOT NULL, -- зберігаємо назву на момент замовлення
    price         NUMERIC(10,2) NOT NULL,
    quantity      INT NOT NULL DEFAULT 1
);

-- Таблиця для майбутньої адмін-панелі (логін/пароль адміністратора)
CREATE TABLE IF NOT EXISTS admins (
    id             SERIAL PRIMARY KEY,
    username       VARCHAR(255) UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
