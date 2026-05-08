// pages/index.js — Customer storefront
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../components/Layout'

const GENRES = [
  { value: 'all', label: 'All Records' },
  { value: 'rock', label: 'Rock' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'soul', label: 'Soul / R&B' },
  { value: 'classical', label: 'Classical' },
  { value: 'folk', label: 'Folk' },
  { value: 'blues', label: 'Blues' },
  { value: 'pop', label: 'Pop' },
  { value: 'country', label: 'Country' },
]

const LABEL_COLORS = [
  ['#fde8e8','#8b1a1a'], ['#e8f4fd','#0c3d6e'], ['#e8f8f0','#1e5c33'],
  ['#faf0e8','#6b3a1a'], ['#f0e8fa','#4a1a6b'], ['#e8faee','#1a5c3a'],
  ['#fdf5e0','#6b5a00'], ['#e0f0fd','#0a3a5c'],
]

function RecordCard({ record }) {
  const lc = LABEL_COLORS[record.sku?.slice(-4) % LABEL_COLORS.length] || LABEL_COLORS[0]

  const addToCart = (e) => {
    e.preventDefault()
    const cart = JSON.parse(localStorage.getItem('4emr-cart') || '[]')
    if (!cart.find(i => i.id === record.id)) {
      cart.push({ id: record.id, sku: record.sku, artist: record.artist, title: record.title, price: record.price, photo_url: record.photo_url })
      localStorage.setItem('4emr-cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cart-updated'))
    }
    alert(`"${record.title}" added to cart!`)
  }

  return (
    <div className="card record-card">
      <Link href={`/record/${record.id}`}>
        <div className="record-img">
          {record.photo_url ? (
            <img src={record.photo_url} alt={`${record.title} by ${record.artist}`} />
          ) : (
            <div className="vinyl-overlay">
              <div className="vinyl-disc">
                <div className="vinyl-label-circle" style={{ background: lc[0], color: lc[1] }}>
                  {record.label?.split(' ')[0] || '●'}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="record-body">
          <div className="record-sku">{record.sku}</div>
          <div className="record-title">{record.title}</div>
          <div className="record-artist">{record.artist} · {record.year}</div>
          <div className="record-meta">
            <span className="record-price">${parseFloat(record.price).toFixed(2)}</span>
            <span className="condition-badge">{record.condition}</span>
          </div>
        </div>
      </Link>
      <div style={{ padding: '0 1rem 1rem' }}>
        <button onClick={addToCart} className="btn btn-primary btn-full" style={{ fontSize: '12px', padding: '8px' }}>
          Add to Cart
        </button>
      </div>
    </div>
  )
}

export default function StoreFront() {
  const router = useRouter()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('all')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (genre !== 'all') params.set('genre', genre)
      const res = await fetch(`/api/records?${params}`)
      const data = await res.json()
      setRecords(data.records || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, genre])

  useEffect(() => {
    if (router.query.genre) setGenre(router.query.genre)
  }, [router.query])

  useEffect(() => {
    const timer = setTimeout(fetchRecords, 300)
    return () => clearTimeout(timer)
  }, [fetchRecords])

  return (
    <Layout>
      {/* Hero */}
      <div className="page-hero">
        <div className="container">
          <h1>4 Ever Memories Records</h1>
          <p>Handpicked vinyl — classics, rarities & hidden gems. Every record carries a memory.</p>
        </div>
      </div>

      <div className="container section">
        {/* Search */}
        <div className="search-wrap">
          <div className="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by artist, album title, label, or year..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Genre filter pills */}
        <div className="filter-pills">
          {GENRES.map(g => (
            <button
              key={g.value}
              className={`filter-pill ${genre === g.value ? 'active' : ''}`}
              onClick={() => setGenre(g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading records...
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>♪</div>
            <h3 style={{ color: 'var(--navy)', marginBottom: '8px' }}>No records found</h3>
            <p>Try a different search or genre filter.</p>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '1.25rem' }}>
              {records.length} record{records.length !== 1 ? 's' : ''} available
            </p>
            <div className="records-grid">
              {records.map(record => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
