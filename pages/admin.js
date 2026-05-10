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
    setPrev
