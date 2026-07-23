import { useEffect, useRef, useState } from 'react';
import {
  GUIDE_SETTINGS,
  getSettings,
  isDualCircle,
  isCircleFrame,
  DEFAULT_GUIDE_SIZE,
  GUIDE_SIZE_MIN,
  GUIDE_SIZE_MAX,
  clampGuideSize,
} from '../shared/captureGuide';

// ─── CameraHelpers (inlined from FYT) ─────────────────────────────────────────

export async function startCameraStream(videoRef, streamRef, setReady, setCamError) {
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

export function stopCameraStream(streamRef, videoRef) {
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

// ─── GuideControls ─────────────────────────────────────────────────────────
// FIX (July 22 session): this used to be a local copy (originally inlined
// from FYT, then diverged — this file had picture-disc-circle before FYT
// did, until that gap was closed too). Now imported from ../shared/, which
// is synced fresh from findyourtunes at build time — see
// scripts/sync-shared-from-fyt.js. Both apps now genuinely share one copy.

// ─── 4 Ever gold brand colors ──────────────────────────────────────────────────
const GOLD = '#c9a84c';

// ─── CameraModal — identical behavior to FYT, 4 Ever gold colors ──────────────

export default function CameraModal({ label, selectedFormat, onClose, onCapture, slotIndex, totalSlots }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const guideRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [guideSize, setGuideSize] = useState(DEFAULT_GUIDE_SIZE);

  const slotLabel = typeof label === 'string' ? label : label?.label || '';
  const frame = typeof label === 'object' ? label?.frame || 'square' : 'square';
  const is7inch = String(selectedFormat || '').includes('7');
  const isCircle = isCircleFrame(frame);
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
    // ARCHITECTURE CHANGE (July 22 session, round 3 — replacing the round-2
    // hidden-video workaround entirely): the actual source of the camera
    // delay was the app's flow, not just the code — every slot photo used
    // to close the camera back to a slot list, requiring the camera to be
    // reopened (and the hardware reacquired) for every single shot. Real
    // camera apps never do this: they keep one viewfinder session open and
    // just grab a frame per shutter press. admin.js now keeps this same
    // CameraModal instance mounted for the entire slot-photo sequence —
    // only the `label`/`selectedFormat` props change between shots to swap
    // the guide overlay, the component itself does not unmount and remount.
    // That means one getUserMedia() call covers the whole sequence, and the
    // persistentStreamRef/hidden-video approach from round 2 is no longer
    // needed — simpler and more correct.
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
    // FIX (July 22 session — delay reintroduced after removing the camera
    // reacquisition cost): getCropFromGuide() already clamps cropW/cropH to
    // at most the video's own resolution (3840x2160 requested ideal), and
    // maxSize here is 4000 — 3840 < 4000 always, so the scale-down branch
    // below could never actually fire in practice. Every single capture was
    // still paying for a full second canvas allocation plus a complete
    // redundant pixel copy of up to ~3840x2160 pixels before encoding, for
    // zero benefit. That cost was always there; it just wasn't the
    // noticeable bottleneck while camera reacquisition was a bigger one
    // sitting in front of it. Skip the copy entirely unless a downscale is
    // actually needed.
    const maxSize = 4000;
    if (sourceCanvas.width <= maxSize && sourceCanvas.height <= maxSize) {
      return sourceCanvas;
    }
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    const scale = Math.min(maxSize / sourceCanvas.width, maxSize / sourceCanvas.height);
    const finalW = Math.round(sourceCanvas.width * scale);
    const finalH = Math.round(sourceCanvas.height * scale);
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
      // FIX (July 22 session, round 3): previously stopped the camera
      // stream right here after every single shot, which made sense when
      // each slot photo got its own short-lived CameraModal mount. Now the
      // same modal instance stays open across the entire slot sequence
      // (admin.js just updates the label/guide via props between shots),
      // so the stream must keep running here — it's only actually torn
      // down in the effect cleanup when the modal really unmounts (all
      // slots done, or the user backs out).
    }, 'image/jpeg', 0.86);
  }

  // ─── Render — mirrors CameraView layout exactly, gold colors ────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '10px 14px', background: '#0d0d0d', flex: '0 0 auto', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* FIX (July 22 session — real user errors from not knowing
                which photo they were on): the header previously showed only
                the slot label (e.g. "Back Cover") with no indication of
                position in the sequence. Now shows an explicit "Photo X of Y"
                count above the label whenever the caller provides slotIndex/
                totalSlots (the checkout single-shot scan doesn't, and simply
                omits this row). */}
            {Number.isInteger(slotIndex) && totalSlots > 0 && (
              <div style={{ color: '#e8d5b0', fontSize: '11px', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Photo {slotIndex + 1} of {totalSlots}
              </div>
            )}
            <div style={{ color: GOLD, fontWeight: '900', fontSize: '18px', fontFamily: 'Georgia, serif' }}>
              {slotLabel}
            </div>
          </div>
          <button type="button" onClick={handleClose} aria-label="Close camera"
            style={{ background: 'transparent', border: 'none', color: '#e8d5b0', fontSize: '34px', lineHeight: 1, cursor: 'pointer', padding: '4px 8px', zIndex: 10000 }}>
            ×
          </button>
        </div>
        {Number.isInteger(slotIndex) && totalSlots > 0 && (
          <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
            {Array.from({ length: totalSlots }).map((_, i) => (
              <div key={i} style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: i < slotIndex ? '#4ade80' : i === slotIndex ? GOLD : '#333',
              }} />
            ))}
          </div>
        )}
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
