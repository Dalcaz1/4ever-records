export default function Success() {
  return (
    <div style={{ fontFamily: 'Georgia,serif', background: '#faf7f0', minHeight: '100vh' }}>
      <nav style={{ background: '#0f1828', borderBottom: '3px solid #c9a84c', padding: '14px 24px' }}>
        <div style={{ fontSize: '20px', color: '#c9a84c', fontWeight: '500' }}>4 Ever Memories Records</div>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#6a7d90', textTransform: 'uppercase' }}>Vinyl · Memories · Music</div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
        <h1 style={{ fontSize: '28px', color: '#1a2744', marginBottom: '12px' }}>Order Confirmed!</h1>
        <p style={{ fontSize: '15px', color: '#555', marginBottom: '8px', lineHeight: '1.6' }}>
          Thank you for your order from 4 Ever Memories Records!
        </p>
        <p style={{ fontSize: '14px', color: '#777', marginBottom: '32px', lineHeight: '1.6' }}>
          Your vinyl records will be carefully packed and shipped to you. You will receive a confirmation email shortly.
        </p>
        <a href="/"
          style={{ background: '#1a2744', color: '#c9a84c', padding: '12px 32px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Continue Shopping
        </a>
      </div>

      <div style={{ background: '#0f1828', borderTop: '2px solid #c9a84c', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', position: 'fixed', bottom: 0, width: '100%', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '11px', color: '#6a7d90' }}>About · Shipping · Returns · Contact</span>
        <span style={{ fontSize: '11px', color: '#4a5a6a' }}>2025 4 Ever Memories Records. All rights reserved.</span>
      </div>
    </div>
  );
}
