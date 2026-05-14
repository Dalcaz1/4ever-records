import { useState, useEffect } from 'react';

function PinLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit() {
    if (pin.length !== 6) { setError('Please enter your 6-digit PIN'); return; }
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('admin_auth', 'true');
        onUnlock();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setChecking(false);
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8d5b0' }}>
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#e8d5b0', fontWeight: '700', marginBottom: '4px' }}>4 Ever Memories</div>
        <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '32px' }}>Inventory Access</div>
        <input type="password" inputMode="numeric" maxLength={6} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="••••••"
          style={{ width: '100%', padding: '14px', border: '1px solid #2a2a2a', borderRadius: '10px', fontFamily: 'Georgia, serif', fontSize: '24px', background: '#0a0a0a', color: '#e8d5b0', textAlign: 'center', letterSpacing: '8px', marginBottom: '12px', outline: 'none' }}
          autoFocus />
        {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        <button onClick={handleSubmit} disabled={pin.length !== 6 || checking}
          style={{ width: '100%', padding: '14px', background: pin.length === 6 ? '#c9a84c' : '#1a1a1a', color: pin.length === 6 ? '#0d0d0d' : '#444', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: pin.length === 6 ? 'pointer' : 'not-allowed', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
          {checking ? 'Verifying...' : 'Unlock →'}
        </button>
        <a href="/" style={{ display: 'block', marginTop: '20px', color: '#bbb', fontSize: '12px', textDecoration: 'none', fontStyle: 'italic' }}>← Back to Store</a>
      </div>
    </div>
  );
}

const COND_COLORS = {
  'M':   { bg: '#1a3a1a', text: '#4ade80' },
  'NM':  { bg: '#1a3a2a', text: '#34d399' },
  'VG+': { bg: '#1a2a3a', text: '#60a5fa' },
  'VG':  { bg: '#2a2a1a', text: '#fbbf24' },
  'G':   { bg: '#3a1a1a', text: '#f87171' },
};

const GENRES = ['Rock', 'Jazz', 'Blues', 'Country', 'Spanish', 'Classical', "Children's", 'Holiday', 'Pop', 'Religious', 'Comedy', 'Soundtracks'];
const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G'];
const CATEGORIES = ['7" Vinyl', '12" Vinyl', 'CD', 'Cassette', '8-Track'];

function EditModal({ record, onSave, onClose }) {
  const [form, setForm] = useState({
    artist: record.artist || '',
    title: record.title || '',
    year: record.year || '',
    label: record.label || '',
    genre: record.genre || 'Rock',
    condition: record.condition || 'VG',
    price: record.price || '',
    qty: record.qty || 1,
    notes: record.notes || '',
    active: record.active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px',
    fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0',
    marginBottom: '10px', outline: 'none',
  };

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/update-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        onSave({ ...record, ...form });
      } else {
        setError(data.error || 'Failed to save.');
      }
    } catch {
      setError('Something went wrong.');
    }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
          <div style={{ fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>Edit Record</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', marginBottom: '16px', fontFamily: 'monospace', fontWeight: '700' }}>{record.sku}</div>

          <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Artist</label>
          <input value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} style={inp} />

          <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Title</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Year</label>
              <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Label</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Genre</label>
              <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} style={{ ...inp, marginBottom: 0 }}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Condition</label>
              <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} style={{ ...inp, marginBottom: 0 }}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Price ($)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Qty</label>
              <input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} style={inp} />
            </div>
          </div>

          <label style={{ fontSize: '10px', color: '#ccc', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            style={{ ...inp, resize: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px' }}>
            <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <label htmlFor="active" style={{ fontSize: '13px', color: '#e8d5b0', cursor: 'pointer' }}>
              {form.active ? '✅ Active — visible on store' : '❌ Hidden from store'}
            </label>
          </div>

          {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}

          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '8px' }}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
          <button onClick={onClose}
            style={{ width: '100%', padding: '10px', background: 'transparent', color: '#aaa', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [authed, setAuthed] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterGenre, setFilterGenre] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (authed) loadRecords();
  }, [authed]);

  async function loadRecords() {
    setLoading(true);
    try {
      const res = await fetch('/api/records?limit=500');
      const data = await res.json();
      setRecords(data.records || []);
    } catch {}
    setLoading(false);
  }

  async function handleDelete(record) {
    setDeleting(record.id);
    try {
      const res = await fetch('/api/delete-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id }),
      });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.filter(r => r.id !== record.id));
        setMessage('Deleted: ' + record.title);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch {}
    setDeleting(null);
    setConfirmDelete(null);
  }

  function handleEditSave(updated) {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditRecord(null);
    setMessage('Updated: ' + updated.title);
    setTimeout(() => setMessage(''), 3000);
  }

  if (!authed) return <PinLock onUnlock={() => setAuthed(true)} />;

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      r.title?.toLowerCase().includes(q) ||
      r.artist?.toLowerCase().includes(q) ||
      r.sku?.toLowerCase().includes(q) ||
      r.label?.toLowerCase().includes(q) ||
      r.genre?.toLowerCase().includes(q) ||
      r.year?.toString().includes(q);
    const matchCategory = filterCategory === 'All' || r.category === filterCategory;
    const matchGenre = filterGenre === 'All' || r.genre === filterGenre;
    const matchStatus = filterStatus === 'All' ||
      (filterStatus === 'Active' && r.active !== false) ||
      (filterStatus === 'Hidden' && r.active === false);
    return matchSearch && matchCategory && matchGenre && matchStatus;
  }).sort((a, b) => {
    switch(sortBy) {
      case 'newest': return new Date(b.created_at) - new Date(a.created_at);
      case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
      case 'price_low': return parseFloat(a.price||0) - parseFloat(b.price||0);
      case 'price_high': return parseFloat(b.price||0) - parseFloat(a.price||0);
      case 'artist_az': return (a.artist||'').localeCompare(b.artist||'');
      case 'artist_za': return (b.artist||'').localeCompare(a.artist||'');
      case 'title_az': return (a.title||'').localeCompare(b.title||'');
      case 'year_old': return parseInt(a.year||0) - parseInt(b.year||0);
      case 'year_new': return parseInt(b.year||0) - parseInt(a.year||0);
      case 'sku': return (a.sku||'').localeCompare(b.sku||'');
      default: return 0;
    }
  });

  const navLink = {
    color: '#c9a84c', fontSize: '12px', textDecoration: 'none',
    border: '1px solid #c9a84c44', borderRadius: '6px', padding: '6px 12px',
    fontFamily: 'Georgia, serif',
  };

  const selStyle = {
    padding: '7px 10px', background: '#0a0a0a', border: '1px solid #2a2a2a',
    borderRadius: '8px', fontFamily: 'Georgia, serif', fontSize: '12px',
    color: '#e8d5b0', cursor: 'pointer', outline: 'none',
  };

  const activeFilters = (search ? 1 : 0) + (filterCategory !== 'All' ? 1 : 0) + (filterGenre !== 'All' ? 1 : 0) + (filterStatus !== 'All' ? 1 : 0);

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{'* { box-sizing: border-box; } input:focus, select:focus, textarea:focus { outline: none; border-color: #c9a84c !important; }'}</style>

      {editRecord && <EditModal record={editRecord} onSave={handleEditSave} onClose={() => setEditRecord(null)} />}

      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
            <circle cx="20" cy="20" r="8" fill="#c9a84c" />
            <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
          </svg>
          <div>
            <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>Inventory</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/admin" style={navLink}>➕ Add</a>
          <a href="/inventory" style={navLink}>📋 Inventory</a>
          <a href="/" style={{ color: '#aaa', fontSize: '12px', textDecoration: 'none', borderRadius: '6px', padding: '6px 12px', border: '1px solid #2a2a2a', fontFamily: 'Georgia, serif' }}>← Store</a>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px 40px' }}>

        {message && (
          <div style={{ background: '#1a3a1a', border: '1px solid #2a4a2a', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#4ade80', fontSize: '13px' }}>
            ✓ {message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', color: '#e8d5b0', margin: 0 }}>Inventory</h2>
            <div style={{ fontSize: '12px', color: '#ccc', fontStyle: 'italic', marginTop: '2px' }}>
              {filtered.length} of {records.length} records
              {activeFilters > 0 && <span style={{ color: '#c9a84c', marginLeft: '6px' }}>· {activeFilters} filter{activeFilters !== 1 ? 's' : ''} active</span>}
            </div>
          </div>
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(''); setFilterCategory('All'); setFilterGenre('All'); setFilterStatus('All'); setSortBy('newest'); }}
              style={{ background: 'none', border: '1px solid #333', color: '#ccc', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* SEARCH */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
          <input
            placeholder="Search by SKU, title, artist, label, genre, year..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 36px 10px 36px', border: '1px solid #2a2a2a', borderRadius: '8px', fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0', outline: 'none' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          )}
        </div>

        {/* SORT */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: '#e8d5b0', fontFamily: 'Georgia, serif' }}>Sort:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="artist_az">Artist A–Z</option>
            <option value="artist_za">Artist Z–A</option>
            <option value="title_az">Title A–Z</option>
            <option value="year_old">Year: Oldest</option>
            <option value="year_new">Year: Newest</option>
            <option value="sku">SKU</option>
          </select>
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={selStyle}>
            <option value="All">All Formats</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} style={selStyle}>
            <option value="All">All Genres</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
            <option value="All">Active + Hidden</option>
            <option value="Active">Active only</option>
            <option value="Hidden">Hidden only</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontStyle: 'italic' }}>Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontStyle: 'italic' }}>No records found.</div>
        ) : (
          filtered.map(record => {
            const cond = COND_COLORS[record.condition] || COND_COLORS['VG'];
            return (
              <div key={record.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '14px', marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center', opacity: record.active === false ? 0.6 : 1 }}>

                {record.photo_cover ? (
                  <img src={record.photo_cover} alt={record.title} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', background: '#0a0a0a', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💿</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: '700' }}>{record.sku}</span>
                    {record.active === false && <span style={{ color: '#f87171', fontSize: '10px', background: '#2a1a1a', border: '1px solid #f8717144', borderRadius: '4px', padding: '1px 6px' }}>● Hidden</span>}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#e8d5b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</div>
                  <div style={{ fontSize: '12px', color: '#e8d5b0', fontStyle: 'italic' }}>{record.artist}{record.year ? ' · ' + record.year : ''}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', color: '#c9a84c', fontWeight: '700' }}>${parseFloat(record.price).toFixed(2)}</span>
                    <span style={{ background: cond.bg, border: '1px solid ' + cond.text + '44', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: cond.text, fontWeight: '700' }}>{record.condition}</span>
                    <span style={{ fontSize: '11px', color: '#e8d5b0', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '1px 6px' }}>{record.category}</span>
                    {record.genre && <span style={{ fontSize: '11px', color: '#e8d5b0' }}>{record.genre}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => setEditRecord(record)}
                    style={{ padding: '6px 12px', background: '#1a2a1a', color: '#c9a84c', border: '1px solid #c9a84c44', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                    ✏️ Edit
                  </button>
                  {confirmDelete === record.id ? (
                    <>
                      <button onClick={() => handleDelete(record)} disabled={deleting === record.id}
                        style={{ padding: '6px 12px', background: '#3a1a1a', color: '#f87171', border: '1px solid #f87171', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                        {deleting === record.id ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        style={{ padding: '6px 12px', background: 'transparent', color: '#aaa', border: '1px solid #333', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(record.id)}
                      style={{ padding: '6px 12px', background: 'transparent', color: '#f87171', border: '1px solid #3a1a1a', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
