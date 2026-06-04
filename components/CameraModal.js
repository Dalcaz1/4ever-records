import { useState, useRef, useEffect } from 'react';

// Real-world dimensions — matches FYT GuideControls exactly
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

export default function CameraModal({ onCapture, onClose, label, selectedFormat }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const guideRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState('');

  const slotLabel = typeof label === 'string' ? label : label?.label || '';
  const frame = typeof label === 'object' ? label?.frame || 'square' : 'square';
  const is7inch = String(selectedFormat || '').includes('7');
  const isCircle = frame === 'vinyl-circle' || frame === 'cd-circle';
  const isDual = frame === 'vinyl-circle';
  const settings = getSettings(frame, is7inch);

  const outerVW = settings.outerVW || settings.vw || 82;
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
      <div style={{ background: '#0a0a0a', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#ffff00', fontSize: '18px', fontFamily: 'Georgia, serif', fontWeight: '900' }}>📷 {slotLabel}</span>
        <button onClick={() => { stopCamera(); onClose(); }}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {camError ? (
          <div style={{ color: '#f87171', textAlign: 'center', padding: '40px 20px', fontFamily: 'Georgia, serif' }}>{camError}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {isCircle ? (
            <div ref={guideRef} style={{
              position: 'relative',
              width: guideWidth,
              height: guideHeight,
              borderRadius: '50%',
              border: '6px solid rgba(255,255,0,.95)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,.28), 0 0 20px rgba(255,255,0,.7)',
            }}>
              {isDual && (
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${(settings.innerRatio || 0.363) * 100}%`,
                  height: `${(settings.innerRatio || 0.363) * 100}%`,
                  borderRadius: '50%',
                  border: '4px solid rgba(255,255,0,.7)',
                  boxShadow: '0 0 12px rgba(255,255,0,.5)',
                }} />
              )}
            </div>
          ) : (
            <div ref={guideRef} style={{
              width: guideWidth,
              height: guideHeight,
              border: '6px solid rgba(255,255,0,.95)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,.28)',
            }} />
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      {ready && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ color: '#ffff00', fontWeight: '900', marginBottom: '12px', textAlign: 'center', lineHeight: 1.3, fontSize: '13px' }}>
            {settings.instruction}
          </div>
          <button onClick={capture}
            style={{ width: '82px', height: '82px', borderRadius: '50%', background: '#fff', border: '5px solid #ffff00', cursor: 'pointer', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            📸
          </button>
        </div>
      )}
    </div>
  );
}
