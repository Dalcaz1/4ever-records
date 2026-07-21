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
  // FIX (raised directly by user, two rounds):
  // 1. Price larger, far right, on its OWN row — not sharing a line with
  //    date (an earlier version put them on the same row; corrected).
  // 2. SKU needs to safely support growing to a 9-digit counter
  //    (next-sku.js's padStart(4,'0') already allows this — a floor, not
  //    a cap, no change needed there).
  // 3. No box around the SKU — a border touching character strokes is
  //    its own false-read risk on a lower-quality print. Isolation comes
  //    from generous whitespace and a large, bold, monospace font
  //    instead, not a drawn line.
  //
  // Layout is 3 rows: SKU alone (auto-fit width) / Artist-Title with Date
  // tucked into its leftover width / Price alone on its own row, right-
  // aligned, sized to whatever vertical space remains. Every dimension
  // is computed from ACTUAL measured text metrics at render time
  // (heightOfString/widthOfString), not fixed constants — verified
  // against a real overflow bug caught during testing (labels sit
  // edge-to-edge vertically with zero gutter, so any overflow prints
  // into the label below it).
  const padX = 4, padTop = 2, padBottom = 1.5;
  const innerW = LABEL_W - padX * 2;
  const bottomLimit = y + LABEL_H - padBottom;
  let cursorY = y + padTop;

  // Row 1: SKU alone — auto-fits width, capped at 12pt (no box to budget
  // space for now, so it can run slightly larger than before) with a 7pt
  // floor for the extreme 9-digit-counter case.
  const sku = record.sku || '';
  const skuFontSize = fitFontSizeToWidth(doc, 'Courier-Bold', sku, innerW, 12, 7);
  doc.font('Courier-Bold').fontSize(skuFontSize).fillColor('#000000');
  const skuH = doc.heightOfString(sku, { width: innerW });
  doc.text(sku, x + padX, cursorY, { width: innerW, lineBreak: false });
  cursorY += skuH + 1.5;

  // Row 2: Artist — Title (left), Date tucked into the leftover width on
  // the right of this same row — title text rarely uses the full width,
  // so this costs no extra vertical space.
  doc.font('Helvetica').fontSize(6).fillColor('#555555');
  const dateStr = formatDate(record.created_at);
  const dateWidth = doc.widthOfString(dateStr);
  const artistTitleMaxW = innerW - dateWidth - 4;
  const artistTitle = truncate([record.artist, record.title].filter(Boolean).join(' \u2014 '), 30);
  doc.font('Helvetica').fontSize(6).fillColor('#000000');
  const atH = doc.heightOfString(artistTitle, { width: artistTitleMaxW });
  doc.text(artistTitle, x + padX, cursorY, { width: artistTitleMaxW, lineBreak: false });
  doc.font('Helvetica').fontSize(6).fillColor('#555555');
  doc.text(dateStr, x + LABEL_W - padX - dateWidth, cursorY, { lineBreak: false });
  cursorY += atH + 1;

  // Row 3: Price ALONE — its own row, nothing shares it, right-aligned,
  // auto-fits whatever vertical space is actually left (which varies per
  // record, since a longer SKU takes more of row 1) so it can never
  // overflow the label.
  const remainingH = bottomLimit - cursorY;
  const price = record.price != null ? '$' + Number(record.price).toFixed(2) : '';
  let priceFontSize = 14;
  doc.font('Helvetica-Bold');
  while (priceFontSize > 6) {
    doc.fontSize(priceFontSize);
    if (doc.heightOfString(price, { width: 80 }) <= remainingH) break;
    priceFontSize -= 0.5;
  }
  doc.fontSize(priceFontSize).fillColor('#000000');
  const priceWidth = doc.widthOfString(price);
  doc.text(price, x + LABEL_W - padX - priceWidth, cursorY, { lineBreak: false });
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
