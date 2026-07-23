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

    const { id, artist, title, year, label, genre, condition, price, qty, notes, active, catalog_number, identity_match, identity_conflict_note, cost, category } = fields;

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
    if (identity_match !== undefined) updates.identity_match = identity_match === 'false' ? false : (identity_match === 'true' ? true : null);
    if (identity_conflict_note !== undefined) updates.identity_conflict_note = identity_conflict_note || null;
    if (cost !== undefined) updates.cost = cost ? parseFloat(cost) : null;
    // FIX (July 22 session, direct user report — "sealed 12" items are
    // directly mis reading as either a CD or a 45... [and] once an item
    // has been placed in inventory... there is no way to properly edit the
    // item"): category/format was previously not correctable at all after
    // the initial scan, so a genuine misidentification (the exact case
    // reported) had no fix path short of delete-and-rescan. Restricted to
    // the known valid category strings — the same ones SKU_PREFIXES and
    // FYT_FORMATS use — rather than accepting any string, since an
    // unrecognized category would have no SKU prefix and no photo-slot
    // definition anywhere else in the app. Deliberately does NOT
    // regenerate the SKU: the physical label may already be printed and
    // attached to the item, so changing the SKU out from under it would
    // make the printed label and the database disagree. This corrects the
    // category/pricing-comp classification only.
    const VALID_CATEGORIES = ['7" Vinyl', '12" Vinyl', 'CD', 'Cassette', '8-Track'];
    if (category && VALID_CATEGORIES.includes(category)) updates.category = category;

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

    // FIX (July 22 session, direct user report — a real incident: ~15-20
    // unrelated records got permanently stamped as "sold" for $5 each in
    // a 2-minute window, from what was almost certainly an accidental tap
    // on the Active/Inactive toggle while correcting a placeholder price
    // in the same save). Previously, toggling an item back to Active left
    // sold_price/sold_at/etc permanently lingering in the row even though
    // active=true — meaning there was no real way to fully undo a wrong
    // "mark sold," only to hide the symptom by reactivating it while
    // leaving corrupted sale data sitting in the database forever. Now a
    // genuine false->true transition clears every sold-related field, and
    // restores qty to 1 — a real, complete undo, and the actual recovery
    // path for this exact incident's affected records.
    if (updates.active === true) {
      const { data: current } = await supabase
        .from('records').select('active, sold_at').eq('id', id).single();
      if (current && current.active === false && current.sold_at) {
        updates.sold_price = null;
        updates.sold_at = null;
        updates.sold_payment_method = null;
        updates.sold_tax_amount = null;
        updates.sold_discount_amount = null;
        updates.sold_square_order_id = null;
        updates.sold_square_payment_id = null;
        updates.qty = 1;
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
