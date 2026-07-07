export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Parse multipart form data
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const parts = buffer.toString('binary').split(`--${boundary}`);
    const fields = {};
    let photoBuffer = null;

    for (const part of parts) {
      if (!part.includes('Content-Disposition')) continue;
      const [headers, ...bodyParts] = part.split('\r\n\r\n');
      const body = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      if (filenameMatch) {
        if (name === 'photo_cover') photoBuffer = Buffer.from(body, 'binary');
      } else {
        fields[name] = body;
      }
    }

    const { id, artist, title, year, label, genre, condition, price, qty, notes, active } = fields;
    // Guard against 'undefined'/'null' as literal strings, not just falsy —
    // FormData.append('id', undefined) silently stringifies to "undefined",
    // which passes a plain `!id` check and would otherwise hit Supabase as
    // a bad .eq('id', 'undefined') query, surfacing a raw Postgres error to
    // the user (suspected source of the July 7 "inventory number not
    // available" report — not confirmed, but this closes a real gap either way).
    if (!id || id === 'undefined' || id === 'null') {
      console.error('update-record: missing/invalid id in request', { id });
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

    // Upload photo if provided
    if (photoBuffer && photoBuffer.length > 0) {
      const filename = `record-${id}-cover-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('record-photos')
        .upload(filename, photoBuffer, { contentType: 'image/jpeg' });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('record-photos').getPublicUrl(filename);
        updates.photo_cover = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('records').update(updates).eq('id', id);
    if (error) {
      console.error('update-record: Supabase update failed', { id, error });
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
