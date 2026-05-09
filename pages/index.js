import { useState, useEffect } from 'react';

const RECORDS = [
  { id: '4EMR-0001', a: 'Pink Floyd', t: 'Dark Side of the Moon', y: 1973, c: 'VG+', p: 47, col: '#8b1a1a' },
  { id: '4EMR-0002', a: 'Miles Davis', t: 'Kind of Blue', y: 1959, c: 'NM', p: 62, col: '#1a3a6a' },
  { id: '4EMR-0003', a: 'The Beatles', t: 'Abbey Road', y: 1969, c: 'VG+', p: 64, col: '#1a4a2a' },
  { id: '4EMR-0004', a: 'Marvin Gaye', t: "What's Going On", y: 1971, c: 'VG', p: 55, col: '#4a2a6a' },
  { id: '4EMR-0005', a: 'Carole King', t: 'Tapestry', y: 1971, c: 'VG+', p: 24, col: '#6a4a1a' },
  { id: '4EMR-0006', a: 'John Coltrane', t: 'A Love Supreme', y: 1965, c: 'M', p: 95, col: '#1a4a4a' },
  { id: '4EMR-0007', a: 'Stevie Wonder', t: 'Songs in the Key of Life', y: 1976, c: 'VG+', p: 42, col: '#4a3a1a' },
  { id: '4EMR-0008', a: 'Led Zeppelin', t: 'IV', y: 1971, c: 'VG', p: 38, col: '#1a1a5a' },
];

function calcShipping(qty) {
  if (qty === 0) return 0;
  return 5 + (qty - 1) * 1;
}

function VinylIcon({ color, size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block' }}>
      <circle cx="60" cy="60" r="58" fill="#0a0a0a" stroke="#222" strokeWidth="2" />
      <circle cx="60" cy="60" r="46" fill="#111" />
      <circle cx="60" cy="60" r="38" fill="#0d0d0d" />
      <circle cx="60" cy="60" r="28" fill="#161616" />
      <circle cx="60" cy="60" r="18" fill={color} opacity="0.9" />
      <circle cx="60" cy="60" r="14" fill={color} />
      <circle cx="60" cy="60" r="5" fill="#0a0a0a" />
      {[10,20,30,36,42,48].map(r => (
        <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.6" />
      ))}
    </svg>
  );
}

export default function Home() {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [addedId, setAddedId] = useState(null);
  const [spinning, setSpinning] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', state: '', zip: '' });
  const [formError, setFormError] = useState('');

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.p * i.qty, 0);
  const shipping = calcShipping(totalQty);
  const total = subtotal + shipping;

  function addToCart(record) {
    setCart(prev => {
      const exists = prev.find(i => i.id === record.id);
      if (exists) return prev.map(i => i.id === record.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...record, qty: 1 }];
    });
    setAddedId(record.id);
    setSpinning(record.id);
    setTimeout(() => setAddedId(null), 1500);
    setTimeout(() => setSpinning(null), 1500);
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

  const conditionColors = {
    'M': { bg: '#1a3a1a', text: '#4ade80', label: 'Mint' },
    'NM': { bg: '#1a3a2a', text: '#34d399', label: 'Near Mint' },
    'VG+': { bg: '#1a2a3a', text: '#60a5fa', label: 'VG+' },
    'VG': { bg: '#2a2a1a', text: '#fbbf24', label: 'Very Good' },
    'G': { bg: '#3a1a1a', text: '#f87171', label: 'Good' },
  };

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
        
        * { box-sizing: border-box; }
        
        .record-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .record-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.3); }
        
        .vinyl-spin { animation: spin 1.2s linear; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .add-btn { transition: all 0.2s ease; }
        .add-btn:hover { background: #c9a84c !important; color: #0d0d0d !important; transform: scale(1.02); }
        
        .grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }
        
        .hero-text { font-family: 'Playfair Display', Georgia, serif; }
        .body-text { font-family: 'Libre Baskerville', Georgia, serif; }

        .nav-link { transition: color 0.2s; }
        .nav-link:hover { color: #c9a84c !important; }

        .cart-item-row { transition: background 0.2s; }
        .cart-item-row:hover { background: rgba(201,168,76,0.05); }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      <div className="grain" />

      {/* TOP BANNER */}
      <div style={{ background: '#c9a84c', padding: '6px 24px', textAlign: 'center' }}>
        <span className="body-text" style={{ fontSize: '12px', color: '#0d0d0d', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700' }}>
          🎵 Free shipping on orders over $75 · Tue–Sat 11AM–8PM · Harlingen, TX
        </span>
      </div>

      {/* NAV */}
      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '42px', height: '42px', position: 'relative' }}>
            <svg width="42" height="42" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="20" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
              <circle cx="21" cy="21" r="14" fill="#111" />
              <circle cx="21" cy="21" r="8" fill="#c9a84c" />
              <circle cx="21" cy="21" r="3" fill="#0a0a0a" />
            </svg>
          </div>
          <div>
            <div className="hero-text" style={{ fontSize: '18px', color: '#e8d5b0', fontWeight: '700', letterSpacing: '0.5px', lineHeight: 1.1 }}>4 Ever Memories</div>
            <div className="body-text" style={{ fontSize: '9px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase' }}>Record Store</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          {['New Arrivals', 'Genres', 'About'].map(l => (
            <span key={l} className="nav-link body-text" style={{ fontSize: '12px', color: '#888', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>{l}</span>
          ))}
          <a href="https://www.facebook.com/4evermemoriesHarlingen" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1877f2', color: '#fff', padding: '7px 14px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', fontFamily: 'Georgia, serif' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
          <button onClick={() => { setShowCart(true); setCheckoutStep('cart'); }}
            style={{ background: 'transparent', color: '#e8d5b0', border: '1px solid #333', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Cart
            {totalQty > 0 && <span style={{ background: '#c9a84c', color: '#0d0d0d', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{totalQty}</span>}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1008 50%, #0d0d0d 100%)', borderBottom: '1px solid #2a2a2a', padding: '60px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-text" style={{ fontSize: '11px', letterSpacing: '5px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>Harlingen, Texas</div>
          <h1 className="hero-text" style={{ fontSize: '52px', color: '#e8d5b0', fontWeight: '900', margin: '0 0 16px', lineHeight: 1.1 }}>
            Store Full of<br /><span style={{ color: '#c9a84c', fontStyle: 'italic' }}>Memories & Vinyls</span>
          </h1>
          <p className="body-text" style={{ fontSize: '15px', color: '#888', maxWidth: '500px', margin: '0 auto 28px', lineHeight: 1.7, fontStyle: 'italic' }}>
            Handpicked vintage records with stories to tell. Every groove a memory waiting to be rediscovered.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 20px' }}>
              <span className="body-text" style={{ fontSize: '12px', color: '#c9a84c' }}>📦 Ships Nationwide</span>
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 20px' }}>
              <span className="body-text" style={{ fontSize: '12px', color: '#c9a84c' }}>🎵 Graded & Guaranteed</span>
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 20px' }}>
              <span className="body-text" style={{ fontSize: '12px', color: '#c9a84c' }}>💿 New Stock Weekly</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION HEADER */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h2 className="hero-text" style={{ fontSize: '28px', color: '#e8d5b0', margin: 0, fontWeight: '700' }}>Available Records</h2>
            <p className="body-text" style={{ fontSize: '13px', color: '#666', margin: '4px 0 0', fontStyle: 'italic' }}>{RECORDS.length} records in stock</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Jazz', 'Rock', 'Soul', 'Classical'].map(g => (
              <button key={g} style={{ background: g === 'All' ? '#c9a84c' : 'transparent', color: g === 'All' ? '#0d0d0d' : '#666', border: '1px solid #333', borderRadius: '20px', padding: '5px 14px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}>{g}</button>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', marginBottom: '60px' }}>
          {RECORDS.map(x => {
            const cond = conditionColors[x.c] || conditionColors['VG'];
            return (
              <div key={x.id} className="record-card" style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', overflow: 'hidden', cursor: 'default' }}>
                {/* VINYL DISPLAY */}
                <div style={{ background: 'linear-gradient(160deg, #0d0d0d, #1a1a1a)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <div className={spinning === x.id ? 'vinyl-spin' : ''} style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.8))' }}>
                    <VinylIcon color={x.col} size={130} />
                  </div>
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: cond.bg, border: `1px solid ${cond.text}33`, borderRadius: '6px', padding: '3px 8px' }}>
                    <span className="body-text" style={{ fontSize: '10px', color: cond.text, fontWeight: '700', letterSpacing: '1px' }}>{x.c}</span>
                  </div>
                </div>

                {/* INFO */}
                <div style={{ padding: '16px' }}>
                  <div className="body-text" style={{ fontSize: '9px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>{x.id}</div>
                  <div className="hero-text" style={{ fontSize: '15px', fontWeight: '700', color: '#e8d5b0', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.t}</div>
                  <div className="body-text" style={{ fontSize: '12px', color: '#888', marginBottom: '14px', fontStyle: 'italic' }}>{x.a} · {x.y}</div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <span className="hero-text" style={{ fontSize: '22px', fontWeight: '700', color: '#c9a84c' }}>${x.p}</span>
                      <span className="body-text" style={{ fontSize: '10px', color: '#555', marginLeft: '4px' }}>+ shipping</span>
                    </div>
                  </div>

                  <button className="add-btn"
                    onClick={() => addToCart(x)}
                    style={{ width: '100%', padding: '10px', background: addedId === x.id ? '#c9a84c' : '#1a1a1a', color: addedId === x.id ? '#0d0d0d' : '#c9a84c', border: `1px solid ${addedId === x.id ? '#c9a84c' : '#333'}`, borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
                    {addedId === x.id ? '✓ Added to Cart' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#080808', borderTop: '1px solid #1a1a1a', padding: '40px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '40px', marginBottom: '32px' }}>
          <div>
            <div className="hero-text" style={{ fontSize: '20px', color: '#e8d5b0', fontWeight: '700', marginBottom: '8px' }}>4 Ever Memories Records</div>
            <p className="body-text" style={{ fontSize: '13px', color: '#555', lineHeight: 1.7, fontStyle: 'italic', maxWidth: '300px' }}>
              Store full of memories and vinyls. Vintage records from every era, carefully graded and ready to spin.
            </p>
          </div>
          <div>
            <div className="body-text" style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Store Hours</div>
            <div className="body-text" style={{ fontSize: '13px', color: '#666', lineHeight: 2 }}>
              Tuesday – Saturday<br />
              11:00 AM – 8:00 PM<br />
              <span style={{ color: '#444' }}>Closed Sun & Mon</span>
            </div>
          </div>
          <div>
            <div className="body-text" style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Connect</div>
            <a href="https://www.facebook.com/4evermemoriesHarlingen" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', textDecoration: 'none', fontSize: '13px', fontFamily: 'Georgia, serif', marginBottom: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
            <div className="body-text" style={{ fontSize: '13px', color: '#444', fontStyle: 'italic' }}>Harlingen, Texas</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="body-text" style={{ fontSize: '11px', color: '#333' }}>© 2025 4 Ever Memories Records. All rights reserved.</span>
          <span className="body-text" style={{ fontSize: '11px', color: '#333', fontStyle: 'italic' }}>Vinyl · Memories · Music</span>
        </div>
      </footer>

      {/* CART DRAWER */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div style={{ width: '440px', maxWidth: '100vw', background: '#0f0f0f', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #2a2a2a' }}>
            
            <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="hero-text" style={{ color: '#e8d5b0', fontSize: '18px', fontWeight: '700' }}>
                {checkoutStep === 'cart' && '🛒 Your Cart'}
                {checkoutStep === 'info' && '📦 Checkout'}
                {checkoutStep === 'processing' && '⏳ Processing...'}
              </span>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '22px', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '24px', flex: 1 }}>

              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '60px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💿</div>
                      <p className="body-text" style={{ color: '#444', fontStyle: 'italic' }}>Your cart is empty.</p>
                    </div>
                  ) : (
                    <>
                      {cart.map(item => (
                        <div key={item.id} className="cart-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px', marginBottom: '16px', padding: '8px', borderRadius: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div className="hero-text" style={{ fontSize: '14px', fontWeight: '700', color: '#e8d5b0' }}>{item.t}</div>
                            <div className="body-text" style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>{item.a} · {item.c}</div>
                            <div className="hero-text" style={{ fontSize: '14px', color: '#c9a84c', marginTop: '2px' }}>${item.p} each</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={() => changeQty(item.id, -1)} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#e8d5b0', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <span className="body-text" style={{ fontSize: '14px', color: '#e8d5b0', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                            <button onClick={() => changeQty(item.id, 1)} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#e8d5b0', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: '16px' }}>🗑</button>
                          </div>
                        </div>
                      ))}

                      <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="body-text" style={{ fontSize: '13px', color: '#666' }}>Subtotal ({totalQty} record{totalQty !== 1 ? 's' : ''})</span>
                          <span className="body-text" style={{ fontSize: '13px', color: '#e8d5b0' }}>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="body-text" style={{ fontSize: '13px', color: '#666' }}>Shipping</span>
                          <span className="body-text" style={{ fontSize: '13px', color: '#e8d5b0' }}>${shipping.toFixed(2)}</span>
                        </div>
                        <div className="body-text" style={{ fontSize: '10px', color: '#444', marginBottom: '12px', fontStyle: 'italic' }}>$5.00 first record + $1.00 each additional</div>
                        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                          <span className="hero-text" style={{ fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>Total</span>
                          <span className="hero-text" style={{ fontSize: '20px', color: '#c9a84c', fontWeight: '700' }}>${total.toFixed(2)}</span>
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
                  <div className="body-text" style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Shipping Information</div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '20px', background: '#0a0a0a', border: '1px solid #1a3a1a', padding: '12px', borderRadius: '8px', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    🔒 You will be securely redirected to Square to complete payment.
                  </div>
                  {[
                    { name: 'name', placeholder: 'Full Name' },
                    { name: 'email', placeholder: 'Email Address' },
                    { name: 'address', placeholder: 'Street Address' },
                    { name: 'city', placeholder: 'City' },
                    { name: 'state', placeholder: 'State' },
                    { name: 'zip', placeholder: 'ZIP Code' },
                  ].map(f => (
                    <input key={f.name} name={f.name} placeholder={f.placeholder}
                      value={form[f.name]} onChange={handleFormChange}
                      style={{ width: '100%', padding: '11px 14px', border: '1px solid #2a2a2a', borderRadius: '8px', fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0', marginBottom: '10px', outline: 'none' }} />
                  ))}

                  {formError && <div className="body-text" style={{ color: '#f87171', fontSize: '12px', marginTop: '4px', marginBottom: '8px' }}>{formError}</div>}

                  <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px', margin: '16px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="body-text" style={{ fontSize: '13px', color: '#666' }}>Subtotal</span>
                      <span className="body-text" style={{ fontSize: '13px', color: '#e8d5b0' }}>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span className="body-text" style={{ fontSize: '13px', color: '#666' }}>Shipping</span>
                      <span className="body-text" style={{ fontSize: '13px', color: '#e8d5b0' }}>${shipping.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span className="hero-text" style={{ fontSize: '15px', color: '#e8d5b0', fontWeight: '700' }}>Total Due</span>
                      <span className="hero-text" style={{ fontSize: '18px', color: '#c9a84c', fontWeight: '700' }}>${total.toFixed(2)}</span>
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
                  <div style={{ fontSize: '56px', marginBottom: '20px', animation: 'spin 2s linear infinite', display: 'inline-block' }}>💿</div>
                  <div className="hero-text" style={{ fontSize: '18px', color: '#e8d5b0', marginBottom: '8px' }}>Preparing your order...</div>
                  <div className="body-text" style={{ fontSize: '13px', color: '#555', fontStyle: 'italic' }}>Redirecting to secure payment...</div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
