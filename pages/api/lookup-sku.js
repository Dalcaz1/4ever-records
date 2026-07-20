// pages/api/lookup-sku.js
// Exact-match SKU lookup for Checkout Mode. Deliberately separate from
// records.js (which is search/browse-oriented, filtered to active items
// only) — checkout needs an exact match and needs to distinguish "not
// found" from "found but already sold" as two different, clearly
// different error states for the person scanning.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { sku } = req.query;
  if (!sku) return res.status(400).json({ error: 'Missing sku' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('records')
      .select('id, sku, artist, title, price, condition, category, active, qty, photo_cover')
      .ilike('sku', sku.trim())
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No item found with SKU "' + sku + '"' });
    if (!data.active || data.qty < 1) {
      return res.status(409).json({ error: data.artist + ' — ' + data.title + ' (' + data.sku + ') is already marked sold.', record: data });
    }
    return res.status(200).json({ record: data });
  } catch (err) {
    console.error('lookup-sku error:', err);
    return res.status(500).json({ error: err.message });
  }
}
