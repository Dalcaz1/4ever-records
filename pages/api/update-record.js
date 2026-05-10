export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { id, artist, title, year, label, genre, condition, price, qty, notes, active } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing record id' });

    const { error } = await supabase.from('records').update({
      artist, title,
      year: parseInt(year) || null,
      label: label || null,
      genre,
      condition,
      price: parseFloat(price),
      qty: parseInt(qty) || 1,
      notes: notes || null,
      active,
    }).eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
