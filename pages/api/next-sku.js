export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { cat } = req.query;
  if (!cat) return res.status(400).json({ error: 'Missing category' });

  const SKU_PREFIXES = {
    '7" Vinyl':  '4EMR45',
    '12" Vinyl': '4EMRA',
    'CD':        '4EMRCD',
    'Cassette':  '4EMRCA',
    '8-Track':   '4EMR8',
  };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const prefix = SKU_PREFIXES[cat] || '4EMR';

    const { data: counter } = await supabase
      .from('sku_counter')
      .select('value')
      .eq('category', prefix)
      .single();

    const nextNum = (counter?.value || 0) + 1;
    const nextSku = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    return res.status(200).json({ sku: nextSku });
  } catch (err) {
    console.error('Next SKU error:', err);
    return res.status(500).json({ error: 'Failed to get next SKU' });
  }
}
