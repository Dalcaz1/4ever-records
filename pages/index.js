import { useState, useEffect, useMemo } from 'react';

const STORE_PHOTOS = [
  'https://raw.githubusercontent.com/Dalcaz1/4ever-records/main/1.jpg',
  'https://raw.githubusercontent.com/Dalcaz1/4ever-records/main/2.jpg',
  'https://raw.githubusercontent.com/Dalcaz1/4ever-records/main/3.jpg',
  'https://raw.githubusercontent.com/Dalcaz1/4ever-records/main/4.jpg',
];

const COND_COLORS = {
  'M':   { bg: '#1a3a1a', text: '#4ade80' },
  'NM':  { bg: '#1a3a2a', text: '#34d399' },
  'VG+': { bg: '#1a2a3a', text: '#60a5fa' },
  'VG':  { bg: '#2a2a1a', text: '#fbbf24' },
  'G':   { bg: '#3a1a1a', text: '#f87171' },
};

function calcShipping(qty) {
  if (qty === 0) return 0;
  return 5 + (qty - 1) * 1;
}

function VinylPlaceholder({ color = '#c9a84c' }) {
  return (
    <svg width="100%" viewBox="0 0 200 200" style={{ display: 'block' }}>
      <circle cx="100" cy="100" r="98" fill="#0a0a0a" stroke="#222" strokeWidth="2" />
      <circle cx="100" cy="100" r="75" fill="#111" />
      <circle cx="100" cy="100" r="55" fill="#0d0d0d" />
      <circle cx="100" cy="100" r="35" fill={color} opacity="0.9" />
      <circle cx="100" cy="100" r="12" fill="#0a0a0a" />
      {[20, 35, 45, 60, 68, 80].map(r => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.5" />
      ))}
    </svg>
  );
}

// Photo Lightbox Modal
function PhotoLightbox({ record, onClose, onAddToCart }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [zoom, setZoom] = useState(1);

  const getPhotoLabels = (cat) => {
    switch(cat) {
      case '7" Vinyl':  return ['Front Sleeve', 'A Side', 'B Side', null];
      case '12" Vinyl': return ['Front Cover', 'Back Cover', 'A Side', 'B Side'];
      case 'CD':        return ['Front Case', 'Back Case', 'Disc', null];
      case 'Cassette':  return ['Front', 'Back', null, null];
      case '8-Track':   return ['Side 1', 'Side 2', null, null];
      default:          return ['Photo 1', 'Photo 2', 'Photo 3', 'Photo 4'];
    }
  };
  const labels = getPhotoLabels(record.category);
  const photos = [
    record.photo_cover && { url: record.photo_cover, label: labels[0] || 'Front' },
    record.photo_a && { url: record.photo_a, label: labels[1] || 'Photo 2' },
    record.photo_b && { url: record.photo_b, label: labels[2] || 'Photo 3' },
    record.photo_c && { url: record.photo_c, label: labels[3] || 'Photo 4' },
  ].filter(Boolean);

  const cond = COND_COLORS[record.condition] || COND_COLORS['VG'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', fontWeight: '700' }}>{record.title}</div>
            <div style={{ fontSize: '13px', color: '#777', fontStyle: 'italic' }}>{record.artist} · {record.year}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
          
          {/* LEFT: PHOTOS */}
          <div style={{ padding: '20px', borderRight: '1px solid #1a1a1a' }}>
            {/* MAIN PHOTO */}
            <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px', background: '#0a0a0a', cursor: zoom > 1 ? 'zoom-out' : 'zoom-in' }}
              onClick={() => setZoom(z => z === 1 ? 2.5 : 1)}>
              {photos.length > 0 ? (
                <img src={photos[activePhoto]?.url} alt={photos[activePhoto]?.label}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', transform: `scale(${zoom})`, transition: 'transform 0.3s', transformOrigin: 'center' }} />
              ) : (
                <div style={{ aspectRatio: '1' }}><VinylPlaceholder /></div>
              )}
              {photos.length > 0 && (
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: '#c9a84c', fontSize: '10px', padding: '4px 8px', borderRadius: '4px' }}>
                  {zoom > 1 ? '🔍 Click to zoom out' : '🔍 Click to zoom in'}
                </div>
              )}
            </div>

            {/* PHOTO THUMBNAILS */}
            {photos.length > 1 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {photos.map((photo, i) => (
                  <div key={i} onClick={() => { setActivePhoto(i); setZoom(1); }}
                    style={{ flex: 1, borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${activePhoto === i ? '#c9a84c' : '#2a2a2a'}`, opacity: activePhoto === i ? 1 : 0.6 }}>
                    <img src={photo.url} alt={photo.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <p style={{ textAlign: 'center', color: '#444', fontSize: '12px', fontStyle: 'italic' }}>No photos available</p>
            )}
          </div>

          {/* RIGHT: DETAILS */}
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '10px', color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>{record.sku}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Artist', value: record.artist },
                { label: 'Year', value: record.year },
                { label: 'Label', value: record.label },
                { label: 'Genre', value: record.genre },
                { label: 'Format', value: record.category },
              ].map(item => item.value && (
                <div key={item.label}>
                  <div style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', color: '#e8d5b0' }}>{item.value}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>Condition</div>
                <div style={{ display: 'inline-block', background: cond.bg, border: `1px solid ${cond.text}44`, borderRadius: '6px', padding: '2px 8px' }}>
                  <span style={{ fontSize: '12px', color: cond.text, fontWeight: '700' }}>{record.condition}</span>
                </div>
              </div>
            </div>

            {record.notes && (
              <div style={{ marginBottom: '20px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Notes</div>
                <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>{record.notes}</div>
              </div>
            )}

            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px' }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '32px', fontWeight: '700', color: '#c9a84c', marginBottom: '16px' }}>${parseFloat(record.price).toFixed(2)}</div>
              <button onClick={() => { onAddToCart(record); onClose(); }}
                style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [addedId, setAddedId] = useState(null);
  const [lightboxRecord, setLightboxRecord] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', state: '', zip: '' });
  const [formError, setFormError] = useState('');

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
  const shipping = calcShipping(totalQty);
  const total = subtotal + shipping;

  useEffect(() => {
    fetch('/api/records?limit=8')
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function addToCart(record) {
    setCart(prev => {
      const exists = prev.find(i => i.id === record.id);
      if (exists) return prev.map(i => i.id === record.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...record, qty: 1 }];
    });
    setAddedId(record.id);
    setTimeout(() => setAddedId(null), 1500);
    setShowCart(true);
  }

  function removeFromCart(id) { setCart(prev => prev.filter(i => i.id !== id)); }
  function changeQty(id, delta) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  }
  function handleFormChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleCheckout() {
    setFormError('');
    const { name, email, address, city, state, zip } = form;
    if (!name || !email || !address || !city || !state || !zip) {
      setFormError('Please fill in all fields.');
      return;
    }
    setCheckoutStep('processing');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, form, subtotal, shipping, total }),
      });
      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setFormError(data.error || 'Payment failed. Please try again.');
        setCheckoutStep('info');
      }
    } catch {
      setFormError('Something went wrong. Please try again.');
      setCheckoutStep('info');
    }
  }

  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px',
    fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0',
    marginBottom: '10px',
  };

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        .record-card { transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; }
        .record-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.3); }
        .add-btn { transition: all 0.2s ease; }
        .add-btn:hover { background: #c9a84c !important; color: #0d0d0d !important; border-color: #c9a84c !important; }
        .photo-strip { display: flex; overflow: hidden; height: 200px; }
        .photo-strip img { width: 25%; height: 200px; object-fit: cover; filter: brightness(0.55) saturate(0.8); transition: filter 0.3s; }
        .photo-strip img:hover { filter: brightness(0.8) saturate(1.1); }
        input:focus { outline: none; border-color: #c9a84c !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

        /* MOBILE RESPONSIVE */
        @media (max-width: 768px) {
          .records-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .hero-title { font-size: 32px !important; }
          .nav-inner { padding: 0 16px !important; }
          .browse-btn { display: none !important; }
          .photo-strip { height: 120px !important; }
          .photo-strip img { height: 120px !important; }
          .section-padding { padding: 24px 16px 40px !important; }
          .lightbox-grid { grid-template-columns: 1fr !important; }
          .cart-drawer { width: 100vw !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .top-banner { font-size: 10px !important; padding: 6px 12px !important; }
          .hero-section { height: 280px !important; }
          .hero-badges { display: none !important; }
        }
        @media (max-width: 480px) {
          .records-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .hero-title { font-size: 26px !important; }
        }
      `}</style>

      {/* LIGHTBOX */}
      {lightboxRecord && (
        <PhotoLightbox
          record={lightboxRecord}
          onClose={() => setLightboxRecord(null)}
          onAddToCart={addToCart}
        />
      )}

      {/* TOP BANNER */}
      <div style={{ background: '#c9a84c', padding: '7px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: '#0d0d0d', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700' }}>
          🎵 New stock added weekly · Graded & Guaranteed · Ships Nationwide
        </span>
      </div>

      {/* NAV */}
      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
            <circle cx="20" cy="20" r="13" fill="#111" />
            <circle cx="20" cy="20" r="8" fill="#c9a84c" />
            <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
          </svg>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', fontWeight: '700', lineHeight: 1.1 }}>4 Ever Memories</div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase' }}>Record Store</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a href="/browse" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none', border: '1px solid #c9a84c', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}>
            🎵 Browse All Records
          </a>
          <a href="https://www.facebook.com/4evermemoriesHarlingen" target="_blank" rel="noreferrer"
            onClick={e => { e.preventDefault(); window.open('https://www.facebook.com/4evermemoriesHarlingen', 'facebook', 'width=600,height=700,left=200,top=100'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1877f2', color: '#fff', padding: '7px 14px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
          <button onClick={() => { setShowCart(true); setCheckoutStep('cart'); }}
            style={{ background: 'transparent', color: '#e8d5b0', border: '1px solid #333', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛒 Cart
            {totalQty > 0 && <span style={{ background: '#c9a84c', color: '#0d0d0d', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{totalQty}</span>}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero-section" style={{ position: 'relative', height: '400px', overflow: 'hidden' }}>
        <img src={STORE_PHOTOS[1]} alt="Store" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.3) saturate(0.7)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,13,13,0.2), rgba(13,13,13,0.9))' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          <h1 className="hero-title" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '54px', color: '#e8d5b0', fontWeight: '900', margin: '0 0 16px', lineHeight: 1.1, textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>
            Store Full of<br /><span style={{ color: '#c9a84c', fontStyle: 'italic' }}>Memories & Vinyls</span>
          </h1>
          <p style={{ fontSize: '15px', color: '#aaa', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.7, fontStyle: 'italic' }}>
            Handpicked vintage records with stories to tell. Every groove a memory waiting to be rediscovered.
          </p>
          <a href="/browse" style={{ background: '#c9a84c', color: '#0d0d0d', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Browse All Records →
          </a>
        </div>
      </div>

      {/* PHOTO STRIP */}
      <div className="photo-strip">
        {STORE_PHOTOS.map((src, i) => (
          <img key={i} src={src} alt={`Store photo ${i + 1}`} />
        ))}
      </div>

      {/* LATEST RECORDS */}
      <div className="section-padding" style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 32px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '28px', color: '#e8d5b0', margin: 0, fontWeight: '700' }}>Latest Arrivals</h2>
            <p style={{ fontSize: '13px', color: '#555', margin: '4px 0 0', fontStyle: 'italic' }}>Our 8 most recently added records</p>
          </div>
          <a href="/browse" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none', fontStyle: 'italic' }}>View all records →</a>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#555', fontStyle: 'italic' }}>
            Loading records...
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#555', fontStyle: 'italic' }}>
            No records in stock yet. Check back soon!
          </div>
        ) : (
          <div className="records-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px' }}>
            {records.map(record => {
              const cond = COND_COLORS[record.condition] || COND_COLORS['VG'];
              return (
                <div key={record.id} className="record-card"
                  style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', overflow: 'hidden' }}
                  onClick={() => setLightboxRecord(record)}>

                  {/* COVER PHOTO or VINYL PLACEHOLDER */}
                  <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: '#0a0a0a' }}>
                    {(() => {
                      // For 7" with no back cover (generic sleeve), show A side label
                      const cardPhoto = record.photo_cover || 
                        (record.category === '7" Vinyl' && !record.photo_b ? record.photo_a : null) ||
                        record.photo_a;
                      return cardPhoto ? (
                        <img src={cardPhoto} alt={record.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ padding: '20px' }}><VinylPlaceholder /></div>
                      );
                    })()}
                    {/* CONDITION BADGE */}
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: cond.bg, border: `1px solid ${cond.text}44`, borderRadius: '6px', padding: '3px 8px' }}>
                      <span style={{ fontSize: '10px', color: cond.text, fontWeight: '700' }}>{record.condition}</span>
                    </div>
                    {/* CATEGORY BADGE */}
                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '3px 8px' }}>
                      <span style={{ fontSize: '10px', color: '#c9a84c' }}>{record.category}</span>
                    </div>
                    {/* VIEW PHOTOS HINT */}
                    <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '10px', color: '#e8d5b0' }}>🔍 Click to view photos</span>
                    </div>
                  </div>

                  {/* INFO */}
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: '9px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>{record.sku}</div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', fontWeight: '700', color: '#e8d5b0', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</div>
                    <div style={{ fontSize: '12px', color: '#777', marginBottom: '12px', fontStyle: 'italic' }}>{record.artist} · {record.year}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', fontWeight: '700', color: '#c9a84c' }}>${parseFloat(record.price).toFixed(2)}</span>
                    </div>
                    <button className="add-btn"
                      onClick={e => { e.stopPropagation(); addToCart(record); }}
                      style={{ width: '100%', padding: '10px', background: addedId === record.id ? '#c9a84c' : '#1a1a1a', color: addedId === record.id ? '#0d0d0d' : '#c9a84c', border: `1px solid ${addedId === record.id ? '#c9a84c' : '#333'}`, borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', transition: 'all 0.2s' }}>
                      {addedId === record.id ? '✓ Added!' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#080808', borderTop: '1px solid #1a1a1a', padding: '40px 32px' }}>
        <div className="footer-grid" style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '40px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', color: '#e8d5b0', fontWeight: '700', marginBottom: '8px' }}>4 Ever Memories Records</div>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.7, fontStyle: 'italic', maxWidth: '300px' }}>Store full of memories and vinyls. Vintage records from every era, carefully graded and ready to spin.</p>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Shop</div>
            <div style={{ fontSize: '13px', color: '#555', lineHeight: 2 }}>
              <a href="/browse" style={{ color: '#555', textDecoration: 'none', display: 'block' }}>Browse All Records</a>
              <span style={{ color: '#333', fontSize: '11px' }}>New stock added weekly</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Connect</div>
            <a href="https://www.facebook.com/4evermemoriesHarlingen" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', textDecoration: 'none', fontSize: '13px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Follow us on Facebook
            </a>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#333' }}>© 2025 4 Ever Memories Records. All rights reserved.</span>
          <span style={{ fontSize: '11px', color: '#333', fontStyle: 'italic' }}>Vinyl · Memories · Music · <a href='/admin' style={{ color: '#2a2a2a', textDecoration: 'none', fontSize: '13px' }}>⚙</a></span>
        </div>
      </footer>

      {/* CART DRAWER */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div style={{ width: '440px', maxWidth: '100vw', background: '#0f0f0f', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #2a2a2a' }}>
            <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#e8d5b0', fontSize: '18px', fontWeight: '700' }}>
                {checkoutStep === 'cart' && '🛒 Your Cart'}
                {checkoutStep === 'info' && '📦 Checkout'}
                {checkoutStep === 'processing' && '⏳ Processing...'}
              </span>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '22px' }}>✕</button>
            </div>
            <div style={{ padding: '24px', flex: 1 }}>
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '60px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💿</div>
                      <p style={{ color: '#444', fontStyle: 'italic' }}>Your cart is empty.</p>
                    </div>
                  ) : (
                    <>
                      {cart.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px', marginBottom: '16px' }}>
                          {item.photo_cover && <img src={item.photo_cover} alt={item.title} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '14px', fontWeight: '700', color: '#e8d5b0' }}>{item.title}</div>
                            <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>{item.artist} · {item.condition}</div>
                            <div style={{ fontSize: '14px', color: '#c9a84c', marginTop: '2px' }}>${parseFloat(item.price).toFixed(2)} each</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => changeQty(item.id, -1)} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#e8d5b0', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>−</button>
                            <span style={{ fontSize: '14px', color: '#e8d5b0', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                            <button onClick={() => changeQty(item.id, 1)} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#e8d5b0', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>+</button>
                            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: '16px' }}>🗑</button>
                          </div>
                        </div>
                      ))}
                      <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: '#666' }}>Subtotal ({totalQty} item{totalQty !== 1 ? 's' : ''})</span>
                          <span style={{ fontSize: '13px', color: '#e8d5b0' }}>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', color: '#666' }}>Shipping</span>
                          <span style={{ fontSize: '13px', color: '#e8d5b0' }}>${shipping.toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#444', marginBottom: '12px', fontStyle: 'italic' }}>$5.00 first + $1.00 each additional</div>
                        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>Total</span>
                          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', color: '#c9a84c', fontWeight: '700' }}>${total.toFixed(2)}</span>
                        </div>
                      </div>
                      <button onClick={() => setCheckoutStep('info')}
                        style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginTop: '16px' }}>
                        Proceed to Checkout →
                      </button>
                    </>
                  )}
                </>
              )}
              {checkoutStep === 'info' && (
                <>
                  <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Shipping Information</div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '20px', background: '#0a0a0a', border: '1px solid #1a3a1a', padding: '12px', borderRadius: '8px', fontStyle: 'italic' }}>
                    🔒 You will be securely redirected to Square to complete payment.
                  </div>
                  {[{name:'name',placeholder:'Full Name'},{name:'email',placeholder:'Email Address'},{name:'address',placeholder:'Street Address'},{name:'city',placeholder:'City'},{name:'state',placeholder:'State'},{name:'zip',placeholder:'ZIP Code'}].map(f => (
                    <input key={f.name} name={f.name} placeholder={f.placeholder} value={form[f.name]} onChange={handleFormChange}
                      style={inp} />
                  ))}
                  {formError && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '8px' }}>{formError}</div>}
                  <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px', margin: '8px 0 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#666' }}>Subtotal</span>
                      <span style={{ fontSize: '13px', color: '#e8d5b0' }}>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#666' }}>Shipping</span>
                      <span style={{ fontSize: '13px', color: '#e8d5b0' }}>${shipping.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', color: '#e8d5b0', fontWeight: '700' }}>Total Due</span>
                      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#c9a84c', fontWeight: '700' }}>${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={handleCheckout}
                    style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '10px' }}>
                    💳 Continue to Payment →
                  </button>
                  <button onClick={() => setCheckoutStep('cart')}
                    style={{ width: '100%', padding: '12px', background: 'transparent', color: '#666', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}>
                    ← Back to Cart
                  </button>
                </>
              )}
              {checkoutStep === 'processing' && (
                <div style={{ textAlign: 'center', marginTop: '80px' }}>
                  <div style={{ fontSize: '56px', marginBottom: '20px' }}>💿</div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', marginBottom: '8px' }}>Preparing your order...</div>
                  <div style={{ fontSize: '13px', color: '#555', fontStyle: 'italic' }}>Redirecting to secure payment...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
