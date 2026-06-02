import { useState, useRef, useEffect } from 'react';

function getGuideText(slotLabel, selectedFormat) {
  const label = String(slotLabel || '').toLowerCase();
  const format = String(selectedFormat || '').toLowerCase();
  if (label.includes('front') && (format.includes('12') || format.includes('cd') || format.includes('cassette'))) {
    return 'Fit the full front cover or case inside the yellow guide.';
  }
  if (label.includes('back')) {
    return 'Fit the full back cover or case inside the yellow guide.';
  }
  if (label.includes('label') || label.includes('side') || label.includes('disc')) {
    return 'Center the label inside the yellow guide.';
  }
  return 'Fit the item clearly inside the yellow guide.';
}

export default function CameraModal({ onCapture, onClose, label, selectedFormat }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const guideRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState('');

  const slotLabel = typeof label === 'string' ? label : label?.label || '';
  const formatText = String(selectedFormat || '').toLowerCase();
  const circleGuide = slotLabel.includes('Label') || slotLabel.includes('Disc') || slotLabel.includes('Side');
  const isSevenInch = formatText.includes('7');

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
      } catch (err) {
        setCamError('Camera access denied. Please allow camera access in your browser settings.');
      }
    }
    startCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

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

  function stopCamera() {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
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
    if (circleGuide) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cropW / 2, cropH / 2, Math.min(cropW, cropH) / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    if (circleGuide) ctx.restore();
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'scan-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      onCapture(file);
      stopCamera();
    }, 'image/jpeg', 0.98);
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
          {circleGuide ? (
            <div ref={guideRef} style={{ position: 'relative', width: isSevenInch ? '82vw' : '96vw', height: isSevenInch ? '82vw' : '96vw', borderRadius: '50%', boxShadow: '0 0 0 9999px rgba(0,0,0,.28)' }}>
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: isSevenInch ? '70%' : '62%', height: isSevenInch ? '70%' : '62%', borderRadius: '50%', border: '5px solid rgba(255,255,0,.95)', boxShadow: '0 0 20px rgba(255,255,0,.7)' }} />
            </div>
          ) : (
            <div ref={guideRef} style={{ width: '82vw', height: '82vw', border: '6px solid rgba(255,255,0,.95)', boxShadow: '0 0 0 9999px rgba(0,0,0,.28)' }} />
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      {ready && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ color: '#ffff00', fontWeight: '900', marginBottom: '12px', textAlign: 'center', lineHeight: 1.3 }}>
            {circleGuide ? 'Center the label inside the yellow guide.' : getGuideText(slotLabel, selectedFormat)}
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
