// Generates a print-ready PDF sheet of Avery 8167 / 5167 compatible labels
// (1.75" x 0.5", 80 per US Letter sheet — 4 columns x 20 rows) for selected
// inventory items.
//
// Deliberately NOT a barcode or QR code — per direct product decision, the
// SKU is printed as real, human-and-machine-readable text in a monospace
// font (Courier-Bold), meant to be read the same way the app already reads
// physical labels for identification: point a camera at it. No dedicated
// barcode-scanner hardware required.
//
// Grid geometry derived and verified mathematically against Avery's
// published margins (Top/Bottom 0.5", Left/Right 0.25") — not guessed:
//   - Vertical: 20 rows x 0.5" = 10.0" exactly fills the 11" - 1.0" margin
//     usable height, so labels are edge-to-edge vertically (no gutter).
//   - Horizontal: 4 columns x 2.0" pitch = 8.0" exactly fills the
//     8.5" - 0.5" margin usable width, meaning a 0.25" gutter (2.0" pitch
//     - 1.75" label width) sits between columns.

import PDFDocument from 'pdfkit';

const PAGE_W = 8.5 * 72; // 612pt
const PAGE_H = 11 * 72; // 792pt
const LABEL_W = 1.75 * 72; // 126pt
const LABEL_H = 0.5 * 72; // 36pt
const COLS = 4;
const ROWS = 20;
const LEFT_MARGIN = 0.25 * 72; // 18pt
const TOP_MARGIN = 0.5 * 72; // 36pt
const H_PITCH = 2.0 * 72; // 144pt (label + 0.25" gutter)
const V_PITCH = 0.5 * 72; // 36pt (no gutter)
const PER_PAGE = COLS * ROWS; // 80

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return (d.getMonth() + 1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2);
}

function fitFontSizeToWidth(doc, font, text, maxWidth, startSize, minSize) {
  let size = startSize;
  doc.font(font);
  while (size > minSize) {
    doc.fontSize(size);
    if (doc.widthOfString(text) <= maxWidth) return size;
    size -= 0.5;
  }
  return minSize;
}

function drawLabel(doc, x, y, record) {
  // x, y = top-left corner of this label cell, in pdfkit's top-left-origin
  // coordinate space.
  //
  // FIX (raised directly by user): price moved to the far right, made
  // noticeably larger; SKU needs to safely support growing to a 9-digit
  // counter (next-sku.js's padStart(4,'0') already allows this — it's a
  // minimum, not a cap); SKU needs to be as scan-identifiable as
  // possible. All three interact: a 9-digit-counter SKU can be nearly
  // the full label width, so SKU size and price size can't both be fixed
  // constants without one of them risking overflow. Every dimension
  // below is computed from ACTUAL measured text metrics at render time
  // (heightOfString/widthOfString), not hand-tuned fixed numbers — this
  // was verified against a genuine overflow bug caught during testing
  // before this shipped (a fixed-size version put price ~5pt past the
  // label's bottom edge, which — since labels sit edge-to-edge
  // vertically with no gutter — would have printed into the label below
  // it).
  const padX = 4, padTop = 1.5, padBottom = 1.5;
  const innerW = LABEL_W - padX * 2;
  const bottomLimit = y + LABEL_H - padBottom;
  let cursorY = y + padTop;

  // Row 1: SKU — auto-fits width, capped at 11pt (leaves real room for
  // price below even in the worst case) with a 7pt floor for extreme
  // lengths. Boxed specifically so the camera-based scan step has an
  // unambiguous, isolated region to read — this is the concrete
  // "more identifiable for scan" change.
  const sku = record.sku || '';
  const boxPad = 1.3;
  const skuFontSize = fitFontSizeToWidth(doc, 'Courier-Bold', sku, innerW - boxPad * 2, 11, 7);
  doc.font('Courier-Bold').fontSize(skuFontSize).fillColor('#000000');
  const skuBoxH = doc.heightOfString(sku, { width: innerW }) + boxPad * 2;
  doc.rect(x + padX, cursorY, innerW, skuBoxH).lineWidth(0.75).strokeColor('#000000').stroke();
  doc.text(sku, x + padX, cursorY + boxPad, { width: innerW, lineBreak: false });
  cursorY += skuBoxH + 1;

  // Row 2: Artist — Title, truncated to fit one line at this size.
  const artistTitle = truncate([record.artist, record.title].filter(Boolean).join(' \u2014 '), 34);
  doc.font('Helvetica').fontSize(6).fillColor('#000000');
  const atH = doc.heightOfString(artistTitle, { width: innerW });
  doc.text(artistTitle, x + padX, cursorY, { width: innerW, lineBreak: false });
  cursorY += atH + 0.5;

  // Row 3: Date (left, small) ... Price (far right, large & bold — moved
  // here per direct instruction, previously crammed next to the date at
  // 6.5pt in leftover space). Price auto-fits whatever vertical space is
  // actually left after rows 1-2 (which varies per record, since a
  // longer SKU makes a taller box) — this is what makes it impossible
  // for this row to overflow the label, unlike the fixed-size version.
  const remainingH = bottomLimit - cursorY;
  const price = record.price != null ? '$' + Number(record.price).toFixed(2) : '';
  let priceFontSize = 10;
  doc.font('Helvetica-Bold');
  while (priceFontSize > 6) {
    doc.fontSize(priceFontSize);
    if (doc.heightOfString(price, { width: 60 }) <= remainingH) break;
    priceFontSize -= 0.5;
  }
  doc.fontSize(priceFontSize).fillColor('#000000');
  const priceWidth = doc.widthOfString(price);
  const priceH = doc.heightOfString(price, { width: 60 });
  doc.text(price, x + LABEL_W - padX - priceWidth, cursorY, { lineBreak: false });

  doc.font('Helvetica').fontSize(6).fillColor('#555555');
  const dateStr = formatDate(record.created_at);
  doc.text(dateStr, x + padX, cursorY + Math.max(0, (priceH - 6) / 2), { lineBreak: false });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ids, startPosition } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Missing ids (array of record ids to print labels for)' });
  }
  // 1-indexed position on the FIRST sheet (1-80) — lets a partially-used
  // label sheet be reused instead of wasting labels every print run.
  let startIdx = parseInt(startPosition, 10);
  if (!Number.isFinite(startIdx) || startIdx < 1 || startIdx > PER_PAGE) startIdx = 1;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Preserve the requested order (and repeats, if the same id appears
    // twice for multiple copies) rather than however Supabase happens to
    // return matches for an .in() query.
    const { data: rows, error } = await supabase
      .from('records')
      .select('id, sku, artist, title, price, created_at')
      .in('id', [...new Set(ids)]);
    if (error) return res.status(500).json({ error: error.message });

    const byId = {};
    (rows || []).forEach(r => { byId[r.id] = r; });
    const records = ids.map(id => byId[id]).filter(Boolean);
    if (records.length === 0) return res.status(404).json({ error: 'None of the requested items were found' });

    const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: 0 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    const done = new Promise(resolve => doc.on('end', resolve));

    let slot = startIdx - 1; // 0-indexed position within the current page
    records.forEach((record, i) => {
      if (i > 0 && slot >= PER_PAGE) { doc.addPage(); slot = 0; }
      else if (slot >= PER_PAGE) { slot = 0; }
      const col = slot % COLS;
      const row = Math.floor(slot / COLS);
      const x = LEFT_MARGIN + col * H_PITCH;
      const y = TOP_MARGIN + row * V_PITCH;
      drawLabel(doc, x, y, record);
      slot++;
    });

    doc.end();
    await done;
    const pdfBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="4ever-labels.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('generate-labels error:', err);
    return res.status(500).json({ error: err.message });
  }
}
