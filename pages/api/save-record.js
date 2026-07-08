export const config = {
  api: {
    bodyParser: false,
  },
};

const SKU_PREFIXES = {
  '7" Vinyl':  '4EMR45',
  '12" Vinyl': '4EMRA',
  'CD':        '4EMRCD',
  'Cassette':  '4EMRCA',
  '8-Track':   '4EMR8',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const { IncomingForm } = await import('formidable');
    const fs = await import('fs/promises');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Parse multipart form data with formidable — replaces a hand-rolled
    // parser (buffer.toString('binary') + manual boundary splitting) that
    // was confirmed (see update-record.js, July 7 session) to corrupt
    // non-ASCII text fields. That's a direct data-quality risk here
    // specifically, since artist/title/notes routinely contain Spanish
    // accents on Latin pressings (see /api/identify.js's explicit "preserve
    // Spanish accents" instruction) — this parser could have been silently
    // stripping/mangling exactly that data on save.
    const form = new IncomingForm({ multiples: false });
    const [rawFields, rawFiles] = await form.parse(req);

    const fields = {};
    for (const key of Object.keys(rawFields)) {
      fields[key] = Array.isArray(rawFields[key]) ? rawFields[key][0] : rawFields[key];
    }

    // Normalise files to single File objects per field name (formidable v3
    // returns arrays even for multiples: false in some field-name edge cases).
    const photoFiles = {};
    for (const key of Object.keys(rawFiles)) {
      const f = rawFiles[key];
      photoFiles[key] = Array.isArray(f) ? f[0] : f;
    }

    const { artist, title, year, label, cat, genre, condition, price, qty, notes, sleeveType } = fields;

    if (!artist || !title || !price) {
      return res.status(400).json({ error: 'Artist, title, and price are required' });
    }

    // Generate SKU
    const prefix = SKU_PREFIXES[cat] || '4EMR';
    const { data: counter } = await supabase
      .from('sku_counter').select('value').eq('category', prefix).single();
    const skuNum = (counter?.value || 0) + 1;
    const sku = `${prefix}-${String(skuNum).padStart(4, '0')}`;
    await supabase.from('sku_counter').upsert({ category: prefix, value: skuNum }, { onConflict: 'category' });

    // Upload all photos
    const photoUrls = {};
    for (const [key, file] of Object.entries(photoFiles)) {
      if (!file || !file.size) continue;
      const buf = await fs.readFile(file.filepath);
      const filename = `${sku}-${key}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('record-photos').upload(filename, buf, { contentType: 'image/jpeg' });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('record-photos').getPublicUrl(filename);
        photoUrls[key] = urlData.publicUrl;
      } else {
        console.error('save-record: photo upload failed', { key, uploadError });
      }
      await fs.unlink(file.filepath).catch(() => {});
    }

    // Map photos to database columns based on format and sleeve type
    let photo_cover = null;
    let photo_a = null;
    let photo_b = null;
    let photo_c = null;

    if (cat === '7" Vinyl') {
      if (sleeveType === 'Picture Sleeve') {
        photo_cover = photoUrls['front'] || null;
        photo_a = photoUrls['a'] || null;
        photo_b = photoUrls['b'] || null;
        photo_c = photoUrls['back'] || null;
      } else if (sleeveType === 'Sleeve Only') {
        photo_cover = photoUrls['front'] || null;
        photo_a = photoUrls['back'] || null;
      } else {
        // Generic Sleeve — show A side as main
        photo_cover = photoUrls['a'] || null;
        photo_a = photoUrls['b'] || null;
      }
    } else if (cat === '12" Vinyl') {
      if (sleeveType === 'Cover Only') {
        photo_cover = photoUrls['front'] || null;
        photo_a = photoUrls['back'] || null;
      } else if (sleeveType === 'Generic Cover') {
        photo_cover = photoUrls['disc1a'] || null;
        photo_a = photoUrls['disc1b'] || null;
      } else {
        // Picture Cover
        photo_cover = photoUrls['front'] || null;
        photo_a = photoUrls['back'] || null;
        photo_b = photoUrls['disc1a'] || null;
        photo_c = photoUrls['disc1b'] || null;
      }
    } else if (cat === 'CD') {
      if (sleeveType === 'Generic Case') {
        photo_cover = photoUrls['disc1front'] || null;
        photo_a = photoUrls['disc1back'] || null;
      } else {
        // Picture Case
        photo_cover = photoUrls['front'] || null;
        photo_a = photoUrls['back'] || null;
        photo_b = photoUrls['disc1front'] || null;
        photo_c = photoUrls['disc1back'] || null;
      }
    } else if (cat === 'Cassette') {
      if (sleeveType === 'Generic Case') {
        photo_cover = photoUrls['tape'] || null;
      } else {
        photo_cover = photoUrls['front'] || null;
        photo_a = photoUrls['back'] || null;
      }
    } else if (cat === '8-Track') {
      photo_cover = photoUrls['a'] || null;
      photo_a = photoUrls['b'] || null;
    }

    // Save to database
    const { error: insertError } = await supabase.from('records').insert({
      sku, artist, title,
      year: parseInt(year) || null,
      label: label || null,
      category: cat, genre, condition,
      price: parseFloat(price),
      qty: parseInt(qty) || 1,
      notes: notes || null,
      photo_cover, photo_a, photo_b, photo_c,
      active: true,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to save record', details: insertError.message });
    }

    return res.status(200).json({ success: true, sku });

  } catch (err) {
    console.error('Save record error:', err);
    return res.status(500).json({ error: 'Failed to save record', message: err.message });
  }
}
