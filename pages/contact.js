import { useEffect } from 'react';

export default function Contact() {
  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        .contact-card { transition: transform 0.2s ease; }
        .contact-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
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
        </a>
        <a href="/" style={{ color: '#888', fontSize: '13px', textDecoration: 'none', fontFamily: 'Georgia, serif' }}>← Back to Store</a>
      </nav>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(to bottom, #111, #0d0d0d)', borderBottom: '1px solid #1a1a1a', padding: '60px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎵</div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '36px', color: '#e8d5b0', fontWeight: '900', margin: '0 0 16px', lineHeight: 1.2 }}>
          Thinking About Selling<br />
          <span style={{ color: '#c9a84c', fontStyle: 'italic' }}>Your Record Collection?</span>
        </h1>
        <p style={{ fontSize: '16px', color: '#888', maxWidth: '560px', margin: '0 auto', lineHeight: 1.8, fontStyle: 'italic' }}>
          Whether you have a handful of 45s or a basement full of vinyl, we would love to hear from you. Every record has a story — and we are passionate about giving them a new home.
        </p>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* INTRO BOX */}
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '32px', marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', color: '#e8d5b0', fontWeight: '700', marginBottom: '12px' }}>
            We Are Always Looking to Buy
          </div>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.8, margin: '0 0 20px', fontStyle: 'italic' }}>
            From a single rare pressing to an entire estate collection — we are interested. We buy 7" singles, 12" albums, CDs, cassettes, and 8-tracks. No collection is too small or too large.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['7" Singles', '12" Albums', 'CDs', 'Cassettes', '8-Tracks', 'Collections'].map(item => (
              <span key={item} style={{ background: '#1a1a0a', border: '1px solid #c9a84c44', color: '#c9a84c', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', letterSpacing: '1px' }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* CONTACT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>

          {/* EMAIL */}
          <a href="mailto:4evermemoriesrecordstore@gmail.com" className="contact-card"
            style={{ background: '#111', border: '2px solid #c9a84c44', borderRadius: '16px', padding: '28px', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
            <div style={{ width: '56px', height: '56px', background: '#1a1a0a', border: '2px solid #c9a84c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              ✉️
            </div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>Email Us</div>
            <div style={{ fontSize: '12px', color: '#c9a84c', wordBreak: 'break-all' }}>4evermemoriesrecordstore@gmail.com</div>
            <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>We typically respond within 24 hours</div>
          </a>

          {/* PHONE/TEXT */}
          <a href="tel:+19562912538" className="contact-card"
            style={{ background: '#111', border: '2px solid #c9a84c44', borderRadius: '16px', padding: '28px', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
            <div style={{ width: '56px', height: '56px', background: '#1a1a0a', border: '2px solid #c9a84c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              📱
            </div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>Call or Text</div>
            <div style={{ fontSize: '18px', color: '#c9a84c', fontWeight: '700', letterSpacing: '1px' }}>(956) 291-2538</div>
            <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>Text or call — whichever you prefer</div>
          </a>
        </div>

        {/* WHAT TO EXPECT */}
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px' }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', fontWeight: '700', marginBottom: '20px', textAlign: 'center' }}>
            What to Expect
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              { icon: '📸', title: 'Share Photos', desc: 'Send us photos of your collection and we will take a look' },
              { icon: '💰', title: 'Get an Offer', desc: 'We will make you a fair offer based on current market values' },
              { icon: '🤝', title: 'Easy Pickup', desc: 'We can arrange pickup or you can bring them to us' },
            ].map(item => (
              <div key={item.title} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontSize: '13px', color: '#c9a84c', fontWeight: '700', marginBottom: '6px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer style={{ background: '#080808', borderTop: '1px solid #1a1a1a', padding: '20px 32px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', color: '#333' }}>© 2025 4 Ever Memories Records. All rights reserved.</span>
      </footer>
    </div>
  );
}
