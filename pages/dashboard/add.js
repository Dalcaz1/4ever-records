// pages/dashboard/add.js — Add new record with AI photo identification
import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import DashboardLayout from '../../components/DashboardLayout'

const GENRES = ['rock','jazz','soul','classical','folk','blues','pop','country','reggae','electronic','other']
const CONDITIONS = ['M (Mint)','NM (Near Mint)','VG+ (Very Good Plus)','VG (Very Good)','G+ (Good Plus)','G (Good)','F (Fair)','P (Poor)']

export default function AddRecord() {
  const router = useRouter()
  const fileRef = useRef()
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoBase64, setPhotoBase64] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [form, setForm] = useState({
    artist: '', title: '', label: '', year: '', genre: 'rock',
    condition: 'VG+ (Very Good Plus)', price: '', description: '', weightOz: '7',
  })

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setPhotoPreview(dataUrl)
      const base64 = dataUrl.split(',')[1]
      setPhotoBase64(base64)

      // AI identification
      setScanning(true)
      try {
        const res = await fetch('/api/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
        })
        const data = await res.json()
        if (data.record) {
          const r = data.record
          setForm(prev => ({
            ...prev,
            artist:    r.artist || prev.artist,
            title:     r.title  || prev.title,
            label:     r.label  || prev.label,
            year:      r.year   ? String(r.year) : prev.year,
            genre:     r.genre  || prev.genre,
          }))
        }
        if (data.pricing) setPricing(data.pricing)
      } catch (err) {
        console.error('Identify error:', err)
      } finally {
        setScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const useSuggestedPrice = () => {
    if (pricing?.suggestedPrice) set('price', pricing.suggestedPrice.toFixed(2))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.artist || !form.title || !form.price) {
      alert('Artist, title, and price are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          year: form.year ? parseInt(form.year) : null,
          weightOz: parseFloat(form.weightOz),
          photoBase64,
          photoType: 'image/jpeg',
          discogsId: pricing?.discogsId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert(`✓ "${form.title}" listed as ${data.record.sku}`)
      router.push('/dashboard/inventory')
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Add Record">
      <DashboardLayout active="add">
        <h2 style={{ color: 'var(--navy)', marginBottom: '1.5rem', fontFamily: "'Playfair Display',serif" }}>Add New Record</h2>

        {/* Photo Upload Zone */}
        <div
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
          style={photoPreview ? { padding: '0', border: 'none' } : {}}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Record preview" style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }} />
          ) : (
            <>
              <div className="upload-zone-icon">📷</div>
              <h3>Photograph Your Record</h3>
              <p>Take a photo of the album cover or label — AI will identify the record and fetch pricing from Discogs</p>
              <div className="btn btn-primary btn-sm" style={{ display: 'inline-flex', marginTop: '1rem' }}>
                Choose Photo
              </div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />

        {/* Scanning indicator */}
        {scanning && (
          <div style={{ background: '#e8f4fd', border: '1px solid #b0d4f0', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center', color: '#0c3d6e' }}>
            <span style={{ fontSize: '20px', marginRight: '10px' }}>🔍</span>
            Identifying record and fetching pricing from Discogs...
          </div>
        )}

        {/* Price suggestion banner */}
        {pricing && !scanning && (
          <div className="price-suggestion">
            <div>📈</div>
            <div className="price-suggestion-info">
              <strong>
                Discogs recommended price: ${pricing.suggestedPrice?.toFixed(2) || 'N/A'}
                {pricing.priceRange && ` (range: $${pricing.priceRange.low}–$${pricing.priceRange.high})`}
              </strong>
              <span>
                {pricing.numForSale || 0} copies listed on Discogs
                {pricing.lowestListed && ` · Lowest: $${pricing.lowestListed}`}
              </span>
            </div>
            {pricing.suggestedPrice && (
              <button onClick={useSuggestedPrice} className="btn btn-sm" style={{ background: '#1e6b3a', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}>
                Use ${pricing.suggestedPrice.toFixed(2)}
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="two-col">
            <div className="form-group">
              <label className="form-label">Artist *</label>
              <input className="form-input" value={form.artist} onChange={e => set('artist', e.target.value)} placeholder="e.g. Stevie Wonder" required />
            </div>
            <div className="form-group">
              <label className="form-label">Album / Title *</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Songs in the Key of Life" required />
            </div>
            <div className="form-group">
              <label className="form-label">Label</label>
              <input className="form-input" value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Tamla" />
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="form-input" type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="e.g. 1976" min="1900" max="2024" />
            </div>
            <div className="form-group">
              <label className="form-label">Genre</label>
              <select className="form-select" value={form.genre} onChange={e => set('genre', e.target.value)}>
                {GENRES.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Condition</label>
              <select className="form-select" value={form.condition} onChange={e => set('condition', e.target.value)}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Your Price ($) *</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Weight (oz) — for shipping</label>
              <input className="form-input" type="number" step="0.5" value={form.weightOz} onChange={e => set('weightOz', e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="form-label">Description / Notes</label>
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Pressing details, sleeve condition, any defects..." />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '160px' }}>
              {submitting ? 'Listing...' : '✓ List for Sale'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => router.push('/dashboard/inventory')}>
              Cancel
            </button>
          </div>
        </form>
      </DashboardLayout>
    </Layout>
  )
}
