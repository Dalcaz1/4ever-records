export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        .policy-section { margin-bottom: 24px; }
        .policy-section h2 { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #e8d5b0; font-weight: 700; margin: 0 0 12px; }
        .policy-section p, .policy-section li { font-size: 14px; color: #999; line-height: 1.8; margin: 0 0 12px; }
        .policy-section ul { margin: 0 0 12px; padding-left: 24px; }
        .policy-section strong { color: #c9a84c; }
        .policy-section a { color: #c9a84c; text-decoration: underline; }
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
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '36px', color: '#e8d5b0', fontWeight: '900', margin: '0 0 16px', lineHeight: 1.2 }}>
          Privacy <span style={{ color: '#c9a84c', fontStyle: 'italic' }}>Policy</span>
        </h1>
        <p style={{ fontSize: '14px', color: '#666', maxWidth: '560px', margin: '0 auto', lineHeight: 1.8, fontStyle: 'italic' }}>
          Last updated: June 15, 2026
        </p>
        <p style={{ fontSize: '16px', color: '#888', maxWidth: '600px', margin: '12px auto 0', lineHeight: 1.8, fontStyle: 'italic' }}>
          This policy covers 4 Ever Memories Records and FYT: Find Your Tunes — our AI-powered record identification and pricing app. We've tried to write it in plain English.
        </p>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 32px 80px' }}>

        <div className="policy-section" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px' }}>
          <h2>Information We Collect</h2>
          <p><strong>Account information.</strong> When you create an FYT account, we collect your email address and a password (stored securely and encrypted by our authentication provider — we never see or store your password in plain text).</p>
          <p><strong>Payment information.</strong> Subscriptions are processed by Stripe. We do not collect or store your card number — Stripe handles all payment details under its own security standards (PCI-DSS compliant).</p>
          <p><strong>Photos you take or upload.</strong> When you scan an item, the photos you capture are sent to our identification service to determine what it is and what it's worth. If you save an item to your personal collection, those photos are stored so you can view them later.</p>
          <p><strong>Your collection data.</strong> If you choose to save items to your personal collection, we store the details you provide or that our service identifies — artist, title, format, condition, estimated value, and (if you enter it) what you paid for the item.</p>
          <p><strong>Usage data.</strong> We collect basic usage information (such as which features are used) to understand how the app is used and to fix problems.</p>
        </div>

        <div className="policy-section" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px' }}>
          <h2>How We Use Your Information</h2>
          <ul>
            <li>To identify items from your photos and provide market pricing information using AI-based image recognition</li>
            <li>To create and maintain your account and personal collection</li>
            <li>To process subscription payments and manage your plan</li>
            <li>To check whether an item you've scanned may be available in 4 Ever Memories Records' live inventory (only the artist and title are used for this check — no personal information is shared)</li>
            <li>To improve, troubleshoot, and maintain the app</li>
          </ul>
        </div>

        <div className="policy-section" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px' }}>
          <h2>Third-Party Services We Use</h2>
          <p>We rely on a small number of trusted service providers to run FYT:</p>
          <ul>
            <li><strong>Supabase</strong> — provides our database, account login system, and secure photo storage. Your account data and photos are stored on Supabase's infrastructure with access controls so only you can see your own data.</li>
            <li><strong>Stripe</strong> — handles all subscription billing and payment processing. See Stripe's own privacy policy for how it handles payment data.</li>
            <li><strong>AI image recognition providers</strong> — photos you scan are sent to third-party AI services to identify the item and read pressing details. These providers process the image to return results to FYT and do not use your photos to identify you personally.</li>
            <li><strong>Pricing data sources</strong> — we pull current market pricing from public marketplace data (such as Discogs and eBay sold listings). This is aggregate market data and does not involve sharing your personal information.</li>
            <li><strong>YouTube</strong> — when available, we show an embedded YouTube preview of the item you scanned. This is subject to YouTube's own privacy policy and terms.</li>
          </ul>
        </div>

        <div className="policy-section" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px' }}>
          <h2>Data Storage &amp; Security</h2>
          <p>All data is transmitted over encrypted (HTTPS) connections. Your account data, photos, and collection items are protected by access controls that restrict them to your account only — we don't browse, sell, or share your personal collection data.</p>
        </div>

        <div className="policy-section" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px' }}>
          <h2>Your Rights &amp; Choices</h2>
          <ul>
            <li>You can view, edit, or delete any item in your personal collection at any time from within the app.</li>
            <li>You can cancel your subscription at any time; your account will revert to the free tier at the end of your current billing period.</li>
            <li>To request a copy of your data or full deletion of your account and associated data, email us at <a href="mailto:4evermemoriesrecordstore@gmail.com">4evermemoriesrecordstore@gmail.com</a> and we'll take care of it.</li>
          </ul>
        </div>

        <div className="policy-section" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px' }}>
          <h2>Children's Privacy</h2>
          <p>FYT is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will remove it.</p>
        </div>

        <div className="policy-section" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px' }}>
          <h2>Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. If we make material changes, we'll update the "Last updated" date at the top of this page. We encourage you to review this page periodically.</p>
        </div>

        <div className="policy-section" style={{ background: '#111', border: '2px solid #c9a84c44', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
          <h2 style={{ textAlign: 'center' }}>Questions?</h2>
          <p style={{ marginBottom: '4px' }}>If you have any questions about this Privacy Policy or your data, reach out anytime:</p>
          <a href="mailto:4evermemoriesrecordstore@gmail.com" style={{ fontSize: '16px', fontWeight: '700' }}>4evermemoriesrecordstore@gmail.com</a>
        </div>

      </div>

      {/* FOOTER */}
      <footer style={{ background: '#080808', borderTop: '1px solid #1a1a1a', padding: '20px 32px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', color: '#333' }}>© 2025 4 Ever Memories Records. All rights reserved.</span>
      </footer>
    </div>
  );
}
