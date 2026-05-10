export const getServerSideProps = async () => ({ props: {} });

import { useState, useRef, useEffect } from 'react';

const GENRES = ['Rock', 'Jazz', 'Blues', 'Country', 'Spanish', 'Classical', "Children's", 'Holiday', 'Pop', 'Religious', 'Comedy', 'Soundtracks'];
const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G'];

const FORMATS = [
  { label: '7" Vinyl',  icon: '🎵', multiDisc: false },
  { label: '12" Vinyl', icon: '💿', multiDisc: true  },
  { label: 'CD',        icon: '📀', multiDisc: true  },
  { label: 'Cassette',  icon: '📼', multiDisc: false },
  { label: '8-Track',   icon: '📟', multiDisc: false },
];

function getPhotoSlots(format, discCount) {
  const count = parseInt(discCount) || 1;
  switch (format) {
    case '7" Vinyl':
      return [
        { key: 'front', label: 'Front Sleeve', icon: '📄' },
        { key: 'a', label: 'A Side', icon: '🎵' },
        { key: 'b', label: 'B Side', icon: '🎶' },
      ];
    case '12" Vinyl': {
      const slots = [
        { key: 'front', label: 'Front Cover', icon: '🖼️' },
        { key: 'back', label: 'Back Cover', icon: '📋' },
      ];
      for (let d = 1; d <= count; d++) {
        slots.push({ key: `disc${d}a`, label: count > 1 ? `Disc ${d} A` : 'A Side', icon: '🎵' });
        slots.push({ key: `disc${d}b`, label: count > 1 ? `Disc ${d} B` : 'B Side', icon: '🎶' });
      }
      return slots;
    }
    case 'CD': {
      const slots = [
        { key: 'front', label: 'Front Case', icon: '📗' },
        { key: 'back', label: 'Back Case', icon: '📘' },
      ];
      for (let d = 1; d <= count; d++) {
        slots.push({ key: `disc${d}`, label: count > 1 ? `Disc ${d}` : 'Disc', icon: '📀' });
      }
      return slots;
    }
    case 'Cassette':
      return [
        { key: 'front', label: 'Front', icon: '📼' },
        { key: 'back', label: 'Back', icon: '📼' },
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

// Camera Modal Component
function CameraModal({ onCapture, onClose, label }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

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
        setError('Camera access denied. Please allow camera access in your browser settings.');
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
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
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
        {error ? (
          <div style={{ color: '#f87171', textAlign: 'center', padding: '40px 20px', fontFamily: 'Georgia, serif' }}>{error}</div>
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
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [discCount, setDiscCount] = useState('1');
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('entry');
  const [scanning, setScanning] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [cameraSlot, setCameraSlot] = useState(null);

  const format = FORMATS.find(f => f.label === selectedFormat);
  const photoSlots = selectedFormat ? getPhotoSlots(selectedFormat, discCount) : [];
  const photoCount = Object.keys(photos).length;

  function reset() {
    setSelectedFormat(null);
    setDiscCount('1');
    setPhotos({});
    setPreviews({});
    setForm(EMPTY_FORM);
    setMode('entry');
    setPricing(null);
    setError('');
  }

  function handleCapture(key, file) {
    setPhotos(p => ({ ...p, [key]: file }));
    const reader = new FileReader();
    reader.onload = e => setPreviews(p => ({ ...p, [key]: e.target.result }));
    reader.readAsDataURL(file);
    setCameraSlot(null);
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
      setMode('review');
      fetch(`/api/pricing?artist=${encodeURIComponent(result.artist)}&title=${encodeURIComponent(result.title)}`)
        .then(r => r.json()).then(setPricing).catch(() => {});

    } catch (err) {
      setError('Scanning failed. You can still enter details manually.');
      setForm(f => ({ ...f, cat: selectedFormat }));
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
      photoSlots.forEach(slot => {
        if (photos[slot.key]) formData.append(slot.key, photos[slot.key]);
      });

      const res = await fetch('/api/save-record', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => { reset(); setSaved(false); }, 2000);
      } else {
        setError(data.error || 'Failed to save.');
      }
    } catch {
      setError('Failed to save. Please try again.');
    }
    setSaving(false);
  }

  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px',
    fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0',
    marginBottom: '10px',
  };

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`* { box-sizing: border-box; } input:focus, select:focus, textarea:focus { outline: none; border-color: #c9a84c !important; }`}</style>

      {/* CAMERA MODAL */}
      {cameraSlot && (
        <CameraModal
          label={photoSlots.find(s => s.key === cameraSlot)?.label || 'Photo'}
          onCapture={file => handleCapture(cameraSlot, file)}
          onClose={() => setCameraSlot(null)}
        />
      )}

      {/* NAV */}
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
        <a href="/" style={{ color: '#555', fontSize: '12px', textDecoration: 'none' }}>← Store</a>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>

        {mode === 'entry' && (
          <>
            {/* FORMAT */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Format</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {FORMATS.map(fmt => (
                  <button key={fmt.label}
                    onClick={() => { setSelectedFormat(fmt.label); setPhotos({}); setPreviews({}); setDiscCount('1'); }}
                    style={{ padding: '8px 14px', background: selectedFormat === fmt.label ? '#c9a84c' : '#111', color: selectedFormat === fmt.label ? '#0d0d0d' : '#888', border: `1px solid ${selectedFormat === fmt.label ? '#c9a84c' : '#2a2a2a'}`, borderRadius: '20px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: selectedFormat === fmt.label ? '700' : '400' }}>
                    {fmt.icon} {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DISC COUNT */}
            {format?.multiDisc && selectedFormat && (
              <div style={{ marginBottom: '20px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Number of Discs</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['1', '2', '3', '4'].map(n => (
                    <button key={n} onClick={() => { setDiscCount(n); setPhotos({}); setPreviews({}); }}
                      style={{ flex: 1, padding: '10px', background: discCount === n ? '#c9a84c' : '#0a0a0a', color: discCount === n ? '#0d0d0d' : '#555', border: `1px solid ${discCount === n ? '#c9a84c' : '#2a2a2a'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: discCount === n ? '700' : '400' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PHOTOS */}
            {selectedFormat && (
              <>
                <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Photos ({photoCount}/{photoSlots.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {photoSlots.map(slot => (
                    <button key={slot.key}
                      onClick={() => setCameraSlot(slot.key)}
                      style={{ border: `2px solid ${previews[slot.key] ? '#c9a84c' : '#2a2a2a'}`, borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', background: '#0a0a0a', padding: 0, position: 'relative', display: 'block', width: '100%' }}>
                      {previews[slot.key] ? (
                        <>
                          <img src={previews[slot.key]} alt={slot.label} style={{ width: '100%', width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                          <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#c9a84c', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>
                        </>
                      ) : (
                        <div style={{ height: "auto", aspectRatio: "1", display: "flex", flexDirection: "column"', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '28px' }}>{slot.icon}</span>
                          <span style={{ fontSize: '11px', color: '#555' }}>{slot.label}</span>
                        </div>
                      )}
                      <div style={{ padding: '6px 10px', fontSize: '11px', color: previews[slot.key] ? '#c9a84c' : '#444', textAlign: 'center', borderTop: '1px solid #1a1a1a', fontFamily: 'Georgia, serif' }}>
                        {previews[slot.key] ? '📷 Tap to retake' : '📷 Tap to photograph'}
                      </div>
                    </button>
                  ))}
                </div>

                {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

                <button onClick={handleScan} disabled={photoCount === 0 || scanning}
                  style={{ width: '100%', padding: '16px', background: photoCount > 0 ? '#c9a84c' : '#1a1a1a', color: photoCount > 0 ? '#0d0d0d' : '#444', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: photoCount > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '10px' }}>
                  {scanning ? '🔍 Scanning...' : photoCount > 0 ? `🤖 Scan & Identify (${photoCount} photo${photoCount > 1 ? 's' : ''}) →` : 'Tap photos above to begin'}
                </button>

                <button onClick={() => { setForm(f => ({ ...f, cat: selectedFormat })); setMode('review'); }}
                  style={{ width: '100%', padding: '12px', background: 'transparent', color: '#555', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  Skip scanning — enter details manually →
                </button>
              </>
            )}

            {!selectedFormat && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#333', fontStyle: 'italic' }}>
                Select a format above to begin
              </div>
            )}
          </>
        )}

        {/* REVIEW MODE */}
        {mode === 'review' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#e8d5b0', margin: 0 }}>
                {form.artist ? '✓ Identified — Review & Save' : 'Enter Details'}
              </h2>
              <button onClick={() => setMode('entry')} style={{ background: 'none', border: '1px solid #333', color: '#666', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                ← Back
              </button>
            </div>

            {Object.keys(previews).length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {Object.values(previews).map((src, i) => (
                  <img key={i} src={src} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2a2a2a' }} />
                ))}
              </div>
            )}

            {pricing && (
              <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#4ade80', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>💰 Market Pricing</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  {pricing.discogs && <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>Discogs</div><div style={{ fontSize: '16px', color: '#c9a84c', fontWeight: '700' }}>${pricing.discogs}</div></div>}
                  {pricing.ebay && <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>eBay</div><div style={{ fontSize: '16px', color: '#c9a84c', fontWeight: '700' }}>${pricing.ebay}</div></div>}
                  {pricing.recommended && <div style={{ textAlign: 'center', background: '#0f2a0f', borderRadius: '6px', padding: '6px' }}><div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '2px' }}>Suggested</div><div style={{ fontSize: '18px', color: '#4ade80', fontWeight: '700' }}>${pricing.recommended}</div></div>}
                </div>
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
                <textarea name="notes" value={form.notes} onChange={handleFormChange} placeholder="Promo, pressing info, etc." rows={2}
                  style={{ ...inp, resize: 'none', marginBottom: 0 }} />
              </div>
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '13px', margin: '12px 0', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

            <button onClick={handleSave}
              disabled={!form.artist || !form.title || !form.price || saving || saved}
              style={{ width: '100%', padding: '16px', background: saved ? '#1a3a1a' : (!form.artist || !form.title || !form.price) ? '#1a1a1a' : '#c9a84c', color: saved ? '#4ade80' : (!form.artist || !form.title || !form.price) ? '#444' : '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginTop: '16px' }}>
              {saved ? '✓ Saved!' : saving ? 'Saving...' : '💾 Save to Store →'}
            </button>

            <button onClick={reset}
              style={{ width: '100%', padding: '10px', background: 'transparent', color: '#444', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginTop: '6px' }}>
              Start over
            </button>
          </>
        )}
      </div>
    </div>
  );
}
