import { useEffect, useRef, useState } from 'react';

// ─── CameraHelpers (inlined from FYT) ─────────────────────────────────────────

async function startCameraStream(videoRef, streamRef, setReady, setCamError) {
  try {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 30 },
          zoom: { ideal: 0.5 },
        },
        audio: false,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (typeof setReady === 'function') setReady(true);
    }
    const track = stream.getVideoTracks()[0];
    if (track?.getCapabilities && track?.applyConstraints) {
      const capabilities = track.getCapabilities();
      const advanced = [];
      if (capabilities.zoom) {
        try { await track.applyConstraints({ advanced: [{ zoom: capabilities.zoom.min }] }); } catch {}
      }
      if (capabilities.focusMode?.includes('continuous')) advanced.push({ focusMode: 'continuous' });
      if (capabilities.exposureMode?.includes('continuous')) advanced.push({ exposureMode: 'continuous' });
      if (capabilities.whiteBalanceMode?.includes('continuous')) advanced.push({ whiteBalanceMode: 'continuous' });
      if (advanced.length) { try { await track.applyConstraints({ advanced }); } catch {} }
    }
  } catch {
    setCamError('Camera access denied. Please allow camera access in your browser settings.');
  }
}

function stopCameraStream(streamRef, videoRef) {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => { try { track.stop(); } catch {} });
    streamRef.current = null;
  }
  if (videoRef?.current) {
    try { videoRef.current.pause(); videoRef.current.srcObject = null; } catch {}
  }
}

// ─── CropHelpers (inlined from FYT) ───────────────────────────────────────────

// FIX (leniency request — 4 Ever admin, this session): the guide overlay
// was previously a hard clip — the captured photo contained ONLY what was
// exactly inside the drawn guide box/circle, with zero tolerance. A user
// whose item was even slightly outside the guide got a photo with part of
// the item cut off, which then read as a failure downstream — effectively
// "not letting them take the photo" even though the shutter itself always
// fired. The guide is meant to be an aim-point, not a strict boundary.
//
// Fix: capture a generously larger region than what's visually drawn,
// centered on the same point as the guide. CAPTURE_MARGIN controls how much
// slack is allowed — 1.35 means the real captured width/height are 35%
// larger than the guide box in each dimension (roughly 17.5% of overflow
// tolerated per side) before anything gets cut off. The on-screen guide
// itself is unchanged — same size, same aim target — only the actual
// captured/cropped region is more forgiving.
const CAPTURE_MARGIN = 1.35;

function getCropFromGuide(video, guide, marginMultiplier = CAPTURE_MARGIN) {
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

  // Guide's own exact bounds, in video pixel space (the old, strict crop).
  const guideCropX = (guideX - offsetX) / coverScale;
  const guideCropY = (guideY - offsetY) / coverScale;
  const guideCropW = guideRect.width / coverScale;
  const guideCropH = guideRect.height / coverScale;

  // Expand around the same center point rather than the same top-left, so
  // the extra margin is distributed evenly on all sides.
  const centerX = guideCropX + guideCropW / 2;
  const centerY = guideCropY + guideCropH / 2;
  const expandedW = guideCropW * marginMultiplier;
  const expandedH = guideCropH * marginMultiplier;

  let cropX = centerX - expandedW / 2;
  let cropY = centerY - expandedH / 2;
  let cropW = expandedW;
  let cropH = expandedH;

  cropX = Math.max(0, cropX);
  cropY = Math.max(0, cropY);
  cropW = Math.min(videoW - cropX, cropW);
  cropH = Math.min(videoH - cropY, cropH);
  return { cropX, cropY, cropW, cropH };
}

// ─── GuideControls (inlined from FYT) ─────────────────────────────────────────
// Real-world dimensions in inches:
// 12" LP jacket = 12.5" x 12.5" — at 12-14" fills ~82% of phone screen
// 7" vinyl disc = 7.0" diameter — at 10-12" fills ~82% of phone screen
// CD jewel case = 5.59" x 4.96" — at 8-10" fills ~62% of phone screen
// Cassette = 4.25" x 2.75" — at 6-8" fills ~88% of phone screen (landscape rect)
// 8-Track = 5.25" x 4.0" — at 8-10" fills ~82% of phone screen

const GUIDE_SETTINGS = {
  'square': {
    vw: 82, aspect: 1,
    instruction: 'Hold item 12–14 inches away and fill the guide completely.',
  },
  'vinyl-circle': {
    outerVW: 82, innerRatio: 0.363,
    instruction: 'Hold record 12–14 inches away. Align the label inside the inner circle.',
  },
  '7-square': {
    vw: 82, aspect: 1,
    instruction: 'Hold item 10–12 inches away and fill the guide completely.',
  },
  '7-circle': {
    outerVW: 82, innerRatio: 0.58,
    instruction: 'Hold record 10–12 inches away. Align the label inside the inner circle.',
  },
  'cd-circle': {
    outerVW: 72,
    instruction: 'Hold disc 8–10 inches away and fill the guide completely.',
  },
  'rectangle': {
    vw: 72, aspect: 4.96 / 5.59,
    instruction: 'Hold case 8–10 inches away and fill the guide completely.',
  },
  'cassette-rect': {
    vw: 88, aspect: 2.75 / 4.25,
    instruction: 'Hold cassette 6–8 inches away and fill the guide completely.',
  },
  '8track-rect': {
    vw: 82, aspect: 4.0 / 5.25,
    instruction: 'Hold 8-track 8–10 inches away and fill the guide completely.',
  },
};

const DEFAULT_GUIDE_SIZE = 100;
const GUIDE_SIZE_MIN = 80;
const GUIDE_SIZE_MAX = 115;

function clampGuideSize(size) {
  return Math.max(GUIDE_SIZE_MIN, Math.min(GUIDE_SIZE_MAX, size));
}

function getSettings(frame, is7inch) {
  if (frame === 'square' && is7inch) return GUIDE_SETTINGS['7-square'];
  if (frame === 'vinyl-circle' && is7inch) return GUIDE_SETTINGS['7-circle'];
  return GUIDE_SETTINGS[frame] || GUIDE_SETTINGS['square'];
}

function isDualCircle(frame) {
  return frame === 'vinyl-circle';
}

// ─── 4 Ever gold brand colors ──────────────────────────────────────────────────
const GOLD = '#c9a84c';

// ─── CameraModal — identical behavior to FYT, 4 Ever gold colors ──────────────

export default function CameraModal({ label, selectedFormat, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const guideRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [guideSize, setGuideSize] = useState(DEFAULT_GUIDE_SIZE);

  const slotLabel = typeof label === 'string' ? label : label?.label || '';
  const frame = typeof label === 'object' ? label?.frame || 'square' : 'square';
  const is7inch = String(selectedFormat || '').includes('7');
  const isCircle = frame === 'vinyl-circle' || frame === 'cd-circle';
  const isDual = isDualCircle(frame);
  const settings = getSettings(frame, is7inch);

  const multiplier = guideSize / 100;
  const outerVW = Math.round((settings.outerVW || settings.vw || 82) * multiplier);
  const maxSize = 'calc(100vh - 260px)';
  const guideWidth = `min(${outerVW}vw, ${maxSize})`;
  const guideHeight = isCircle
    ? guideWidth
    : `min(${Math.round(outerVW * (settings.aspect || 1))}vw, calc((100vh - 260px) * ${(settings.aspect || 1).toFixed(3)}))`;

  useEffect(() => {
    startCameraStream(videoRef, streamRef, () => {}, setError);

    // FIX (July 7 session): mobile browsers commonly stop or mute the
    // camera track when the tab loses visibility (backgrounding to answer
    // a call, check another app, switch tabs). There was previously no
    // code path to detect this and reacquire the camera on return — the
    // user would come back to a frozen/dead video mid photo-entry with no
    // indication anything was wrong. Listen for the tab becoming visible
    // again and restart the stream if the current track is no longer live.
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      const track = streamRef.current?.getVideoTracks?.()[0];
      if (!track || track.readyState !== 'live') {
        startCameraStream(videoRef, streamRef, () => {}, setError);
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCameraStream(streamRef, videoRef);
    };
  }, []);

  function handleClose() {
    stopCameraStream(streamRef, videoRef);
    onClose();
  }

  function resizeCanvasForUpload(sourceCanvas) {
    const maxSize = 4000;
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    let finalW = sourceCanvas.width;
    let finalH = sourceCanvas.height;
    if (finalW > maxSize || finalH > maxSize) {
      const scale = Math.min(maxSize / finalW, maxSize / finalH);
      finalW = Math.round(finalW * scale);
      finalH = Math.round(finalH * scale);
    }
    finalCanvas.width = finalW;
    finalCanvas.height = finalH;
    finalCtx.fillStyle = '#000';
    finalCtx.fillRect(0, 0, finalW, finalH);
    finalCtx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, finalW, finalH);
    return finalCanvas;
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const guide = guideRef.current;
    if (!video || !canvas || !guide) return;
    const { cropX, cropY, cropW, cropH } = getCropFromGuide(video, guide);
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cropW, cropH);
    if (isCircle) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cropW / 2, cropH / 2, Math.min(cropW, cropH) / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    if (isCircle) ctx.restore();
    const uploadCanvas = resizeCanvasForUpload(canvas);
    uploadCanvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' });
      onCapture(file);
      stopCameraStream(streamRef, videoRef);
    }, 'image/jpeg', 0.86);
  }

  // ─── Render — mirrors CameraView layout exactly, gold colors ────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d0d0d', flex: '0 0 auto', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ color: GOLD, fontWeight: '900', fontSize: '18px', fontFamily: 'Georgia, serif' }}>
          {slotLabel}
        </div>
        <button type="button" onClick={handleClose} aria-label="Close camera"
          style={{ background: 'transparent', border: 'none', color: '#e8d5b0', fontSize: '34px', lineHeight: 1, cursor: 'pointer', padding: '4px 8px', zIndex: 10000 }}>
          ×
        </button>
      </div>

      {/* Viewfinder */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {error ? (
          <div style={{ color: '#f87171', fontWeight: '900', padding: '40px 20px', textAlign: 'center', fontFamily: 'Georgia, serif' }}>{error}</div>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Guide overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {isCircle ? (
            <div ref={guideRef} style={{
              position: 'relative',
              width: guideWidth,
              height: guideHeight,
              borderRadius: '50%',
              border: `3px solid ${GOLD}`,
              boxSizing: 'border-box',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            }}>
              {isDual && (
                <div style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${Math.round(settings.innerRatio * 100)}%`,
                  height: `${Math.round(settings.innerRatio * 100)}%`,
                  borderRadius: '50%',
                  border: `3px solid rgba(201,168,76,0.7)`,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          ) : (
            <div ref={guideRef} style={{
              width: guideWidth,
              height: guideHeight,
              border: `3px solid ${GOLD}`,
              boxSizing: 'border-box',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            }} />
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Controls */}
      <div style={{ background: '#0d0d0d', padding: '14px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', flex: '0 0 auto' }}>
        <div style={{ color: GOLD, fontWeight: '900', marginBottom: '6px', lineHeight: 1.3, fontFamily: 'Georgia, serif', fontSize: '13px' }}>
          {settings.instruction}
        </div>

        <div style={{ color: '#e8d5b0', fontWeight: '800', fontSize: '13px', marginBottom: '6px', fontFamily: 'Georgia, serif' }}>
          Guide Size
        </div>

        <input type="range"
          min={GUIDE_SIZE_MIN}
          max={GUIDE_SIZE_MAX}
          value={guideSize}
          onChange={e => setGuideSize(clampGuideSize(Number(e.target.value)))}
          style={{ width: '88%', maxWidth: '360px', marginBottom: '12px', accentColor: GOLD }}
        />

        <br />

        <button type="button" onClick={capture}
          style={{ width: '82px', height: '82px', borderRadius: '50%', border: `5px solid ${GOLD}`, background: '#1a1a0a', fontSize: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          📷
        </button>
      </div>

    </div>
  );
}
