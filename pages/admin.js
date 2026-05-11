export const getServerSideProps = async () => ({ props: { v: 4 } });

import { useState, useRef, useEffect } from 'react';

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
        <svg width="48" height="48" viewBox="0 0 40 40" style={{ marginBottom: '16px' }}>
          <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
          <circle cx="20" cy="20" r="8" fill="#c9a84c" />
          <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
        </svg>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#e8d5b0', fontWeight: '700', marginBottom: '4px' }}>4 Ever Memories</div>
        <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '32px' }}>Admin Access</div>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px', fontStyle: 'italic' }}>Enter your 6-digit PIN to continue</div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="••••••"
          style={{ width: '100%', padding: '14px', border: '1px solid #2a2a2a', borderRadius: '10px', fontFamily: 'Georgia, serif', fontSize: '24px', background: '#0a0a0a', color: '#e8d5b0', textAlign: 'center', letterSpacing: '8px', marginBottom: '12px', outline: 'none' }}
          autoFocus
        />
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

const GENRES = ['Rock', 'Jazz', 'Blues', 'Country', 'Spanish', 'Classical', "Children's", 'Holiday', 'Pop', 'Religious', 'Comedy', 'Soundtracks'];
const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G'];

const FORMATS = [
  { label: '7" Vinyl',  icon: '🎵', multiDisc: false, sleeveOptions: ['Picture Sleeve', 'Generic Sleeve', 'Sleeve Only'] },
  { label: '12" Vinyl', icon: '💿', multiDisc: true,  sleeveOptions: ['Picture Cover', 'Generic Cover', 'Cover Only'] },
  { label: 'CD',        icon: '📀', multiDisc: true,  sleeveOptions: ['Picture Case', 'Generic Case'] },
  { label: 'Cassette',  icon: '📼', multiDisc: false, sleeveOptions: ['Picture Case', 'Generic Case'] },
  { label: '8-Track',   icon: '📟', multiDisc: false, sleeveOptions: null },
];

function getPhotoSlots(format, discCount, sleeveType) {
  const count = parseInt(discCount) || 1;
  switch (format) {
    case '7" Vinyl':
      if (sleeveType === 'Picture Sleeve') return [
        { key: 'front', label: 'Front Sleeve', icon: '📄' },
        { key: 'back', label: 'Back Sleeve', icon: '📄' },
        { key: 'a', label: 'A Side Label', icon: '🎵' },
        { key: 'b', label: 'B Side Label', icon: '🎶' },
      ];
      if (sleeveType === 'Sleeve Only') return [
        { key: 'front', label: 'Front Sleeve', icon: '📄' },
        { key: 'back', label: 'Back Sleeve', icon: '📄' },
      ];
      return [
        { key: 'a', label: 'A Side Label', icon: '🎵' },
        { key: 'b', label: 'B Side Label', icon: '🎶' },
      ];

    case '12" Vinyl': {
      if (sleeveType === 'Cover Only') return [
        { key: 'front', label: 'Front Cover', icon: '🖼️' },
        { key: 'back', label: 'Back Cover', icon: '📋' },
      ];
      if (sleeveType === 'Generic Cover') {
        const slots = [];
        for (let d = 1; d <= count; d++) {
          slots.push({ key: 'disc' + d + 'a', label: count > 1 ? 'Disc ' + d + ' A Side' : 'A Side Label', icon: '🎵' });
          slots.push({ key: 'disc' + d + 'b', label: count > 1 ? 'Disc ' + d + ' B Side' : 'B Side Label', icon: '🎶' });
        }
        return slots;
      }
      const slots = [
        { key: 'front', label: 'Front Cover', icon: '🖼️' },
        { key: 'back', label: 'Back Cover', icon: '📋' },
      ];
      for (let d = 1; d <= count; d++) {
        slots.push({ key: 'disc' + d + 'a', label: count > 1 ? 'Disc ' + d + ' A Side' : 'A Side Label', icon: '🎵' });
        slots.push({ key: 'disc' + d + 'b', label: count > 1 ? 'Disc ' + d + ' B Side' : 'B Side Label', icon: '🎶' });
      }
      return slots;
    }

    case 'CD': {
      if (sleeveType === 'Generic Case') {
        const slots = [];
        for (let d = 1; d <= count; d++) {
          slots.push({ key: 'disc' + d + 'front', label: count > 1 ? 'Disc ' + d + ' Front' : 'CD Front', icon: '📀' });
          slots.push({ key: 'disc' + d + 'back', label: count > 1 ? 'Disc ' + d + ' Back' : 'CD Back', icon: '📀' });
        }
        return slots;
      }
      const slots = [
        { key: 'front', label: 'Front Case', icon: '📗' },
        { key: 'back', label: 'Back Case', icon: '📘' },
      ];
      for (let d = 1; d <= count; d++) {
        slots.push({ key: 'disc' + d + 'front', label: count > 1 ? 'Disc ' + d + ' Front' : 'CD Front', icon: '📀' });
        slots.push({ key: 'disc' + d + 'back', label: count > 1 ? 'Disc ' + d + ' Back' : 'CD Back', icon: '📀' });
      }
      return slots;
    }

    case 'Cassette':
      if (sleeveType === 'Generic Case') return [
        { key: 'tape', label: 'Tape', icon: '📼' },
      ];
      return [
        { key: 'front', label: 'Front Case', icon: '📼' },
        { key: 'back', label: 'Back Case', icon: '📼' },
      ];

    case '8-Track':
      return [
        { key: 'a', label: 'Side 1', icon: '📟' },
        { key: 'b', label: 'Side 2', icon: '📟' },
      ];

    default:
      return [{ key: 'front', label: 'Photo', icon: '📷' }];
  }
}

const EMPTY_FORM = {
  artist: '', title: '', year: '', label: '', cat: '',
  genre: 'Rock', condition: 'VG+', price: '', qty: '1', notes: '',
};

function CameraModal({ onCapture, onClose, label }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        setCamError('Camera access denied. Please allow camera access in your browser settings.');
      }
    }
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], 'photo-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      onCapture(file);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.9);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0a0a0a', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#c9a84c', fontSize: '14px', fontFamily: 'Georgia, serif' }}>📷 {label}</span>
        <button onClick={() => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); onClose(); }}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '22px', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {camError ? (
          <div style={{ color: '#f87171', textAlign: 'center', padding: '40px 20px', fontFamily: 'Georgia, serif' }}>{camError}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      {ready && (
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', background: '#0a0a0a' }}>
          <button onClick={capture}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fff', border: '4px solid #c9a84c', cursor: 'pointer', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            📸
          </button>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [discCount, setDiscCount] = useState('1');
  const [sleeveType, setSleeveType] = useState(null);
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('entry');
  const [scanning, setScanning] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSku, setSavedSku] = useState(null);
  const [nextSku, setNextSku] = useState(null);
  const [error, setError] = useState('');
  const [cameraSlot, setCameraSlot] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setAuthed(true);
  }, []);

  if (!authed) return <PinLock onUnlock={() => setAuthed(true)} />;

  const format = FORMATS.find(f => f.label === selectedFormat);
  const effectiveSleeveType = sleeveType || (format?.sleeveOptions?.[0]) || null;
  const photoSlots = selectedFormat ? getPhotoSlots(selectedFormat, discCount, effectiveSleeveType) : [];
  const photoCount = Object.keys(photos).length;

  function reset() {
    setSelectedFormat(null);
    setDiscCount('1');
    setSleeveType(null);
    setPhotos({});
    setPreviews({});
    setForm(EMPTY_FORM);
    setMode('entry');
    setPricing(null);
    setNextSku(null);
    setSavedSku(null);
    setError('');
  }

  function handleCapture(key, file) {
    setPhotos(p => ({ ...p, [key]: file }));
    const reader = new FileReader();
    reader.onload = e => setPreviews(p => ({ ...p, [key]: e.target.result }));
    reader.readAsDataURL(file);
    setCameraSlot(null);
  }

  function removePhoto(key) {
    setPhotos(p => { const n = { ...p }; delete n[key]; return n; });
    setPreviews(p => { const n = { ...p }; delete n[key]; return n; });
  }

  async function fetchNextSku(cat) {
    try {
      const r = await fetch('/api/next-sku?cat=' + encodeURIComponent(cat));
      const d = await r.json();
      setNextSku(d.sku);
    } catch {}
  }

  async function handleScan() {
    setScanning(true);
    setError('');
    try {
      const toBase64 = file => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const images = [];
      for (const slot of photoSlots) {
        if (photos[slot.key]) images.push(await toBase64(photos[slot.key]));
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, format: selectedFormat }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Scan failed');

      setForm(f => ({ ...f, ...result, cat: selectedFormat }));
      await fetchNextSku(selectedFormat);

      const pricingParams = new URLSearchParams({
        artist: result.artist || '',
        title: result.title || '',
        year: result.year || '',
        country: result.country || '',
        catalog_number: result.catalog_number || '',
        pressing: result.pressing || '',
      });
      fetch('/api/pricing?' + pricingParams.toString())
        .then(r => r.json()).then(setPricing).catch(() => {});

      setMode('review');

    } catch (err) {
      setError('Scanning failed. You can still enter details manually.');
      setForm(f => ({ ...f, cat: selectedFormat }));
      await fetchNextSku(selectedFormat);
      setMode('review');
    }
    setScanning(false);
  }

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      formData.append('discCount', discCount);
      formData.append('sleeveType', effectiveSleeveType || '');
      photoSlots.forEach(slot => {
        if (photos[slot.key]) formData.append(slot.key, photos[slot.key]);
      });

      const res = await fetch('/api/save-record', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setSavedSku(data.sku || nextSku);
        setMode('success');
      } else {
        setError(data.error || 'Failed to save.');
      }
    } catch (err) {
      setError('Failed to save. Please try again.');
    }
    setSaving(false);
  }

  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px',
    fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0',
    marginBottom: '10px',
  };

  const backBtn = {
    display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a1a',
    border: '1px solid #333', color: '#c9a84c', borderRadius: '8px', padding: '8px 14px',
    fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', marginBottom: '20px',
  };

  const navLink = {
    color: '#c9a84c', fontSize: '12px', textDecoration: 'none',
    border: '1px solid #c9a84c44', borderRadius: '6px', padding: '6px 12px',
    fontFamily: 'Georgia, serif',
  };

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #c9a84c !important; }
        .photo-slot { position: relative; border-radius: 10px; overflow: hidden; cursor: pointer; background: #0a0a0a; }
        .photo-slot::before { content: ''; display: block; padding-top: 100%; }
        .photo-slot-inner { position: absolute; inset: 0; display: flex; flex-direction: column; }
        .photo-slot img { width: 100%; height: calc(100% - 28px); object-fit: cover; display: block; }
        .photo-slot-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
        .photo-slot-label { height: 28px; display: flex; align-items: center; justify-content: center; font-size: 11px; border-top: 1px solid #1a1a1a; font-family: Georgia, serif; }
        .remove-btn { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.7); border: none; color: #f87171; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
        .sleeve-btn { transition: all 0.2s; }
        .sleeve-btn:hover { border-color: #c9a84c !important; }
      `}</style>

      {cameraSlot && (
        <CameraModal
          label={photoSlots.find(s => s.key === cameraSlot)?.label || 'Photo'}
          onCapture={file => handleCapture(cameraSlot, file)}
          onClose={() => setCameraSlot(null)}
        />
      )}

      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
            <circle cx="20" cy="20" r="8" fill="#c9a84c" />
            <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
          </svg>
          <div>
            <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>Add Record</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/admin" style={navLink}>➕ Add</a>
          <a href="/inventory" style={navLink}>📋 Inventory</a>
          <a href="/" style={{ color: '#555', fontSize: '12px', textDecoration: 'none', borderRadius: '6px', padding: '6px 12px', border: '1px solid #2a2a2a', fontFamily: 'Georgia, serif' }}>← Store</a>
        </div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>

        {mode === 'entry' && (
          <>
            {selectedFormat && (
              <button style={backBtn} onClick={() => { setSelectedFormat(null); setSleeveType(null); setPhotos({}); setPreviews({}); setDiscCount('1'); }}>
                ← Change Format
              </button>
            )}

            {!selectedFormat && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Select Format</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {FORMATS.map(fmt => (
                    <button key={fmt.label}
                      onClick={() => { setSelectedFormat(fmt.label); setPhotos({}); setPreviews({}); setDiscCount('1'); setSleeveType(null); }}
                      style={{ padding: '8px 14px', background: '#111', color: '#888', border: '1px solid #2a2a2a', borderRadius: '20px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px' }}>
                      {fmt.icon} {fmt.label}
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#333', fontStyle: 'italic' }}>
                  Select a format above to begin
                </div>
              </div>
            )}

            {selectedFormat && (
              <>
                <div style={{ fontSize: '15px', color: '#e8d5b0', fontWeight: '600', marginBottom: '16px' }}>
                  {format?.icon} {selectedFormat}
                </div>

                {format?.sleeveOptions && (
                  <div style={{ marginBottom: '20px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Type</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + format.sleeveOptions.length + ', 1fr)', gap: '8px' }}>
                      {format.sleeveOptions.map(opt => {
                        const isActive = effectiveSleeveType === opt;
                        const slots = getPhotoSlots(selectedFormat, discCount, opt);
                        return (
                          <button key={opt} className="sleeve-btn"
                            onClick={() => { setSleeveType(opt); setPhotos({}); setPreviews({}); }}
                            style={{ padding: '10px 8px', background: isActive ? '#c9a84c' : '#0a0a0a', color: isActive ? '#0d0d0d' : '#666', border: '1px solid ' + (isActive ? '#c9a84c' : '#2a2a2a'), borderRadius: '8px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '12px', fontWeight: isActive ? '700' : '400', textAlign: 'center' }}>
                            {opt}<br />
                            <span style={{ fontSize: '10px', opacity: 0.7 }}>{slots.length} photo{slots.length !== 1 ? 's' : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {format?.multiDisc && effectiveSleeveType !== 'Cover Only' && effectiveSleeveType !== 'Sleeve Only' && (
                  <div style={{ marginBottom: '20px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Number of Discs</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['1', '2', '3', '4'].map(n => (
                        <button key={n} onClick={() => { setDiscCount(n); setPhotos({}); setPreviews({}); }}
                          style={{ flex: 1, padding: '10px', background: discCount === n ? '#c9a84c' : '#0a0a0a', color: discCount === n ? '#0d0d0d' : '#555', border: '1px solid ' + (discCount === n ? '#c9a84c' : '#2a2a2a'), borderRadius: '8px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: discCount === n ? '700' : '400' }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Photos ({photoCount}/{photoSlots.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {photoSlots.map(slot => (
                    <div key={slot.key} className="photo-slot"
                      style={{ border: '2px solid ' + (previews[slot.key] ? '#c9a84c' : '#2a2a2a') }}>
                      <div className="photo-slot-inner" onClick={() => setCameraSlot(slot.key)}>
                        {previews[slot.key] ? (
                          <>
                            <img src={previews[slot.key]} alt={slot.label} />
                            <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#c9a84c', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>
                          </>
                        ) : (
                          <div className="photo-slot-empty">
                            <span style={{ fontSize: '28px' }}>{slot.icon}</span>
                            <span style={{ fontSize: '11px', color: '#555' }}>{slot.label}</span>
                          </div>
                        )}
                        <div className="photo-slot-label" style={{ color: previews[slot.key] ? '#c9a84c' : '#444' }}>
                          {previews[slot.key] ? '📷 Tap to retake' : '📷 Tap to photograph'}
                        </div>
                      </div>
                      {previews[slot.key] && (
                        <button className="remove-btn" onClick={e => { e.stopPropagation(); removePhoto(slot.key); }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

                <button onClick={handleScan} disabled={photoCount === 0 || scanning}
                  style={{ width: '100%', padding: '16px', background: photoCount > 0 ? '#c9a84c' : '#1a1a1a', color: photoCount > 0 ? '#0d0d0d' : '#444', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: photoCount > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '10px' }}>
                  {scanning ? '🔍 Scanning...' : photoCount > 0 ? '🤖 Scan & Identify (' + photoCount + ' photo' + (photoCount > 1 ? 's' : '') + ') →' : 'Tap photos above to begin'}
                </button>

                <button onClick={async () => { setForm(f => ({ ...f, cat: selectedFormat })); await fetchNextSku(selectedFormat); setMode('review'); }}
                  style={{ width: '100%', padding: '12px', background: 'transparent', color: '#555', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  Skip scanning — enter details manually →
                </button>
              </>
            )}
          </>
        )}

        {mode === 'review' && (
          <>
            <button style={backBtn} onClick={() => setMode('entry')}>← Back to Photos</button>

            <h2 style={{ fontSize: '20px', color: '#e8d5b0', margin: '0 0 16px' }}>
              {form.artist ? '✓ Identified — Review & Save' : 'Enter Details'}
            </h2>

            {nextSku && (
              <div style={{ background: '#1a1a0a', border: '2px solid #c9a84c', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>📋 Write this SKU on the record label NOW</div>
                <div style={{ fontSize: '36px', fontWeight: '700', color: '#c9a84c', letterSpacing: '3px', fontFamily: 'monospace' }}>{nextSku}</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '6px', fontStyle: 'italic' }}>This will be assigned when you save</div>
              </div>
            )}

            {Object.keys(previews).length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {Object.values(previews).map((src, i) => (
                  <img key={i} src={src} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2a2a2a' }} />
                ))}
              </div>
            )}

            {pricing && (
              <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#4ade80', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  💰 Market Pricing
                  {pricing.confidence && (
                    <span style={{ marginLeft: '8px', fontSize: '10px', color: pricing.confidence === 'high' ? '#4ade80' : pricing.confidence === 'medium' ? '#fbbf24' : '#f87171', textTransform: 'none', letterSpacing: '0' }}>
                      ({pricing.confidence} confidence)
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                  {pricing.discogs && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Discogs</div>
                      <div style={{ fontSize: '14px', color: '#c9a84c', fontWeight: '700' }}>${pricing.discogs}</div>
                    </div>
                  )}
                  {pricing.ebay && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>eBay low</div>
                      <div style={{ fontSize: '14px', color: '#c9a84c', fontWeight: '700' }}>${pricing.ebay.lowest || '—'}</div>
                      <div style={{ fontSize: '10px', color: '#444' }}>avg ${pricing.ebay.avg || '—'}</div>
                      <div style={{ fontSize: '9px', color: '#333' }}>{pricing.ebay.count} listings</div>
                    </div>
                  )}
                  {pricing.popsike && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Popsike est.</div>
                      <div style={{ fontSize: '14px', color: '#c9a84c', fontWeight: '700' }}>${pricing.popsike}</div>
                    </div>
                  )}
                  {pricing.recommended && (
                    <div style={{ textAlign: 'center', background: '#0f2a0f', borderRadius: '6px', padding: '6px' }}>
                      <div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '2px' }}>Suggested</div>
                      <div style={{ fontSize: '16px', color: '#4ade80', fontWeight: '700' }}>${pricing.recommended}</div>
                    </div>
                  )}
                </div>

                {pricing.ebay && pricing.ebay.topListings && pricing.ebay.topListings.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Top eBay listings</div>
                    {pricing.ebay.topListings.map(function(item, i) {
                      return (
                        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #1a2a1a', textDecoration: 'none' }}>
                          <span style={{ fontSize: '11px', color: '#666', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                          <span style={{ fontSize: '11px', color: '#c9a84c', whiteSpace: 'nowrap' }}>${item.price} · {item.condition}</span>
                        </a>
                      );
                    })}
                  </div>
                )}

                {pricing.notes && (
                  <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', marginBottom: '8px' }}>{pricing.notes}</div>
                )}

                {!pricing.recommended && (
                  <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '8px', fontStyle: 'italic' }}>
                    ⚠️ Could not find pricing — please enter manually
                  </div>
                )}

                {pricing.recommended && (
                  <button onClick={() => setForm(f => ({ ...f, price: pricing.recommended }))}
                    style={{ width: '100%', padding: '8px', background: '#1a3a1a', color: '#4ade80', border: '1px solid #2a4a2a', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                    Use ${pricing.recommended}
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Artist *</label>
                <input name="artist" value={form.artist} onChange={handleFormChange} placeholder="Artist name" style={inp} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Title *</label>
                <input name="title" value={form.title} onChange={handleFormChange} placeholder="Album or song title" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Year</label>
                <input name="year" value={form.year} onChange={handleFormChange} placeholder="1975" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Label</label>
                <input name="label" value={form.label} onChange={handleFormChange} placeholder="Record label" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Genre</label>
                <select name="genre" value={form.genre} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Condition</label>
                <select name="condition" value={form.condition} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Price ($) *</label>
                <input name="price" value={form.price} onChange={handleFormChange} placeholder="0.00" type="number" style={{ ...inp, marginBottom: 0 }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Qty</label>
                <input name="qty" value={form.qty} onChange={handleFormChange} placeholder="1" type="number" style={{ ...inp, marginBottom: 0 }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} placeholder="Promo, pressing info, sleeve only, etc." rows={2}
                  style={{ ...inp, resize: 'none', marginBottom: 0 }} />
              </div>
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '13px', margin: '12px 0', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

            <button onClick={handleSave}
              disabled={!form.artist || !form.title || !form.price || saving}
              style={{ width: '100%', padding: '16px', background: (!form.artist || !form.title || !form.price) ? '#1a1a1a' : '#c9a84c', color: (!form.artist || !form.title || !form.price) ? '#444' : '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginTop: '16px' }}>
              {saving ? 'Saving...' : '💾 Save to Store →'}
            </button>

            <button onClick={reset}
              style={{ width: '100%', padding: '10px', background: 'transparent', color: '#444', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginTop: '6px' }}>
              Start over
            </button>
          </>
        )}

        {mode === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', color: '#4ade80', marginBottom: '8px' }}>Record Saved!</h2>
            <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: '28px' }}>
              {form.artist} — {form.title}
            </p>
            <div style={{ background: '#1a1a0a', border: '3px solid #c9a84c', borderRadius: '16px', padding: '28px', marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>📋 Label this record with</div>
              <div style={{ fontSize: '44px', fontWeight: '700', color: '#c9a84c', letterSpacing: '4px', fontFamily: 'monospace' }}>{savedSku}</div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '12px', fontStyle: 'italic' }}>Write this on a label and attach it to the physical record</div>
            </div>
            <button onClick={reset}
              style={{ width: '100%', padding: '16px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '12px' }}>
              ➕ Add Another Record
            </button>
            <a href="/inventory" style={{ display: 'block', color: '#c9a84c', fontSize: '13px', textDecoration: 'none', fontStyle: 'italic', marginBottom: '8px' }}>
              📋 View Inventory
            </a>
            <a href="/" style={{ display: 'block', color: '#555', fontSize: '12px', textDecoration: 'none', fontStyle: 'italic' }}>
              ← Back to Store
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
