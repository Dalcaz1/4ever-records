// Disable static pre-rendering for this page
export const getServerSideProps = async () => ({ props: {} });

import { useState } from 'react';

const GENRES = ['Rock', 'Jazz', 'Blues', 'Country', 'Spanish', 'Classical', "Children's", 'Holiday', 'Pop', 'Religious', 'Comedy', 'Soundtracks'];
const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G'];

function getPhotoSlots(format, discCount) {
  const count = parseInt(discCount) || 1;
  switch (format) {
    case '7" Vinyl': {
      const slots = [
        { key: 'front', label: 'Front Sleeve', icon: '📄', hint: 'Photo of the front of the sleeve' },
        { key: 'a', label: 'A Side Label', icon: '🎵', hint: 'Photo of the A side record label' },
        { key: 'b', label: 'B Side Label', icon: '🎶', hint: 'Photo of the B side record label' },
      ];
      return slots;
    }
    case '12" Vinyl': {
      const slots = [
        { key: 'front', label: 'Front Cover', icon: '🖼️', hint: 'Photo of the front album cover' },
        { key: 'back', label: 'Back Cover', icon: '📋', hint: 'Photo of the back album cover' },
      ];
      for (let d = 1; d <= count; d++) {
        slots.push({ key: `disc${d}a`, label: count > 1 ? `Disc ${d} — A Side` : 'A Side Label', icon: '🎵', hint: `Photo of ${count > 1 ? `disc ${d}` : 'the'} A side label` });
        slots.push({ key: `disc${d}b`, label: count > 1 ? `Disc ${d} — B Side` : 'B Side Label', icon: '🎶', hint: `Photo of ${count > 1 ? `disc ${d}` : 'the'} B side label` });
      }
      return slots;
    }
    case 'CD': {
      const slots = [
        { key: 'front', label: 'Front Case', icon: '📗', hint: 'Photo of the front of the CD case' },
        { key: 'back', label: 'Back Case', icon: '📘', hint: 'Photo of the back of the CD case' },
      ];
      for (let d = 1; d <= count; d++) {
        slots.push({ key: `disc${d}`, label: count > 1 ? `Disc ${d}` : 'Disc', icon: '📀', hint: `Photo of ${count > 1 ? `disc ${d}` : 'the CD disc'}` });
      }
      return slots;
    }
    case 'Cassette':
      return [
        { key: 'front', label: 'Front of Case', icon: '📼', hint: 'Photo of the front of the cassette case' },
        { key: 'back', label: 'Back of Case', icon: '📼', hint: 'Photo of the back of the cassette case' },
      ];
    case '8-Track':
      return [
        { key: 'a', label: 'Side 1', icon: '📟', hint: 'Photo of side 1 of the 8-track' },
        { key: 'b', label: 'Side 2', icon: '📟', hint: 'Photo of side 2 of the 8-track' },
      ];
    default:
      return [{ key: 'front', label: 'Photo', icon: '📷', hint: 'Take a photo' }];
  }
}

const FORMATS = [
  { label: '7" Vinyl',  icon: '🎵', multiDisc: false },
  { label: '12" Vinyl', icon: '💿', multiDisc: true  },
  { label: 'CD',        icon: '📀', multiDisc: true  },
  { label: 'Cassette',  icon: '📼', multiDisc: false },
  { label: '8-Track',   icon: '📟', multiDisc: false },
];

const EMPTY_FORM = {
  artist: '', title: '', year: '', label: '', cat: '',
  genre: 'Rock', condition: 'VG+', price: '', qty: '1', discCount: '1', notes: '',
};

export default function Admin() {
  const [step, setStep] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [discCount, setDiscCount] = useState('1');
  const [photos, setPhotos] = useState({});
  const [previews, setPreviews] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [scanning, setScanning] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const format = FORMATS.find(f => f.label === selectedFormat);
  const photoSlots = selectedFormat ? getPhotoSlots(selectedFormat, discCount) : [];

  function selectFormat(fmt) {
    setSelectedFormat(fmt.label);
    setForm(f => ({ ...f, cat: fmt.label }));
    setPhotos({});
    setPreviews({});
    setDiscCount('1');
    setStep(1);
  }

  function handlePhoto(key, file) {
    if (!file) return;
    setPhotos(p => ({ ...p, [key]: file }));
    const reader = new FileReader();
    reader.onload = e => setPreviews(p => ({ ...p, [key]: e.target.result }));
    reader.readAsDataURL(file);
  }

  async function scanPhotos() {
    setScanning(true);
    setError('');
    try {
      const toBase64 = file => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const content = [];
      for (const slot of photoSlots) {
        if (photos[slot.key]) {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: await toBase64(photos[slot.key]) },
          });
        }
      }

      content.push({
        type: 'text',
        text: `You are a music collector expert. Analyze these ${selectedFormat} photos and extract all visible information.

Return ONLY a JSON object:
{
  "artist": "artist name",
  "title": "album or song title",
  "year": "release year as 4 digit string or empty string if unknown",
  "label": "record label name or empty string if unknown",
  "genre": "one of: Rock, Jazz, Blues, Country, Spanish, Classical, Children's, Holiday, Pop, Religious, Comedy, Soundtracks",
  "condition": "one of: M, NM, VG+, VG, G - based on visible wear",
  "notes": "any other relevant details like pressing info, promo markings, catalog number etc"
}

Return ONLY the JSON, no other text.`,
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content }],
        }),
      });

      const data = await response.json();
      const text = data.content[0].text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(text);
      setForm(f => ({ ...f, ...result, cat: selectedFormat, discCount }));
      setStep(2);
      await getPricing(result.artist, result.title);

    } catch (err) {
      setError('Scanning failed. Please try again or enter details manually.');
      console.error(err);
    }
    setScanning(false);
  }

  async function getPricing(artist, title) {
    try {
      const res = await fetch(`/api/pricing?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
      const data = await res.json();
      setPricing(data);
    } catch {
      setPricing(null);
    }
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
        setTimeout(() => {
          setSaved(false);
          setStep(0);
          setSelectedFormat(null);
          setPhotos({});
          setPreviews({});
          setForm(EMPTY_FORM);
          setPricing(null);
          setDiscCount('1');
        }, 2500);
      } else {
        setError(data.error || 'Failed to save record.');
      }
    } catch {
      setError('Failed to save. Please try again.');
    }
    setSaving(false);
  }

  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px',
    fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0',
    marginBottom: '12px',
  };

  const stepLabels = ['📋 Format', '📸 Photos', '✏️ Review & Save'];

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #c9a84c !important; }
        .fmt-btn:hover { border-color: #c9a84c !important; background: #1a1505 !important; }
        .photo-box:hover { border-color: #c9a84c !important; }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="36" height="36" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
            <circle cx="20" cy="20" r="8" fill="#c9a84c" />
            <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
          </svg>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>Admin · Add Record</div>
          </div>
        </div>
        <a href="/" style={{ color: '#666', fontSize: '12px', textDecoration: 'none', fontStyle: 'italic' }}>← Back to Store</a>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>

        {/* STEP INDICATOR */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', alignItems: 'center' }}>
          {stepLabels.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step > i ? '#c9a84c' : step === i ? '#c9a84c22' : '#1a1a1a', border: `2px solid ${step >= i ? '#c9a84c' : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', fontSize: '14px', color: step > i ? '#0d0d0d' : step === i ? '#c9a84c' : '#555' }}>
                  {step > i ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: '10px', color: step === i ? '#c9a84c' : '#555' }}>{s}</div>
              </div>
              {i < stepLabels.length - 1 && <div style={{ width: '20px', height: '1px', background: step > i ? '#c9a84c' : '#2a2a2a', marginBottom: '18px' }} />}
            </div>
          ))}
        </div>

        {/* STEP 0: SELECT FORMAT */}
        {step === 0 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', color: '#e8d5b0', marginBottom: '8px' }}>What are you adding?</h2>
            <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: '28px' }}>Select the format first so we know which photos to take.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {FORMATS.map(fmt => (
                <button key={fmt.label} className="fmt-btn"
                  onClick={() => selectFormat(fmt)}
                  style={{ padding: '24px 16px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', cursor: 'pointer', textAlign: 'center', fontFamily: 'Georgia, serif', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>{fmt.icon}</div>
                  <div style={{ fontSize: '15px', color: '#e8d5b0', fontWeight: '600' }}>{fmt.label}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{getPhotoSlots(fmt.label, 1).length} photos needed</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: DISC COUNT + PHOTOS */}
        {step === 1 && format && (
          <div>
            <button onClick={() => { setStep(0); setSelectedFormat(null); setPhotos({}); setPreviews({}); setDiscCount('1'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a1a', border: '1px solid #333', color: '#c9a84c', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', marginBottom: '20px' }}>
              ← Change Format
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>{format.icon}</span>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', color: '#e8d5b0', margin: 0 }}>
                Photograph the {selectedFormat}
              </h2>
            </div>

            {/* DISC COUNT SELECTOR */}
            {format.multiDisc && (
              <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>How many discs?</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['1', '2', '3', '4'].map(n => (
                    <button key={n} onClick={() => { setDiscCount(n); setPhotos({}); setPreviews({}); }}
                      style={{ flex: 1, padding: '10px', background: discCount === n ? '#c9a84c' : '#0a0a0a', color: discCount === n ? '#0d0d0d' : '#666', border: `1px solid ${discCount === n ? '#c9a84c' : '#2a2a2a'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: discCount === n ? '700' : '400' }}>
                      {n} {n === '1' ? 'Disc' : 'Discs'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: '20px' }}>
              {photoSlots.length} photos needed for this {discCount > '1' ? `${discCount}-disc ` : ''}{selectedFormat}.
            </p>

            {/* PHOTO GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {photoSlots.map(slot => (
                <div key={slot.key} className="photo-box"
                  style={{ border: `2px dashed ${photos[slot.key] ? '#c9a84c' : '#2a2a2a'}`, borderRadius: '12px', padding: '14px', textAlign: 'center', cursor: 'pointer', background: photos[slot.key] ? '#0f0f0a' : '#0a0a0a', transition: 'all 0.2s' }}
                  onClick={() => document.getElementById(`photo-${slot.key}`).click()}>
                  <input id={`photo-${slot.key}`} type="file" accept="image/*" capture="environment"
                    onChange={e => handlePhoto(slot.key, e.target.files[0])} style={{ display: 'none' }} />
                  {previews[slot.key] ? (
                    <img src={previews[slot.key]} alt={slot.label} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                  ) : (
                    <div style={{ fontSize: '32px', marginBottom: '8px', lineHeight: '110px' }}>{slot.icon}</div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: '600', color: photos[slot.key] ? '#c9a84c' : '#888', marginBottom: '3px' }}>{slot.label}</div>
                  <div style={{ fontSize: '10px', color: '#444', fontStyle: 'italic' }}>
                    {photos[slot.key] ? '✓ Tap to retake' : slot.hint}
                  </div>
                </div>
              ))}
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

            <button onClick={scanPhotos}
              disabled={!photos[photoSlots[0]?.key] || scanning}
              style={{ width: '100%', padding: '14px', background: photos[photoSlots[0]?.key] ? '#c9a84c' : '#1a1a1a', color: photos[photoSlots[0]?.key] ? '#0d0d0d' : '#444', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: photos[photoSlots[0]?.key] ? 'pointer' : 'not-allowed', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '12px' }}>
              {scanning ? '🔍 Scanning...' : '🤖 Scan & Identify →'}
            </button>

            <button onClick={() => { setStep(2); setForm(f => ({ ...f, cat: selectedFormat, discCount })); }}
              style={{ width: '100%', padding: '12px', background: 'transparent', color: '#666', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}>
              Skip scanning — enter details manually →
            </button>
          </div>
        )}

        {/* STEP 2: REVIEW & SAVE */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>{format?.icon}</span>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', color: '#e8d5b0', margin: 0 }}>Review & Edit Details</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: '24px' }}>
              {form.artist ? 'AI identified this item — review and correct before saving.' : 'Enter the details below.'}
            </p>

            {/* PRICING */}
            {pricing && (
              <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', color: '#4ade80', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>💰 Market Pricing</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {pricing.discogs && <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Discogs</div><div style={{ fontSize: '18px', color: '#c9a84c', fontWeight: '700' }}>${pricing.discogs}</div></div>}
                  {pricing.ebay && <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>eBay</div><div style={{ fontSize: '18px', color: '#c9a84c', fontWeight: '700' }}>${pricing.ebay}</div></div>}
                  {pricing.recommended && <div style={{ textAlign: 'center', background: '#0f2a0f', borderRadius: '8px', padding: '8px' }}><div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '4px' }}>Recommended</div><div style={{ fontSize: '22px', color: '#4ade80', fontWeight: '700' }}>${pricing.recommended}</div></div>}
                </div>
                {pricing.notes && <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', marginBottom: '10px' }}>{pricing.notes}</div>}
                <button onClick={() => setForm(f => ({ ...f, price: pricing.recommended }))}
                  style={{ width: '100%', padding: '8px', background: '#1a3a1a', color: '#4ade80', border: '1px solid #2a4a2a', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  Use Recommended Price (${pricing.recommended})
                </button>
              </div>
            )}

            {/* PHOTO PREVIEWS */}
            {Object.keys(previews).length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {Object.values(previews).map((src, i) => (
                  <img key={i} src={src} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #2a2a2a' }} />
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Artist *</label>
                <input name="artist" value={form.artist} onChange={handleFormChange} placeholder="Artist name" style={inp} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Title *</label>
                <input name="title" value={form.title} onChange={handleFormChange} placeholder="Album or song title" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Year</label>
                <input name="year" value={form.year} onChange={handleFormChange} placeholder="1975" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Label</label>
                <input name="label" value={form.label} onChange={handleFormChange} placeholder="Record label" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Format</label>
                <input value={`${form.cat}${discCount > '1' ? ` (${discCount} discs)` : ''}`} readOnly style={{ ...inp, color: '#c9a84c', cursor: 'not-allowed' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Genre</label>
                <select name="genre" value={form.genre} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Condition</label>
                <select name="condition" value={form.condition} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c} {c === 'M' ? '— Mint' : c === 'NM' ? '— Near Mint' : c === 'VG+' ? '— Very Good Plus' : c === 'VG' ? '— Very Good' : '— Good'}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Price ($) *</label>
                <input name="price" value={form.price} onChange={handleFormChange} placeholder="0.00" type="number" style={{ ...inp, marginBottom: 0 }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Quantity</label>
                <input name="qty" value={form.qty} onChange={handleFormChange} placeholder="1" type="number" style={{ ...inp, marginBottom: 0 }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} placeholder="Promo copy, special pressing, catalog number, etc." rows={3}
                  style={{ ...inp, resize: 'vertical', marginBottom: 0 }} />
              </div>
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '13px', margin: '16px 0', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => { setStep(1); setPricing(null); setError(''); }}
                style={{ flex: 1, padding: '12px', background: 'transparent', color: '#666', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                ← Back to Photos
              </button>
              <button onClick={handleSave}
                disabled={!form.artist || !form.title || !form.price || saving || saved}
                style={{ flex: 2, padding: '14px', background: saved ? '#1a3a1a' : (!form.artist || !form.title || !form.price) ? '#1a1a1a' : '#c9a84c', color: saved ? '#4ade80' : (!form.artist || !form.title || !form.price) ? '#444' : '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
                {saved ? '✓ Saved! Adding another...' : saving ? 'Saving...' : '💾 Save to Store →'}
              </button>
            </div>

            <button onClick={() => { setStep(0); setSelectedFormat(null); setPhotos({}); setPreviews({}); setForm(EMPTY_FORM); setPricing(null); setError(''); setDiscCount('1'); }}
              style={{ width: '100%', padding: '10px', background: 'transparent', color: '#444', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginTop: '8px' }}>
              Start over with a different item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
