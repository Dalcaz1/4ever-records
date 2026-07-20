// Store tax settings — zip code + confirmed combined tax rate, used by
// both Checkout Mode payment paths. Same trust model as this app's other
// own endpoints (save-record.js, update-record.js, etc.) — no server-side
// secret check, relies entirely on the admin page's own PIN gate.

export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('store_settings')
        .select('id, label, zip_code, tax_rate, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ settings: data || null });
    }

    if (req.method === 'POST') {
      const { id, label, zip_code, tax_rate } = req.body || {};
      if (!zip_code || tax_rate === undefined || tax_rate === null || tax_rate === '') {
        return res.status(400).json({ error: 'Missing zip_code or tax_rate' });
      }
      const parsedRate = parseFloat(tax_rate);
      if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 25) {
        return res.status(400).json({ error: 'Tax rate should be a percentage between 0 and 25 (e.g. 8.25)' });
      }

      const payload = { label: label || null, zip_code: String(zip_code).trim(), tax_rate: parsedRate, updated_at: new Date().toISOString() };
      let result;
      if (id) {
        result = await supabase.from('store_settings').update(payload).eq('id', id).select().single();
      } else {
        result = await supabase.from('store_settings').insert(payload).select().single();
      }
      if (result.error) return res.status(500).json({ error: result.error.message });
      return res.status(200).json({ settings: result.data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('store-settings error:', err);
    return res.status(500).json({ error: err.message });
  }
}
