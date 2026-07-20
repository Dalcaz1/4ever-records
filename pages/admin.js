export const getServerSideProps = async () => ({ props: { v: 16 } });

import { useState, useEffect, useRef } from 'react';
import CameraModal from '../components/CameraModal';

const SESSION_KEY = '4em_admin_state';
// FIX (July 7 session): migrated from sessionStorage to localStorage.
// Confirmed live, twice in a row: returning from an external eBay listing
// link (opened via target="_blank" from the review screen) fully cleared
// sessionStorage — not just this app's scan-progress key, but the
// admin_auth PIN flag too, forcing a full re-login and rescan. This is a
// known behavior in some mobile/PWA browsing contexts on cross-origin
// round-trip navigation. localStorage is materially more resistant to
// this. The 20-minute recency check (savedAt) already protects against
// stale data regardless of which storage type is used, so there's no
// staleness downside to this change.
function saveSession(state) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch {} }
function loadSession() { try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch {} return null; }
function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch {} }

const FYT_BASE = 'https://findyourtunes.vercel.app';
function fytHeaders() {
  return { 'Content-Type': 'application/json', 'x-4ever-admin': process.env.NEXT_PUBLIC_ADMIN_SHARED_SECRET || '' };
}

const CONDITION_MULTIPLIERS = { 'Sealed': 2.80, 'M': 2.50, 'NM': 1.60, 'VG+': 1.25, 'VG': 1.0, 'G': 0.60 };

function isSpanishOrRegionalLikely(artist, label, genre, country) {
  const haystack = [artist, label, genre, country].join(' ').toLowerCase();
  return /tejano|conjunto|norteno|norteño|regional mexican|spanish|mexican|freddie|latin|ranchera|cumbia|spain|espana/.test(haystack);
}
function getSpanishFloor(format, condition) {
  const isLP = /lp|12/i.test(format);
  if (isLP) return { 'Sealed': 34.99, 'M': 24.99, 'NM': 24.99, 'VG+': 19.99, 'VG': 17.99, 'G': 16.99 }[condition] || 17.99;
  return { 'Sealed': 14.99, 'M': 9.99, 'NM': 9.99, 'VG+': 7.99, 'VG': 5.99, 'G': 4.99 }[condition] || 5.99;
}
function hasPictureSleeve(identification) { return (identification?.type || '').toLowerCase().includes('picture'); }
function getPictureSleeveMultiplier(identification) {
  const fmt = (identification?.format || '').toLowerCase();
  if (!hasPictureSleeve(identification)) return 1.0;
  return fmt.includes('7') ? 1.40 : 1.25;
}
function recalcPriceForCondition(basePrice, condition, identification, form) {
  if (!basePrice) return null;
  const base = parseFloat(basePrice);
  if (isNaN(base)) return null;
  const baseAtVG = base / CONDITION_MULTIPLIERS['VG+'];
  let price = baseAtVG * (CONDITION_MULTIPLIERS[condition] || 1.0);
  price = price * getPictureSleeveMultiplier(identification);
  if (isSpanishOrRegionalLikely(form.artist, form.label, form.genre, form.country)) {
    const floor = getSpanishFloor(identification?.format || '', condition);
    if (price < floor) price = floor;
  }
  return price.toFixed(2);
}

function PinLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  async function handleSubmit() {
    if (pin.length !== 6) { setError('Please enter your 6-digit PIN'); return; }
    setChecking(true); setError('');
    try {
      const res = await fetch('/api/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
      const data = await res.json();
      if (data.success) { localStorage.setItem('admin_auth', 'true'); onUnlock(); }
      else { setError('Incorrect PIN. Please try again.'); setPin(''); }
    } catch { setError('Something went wrong. Please try again.'); }
    setChecking(false);
  }
  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8d5b0' }}>
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 40 40" style={{ marginBottom: '16px' }}><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
        <div style={{ fontSize: '20px', color: '#e8d5b0', fontWeight: '700', marginBottom: '4px' }}>4 Ever Memories</div>
        <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '32px' }}>Admin Access</div>
        <div style={{ fontSize: '13px', color: '#bbb', marginBottom: '16px', fontStyle: 'italic' }}>Enter your 6-digit PIN to continue</div>
        <input type="password" inputMode="numeric" maxLength={6} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••"
          style={{ width: '100%', padding: '14px', border: '1px solid #2a2a2a', borderRadius: '10px', fontFamily: 'Georgia, serif', fontSize: '24px', background: '#0a0a0a', color: '#e8d5b0', textAlign: 'center', letterSpacing: '8px', marginBottom: '12px', outline: 'none' }}
          autoFocus />
        {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        <button onClick={handleSubmit} disabled={pin.length !== 6 || checking}
          style={{ width: '100%', padding: '14px', background: pin.length === 6 ? '#c9a84c' : '#1a1a1a', color: pin.length === 6 ? '#0d0d0d' : '#444', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: pin.length === 6 ? 'pointer' : 'not-allowed', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
          {checking ? 'Verifying...' : 'Unlock →'}
        </button>
        <a href="/" style={{ display: 'block', marginTop: '20px', color: '#c9a84c', fontSize: '13px', textDecoration: 'none', fontStyle: 'italic' }}>← Back to Store</a>
      </div>
    </div>
  );
}

function Stage1Camera({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [camError, setCamError] = useState('');
  // FIX (Symptom B investigation, July 7 session): capture button was
  // tappable the instant the camera view opened, before the video stream
  // had actually produced a frame. If videoWidth/videoHeight were still 0
  // at that point, capture() fell back to 1280x720 defaults and drew
  // whatever the (possibly blank/black) canvas held — sending a bad frame
  // to /api/identify. camReady gates the button until the video is
  // confirmed actually playing with real dimensions.
  const [camReady, setCamReady] = useState(false);
  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch { setCamError('Camera access denied. Please allow camera permissions and try again.'); }
    }
    start();

    // FIX (July 7 session): same backgrounding issue as CameraModal.js —
    // reacquire the camera if its track was stopped/muted while the tab
    // was hidden (phone call, app switch, browser check). Reset camReady
    // so the capture button stays gated until the new stream actually
    // produces a frame (handleVideoLoaded fires again on the new stream).
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      const track = streamRef.current?.getVideoTracks?.()[0];
      if (!track || track.readyState !== 'live') {
        setCamReady(false);
        start();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);
  function handleVideoLoaded() {
    const video = videoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) setCamReady(true);
  }
  function capture() {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    // Second line of defense even if camReady state is somehow stale —
    // never draw a frame with no real dimensions.
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return;
    const w = video.videoWidth; const h = video.videoHeight;
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    canvas.toBlob(blob => {
      if (!blob) return;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      onCapture(new File([blob], 'identify.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.88);
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d0d0d', zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: 'Georgia, serif' }}>
      <div style={{ padding: '14px 16px', background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <svg width="32" height="32" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
        <div>
          <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>Scan Item</div>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {camError ? <div style={{ color: '#f87171', padding: '40px 20px', textAlign: 'center', fontSize: '15px' }}>{camError}</div>
          : <video ref={videoRef} autoPlay muted playsInline onLoadedData={handleVideoLoaded} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ position: 'relative', width: '75vw', height: '75vw', maxWidth: '320px', maxHeight: '320px' }}>
            {[{ top: 0, left: 0, borderTop: '3px solid #c9a84c', borderLeft: '3px solid #c9a84c', borderTopLeftRadius: '6px' },
              { top: 0, right: 0, borderTop: '3px solid #c9a84c', borderRight: '3px solid #c9a84c', borderTopRightRadius: '6px' },
              { bottom: 0, left: 0, borderBottom: '3px solid #c9a84c', borderLeft: '3px solid #c9a84c', borderBottomLeftRadius: '6px' },
              { bottom: 0, right: 0, borderBottom: '3px solid #c9a84c', borderRight: '3px solid #c9a84c', borderBottomRightRadius: '6px' },
            ].map((s, i) => <div key={i} style={{ position: 'absolute', width: '28px', height: '28px', ...s }} />)}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      <div style={{ background: '#0a0a0a', borderTop: '1px solid #2a2a2a', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '100%', maxWidth: '340px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {[{ num: '1', text: 'Hold the label or cover facing the camera, 8–12 inches away' }, { num: '2', text: 'Fill the frame — get close enough to read the text' }, { num: '3', text: 'Hold still — tap capture when image is sharp' }].map(({ num, text }) => (
            <div key={num} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#0d0d0d' }}>{num}</div>
              <div style={{ fontSize: '12px', color: '#bbb', lineHeight: 1.45, paddingTop: '2px' }}>{text}</div>
            </div>
          ))}
        </div>
        <button type="button" onClick={capture} disabled={!camReady} style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid #c9a84c', background: '#1a1a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: camReady ? 'pointer' : 'not-allowed', fontSize: '28px', opacity: camReady ? 1 : 0.4 }}>📷</button>
        {!camError && !camReady && <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>Starting camera…</div>}
      </div>
    </div>
  );
}

function IdentifyingOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d0d0d', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <style>{`@keyframes pulse4em { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
      <svg width="56" height="56" viewBox="0 0 40 40" style={{ marginBottom: '24px' }}><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
      <div style={{ color: '#c9a84c', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Identifying item...</div>
      <div style={{ color: '#bbb', fontSize: '13px', marginBottom: '24px', fontStyle: 'italic' }}>Reading format, label, and catalog number</div>
      <div style={{ display: 'flex', gap: '10px' }}>{[0,1,2].map(i => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#c9a84c', animation: `pulse4em 1.2s ease-in-out ${i * 0.4}s infinite` }} />)}</div>
    </div>
  );
}

function ScanningOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d0d0d', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <style>{`@keyframes pulse4em { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
      <svg width="64" height="64" viewBox="0 0 40 40" style={{ marginBottom: '28px' }}><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
      <div style={{ color: '#c9a84c', fontSize: '20px', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>4 Ever Memories</div>
      <div style={{ color: '#e8d5b0', fontSize: '15px', marginBottom: '28px' }}>Scanning & identifying item</div>
      <div style={{ display: 'flex', gap: '10px' }}>{[0,1,2].map(i => <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#c9a84c', animation: `pulse4em 1.2s ease-in-out ${i * 0.4}s infinite` }} />)}</div>
      <div style={{ color: '#555', fontSize: '12px', marginTop: '24px', fontStyle: 'italic' }}>Reading label, catalog number, and pressing details</div>
    </div>
  );
}

// ─── FYT_FORMATS ─────────────────────────────────────────────────────────────
// frame values must match GUIDE_SETTINGS keys in CameraModal:
//   'square', 'vinyl-circle', 'cd-circle', 'cassette-rect', '8track-rect', 'rectangle'
const FYT_FORMATS = [
  { label: '7" Vinyl', types: [
    { name: 'Picture Sleeve', photos: [{ label: 'Front Sleeve', frame: 'square' }, { label: 'Back Sleeve', frame: 'square' }, { label: 'A Side Label', frame: 'vinyl-circle' }, { label: 'B Side Label', frame: 'vinyl-circle' }] },
    { name: 'Generic Sleeve', photos: [{ label: 'A Side Label', frame: 'vinyl-circle' }, { label: 'B Side Label', frame: 'vinyl-circle' }] },
    { name: 'Sleeve Only', photos: [{ label: 'Front Sleeve', frame: 'square' }, { label: 'Back Sleeve', frame: 'square' }] },
    { name: 'Sealed Item', photos: [{ label: 'Front', frame: 'square' }] },
  ]},
  { label: '12" Vinyl', types: [
    { name: 'Picture Cover', photos: [{ label: 'Front Cover', frame: 'square' }, { label: 'Back Cover', frame: 'square' }, { label: 'A Side Label', frame: 'vinyl-circle' }, { label: 'B Side Label', frame: 'vinyl-circle' }] },
    { name: 'Generic Cover', photos: [{ label: 'A Side Label', frame: 'vinyl-circle' }, { label: 'B Side Label', frame: 'vinyl-circle' }] },
    { name: 'Cover Only', photos: [{ label: 'Front Cover', frame: 'square' }, { label: 'Back Cover', frame: 'square' }] },
    { name: 'Sealed Item', photos: [{ label: 'Front', frame: 'square' }] },
  ]},
  { label: 'CD', types: [
    { name: 'Picture Case', photos: [{ label: 'Front Case', frame: 'square' }, { label: 'Back Case', frame: 'square' }, { label: 'Disc', frame: 'cd-circle' }] },
    { name: 'Generic Case', photos: [{ label: 'Disc', frame: 'cd-circle' }] },
    { name: 'Sealed Item', photos: [{ label: 'Front', frame: 'square' }] },
  ]},
  { label: 'Cassette', types: [
    { name: 'Picture Case', photos: [{ label: 'Front Case', frame: 'cassette-rect' }, { label: 'Tape Label', frame: 'cassette-rect' }, { label: 'J-card Back', frame: 'cassette-rect' }] },
    { name: 'Generic Case', photos: [{ label: 'Front Case', frame: 'cassette-rect' }, { label: 'Tape Label', frame: 'cassette-rect' }] },
    { name: 'Sealed Item', photos: [{ label: 'Front', frame: 'cassette-rect' }] },
  ]},
  { label: '8-Track', types: [
    { name: '8-Track', photos: [{ label: 'Side 1', frame: '8track-rect' }, { label: 'Side 2', frame: '8track-rect' }] },
    { name: 'Sealed Item', photos: [{ label: 'Front', frame: 'square' }] },
  ]},
];

// FIX (July 19 session — category mismatch in saved inventory / 4 Ever
// Verified Sales matcher): the 'cat' field saved to the records table was
// always sourced from Stage 1's raw single-photo format guess, even after
// Dig Deeper corrected the actual size using real evidence (catalog
// number, track listing, RPM markings — see scan.js). This meant every
// saved record's category could be wrong independent of what price was
// actually shown, silently poisoning your own inventory data and, in
// turn, the internal comp-matching pricing source. Maps Dig Deeper's
// corrected release_type back to the same format label strings used by
// FYT_FORMATS/SKU_PREFIXES.
function releaseTypeToFormatLabel(releaseType) {
  const map = {
    VINYL_LP: '12" Vinyl', VINYL_12_SINGLE: '12" Vinyl',
    VINYL_7_SINGLE: '7" Vinyl', VINYL_7_EP: '7" Vinyl',
    CD_ALBUM: 'CD', CD_SINGLE: 'CD',
    CASSETTE_ALBUM: 'Cassette', CASSETTE_SINGLE: 'Cassette',
    '8_TRACK': '8-Track',
  };
  return map[releaseType] || '';
}

function getSlotsFor(format, type) {
  const fmt = FYT_FORMATS.find(f => f.label === format);
  if (!fmt) return [{ label: 'Photo', frame: 'square' }];
  // FIX (July 19 session, CD/Cassette asking for unnecessary case photos):
  // previously an unmatched type string silently fell back to
  // fmt.types[0] — the richest option (Picture Case/Sleeve, most photos)
  // — which meant any mismatch between what the model returned and the
  // exact expected string defaulted to asking for MORE photos than
  // needed. Now prefers the fewest-photos type as the fallback instead —
  // asking for one extra photo the user can skip is a smaller
  // inconvenience than asking for photos of case artwork that doesn't
  // exist.
  const fewestPhotosType = fmt.types.reduce((min, t) => (t.photos.length < min.photos.length ? t : min), fmt.types[0]);
  const t = fmt.types.find(t => t.name === type) || fewestPhotosType;
  return t.photos;
}
function slotLabelToKey(label, index) {
  const l = String(label || '').toLowerCase();
  if (l.includes('front cover') || l.includes('front case') || l.includes('front sleeve') || l === 'front') return 'front';
  if (l.includes('back cover') || l.includes('back case') || l.includes('back sleeve') || l.includes('j-card back')) return 'back';
  if (l.includes('a side') || l.includes('side 1') || l.includes('disc front')) return 'a';
  if (l.includes('b side') || l.includes('side 2') || l.includes('disc back')) return 'b';
  if (l.includes('disc') || l.includes('cd')) return 'a';
  if (l.includes('tape')) return 'a';
  return ['front', 'a', 'b', 'back'][index] || 'front';
}

const GENRES = ['Rock', 'Jazz', 'Blues', 'Country', 'Spanish', 'Classical', "Children's", 'Holiday', 'Pop', 'Religious', 'Comedy', 'Soundtracks'];
const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G'];
const EMPTY_FORM = { artist: '', title: '', year: '', label: '', cat: '', catalog_number: '', country: '', pressing: '', genre: 'Rock', condition: 'VG+', price: '', qty: '1', notes: '' };

function getDemandLabel(wantHave) {
  if (!wantHave) return null;
  const parts = wantHave.split('/');
  if (parts.length !== 2) return null;
  const want = parseInt(parts[0].trim().replace(/,/g, ''));
  const have = parseInt(parts[1].trim().replace(/,/g, ''));
  if (!want || !have) return null;
  const ratio = want / have;
  if (ratio >= 3) return { label: 'High demand', color: '#4ade80', bg: '#0f2a0f', tip: 'Price higher — collectors are chasing this' };
  if (ratio >= 1) return { label: 'Moderate demand', color: '#fbbf24', bg: '#2a2a0a', tip: 'Fair market pricing' };
  return { label: 'Low demand', color: '#f87171', bg: '#2a0f0f', tip: 'Price competitively to sell faster' };
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressForScan(file, slotLabel) {
  return new Promise((resolve) => {
    const l = String(slotLabel || '').toLowerCase();
    const isLabel = l.includes('label') || l.includes('side a') || l.includes('side b') || l.includes('disc') || l.includes('tape');
    const isCover = l.includes('cover') || l.includes('case') || l.includes('front') || l.includes('back');
    const maxPx = isLabel ? 1800 : isCover ? 1400 : 1600;
    const quality = isLabel ? 0.88 : isCover ? 0.84 : 0.86;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxPx || h > maxPx) { const s = Math.min(maxPx/w, maxPx/h); w = Math.round(w*s); h = Math.round(h*s); }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [entryStage, setEntryStage] = useState('camera1');
  const [identification, setIdentification] = useState(null);
  const [photoSlots, setPhotoSlots] = useState([]);
  const [capturedPhotos, setCapturedPhotos] = useState({});
  const [identifyError, setIdentifyError] = useState('');
  const [bSideWarning, setBSideWarning] = useState(false);
  const [pendingIdentification, setPendingIdentification] = useState(null);
  const [formatChoices, setFormatChoices] = useState([]);
  const [cameraSlotIndex, setCameraSlotIndex] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('home');
  const [scanning, setScanning] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSku, setSavedSku] = useState(null);
  const [nextSku, setNextSku] = useState(null);
  const [error, setError] = useState('');
  const [showAllEbay, setShowAllEbay] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [savingAndListing, setSavingAndListing] = useState(false);
  const [discogsDraftResult, setDiscogsDraftResult] = useState(null);
  const [showDiscogsPicker, setShowDiscogsPicker] = useState(false);
  const [discogsCandidates, setDiscogsCandidates] = useState([]);
  const [manageDiscogsLoading, setManageDiscogsLoading] = useState(false);
  const [manageDiscogsResult, setManageDiscogsResult] = useState(null);
  const [manageDiscogsCandidates, setManageDiscogsCandidates] = useState([]);
  const [showManageDiscogsPicker, setShowManageDiscogsPicker] = useState(false);
  const [adjustedCondition, setAdjustedCondition] = useState(null);
  const [displayPrice, setDisplayPrice] = useState(null);
  const [discogsPublishing, setDiscogsPublishing] = useState(false);
  const [discogsResult, setDiscogsResult] = useState(null);
  // Manage inventory state
  const [manageItems, setManageItems] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageSearch, setManageSearch] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const editPhotoRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === 'true') setAuthed(true);
    const saved = loadSession();
    // REVISED (July 7 session, second pass): the previous version of this
    // fix only ever auto-resumed mode === 'entry', deliberately discarding
    // 'review' state on every remount to kill the risk of an old completed
    // scan replaying as if it were fresh (the original Roger Daltrey
    // investigation, later found to have a different root cause, but the
    // unconditional-restore bug it surfaced was real regardless).
    // That was too aggressive: it meant a brief real-world interruption —
    // answering a phone call, checking another app — while sitting on the
    // REVIEW screen (price/condition set, about to hit Save) would wipe
    // that entire in-progress item and dump the user back to Home, forcing
    // a full re-scan. That's the actual complaint tonight.
    // Fix: resume BOTH 'entry' and 'review' (with full state, including
    // pricing/scanResult — that's the whole point of resuming review), but
    // gate it on recency via `savedAt`. A save from the last 20 minutes is
    // almost certainly a live in-progress interruption worth resuming; a
    // save from longer ago is far more likely a stale/abandoned session
    // that should NOT silently reappear as if it were current. 'success'
    // (already saved to inventory) is never resumed — that's a terminal
    // state, nothing left to continue.
    const RESUME_WINDOW_MS = 20 * 60 * 1000; // 20 minutes
    const isRecent = saved && typeof saved.savedAt === 'number' && (Date.now() - saved.savedAt) < RESUME_WINDOW_MS;

    if (saved && isRecent && (saved.mode === 'entry' || saved.mode === 'review')) {
      if (saved.form) setForm(saved.form);
      setMode(saved.mode);
      if (saved.identification) setIdentification(saved.identification);
      if (saved.photoSlots) setPhotoSlots(saved.photoSlots);
      if (saved.mode === 'entry') {
        // NOTE: capturedPhotos (real File/Blob objects) cannot survive a
        // genuine tab reload — sessionStorage only holds strings. Restoring
        // entryStage/photoSlots here still saves the person from redoing
        // the identify step (which can take 10-15+ seconds), even though
        // any already-captured photos will need to be retaken.
        // Guard: never resume directly into 'identifying' — that stage only
        // makes sense with an actual fetch in flight, which a reload always
        // interrupts. Land on 'camera1' instead so the person can retake
        // the Stage 1 photo rather than stare at a permanently stuck spinner.
        if (saved.entryStage && saved.entryStage !== 'identifying') setEntryStage(saved.entryStage);
        if (typeof saved.bSideWarning === 'boolean') setBSideWarning(saved.bSideWarning);
      }
      if (saved.mode === 'review') {
        if (saved.pricing) setPricing(saved.pricing);
        if (saved.scanResult) setScanResult(saved.scanResult);
        if (saved.nextSku) setNextSku(saved.nextSku);
        if (saved.adjustedCondition) setAdjustedCondition(saved.adjustedCondition);
        if (saved.displayPrice) setDisplayPrice(saved.displayPrice);
      }
    } else if (saved) {
      // Either stale (past the resume window) or a terminal/unresumable
      // mode ('success', or anything unexpected) — discard it.
      clearSession();
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    saveSession({ form, mode, pricing, scanResult, nextSku, adjustedCondition, identification, photoSlots, displayPrice, entryStage, bSideWarning, savedAt: Date.now() });
  }, [authed, form, mode, pricing, scanResult, nextSku, adjustedCondition, identification, photoSlots, displayPrice, entryStage, bSideWarning]);

  // Discogs connection status — STEP 1 of a staged rebuild after the
  // previous version of this feature caused a live white-screen crash
  // I could not fully diagnose without a real browser to test against.
  // This step adds ONLY the state + background check, no UI display at
  // all yet, to isolate whether the crash came from the hooks/fetch
  // logic itself or from the JSX that displayed it.
  const [discogsStatus, setDiscogsStatus] = useState({ checked: false, connected: false, username: null, error: null });
  useEffect(() => {
    fetch(FYT_BASE + '/api/collection/discogs-auth?check=1&email=' + encodeURIComponent('dalcaz1@yahoo.com'), { headers: fytHeaders() })
      .then(r => r.json())
      .then(data => setDiscogsStatus({ checked: true, connected: !!data.connected, username: data.username || null, error: data.error || null }))
      .catch(err => setDiscogsStatus({ checked: true, connected: false, username: null, error: 'Network error: ' + err.message }));
  }, []);

  if (!authed) return <PinLock onUnlock={() => setAuthed(true)} />;
  if (scanning) return <ScanningOverlay />;

  const activeCondition = adjustedCondition || form.condition;
  const baseRecommended = pricing?.recommended ? String(pricing.recommended).replace('$', '') : null;
  const shownPrice = displayPrice || baseRecommended;

  function reset() {
    setEntryStage('camera1');
    setIdentification(null); setPhotoSlots([]); setCapturedPhotos({});
    setIdentifyError(''); setCameraSlotIndex(null);
    setForm(EMPTY_FORM); setMode('home');
    setPricing(null); setScanResult(null); setNextSku(null); setSavedSku(null);
    setError(''); setShowAllEbay(false); setShowRejected(false); setAdjustedCondition(null); setDisplayPrice(null);
    setSavingAndListing(false); setDiscogsDraftResult(null); setShowDiscogsPicker(false); setDiscogsCandidates([]);
    setDiscogsResult(null); setEditItem(null); setEditForm({}); setEditPhotoFile(null);
    setBSideWarning(false);
    setPendingIdentification(null); setFormatChoices([]);
    clearSession();
  }

  async function handleStage1Capture(file) {
    setEntryStage('identifying'); setIdentifyError('');
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(FYT_BASE + '/api/identify', { method: 'POST', headers: fytHeaders(), body: JSON.stringify({ image: base64 }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Identification failed');

      // FIX (NO GUESSING requirement, flagged critical July 7, built July
      // 19): previously a low-confidence guess — e.g. a Sun label scan
      // pattern-matching toward Jerry Lee Lewis instead of correctly
      // reading Johnny Cash off a blurry/distant photo — was shown to the
      // user identically to a high-confidence correct read, with no way
      // to tell them apart. Now interrupts BEFORE the photo-slot flow
      // when identify.js flags genuinely low confidence, showing its own
      // best guess plus its stated reason. Only gates on 'low', not
      // 'medium' — an interrupt that fires too often trains users to
      // ignore it (same lesson as the July 8 identity_match banner).
      if (data.needsRetakeConfirmation) {
        setPendingIdentification({ data, file });
        setEntryStage('lowConfidenceRetake');
        return;
      }

      // FIX (format disambiguation, added after a bare CD was silently
      // misidentified as a 7" Picture Disc — confirmed real case): when
      // identify.js is genuinely torn between formats (most commonly CD vs
      // Picture Disc on a bare disc with no case/sleeve for context), it
      // reports this via format_alternatives instead of silently guessing.
      // Ask, don't guess — one tap, only in the rare case this actually
      // fires, not on every scan.
      if (Array.isArray(data.format_alternatives) && data.format_alternatives.length > 0) {
        setPendingIdentification({ data, file });
        setFormatChoices([data.format, ...data.format_alternatives]);
        setEntryStage('formatDisambiguation');
        return;
      }

      commitIdentification(data, file);
    } catch (err) {
      setIdentifyError(err.message || 'Could not identify item — please try again');
      setEntryStage('camera1');
    }
  }

  // User chose "Use Anyway" on the low-confidence retake screen — proceed
  // as normal, still checking format disambiguation afterward in case
  // both conditions happened to fire on the same photo.
  function proceedWithLowConfidence() {
    if (!pendingIdentification) return;
    const { data, file } = pendingIdentification;
    setPendingIdentification(null);
    if (Array.isArray(data.format_alternatives) && data.format_alternatives.length > 0) {
      setFormatChoices([data.format, ...data.format_alternatives]);
      setEntryStage('formatDisambiguation');
      setPendingIdentification({ data, file });
      return;
    }
    commitIdentification(data, file);
  }

  function retakeFromLowConfidence() {
    setPendingIdentification(null);
    setIdentifyError('');
    setEntryStage('camera1');
  }

  function commitIdentification(data, file) {
    setIdentification(data);
    const slots = getSlotsFor(data.format, data.type);
    setPhotoSlots(slots);
    // FIX (July 7 session, ported from FYT): previously the Stage 1 photo
    // was always pre-filled into slot 0 regardless of which side it
    // actually was. If the person photographed the B-side label first
    // (a real, common mistake), it would silently get treated as the
    // primary/A-side photo — pricing is keyed off the A-side track, so
    // this could produce a confidently wrong price with no warning.
    const bSide = data.b_side_scanned === true;
    setBSideWarning(bSide);
    if (!bSide) {
      setCapturedPhotos({ 0: { file, label: slots[0]?.label || 'Front' } });
    } else {
      const bSlotIndex = slots.findIndex(s => {
        const l = String(s?.label || '').toLowerCase();
        return l.includes('b side') || l.includes('side b');
      });
      if (bSlotIndex !== -1) {
        setCapturedPhotos({ [bSlotIndex]: { file, label: slots[bSlotIndex]?.label || 'B Side Label' } });
      } else {
        // Format has no A/B side slots (CD, Cassette, etc.) — shouldn't
        // normally happen since identify.js only flags b_side_scanned for
        // vinyl-style items with visible side markings, but fail safe.
        setCapturedPhotos({});
      }
    }
    setEntryStage('slots');
  }

  function resolveFormatDisambiguation(chosenFormat) {
    if (!pendingIdentification) return;
    const { data, file } = pendingIdentification;
    commitIdentification({ ...data, format: chosenFormat, format_alternatives: [] }, file);
    setPendingIdentification(null);
    setFormatChoices([]);
  }

  // Ported from FYT: lets the user proceed when they've confirmed both
  // sides carry the same track (rare, but real — some pressings). Copies
  // the already-captured B-side photo into the A-side slot so the normal
  // "all slots filled" check passes and a real photo still gets sent for
  // both label fields, rather than silently allowing an empty A-side.
  function handleBothSidesIdentical() {
    const bSlotIndex = photoSlots.findIndex(s => {
      const l = String(s?.label || '').toLowerCase();
      return l.includes('b side') || l.includes('side b');
    });
    const aSlotIndex = photoSlots.findIndex(s => {
      const l = String(s?.label || '').toLowerCase();
      return l.includes('a side') || l.includes('side a');
    });
    setBSideWarning(false);
    if (bSlotIndex === -1 || aSlotIndex === -1 || !capturedPhotos[bSlotIndex]?.file) return;
    const updated = { ...capturedPhotos, [aSlotIndex]: { file: capturedPhotos[bSlotIndex].file, label: photoSlots[aSlotIndex]?.label || 'A Side Label' } };
    setCapturedPhotos(updated);
    const allDone = photoSlots.every((_, i) => updated[i]?.file != null);
    if (allDone) runFullScan(updated);
  }

  function handleSlotCapture(file) {
    const label = photoSlots[cameraSlotIndex]?.label || '';
    const updated = { ...capturedPhotos, [cameraSlotIndex]: { file, label } };
    setCapturedPhotos(updated);
    setCameraSlotIndex(null);
    const allDone = photoSlots.every((_, i) => updated[i]?.file != null);
    if (allDone) runFullScan(updated);
  }

  async function runFullScan(photosMap) {
    setScanning(true); setError('');
    try {
      const photosArray = photoSlots.map((slot, i) => ({ file: photosMap[i]?.file, label: slot?.label || '' })).filter(p => p.file);
      const compressed = await Promise.all(photosArray.map(p => compressForScan(p.file, p.label)));
      const images = await Promise.all(compressed.map(f => fileToBase64(f)));
      const photoLabels = photosArray.map(p => p.label);
      const isSealed = identification?.type === 'Sealed Item';
      const res = await fetch(FYT_BASE + '/api/scan', { method: 'POST', headers: fytHeaders(), body: JSON.stringify({ images, format: identification?.format || '', type: identification?.type || '', sleeveType: identification?.type || '', sealed: isSealed, photoLabels, stage1Context: identification, source: '4ever-admin' }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Scan failed');
      setScanResult(result);
      const enrichedNotes = [result.notes || '', result.condition_notes ? 'Condition Notes: ' + result.condition_notes : '', result.variant ? 'Variant: ' + result.variant : '', result.matrix_runout ? 'Matrix / Runout: ' + result.matrix_runout : '', result.description ? 'Description: ' + result.description : ''].filter(Boolean).join('\n\n');
      const correctedCat = releaseTypeToFormatLabel(result.release_type) || identification?.format || '';
      const updatedForm = { ...form, artist: result.artist || form.artist, title: result.title || form.title, year: result.year || form.year, label: result.label || form.label, catalog_number: result.catalog_number || result.catalogNumber || form.catalog_number, country: result.country || form.country, pressing: result.pressing || result.format_details || form.pressing, genre: result.genre || form.genre, condition: result.condition || form.condition, notes: enrichedNotes || form.notes, cat: correctedCat };
      setForm(updatedForm);
      await fetchNextSku(correctedCat);
      const pricingParams = new URLSearchParams({ artist: result.artist || '', title: result.title || '', year: result.year || '', country: result.country || '', catalog_number: result.catalog_number || result.catalogNumber || '', pressing: result.pressing || result.format_details || identification?.type || '', format: identification?.format || '', release_type: result.release_type || '', genre: result.genre || '', label: result.label || '', condition: result.condition || '', sealed: isSealed ? 'true' : 'false', vinyl_color: result.vinyl_color || '', matrix_runout: result.matrix_runout || '', variant: result.variant || '', label_details: result.label_details || '', pressing_evidence: result.pressing_evidence || '', cover_details: result.cover_details || '', identity_match: result.identity_match === false ? 'false' : 'true', identity_conflict_note: result.identity_conflict_note || '', promo_evidence_citation: result.promo_evidence_citation || '', deep: 'true' });
      fetch(FYT_BASE + '/api/pricing?' + pricingParams.toString(), { headers: fytHeaders() }).then(r => r.json()).then(p => {
        setPricing(p);
        const base = p?.recommended ? String(p.recommended).replace('$', '') : null;
        if (base) { const recalced = recalcPriceForCondition(base, result.condition || 'VG+', identification, updatedForm); setDisplayPrice(recalced || base); }
      }).catch(() => {});
      setMode('review');
    } catch (err) {
      setError('Scanning failed. You can still enter details manually.');
      setForm(f => ({ ...f, cat: identification?.format || '' }));
      await fetchNextSku(identification?.format || '');
      setMode('review');
    }
    setScanning(false);
  }

  async function fetchNextSku(cat) {
    try { const r = await fetch('/api/next-sku?cat=' + encodeURIComponent(cat)); const d = await r.json(); setNextSku(d.sku); } catch {}
  }

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (e.target.name === 'condition') {
      setAdjustedCondition(e.target.value);
      if (baseRecommended) { const recalced = recalcPriceForCondition(baseRecommended, e.target.value, identification, form); if (recalced) setDisplayPrice(recalced); }
    }
  }

  function handleConditionChange(c) {
    setAdjustedCondition(c); setForm(f => ({ ...f, condition: c }));
    if (baseRecommended) { const recalced = recalcPriceForCondition(baseRecommended, c, identification, form); if (recalced) setDisplayPrice(recalced); }
  }

  const STORE_DISCOGS_EMAIL = 'dalcaz1@yahoo.com';

  // Extracted from the original handleSave so both the plain "Save" button
  // and the new combined "Save & List on Discogs" button share one save path
  // — avoids maintaining two separate copies of the photo-compression/
  // FormData logic (the exact kind of duplication that's caused real bugs
  // elsewhere in this codebase).
  async function saveToStore() {
    const formData = new FormData();
    const saveForm = { ...form, condition: activeCondition };
    if (shownPrice && !form.price) saveForm.price = shownPrice;
    Object.entries(saveForm).forEach(([k, v]) => formData.append(k, v));
    formData.append('discCount', '1');
    formData.append('sleeveType', identification?.type || '');
    const compressedSlots = await Promise.all(
      photoSlots.map(async (slot, index) => {
        const photo = capturedPhotos[index];
        if (!photo?.file) return null;
        const compressed = await compressForScan(photo.file, slot.label);
        return { key: slotLabelToKey(slot.label, index), file: compressed };
      })
    );
    compressedSlots.forEach(entry => { if (entry) formData.append(entry.key, entry.file); });
    const res = await fetch('/api/save-record', { method: 'POST', body: formData });
    if (res.status === 413) {
      return { success: false, error: 'Photos are too large even after compression — try retaking with fewer or smaller photos.' };
    }
    const data = await res.json();
    if (!data.success) return { success: false, error: data.error || 'Failed to save.' };
    return { success: true, sku: data.sku || nextSku };
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const result = await saveToStore();
      if (result.success) { setSavedSku(result.sku); setMode('success'); clearSession(); }
      else setError(result.error);
    } catch { setError('Failed to save. Please try again.'); }
    setSaving(false);
  }

  // Searches Discogs for a matching release when the scan didn't already
  // resolve a bestReleaseId — same endpoint FYT's own DiscogsListingPanel
  // uses, called here via the trusted-admin header instead of a consumer
  // login session.
  async function findDiscogsReleaseId(artist, title, catalogNumber, format) {
    const params = new URLSearchParams({
      artist: artist || '', title: title || '',
      catalog_number: catalogNumber || '', format: format || '',
    });
    try {
      const res = await fetch(FYT_BASE + '/api/collection/discogs-lookup?' + params.toString(), { headers: fytHeaders() });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Discogs lookup failed' };
      return { results: data.results || [] };
    } catch (err) {
      return { error: 'Discogs lookup failed: ' + err.message };
    }
  }

  // Creates a Draft listing (never auto-published — same rule as the
  // consumer app) on the store's own already-connected Discogs account.
  async function createDiscogsDraft(releaseId, condition, price) {
    try {
      const res = await fetch(FYT_BASE + '/api/collection/discogs-list', {
        method: 'POST',
        headers: fytHeaders(),
        body: JSON.stringify({
          email: STORE_DISCOGS_EMAIL,
          release_id: releaseId,
          condition: condition || 'VG+',
          sleeve_condition: condition || 'VG+',
          price: price,
          comments: '',
          allow_offers: false,
          source: '4ever-admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || data.message || 'Failed to create Discogs draft' };
      return { success: true, listing_url: data.listing_url };
    } catch (err) {
      return { success: false, error: 'Failed to create Discogs draft: ' + err.message };
    }
  }

  // Single-button combined action: save to the 4 Ever Memories store, then
  // create a Discogs draft for the same item. If the release ID is
  // ambiguous (multiple Discogs candidates), the store save still
  // completes immediately — the Discogs half pauses for a quick pick
  // rather than blocking or guessing wrong on a public listing.
  async function handleSaveAndList() {
    setSavingAndListing(true); setError(''); setDiscogsDraftResult(null);
    try {
      const saveResult = await saveToStore();
      if (!saveResult.success) { setError(saveResult.error); setSavingAndListing(false); return; }
      setSavedSku(saveResult.sku);

      let releaseId = pricing?.bestReleaseId || null;
      const priceForDraft = form.price || shownPrice;
      if (!releaseId) {
        const lookup = await findDiscogsReleaseId(form.artist, form.title, form.catalog_number, identification?.format);
        if (lookup.error) {
          setDiscogsDraftResult({ success: false, error: lookup.error });
        } else if (!lookup.results || lookup.results.length === 0) {
          setDiscogsDraftResult({ success: false, error: 'No matching Discogs release found — add this one manually on Discogs.' });
        } else if (lookup.results.length === 1) {
          releaseId = lookup.results[0].release_id;
        } else {
          setDiscogsCandidates(lookup.results);
          setShowDiscogsPicker(true);
          setSavingAndListing(false);
          setMode('success'); clearSession();
          return; // draft is created after the user picks the right pressing
        }
      }

      if (releaseId) {
        const draft = await createDiscogsDraft(releaseId, activeCondition, priceForDraft);
        setDiscogsDraftResult(draft);
      }
      setMode('success'); clearSession();
    } catch (err) {
      setDiscogsDraftResult({ success: false, error: 'Unexpected error: ' + err.message });
      setMode('success'); clearSession();
    }
    setSavingAndListing(false);
  }

  // Called after the user resolves an ambiguous Discogs match from the
  // picker shown on the success screen (new-scan flow).
  async function handlePickDiscogsCandidate(releaseId) {
    setShowDiscogsPicker(false);
    setSavingAndListing(true);
    const draft = await createDiscogsDraft(releaseId, activeCondition, form.price || shownPrice);
    setDiscogsDraftResult(draft);
    setSavingAndListing(false);
  }

  // ─── MANAGE INVENTORY — Discogs draft for an already-saved item ──────────
  async function persistDiscogsListing(itemId, listingUrl, releaseId) {
    try {
      const res = await fetch('/api/mark-discogs-listed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, discogs_listing_url: listingUrl, discogs_release_id: releaseId }),
      });
      const data = await res.json();
      if (!res.ok) return false;
      // Reflect immediately in the open edit modal and the list behind it,
      // without needing a full reload.
      setEditItem(prev => (prev && prev.id === itemId) ? { ...prev, discogs_listing_url: listingUrl } : prev);
      setManageItems(prev => prev.map(it => it.id === itemId ? { ...it, discogs_listing_url: listingUrl } : it));
      return true;
    } catch { return false; }
  }

  async function handleManageDiscogsDraft() {
    if (!editItem) return;
    setManageDiscogsLoading(true); setManageDiscogsResult(null);
    try {
      let releaseId = editItem.discogs_release_id || null;
      if (!releaseId) {
        const lookup = await findDiscogsReleaseId(editItem.artist, editItem.title, editItem.catalog_number, editItem.category);
        if (lookup.error) {
          setManageDiscogsResult({ success: false, error: lookup.error });
          setManageDiscogsLoading(false);
          return;
        }
        if (!lookup.results || lookup.results.length === 0) {
          setManageDiscogsResult({ success: false, error: 'No matching Discogs release found — add this one manually on Discogs.' });
          setManageDiscogsLoading(false);
          return;
        }
        if (lookup.results.length > 1) {
          setManageDiscogsCandidates(lookup.results);
          setShowManageDiscogsPicker(true);
          setManageDiscogsLoading(false);
          return; // draft created after the user picks the right pressing
        }
        releaseId = lookup.results[0].release_id;
      }

      const draft = await createDiscogsDraft(releaseId, editForm.condition, editForm.price);
      setManageDiscogsResult(draft);
      if (draft.success) await persistDiscogsListing(editItem.id, draft.listing_url, releaseId);
    } catch (err) {
      setManageDiscogsResult({ success: false, error: 'Unexpected error: ' + err.message });
    }
    setManageDiscogsLoading(false);
  }

  async function handlePickManageDiscogsCandidate(releaseId) {
    setShowManageDiscogsPicker(false);
    setManageDiscogsLoading(true);
    const draft = await createDiscogsDraft(releaseId, editForm.condition, editForm.price);
    setManageDiscogsResult(draft);
    if (draft.success) await persistDiscogsListing(editItem.id, draft.listing_url, releaseId);
    setManageDiscogsLoading(false);
  }

  async function handlePublishDiscogs() {
    setDiscogsPublishing(true); setDiscogsResult(null);
    try { const res = await fetch('/api/publish-discogs', { method: 'POST' }); const data = await res.json(); setDiscogsResult(data); }
    catch (err) { setDiscogsResult({ error: err.message }); }
    setDiscogsPublishing(false);
  }

  async function loadManageItems() {
    setManageLoading(true);
    try {
      const q = manageSearch ? '&search=' + encodeURIComponent(manageSearch) : '';
      const res = await fetch('/api/records?active=true&limit=100' + q);
      const data = await res.json();
      setManageItems(data.records || data || []);
    } catch { setManageItems([]); }
    setManageLoading(false);
  }

  function openEditItem(item) {
    setEditItem(item);
    setEditForm({ price: item.price, condition: item.condition, notes: item.notes || '', active: item.active !== false });
    setEditPhotoFile(null);
    setEditError('');
    setManageDiscogsResult(null); setManageDiscogsCandidates([]); setShowManageDiscogsPicker(false);
  }

  async function handleEditSave() {
    setEditSaving(true); setEditError('');
    try {
      const formData = new FormData();
      formData.append('id', editItem.id);
      formData.append('price', editForm.price);
      formData.append('condition', editForm.condition);
      formData.append('notes', editForm.notes);
      formData.append('active', editForm.active ? 'true' : 'false');
      // FIX (July 7 session): this previously sent the raw, uncompressed
      // File straight from the camera input — a modern phone photo can
      // easily be 5-15MB, well past Vercel's 4.5MB serverless request body
      // limit, causing a 413 with no JSON body. That made res.json() throw,
      // landing on the generic "Failed to update" catch below with no real
      // explanation. Compress the same way the main scan flow already does.
      if (editPhotoFile) {
        const compressedPhoto = await compressForScan(editPhotoFile, 'cover');
        formData.append('photo_cover', compressedPhoto);
      }
      const res = await fetch('/api/update-record', { method: 'POST', body: formData });
      if (res.status === 413) {
        setEditError('That photo is too large even after compression — try a different photo or a lower-resolution camera setting.');
        setEditSaving(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEditItem(null); setEditPhotoFile(null);
        loadManageItems();
      } else setEditError(data.error || 'Failed to update.');
    } catch { setEditError('Failed to update. Please try again.'); }
    setEditSaving(false);
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: '8px', fontFamily: 'Georgia, serif', fontSize: '13px', background: '#0a0a0a', color: '#e8d5b0', marginBottom: '10px' };
  const backBtn = { display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a1a', border: '1px solid #333', color: '#c9a84c', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', marginBottom: '20px' };
  const navLink = { color: '#c9a84c', fontSize: '12px', textDecoration: 'none', border: '1px solid #c9a84c44', borderRadius: '6px', padding: '6px 12px', fontFamily: 'Georgia, serif' };
  const sectionLabel = { fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' };
  const demand = pricing ? getDemandLabel(pricing.wantHave) : null;

  const AdminNav = ({ subtitle }) => (
    <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="32" height="32" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
        <div>
          <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>{subtitle}</div>
        </div>
      </div>
      <button onClick={reset} style={{ background: 'transparent', border: 'none', color: '#e8d5b0', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>×</button>
    </nav>
  );

  // ─── HOME MODE ────────────────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
        <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="32" height="32" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
            <div>
              <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>Admin</div>
            </div>
          </div>
          <a href="/" style={{ color: '#555', fontSize: '12px', textDecoration: 'none', fontStyle: 'italic' }}>← Store</a>
        </nav>
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic' }}>What would you like to do?</div>
          </div>
          {/* Discogs status rebuild — step 2: read-only display only,
              deliberately no button/handler yet, to isolate further. */}
          <div style={{ background: discogsStatus.checked && discogsStatus.connected ? '#0a1a0a' : '#1a1408', border: '1px solid ' + (discogsStatus.checked && discogsStatus.connected ? '#1a3a1a' : '#3a2f14'), borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '12px' }}>
            {!discogsStatus.checked && <span style={{ color: '#999' }}>Checking Discogs connection…</span>}
            {discogsStatus.checked && discogsStatus.connected && (
              <span style={{ color: '#4ade80' }}>✅ Discogs connected as {discogsStatus.username || 'dalcaz1@yahoo.com'}</span>
            )}
            {discogsStatus.checked && !discogsStatus.connected && (
              <div>
                <div style={{ color: '#fbbf24' }}>⚠️ Discogs not connected — drafts will fail to save.</div>
                {discogsStatus.error && <div style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{discogsStatus.error}</div>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button onClick={() => { reset(); setMode('entry'); }}
              style={{ width: '100%', padding: '22px 20px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '28px' }}>➕</span>
              <div>
                <div>Add New Inventory</div>
                <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '3px', opacity: 0.7 }}>Scan and price a new item</div>
              </div>
            </button>
            <button onClick={() => { setMode('manage'); loadManageItems(); }}
              style={{ width: '100%', padding: '22px 20px', background: '#111', color: '#e8d5b0', border: '1px solid #2a2a2a', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '28px' }}>📋</span>
              <div>
                <div>Manage Inventory</div>
                <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '3px', color: '#bbb' }}>Edit, update photos, mark sold</div>
              </div>
            </button>
            <button onClick={() => setMode('discogs')}
              style={{ width: '100%', padding: '22px 20px', background: '#111', color: '#e8d5b0', border: '1px solid #2a2a2a', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '28px' }}>📦</span>
              <div>
                <div>Publish Discogs Inventory</div>
                <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '3px', color: '#bbb' }}>Push FYT Discogs items to store</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MANAGE MODE ──────────────────────────────────────────────────────────
  if (mode === 'manage') {
    return (
      <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
        <style>{`* { box-sizing: border-box; } input:focus { outline: none; border-color: #c9a84c !important; }`}</style>
        <AdminNav subtitle="Manage Inventory" />

        {/* Edit modal */}
        {editItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px 16px' }}>
            <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#e8d5b0' }}>{editItem.artist}</div>
                  <div style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic' }}>{editItem.title}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{editItem.sku}</div>
                </div>
                <button onClick={() => setEditItem(null)} style={{ background: 'transparent', border: 'none', color: '#e8d5b0', fontSize: '24px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>

              {editItem.photo_cover && (
                <img src={editItem.photo_cover} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #2a2a2a', marginBottom: '16px' }} />
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={sectionLabel}>Cover Photo</label>
                <input ref={editPhotoRef} type="file" accept="image/*" capture="environment"
                  onChange={e => setEditPhotoFile(e.target.files[0] || null)}
                  style={{ display: 'none' }} />
                <button onClick={() => editPhotoRef.current?.click()}
                  style={{ padding: '8px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#c9a84c', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  📷 {editPhotoFile ? '✓ Photo selected' : editItem.photo_cover ? 'Replace Photo' : 'Add Photo'}
                </button>
                {editPhotoFile && <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '4px' }}>✓ {editPhotoFile.name}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={sectionLabel}>Price ($)</label>
                  <input value={editForm.price || ''} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} type="number" placeholder="0.00" style={{ ...inp, marginBottom: 0 }} />
                </div>
                <div>
                  <label style={sectionLabel}>Condition</label>
                  <select value={editForm.condition || 'VG+'} onChange={e => setEditForm(f => ({ ...f, condition: e.target.value }))} style={{ ...inp, marginBottom: 0 }}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={sectionLabel}>Notes</label>
                <textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'none', marginBottom: 0 }} />
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => setEditForm(f => ({ ...f, active: !f.active }))}
                  style={{ padding: '8px 16px', background: editForm.active ? '#0a1a0a' : '#2a1a1a', border: '1px solid ' + (editForm.active ? '#1a3a1a' : '#7f1d1d'), color: editForm.active ? '#4ade80' : '#f87171', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  {editForm.active ? '✅ Active — Listed for Sale' : '❌ Inactive — Mark as Sold'}
                </button>
              </div>

              <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: '10px', color: '#4ade80', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Discogs</div>
                {editItem.discogs_listing_url ? (
                  <>
                    <div style={{ fontSize: '12px', color: '#4ade80', marginBottom: '6px' }}>📦 Already listed on Discogs</div>
                    <a href={editItem.discogs_listing_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#c9a84c', display: 'block', marginBottom: '8px' }}>{editItem.discogs_listing_url} →</a>
                    <button onClick={handleManageDiscogsDraft} disabled={manageDiscogsLoading}
                      style={{ width: '100%', padding: '8px', background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                      {manageDiscogsLoading ? 'Creating…' : 'Create another draft anyway'}
                    </button>
                  </>
                ) : (
                  <button onClick={handleManageDiscogsDraft} disabled={manageDiscogsLoading}
                    style={{ width: '100%', padding: '10px', background: '#1a3a1a', color: '#4ade80', border: '1px solid #2a4a2a', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: '700' }}>
                    {manageDiscogsLoading ? 'Creating draft…' : '📦 Send Draft to Discogs'}
                  </button>
                )}
                {manageDiscogsResult && !manageDiscogsResult.success && (
                  <div style={{ fontSize: '11px', color: '#f87171', marginTop: '6px' }}>{manageDiscogsResult.error}</div>
                )}
                {manageDiscogsResult && manageDiscogsResult.success && (
                  <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '6px' }}>✓ Draft created — <a href={manageDiscogsResult.listing_url} target="_blank" rel="noopener noreferrer" style={{ color: '#c9a84c' }}>view on Discogs</a></div>
                )}
                {showManageDiscogsPicker && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#c9a84c', marginBottom: '6px' }}>Multiple matches — pick the correct pressing:</div>
                    {manageDiscogsCandidates.map((c) => (
                      <button key={c.release_id} onClick={() => handlePickManageDiscogsCandidate(c.release_id)} disabled={manageDiscogsLoading}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: '5px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e8d5b0', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                        <div style={{ fontWeight: '700' }}>{c.title}</div>
                        <div style={{ color: '#888', fontSize: '10px', marginTop: '1px' }}>{c.label} · {c.catalog_number} · {c.year || '—'} · {c.country || '—'} · {c.format}</div>
                      </button>
                    ))}
                    <button onClick={() => setShowManageDiscogsPicker(false)} style={{ width: '100%', padding: '6px', background: 'transparent', color: '#888', border: 'none', fontSize: '10px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Cancel</button>
                  </div>
                )}
              </div>

              {editError && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px', padding: '8px', background: '#2a1a1a', borderRadius: '6px' }}>{editError}</div>}

              <button onClick={handleEditSave} disabled={editSaving}
                style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
                {editSaving ? 'Saving...' : '💾 Save Changes →'}
              </button>
            </div>
          </div>
        )}

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
          <button style={backBtn} onClick={() => setMode('home')}>← Back</button>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input value={manageSearch} onChange={e => setManageSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadManageItems()}
              placeholder="Search artist or title..." style={{ ...inp, marginBottom: 0, flex: 1 }} />
            <button onClick={loadManageItems} style={{ padding: '10px 16px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: '700', whiteSpace: 'nowrap' }}>Search</button>
          </div>

          {manageLoading && <div style={{ textAlign: 'center', color: '#bbb', padding: '40px', fontStyle: 'italic' }}>Loading...</div>}

          {!manageLoading && manageItems.length === 0 && (
            <div style={{ textAlign: 'center', color: '#555', padding: '40px', fontStyle: 'italic' }}>No items found</div>
          )}

          {!manageLoading && manageItems.map(item => (
            <button key={item.id} onClick={() => openEditItem(item)}
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              {item.photo_cover
                ? <img src={item.photo_cover} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, border: '1px solid #2a2a2a' }} />
                : <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>💿</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#e8d5b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.artist}</div>
                <div style={{ fontSize: '12px', color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{item.sku} · {item.condition} · ${item.price}</div>
                <div style={{ fontSize: '10px', marginTop: '3px', color: item.discogs_listing_url ? '#4ade80' : '#555', fontStyle: item.discogs_listing_url ? 'normal' : 'italic' }}>{item.discogs_listing_url ? '📦 Listed on Discogs' : 'Not on Discogs'}</div>
              </div>
              <div style={{ color: '#c9a84c', fontSize: '16px', flexShrink: 0 }}>›</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── ENTRY MODE ───────────────────────────────────────────────────────────
  if (mode === 'entry') {
    if (entryStage === 'camera1') {
      return (
        <>
          {identifyError && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: '#2a1a1a', border: '1px solid #7f1d1d', padding: '12px 16px', color: '#f87171', fontSize: '13px', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
              {identifyError}
              <button onClick={() => setIdentifyError('')} style={{ marginLeft: '12px', background: 'transparent', border: '1px solid #f87171', color: '#f87171', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Georgia, serif' }}>Dismiss</button>
            </div>
          )}
          <Stage1Camera onCapture={handleStage1Capture} />
        </>
      );
    }
    if (entryStage === 'identifying') return <IdentifyingOverlay />;
    if (entryStage === 'lowConfidenceRetake') {
      const guess = pendingIdentification?.data || {};
      return (
        <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#e8d5b0', marginBottom: '10px', textAlign: 'center', fontFamily: 'Georgia, serif' }}>Photo isn't fully clear</div>
          <div style={{ fontSize: '13px', color: '#999', marginBottom: '14px', textAlign: 'center', maxWidth: '320px', fontFamily: 'Georgia, serif' }}>
            {guess.unclear_reason || "This photo wasn't clear enough to identify with confidence."}
          </div>
          {(guess.artist || guess.title) && (
            <div style={{ background: '#1a1408', border: '1px solid #3a2f14', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', maxWidth: '320px', width: '100%' }}>
              <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>Best guess so far</div>
              <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700', fontFamily: 'Georgia, serif' }}>{guess.artist || '—'}</div>
              <div style={{ fontSize: '13px', color: '#c9a84c', fontFamily: 'Georgia, serif' }}>{guess.title || '—'}</div>
            </div>
          )}
          <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={retakeFromLowConfidence}
              style={{ padding: '16px', background: '#c9a84c', border: 'none', borderRadius: '10px', color: '#0d0d0d', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              📷 Retake Photo
            </button>
            <button onClick={proceedWithLowConfidence}
              style={{ padding: '14px', background: 'transparent', border: '1px solid #444', borderRadius: '10px', color: '#999', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              Use This Anyway →
            </button>
          </div>
        </div>
      );
    }
    if (entryStage === 'formatDisambiguation') {
      return (
        <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🤔</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#e8d5b0', marginBottom: '10px', textAlign: 'center', fontFamily: 'Georgia, serif' }}>What kind of item is this?</div>
          <div style={{ fontSize: '13px', color: '#999', marginBottom: '28px', textAlign: 'center', maxWidth: '320px', fontFamily: 'Georgia, serif' }}>
            This looks like it could be more than one format — a bare disc with no case can be hard to tell apart. Which one is it?
          </div>
          <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {formatChoices.map((fmt, i) => (
              <button key={i} onClick={() => resolveFormatDisambiguation(fmt)}
                style={{ padding: '16px', background: '#1a1a0a', border: '2px solid #c9a84c', borderRadius: '10px', color: '#e8d5b0', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                {fmt}
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (entryStage === 'slots') {
      const nextIndex = photoSlots.findIndex((_, i) => !capturedPhotos[i]?.file);
      return (
        <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
          <style>{`* { box-sizing: border-box; } input:focus, select:focus { outline: none; border-color: #c9a84c !important; }`}</style>
          {cameraSlotIndex !== null && <CameraModal label={photoSlots[cameraSlotIndex]} selectedFormat={identification?.format || ''} onCapture={handleSlotCapture} onClose={() => setCameraSlotIndex(null)} />}
          <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="32" height="32" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
              <div><div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div><div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>Add Record</div></div>
            </div>
            <button onClick={reset} style={{ background: 'transparent', border: 'none', color: '#e8d5b0', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </nav>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
            {identification && (
              <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Identified</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[{ k: 'Format', v: identification.format + (identification.type ? ' — ' + identification.type : '') }, { k: 'Artist', v: identification.artist }, { k: 'Title', v: identification.title }, { k: 'Label', v: identification.label }, { k: 'Catalog', v: identification.catalog_number }, { k: 'Year', v: identification.year }].filter(f => f.v).map(({ k, v }) => (
                    <div key={k} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                      <div style={{ fontSize: '10px', color: '#555', width: '52px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>{k}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#e8d5b0' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <button onClick={reset} style={{ marginTop: '12px', background: 'transparent', border: '1px solid #333', color: '#aaa', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>← Start over</button>
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Photos needed · {Object.keys(capturedPhotos).length} of {photoSlots.length} captured</div>
            {bSideWarning && (
              <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px', background: 'rgba(251,191,36,0.08)', border: '2px solid rgba(251,191,36,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#fbbf24', marginBottom: '4px' }}>B-Side Scanned — Side A Needed for Accurate Pricing</div>
                    <div style={{ fontSize: '12px', color: '#fde68a', lineHeight: 1.6 }}>
                      Your first photo was the B-side label. Continue through the remaining photo slots below — when you reach the A Side Label slot, flip the record and photograph the other side for accurate pricing.
                    </div>
                  </div>
                </div>
                <button type="button" onClick={handleBothSidesIdentical}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  Both Sides Are Identical — Price Based on This Label
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {photoSlots.map((slot, index) => {
                const isDone = capturedPhotos[index]?.file != null;
                const isActive = index === nextIndex;
                const preview = capturedPhotos[index]?.file ? URL.createObjectURL(capturedPhotos[index].file) : null;
                return (
                  <button key={index} type="button" disabled={!isActive && !isDone} onClick={() => { if (isActive) setCameraSlotIndex(index); }}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: isActive ? 'pointer' : 'default', background: isDone ? '#0c130c' : isActive ? '#c9a84c' : '#111', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                    {preview ? <img src={preview} alt={slot.label} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                      : <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: isDone ? '#1a3a1a' : isActive ? 'rgba(0,0,0,0.15)' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{isDone ? '✓' : isActive ? '📷' : String(index + 1)}</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: isDone ? '#4ade80' : isActive ? '#0d0d0d' : '#444' }}>{isDone ? '✓ ' : ''}{slot.label}</div>
                      <div style={{ fontSize: '11px', color: isDone ? '#2a6a2a' : isActive ? '#0d0d0d99' : '#333', marginTop: '2px' }}>{isDone ? 'Captured — tap to retake' : isActive ? 'Tap to photograph' : 'Waiting...'}</div>
                    </div>
                    {isActive && <div style={{ fontSize: '18px', marginLeft: 'auto' }}>→</div>}
                  </button>
                );
              })}
            </div>
            {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}
            <button onClick={async () => { setForm(f => ({ ...f, cat: identification?.format || '' })); await fetchNextSku(identification?.format || ''); setMode('review'); }}
              style={{ width: '100%', padding: '12px', background: 'transparent', color: '#555', border: '1px solid #222', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              Skip scanning — enter details manually →
            </button>
          </div>
        </div>
      );
    }
  }

  // ─── REVIEW MODE ──────────────────────────────────────────────────────────
  if (mode === 'review') {
    return (
      <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
        <style>{`* { box-sizing: border-box; } input:focus, select:focus, textarea:focus { outline: none; border-color: #c9a84c !important; } .ebay-row:hover { background: #0f1f0f; } .cond-btn { transition: all 0.15s; } .cond-btn:hover { border-color: #c9a84c !important; }`}</style>
        <nav style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="32" height="32" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" /><circle cx="20" cy="20" r="8" fill="#c9a84c" /><circle cx="20" cy="20" r="3" fill="#0a0a0a" /></svg>
            <div><div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div><div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>Add Record</div></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a href="/admin" style={navLink}>➕ Add</a>
            <a href="/inventory" style={navLink}>📋 Inventory</a>
            <a href="/" style={{ color: '#e8d5b0', fontSize: '13px', textDecoration: 'none', borderRadius: '8px', padding: '8px 16px', border: '1px solid #333', fontFamily: 'Georgia, serif', background: '#1a1a1a' }}>← Store</a>
          </div>
        </nav>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
          <button style={backBtn} onClick={() => setMode('entry')}>← Back to Photos</button>
          <h2 style={{ fontSize: '20px', color: '#e8d5b0', margin: '0 0 16px' }}>{form.artist ? '✓ Identified — Review & Save' : 'Enter Details'}</h2>
          {nextSku && (
            <div style={{ background: '#1a1a0a', border: '2px solid #c9a84c', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#e8d5b0', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>📋 Write this SKU on the record label NOW</div>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#c9a84c', letterSpacing: '3px', fontFamily: 'monospace' }}>{nextSku}</div>
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '6px', fontStyle: 'italic' }}>This will be assigned when you save</div>
            </div>
          )}
          {Object.keys(capturedPhotos).length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {Object.values(capturedPhotos).filter(Boolean).map((p, i) => { const src = p?.file ? URL.createObjectURL(p.file) : null; return src ? <img key={i} src={src} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2a2a2a' }} /> : null; })}
            </div>
          )}
          {pricing && (
            <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#4ade80', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>💰 Market Pricing{pricing.confidence && <span style={{ marginLeft: '8px', fontSize: '10px', color: pricing.confidence === 'high' ? '#4ade80' : pricing.confidence === 'medium' ? '#fbbf24' : '#f87171', textTransform: 'none', letterSpacing: '0' }}>({pricing.confidence} confidence)</span>}</div>
              {demand && (
                <div style={{ background: demand.bg, border: '1px solid ' + demand.color + '44', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><div style={{ fontSize: '12px', color: demand.color, fontWeight: '700', marginBottom: '2px' }}>{demand.label === 'High demand' ? '🔥' : demand.label === 'Moderate demand' ? '📊' : '📉'} {demand.label}</div><div style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic' }}>{demand.tip}</div></div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}><div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>Discogs community</div><div style={{ fontSize: '11px', color: '#e8d5b0' }}>{pricing.wantHave}</div></div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {pricing.discogs && <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}><div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>Discogs</div><div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.discogs}</div></div>}
                {pricing.ebay?.lowest && <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}><div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>eBay Active</div><div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.ebay.lowest}</div><div style={{ fontSize: '10px', color: '#bbb' }}>avg ${pricing.ebay.avg || '—'}</div></div>}
                {pricing.ebaySold?.median && <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}><div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>eBay Sold</div><div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.ebaySold.median}</div><div style={{ fontSize: '10px', color: '#bbb' }}>{pricing.ebaySold.count} sales</div></div>}
                {pricing.popsike?.median && <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}><div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>Popsike</div><div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.popsike.median}</div><div style={{ fontSize: '10px', color: '#bbb' }}>{pricing.popsike.count} auctions</div></div>}
                {pricing.fourEverMemories?.median && <div style={{ textAlign: 'center', background: '#0f1a0f', borderRadius: '6px', padding: '8px 4px', border: '1px solid #1a3a1a' }}><div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '2px' }}>4EM Verified Sales</div><div style={{ fontSize: '15px', color: '#4ade80', fontWeight: '700' }}>${pricing.fourEverMemories.median}</div><div style={{ fontSize: '10px', color: '#bbb' }}>{pricing.fourEverMemories.count} sold</div></div>}
                {pricing.fourEverMemoriesActive?.median && <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}><div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>4EM Current Listings</div><div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.fourEverMemoriesActive.median}</div><div style={{ fontSize: '10px', color: '#bbb' }}>{pricing.fourEverMemoriesActive.count} asking</div></div>}
                {shownPrice && <div style={{ textAlign: 'center', background: '#0f2a0f', borderRadius: '6px', padding: '8px 4px', border: '1px solid #2a4a2a' }}><div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '2px' }}>Suggested</div><div style={{ fontSize: '16px', color: '#4ade80', fontWeight: '700' }}>${shownPrice}</div><div style={{ fontSize: '10px', color: '#bbb' }}>{activeCondition}</div></div>}
              </div>
              <div style={{ borderTop: '1px solid #1a3a1a', paddingTop: '12px', marginBottom: '4px' }}>
                <div style={{ fontSize: '10px', color: '#4ade80', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Adjust Condition — Price Updates Instantly</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {CONDITIONS.map(c => <button key={c} className="cond-btn" onClick={() => handleConditionChange(c)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid ' + (activeCondition === c ? '#c9a84c' : '#2a2a2a'), background: activeCondition === c ? '#1a1a0a' : '#0a0a0a', color: activeCondition === c ? '#c9a84c' : '#e8d5b0', fontWeight: activeCondition === c ? '700' : '400', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>{c}</button>)}
                </div>
                {adjustedCondition && adjustedCondition !== (scanResult?.condition || 'VG+') && <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '6px', fontStyle: 'italic' }}>✓ Price updated for {adjustedCondition} — ${shownPrice}</div>}
              </div>
              {pricing.ebay?.topListings?.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#3a5a3a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>eBay Active listings ({pricing.ebay.count} total)</div>
                  <div style={{ maxHeight: showAllEbay ? '400px' : '120px', overflowY: showAllEbay ? 'auto' : 'hidden', borderRadius: '6px', transition: 'max-height 0.3s' }}>
                    {pricing.ebay.topListings.map((item, i) => <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="ebay-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 6px', borderBottom: '1px solid #1a2a1a', textDecoration: 'none', borderRadius: '4px' }}><span style={{ fontSize: '11px', color: '#ddd', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span><span style={{ fontSize: '11px', color: '#c9a84c', whiteSpace: 'nowrap', flexShrink: 0 }}>${item.price} · {item.condition}</span></a>)}
                  </div>
                  {pricing.ebay.topListings.length >= 3 && <button onClick={() => setShowAllEbay(!showAllEbay)} style={{ width: '100%', padding: '6px', background: 'transparent', color: '#3a6a3a', border: '1px solid #1a3a1a', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', marginTop: '6px' }}>{showAllEbay ? '▲ Show less' : '▼ Show all ' + pricing.ebay.count + ' listings'}</button>}
                </div>
              )}
              {pricing.ebaySold?.topListings?.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#3a5a3a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>eBay Sold ({pricing.ebaySold.count} transactions)</div>
                  {pricing.ebaySold.topListings.slice(0, 4).map((item, i) => <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 6px', borderBottom: '1px solid #1a2a1a', borderRadius: '4px', textDecoration: 'none' }}><span style={{ fontSize: '11px', color: '#ddd', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span><span style={{ fontSize: '11px', color: '#4ade80', whiteSpace: 'nowrap', flexShrink: 0 }}>${item.price} · {item.condition}</span></a>)}
                </div>
              )}
              {pricing.notes && <div style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic', marginBottom: '8px' }}>{pricing.notes}</div>}
              <div style={{ borderTop: '1px solid #1a3a1a', paddingTop: '10px', marginTop: '4px', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', color: '#4ade80', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Pricing Transparency — Total Matches: {pricing.matchesUsed || 0}{pricing.onlyEbayActive && <span style={{ color: '#fbbf24', marginLeft: '8px' }}>⚠ eBay Active asking prices only — no confirmed sold data</span>}</div>
                {pricing.webSearchIdentification && (
                  <div style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#22d3ee', marginBottom: '3px' }}>🔎 Web Search Corroboration</div>
                    <div style={{ fontSize: '11px', color: '#a5e8f5', marginBottom: pricing.webSearchIdentification.found ? '6px' : '0' }}>
                      {pricing.webSearchIdentification.status}
                      {pricing.webSearchIdentification.searchUrl && (
                        <> — <a href={pricing.webSearchIdentification.searchUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#67e8f9' }}>view search →</a></>
                      )}
                    </div>
                    {(pricing.webSearchIdentification.matchedResults || []).map((r, i) => (
                      <div key={i} style={{ fontSize: '10.5px', marginTop: '4px', paddingTop: '4px', borderTop: i > 0 ? '1px solid rgba(34,211,238,0.15)' : 'none' }}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#67e8f9', fontWeight: '700' }}>{r.title}</a>
                        <div style={{ color: '#8ab8c2' }}>{r.snippet}</div>
                      </div>
                    ))}
                    <div style={{ fontSize: '9.5px', color: '#6a9aa3', marginTop: '6px', fontStyle: 'italic' }}>For manual review only — never auto-applied to identification or pricing.</div>
                  </div>
                )}
                {pricing.floorApplied && (
                  <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', marginBottom: '3px' }}>⚠ Protected Floor Applied</div>
                    <div style={{ fontSize: '11px', color: '#fde68a', lineHeight: 1.5 }}>Raw market comps came in below ${Number(pricing.protectedFloor).toFixed(2)}, the protected floor for this pressing's category/condition — the floor was used as the suggested price instead of the raw market average. This is a deliberate rule (Spanish/Regional pressings are known to be thin/underpriced on eBay and Discogs), not a calculation error.</div>
                  </div>
                )}
                {(pricing.sourceBreakdown || []).filter(s => s.matchesUsed > 0).length > 0 ? (
                  (pricing.sourceBreakdown || []).map((s, i) => s.matchesUsed > 0 && (
                    <div key={i} style={{ background: '#0a0a0a', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px', fontSize: '11px' }}>
                      <div style={{ color: '#c9a84c', fontWeight: '700', marginBottom: '2px' }}>{s.source} ({s.matchesUsed} matches)</div>
                      <div style={{ color: '#ddd' }}>Low: ${s.low} · Med: ${s.median} · High: ${s.high} · Avg: ${s.avg}</div>
                      {s.numForSale != null && <div style={{ color: '#888' }}>For sale: {s.numForSale}</div>}
                      {s.note && <div style={{ color: '#999', marginTop: '2px', fontStyle: 'italic' }}>{s.note}</div>}
                      {(s.listings || []).length > 0 && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #1a1a1a' }}>
                          {s.listings.map((l, li) => l.url ? (
                            <a key={li} href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#67e8f9', fontSize: '10.5px', padding: '3px 0', textDecoration: 'none' }}>
                              {l.title || 'Untitled'} {l.price ? '· $' + l.price : ''} →
                            </a>
                          ) : (
                            <div key={li} style={{ color: '#888', fontSize: '10.5px', padding: '3px 0' }}>
                              {l.title || 'Untitled'} {l.price ? '· $' + l.price : ''}
                              {l.sku ? <span style={{ color: '#c9a84c', fontFamily: 'monospace', marginLeft: '6px' }}>SKU: {l.sku}</span> : <span style={{ fontStyle: 'italic', marginLeft: '6px' }}>(no link available)</span>}
                              {l.soldAt ? <span style={{ color: '#4ade80', marginLeft: '6px' }}>sold {new Date(l.soldAt).toLocaleDateString()}</span> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '11px', color: '#f87171', fontStyle: 'italic' }}>No source contributed a verified match — price shown is a low-confidence fallback, not backed by real comps.</div>
                )}
                {(pricing.rejectedResults || []).length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <button onClick={() => setShowRejected(!showRejected)} style={{ width: '100%', padding: '6px', background: 'transparent', color: '#8a3a3a', border: '1px solid #3a1a1a', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>{showRejected ? '▲ Hide rejected results' : '▼ Show ' + pricing.rejectedResults.length + ' rejected result' + (pricing.rejectedResults.length === 1 ? '' : 's')}</button>
                    {showRejected && (
                      <div style={{ marginTop: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                        {pricing.rejectedResults.map((r, i) => (
                          <div key={i} style={{ fontSize: '10px', color: '#f87171', padding: '4px 6px', borderBottom: '1px solid #1a0a0a' }}>{r.source}: {r.reason}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!shownPrice && <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '8px', fontStyle: 'italic' }}>⚠️ Could not find pricing — please enter manually</div>}
              {shownPrice && <button onClick={() => setForm(f => ({ ...f, price: shownPrice }))} style={{ width: '100%', padding: '8px', background: '#1a3a1a', color: '#4ade80', border: '1px solid #2a4a2a', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>{'Use $' + shownPrice + ' →'}</button>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1/-1' }}><label style={sectionLabel}>Artist *</label><input name="artist" value={form.artist} onChange={handleFormChange} placeholder="Artist name" style={inp} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={sectionLabel}>Title *</label><input name="title" value={form.title} onChange={handleFormChange} placeholder="Album or song title" style={inp} /></div>
            <div><label style={sectionLabel}>Year</label><input name="year" value={form.year} onChange={handleFormChange} placeholder="1975" style={inp} /></div>
            <div><label style={sectionLabel}>Label</label><input name="label" value={form.label} onChange={handleFormChange} placeholder="Record label" style={inp} /></div>
            <div><label style={sectionLabel}>Catalog number</label><input name="catalog_number" value={form.catalog_number || ''} onChange={handleFormChange} placeholder="e.g. FR-801" style={inp} /></div>
            <div><label style={sectionLabel}>Country</label><input name="country" value={form.country || ''} onChange={handleFormChange} placeholder="e.g. USA" style={inp} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={sectionLabel}>Pressing</label><input name="pressing" value={form.pressing || ''} onChange={handleFormChange} placeholder="e.g. Original, Reissue, Promo" style={inp} /></div>
            <div><label style={sectionLabel}>Genre</label><select name="genre" value={form.genre} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>{GENRES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
            <div><label style={sectionLabel}>Condition</label><select name="condition" value={activeCondition} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>{CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={sectionLabel}>Price ($) *</label><input name="price" value={form.price} onChange={handleFormChange} placeholder="0.00" type="number" style={{ ...inp, marginBottom: 0 }} /></div>
            <div><label style={sectionLabel}>Qty</label><input name="qty" value={form.qty} onChange={handleFormChange} placeholder="1" type="number" style={{ ...inp, marginBottom: 0 }} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={sectionLabel}>Notes</label><textarea name="notes" value={form.notes} onChange={handleFormChange} placeholder="B-side, promo markings, sleeve condition, etc." rows={2} style={{ ...inp, resize: 'none', marginBottom: 0 }} /></div>
          </div>
          {error && <div style={{ color: '#f87171', fontSize: '13px', margin: '12px 0', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}
          <button onClick={handleSave} disabled={!form.artist || !form.title || !form.price || saving || savingAndListing}
            style={{ width: '100%', padding: '16px', background: (!form.artist || !form.title || !form.price) ? '#1a1a1a' : '#c9a84c', color: (!form.artist || !form.title || !form.price) ? '#444' : '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginTop: '16px' }}>
            {saving ? 'Saving...' : '💾 Save to Store →'}
          </button>
          <button onClick={handleSaveAndList} disabled={!form.artist || !form.title || !form.price || saving || savingAndListing}
            style={{ width: '100%', padding: '16px', background: (!form.artist || !form.title || !form.price) ? '#1a1a1a' : '#1a3a1a', color: (!form.artist || !form.title || !form.price) ? '#444' : '#4ade80', border: '1px solid ' + ((!form.artist || !form.title || !form.price) ? '#1a1a1a' : '#2a4a2a'), borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginTop: '10px' }}>
            {savingAndListing ? 'Saving & Listing...' : '💾📦 Save to Store + List Draft on Discogs →'}
          </button>
          <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '6px', fontStyle: 'italic' }}>Discogs listing is always created as a Draft — never auto-published. Review and publish it yourself on Discogs.</div>
          <button onClick={reset} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#bbb', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginTop: '6px' }}>Start over</button>
        </div>
      </div>
    );
  }

  // ─── SUCCESS MODE ─────────────────────────────────────────────────────────
  if (mode === 'success') {
    return (
      <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', color: '#4ade80', marginBottom: '8px' }}>Record Saved!</h2>
          <p style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic', marginBottom: '28px' }}>{form.artist} — {form.title}</p>
          <div style={{ background: '#1a1a0a', border: '3px solid #c9a84c', borderRadius: '16px', padding: '28px', marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', color: '#e8d5b0', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>📋 Label this record with</div>
            <div style={{ fontSize: '44px', fontWeight: '700', color: '#c9a84c', letterSpacing: '4px', fontFamily: 'monospace' }}>{savedSku}</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '12px', fontStyle: 'italic' }}>Write this on a label and attach it to the physical record</div>
          </div>
          {discogsDraftResult && (
            <div style={{ background: discogsDraftResult.success ? '#0a1a0a' : '#2a1a1a', border: '1px solid ' + (discogsDraftResult.success ? '#2a4a2a' : '#4a2a2a'), borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
              {discogsDraftResult.success ? (
                <>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#4ade80', marginBottom: '6px' }}>📦 Discogs Draft Created</div>
                  <a href={discogsDraftResult.listing_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#c9a84c' }}>{discogsDraftResult.listing_url} →</a>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#f87171', marginBottom: '4px' }}>📦 Discogs Draft Not Created</div>
                  <div style={{ fontSize: '12px', color: '#fca5a5' }}>{discogsDraftResult.error}</div>
                </>
              )}
            </div>
          )}
          {savingAndListing && (
            <div style={{ fontSize: '12px', color: '#bbb', fontStyle: 'italic', marginBottom: '20px' }}>Creating Discogs draft…</div>
          )}
          {showDiscogsPicker && (
            <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#c9a84c', marginBottom: '10px' }}>Multiple Discogs matches found — pick the correct pressing:</div>
              {discogsCandidates.map((c) => (
                <button key={c.release_id} onClick={() => handlePickDiscogsCandidate(c.release_id)} disabled={savingAndListing}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: '6px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e8d5b0', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  <div style={{ fontWeight: '700' }}>{c.title}</div>
                  <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{c.label} · {c.catalog_number} · {c.year || '—'} · {c.country || '—'} · {c.format}</div>
                </button>
              ))}
              <button onClick={() => setShowDiscogsPicker(false)} style={{ width: '100%', padding: '8px', background: 'transparent', color: '#888', border: 'none', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginTop: '4px' }}>Skip — I'll add it on Discogs manually</button>
            </div>
          )}
          <button onClick={reset} style={{ width: '100%', padding: '16px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '12px' }}>➕ Add Another Record</button>
          <a href="/inventory" style={{ display: 'block', color: '#c9a84c', fontSize: '13px', textDecoration: 'none', fontStyle: 'italic', marginBottom: '8px' }}>📋 View Inventory</a>
          <a href="/" style={{ display: 'block', color: '#555', fontSize: '12px', textDecoration: 'none', fontStyle: 'italic' }}>← Back to Store</a>
        </div>
      </div>
    );
  }

  // ─── DISCOGS PUBLISH MODE ─────────────────────────────────────────────────
  if (mode === 'discogs') {
    return (
      <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
        <AdminNav subtitle="Publish Discogs" />
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
          <button style={{ ...backBtn, margin: '0 auto 28px' }} onClick={() => setMode('home')}>← Back</button>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h2 style={{ fontSize: '20px', color: '#e8d5b0', marginBottom: '8px' }}>Publish Discogs Inventory</h2>
          <p style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic', marginBottom: '28px' }}>Publishes all FYT Discogs-imported items to the 4 Ever store with D-SKUs.<br />No photos required — items go live for customers immediately.</p>
          {!discogsResult && !discogsPublishing && (
            <button onClick={handlePublishDiscogs} style={{ width: '100%', padding: '16px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '12px' }}>🚀 Publish to Store →</button>
          )}
          {discogsPublishing && (
            <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '32px 24px', marginBottom: '24px' }}>
              <style>{`@keyframes pulse4em { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>{[0,1,2].map(i => <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#c9a84c', animation: `pulse4em 1.2s ease-in-out ${i * 0.4}s infinite` }} />)}</div>
              <div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700', marginBottom: '6px' }}>Publishing to store...</div>
              <div style={{ fontSize: '12px', color: '#bbb', fontStyle: 'italic' }}>Writing all Discogs items with D-SKUs — this may take a moment</div>
            </div>
          )}
          {discogsResult?.success && (
            <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontSize: '18px', color: '#4ade80', fontWeight: '700', marginBottom: '6px' }}>{discogsResult.published} items published to store</div>
              {discogsResult.skipped > 0 && <div style={{ fontSize: '12px', color: '#fbbf24', fontStyle: 'italic', marginTop: '8px' }}>{discogsResult.skipped} items skipped — missing artist, title, or price</div>}
            </div>
          )}
          {discogsResult?.error && (
            <div style={{ background: '#2a1a1a', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ color: '#f87171', fontSize: '14px' }}>❌ {discogsResult.error}</div>
            </div>
          )}
          <button onClick={() => setMode('home')} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#c9a84c', border: '1px solid #c9a84c44', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>← Back to Admin</button>
        </div>
      </div>
    );
  }

  return null;
}
