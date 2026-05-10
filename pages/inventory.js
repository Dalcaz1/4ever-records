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
        <a href="/" style={{ display: 'block', marginTop: '20px', color: '#444', fontSize: '12px', textDecoration: 'none', fontStyle: 'italic' }}>← Back to Store</a>
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

export default function Inventory() {
  const [authed, setAuthed] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
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

  if (!authed) return <PinLock onUnlock={() => setAuthed(true)} />;

  const filtered = records.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.artist?.toLowerCase().includes(search.toLowerCase()) ||
    r.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{'* { box-sizing: border-box; }'}</style>

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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/admin" style={{ color: '#c9a84c', fontSize: '12px', textDecoration: 'none', border: '1px solid #c9a84c', borderRadius: '6px', padding: '6px 12px' }}>+ Add Record</a>
          <a href="/" style={{ color: '#555', fontSize: '12px', textDecoration: 'none' }}>← Store</a>
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
            <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', marginTop: '2px' }}>{records.length} records total</div>
          </div>
        </div>

        <input
          placeholder="Search by title, artist, or SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #2a2a2a', borderRadius: '8px', fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0', marginBottom: '16px', outline: 'none' }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#555', fontStyle: 'italic' }}>Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#555', fontStyle: 'italic' }}>No records found.</div>
        ) : (
          filtered.map(record => {
            const cond = COND_COLORS[record.condition] || COND_COLORS['VG'];
            return (
              <div key={record.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '14px', marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>

                {record.photo_cover ? (
                  <img src={record.photo_cover} alt={record.title} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', background: '#0a0a0a', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💿</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '9px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase' }}>{record.sku}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#e8d5b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</div>
                  <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>{record.artist} · {record.year}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '14px', color: '#c9a84c', fontWeight: '700' }}>${parseFloat(record.price).toFixed(2)}</span>
                    <span style={{ background: cond.bg, border: '1px solid ' + cond.text + '44', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: cond.text, fontWeight: '700' }}>{record.condition}</span>
                    <span style={{ fontSize: '11px', color: '#444' }}>{record.category}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  {confirmDelete === record.id ? (
                    <>
                      <button onClick={() => handleDelete(record)} disabled={deleting === record.id}
                        style={{ padding: '6px 12px', background: '#3a1a1a', color: '#f87171', border: '1px solid #f87171', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                        {deleting === record.id ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        style={{ padding: '6px 12px', background: 'transparent', color: '#555', border: '1px solid #333', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
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
