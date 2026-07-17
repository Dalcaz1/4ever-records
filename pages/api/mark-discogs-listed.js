// Lightweight JSON endpoint (unlike update-record.js, which is multipart
// for photo uploads) — just persists the Discogs listing URL/release ID
// onto a records row after a draft is successfully created from Manage
// Inventory, so the "Listed on Discogs" badge and link survive a reload.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, discogs_listing_url, discogs_release_id } = req.body || {};
  if (!id || !discogs_listing_url) {
    return res.status(400).json({ error: 'Missing id or discogs_listing_url' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error } = await supabase
      .from('records')
      .update({
        discogs_listing_url,
        discogs_release_id: discogs_release_id || null,
      })
      .eq('id', id);

    if (error) {
      console.error('mark-discogs-listed error:', error);
      return res.status(500).json({ error: 'Failed to save Discogs listing status' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('mark-discogs-listed error:', err);
    return res.status(500).json({ error: err.message });
  }
}
