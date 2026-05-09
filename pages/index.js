import { useState } from 'react';

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

export default function Home() {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [addedId, setAddedId] = useState(null);
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
    setTimeout(() => setAddedId(null), 1200);
    setShowCart(true);
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  function changeQty(id, delta) {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    );
  }

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

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

  const s = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(10,14,24,0.7)',
      zIndex: 100, display: 'flex', justifyContent: 'flex-end',
    },
    drawer: {
      width: '420px', maxWidth: '100vw', background: '#faf7f0',
      height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
    },
    drawerHead: {
      background: '#0f1828', borderBottom: '2px solid #c9a84c',
      padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    input: {
      width: '100%', padding: '9px 12px', border: '1px solid #ccc', borderRadius: '6px',
      fontFamily: 'Georgia,serif', fontSize: '13px', background: '#fff', boxSizing: 'border-box',
    },
    btnPrimary: {
      width: '100%', padding: '12px', background: '#1a2744', color: '#c9a84c',
      border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
      fontFamily: 'Georgia,serif', textTransform: 'uppercase', letterSpacing: '1px',
      marginTop: '8px',
    },
    btnGhost: {
      background: 'none', border: 'none', cursor: 'pointer', color: '#c9a84c',
      fontSize: '20px', lineHeight: 1,
    },
  };

  return (
    <div style={{ fontFamily: 'Georgia,serif', background: '#faf7f0', minHeight: '100vh' }}>

      <nav style={{ background: '#0f1828', borderBottom: '3px solid #c9a84c', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '20px', color: '#c9a84c', fontWeight: '500' }}>4 Ever Memories Records</div>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#6a7d90', textTransform: 'uppercase' }}>Vinyl · Memories · Music</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="https://www.facebook.com/people/4-Ever-Memories-Record-Store/61561753862914/" target="_blank" rel="noreferrer"
            style={{ background: '#1877f2', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
            Follow on Facebook
          </a>
          <button onClick={() => { setShowCart(true); setCheckoutStep('cart'); }}
            style={{ background: '#c9a84c', color: '#0f1828', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: '13px', fontWeight: '600' }}>
            🛒 Cart {totalQty > 0 && <span style={{ background: '#8b1a1a', color: '#fff', borderRadius: '50%', padding: '1px 6px', fontSize: '11px', marginLeft: '4px' }}>{totalQty}</span>}
          </button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', maxWidth: '1200px', margin: '24px auto', padding: '0 24px' }}>
        {RECORDS.map(x => (
          <div key={x.id} style={{ background: '#fff', border: '1px solid #ddd5c0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '180px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: x.col }}></div>
              </div>
            </div>
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '9px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>{x.id}</div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a2744', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.t}</div>
              <div style={{ fontSize: '11px', color: '#777', marginBottom: '8px' }}>{x.a} · {x.y}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '500', color: '#8b1a1a' }}>${x.p}</span>
                <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '10px', background: '#e8f5ee', color: '#1e6b3a' }}>{x.c}</span>
              </div>
              <button onClick={() => addToCart(x)}
                style={{ width: '100%', padding: '7px', background: addedId === x.id ? '#1e6b3a' : '#1a2744', color: '#c9a84c', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia,serif', textTransform: 'uppercase', transition: 'background 0.3s' }}>
                {addedId === x.id ? '✓ Added!' : 'Add to Cart'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#0f1828', borderTop: '2px solid #c9a84c', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <span style={{ fontSize: '11px', color: '#6a7d90' }}>About · Shipping · Returns · Contact</span>
        <span style={{ fontSize: '11px', color: '#4a5a6a' }}>2025 4 Ever Memories Records. All rights reserved.</span>
      </div>

      {showCart && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div style={s.drawer}>
            <div style={s.drawerHead}>
              <span style={{ color: '#c9a84c', fontSize: '16px', fontWeight: '500' }}>
                {checkoutStep === 'cart' && '🛒 Your Cart'}
                {checkoutStep === 'info' && '📦 Checkout'}
                {checkoutStep === 'processing' && '⏳ Processing...'}
              </span>
              <button style={s.btnGhost} onClick={() => setShowCart(false)}>✕</button>
            </div>

            <div style={{ padding: '20px', flex: 1 }}>

              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>Your cart is empty.</p>
                  ) : (
                    <>
                      {cart.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8e0d0', paddingBottom: '12px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a2744' }}>{item.t}</div>
                            <div style={{ fontSize: '11px', color: '#777' }}>{item.a} · {item.c}</div>
                            <div style={{ fontSize: '12px', color: '#8b1a1a', marginTop: '2px' }}>${item.p} each</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => changeQty(item.id, -1)} style={{ ...s.btnGhost, fontSize: '16px', color: '#1a2744' }}>−</button>
                            <span style={{ fontSize: '14px', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                            <button onClick={() => changeQty(item.id, 1)} style={{ ...s.btnGhost, fontSize: '16px', color: '#1a2744' }}>+</button>
                            <button onClick={() => removeFromCart(item.id)} style={{ ...s.btnGhost, fontSize: '14px', color: '#999' }}>🗑</button>
                          </div>
                        </div>
                      ))}
                      <div style={{ background: '#f5f0e8', borderRadius: '8px', padding: '14px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span>Subtotal ({totalQty} record{totalQty !== 1 ? 's' : ''})</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#555' }}>
                          <span>Shipping</span><span>${shipping.toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '10px' }}>
                          $5.00 first record + $1.00 each additional
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '600', color: '#1a2744', borderTop: '1px solid #ddd5c0', paddingTop: '8px' }}>
                          <span>Total</span><span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                      <button style={s.btnPrimary} onClick={() => setCheckoutStep('info')}>
                        Proceed to Checkout →
                      </button>
                    </>
                  )}
                </>
              )}

              {checkoutStep === 'info' && (
                <>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a2744', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Shipping Information</div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '16px', background: '#e8f5ee', padding: '10px', borderRadius: '6px' }}>
                    You will be redirected to Square to securely enter your payment details.
                  </div>
                  {['name', 'email', 'address', 'city', 'state', 'zip'].map(field => (
                    <input key={field} name={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      value={form[field]} onChange={handleFormChange}
                      style={{ ...s.input, marginBottom: '8px' }} />
                  ))}

                  {formError && <div style={{ color: '#8b1a1a', fontSize: '12px', marginTop: '8px' }}>{formError}</div>}

                  <div style={{ background: '#f5f0e8', borderRadius: '8px', padding: '12px', margin: '16px 0 4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span>Shipping</span><span>${shipping.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '600', color: '#1a2744', borderTop: '1px solid #ddd5c0', paddingTop: '8px', marginTop: '4px' }}>
                      <span>Total Due</span><span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button style={s.btnPrimary} onClick={handleCheckout}>
                    💳 Continue to Payment →
                  </button>
                  <button style={{ ...s.btnPrimary, background: 'transparent', color: '#1a2744', border: '1px solid #ccc', marginTop: '6px' }} onClick={() => setCheckoutStep('cart')}>
                    ← Back to Cart
                  </button>
                </>
              )}

              {checkoutStep === 'processing' && (
                <div style={{ textAlign: 'center', marginTop: '60px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
                  <div style={{ fontSize: '16px', color: '#1a2744' }}>Preparing your order...</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Redirecting to secure payment...</div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
