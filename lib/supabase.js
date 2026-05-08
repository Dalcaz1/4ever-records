// lib/supabase.js — Database client for 4 Ever Memories Records
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Server-side client with elevated permissions
export const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/* ─────────────────────────────────────────────────────────────────
   DATABASE SCHEMA — Run this SQL in your Supabase SQL editor
   Go to: Supabase Dashboard → SQL Editor → New Query → Paste → Run
   ───────────────────────────────────────────────────────────────── */
export const SCHEMA_SQL = `
-- Records inventory table
CREATE TABLE IF NOT EXISTS records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku           TEXT UNIQUE NOT NULL,         -- e.g. 4EMR-0001
  artist        TEXT NOT NULL,
  title         TEXT NOT NULL,
  label         TEXT,
  year          INTEGER,
  genre         TEXT,
  condition     TEXT,                          -- M, NM, VG+, VG, G
  price         DECIMAL(10,2) NOT NULL,
  description   TEXT,
  photo_url     TEXT,                          -- Supabase Storage URL
  discogs_id    TEXT,
  weight_oz     DECIMAL(6,2) DEFAULT 7.0,     -- for USPS shipping calc
  sold          BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number    TEXT UNIQUE NOT NULL,        -- e.g. 4EMR-ORD-0001
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  ship_to_name    TEXT NOT NULL,
  ship_to_address TEXT NOT NULL,
  ship_to_city    TEXT NOT NULL,
  ship_to_state   TEXT NOT NULL,
  ship_to_zip     TEXT NOT NULL,
  record_id       UUID REFERENCES records(id),
  record_snapshot JSONB,                       -- snapshot of record at time of sale
  subtotal        DECIMAL(10,2) NOT NULL,
  shipping_cost   DECIMAL(10,2) NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  square_payment_id TEXT,
  usps_tracking   TEXT,
  shipping_method TEXT,                        -- USPS Priority, Media Mail, etc.
  status          TEXT DEFAULT 'pending',      -- pending, paid, shipped, delivered, cancelled
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- SKU counter table (auto-increment inventory numbers)
CREATE TABLE IF NOT EXISTS sku_counter (
  id    INTEGER PRIMARY KEY DEFAULT 1,
  value INTEGER DEFAULT 0
);
INSERT INTO sku_counter (id, value) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- Order number counter
CREATE TABLE IF NOT EXISTS order_counter (
  id    INTEGER PRIMARY KEY DEFAULT 1,
  value INTEGER DEFAULT 0
);
INSERT INTO order_counter (id, value) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Public can read available records (not sold)
CREATE POLICY "Public read available records"
  ON records FOR SELECT USING (sold = false);

-- Public can create orders
CREATE POLICY "Public insert orders"
  ON orders FOR INSERT WITH CHECK (true);

-- Create storage bucket for record photos
-- (Run this in Supabase Storage settings or via API)
-- Bucket name: record-photos (public bucket)

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_records_artist ON records (lower(artist));
CREATE INDEX IF NOT EXISTS idx_records_title ON records (lower(title));
CREATE INDEX IF NOT EXISTS idx_records_label ON records (lower(label));
CREATE INDEX IF NOT EXISTS idx_records_genre ON records (genre);
CREATE INDEX IF NOT EXISTS idx_records_sold ON records (sold);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
`

// ── Helper functions ────────────────────────────────────────────

export async function getNextSku() {
  const { data, error } = await supabaseAdmin()
    .rpc('increment_sku_counter')
  if (error) throw error
  const num = String(data).padStart(4, '0')
  return `4EMR-${num}`
}

export async function getNextOrderNumber() {
  const { data, error } = await supabaseAdmin()
    .rpc('increment_order_counter')
  if (error) throw error
  const num = String(data).padStart(4, '0')
  return `4EMR-ORD-${num}`
}

export async function getRecords({ search, genre, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('records')
    .select('*')
    .eq('sold', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (genre && genre !== 'all') query = query.eq('genre', genre)

  if (search) {
    query = query.or(
      `artist.ilike.%${search}%,title.ilike.%${search}%,label.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getRecord(id) {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getOrders({ status, limit = 50 } = {}) {
  let query = supabaseAdmin()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getInventoryStats() {
  const { data: records } = await supabaseAdmin()
    .from('records')
    .select('price, sold, genre, created_at')

  const total = records?.length || 0
  const available = records?.filter(r => !r.sold).length || 0
  const sold = records?.filter(r => r.sold).length || 0
  const totalValue = records
    ?.filter(r => !r.sold)
    .reduce((sum, r) => sum + parseFloat(r.price), 0) || 0

  return { total, available, sold, totalValue }
}
