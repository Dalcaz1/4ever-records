export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Parse multipart form data manually
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const boundary = req.headers['content-type'].split('boundary=')[1];
    
    // Parse fields from multipart
    const parts = buffer.toString('binary').split(`--${boundary}`);
    const fields = {};
    const photoBuffers = {};

    for (const part of parts) {
      if (!part.includes('Content-Disposition')) continue;
      const [headers, ...bodyParts] = part.split('\r\n\r\n');
      const body = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
      
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      
      if (!nameMatch) continue;
      const name = nameMatch[1];
      
      if (filenameMatch) {
        // It's a file
        photoBuffers[name] = Buffer.from(body, 'binary');
      } else {
        fields[name] = body;
      }
    }

    const { artist, title, year, label, cat, genre, condition, price, qty, notes } = fields;

    if (!artist || !title || !price) {
      return res.status(400).json({ error: 'Artist, title, and price are required' });
    }

    // Generate SKU
    const { data: counter } = await supabase
      .from('sku_counter')
      .select('value')
      .single();
    
    const skuNum = (counter?.value || 0) + 1;
    const sku = `4EMR-${String(skuNum).padStart(4, '0')}`;

    await supabase.from('sku_counter').upsert({ id: 1, value: skuNum });

    // Upload photos to Supabase storage
    const photoUrls = {};
    for (const [key, buf] of Object.entries(photoBuffers)) {
      if (buf.length === 0) continue;
      const filename = `${sku}-${key}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('record-photos')
        .upload(filename, buf, { contentType: 'image/jpeg' });
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('record-photos')
          .getPublicUrl(filename);
        photoUrls[key] = urlData.publicUrl;
      }
    }

    // Save record to database
    const { error: insertError } = await supabase.from('records').insert({
      sku,
      artist,
      title,
      year: parseInt(year) || null,
      label: label || null,
      category: cat,
      genre,
      condition,
      price: parseFloat(price),
      qty: parseInt(qty) || 1,
      notes: notes || null,
      photo_a: photoUrls['photoA'] || null,
      photo_b: photoUrls['photoB'] || null,
      photo_cover: photoUrls['photoCover'] || null,
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
