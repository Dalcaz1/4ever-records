import { useEffect, useState } from 'react';

export default function Success() {
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    async function markSold() {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('orderId') || params.get('order_id');
        if (!orderId) return;

        await fetch('/api/mark-sold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        // Clear the cart from localStorage
        localStorage.removeItem('4em_cart');
        setProcessed(true);
      } catch (err) {
        console.error('Mark sold error:', err);
      }
    }
    markSold();
  }, []);

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 32px', display: 'flex', alignItems: 'center', height: '72px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
            <circle cx="20" cy="20" r="13" fill="#111" />
            <circle cx="20" cy="20" r="8" fill="#c9a84c" />
            <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
          </svg>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e8d5b0', fontWeight: '700', lineHeight: 1.1 }}>4 Ever Memories</div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase' }}>Record Store</div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: '24px' }}>🎉</div>

        <div style={{ background: '#111', border: '2px solid #c9a84c', borderRadius: '20px', padding: '40px', marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#c9a84c', marginBottom: '12px', fontWeight: '700' }}>
            Order Confirmed!
          </h1>
          <p style={{ fontSize: '15px', color: '#aaa', marginBottom: '8px', lineHeight: '1.7', fontStyle: 'italic' }}>
            Thank you for your order from 4 Ever Memories Records!
          </p>
          <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.7' }}>
            Your vinyl records will be carefully packed and shipped to you. You will receive a confirmation email from Square shortly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/"
            style={{ background: '#c9a84c', color: '#0d0d0d', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', fontFamily: 'Georgia, serif' }}>
            Continue Shopping
          </a>
          <a href="/browse"
            style={{ background: 'transparent', color: '#c9a84c', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', fontFamily: 'Georgia, serif', border: '1px solid #c9a84c' }}>
            Browse More Records
          </a>
        </div>
      </div>

      <footer style={{ background: '#080808', borderTop: '1px solid #1a1a1a', padding: '20px 32px', textAlign: 'center', position: 'fixed', bottom: 0, width: '100%' }}>
        <span style={{ fontSize: '11px', color: '#333' }}>© 2025 4 Ever Memories Records. All rights reserved.</span>
      </footer>
    </div>
  );
}
