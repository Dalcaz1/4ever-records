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

    const { artist, title, year, label, cat, catalog_number, genre, condition, price, qty, notes, sleeveType, identity_match, identity_conflict_note, cost } = fields;

    if (!artist || !title || !price) {
      return res.status(400).json({ error: 'Artist, title, and price are required' });
    }

    // FIX (July 22 session, direct user report — confirmed reproducible
    // 5/5 times: two people scanning concurrently on separate devices).
    // This used to read the counter's current value and write back value+1
    // as two separate, non-atomic steps — if two saves in the same
    // category landed close together, both could read the SAME starting
    // value before either wrote back, and both items would be assigned
    // the IDENTICAL SKU. That wouldn't stop a scan from completing, but
    // it would cause exactly "misidentifies items" later: anyone looking
    // up that SKU (checkout, reprinting a label, a pricing lookup) would
    // see whichever record comes back first, for both physical items.
    //
    // No direct database/migration access in this environment to create a
    // true atomic Postgres stored procedure (the textbook fix), so this
    // uses genuine optimistic-concurrency control instead: attempt the
    // update conditioned on the value still being exactly what was just
    // read (.eq('value', currentValue)); Supabase/PostgREST reports how
    // many rows that update actually touched. If another request already
    // changed it in between, zero rows match and zero rows update — that's
    // detected and the whole read-compute-write cycle retries with a fresh
    // read, rather than silently overwriting. Bounded at 8 attempts, which
    // will always be enough for two people's saves landing close together;
    // if it's still colliding after 8 attempts something more seriously
    // wrong would be going on, worth its own investigation rather than
    // retrying forever.
    const prefix = SKU_PREFIXES[cat] || '4EMR';
    let skuNum = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: counter, error: readErr } = await supabase
        .from('sku_counter').select('value').eq('category', prefix).single();
      if (readErr && readErr.code !== 'PGRST116') { // PGRST116 = no row yet, treat as 0
        return res.status(500).json({ error: 'Failed to read SKU counter: ' + readErr.message });
      }
      const currentValue = counter?.value || 0;
      const nextValue = currentValue + 1;

      if (!counter) {
        // No row for this category yet — insert, but guard against two
        // concurrent first-ever saves in this category both trying to
        // insert at once (unique constraint on category would reject the
        // loser, which is treated as "someone beat us, retry" below).
        const { error: insertErr } = await supabase
          .from('sku_counter').insert({ category: prefix, value: nextValue });
        if (insertErr) continue; // someone else inserted first — retry with a fresh read
        skuNum = nextValue;
        break;
      }

      const { data: updated, error: updateErr } = await supabase
        .from('sku_counter')
        .update({ value: nextValue })
        .eq('category', prefix)
        .eq('value', currentValue) // the actual compare-and-swap condition
        .select('value');
      if (updateErr) {
        return res.status(500).json({ error: 'Failed to update SKU counter: ' + updateErr.message });
      }
      if (updated && updated.length > 0) {
        skuNum = nextValue;
        break; // won the race — this attempt's write actually landed
      }
      // Zero rows updated means another concurrent save already changed
      // the value between our read and this write — loop and retry with
      // a fresh read rather than silently proceeding with a stale number.
    }
    if (skuNum === null) {
      return res.status(500).json({ error: 'Could not safely assign a SKU after several attempts — please try saving again.' });
    }
    const sku = `${prefix}-${String(skuNum).padStart(4, '0')}`;

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
    const { data: inserted, error: insertError } = await supabase.from('records').insert({
      sku, artist, title,
      year: parseInt(year) || null,
      label: label || null,
      category: cat, catalog_number: catalog_number || null, genre, condition,
      price: parseFloat(price),
      qty: parseInt(qty) || 1,
      notes: notes || null,
      identity_match: identity_match === 'false' ? false : (identity_match === 'true' ? true : null),
      identity_conflict_note: identity_conflict_note || null,
      cost: cost ? parseFloat(cost) : null,
      photo_cover, photo_a, photo_b, photo_c,
      active: true,
      created_at: new Date().toISOString(),
    }).select('id').single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to save record', details: insertError.message });
    }

    return res.status(200).json({ success: true, sku, id: inserted?.id || null });

  } catch (err) {
    console.error('Save record error:', err);
    return res.status(500).json({ error: 'Failed to save record', message: err.message });
  }
}
