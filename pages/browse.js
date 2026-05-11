export const getServerSideProps = async () => ({ props: {} });

import { useState, useEffect, useRef } from 'react';

const CATEGORIES = ['All', '7" Vinyl', '12" Vinyl', 'CD', 'Cassette', '8-Track'];
const GENRES = ['All', 'Rock', 'Jazz', 'Blues', 'Country', 'Spanish', 'Classical', "Children's", 'Holiday', 'Pop', 'Religious', 'Comedy', 'Soundtracks'];

const FORMAT_ICONS = {
  '7" Vinyl': '🎵',
  '12" Vinyl': '💿',
  'CD': '📀',
  'Cassette': '📼',
  '8-Track': '📟',
};

const SORT_OPTIONS = [
  { label: 'Newest', value: 'created_at', dir: 'desc' },
  { label: 'Price: Low', value: 'price', dir: 'asc' },
  { label: 'Price: High', value: 'price', dir: 'desc' },
  { label: 'Artist A–Z', value: 'artist', dir: 'asc' },
  { label: 'Artist Z–A', value: 'artist', dir: 'desc' },
  { label: 'Title A–Z', value: 'title', dir: 'asc' },
  { label: 'Year: Old', value: 'year', dir: 'asc' },
  { label: 'Year: New', value: 'year', dir: 'desc' },
  { label: 'Format', value: 'category', dir: 'asc' },
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

function EbaySimilar({ artist, title, format }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memorabilia, setMemorabilia] = useState([]);
  const [fetched, setFetched] = useState(false);

  function toggle() {
    setOpen(function(prev) { return !prev; });
    if (!fetched) {
      setLoading(true);
      const params = new URLSearchParams({ artist: artist });
      fetch('/api/ebay-similar?' + params.toString())
        .then(function(r) { return r.json(); })
        .then(function(data) {
          setMemorabilia(data.memorabilia || []);
          setLoading(false);
          setFetched(true);
        })
        .catch(function() { setLoading(false); });
    }
  }

  return (
    <div style={{ borderTop: '1px solid #1a1a1a', marginTop: '16px', paddingTop: '12px' }}>
      <button onClick={toggle}
        style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#c9a84c', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>🎁 Shop {artist} collectibles & memorabilia on eBay</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: '10px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#555', fontSize: '12px', fontStyle: 'italic' }}>Loading eBay listings...</div>}
          {!loading && memorabilia.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>{artist} Posters · Books · Signed Items · Merch</div>
              {memorabilia.map(function(item, i) {
                return (
                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1a1a1a', textDecoration: 'none' }}>
                    {item.image && <img src={item.image} alt={item.title} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ fontSize: '10px', color: '#555' }}>{item.condition}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#c9a84c', fontWeight: '700', flexShrink: 0 }}>${item.price}</div>
                  </a>
                );
              })}
            </div>
          )}
          {!loading && memorabilia.length === 0 && fetched && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#444', fontSize: '12px', fontStyle: 'italic' }}>No eBay listings found</div>
          )}
          <div style={{ fontSize: '10px', color: '#333', textAlign: 'center', marginTop: '10px', fontStyle: 'italic' }}>
            Purchases on eBay support 4 Ever Memories
          </div>
        </div>
      )}
    </div>
  );
}

function MusicPreview({ artist, title, format }) {
  const [open, setOpen] = useState(false);

  const isAlbum = format && format.indexOf('12') !== -1 || format === 'CD' || format === 'Cassette' || format === '8-Track';
  const searchQuery = isAlbum
    ? encodeURIComponent(artist + ' ' + title + ' full album')
    : encodeURIComponent(artist + ' ' + title);
  const embedUrl = 'https://www.youtube.com/embed?listType=search&list=' + searchQuery + '&autoplay=1&modestbranding=1&rel=0';

  return (
    <div style={{ marginTop: '12px' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '10px', background: open ? '#1a0a0a' : '#0a0a0a', border: '1px solid ' + (open ? '#f87171' : '#2a2a2a'), borderRadius: '8px', color: open ? '#f87171' : '#e8d5b0', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{open ? '⏹ Close player' : '▶ Preview this ' + (isAlbum ? 'album' : 'song') + ' on YouTube'}</span>
        <span style={{ fontSize: '10px', color: '#555' }}>via YouTube</span>
      </button>
      {open && (
        <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
          <iframe
            width="100%"
            height="200"
            src={embedUrl}
            title={'Listen to ' + artist + ' - ' + title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ display: 'block' }}
          />
          <div style={{ padding: '6px 10px', background: '#0a0a0a', fontSize: '10px', color: '#444', fontStyle: 'italic' }}>
            🎵 {artist} — {title} · Streaming via YouTube
          </div>
        </div>
      )}
    </div>
  );
}

function RecordModal({ record, onClose, onAddToCart, addedId }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const cond = COND_COLORS[record.condition] || COND_COLORS['VG'];

  const photos = [
    record.photo_cover && { url: record.photo_cover, label: 'Photo 1' },
    record.photo_a && { url: record.photo_a, label: 'Photo 2' },
    record.photo_b && { url: record.photo_b, label: 'Photo 3' },
    record.photo_c && { url: record.photo_c, label: 'Photo 4' },
  ].filter(Boolean);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function changePhoto(i) { setActivePhoto(i); resetZoom(); }

  function handleMouseDown(e) {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ x: pan.x, y: pan.y });
  }
  function handleMouseMove(e) {
    if (!dragging) return;
    e.preventDefault();
    setPan({ x: panStart.x + (e.clientX - dragStart.x), y: panStart.y + (e.clientY - dragStart.y) });
  }
  function handleMouseUp() { setDragging(false); }
  function handleTouchStart(e) {
    if (zoom <= 1) return;
    const touch = e.touches[0];
    setDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setPanStart({ x: pan.x, y: pan.y });
  }
  function handleTouchMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPan({ x: panStart.x + (touch.clientX - dragStart.x), y: panStart.y + (touch.clientY - dragStart.y) });
  }
  function handleTouchEnd() { setDragging(false); }
  function handleImageClick() {
    if (!dragging) {
      if (zoom > 1) { resetZoom(); } else { setZoom(2.5); }
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '16px', width: '100%', maxWidth: '820px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#e8d5b0', fontWeight: '700' }}>{record.title}</div>
            <div style={{ fontSize: '13px', color: '#777', fontStyle: 'italic' }}>{record.artist} {record.year ? '· ' + record.year : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
        <div className="modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
          <div style={{ padding: '20px', borderRight: '1px solid #1a1a1a' }}>
            <div
              style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px', background: '#0a0a0a', cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in', userSelect: 'none', WebkitUserSelect: 'none' }}
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              onClick={handleImageClick}>
              {photos.length > 0 ? (
                <img src={photos[activePhoto]?.url} alt={photos[activePhoto]?.label} draggable={false}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', transform: 'scale(' + zoom + ') translate(' + (pan.x / zoom) + 'px, ' + (pan.y / zoom) + 'px)', transition: dragging ? 'none' : 'transform 0.3s', transformOrigin: 'center', pointerEvents: 'none' }} />
              ) : (
                <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>💿</div>
              )}
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: '#c9a84c', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none' }}>
                {zoom > 1 ? '🔍 Drag to pan · Click to zoom out' : '🔍 Click to zoom in'}
              </div>
              {zoom > 1 && (
                <button onClick={e => { e.stopPropagation(); resetZoom(); }}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.8)', border: '1px solid #c9a84c', color: '#c9a84c', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  ✕ Reset
                </button>
              )}
            </div>
            {photos.length > 1 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {photos.map((photo, i) => (
                  <div key={i} onClick={() => changePhoto(i)}
                    style={{ flex: 1, borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: '2px solid ' + (activePhoto === i ? '#c9a84c' : '#2a2a2a'), opacity: activePhoto === i ? 1 : 0.6 }}>
                    <img src={photo.url} alt={photo.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', fontFamily: 'monospace' }}>{record.sku}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              {[
                { label: 'Artist', value: record.artist },
                { label: 'Year', value: record.year },
                { label: 'Label', value: record.label },
                { label: 'Genre', value: record.genre },
                { label: 'Format', value: record.category },
                { label: 'Qty Available', value: record.qty },
              ].map(item => item.value && (
                <div key={item.label}>
                  <div style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', color: '#e8d5b0' }}>{item.value}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>Condition</div>
                <div style={{ display: 'inline-block', background: cond.bg, border: '1px solid ' + cond.text + '44', borderRadius: '6px', padding: '2px 10px' }}>
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
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '36px', fontWeight: '700', color: '#c9a84c', marginBottom: '16px' }}>
                ${parseFloat(record.price).toFixed(2)}
              </div>
              <button onClick={() => { onAddToCart(record); onClose(); }}
                style={{ width: '100%', padding: '14px', background: addedId === record.id ? '#1e6b3a' : '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
                {addedId === record.id ? '✓ Added to Cart!' : '🛒 Add to Cart'}
              </button>
            </div>
            <MusicPreview artist={record.artist} title={record.title} format={record.category} />
            <EbaySimilar artist={record.artist} title={record.title} format={record.category} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Browse() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState('All');
  const [genre, setGenre] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [cart, setCart] = useState(() => {
    try { const s = localStorage.getItem('4em_cart'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('4em_cart', JSON.stringify(cart)); } catch {}
  }, [cart]);

  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [addedId, setAddedId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', state: '', zip: '' });
  const [formError, setFormError] = useState('');
  const searchRef = useRef(null);
  const LIMIT = 25;

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
  const shipping = calcShipping(totalQty);
  const total2 = subtotal + shipping;
  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: LIMIT, offset: page * LIMIT, sortBy, sortDir });
    if (category !== 'All') params.set('category', category);
    if (genre !== 'All') params.set('genre', genre);
    if (search) params.set('search', search);
    fetch('/api/records?' + params)
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, category, genre, search, sortBy, sortDir]);

  useEffect(() => {
    if (!searchInput || searchInput.length < 1) { setSuggestions([]); return; }
    const timeout = setTimeout(() => {
      fetch('/api/records?limit=6&search=' + encodeURIComponent(searchInput))
        .then(r => r.json())
        .then(d => setSuggestions(d.records || []))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  function handleFilter(type, value) {
    if (type === 'category') setCategory(value);
    if (type === 'genre') setGenre(value);
    setPage(0);
  }

  function handleSort(option) {
    setSortBy(option.value);
    setSortDir(option.dir);
    setPage(0);
  }

  function handleSearch(value) {
    setSearch(value);
    setSearchInput(value);
    setPage(0);
    setShowSuggestions(false);
  }

  function handleSuggestionClick(record) {
    setSearchInput(record.title);
    setSearch(record.title);
    setShowSuggestions(false);
    setPage(0);
  }

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
    if (!name || !email || !address || !city || !state || !zip) { setFormError('Please fill in all fields.'); return; }
    setCheckoutStep('processing');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, form, subtotal, shipping, total: total2 }),
      });
      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setFormError(data.error || 'Payment failed.');
        setCheckoutStep('info');
      }
    } catch {
      setFormError('Something went wrong.');
      setCheckoutStep('info');
    }
  }

  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px',
    fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0', marginBottom: '10px',
  };

  const tabStyle = (active) => ({
    padding: '6px 14px', background: active ? '#c9a84c' : 'transparent',
    color: active ? '#0d0d0d' : '#666', border: '1px solid ' + (active ? '#c9a84c' : '#2a2a2a'),
    borderRadius: '20px', cursor: 'pointer', fontFamily: 'Georgia, serif',
    fontSize: '12px', fontWeight: active ? '700' : '400', whiteSpace: 'nowrap', transition: 'all 0.2s',
  });

  const currentSort = SORT_OPTIONS.find(o => o.value === sortBy && o.dir === sortDir) || SORT_OPTIONS[0];

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        input:focus { outline: none; border-color: #c9a84c !important; }
        .row-item { transition: background 0.15s; cursor: pointer; }
        .row-item:hover { background: rgba(201,168,76,0.06) !important; }
        .suggestion-item:hover { background: rgba(201,168,76,0.08) !important; }
        .sort-btn:hover { border-color: #c9a84c !important; color: #c9a84c !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @media (max-width: 768px) {
          .browse-list-header { display: none !important; }
          .browse-row { grid-template-columns: 44px 1fr 70px !important; }
          .browse-row-artist { display: none !important; }
          .browse-row-format { display: none !important; }
          .browse-row-label { display: none !important; }
          .modal-grid { grid-template-columns: 1fr !important; }
          .filter-tabs { overflow-x: auto; flex-wrap: nowrap !important; padding-bottom: 4px; }
          .cart-drawer { width: 100vw !important; }
          .sort-bar { flex-wrap: wrap; gap: 6px !important; }
        }
      `}</style>

      {selectedRecord && (
        <RecordModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onAddToCart={addToCart} addedId={addedId} />
      )}

      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a href="/" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>← Home</a>
          <button onClick={() => { setShowCart(true); setCheckoutStep('cart'); }}
            style={{ background: 'transparent', color: '#e8d5b0', border: '1px solid #333', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛒 Cart
            {totalQty > 0 && <span style={{ background: '#c9a84c', color: '#0d0d0d', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{totalQty}</span>}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 32px 60px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '32px', color: '#e8d5b0', margin: '0 0 6px', fontWeight: '700' }}>Browse All Records</h1>
          <p style={{ fontSize: '13px', color: '#555', margin: 0, fontStyle: 'italic' }}>
            {total > 0 ? total + ' item' + (total !== 1 ? 's' : '') + ' in our collection' : 'Loading collection...'}
          </p>
        </div>

        {/* SEARCH */}
        <div style={{ position: 'relative', maxWidth: '600px', marginBottom: '24px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
          <input ref={searchRef} type="text" placeholder="Search by artist, title, label, genre..."
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(searchInput); if (e.key === 'Escape') setShowSuggestions(false); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            style={{ width: '100%', padding: '13px 44px 13px 44px', border: '1px solid #2a2a2a', borderRadius: '10px', fontFamily: 'Georgia, serif', fontSize: '14px', background: '#111', color: '#e8d5b0' }} />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); handleSearch(''); }}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', marginTop: '4px', zIndex: 40, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              {suggestions.map((r, i) => (
                <div key={r.id} className="suggestion-item" onClick={() => handleSuggestionClick(r)}
                  style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: i < suggestions.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  {r.photo_cover && <img src={r.photo_cover} alt={r.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#e8d5b0' }}>{r.title}</div>
                    <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>{r.artist} · {r.category}</div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#c9a84c', fontWeight: '700' }}>${parseFloat(r.price).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ padding: '10px 16px', borderTop: '1px solid #1a1a1a', cursor: 'pointer', textAlign: 'center', fontSize: '12px', color: '#c9a84c' }}
                onClick={() => handleSearch(searchInput)}>
                Search for "{searchInput}" →
              </div>
            </div>
          )}
        </div>

        {/* FORMAT TABS */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Format</div>
          <div className="filter-tabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => handleFilter('category', cat)} style={tabStyle(category === cat)}>
                {FORMAT_ICONS[cat] ? FORMAT_ICONS[cat] + ' ' : '🎶 '}{cat}
              </button>
            ))}
          </div>
        </div>

        {/* GENRE TABS */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: '#555', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Genre</div>
          <div className="filter-tabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {GENRES.map(g => (
              <button key={g} onClick={() => handleFilter('genre', g)} style={tabStyle(genre === g)}>{g}</button>
            ))}
          </div>
        </div>

        {/* SORT BAR */}
        <div className="sort-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', color: '#555', letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sort by</span>
          {SORT_OPTIONS.map(opt => {
            const isActive = opt.value === sortBy && opt.dir === sortDir;
            return (
              <button key={opt.label} className="sort-btn" onClick={() => handleSort(opt)}
                style={{ padding: '5px 12px', background: isActive ? '#1a1a0a' : 'transparent', color: isActive ? '#c9a84c' : '#555', border: '1px solid ' + (isActive ? '#c9a84c' : '#2a2a2a'), borderRadius: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '11px', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                {isActive ? '✓ ' : ''}{opt.label}
              </button>
            );
          })}
        </div>

        {/* ACTIVE FILTERS */}
        {(category !== 'All' || genre !== 'All' || search) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#555' }}>Filters:</span>
            {category !== 'All' && <span style={{ background: '#1a1a0a', border: '1px solid #c9a84c44', color: '#c9a84c', padding: '3px 10px', borderRadius: '12px', fontSize: '11px' }}>{category}</span>}
            {genre !== 'All' && <span style={{ background: '#1a1a0a', border: '1px solid #c9a84c44', color: '#c9a84c', padding: '3px 10px', borderRadius: '12px', fontSize: '11px' }}>{genre}</span>}
            {search && <span style={{ background: '#1a1a0a', border: '1px solid #c9a84c44', color: '#c9a84c', padding: '3px 10px', borderRadius: '12px', fontSize: '11px' }}>"{search}"</span>}
            <button onClick={() => { setCategory('All'); setGenre('All'); setSearch(''); setSearchInput(''); setPage(0); }}
              style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '12px', padding: '3px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              ✕ Clear all
            </button>
          </div>
        )}

        {/* RESULTS COUNT */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
            {loading ? 'Loading...' : total === 0 ? 'No items found' : 'Showing ' + (page * LIMIT + 1) + '–' + Math.min((page + 1) * LIMIT, total) + ' of ' + total + ' items · sorted by ' + currentSort.label}
          </span>
          {totalPages > 1 && <span style={{ fontSize: '12px', color: '#555' }}>Page {page + 1} of {totalPages}</span>}
        </div>

        {/* LIST */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
          <div className="browse-list-header" style={{ display: 'grid', gridTemplateColumns: '56px 1fr 140px 100px 80px 80px', gap: '12px', padding: '10px 16px', background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase' }}>Photo</div>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase' }}>Title / Artist</div>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase' }}>Label</div>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase' }}>Format</div>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase' }}>Cond.</div>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>Price</div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontStyle: 'italic' }}>Loading...</div>
          ) : records.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💿</div>
              <div style={{ color: '#555', fontStyle: 'italic' }}>No records found matching your search</div>
            </div>
          ) : (
            records.map((record, i) => {
              const cond = COND_COLORS[record.condition] || COND_COLORS['VG'];
              return (
                <div key={record.id} className="row-item"
                  onClick={() => setSelectedRecord(record)}
                  style={{ display: 'grid', gridTemplateColumns: '56px 1fr 140px 100px 80px 80px', gap: '12px', padding: '10px 16px', alignItems: 'center', borderBottom: i < records.length - 1 ? '1px solid #1a1a1a' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '6px', overflow: 'hidden', background: '#0a0a0a', flexShrink: 0 }}>
                    {record.photo_cover ? (
                      <img src={record.photo_cover} alt={record.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💿</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#e8d5b0', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</div>
                    <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.artist}{record.year ? ' · ' + record.year : ''}</div>
                  </div>
                  <div className="browse-row-label" style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {record.label || '—'}
                  </div>
                  <div className="browse-row-format">
                    <span style={{ fontSize: '11px', color: '#888', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                      {FORMAT_ICONS[record.category] || ''} {record.category || '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ background: cond.bg, border: '1px solid ' + cond.text + '44', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: cond.text, fontWeight: '700' }}>
                      {record.condition}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', fontWeight: '700', color: '#c9a84c' }}>
                    ${parseFloat(record.price).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setPage(0)} disabled={page === 0}
              style={{ padding: '8px 14px', background: page === 0 ? '#1a1a1a' : '#111', color: page === 0 ? '#333' : '#888', border: '1px solid #2a2a2a', borderRadius: '8px', cursor: page === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Georgia, serif', fontSize: '12px' }}>««</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '8px 16px', background: page === 0 ? '#1a1a1a' : '#111', color: page === 0 ? '#333' : '#e8d5b0', border: '1px solid #2a2a2a', borderRadius: '8px', cursor: page === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px' }}>← Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.min(Math.max(page - 2, 0) + i, totalPages - 1);
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  style={{ padding: '8px 14px', background: page === pageNum ? '#c9a84c' : '#111', color: page === pageNum ? '#0d0d0d' : '#888', border: '1px solid ' + (page === pageNum ? '#c9a84c' : '#2a2a2a'), borderRadius: '8px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: page === pageNum ? '700' : '400' }}>
                  {pageNum + 1}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              style={{ padding: '8px 16px', background: page === totalPages - 1 ? '#1a1a1a' : '#111', color: page === totalPages - 1 ? '#333' : '#e8d5b0', border: '1px solid #2a2a2a', borderRadius: '8px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px' }}>Next →</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1}
              style={{ padding: '8px 14px', background: page === totalPages - 1 ? '#1a1a1a' : '#111', color: page === totalPages - 1 ? '#333' : '#888', border: '1px solid #2a2a2a', borderRadius: '8px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', fontFamily: 'Georgia, serif', fontSize: '12px' }}>»»</button>
          </div>
        )}
      </div>

      {/* CART DRAWER */}
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
                          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', color: '#c9a84c', fontWeight: '700' }}>${total2.toFixed(2)}</span>
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
                    <input key={f.name} name={f.name} placeholder={f.placeholder} value={form[f.name]} onChange={handleFormChange} style={inp} />
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
                      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', color: '#c9a84c', fontWeight: '700' }}>${total2.toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={handleCheckout}
                    style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '10px' }}>
                    💳 Continue to Payment →
                  </button>
                  <button onClick={() => setCheckoutStep('cart')}
                    style={{ width: '100%', padding: '12px', background: 'transparent', color: '#666', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
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
