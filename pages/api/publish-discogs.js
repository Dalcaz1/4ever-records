export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Pull all Discogs-imported collection items
    const { data: items, error: fetchError } = await supabase
      .from('collection_items')
      .select('*')
      .not('discogs_listed_price', 'is', null);

    if (fetchError) throw new Error(fetchError.message);
    if (!items || items.length === 0) {
      return res.status(200).json({ success: true, published: 0, message: 'No Discogs items found' });
    }

    const SKU_PREFIXES = {
      '7" Vinyl':  '4EMR45',
      '12" Vinyl': '4EMRA',
      'CD':        '4EMRCD',
      'Cassette':  '4EMRCA',
      '8-Track':   '4EMR8',
    };

    let published = 0;
    const skipped = [];

    for (const item of items) {
      if (!item.artist || !item.title || !item.discogs_listed_price) {
        skipped.push(item.id);
        continue;
      }

      // FIX (July 22 session): same non-atomic read-then-write race
      // condition as save-record.js — see the fuller comment there. This
      // endpoint writes to the exact same sku_counter rows, so a
      // concurrent Discogs publish and a regular scan-save could collide
      // with each other, not just two scans. Same compare-and-swap fix.
      const category = item.category || '7" Vinyl';
      const prefix = SKU_PREFIXES[category] || '4EMR45';
      let skuNum = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data: counter, error: readErr } = await supabase
          .from('sku_counter').select('value').eq('category', prefix).single();
        if (readErr && readErr.code !== 'PGRST116') break;
        const currentValue = counter?.value || 0;
        const nextValue = currentValue + 1;

        if (!counter) {
          const { error: insertErr } = await supabase
            .from('sku_counter').insert({ category: prefix, value: nextValue });
          if (insertErr) continue;
          skuNum = nextValue;
          break;
        }

        const { data: updated, error: updateErr } = await supabase
          .from('sku_counter')
          .update({ value: nextValue })
          .eq('category', prefix)
          .eq('value', currentValue)
          .select('value');
        if (updateErr) break;
        if (updated && updated.length > 0) { skuNum = nextValue; break; }
      }
      if (skuNum === null) {
        skipped.push(item.id);
        continue;
      }
      const sku = `${prefix}-D-${String(skuNum).padStart(4, '0')}`;

      // Insert into records table
      const { error: insertError } = await supabase.from('records').insert({
        sku,
        artist: item.artist,
        title: item.title,
        year: item.year || null,
        label: item.label || null,
        category,
        genre: item.genre || null,
        condition: item.condition || 'VG',
        price: parseFloat(item.discogs_listed_price),
        qty: 1,
        notes: 'Discogs import — no photo. Pull from D storage.',
        photo_cover: null,
        photo_a: null,
        photo_b: null,
        photo_c: null,
        active: true,
        created_at: new Date().toISOString(),
      });

      if (!insertError) published++;
      else skipped.push(item.id);
    }

    return res.status(200).json({ success: true, published, skipped: skipped.length });

  } catch (err) {
    console.error('publish-discogs error:', err);
    return res.status(500).json({ error: err.message });
  }
}
