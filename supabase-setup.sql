-- ============================================================
-- SUPABASE SQL SETUP — 4 Ever Memories Records
-- ============================================================
-- Run ALL of this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Records inventory table
CREATE TABLE IF NOT EXISTS records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku           TEXT UNIQUE NOT NULL,
  artist        TEXT NOT NULL,
  title         TEXT NOT NULL,
  label         TEXT,
  year          INTEGER,
  genre         TEXT,
  condition     TEXT,
  price         DECIMAL(10,2) NOT NULL,
  description   TEXT,
  photo_url     TEXT,
  discogs_id    TEXT,
  weight_oz     DECIMAL(6,2) DEFAULT 7.0,
  sold          BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number      TEXT UNIQUE NOT NULL,
  customer_name     TEXT NOT NULL,
  customer_email    TEXT NOT NULL,
  customer_phone    TEXT,
  ship_to_name      TEXT NOT NULL,
  ship_to_address   TEXT NOT NULL,
  ship_to_city      TEXT NOT NULL,
  ship_to_state     TEXT NOT NULL,
  ship_to_zip       TEXT NOT NULL,
  record_id         UUID REFERENCES records(id),
  record_snapshot   JSONB,
  subtotal          DECIMAL(10,2) NOT NULL,
  shipping_cost     DECIMAL(10,2) NOT NULL,
  total             DECIMAL(10,2) NOT NULL,
  square_payment_id TEXT,
  usps_tracking     TEXT,
  shipping_method   TEXT,
  status            TEXT DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- SKU counter
CREATE TABLE IF NOT EXISTS sku_counter (
  id    INTEGER PRIMARY KEY DEFAULT 1,
  value INTEGER DEFAULT 0
);
INSERT INTO sku_counter (id, value) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- Order counter
CREATE TABLE IF NOT EXISTS order_counter (
  id    INTEGER PRIMARY KEY DEFAULT 1,
  value INTEGER DEFAULT 0
);
INSERT INTO order_counter (id, value) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- Auto-increment SKU function (thread-safe)
CREATE OR REPLACE FUNCTION increment_sku_counter()
RETURNS INTEGER AS $$
DECLARE new_val INTEGER;
BEGIN
  UPDATE sku_counter SET value = value + 1 WHERE id = 1
  RETURNING value INTO new_val;
  RETURN new_val;
END;
$$ LANGUAGE plpgsql;

-- Auto-increment order number function
CREATE OR REPLACE FUNCTION increment_order_counter()
RETURNS INTEGER AS $$
DECLARE new_val INTEGER;
BEGIN
  UPDATE order_counter SET value = value + 1 WHERE id = 1
  RETURNING value INTO new_val;
  RETURN new_val;
END;
$$ LANGUAGE plpgsql;

-- Security policies
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders  ENABLE ROW LEVEL SECURITY;

-- Public can view available records
DROP POLICY IF EXISTS "Public read records" ON records;
CREATE POLICY "Public read records"
  ON records FOR SELECT USING (sold = false);

-- Public can place orders
DROP POLICY IF EXISTS "Public insert orders" ON orders;
CREATE POLICY "Public insert orders"
  ON orders FOR INSERT WITH CHECK (true);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_records_artist ON records (lower(artist));
CREATE INDEX IF NOT EXISTS idx_records_title  ON records (lower(title));
CREATE INDEX IF NOT EXISTS idx_records_label  ON records (lower(label));
CREATE INDEX IF NOT EXISTS idx_records_genre  ON records (genre);
CREATE INDEX IF NOT EXISTS idx_records_sold   ON records (sold);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_email   ON orders (customer_email);

-- ============================================================
-- STORAGE SETUP (do this in Supabase Storage tab)
-- ============================================================
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New Bucket"
-- 3. Name it: record-photos
-- 4. Check "Public bucket" → Create
-- That's it — photos will be publicly accessible via URL
-- ============================================================
