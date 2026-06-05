export const getServerSideProps = async () => ({ props: {} });

import { useState, useEffect } from 'react';

function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsInstalled(standalone);
    setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    function handleBeforeInstall(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  async function triggerInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    }
  }

  return { installPrompt, isInstalled, isIos, isMobile, triggerInstall };
}

export default function InstallPage() {
  const { installPrompt, isInstalled, isIos, isMobile, triggerInstall } = useInstallPrompt();
  const [iosStep, setIosStep] = useState(false);
  const [copied, setCopied] = useState(false);

  const showAndroidInstall = installPrompt && !isInstalled;
  const showIosInstall = isIos && !isInstalled;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText('https://www.4evermemoriesrecordstore.com');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .feature-card { background: #111; border: 1px solid #2a2a2a; border-radius: 14px; padding: 20px; display: flex; align-items: flex-start; gap: 14px; }
        .install-btn { transition: all 0.2s; }
        .install-btn:hover { transform: scale(1.03); }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.5); } 50% { box-shadow: 0 0 0 16px rgba(201,168,76,0); } }
        .pulse { animation: pulse 2s infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease forwards; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="36" height="36" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
            <circle cx="20" cy="20" r="13" fill="#111" />
            <circle cx="20" cy="20" r="8" fill="#c9a84c" />
            <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
          </svg>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase' }}>Record Store</div>
          </div>
        </div>
        <a href="/" style={{ color: '#c9a84c', fontSize: '12px', textDecoration: 'none', border: '1px solid #c9a84c44', borderRadius: '8px', padding: '7px 14px', fontFamily: 'Georgia, serif' }}>
          Browse Store →
        </a>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 24px 60px' }}>

        {/* HERO */}
        <div className="fade-in" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
            <img src="/icons/icon-192.png" alt="4 Ever Memories" style={{ width: '96px', height: '96px', borderRadius: '22px', boxShadow: '0 8px 32px rgba(201,168,76,0.3)' }} />
            <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', background: '#4ade80', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', border: '2px solid #0d0d0d' }}>✓</div>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '32px', color: '#e8d5b0', fontWeight: '900', margin: '0 0 12px', lineHeight: 1.2 }}>
            4 Ever Memories<br /><span style={{ color: '#c9a84c', fontStyle: 'italic' }}>Record Store</span>
          </h1>
          <p style={{ fontSize: '15px', color: '#aaa', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 8px' }}>
            Browse our full vinyl inventory, shop from your phone, and get instant access to new arrivals — right from your home screen.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            Free · No app store required · Works on iPhone and Android
          </p>
        </div>

        {/* INSTALL SECTION */}
        {isInstalled ? (
          <div className="fade-in" style={{ background: '#0a1a0a', border: '2px solid #4ade80', borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', color: '#4ade80', fontWeight: '700', marginBottom: '8px' }}>Already Installed!</div>
            <div style={{ fontSize: '13px', color: '#ccc', fontStyle: 'italic', marginBottom: '20px' }}>You already have 4 Ever Memories on your home screen.</div>
            <a href="/" style={{ display: 'inline-block', background: '#c9a84c', color: '#0d0d0d', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Browse Records →
            </a>
          </div>
        ) : showAndroidInstall ? (
          <div className="fade-in" style={{ marginBottom: '32px' }}>
            <button className="install-btn pulse" onClick={triggerInstall}
              style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              📲 Install on Your Phone
            </button>
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
              One tap — goes straight to your home screen
            </p>
          </div>
        ) : showIosInstall ? (
          <div className="fade-in" style={{ marginBottom: '32px' }}>
            {!iosStep ? (
              <button className="install-btn pulse" onClick={() => setIosStep(true)}
                style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#0d0d0d', border: 'none', borderRadius: '14px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                📲 Add to Home Screen
              </button>
            ) : (
              <div style={{ background: '#111', border: '1px solid #c9a84c44', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '14px', color: '#c9a84c', fontWeight: '700', marginBottom: '20px', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  3 Quick Steps
                </div>
                {[
                  { num: '1', icon: '⬆️', title: 'Tap Share', desc: 'Tap the Share button at the bottom of Safari — it looks like a box with an arrow pointing up.' },
                  { num: '2', icon: '➕', title: 'Add to Home Screen', desc: 'Scroll down in the share menu and tap "Add to Home Screen".' },
                  { num: '3', icon: '✅', title: 'Tap Add', desc: 'Tap "Add" in the top right corner. The 4 Ever Memories icon appears on your home screen.' },
                ].map(s => (
                  <div key={s.num} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '18px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#c9a84c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#0d0d0d', flexShrink: 0 }}>{s.num}</div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#e8d5b0', fontWeight: '700', marginBottom: '3px' }}>{s.icon} {s.title}</div>
                      <div style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setIosStep(false)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', marginTop: '4px' }}>
                  ← Back
                </button>
              </div>
            )}
          </div>
        ) : !isMobile ? (
          <div className="fade-in" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📱</div>
            <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700', marginBottom: '8px', fontFamily: "'Playfair Display', Georgia, serif" }}>Open this on your phone</div>
            <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', marginBottom: '20px' }}>Visit this page on your iPhone or Android to install the app on your home screen.</div>
            <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#c9a84c', fontFamily: 'monospace' }}>4evermemoriesrecordstore.com/install</span>
              <button onClick={copyLink} style={{ background: 'none', border: '1px solid #333', color: copied ? '#4ade80' : '#aaa', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>Or text yourself the link above</div>
          </div>
        ) : (
          <div className="fade-in" style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '13px', color: '#aaa', fontStyle: 'italic', marginBottom: '16px' }}>Use your browser menu to add this page to your home screen.</div>
            <a href="/" style={{ display: 'inline-block', background: '#c9a84c', color: '#0d0d0d', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Browse Records →
            </a>
          </div>
        )}

        {/* FEATURES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          {[
            { icon: '🎵', title: 'Full Inventory', desc: 'Browse our complete collection of vinyl, CDs, cassettes, and 8-tracks — updated weekly with new arrivals.' },
            { icon: '🛒', title: 'Shop from Your Phone', desc: 'Add to cart, checkout securely, and ship nationwide — all from your home screen.' },
            { icon: '💿', title: 'Every Format', desc: '7" singles, 12" LPs, CDs, cassettes, 8-tracks. Jazz, Rock, Blues, Country, Spanish, Classical and more.' },
            { icon: '🌎', title: 'South Texas Specialists', desc: 'The largest curated selection of Tejano, Conjunto, and Regional Mexican records available online.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ fontSize: '28px', flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700', marginBottom: '4px', fontFamily: "'Playfair Display', Georgia, serif" }}>{f.title}</div>
                <div style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* SHARE SECTION */}
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '20px', marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#c9a84c', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Share with Friends</div>
          <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', marginBottom: '16px' }}>Know someone who loves vinyl? Send them this link.</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={'sms:?body=' + encodeURIComponent('Check out 4 Ever Memories Record Store — browse vinyl, CDs, cassettes and more: https://www.4evermemoriesrecordstore.com/install')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a3a1a', color: '#4ade80', border: '1px solid #2a4a2a', borderRadius: '8px', padding: '9px 14px', textDecoration: 'none', fontSize: '12px', fontFamily: 'Georgia, serif' }}>
              💬 Text a Friend
            </a>
            <a href={'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://www.4evermemoriesrecordstore.com/install')}
              target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0a1a3a', color: '#60a5fa', border: '1px solid #1a2a4a', borderRadius: '8px', padding: '9px 14px', textDecoration: 'none', fontSize: '12px', fontFamily: 'Georgia, serif' }}>
              📘 Share on Facebook
            </a>
            <button onClick={copyLink}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a1a', color: copied ? '#4ade80' : '#e8d5b0', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          </div>
        </div>

        {/* BROWSE CTA */}
        <div style={{ textAlign: 'center' }}>
          <a href="/browse" style={{ display: 'inline-block', background: '#c9a84c', color: '#0d0d0d', padding: '14px 36px', borderRadius: '12px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
            Browse All Records →
          </a>
          <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>
            <a href="tel:+19568733818" style={{ color: '#555', textDecoration: 'none' }}>📱 (956) 873-3818</a>
            {' · '}
            <a href="https://www.facebook.com/4evermemoriesHarlingen" target="_blank" rel="noreferrer" style={{ color: '#555', textDecoration: 'none' }}>Facebook</a>
          </div>
        </div>

      </div>
    </div>
  );
}
