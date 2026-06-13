import { useState, useRef, useEffect } from 'react';

// ─── Guide settings — mirrors FYT GuideControls exactly ───────────────────────
const GUIDE_SETTINGS = {
  'square': {
    vw: 82, aspect: 1,
    instruction: 'Hold item 18–20 inches away and fill the guide completely.',
  },
  'vinyl-circle': {
    outerVW: 82, innerRatio: 0.363,
    instruction: 'Hold record 18–20 inches away. Align the label inside the inner circle.',
  },
  '7-square': {
    vw: 82, aspect: 1,
    instruction: 'Hold item 12 inches away and fill the guide completely.',
  },
  '7-circle': {
    outerVW: 82, innerRatio: 0.58,
    instruction: 'Hold record 12 inches away. Align the label inside the inner circle.',
  },
  'cd-circle': {
    outerVW: 62,
    instruction: 'Hold disc 8–10 inches away and fill the guide completely.',
  },
  'rectangle': {
    vw: 62, aspect: 4.96 / 5.59,
    instruction: 'Hold case 8–10 inches away and fill the guide completely.',
  },
  'cassette-rect': {
    vw: 62, aspect: 2.75 / 4.25,
    instruction: 'Hold cassette 8–10 inches away and fill the guide completely.',
  },
  '8track-rect': {
    vw: 62, aspect: 4.0 / 5.25,
    instruction: 'Hold 8-track 8–10 inches away and fill the guide completely.',
  },
};

const DEFAULT_GUIDE_SIZE = 100;
const GUIDE_SIZE_MIN = 80;
const GUIDE_SIZE_MAX = 115;

function clampGuideSize(v) {
  return Math.min(GUIDE_SIZE_MAX, Math.max(GUIDE_SIZE_MIN, v));
}

function getSettings(frame, is7inch) {
  if (frame === 'square' && is7inch) return GUIDE_SETTINGS['7-square'];
  if (frame === 'vinyl-circle' && is7inch) return GUIDE_SETTINGS['7-circle'];
  return GUIDE_SETTINGS[frame] || GUIDE_SETTINGS['square'];
}

function getCropFromGuide(video, guide) {
  const videoRect = video.getBoundingClientRect();
  const guideRect = guide.getBoundingClientRect();
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  const boxW = videoRect.width;
  const boxH = videoRect.height;
  const coverScale = Math.max(boxW / videoW, boxH / videoH);
  const renderedW = videoW * coverScale;
  const renderedH = videoH * coverScale;
  const offsetX = (boxW - renderedW) / 2;
  const offsetY = (boxH - renderedH) / 2;
  const guideX = guideRect.left - videoRect.left;
  const guideY = guideRect.top - videoRect.top;
  let cropX = (guideX - offsetX) / coverScale;
  let cropY = (guideY - offsetY) / coverScale;
  let cropW = guideRect.width / coverScale;
  let cropH = guideRect.height / coverScale;
  cropX = Math.max(0, cropX);
  cropY = Math.max(0, cropY);
  cropW = Math.min(videoW - cropX, cropW);
  cropH = Math.min(videoH - cropY, cropH);
  return { cropX, cropY, cropW, cropH };
}

// ─── 4 Ever brand colors ───────────────────────────────────────────────────────
const GOLD = '#c9a84c';
const GOLD_GLOW = 'rgba(201,168,76,0.7)';
const GOLD_DIM = 'rgba(201,168,76,0.5)';
const OVERLAY = 'rgba(0,0,0,0.28)';

export default function CameraModal({ onCapture, onClose, label, selectedFormat }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const guideRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState('');
  const [guideSize, setGuideSize] = useState(DEFAULT_GUIDE_SIZE);

  const slotLabel = typeof label === 'string' ? label : label?.label || '';
  const frame = typeof label === 'object' ? label?.frame || 'square' : 'square';
  const is7inch = String(selectedFormat || '').includes('7');
  const isCircle = frame === 'vinyl-circle' || frame === 'cd-circle';
  const isDual = frame === 'vinyl-circle';
  const settings = getSettings(frame, is7inch);

  // Guide size multiplier — same as FYT GuideControls
  const multiplier = guideSize / 100;
  const outerVW = Math.round((settings.outerVW || settings.vw || 82) * multiplier);
  const maxSize = 'calc(100vh - 260px)';
  const guideWidth = `min(${outerVW}vw, ${maxSize})`;
  const guideHeight = isCircle
    ? guideWidth
    : `min(${Math.round(outerVW * (settings.aspect || 1))}vw, calc((100vh - 260px) * ${(settings.aspect || 1).toFixed(3)}))`;

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 30 },
            resizeMode: 'none',
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
        const track = stream.getVideoTracks()[0];
        if (track?.getCapabilities && track?.applyConstraints) {
          const capabilities = track.getCapabilities();
          const advanced = [];
          if (capabilities.focusMode?.includes('continuous')) advanced.push({ focusMode: 'continuous' });
          if (capabilities.exposureMode?.includes('continuous')) advanced.push({ exposureMode: 'continuous' });
          if (capabilities.whiteBalanceMode?.includes('continuous')) advanced.push({ whiteBalanceMode: 'continuous' });
          if (advanced.length) { try { await track.applyConstraints({ advanced }); } catch {} }
        }
      } catch {
        setCamError('Camera access denied. Please allow camera access in your browser settings.');
      }
    }
    startCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  function stopCamera() {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const guide = guideRef.current;
    if (!video || !canvas || !guide) return;
    const { cropX, cropY, cropW, cropH } = getCropFromGuide(video, guide);
    const MAX_PX = 4000;
    let finalW = cropW;
    let finalH = cropH;
    if (finalW > MAX_PX || finalH > MAX_PX) {
      const scale = Math.min(MAX_PX / finalW, MAX_PX / finalH);
      finalW = Math.round(finalW * scale);
      finalH = Math.round(finalH * scale);
    }
    canvas.width = finalW;
    canvas.height = finalH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, finalW, finalH);
    if (isCircle) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(finalW / 2, finalH / 2, Math.min(finalW, finalH) / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, finalW, finalH);
    if (isCircle) ctx.restore();
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'scan-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      onCapture(file);
      stopCamera();
    }, 'image/jpeg', 0.92);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#0a0a0a', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="28" height="28" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
            <circle cx="20" cy="20" r="8" fill={GOLD} />
            <circle cx="20" cy="20" r="3" fill="#0a0a0a" />
          </svg>
          <span style={{ color: GOLD, fontSize: '15px', fontFamily: 'Georgia, serif', fontWeight: '900', letterSpacing: '1px' }}>
            {slotLabel}
          </span>
        </div>
        <button onClick={() => { stopCamera(); onClose(); }}
          style={{ background: 'none', border: 'none', color: '#e8d5b0', fontSize: '30px', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* Camera viewport */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {camError ? (
          <div style={{ color: '#f87171', textAlign: 'center', padding: '40px 20px', fontFamily: 'Georgia, serif', fontSize: '15px' }}>{camError}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Guide overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {isCircle ? (
            <div ref={guideRef} style={{
              position: 'relative',
              width: guideWidth,
              height: guideHeight,
              borderRadius: '50%',
              border: `5px solid ${GOLD}`,
              boxShadow: `0 0 0 9999px ${OVERLAY}, 0 0 20px ${GOLD_GLOW}`,
            }}>
              {isDual && (
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${(settings.innerRatio || 0.363) * 100}%`,
                  height: `${(settings.innerRatio || 0.363) * 100}%`,
                  borderRadius: '50%',
                  border: `3px solid ${GOLD_DIM}`,
                  boxShadow: `0 0 10px ${GOLD_DIM}`,
                }} />
              )}
            </div>
          ) : (
            <div ref={guideRef} style={{
              width: guideWidth,
              height: guideHeight,
              border: `5px solid ${GOLD}`,
              boxShadow: `0 0 0 9999px ${OVERLAY}, 0 0 16px ${GOLD_GLOW}`,
            }} />
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Controls */}
      {ready && (
        <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#0a0a0a', borderTop: '1px solid #2a2a2a' }}>

          {/* Instruction */}
          <div style={{ color: GOLD, fontWeight: '700', textAlign: 'center', lineHeight: 1.4, fontSize: '13px', fontFamily: 'Georgia, serif' }}>
            {settings.instruction}
          </div>

          {/* Guide size slider — fine-tune framing */}
          <div style={{ width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#888', fontFamily: 'Georgia, serif', width: '28px', textAlign: 'right' }}>–</span>
            <input
              type="range"
              min={GUIDE_SIZE_MIN}
              max={GUIDE_SIZE_MAX}
              value={guideSize}
              onChange={e => setGuideSize(clampGuideSize(Number(e.target.value)))}
              style={{ flex: 1, accentColor: GOLD, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', color: '#888', fontFamily: 'Georgia, serif', width: '28px' }}>+</span>
          </div>

          {/* Capture button */}
          <button onClick={capture}
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: '#1a1a0a',
              border: `4px solid ${GOLD}`,
              boxShadow: `0 0 16px ${GOLD_GLOW}`,
              cursor: 'pointer', fontSize: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            📷
          </button>
        </div>
      )}
    </div>
  );
}
