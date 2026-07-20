export const config = { api: { bodyParser: false } };

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
    // was confirmed, via direct reproduction on July 7, to corrupt non-ASCII
    // text fields (e.g. em dashes / accented characters in notes) and was
    // suspected as the source of intermittent "Missing record id" errors on
    // edit. formidable is a maintained library that handles multipart
    // parsing correctly across browsers/devices, including binary safety
    // for the photo upload and correct UTF-8 handling for text fields.
    const form = new IncomingForm({ multiples: false });
    const [rawFields, rawFiles] = await form.parse(req);

    // formidable v3 returns every field as an array — normalise to plain values.
    const fields = {};
    for (const key of Object.keys(rawFields)) {
      fields[key] = Array.isArray(rawFields[key]) ? rawFields[key][0] : rawFields[key];
    }

    const photoFile = rawFiles.photo_cover
      ? (Array.isArray(rawFiles.photo_cover) ? rawFiles.photo_cover[0] : rawFiles.photo_cover)
      : null;

    const { id, artist, title, year, label, genre, condition, price, qty, notes, active, catalog_number } = fields;

    if (!id || id === 'undefined' || id === 'null') {
      console.error('update-record: missing/invalid id in request', { id, fieldKeys: Object.keys(fields) });
      return res.status(400).json({ error: 'Could not identify which item to update — please close this and reopen it from Manage Inventory.' });
    }

    const updates = {
      condition,
      price: parseFloat(price),
      notes: notes || null,
      active: active === 'true',
    };

    // Only update text fields if provided
    if (artist) updates.artist = artist;
    if (title) updates.title = title;
    if (year) updates.year = parseInt(year) || null;
    if (label) updates.label = label || null;
    if (genre) updates.genre = genre;
    if (qty) updates.qty = parseInt(qty) || 1;
    if (catalog_number) updates.catalog_number = catalog_number;

    // FIX (July 19 session — real sold-price/date tracking): most actual
    // sales for this store happen at live shows via a manual "mark
    // inactive" edit here, not through the online Square checkout (see
    // mark-sold.js). Previously that manual path just flipped `active` to
    // false with no price or date captured at all — meaning the "4 Ever
    // Memories Verified Sales" pricing source had no real sold data to
    // draw from for these, the majority of actual sales. Now stamps
    // sold_price/sold_at, but ONLY on a genuine true->false transition
    // (fetched fresh here, not assumed from the request) and only once —
    // a later edit correcting an unrelated field on an already-sold item
    // must never overwrite the original real sale record.
    if (updates.active === false) {
      const { data: current } = await supabase
        .from('records').select('active, sold_at').eq('id', id).single();
      if (current && current.active === true && !current.sold_at) {
        updates.sold_price = parseFloat(price) || null;
        updates.sold_at = new Date().toISOString();
      }
    }

    // Upload photo if provided
    if (photoFile && photoFile.size > 0) {
      const photoBuffer = await fs.readFile(photoFile.filepath);
      const filename = `record-${id}-cover-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('record-photos')
        .upload(filename, photoBuffer, { contentType: 'image/jpeg' });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('record-photos').getPublicUrl(filename);
        updates.photo_cover = urlData.publicUrl;
      } else {
        console.error('update-record: photo upload failed', { id, uploadError });
      }
      // Clean up formidable's temp file
      await fs.unlink(photoFile.filepath).catch(() => {});
    }

    const { error } = await supabase.from('records').update(updates).eq('id', id);
    if (error) {
      console.error('update-record: Supabase update failed', { id, error });
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('update-record: unhandled error', err);
    return res.status(500).json({ error: err.message });
  }
}
