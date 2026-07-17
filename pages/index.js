export const getServerSideProps = async () => ({ props: {} });

import { useState, useEffect, useRef } from 'react';

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

function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsInstalled(isStandalone);
    setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    function handleBeforeInstall(e) { e.preventDefault(); setInstallPrompt(e); }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => { window.removeEventListener('beforeinstallprompt', handleBeforeInstall); };
  }, []);

  async function triggerInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') { setIsInstalled(true); setInstallPrompt(null); }
    } else if (isIos) {
      setShowIosInstructions(true);
    }
  }

  return { installPrompt, isInstalled, isIos, triggerInstall, showIosInstructions, setShowIosInstructions };
}

function IosInstallModal({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#111', border: '1px solid #c9a84c44', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '28px 24px', fontFamily: 'Georgia, serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>📲 Add to Home Screen</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <img src="/icons/icon-192.png" alt="App icon" style={{ width: '56px', height: '56px', borderRadius: '12px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '15px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
            <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic' }}>Record Store</div>
          </div>
        </div>
        {[
          { step: '1', text: 'Tap the Share button at the bottom of your browser (the box with an arrow pointing up)' },
          { step: '2', text: 'Scroll down and tap "Add to Home Screen"' },
          { step: '3', text: 'Tap "Add" — the 4 Ever Memories icon will appear on your home screen' },
        ].map(s => (
          <div key={s.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '28px', height: '28px', background: '#c9a84c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#0d0d0d', flexShrink: 0 }}>{s.step}</div>
            <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.5, paddingTop: '4px' }}>{s.text}</div>
          </div>
        ))}
        <button onClick={onClose} style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginTop: '8px' }}>Got it ✓</button>
      </div>
    </div>
  );
}

function InstallBanner({ installPrompt, isInstalled, isIos, triggerInstall }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('4em_install_dismissed');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isStandalone && !dismissed && isMobile && !isInstalled) setShow(true);
  }, [isInstalled]);
  function dismiss() { localStorage.setItem('4em_install_dismissed', 'true'); setShow(false); }
  if (!show || isInstalled) return null;
  return (
    <div style={{ background: '#1a1a0a', borderBottom: '1px solid #c9a84c44', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <img src="/icons/icon-192.png" alt="App icon" style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '12px', color: '#c9a84c', fontWeight: '700', fontFamily: 'Georgia, serif' }}>Add to Home Screen</div>
          <div style={{ fontSize: '11px', color: '#ccc', fontFamily: 'Georgia, serif' }}>{isIos ? 'Tap Share then "Add to Home Screen"' : 'Install the app for quick access'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {!isIos && installPrompt && <button onClick={triggerInstall} style={{ background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>Install</button>}
        {isIos && <button onClick={triggerInstall} style={{ background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>How to Install</button>}
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>✕</button>
      </div>
    </div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const url = 'https://www.4evermemoriesrecordstore.com';
  const text = '🎵 Check out 4 Ever Memories Record Store — vintage vinyl, CDs, cassettes and more!';
  async function handleShare() {
    if (navigator.share) { try { await navigator.share({ title: '4 Ever Memories Record Store', text, url }); return; } catch {} }
    setShowMenu(true);
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => { setCopied(false); setShowMenu(false); }, 2000); } catch {}
  }
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#e8d5b0', border: '1px solid #333', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>🔗 Share</button>
      {showMenu && (
        <div style={{ position: 'absolute', top: '44px', right: 0, background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '8px', zIndex: 200, minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          <button onClick={copyLink} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: copied ? '#4ade80' : '#e8d5b0', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textAlign: 'left', borderRadius: '6px' }}>{copied ? '✓ Link copied!' : '📋 Copy link'}</button>
          <a href={'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '10px 14px', color: '#e8d5b0', fontSize: '13px', textDecoration: 'none', fontFamily: 'Georgia, serif', borderRadius: '6px' }}>📘 Share on Facebook</a>
          <a href={'sms:?body=' + encodeURIComponent(text + ' ' + url)} style={{ display: 'block', padding: '10px 14px', color: '#e8d5b0', fontSize: '13px', textDecoration: 'none', fontFamily: 'Georgia, serif', borderRadius: '6px' }}>💬 Send via Text</a>
          <a href={'mailto:?subject=4 Ever Memories Record Store&body=' + encodeURIComponent(text + '\n\n' + url)} style={{ display: 'block', padding: '10px 14px', color: '#e8d5b0', fontSize: '13px', textDecoration: 'none', fontFamily: 'Georgia, serif', borderRadius: '6px' }}>📧 Send via Email</a>
          <button onClick={() => setShowMenu(false)} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#aaa', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', textAlign: 'left', borderRadius: '6px' }}>✕ Cancel</button>
        </div>
      )}
      {showMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowMenu(false)} />}
    </div>
  );
}

function EbaySimilar({ artist }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memorabilia, setMemorabilia] = useState([]);
  const [fetched, setFetched] = useState(false);
  function toggle() {
    setOpen(function(prev) { return !prev; });
    if (!fetched) {
      setLoading(true);
      fetch('/api/ebay-similar?artist=' + encodeURIComponent(artist)).then(function(r) { return r.json(); }).then(function(data) { setMemorabilia(data.memorabilia || []); setLoading(false); setFetched(true); }).catch(function() { setLoading(false); });
    }
  }
  return (
    <div style={{ borderTop: '1px solid #1a1a1a', marginTop: '16px', paddingTop: '12px' }}>
      <button onClick={toggle} style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#c9a84c', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{'🎁 Shop ' + artist + ' collectibles & memorabilia on eBay'}</span><span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: '10px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px', fontStyle: 'italic' }}>Loading eBay listings...</div>}
          {!loading && memorabilia.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>{artist + ' Posters · Books · Signed Items · Merch'}</div>
              {memorabilia.map(function(item, i) {
                return (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1a1a1a', textDecoration: 'none' }}>
                    {item.image && <img src={item.image} alt={item.title} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />}
                    <div style={{ flex: 1, overflow: 'hidden' }}><div style={{ fontSize: '11px', color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div><div style={{ fontSize: '10px', color: '#aaa' }}>{item.condition}</div></div>
                    <div style={{ fontSize: '13px', color: '#c9a84c', fontWeight: '700', flexShrink: 0 }}>{'$' + item.price}</div>
                  </a>
                );
              })}
            </div>
          )}
          {!loading && memorabilia.length === 0 && fetched && <div style={{ textAlign: 'center', padding: '16px', color: '#bbb', fontSize: '12px', fontStyle: 'italic' }}>No eBay listings found</div>}
          <div style={{ fontSize: '10px', color: '#bbb', textAlign: 'center', marginTop: '10px', fontStyle: 'italic' }}>Purchases on eBay support 4 Ever Memories</div>
        </div>
      )}
    </div>
  );
}

function MusicPreview({ artist, title, format }) {
  const [open, setOpen] = useState(false);
  const [videoId, setVideoId] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  function toggle() {
    setOpen(function(prev) { return !prev; });
    if (!fetched) {
      setLoading(true);
      const params = new URLSearchParams({ artist, title: title || '', format: format || '' });
      fetch('/api/youtube-search?' + params.toString()).then(function(r) { return r.json(); }).then(function(data) { setVideoId(data.videoId || null); setVideoTitle(data.videoTitle || ''); setLoading(false); setFetched(true); }).catch(function() { setLoading(false); setFetched(true); });
    }
  }
  const isAlbum = (format && format.indexOf('12') !== -1) || format === 'CD' || format === 'Cassette' || format === '8-Track';
  const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(artist + ' ' + (title || ''));
  return (
    <div style={{ marginTop: '12px' }}>
      <button onClick={toggle} style={{ width: '100%', padding: '10px 14px', background: open ? '#1a0a0a' : '#0a0a0a', border: '1px solid ' + (open ? '#f87171' : '#2a2a2a'), borderRadius: '8px', color: open ? '#f87171' : '#e8d5b0', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{open ? '⏹ Close player' : '▶ Preview this ' + (isAlbum ? 'album' : 'song') + ' on YouTube'}</span>
        <span style={{ fontSize: '10px', color: '#aaa' }}>via YouTube</span>
      </button>
      {open && (
        <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
          {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px', fontStyle: 'italic' }}>Finding video...</div>}
          {!loading && videoId && <iframe width="100%" height="200" src={'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0&modestbranding=1'} title={videoTitle || artist + ' ' + title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display: 'block' }} />}
          {!loading && !videoId && fetched && <div style={{ padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', fontStyle: 'italic' }}>No video found</div><a href={searchUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#c9a84c', textDecoration: 'none' }}>{'Search YouTube for ' + artist + ' →'}</a></div>}
          {!loading && videoId && <div style={{ padding: '6px 10px', background: '#0a0a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '10px', color: '#bbb', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{videoTitle || artist + ' - ' + title}</span><a href={searchUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#c9a84c', textDecoration: 'none', flexShrink: 0, marginLeft: '8px' }}>YouTube →</a></div>}
        </div>
      )}
    </div>
  );
}

function PhotoLightbox({ record, onClose, onAddToCart }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
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
  const photos = [record.photo_cover && { url: record.photo_cover, label: labels[0] || 'Front' }, record.photo_a && { url: record.photo_a, label: labels[1] || 'Photo 2' }, record.photo_b && { url: record.photo_b, label: labels[2] || 'Photo 3' }, record.photo_c && { url: record.photo_c, label: labels[3] || 'Photo 4' }].filter(Boolean);
  const cond = COND_COLORS[record.condition] || COND_COLORS['VG'];
  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function changePhoto(i) { setActivePhoto(i); resetZoom(); }
  function handleMouseDown(e) { if (zoom <= 1) return; e.preventDefault(); setDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); setPanStart({ x: pan.x, y: pan.y }); }
  function handleMouseMove(e) { if (!dragging) return; e.preventDefault(); setPan({ x: panStart.x + (e.clientX - dragStart.x), y: panStart.y + (e.clientY - dragStart.y) }); }
  function handleMouseUp() { setDragging(false); }
  function handleTouchStart(e) { if (zoom <= 1) return; const touch = e.touches[0]; setDragging(true); setDragStart({ x: touch.clientX, y: touch.clientY }); setPanStart({ x: pan.x, y: pan.y }); }
  function handleTouchMove(e) { if (!dragging) return; e.preventDefault(); const touch = e.touches[0]; setPan({ x: panStart.x + (touch.clientX - dragStart.x), y: panStart.y + (touch.clientY - dragStart.y) }); }
  function handleTouchEnd() { setDragging(false); }
  function handleImageClick() { if (!dragging) { if (zoom > 1) { resetZoom(); } else { setZoom(2.5); } } }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
          <div><div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', fontWeight: '700' }}>{record.title}</div><div style={{ fontSize: '13px', color: '#ccc', fontStyle: 'italic' }}>{record.artist + ' · ' + record.year}</div></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
        <div className="lightbox-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
          <div style={{ padding: '20px', borderRight: '1px solid #1a1a1a' }}>
            <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px', background: '#0a0a0a', cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in', userSelect: 'none', WebkitUserSelect: 'none' }}
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={handleImageClick}>
              {photos.length > 0 ? <img src={photos[activePhoto]?.url} alt={photos[activePhoto]?.label} draggable={false} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', transform: 'scale(' + zoom + ') translate(' + (pan.x / zoom) + 'px, ' + (pan.y / zoom) + 'px)', transition: dragging ? 'none' : 'transform 0.3s', transformOrigin: 'center', pointerEvents: 'none' }} />
                : <div style={{ aspectRatio: '1' }}><VinylPlaceholder /></div>}
              {photos.length > 0 && <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: '#c9a84c', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none' }}>{zoom > 1 ? '🔍 Drag to pan · Click to zoom out' : '🔍 Click to zoom in'}</div>}
              {zoom > 1 && <button onClick={e => { e.stopPropagation(); resetZoom(); }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.8)', border: '1px solid #c9a84c', color: '#c9a84c', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>✕ Reset</button>}
            </div>
            {photos.length > 1 && <div style={{ display: 'flex', gap: '8px' }}>{photos.map((photo, i) => <div key={i} onClick={() => changePhoto(i)} style={{ flex: 1, borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: '2px solid ' + (activePhoto === i ? '#c9a84c' : '#2a2a2a'), opacity: activePhoto === i ? 1 : 0.6 }}><img src={photo.url} alt={photo.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} /></div>)}</div>}
            {photos.length === 0 && <p style={{ textAlign: 'center', color: '#bbb', fontSize: '12px', fontStyle: 'italic' }}>No photos available</p>}
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>{record.sku}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[{ label: 'Artist', value: record.artist }, { label: 'Year', value: record.year }, { label: 'Label', value: record.label }, { label: 'Genre', value: record.genre }, { label: 'Format', value: record.category }].map(item => item.value && (
                <div key={item.label}><div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>{item.label}</div><div style={{ fontSize: '13px', color: '#e8d5b0' }}>{item.value}</div></div>
              ))}
              <div><div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>Condition</div><div style={{ display: 'inline-block', background: cond.bg, border: '1px solid ' + cond.text + '44', borderRadius: '6px', padding: '2px 8px' }}><span style={{ fontSize: '12px', color: cond.text, fontWeight: '700' }}>{record.condition}</span></div></div>
            </div>
            {record.notes && <div style={{ marginBottom: '20px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px' }}><div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Notes</div><div style={{ fontSize: '12px', color: '#ccc', fontStyle: 'italic' }}>{record.notes}</div></div>}
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px' }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '32px', fontWeight: '700', color: '#c9a84c', marginBottom: '16px' }}>{'$' + parseFloat(record.price).toFixed(2)}</div>
              <button onClick={() => { onAddToCart(record); onClose(); }} style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>🛒 Add to Cart</button>
            </div>
            <MusicPreview artist={record.artist} title={record.title} format={record.category} />
            <EbaySimilar artist={record.artist} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordRequestButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', request: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function handleSubmit() {
    if (!form.name || !form.request) { setError('Please fill in your name and what you are looking for.'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch('/api/record-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setSent(true); setTimeout(() => { setOpen(false); setSent(false); setForm({ name: '', email: '', phone: '', request: '' }); }, 3000); }
      else setError('Something went wrong. Please try again.');
    } catch { setError('Something went wrong. Please try again.'); }
    setSending(false);
  }
  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px', fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0', marginBottom: '10px', outline: 'none' };
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ position: 'fixed', bottom: '80px', right: '24px', zIndex: 90, background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#0d0d0d', border: 'none', borderRadius: '50px', padding: '12px 20px', fontSize: '13px', fontFamily: 'Georgia, serif', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>🎵 Looking for a record?</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden' }}>
            <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: '16px', color: '#e8d5b0', fontWeight: '700', fontFamily: 'Georgia, serif' }}>🎵 Looking for something?</div><div style={{ fontSize: '12px', color: '#ccc', fontStyle: 'italic', marginTop: '2px' }}>Tell us what you need — we'll find it for you</div></div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎶</div>
                  <div style={{ fontSize: '16px', color: '#4ade80', fontWeight: '700', fontFamily: 'Georgia, serif', marginBottom: '6px' }}>Request sent!</div>
                  <div style={{ fontSize: '13px', color: '#ccc', fontStyle: 'italic' }}>{"We'll be in touch soon."}</div>
                </div>
              ) : (
                <>
                  <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Your Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" style={inp} />
                  <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" style={inp} />
                  <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(956) 555-0000" style={inp} />
                  <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>What are you looking for? *</label>
                  <textarea value={form.request} onChange={e => setForm(f => ({ ...f, request: e.target.value }))} placeholder="e.g. Elvis Presley 45rpm on RCA Victor, Selena anything, Beatles Abbey Road original pressing..." rows={4} style={{ ...inp, resize: 'none', marginBottom: '12px' }} />
                  {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '10px' }}>{error}</div>}
                  <button onClick={handleSubmit} disabled={sending} style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '8px' }}>{sending ? 'Sending...' : '🎵 Send Request →'}</button>
                  <div style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', fontStyle: 'italic' }}>{"We'll reply by email or phone as soon as possible"}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryCount, setInventoryCount] = useState(null);
  const [cart, setCart] = useState(() => {
    try { const s = localStorage.getItem('4em_cart'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem('4em_cart', JSON.stringify(cart)); } catch {} }, [cart]);

  const [showCart, setShowCart] = useState(false);
  const [showFreeShippingPopup, setShowFreeShippingPopup] = useState(false);
  const [freeShippingShown, setFreeShippingShown] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [addedId, setAddedId] = useState(null);
  const [lightboxRecord, setLightboxRecord] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', state: '', zip: '' });
  const [formError, setFormError] = useState('');

  const { installPrompt, isInstalled, isIos, triggerInstall, showIosInstructions, setShowIosInstructions } = useInstallPrompt();
  const showInstallButton = !isInstalled && (installPrompt || isIos);

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
  const shipping = subtotal >= 100 ? 0 : calcShipping(totalQty);
  const total = subtotal + shipping;

  useEffect(() => {
    fetch('/api/records?limit=8')
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); if (d.total != null) setInventoryCount(d.total); setLoading(false); })
      .catch(() => setLoading(false));
    // Fetch total inventory count

  }, []);

  function addToCart(record) {
    setCart(prev => {
      const exists = prev.find(i => i.id === record.id);
      const updated = exists ? prev.map(i => i.id === record.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...record, qty: 1 }];
      const newSubtotal = updated.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
      if (newSubtotal >= 100 && !freeShippingShown) { setTimeout(() => { setShowFreeShippingPopup(true); setFreeShippingShown(true); setTimeout(() => setShowFreeShippingPopup(false), 5000); }, 300); }
      return updated;
    });
    setAddedId(record.id);
    setTimeout(() => setAddedId(null), 1500);
    setShowCart(true);
  }

  function removeFromCart(id) { setCart(prev => prev.filter(i => i.id !== id)); }
  function changeQty(id, delta) { setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)); }
  function handleFormChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleCheckout() {
    setFormError('');
    const { name, email, address, city, state, zip } = form;
    if (!name || !email || !address || !city || !state || !zip) { setFormError('Please fill in all fields.'); return; }
    setCheckoutStep('processing');
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart, form, subtotal, shipping, total }) });
      const data = await res.json();
      if (data.success && data.paymentUrl) { window.location.href = data.paymentUrl; }
      else { setFormError(data.error || 'Payment failed. Please try again.'); setCheckoutStep('info'); }
    } catch { setFormError('Something went wrong. Please try again.'); setCheckoutStep('info'); }
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px', fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0', marginBottom: '10px' };

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100vw; }
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
        .sell-pill { animation: pulse 2.5s infinite; }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.5); } 50% { box-shadow: 0 0 0 10px rgba(201,168,76,0); } }
        .nav-desktop { display: flex; }
        .nav-mobile { display: none; }
        @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
          .records-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .hero-title { font-size: 32px !important; }
          .photo-strip { height: 120px !important; }
          .photo-strip img { height: 120px !important; }
          .section-padding { padding: 24px 16px 40px !important; }
          .lightbox-grid { grid-template-columns: 1fr !important; }
          .cart-drawer { width: 100vw !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .hero-section { height: 340px !important; }
          .hero-btns { flex-direction: column !important; align-items: center !important; }
          .sell-banner { flex-direction: column !important; text-align: center !important; }
          .inventory-badge { font-size: 48px !important; }
        }
        @media (max-width: 480px) {
          .records-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .hero-title { font-size: 26px !important; }
          .inventory-badge { font-size: 40px !important; }
        }
      `}</style>

      {showIosInstructions && <IosInstallModal onClose={() => setShowIosInstructions(false)} />}
      {lightboxRecord && <PhotoLightbox record={lightboxRecord} onClose={() => setLightboxRecord(null)} onAddToCart={addToCart} />}

      {showFreeShippingPopup && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 300, background: '#0a1a0a', border: '2px solid #4ade80', borderRadius: '16px', padding: '20px 28px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', minWidth: '280px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
          <div style={{ fontSize: '16px', color: '#4ade80', fontWeight: '700', fontFamily: 'Georgia, serif', marginBottom: '4px' }}>Congratulations!</div>
          <div style={{ fontSize: '13px', color: '#ccc', fontStyle: 'italic', marginBottom: '4px' }}>Your order qualifies for</div>
          <div style={{ fontSize: '18px', color: '#4ade80', fontWeight: '700', fontFamily: 'Georgia, serif' }}>FREE SHIPPING! 🚀</div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '8px' }}>Keep browsing — every record ships free!</div>
          <button onClick={() => setShowFreeShippingPopup(false)} style={{ marginTop: '12px', background: 'none', border: '1px solid #2a4a2a', color: '#4ade80', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>Got it ✓</button>
        </div>
      )}

      <div style={{ background: '#c9a84c', padding: '7px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', color: '#0d0d0d', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700' }}>
          🎵 New stock added weekly · FREE SHIPPING on orders over $100 · Ships Nationwide
        </span>
      </div>

      <InstallBanner installPrompt={installPrompt} isInstalled={isInstalled} isIos={isIos} triggerInstall={triggerInstall} />

      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="13" fill="#111" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', fontWeight: '700', lineHeight: 1.1 }}>4 Ever Memories</div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase' }}>Record Store</div>
          </div>
        </div>
        <div className="nav-desktop" style={{ gap: '12px', alignItems: 'center' }}>
          <a href="/search" style={{ color: '#22d3ee', fontSize: '13px', textDecoration: 'none', border: '1px solid #22d3ee', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}>🔎 Search Everything</a>
          <a href="/contact" className="sell-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#0d0d0d', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>🎵 Sell Your Records</a>
          <a href="https://www.facebook.com/4evermemoriesHarlingen" target="_blank" rel="noreferrer"
            onClick={e => { e.preventDefault(); window.open('https://www.facebook.com/4evermemoriesHarlingen', 'facebook', 'width=600,height=700,left=200,top=100'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1877f2', color: '#fff', padding: '7px 14px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
          <ShareButton />
          {showInstallButton && (
            <button onClick={triggerInstall} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#c9a84c', border: '1px solid #c9a84c', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>📲 Install App</button>
          )}
          <button onClick={() => { setShowCart(true); setCheckoutStep('cart'); }} style={{ background: 'transparent', color: '#e8d5b0', border: '1px solid #333', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛒 Cart
            {totalQty > 0 && <span style={{ background: '#c9a84c', color: '#0d0d0d', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{totalQty}</span>}
          </button>
        </div>
        <div className="nav-mobile" style={{ gap: '8px', alignItems: 'center' }}>
          <a href="/browse" style={{ color: '#c9a84c', fontSize: '12px', textDecoration: 'none', border: '1px solid #c9a84c', borderRadius: '8px', padding: '7px 10px', fontFamily: 'Georgia, serif' }}>🎵 Browse</a>
          <a href="/contact" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)', color: '#0d0d0d', padding: '7px 10px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '12px', fontWeight: '700' }}>Sell</a>
          {showInstallButton && <button onClick={triggerInstall} style={{ background: 'transparent', color: '#c9a84c', border: '1px solid #c9a84c44', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '12px' }}>📲</button>}
          <button onClick={() => { setShowCart(true); setCheckoutStep('cart'); }} style={{ background: 'transparent', color: '#e8d5b0', border: '1px solid #333', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🛒
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
          <p style={{ fontSize: '15px', color: '#aaa', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.7, fontStyle: 'italic' }}>
            Handpicked vintage records with stories to tell. Every groove a memory waiting to be rediscovered.
          </p>

          {/* ─── INVENTORY COUNT BADGE ─── */}
          {inventoryCount != null && (
            <div style={{ marginBottom: '20px', animation: 'countUp 0.6s ease forwards' }}>
              <div className="inventory-badge" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '64px', fontWeight: '900', color: '#c9a84c', lineHeight: 1, textShadow: '0 0 40px rgba(201,168,76,0.5)' }}>
                {inventoryCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#e8d5b0', letterSpacing: '4px', textTransform: 'uppercase', marginTop: '4px', opacity: 0.85 }}>
                Records In Stock
              </div>
            </div>
          )}

          <div className="hero-btns" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/browse" style={{ background: '#c9a84c', color: '#0d0d0d', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>Browse All Records →</a>
            <a href="/contact" style={{ background: 'transparent', color: '#c9a84c', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', border: '2px solid #c9a84c' }}>Sell Your Records</a>
          </div>
        </div>
      </div>

      <div className="photo-strip">
        {STORE_PHOTOS.map((src, i) => <img key={i} src={src} alt={'Store photo ' + (i + 1)} />)}
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1a1a0a, #111)', borderTop: '1px solid #c9a84c33', borderBottom: '1px solid #c9a84c33', padding: '28px 16px' }}>
        <div className="sell-banner" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', background: '#c9a84c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🎵</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', fontWeight: '700' }}>Have Records to Sell?</div>
              <div style={{ fontSize: '13px', color: '#ccc', fontStyle: 'italic' }}>We buy collections of all sizes — a few 45s or a whole basement full</div>
            </div>
          </div>
          <a href="/contact" style={{ background: '#c9a84c', color: '#0d0d0d', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>Contact Us →</a>
        </div>
      </div>

      <div className="section-padding" style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 32px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '28px', color: '#e8d5b0', margin: 0, fontWeight: '700' }}>Latest Arrivals</h2>
            <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0', fontStyle: 'italic' }}>Our 8 most recently added records</p>
          </div>
          <a href="/browse" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none', fontStyle: 'italic' }}>View all records →</a>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontStyle: 'italic' }}>Loading records...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontStyle: 'italic' }}>No records in stock yet. Check back soon!</div>
        ) : (
          <div className="records-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px' }}>
            {records.map(record => {
              const cond = COND_COLORS[record.condition] || COND_COLORS['VG'];
              return (
                <div key={record.id} className="record-card" style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', overflow: 'hidden' }} onClick={() => setLightboxRecord(record)}>
                  <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: '#0a0a0a' }}>
                    {(() => {
                      const cardPhoto = record.photo_cover || (record.category === '7" Vinyl' && !record.photo_b ? record.photo_a : null) || record.photo_a;
                      return cardPhoto ? <img src={cardPhoto} alt={record.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ padding: '20px' }}><VinylPlaceholder /></div>;
                    })()}
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: cond.bg, border: '1px solid ' + cond.text + '44', borderRadius: '6px', padding: '3px 8px' }}><span style={{ fontSize: '10px', color: cond.text, fontWeight: '700' }}>{record.condition}</span></div>
                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '3px 8px' }}><span style={{ fontSize: '10px', color: '#c9a84c' }}>{record.category}</span></div>
                    <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '4px 10px', whiteSpace: 'nowrap' }}><span style={{ fontSize: '10px', color: '#e8d5b0' }}>🔍 Click to view photos</span></div>
                  </div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontSize: '9px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>{record.sku}</div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', fontWeight: '700', color: '#e8d5b0', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</div>
                    <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '12px', fontStyle: 'italic' }}>{record.artist + ' · ' + record.year}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', fontWeight: '700', color: '#c9a84c' }}>{'$' + parseFloat(record.price).toFixed(2)}</span>
                    </div>
                    <button className="add-btn" onClick={e => { e.stopPropagation(); addToCart(record); }}
                      style={{ width: '100%', padding: '10px', background: addedId === record.id ? '#c9a84c' : '#1a1a1a', color: addedId === record.id ? '#0d0d0d' : '#c9a84c', border: '1px solid ' + (addedId === record.id ? '#c9a84c' : '#333'), borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', transition: 'all 0.2s' }}>
                      {addedId === record.id ? '✓ Added!' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer style={{ background: '#080808', borderTop: '1px solid #1a1a1a', padding: '40px 16px' }}>
        <div className="footer-grid" style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '40px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', color: '#e8d5b0', fontWeight: '700', marginBottom: '8px' }}>4 Ever Memories Records</div>
            <p style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.7, fontStyle: 'italic', maxWidth: '300px' }}>Store full of memories and vinyls. Vintage records from every era, carefully graded and ready to spin.</p>
            {showInstallButton && <button onClick={triggerInstall} style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#1a1a0a', border: '1px solid #c9a84c44', color: '#c9a84c', borderRadius: '8px', padding: '10px 16px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>📲 Add to Home Screen</button>}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Shop</div>
            <div style={{ fontSize: '13px', color: '#aaa', lineHeight: 2 }}>
              <a href="/browse" style={{ color: '#aaa', textDecoration: 'none', display: 'block' }}>Browse All Records</a>
              <a href="/contact" style={{ color: '#aaa', textDecoration: 'none', display: 'block' }}>Sell Your Records</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Connect</div>
            <a href="https://www.facebook.com/4evermemoriesHarlingen" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#bbb', textDecoration: 'none', fontSize: '13px', marginBottom: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Follow us on Facebook
            </a>
            <a href="tel:+19568733818" style={{ color: '#bbb', textDecoration: 'none', fontSize: '13px', display: 'block', marginBottom: '8px' }}>📱 (956) 873-3818</a>
            <div style={{ marginTop: '4px' }}><ShareButton /></div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#bbb' }}>© 2025 4 Ever Memories Records. All rights reserved.</span>
          <span style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic' }}>Vinyl · Memories · Music · <a href='/admin' style={{ color: '#aaa', textDecoration: 'none', fontSize: '16px' }}>⚙</a></span>
        </div>
      </footer>

      <RecordRequestButton />

      {showCart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div className="cart-drawer" style={{ width: '440px', maxWidth: '100vw', background: '#0f0f0f', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #2a2a2a' }}>
            <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#e8d5b0', fontSize: '18px', fontWeight: '700' }}>
                {checkoutStep === 'cart' && '🛒 Your Cart'}
                {checkoutStep === 'info' && '📦 Checkout'}
                {checkoutStep === 'processing' && '⏳ Processing...'}
              </span>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '22px' }}>✕</button>
            </div>
            <div style={{ padding: '24px', flex: 1 }}>
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '60px' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>💿</div><p style={{ color: '#bbb', fontStyle: 'italic' }}>Your cart is empty.</p></div>
                  ) : (
                    <>
                      {cart.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px', marginBottom: '16px' }}>
                          {item.photo_cover && <img src={item.photo_cover} alt={item.title} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '14px', fontWeight: '700', color: '#e8d5b0' }}>{item.title}</div>
                            <div style={{ fontSize: '12px', color: '#bbb', fontStyle: 'italic' }}>{item.artist + ' · ' + item.condition}</div>
                            <div style={{ fontSize: '14px', color: '#c9a84c', marginTop: '2px' }}>{'$' + parseFloat(item.price).toFixed(2) + ' each'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => changeQty(item.id, -1)} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#e8d5b0', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>−</button>
                            <span style={{ fontSize: '14px', color: '#e8d5b0', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                            <button onClick={() => changeQty(item.id, 1)} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#e8d5b0', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>+</button>
                            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px' }}>🗑</button>
                          </div>
                        </div>
                      ))}
                      <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontSize: '13px', color: '#bbb' }}>{'Subtotal (' + totalQty + ' item' + (totalQty !== 1 ? 's' : '') + ')'}</span><span style={{ fontSize: '13px', color: '#e8d5b0' }}>{'$' + subtotal.toFixed(2)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '13px', color: '#bbb' }}>Shipping</span><span style={{ fontSize: '13px', color: shipping === 0 ? '#4ade80' : '#e8d5b0', fontWeight: shipping === 0 ? '700' : '400' }}>{shipping === 0 ? 'FREE 🎉' : '$' + shipping.toFixed(2)}</span></div>
                        {subtotal < 100 && (
                          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '11px', color: '#aaa' }}>{'Add $' + (100 - subtotal).toFixed(2) + ' more for free shipping'}</span><span style={{ fontSize: '11px', color: '#c9a84c' }}>{'$' + subtotal.toFixed(2) + ' / $100'}</span></div>
                            <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '6px', overflow: 'hidden' }}><div style={{ background: '#c9a84c', height: '100%', width: Math.min((subtotal / 100) * 100, 100) + '%', borderRadius: '4px', transition: 'width 0.3s' }} /></div>
                          </div>
                        )}
                        {subtotal >= 100 && <div style={{ marginTop: '8px', background: '#0a1a0a', border: '1px solid #4ade80', borderRadius: '6px', padding: '6px', textAlign: 'center' }}><span style={{ fontSize: '11px', color: '#4ade80', fontWeight: '700' }}>🎉 Free shipping unlocked!</span></div>}
                        <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '12px', fontStyle: 'italic', marginTop: '4px' }}>{subtotal < 100 ? '$5.00 first + $1.00 each additional' : 'Free shipping on orders over $100'}</div>
                        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>Total</span><span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', color: '#c9a84c', fontWeight: '700' }}>{'$' + total.toFixed(2)}</span></div>
                      </div>
                      <button onClick={() => setCheckoutStep('info')} style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginTop: '16px' }}>Proceed to Checkout →</button>
                    </>
                  )}
                </>
              )}
              {checkoutStep === 'info' && (
                <>
                  <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Shipping Information</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '20px', background: '#0a0a0a', border: '1px solid #1a3a1a', padding: '12px', borderRadius: '8px', fontStyle: 'italic' }}>🔒 You will be securely redirected to Square to complete payment.</div>
                  {[{name:'name',placeholder:'Full Name'},{name:'email',placeholder:'Email Address'},{name:'address',placeholder:'Street Address'},{name:'city',placeholder:'City'},{name:'state',placeholder:'State'},{name:'zip',placeholder:'ZIP Code'}].map(f => <input key={f.name} name={f.name} placeholder={f.placeholder} value={form[f.name]} onChange={handleFormChange} style={inp} />)}
                  {formError && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '8px' }}>{formError}</div>}
                  <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px', margin: '8px 0 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '13px', color: '#bbb' }}>Subtotal</span><span style={{ fontSize: '13px', color: '#e8d5b0' }}>{'$' + subtotal.toFixed(2)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ fontSize: '13px', color: '#bbb' }}>Shipping</span><span style={{ fontSize: '13px', color: shipping === 0 ? '#4ade80' : '#e8d5b0', fontWeight: shipping === 0 ? '700' : '400' }}>{shipping === 0 ? 'FREE 🎉' : '$' + shipping.toFixed(2)}</span></div>
                    <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', color: '#e8d5b0', fontWeight: '700' }}>Total Due</span><span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#c9a84c', fontWeight: '700' }}>{'$' + total.toFixed(2)}</span></div>
                  </div>
                  <button onClick={handleCheckout} style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '10px' }}>💳 Continue to Payment →</button>
                  <button onClick={() => setCheckoutStep('cart')} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#bbb', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}>← Back to Cart</button>
                </>
              )}
              {checkoutStep === 'processing' && (
                <div style={{ textAlign: 'center', marginTop: '80px' }}>
                  <div style={{ fontSize: '56px', marginBottom: '20px' }}>💿</div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', marginBottom: '8px' }}>Preparing your order...</div>
                  <div style={{ fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>Redirecting to secure payment...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
