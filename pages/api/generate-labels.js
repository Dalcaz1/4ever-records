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

function drawLabel(doc, x, y, record) {
  // x, y = top-left corner of this label cell, in pdfkit's top-left-origin
  // coordinate space.
  const padX = 4;
  let cursorY = y + 3;

  // SKU — the actual "scan target." Monospace + bold for maximum legibility
  // at a glance and consistent character spacing.
  doc.font('Courier-Bold').fontSize(12.5).fillColor('#000000');
  doc.text(record.sku || '', x + padX, cursorY, { width: LABEL_W - padX * 2, lineBreak: false });
  cursorY += 14;

  // Artist — Title, truncated to fit one line at this size.
  const artistTitle = truncate([record.artist, record.title].filter(Boolean).join(' \u2014 '), 34);
  doc.font('Helvetica').fontSize(6).fillColor('#000000');
  doc.text(artistTitle, x + padX, cursorY, { width: LABEL_W - padX * 2, lineBreak: false });
  cursorY += 8;

  // Price + date created, same line, price bold to stand out at a glance.
  const price = record.price != null ? '$' + Number(record.price).toFixed(2) : '';
  const dateStr = formatDate(record.created_at);
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#000000');
  doc.text(price, x + padX, cursorY, { continued: false, lineBreak: false });
  if (dateStr) {
    const priceWidth = doc.widthOfString(price);
    doc.font('Helvetica').fontSize(6).fillColor('#333333');
    doc.text('  ' + dateStr, x + padX + priceWidth, cursorY, { lineBreak: false });
  }
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
