// pages/record/[id].js — Single record page with buy now
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function RecordPage() {
  const router = useRouter()
  const { id } = router.query
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rates, setRates] = useState([])
  const [zip, setZip] = useState('')
  const [selectedRate, setSelectedRate] = useState(null)
  const [fetchingRates, setFetchingRates] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/records/${id}`)
      .then(r => r.json())
      .then(d => { setRecord(d.record); setLoading(false) })
      .catch(() => setLoading(false))

    const cart = JSON.parse(localStorage.getItem('4emr-cart') || '[]')
    setAddedToCart(cart.some(i => i.id === id))
  }, [id])

  const fetchRates = async () => {
    if (!zip || zip.length !== 5) return
    setFetchingRates(true)
    const res = await fetch(`/api/shipping?toZip=${zip}&weightOz=${record?.weight_oz || 7}`)
    const data = await res.json()
    setRates(data.rates || [])
    setSelectedRate(data.rates?.[0] || null)
    setFetchingRates(false)
  }

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem('4emr-cart') || '[]')
    if (!cart.find(i => i.id === record.id)) {
      cart.push({ id: record.id, sku: record.sku, artist: record.artist, title: record.title, price: record.price, photo_url: record.photo_url })
      localStorage.setItem('4emr-cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cart-updated'))
      setAddedToCart(true)
    }
  }

  if (loading) return <Layout><div style={{textAlign:'center',padding:'4rem'}}>Loading...</div></Layout>
  if (!record) return <Layout><div style={{textAlign:'center',padding:'4rem'}}>Record not found.</div></Layout>

  const total = parseFloat(record.price) + (selectedRate?.rate || 0)

  return (
    <Layout title={`${record.title} — ${record.artist}`}>
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="two-col" style={{ gap: '3rem', alignItems: 'start' }}>

          {/* Left: Photo */}
          <div>
            <div className="record-img" style={{ borderRadius: 'var(--radius-lg)', aspectRatio: '1', background: 'var(--groove)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {record.photo_url ? (
                <img src={record.photo_url} alt={record.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />
              ) : (
                <div className="vinyl-disc" style={{ width: '80%', aspectRatio: '1' }}>
                  <div className="vinyl-label-circle" style={{ background: '#fde8e8', color: '#8b1a1a', width: '33%', aspectRatio: '1' }}>
                    {record.label?.split(' ')[0]}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Details + Buy */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>{record.sku}</div>
            <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', color: 'var(--navy)', marginBottom: '6px' }}>{record.title}</h1>
            <h2 style={{ fontSize: '20px', fontWeight: '400', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{record.artist}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
              {[['Label', record.label], ['Year', record.year], ['Genre', record.genre], ['Condition', record.condition]].map(([k, v]) => v && (
                <div key={k} style={{ background: 'var(--cream-dk)', padding: '10px 14px', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '3px' }}>{k}</div>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--navy)' }}>{v}</div>
                </div>
              ))}
            </div>

            {record.description && (
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.7' }}>{record.description}</p>
            )}

            <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--red)', fontFamily: "'Playfair Display', serif", marginBottom: '1.5rem' }}>
              ${parseFloat(record.price).toFixed(2)}
            </div>

            {/* Shipping calculator */}
            <div style={{ background: 'var(--cream-dk)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--navy)', marginBottom: '10px' }}>Calculate Shipping</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input" type="text" placeholder="Your ZIP code" maxLength={5} value={zip} onChange={e => setZip(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={fetchRates} disabled={fetchingRates}>{fetchingRates ? '...' : 'Calculate'}</button>
              </div>
              {rates.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {rates.map(rate => (
                    <label key={rate.service} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                      <input type="radio" name="shipping" checked={selectedRate?.service === rate.service} onChange={() => setSelectedRate(rate)} />
                      <span style={{ flex: 1, fontSize: '14px' }}>{rate.service} <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({rate.days} days)</span></span>
                      <span style={{ fontWeight: '500' }}>${rate.rate.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {selectedRate && (
              <div style={{ background: '#fff8e8', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total with shipping</span>
                <strong style={{ color: 'var(--navy)', fontSize: '18px' }}>${total.toFixed(2)}</strong>
              </div>
            )}

            <button
              className={`btn btn-full ${addedToCart ? 'btn-outline' : 'btn-primary'}`}
              style={{ fontSize: '14px', padding: '14px', marginBottom: '10px' }}
              onClick={addedToCart ? () => router.push('/cart') : addToCart}
            >
              {addedToCart ? 'View Cart & Checkout →' : 'Add to Cart'}
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Secure payment via Square · Ships via USPS
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
