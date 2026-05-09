import { useState } from 'react';

const CATEGORIES = ['7" Vinyl', '12" Vinyl', 'CD', 'Cassette', '8-Track'];
const GENRES = ['Rock', 'Jazz', 'Blues', 'Country', 'Spanish', 'Classical', "Children's", 'Holiday', 'Pop', 'Religious', 'Comedy', 'Soundtracks'];
const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G'];

const EMPTY_FORM = {
  artist: '', title: '', year: '', label: '', cat: '12" Vinyl',
  genre: 'Rock', condition: 'VG+', price: '', qty: '1', notes: '',
};

export default function Admin() {
  const [step, setStep] = useState(1); // 1=photo A, 2=photo B, 3=cover, 4=review
  const [photos, setPhotos] = useState({ a: null, b: null, cover: null });
  const [previews, setPreviews] = useState({ a: null, b: null, cover: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [scanning, setScanning] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function handlePhoto(side, file) {
    if (!file) return;
    setPhotos(p => ({ ...p, [side]: file }));
    const reader = new FileReader();
    reader.onload = e => setPreviews(p => ({ ...p, [side]: e.target.result }));
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

      const images = [];
      if (photos.a) images.push({ side: 'A side label', data: await toBase64(photos.a) });
      if (photos.b) images.push({ side: 'B side label', data: await toBase64(photos.b) });
      if (photos.cover) images.push({ side: 'cover/sleeve', data: await toBase64(photos.cover) });

      const content = [
        ...images.map(img => ({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: img.data },
        })),
        {
          type: 'text',
          text: `You are a vinyl record expert. Analyze these record photos (${images.map(i => i.side).join(', ')}) and extract all information you can see.

Return ONLY a JSON object with these exact fields:
{
  "artist": "artist name",
  "title": "album or song title",
  "year": "release year as 4 digit string",
  "label": "record label name",
  "cat": "one of: 7\\" Vinyl, 12\\" Vinyl, CD, Cassette, 8-Track",
  "genre": "one of: Rock, Jazz, Blues, Country, Spanish, Classical, Children's, Holiday, Pop, Religious, Comedy, Soundtracks",
  "condition": "one of: M, NM, VG+, VG, G - based on visible wear",
  "notes": "any other relevant details like pressing info, promo markings, etc"
}

Return ONLY the JSON, no other text.`,
        },
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content }],
        }),
      });

      const data = await response.json();
      const text = data.content[0].text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(text);

      setForm(f => ({ ...f, ...result }));
      setStep(4);

      // Now get pricing
      await getPricing(result.artist, result.title);

    } catch (err) {
      setError('Scanning failed. Please check your photos and try again.');
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
      if (photos.a) formData.append('photoA', photos.a);
      if (photos.b) formData.append('photoB', photos.b);
      if (photos.cover) formData.append('photoCover', photos.cover);

      const res = await fetch('/api/save-record', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setStep(1);
          setPhotos({ a: null, b: null, cover: null });
          setPreviews({ a: null, b: null, cover: null });
          setForm(EMPTY_FORM);
          setPricing(null);
        }, 2000);
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

  const photoBox = (side, label, emoji) => (
    <div style={{ flex: 1, border: `2px dashed ${photos[side] ? '#c9a84c' : '#2a2a2a'}`, borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: photos[side] ? '#0f0f0a' : '#0a0a0a' }}
      onClick={() => document.getElementById(`photo-${side}`).click()}>
      <input id={`photo-${side}`} type="file" accept="image/*" capture="environment" onChange={e => handlePhoto(side, e.target.files[0])} style={{ display: 'none' }} />
      {previews[side] ? (
        <img src={previews[side]} alt={label} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
      ) : (
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>{emoji}</div>
      )}
      <div style={{ fontSize: '12px', color: photos[side] ? '#c9a84c' : '#666', fontStyle: 'italic' }}>
        {photos[side] ? '✓ Photo taken' : `Tap to photograph ${label}`}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        select option { background: #0a0a0a; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #c9a84c !important; }
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

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>

        {/* STEP INDICATOR */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', alignItems: 'center' }}>
          {['📸 Photos', '🔍 Scan', '✏️ Review', '💾 Save'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step > i + 1 ? '#c9a84c' : step === i + 1 ? '#c9a84c22' : '#1a1a1a', border: `2px solid ${step >= i + 1 ? '#c9a84c' : '#2a2a2a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', fontSize: '14px' }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: '10px', color: step === i + 1 ? '#c9a84c' : '#555', letterSpacing: '0.5px' }}>{s}</div>
              </div>
              {i < 3 && <div style={{ width: '20px', height: '1px', background: step > i + 1 ? '#c9a84c' : '#2a2a2a', marginBottom: '18px' }} />}
            </div>
          ))}
        </div>

        {/* STEP 1-3: PHOTOS */}
        {step <= 3 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', color: '#e8d5b0', marginBottom: '8px' }}>
              {step === 1 && 'Step 1: Photograph the Record'}
              {step === 2 && 'All 3 Photos Ready?'}
              {step === 3 && 'Review Your Photos'}
            </h2>
            <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: '24px' }}>
              Take photos of the A side label, B side label, and the cover/sleeve for best results.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {photoBox('a', 'A Side Label', '🎵')}
              {photoBox('b', 'B Side Label', '🎶')}
              {photoBox('cover', 'Cover / Sleeve', '📀')}
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

            <button
              onClick={scanPhotos}
              disabled={!photos.a || scanning}
              style={{ width: '100%', padding: '14px', background: photos.a ? '#c9a84c' : '#1a1a1a', color: photos.a ? '#0d0d0d' : '#444', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: photos.a ? 'pointer' : 'not-allowed', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
              {scanning ? '🔍 Scanning photos...' : '🤖 Scan & Identify Record →'}
            </button>

            {!photos.a && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#444', marginTop: '12px', fontStyle: 'italic' }}>
                At minimum, photograph the A side label to continue
              </p>
            )}

            <div style={{ marginTop: '20px', borderTop: '1px solid #1a1a1a', paddingTop: '20px' }}>
              <button onClick={() => setStep(4)} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#666', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}>
                Skip scanning — enter details manually →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & EDIT */}
        {step === 4 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', color: '#e8d5b0', marginBottom: '8px' }}>
              Review & Edit Details
            </h2>
            <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: '24px' }}>
              {form.artist ? 'AI identified this record — review and correct any details before saving.' : 'Enter the record details below.'}
            </p>

            {/* PRICING RECOMMENDATION */}
            {pricing && (
              <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', color: '#4ade80', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>💰 Recommended Pricing</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {pricing.discogs && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Discogs Avg</div>
                      <div style={{ fontSize: '18px', color: '#c9a84c', fontWeight: '700' }}>${pricing.discogs}</div>
                    </div>
                  )}
                  {pricing.ebay && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>eBay Avg</div>
                      <div style={{ fontSize: '18px', color: '#c9a84c', fontWeight: '700' }}>${pricing.ebay}</div>
                    </div>
                  )}
                  {pricing.recommended && (
                    <div style={{ textAlign: 'center', background: '#0f2a0f', borderRadius: '8px', padding: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '4px' }}>Recommended</div>
                      <div style={{ fontSize: '22px', color: '#4ade80', fontWeight: '700' }}>${pricing.recommended}</div>
                    </div>
                  )}
                </div>
                <button onClick={() => setForm(f => ({ ...f, price: pricing.recommended }))}
                  style={{ width: '100%', padding: '8px', background: '#1a3a1a', color: '#4ade80', border: '1px solid #2a4a2a', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  Use Recommended Price (${pricing.recommended})
                </button>
              </div>
            )}

            {/* PHOTO PREVIEWS */}
            {(previews.a || previews.b || previews.cover) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {['a', 'b', 'cover'].map(side => previews[side] && (
                  <img key={side} src={previews[side]} alt={side} style={{ flex: 1, height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #2a2a2a' }} />
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
                <select name="cat" value={form.cat} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
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
                <textarea name="notes" value={form.notes} onChange={handleFormChange} placeholder="Promo copy, special pressing, etc." rows={3}
                  style={{ ...inp, resize: 'vertical', marginBottom: 0 }} />
              </div>
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '13px', margin: '16px 0', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => { setStep(1); setForm(EMPTY_FORM); setPricing(null); setError(''); }}
                style={{ flex: 1, padding: '12px', background: 'transparent', color: '#666', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                ← Start Over
              </button>
              <button onClick={handleSave} disabled={!form.artist || !form.title || !form.price || saving}
                style={{ flex: 2, padding: '14px', background: saved ? '#1a3a1a' : (!form.artist || !form.title || !form.price) ? '#1a1a1a' : '#c9a84c', color: saved ? '#4ade80' : (!form.artist || !form.title || !form.price) ? '#444' : '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
                {saved ? '✓ Saved!' : saving ? 'Saving...' : '💾 Save to Store →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
