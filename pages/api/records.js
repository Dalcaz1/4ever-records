// pages/api/records.js — CRUD for vinyl records inventory
import { supabase, supabaseAdmin, getNextSku } from '../../lib/supabase'

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } }

export default async function handler(req, res) {
  const { method } = req

  // GET — list records (public storefront)
  if (method === 'GET') {
    const { search, genre, limit = 48, offset = 0 } = req.query
    let query = supabase
      .from('records')
      .select('*')
      .eq('sold', false)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (genre && genre !== 'all') query = query.eq('genre', genre)
    if (search) {
      query = query.or(
        `artist.ilike.%${search}%,title.ilike.%${search}%,label.ilike.%${search}%,year::text.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ records: data, count })
  }

  // POST — add a new record (seller dashboard)
  if (method === 'POST') {
    const {
      artist, title, label, year, genre, condition,
      price, description, photoBase64, photoType,
      discogsId, weightOz
    } = req.body

    if (!artist || !title || !price) {
      return res.status(400).json({ error: 'artist, title, and price are required' })
    }

    const db = supabaseAdmin()
    let photoUrl = null

    // Upload photo to Supabase Storage if provided
    if (photoBase64) {
      const sku = await getNextSku()
      const fileName = `${sku}-${Date.now()}.jpg`
      const buf = Buffer.from(photoBase64, 'base64')

      const { data: upload, error: upErr } = await db.storage
        .from('record-photos')
        .upload(fileName, buf, { contentType: photoType || 'image/jpeg', upsert: false })

      if (!upErr) {
        const { data: urlData } = db.storage.from('record-photos').getPublicUrl(upload.path)
        photoUrl = urlData.publicUrl
      }

      // Insert record with pre-fetched SKU
      const { data: record, error } = await db.from('records').insert({
        sku, artist, title, label, year: year ? parseInt(year) : null,
        genre, condition, price: parseFloat(price),
        description, photo_url: photoUrl,
        discogs_id: discogsId, weight_oz: weightOz || 7,
      }).select().single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(201).json({ record })
    }

    // No photo — still need SKU
    const sku = await getNextSku()
    const { data: record, error } = await db.from('records').insert({
      sku, artist, title, label, year: year ? parseInt(year) : null,
      genre, condition, price: parseFloat(price),
      description, photo_url: null,
      discogs_id: discogsId, weight_oz: weightOz || 7,
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ record })
  }

  // PATCH — update a record
  if (method === 'PATCH') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    const { data, error } = await supabaseAdmin()
      .from('records')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ record: data })
  }

  // DELETE — remove a record
  if (method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await supabaseAdmin().from('records').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
