export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    const { data } = await supabase
      .from('site_stats')
      .select('value')
      .eq('key', 'pwa_installs')
      .single();

    const current = data ? parseInt(data.value) : 0;

    await supabase
      .from('site_stats')
      .upsert({ key: 'pwa_installs', value: String(current + 1) }, { onConflict: 'key' });

    return res.status(200).json({ success: true, installs: current + 1 });
  } catch (err) {
    console.error('Track install error:', err);
    return res.status(500).json({ error: err.message });
  }
}
