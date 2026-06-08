export const getServerSideProps = async () => ({ props: { v: 12 } });

import { useState, useEffect, useRef } from 'react';
import CameraModal from '../components/CameraModal';

// ─── Session persistence helpers ───────────────────────────────────────────
const SESSION_KEY = '4em_admin_state';

function saveSession(state) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch {}
}
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {}
  return null;
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}
// ───────────────────────────────────────────────────────────────────────────

// ─── FYT API helpers ───────────────────────────────────────────────────────
const FYT_BASE = 'https://findyourtunes.vercel.app';
const ADMIN_HEADER = { 'x-4ever-admin': process.env.NEXT_PUBLIC_ADMIN_SHARED_SECRET || '' };

function fytHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-4ever-admin': process.env.NEXT_PUBLIC_ADMIN_SHARED_SECRET || '',
  };
}
// ───────────────────────────────────────────────────────────────────────────

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
        <div style={{ fontSize: '13px', color: '#bbb', marginBottom: '16px', fontStyle: 'italic' }}>Enter your 6-digit PIN to continue</div>
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
        <a href="/" style={{ display: 'block', marginTop: '20px', color: '#c9a84c', fontSize: '13px', textDecoration: 'none', fontStyle: 'italic' }}>← Back to Store</a>
      </div>
    </div>
  );
}

// ─── Stage 1 Camera — same visual style as FYT ────────────────────────────
function Stage1Camera({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCamError('Camera access denied. Please allow camera permissions and try again.');
      }
    }
    start();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
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
        <svg width="32" height="32" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
          <circle cx="20" cy="20" r="8" fill="#c9a84c" />
          <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
        </svg>
        <div>
          <div style={{ fontSize: '14px', color: '#e8d5b0', fontWeight: '700' }}>4 Ever Memories</div>
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase' }}>Scan Item</div>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {camError ? (
          <div style={{ color: '#f87171', padding: '40px 20px', textAlign: 'center', fontSize: '15px' }}>{camError}</div>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ position: 'relative', width: '75vw', height: '75vw', maxWidth: '320px', maxHeight: '320px' }}>
            {[
              { top: 0, left: 0, borderTop: '3px solid #c9a84c', borderLeft: '3px solid #c9a84c', borderTopLeftRadius: '6px' },
              { top: 0, right: 0, borderTop: '3px solid #c9a84c', borderRight: '3px solid #c9a84c', borderTopRightRadius: '6px' },
              { bottom: 0, left: 0, borderBottom: '3px solid #c9a84c', borderLeft: '3px solid #c9a84c', borderBottomLeftRadius: '6px' },
              { bottom: 0, right: 0, borderBottom: '3px solid #c9a84c', borderRight: '3px solid #c9a84c', borderBottomRightRadius: '6px' },
            ].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: '28px', height: '28px', ...s }} />
            ))}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      <div style={{ background: '#0a0a0a', borderTop: '1px solid #2a2a2a', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '100%', maxWidth: '340px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {[
            { num: '1', text: 'Hold the label or cover facing the camera' },
            { num: '2', text: 'Fill the frame — get close enough to read the text' },
            { num: '3', text: 'Hold still — tap capture when image is sharp' },
          ].map(({ num, text }) => (
            <div key={num} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#0d0d0d' }}>{num}</div>
              <div style={{ fontSize: '12px', color: '#bbb', lineHeight: 1.45, paddingTop: '2px' }}>{text}</div>
            </div>
          ))}
        </div>
        <button type="button" onClick={capture} style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid #c9a84c', background: '#1a1a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '28px' }}>
          📷
        </button>
      </div>
    </div>
  );
}

function IdentifyingOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d0d0d', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <style>{`@keyframes pulse4em { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
      <svg width="56" height="56" viewBox="0 0 40 40" style={{ marginBottom: '24px' }}>
        <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
        <circle cx="20" cy="20" r="8" fill="#c9a84c" />
        <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
      </svg>
      <div style={{ color: '#c9a84c', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Identifying item...</div>
      <div style={{ color: '#bbb', fontSize: '13px', marginBottom: '24px', fontStyle: 'italic' }}>Reading format, label, and catalog number</div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#c9a84c', animation: `pulse4em 1.2s ease-in-out ${i * 0.4}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function ScanningOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d0d0d', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <style>{`@keyframes pulse4em { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
      <svg width="64" height="64" viewBox="0 0 40 40" style={{ marginBottom: '28px' }}>
        <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
        <circle cx="20" cy="20" r="8" fill="#c9a84c" />
        <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
      </svg>
      <div style={{ color: '#c9a84c', fontSize: '20px', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>4 Ever Memories</div>
      <div style={{ color: '#e8d5b0', fontSize: '15px', marginBottom: '28px' }}>Scanning & identifying item</div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#c9a84c', animation: `pulse4em 1.2s ease-in-out ${i * 0.4}s infinite` }} />
        ))}
      </div>
      <div style={{ color: '#555', fontSize: '12px', marginTop: '24px', fontStyle: 'italic' }}>Reading label, catalog number, and pressing details</div>
    </div>
  );
}

// ─── FYT FORMATS — mirrors FYT exactly so photo slots match ───────────────
const FYT_FORMATS = [
  {
    label: '7" Vinyl',
    types: [
      { name: 'Picture Sleeve', photos: [{ label: 'Front Sleeve' }, { label: 'Back Sleeve' }, { label: 'A Side Label' }, { label: 'B Side Label' }] },
      { name: 'Generic Sleeve', photos: [{ label: 'A Side Label' }, { label: 'B Side Label' }] },
      { name: 'Sleeve Only',    photos: [{ label: 'Front Sleeve' }, { label: 'Back Sleeve' }] },
      { name: 'Sealed Item',   photos: [{ label: 'Front' }] },
    ],
  },
  {
    label: '12" Vinyl',
    types: [
      { name: 'Picture Cover',  photos: [{ label: 'Front Cover' }, { label: 'Back Cover' }, { label: 'A Side Label' }, { label: 'B Side Label' }] },
      { name: 'Generic Cover',  photos: [{ label: 'A Side Label' }, { label: 'B Side Label' }] },
      { name: 'Cover Only',     photos: [{ label: 'Front Cover' }, { label: 'Back Cover' }] },
      { name: 'Sealed Item',    photos: [{ label: 'Front' }] },
    ],
  },
  {
    label: 'CD',
    types: [
      { name: 'Picture Case',  photos: [{ label: 'Front Case' }, { label: 'Back Case' }, { label: 'Disc' }] },
      { name: 'Generic Case',  photos: [{ label: 'Disc' }] },
      { name: 'Sealed Item',   photos: [{ label: 'Front' }] },
    ],
  },
  {
    label: 'Cassette',
    types: [
      { name: 'Picture Case',  photos: [{ label: 'Front Case' }, { label: 'Back Case' }] },
      { name: 'Generic Case',  photos: [{ label: 'Tape' }] },
      { name: 'Sealed Item',   photos: [{ label: 'Front' }] },
    ],
  },
  {
    label: '8-Track',
    types: [
      { name: '8-Track',     photos: [{ label: 'Side 1' }, { label: 'Side 2' }] },
      { name: 'Sealed Item', photos: [{ label: 'Front' }] },
    ],
  },
];

function getSlotsFor(format, type) {
  const fmt = FYT_FORMATS.find(f => f.label === format);
  if (!fmt) return [{ label: 'Photo' }];
  const t = fmt.types.find(t => t.name === type) || fmt.types[0];
  return t.photos;
}

// ─── Map identify.js slot labels to admin save-record keys ────────────────
function slotLabelToKey(label, index) {
  const l = String(label || '').toLowerCase();
  if (l.includes('front cover') || l.includes('front case') || l.includes('front sleeve') || l === 'front') return 'front';
  if (l.includes('back cover') || l.includes('back case') || l.includes('back sleeve')) return 'back';
  if (l.includes('a side') || l.includes('side 1') || l.includes('disc front')) return 'a';
  if (l.includes('b side') || l.includes('side 2') || l.includes('disc back')) return 'b';
  if (l.includes('disc') || l.includes('cd')) return 'a';
  if (l.includes('tape')) return 'a';
  return ['front', 'a', 'b', 'back'][index] || 'front';
}

const GENRES = ['Rock', 'Jazz', 'Blues', 'Country', 'Spanish', 'Classical', "Children's", 'Holiday', 'Pop', 'Religious', 'Comedy', 'Soundtracks'];
const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G'];

const EMPTY_FORM = {
  artist: '', title: '', year: '', label: '', cat: '',
  catalog_number: '', country: '', pressing: '',
  genre: 'Rock', condition: 'VG+', price: '', qty: '1', notes: '',
};

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

function parseMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function conditionMultiplier(condition, sealed) {
  const c = String(condition || '').toLowerCase().trim();
  if (sealed) return 2.80;
  if (c === 'm') return 2.50;
  if (c === 'nm') return 1.60;
  if (c === 'vg+' || (c.includes('vg') && c.includes('+'))) return 1.25;
  if (c === 'vg') return 1.0;
  if (c === 'g') return 0.60;
  return 1.0;
}

function isSpanishOrRegional(artist, title, genre, label, catalogCountry) {
  const text = [artist, title, genre, label, catalogCountry || ''].join(' ').toLowerCase();
  const terms = ['tejano', 'conjunto', 'norteno', 'norteño', 'regional mexican', 'spanish', 'mexican', 'freddie', 'latin', 'ranchera', 'cumbia', 'spain', 'espana', 'us-regional'];
  return terms.some(t => text.includes(t));
}

function getProtectedFloor(releaseType, artist, title, genre, label, catalogCountry, condition, sealed) {
  const regional = isSpanishOrRegional(artist, title, genre, label, catalogCountry);
  const c = String(condition || '').toLowerCase().trim();
  if (releaseType === 'VINYL_LP' && regional) {
    if (sealed) return 34.99;
    if (c === 'm' || c === 'nm') return 24.99;
    if (c === 'vg+' || (c.includes('vg') && c.includes('+'))) return 19.99;
    if (c === 'vg') return 17.99;
    return 16.99;
  }
  if (releaseType === 'VINYL_7_SINGLE' && regional) {
    if (sealed) return 14.99;
    if (c === 'm' || c === 'nm') return 9.99;
    if (c === 'vg+' || (c.includes('vg') && c.includes('+'))) return 7.99;
    if (c === 'vg') return 5.99;
    return 4.99;
  }
  return null;
}

function recalculatePrice(pricing, condition, scanResult) {
  if (!pricing) return null;
  const sealed = scanResult?.sealed === true || scanResult?.sealed === 'true';
  const overallRange = pricing.overallMarketRange || pricing.marketRange || pricing.collectionValue;
  const floor = getProtectedFloor(
    pricing?.recordFound?.releaseType || '',
    scanResult?.artist || '', scanResult?.title || '',
    scanResult?.genre || '', scanResult?.label || '',
    pricing?.recordFound?.catalogCountry || '',
    condition, sealed
  );
  if (!overallRange) return floor ? (Math.ceil(floor) - 0.01).toFixed(2) : null;
  const parts = String(overallRange).replace(/\$/g, '').split('-');
  const low = parseMoney(parts[0]);
  const high = parseMoney(parts[1]);
  const medianRaw = pricing?.sourceBreakdown
    ? (() => {
        const prices = (pricing.sourceBreakdown || [])
          .filter(s => s.median && s.matchesUsed > 0)
          .map(s => parseMoney(s.median))
          .filter(Boolean)
          .sort((a, b) => a - b);
        return prices.length ? prices[Math.floor(prices.length / 2)] : null;
      })()
    : null;
  const median = medianRaw || (low && high ? (low + high) / 2 : low || high);
  if (!median) return null;
  const multiplier = conditionMultiplier(condition, sealed);
  let suggested = median * multiplier;
  if (floor && suggested < floor) suggested = floor;
  if (high && suggested > high && !(floor && suggested === floor)) suggested = high;
  return (Math.ceil(suggested) - 0.01).toFixed(2);
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
    const isLabel = l.includes('label') || l.includes('side a') || l.includes('side b') || l.includes('disc');
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

  // ─── Entry flow state ───────────────────────────────────────────────────
  const [entryStage, setEntryStage] = useState('camera1'); // camera1 | identifying | slots
  const [identification, setIdentification] = useState(null);
  const [photoSlots, setPhotoSlots] = useState([]);
  const [capturedPhotos, setCapturedPhotos] = useState({}); // index → { file, label }
  const [identifyError, setIdentifyError] = useState('');
  const [cameraSlotIndex, setCameraSlotIndex] = useState(null);
  // ───────────────────────────────────────────────────────────────────────

  // ─── Review / save state (untouched) ───────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('entry');
  const [scanning, setScanning] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSku, setSavedSku] = useState(null);
  const [nextSku, setNextSku] = useState(null);
  const [error, setError] = useState('');
  const [showAllEbay, setShowAllEbay] = useState(false);
  const [adjustedCondition, setAdjustedCondition] = useState(null);
  // ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setAuthed(true);
    const saved = loadSession();
    if (saved) {
      if (saved.form) setForm(saved.form);
      if (saved.mode) setMode(saved.mode);
      if (saved.pricing) setPricing(saved.pricing);
      if (saved.scanResult) setScanResult(saved.scanResult);
      if (saved.nextSku) setNextSku(saved.nextSku);
      if (saved.adjustedCondition) setAdjustedCondition(saved.adjustedCondition);
      if (saved.identification) setIdentification(saved.identification);
      if (saved.photoSlots) setPhotoSlots(saved.photoSlots);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    saveSession({ form, mode, pricing, scanResult, nextSku, adjustedCondition, identification, photoSlots });
  }, [authed, form, mode, pricing, scanResult, nextSku, adjustedCondition, identification, photoSlots]);

  if (!authed) return <PinLock onUnlock={() => setAuthed(true)} />;
  if (scanning) return <ScanningOverlay />;

  const activeCondition = adjustedCondition || form.condition;
  const recalcPrice = pricing ? recalculatePrice(pricing, activeCondition, scanResult) : null;

  // ─── Full reset ──────────────────────────────────────────────────────────
  function reset() {
    setEntryStage('camera1');
    setIdentification(null);
    setPhotoSlots([]);
    setCapturedPhotos({});
    setIdentifyError('');
    setCameraSlotIndex(null);
    setForm(EMPTY_FORM);
    setMode('entry');
    setPricing(null);
    setScanResult(null);
    setNextSku(null);
    setSavedSku(null);
    setError('');
    setShowAllEbay(false);
    setAdjustedCondition(null);
    clearSession();
  }

  // ─── Stage 1: capture first photo and identify ──────────────────────────
  async function handleStage1Capture(file) {
    setEntryStage('identifying');
    setIdentifyError('');
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(FYT_BASE + '/api/identify', {
        method: 'POST',
        headers: fytHeaders(),
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Identification failed');
      setIdentification(data);
      const slots = getSlotsFor(data.format, data.type);
      setPhotoSlots(slots);
      // First slot is already captured by the identify photo
      setCapturedPhotos({ 0: { file, label: slots[0]?.label || 'Front' } });
      setEntryStage('slots');
    } catch (err) {
      setIdentifyError(err.message || 'Could not identify item — please try again');
      setEntryStage('camera1');
    }
  }

  // ─── Slot camera capture ─────────────────────────────────────────────────
  function handleSlotCapture(file) {
    const label = photoSlots[cameraSlotIndex]?.label || '';
    const updated = { ...capturedPhotos, [cameraSlotIndex]: { file, label } };
    setCapturedPhotos(updated);
    setCameraSlotIndex(null);
    // Check if all slots are done
    const allDone = photoSlots.every((_, i) => updated[i]?.file != null);
    if (allDone) runFullScan(updated);
  }

  // ─── Full scan ───────────────────────────────────────────────────────────
  async function runFullScan(photosMap) {
    setScanning(true);
    setError('');
    try {
      const photosArray = photoSlots.map((slot, i) => ({
        file: photosMap[i]?.file,
        label: slot?.label || '',
      })).filter(p => p.file);

      const compressed = await Promise.all(photosArray.map(p => compressForScan(p.file, p.label)));
      const images = await Promise.all(compressed.map(f => fileToBase64(f)));
      const photoLabels = photosArray.map(p => p.label);
      const isSealed = identification?.type === 'Sealed Item';

      const res = await fetch(FYT_BASE + '/api/scan', {
        method: 'POST',
        headers: fytHeaders(),
        body: JSON.stringify({
          images,
          format: identification?.format || '',
          type: identification?.type || '',
          sleeveType: identification?.type || '',
          sealed: isSealed,
          photoLabels,
          stage1Context: identification,
          source: '4ever-admin',
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Scan failed');

      setScanResult(result);

      const enrichedNotes = [
        result.notes || '',
        result.condition_notes ? 'Condition Notes: ' + result.condition_notes : '',
        result.variant ? 'Variant: ' + result.variant : '',
        result.matrix_runout ? 'Matrix / Runout: ' + result.matrix_runout : '',
        result.description ? 'Description: ' + result.description : '',
      ].filter(Boolean).join('\n\n');

      setForm(f => ({
        ...f,
        artist: result.artist || f.artist,
        title: result.title || f.title,
        year: result.year || f.year,
        label: result.label || f.label,
        catalog_number: result.catalog_number || result.catalogNumber || f.catalog_number,
        country: result.country || f.country,
        pressing: result.pressing || result.format_details || f.pressing,
        genre: result.genre || f.genre,
        condition: result.condition || f.condition,
        notes: enrichedNotes || f.notes,
        cat: identification?.format || '',
      }));

      await fetchNextSku(identification?.format || '');

      const pricingParams = new URLSearchParams({
        artist: result.artist || '', title: result.title || '',
        year: result.year || '', country: result.country || '',
        catalog_number: result.catalog_number || result.catalogNumber || '',
        pressing: result.pressing || result.format_details || identification?.type || '',
        format: identification?.format || '', genre: result.genre || '',
        label: result.label || '', condition: result.condition || '',
        sealed: isSealed ? 'true' : 'false',
        vinyl_color: result.vinyl_color || '',
        matrix_runout: result.matrix_runout || '',
        variant: result.variant || '',
        label_details: result.label_details || '',
        pressing_evidence: result.pressing_evidence || '',
        cover_details: result.cover_details || '',
      });

      fetch(FYT_BASE + '/api/pricing?' + pricingParams.toString(), { headers: { 'x-4ever-admin': process.env.NEXT_PUBLIC_ADMIN_SHARED_SECRET || '' } })
        .then(r => r.json())
        .then(setPricing)
        .catch(() => {});

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
    try {
      const r = await fetch('/api/next-sku?cat=' + encodeURIComponent(cat));
      const d = await r.json();
      setNextSku(d.sku);
    } catch {}
  }

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (e.target.name === 'condition') setAdjustedCondition(e.target.value);
  }

  // ─── Save — UNTOUCHED ────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      const saveForm = { ...form, condition: activeCondition };
      if (recalcPrice && !form.price) saveForm.price = recalcPrice;
      Object.entries(saveForm).forEach(([k, v]) => formData.append(k, v));
      formData.append('discCount', '1');
      formData.append('sleeveType', identification?.type || '');

      // Map captured photos to the keys save-record expects
      photoSlots.forEach((slot, index) => {
        const photo = capturedPhotos[index];
        if (photo?.file) {
          const key = slotLabelToKey(slot.label, index);
          formData.append(key, photo.file);
        }
      });

      const res = await fetch('/api/save-record', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setSavedSku(data.sku || nextSku);
        setMode('success');
        clearSession();
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
  const sectionLabel = {
    fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '3px',
  };

  const demand = pricing ? getDemandLabel(pricing.wantHave) : null;

  // ─── Entry mode — new FYT-style flow ────────────────────────────────────
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

    if (entryStage === 'slots') {
      const nextIndex = photoSlots.findIndex((_, i) => !capturedPhotos[i]?.file);
      return (
        <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
          <style>{`* { box-sizing: border-box; } input:focus, select:focus { outline: none; border-color: #c9a84c !important; }`}</style>

          {cameraSlotIndex !== null && (
            <CameraModal
              label={photoSlots[cameraSlotIndex]}
              selectedFormat={identification?.format || ''}
              onCapture={handleSlotCapture}
              onClose={() => setCameraSlotIndex(null)}
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
            <button onClick={reset} style={{ background: 'transparent', border: 'none', color: '#e8d5b0', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </nav>

          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
            {/* Identified card */}
            {identification && (
              <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Identified</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    { k: 'Format', v: identification.format + (identification.type ? ' — ' + identification.type : '') },
                    { k: 'Artist', v: identification.artist },
                    { k: 'Title', v: identification.title },
                    { k: 'Label', v: identification.label },
                    { k: 'Catalog', v: identification.catalog_number },
                    { k: 'Year', v: identification.year },
                  ].filter(f => f.v).map(({ k, v }) => (
                    <div key={k} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                      <div style={{ fontSize: '10px', color: '#555', width: '52px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>{k}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#e8d5b0' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <button onClick={reset} style={{ marginTop: '12px', background: 'transparent', border: '1px solid #333', color: '#aaa', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  ← Start over
                </button>
              </div>
            )}

            {/* Photo slots */}
            <div style={{ fontSize: '11px', color: '#c9a84c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
              Photos needed · {Object.keys(capturedPhotos).length} of {photoSlots.length} captured
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {photoSlots.map((slot, index) => {
                const isDone = capturedPhotos[index]?.file != null;
                const isActive = index === nextIndex;
                const isPending = !isDone && !isActive;
                const preview = capturedPhotos[index]?.file ? URL.createObjectURL(capturedPhotos[index].file) : null;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!isActive && !isDone}
                    onClick={() => { if (isActive) setCameraSlotIndex(index); }}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: isActive ? 'pointer' : 'default',
                      background: isDone ? '#0c130c' : isActive ? '#c9a84c' : '#111',
                      display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                    }}
                  >
                    {preview ? (
                      <img src={preview} alt={slot.label} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: isDone ? '#1a3a1a' : isActive ? 'rgba(0,0,0,0.15)' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {isDone ? '✓' : isActive ? '📷' : String(index + 1)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: isDone ? '#4ade80' : isActive ? '#0d0d0d' : '#444' }}>
                        {isDone ? '✓ ' : ''}{slot.label}
                      </div>
                      <div style={{ fontSize: '11px', color: isDone ? '#2a6a2a' : isActive ? '#0d0d0d99' : '#333', marginTop: '2px' }}>
                        {isDone ? 'Captured — tap to retake' : isActive ? 'Tap to photograph' : 'Waiting...'}
                      </div>
                    </div>
                    {isActive && <div style={{ fontSize: '18px', marginLeft: 'auto' }}>→</div>}
                  </button>
                );
              })}
            </div>

            {error && (
              <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>
            )}

            {/* Manual skip — in case scan fails */}
            <button onClick={async () => {
              setForm(f => ({ ...f, cat: identification?.format || '' }));
              await fetchNextSku(identification?.format || '');
              setMode('review');
            }} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#555', border: '1px solid #222', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              Skip scanning — enter details manually →
            </button>
          </div>
        </div>
      );
    }
  }

  // ─── REVIEW MODE — COMPLETELY UNTOUCHED FROM ORIGINAL ───────────────────
  if (mode === 'review') {
    return (
      <div style={{ fontFamily: 'Georgia, serif', background: '#0d0d0d', minHeight: '100vh', color: '#e8d5b0' }}>
        <style>{`
          * { box-sizing: border-box; }
          input:focus, select:focus, textarea:focus { outline: none; border-color: #c9a84c !important; }
          .ebay-row:hover { background: #0f1f0f; }
          .cond-btn { transition: all 0.15s; }
          .cond-btn:hover { border-color: #c9a84c !important; }
        `}</style>
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
            <a href="/" style={{ color: '#e8d5b0', fontSize: '13px', textDecoration: 'none', borderRadius: '8px', padding: '8px 16px', border: '1px solid #333', fontFamily: 'Georgia, serif', background: '#1a1a1a' }}>← Store</a>
          </div>
        </nav>

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
          <button style={backBtn} onClick={() => setMode('entry')}>← Back to Photos</button>
          <h2 style={{ fontSize: '20px', color: '#e8d5b0', margin: '0 0 16px' }}>
            {form.artist ? '✓ Identified — Review & Save' : 'Enter Details'}
          </h2>
          {nextSku && (
            <div style={{ background: '#1a1a0a', border: '2px solid #c9a84c', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#e8d5b0', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>📋 Write this SKU on the record label NOW</div>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#c9a84c', letterSpacing: '3px', fontFamily: 'monospace' }}>{nextSku}</div>
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '6px', fontStyle: 'italic' }}>This will be assigned when you save</div>
            </div>
          )}

          {/* Photo thumbnails */}
          {Object.keys(capturedPhotos).length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {Object.values(capturedPhotos).filter(Boolean).map((p, i) => {
                const src = p?.file ? URL.createObjectURL(p.file) : null;
                return src ? <img key={i} src={src} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2a2a2a' }} /> : null;
              })}
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
              {demand && (
                <div style={{ background: demand.bg, border: '1px solid ' + demand.color + '44', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: demand.color, fontWeight: '700', marginBottom: '2px' }}>
                      {demand.label === 'High demand' ? '🔥' : demand.label === 'Moderate demand' ? '📊' : '📉'} {demand.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic' }}>{demand.tip}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>Discogs community</div>
                    <div style={{ fontSize: '11px', color: '#e8d5b0' }}>{pricing.wantHave}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {pricing.discogs && (
                  <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>Discogs</div>
                    <div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.discogs}</div>
                  </div>
                )}
                {pricing.ebay && pricing.ebay.lowest && (
                  <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>eBay Active</div>
                    <div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.ebay.lowest}</div>
                    <div style={{ fontSize: '10px', color: '#bbb' }}>avg ${pricing.ebay.avg || '—'}</div>
                  </div>
                )}
                {pricing.ebaySold && pricing.ebaySold.median && (
                  <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>eBay Sold</div>
                    <div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.ebaySold.median}</div>
                    <div style={{ fontSize: '10px', color: '#bbb' }}>{pricing.ebaySold.count} sales</div>
                  </div>
                )}
                {pricing.popsike && pricing.popsike.median && (
                  <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>Popsike</div>
                    <div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.popsike.median}</div>
                    <div style={{ fontSize: '10px', color: '#bbb' }}>{pricing.popsike.count} auctions</div>
                  </div>
                )}
                {pricing.musicStack && pricing.musicStack.median && (
                  <div style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '6px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '2px' }}>MusicStack</div>
                    <div style={{ fontSize: '15px', color: '#c9a84c', fontWeight: '700' }}>${pricing.musicStack.median}</div>
                  </div>
                )}
                {pricing.fourEverMemories && pricing.fourEverMemories.median && (
                  <div style={{ textAlign: 'center', background: '#0f1a0f', borderRadius: '6px', padding: '8px 4px', border: '1px solid #1a3a1a' }}>
                    <div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '2px' }}>4EM Sales</div>
                    <div style={{ fontSize: '15px', color: '#4ade80', fontWeight: '700' }}>${pricing.fourEverMemories.median}</div>
                    <div style={{ fontSize: '10px', color: '#bbb' }}>{pricing.fourEverMemories.count} sold</div>
                  </div>
                )}
                {(recalcPrice || pricing.recommended) && (
                  <div style={{ textAlign: 'center', background: '#0f2a0f', borderRadius: '6px', padding: '8px 4px', border: '1px solid #2a4a2a' }}>
                    <div style={{ fontSize: '10px', color: '#4ade80', marginBottom: '2px' }}>Suggested</div>
                    <div style={{ fontSize: '16px', color: '#4ade80', fontWeight: '700' }}>
                      ${recalcPrice || (typeof pricing.recommended === 'string' ? pricing.recommended.replace('$', '') : pricing.recommended)}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ borderTop: '1px solid #1a3a1a', paddingTop: '12px', marginBottom: '4px' }}>
                <div style={{ fontSize: '10px', color: '#4ade80', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Adjust Condition — Price Updates Instantly</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {CONDITIONS.map(c => (
                    <button key={c} className="cond-btn"
                      onClick={() => { setAdjustedCondition(c); setForm(f => ({ ...f, condition: c })); }}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid ' + (activeCondition === c ? '#c9a84c' : '#2a2a2a'), background: activeCondition === c ? '#1a1a0a' : '#0a0a0a', color: activeCondition === c ? '#c9a84c' : '#e8d5b0', fontWeight: activeCondition === c ? '700' : '400', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                      {c}
                    </button>
                  ))}
                </div>
                {adjustedCondition && adjustedCondition !== (scanResult?.condition || 'VG+') && (
                  <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '6px', fontStyle: 'italic' }}>✓ Price updated for {adjustedCondition}</div>
                )}
              </div>
              {pricing.ebay && pricing.ebay.topListings && pricing.ebay.topListings.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#3a5a3a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    eBay Active listings ({pricing.ebay.count} total)
                  </div>
                  <div style={{ maxHeight: showAllEbay ? '400px' : '120px', overflowY: showAllEbay ? 'auto' : 'hidden', borderRadius: '6px', transition: 'max-height 0.3s' }}>
                    {pricing.ebay.topListings.map((item, i) => (
                      <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="ebay-row"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 6px', borderBottom: '1px solid #1a2a1a', textDecoration: 'none', borderRadius: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#ddd', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                        <span style={{ fontSize: '11px', color: '#c9a84c', whiteSpace: 'nowrap', flexShrink: 0 }}>${item.price} · {item.condition}</span>
                      </a>
                    ))}
                  </div>
                  {pricing.ebay.topListings.length >= 3 && (
                    <button onClick={() => setShowAllEbay(!showAllEbay)}
                      style={{ width: '100%', padding: '6px', background: 'transparent', color: '#3a6a3a', border: '1px solid #1a3a1a', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', marginTop: '6px' }}>
                      {showAllEbay ? '▲ Show less' : '▼ Show all ' + pricing.ebay.count + ' listings'}
                    </button>
                  )}
                </div>
              )}
              {pricing.ebaySold && pricing.ebaySold.topListings && pricing.ebaySold.topListings.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#3a5a3a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    eBay Sold ({pricing.ebaySold.count} transactions)
                  </div>
                  {pricing.ebaySold.topListings.slice(0, 4).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 6px', borderBottom: '1px solid #1a2a1a', borderRadius: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#ddd', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                      <span style={{ fontSize: '11px', color: '#4ade80', whiteSpace: 'nowrap', flexShrink: 0 }}>${item.price} · {item.condition}</span>
                    </div>
                  ))}
                </div>
              )}
              {pricing.notes && (
                <div style={{ fontSize: '11px', color: '#bbb', fontStyle: 'italic', marginBottom: '8px' }}>{pricing.notes}</div>
              )}
              {!pricing.recommended && !recalcPrice && (
                <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '8px', fontStyle: 'italic' }}>⚠️ Could not find pricing — please enter manually</div>
              )}
              {(recalcPrice || pricing.recommended) && (
                <button onClick={() => setForm(f => ({ ...f, price: recalcPrice || (typeof pricing.recommended === 'string' ? pricing.recommended.replace('$', '') : pricing.recommended) }))}
                  style={{ width: '100%', padding: '8px', background: '#1a3a1a', color: '#4ade80', border: '1px solid #2a4a2a', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                  {'Use $' + (recalcPrice || (typeof pricing.recommended === 'string' ? pricing.recommended.replace('$', '') : pricing.recommended)) + ' →'}
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={sectionLabel}>Artist *</label>
              <input name="artist" value={form.artist} onChange={handleFormChange} placeholder="Artist name" style={inp} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={sectionLabel}>Title *</label>
              <input name="title" value={form.title} onChange={handleFormChange} placeholder="Album or song title" style={inp} />
            </div>
            <div>
              <label style={sectionLabel}>Year</label>
              <input name="year" value={form.year} onChange={handleFormChange} placeholder="1975" style={inp} />
            </div>
            <div>
              <label style={sectionLabel}>Label</label>
              <input name="label" value={form.label} onChange={handleFormChange} placeholder="Record label" style={inp} />
            </div>
            <div>
              <label style={sectionLabel}>Catalog number</label>
              <input name="catalog_number" value={form.catalog_number || ''} onChange={handleFormChange} placeholder="e.g. FR-801" style={inp} />
            </div>
            <div>
              <label style={sectionLabel}>Country</label>
              <input name="country" value={form.country || ''} onChange={handleFormChange} placeholder="e.g. USA" style={inp} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={sectionLabel}>Pressing</label>
              <input name="pressing" value={form.pressing || ''} onChange={handleFormChange} placeholder="e.g. Original, Reissue, Promo" style={inp} />
            </div>
            <div>
              <label style={sectionLabel}>Genre</label>
              <select name="genre" value={form.genre} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={sectionLabel}>Condition</label>
              <select name="condition" value={form.condition} onChange={handleFormChange} style={{ ...inp, marginBottom: 0 }}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={sectionLabel}>Price ($) *</label>
              <input name="price" value={form.price} onChange={handleFormChange} placeholder="0.00" type="number" style={{ ...inp, marginBottom: 0 }} />
            </div>
            <div>
              <label style={sectionLabel}>Qty</label>
              <input name="qty" value={form.qty} onChange={handleFormChange} placeholder="1" type="number" style={{ ...inp, marginBottom: 0 }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={sectionLabel}>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleFormChange} placeholder="B-side, promo markings, sleeve condition, etc." rows={2}
                style={{ ...inp, resize: 'none', marginBottom: 0 }} />
            </div>
          </div>

          {error && <div style={{ color: '#f87171', fontSize: '13px', margin: '12px 0', padding: '10px', background: '#2a1a1a', borderRadius: '8px' }}>{error}</div>}

          <button onClick={handleSave} disabled={!form.artist || !form.title || !form.price || saving}
            style={{ width: '100%', padding: '16px', background: (!form.artist || !form.title || !form.price) ? '#1a1a1a' : '#c9a84c', color: (!form.artist || !form.title || !form.price) ? '#444' : '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginTop: '16px' }}>
            {saving ? 'Saving...' : '💾 Save to Store →'}
          </button>
          <button onClick={reset}
            style={{ width: '100%', padding: '10px', background: 'transparent', color: '#bbb', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginTop: '6px' }}>
            Start over
          </button>
        </div>
      </div>
    );
  }

  // ─── SUCCESS MODE — COMPLETELY UNTOUCHED FROM ORIGINAL ──────────────────
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
          <button onClick={reset}
            style={{ width: '100%', padding: '16px', background: '#c9a84c', color: '#0d0d0d', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', marginBottom: '12px' }}>
            ➕ Add Another Record
          </button>
          <a href="/inventory" style={{ display: 'block', color: '#c9a84c', fontSize: '13px', textDecoration: 'none', fontStyle: 'italic', marginBottom: '8px' }}>📋 View Inventory</a>
          <a href="/" style={{ display: 'block', color: '#555', fontSize: '12px', textDecoration: 'none', fontStyle: 'italic' }}>← Back to Store</a>
        </div>
      </div>
    );
  }

  return null;
}
