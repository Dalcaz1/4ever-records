// FIX (July 22 session, direct user report): this endpoint has existed and
// worked the whole time, but nothing in admin.js's UI ever called it —
// there was no Delete button anywhere, matching the user's exact
// complaint ("no way of deleting an item"). Wiring it up now (see the new
// Delete Item button in the edit modal), and adding the one safety check
// it was missing: refusing to delete a record that already has a real
// recorded sale (sold_at set). The existing Active/Inactive toggle in
// update-record.js is deliberately tied to sold_price/sold_at tracking —
// deleting a genuinely sold item's row here would silently destroy real
// sales history. This endpoint is for a mis-scanned or duplicate item that
// never should have existed in the first place; the Inactive toggle is for
// an item that's actually sold.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing record id' });

    const { data: existing, error: fetchError } = await supabase
      .from('records').select('id, sold_at').eq('id', id).single();
    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Item not found — it may have already been deleted.' });
    }
    if (existing.sold_at) {
      return res.status(409).json({
        error: 'This item has a recorded sale and can\u2019t be deleted, since that would erase real sales history. If it needs to come off the sales page, use the Active/Inactive toggle instead.',
      });
    }

    const { error } = await supabase.from('records').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
