export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function cleanText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildScanPrompt(format, type, sealed, photoLabels) {
  return [
    'You are FYT, an expert music collector, vinyl record identifier, record label historian, track-list reader, and collector-pricing preparation specialist.',
    'You are fluent in English, Spanish, and languages commonly found on music releases.',
    'Analyze the uploaded photos carefully and return ONLY valid JSON. No markdown. No extra explanation.',

    'FYT CONTEXT:',
    'The user is scanning a collectible music item inside Find Your Tunes.',
    'Do NOT tell the user to go to outside websites.',
    'Do NOT mention Discogs, eBay, 45cat, 45worlds, Popsike, WorthPoint, MusicBrainz, Rate Your Music, Goldmine, or any external verification source in notes or description.',
    'All notes must read like FYT-native collector metadata.',

    'CURRENT ITEM SELECTION:',
    'Selected format: ' + (format || ''),
    'Selected type: ' + (type || ''),
    'Sealed item: ' + (sealed ? 'true' : 'false'),
    'Photo labels provided: ' + ((photoLabels || []).join(', ') || 'not provided'),

    'CRITICAL IDENTIFICATION RULES:',
    'Identify the performing artist or group.',
    'Identify the album title for LPs, CDs, cassettes, and 8-tracks.',
    'For 45s or singles, use the Side A song title as the main title.',
    'The record label company is NOT the artist.',
    'Catalog number is critical. Read it exactly as printed.',
    'Also infer likely catalog aliases when the label uses prefixes that may be confused, such as Freddie FR versus LP.',
    'For Freddie Records LP albums, if the visible number looks like FR-1287 but the cover or LP context indicates LP cataloging, include LP-1287 as a likely catalog alias.',
    'Do not invent a catalog number. Only create aliases from the visible printed number and label/catalog pattern.',
    'Read matrix/runout only if visible.',
    'Read label rim text, sleeve text, spine text, copyright lines, barcode/no barcode, stereo/mono wording, promo wording, DJ copy wording, and manufacturer text.',
    'Preserve Spanish accents when visible.',
    'Never return a number like 1 or 2 as the artist.',
    'Never guess a default year.',
    'Use a 4-digit year only if printed or strongly supported by label/catalog/pressing clues.',
    'If uncertain on year, return empty string.',

    'TRACK TITLE EXTRACTION RULES:',
    'Extract track titles from any visible back cover, sleeve, label, CD case, tray card, cassette J-card, cassette shell, 8-track program listing, or disc print.',
    'For LPs, CDs, cassettes, and 8-tracks, read track titles from the cover/case/card/program if visible.',
    'For 7" singles, include Side A and Side B titles if visible.',
    'For 12" singles or maxi-singles, include all visible mix/song titles if visible.',
    'Only include track titles that are actually visible or strongly readable.',
    'Do not invent tracks.',
    'Preserve Spanish accents when visible.',
    'Return track_titles as an array of song titles only.',
    'These track_titles will help FYT find an in-app YouTube preview when the album title itself does not match.',

    'FORMAT / RELEASE TYPE RULES:',
    'If selected format is 12" Vinyl and the item is an album/LP, release_type must be VINYL_LP, not VINYL_12_SINGLE.',
    'Only use VINYL_12_SINGLE when the item is clearly a 12-inch single or maxi-single.',
    '7" Vinyl should usually be VINYL_7_SINGLE unless clearly an EP.',
    'CD should be CD_ALBUM unless clearly a CD single.',
    'Cassette should be CASSETTE_ALBUM unless clearly a cassette single.',
    '8-Track should be 8_TRACK.',
    'Sealed Item means factory sealed or unopened packaging if visible or selected. Do not require inside-label photos for sealed items.',

    'VARIANT RULES:',
    'Variant identification is important.',
    'Look for label color, logo placement, catalog prefix, stereo/mono text, promo text, club edition, import text, barcode/no barcode, sleeve design, hype stickers, plant marks, rim text, and matrix/runout clues.',
    'If exact variant cannot be confirmed, state only what FYT can see from the photos.',
    'Do not overstate certainty.',

    'CONDITION RULES:',
    'Do not overstate condition from photos.',
    'Use visible wear only.',
    'If sealed is true and the item appears sealed, condition should be M or NM and condition_notes should mention factory sealed packaging if visible.',
    'Allowed condition values: M, NM, VG+, VG, G.',

    'GENRE RULES:',
    'Allowed genre values: Rock, Jazz, Blues, Country, Spanish, Classical, Pop, Religious, Comedy, Soundtracks.',
    'For Tejano, Norteño, Conjunto, Regional Mexican, Latin Spanish-language records, use Spanish.',

    'DESCRIPTION RULES:',
    'Create a collector-focused FYT description.',
    'No outside-site wording.',
    'No external verification wording.',
    'Description should include artist/title, label, catalog, format, pressing/variant clues, matrix/runout if visible, track information if visible, release history if supported, and condition notes.',
    'Keep description professional and FYT-native.',

    'RETURN EXACTLY THIS JSON SHAPE:',
    '{',
    '  "artist": "",',
    '  "title": "",',
    '  "year": "",',
    '  "label": "",',
    '  "catalog_number": "",',
    '  "catalog_aliases": [],',
    '  "track_titles": [],',
    '  "country": "",',
    '  "pressing": "",',
    '  "format_details": "",',
    '  "release_type": "",',
    '  "sleeve_type": "",',
    '  "sealed": false,',
    '  "genre": "",',
    '  "condition": "",',
    '  "condition_notes": "",',
    '  "matrix_runout": "",',
    '  "variant": "",',
    '  "variant_confidence": "",',
    '  "label_details": "",',
    '  "description": "",',
    '  "notes": ""',
    '}',

    'JSON FIELD DETAILS:',
    'artist: performing artist or group only.',
    'title: album title or Side A title.',
    'year: 4 digit year or empty string.',
    'label: record label company only.',
    'catalog_number: exact best catalog number as printed.',
    'catalog_aliases: array of likely aliases based only on printed catalog pattern.',
    'track_titles: array of visible song titles only.',
    'country: country of manufacture if visible.',
    'pressing: Original, Reissue, Promo, DJ Copy, Stereo, Mono, Colored Vinyl, Club Edition, Import, Sealed, or empty string.',
    'format_details: human-readable format such as 12 inch LP, 7 inch 45, CD, Cassette, 8-Track.',
    'release_type: one of VINYL_LP, VINYL_12_SINGLE, VINYL_7_SINGLE, VINYL_7_EP, CD_ALBUM, CD_SINGLE, CASSETTE_ALBUM, CASSETTE_SINGLE, 8_TRACK, UNKNOWN.',
    'sleeve_type: Picture Cover, Generic Cover, Picture Sleeve, Generic Sleeve, Cover Only, Sleeve Only, Picture Case, Generic Case, Sealed Item, or empty string.',
    'sealed: true or false.',
    'genre: allowed genre value.',
    'condition: allowed condition value.',
    'condition_notes: visible condition details only.',
    'matrix_runout: matrix or runout text if visible.',
    'variant: visible variant clues.',
    'variant_confidence: high, medium, low, or unknown.',
    'label_details: visible label design and text details.',
    'description: FYT-native collector description.',
    'notes: short FYT-native notes only. No outside source references.',
  ].join('\n');
}

function stripCodeFence(text) {
  return String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function safeJsonParse(text) {
  const cleaned = stripCodeFence(text);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw err;
  }
}

function normalizeReleaseType(format, type, result) {
  const f = cleanText(format);
  const t = cleanText(type);
  const title = cleanText(result.title);
  const details = cleanText(result.format_details);
  const combined = cleanText([f, t, title, details, result.pressing].join(' '));

  if (f.includes('7')) {
    if (combined.includes('ep')) return 'VINYL_7_EP';
    return 'VINYL_7_SINGLE';
  }

  if (f.includes('12')) {
    if (combined.includes('single') || combined.includes('maxi')) {
      if (combined.includes('album') || combined.includes('lp')) {
        return 'VINYL_LP';
      }
      return 'VINYL_12_SINGLE';
    }
    return 'VINYL_LP';
  }

  if (f.includes('cd')) {
    return combined.includes('single') ? 'CD_SINGLE' : 'CD_ALBUM';
  }

  if (f.includes('cassette')) {
    return combined.includes('single') ? 'CASSETTE_SINGLE' : 'CASSETTE_ALBUM';
  }

  if (f.includes('8')) {
    return '8_TRACK';
  }

  return result.release_type || 'UNKNOWN';
}

function normalizeCatalog(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

function buildCatalogAliases(catalogNumber, label, releaseType) {
  const aliases = [];
  const original = String(catalogNumber || '').trim();
  const normalized = normalizeCatalog(original);
  const digits = normalized.replace(/\D/g, '');

  function add(value) {
    const v = String(value || '').trim();
    if (!v) return;

    const exists = aliases.some(a => normalizeCatalog(a) === normalizeCatalog(v));
    if (!exists) aliases.push(v);
  }

  add(original);

  if (normalized) add(normalized);
  if (digits) add(digits);

  const labelText = cleanText(label);

  if (labelText.includes('freddie') && digits) {
    add('LP-' + digits);
    add('LP ' + digits);
    add('LP' + digits);
    add('FR-' + digits);
    add('FR ' + digits);
    add('FR' + digits);

    if (releaseType === 'VINYL_LP') {
      add('Freddie LP-' + digits);
    }
  }

  if (normalized.startsWith('FR') && digits && releaseType === 'VINYL_LP') {
    add('LP-' + digits);
  }

  if (normalized.startsWith('LP') && digits) {
    add('FR-' + digits);
  }

  return aliases;
}

function sanitizeNoExternalReferences(value) {
  return String(value || '')
    .replace(/Discogs/gi, 'collector databases')
    .replace(/eBay/gi, 'marketplace history')
    .replace(/45cat/gi, 'single-discography records')
    .replace(/45worlds/gi, 'single-discography records')
    .replace(/Popsike/gi, 'auction history')
    .replace(/WorthPoint/gi, 'auction history')
    .replace(/MusicBrainz/gi, 'music metadata records')
    .replace(/Rate Your Music/gi, 'collector references')
    .replace(/Goldmine/gi, 'collector catalog references')
    .replace(/verify externally/gi, 'verify through FYT collector data')
    .replace(/external verification/gi, 'FYT collector verification');
}

function normalizeTrackTitles(value) {
  if (!Array.isArray(value)) return [];

  const tracks = [];

  value.forEach(track => {
    const clean = String(track || '').trim();

    if (!clean) return;
    if (clean.length < 2) return;

    const exists = tracks.some(existing => cleanText(existing) === cleanText(clean));

    if (!exists) tracks.push(clean);
  });

  return tracks.slice(0, 24);
}

function postProcessResult(raw, format, type, sealed) {
  const result = raw && typeof raw === 'object' ? raw : {};

  result.artist = String(result.artist || '').trim();
  result.title = String(result.title || '').trim();
  result.year = String(result.year || '').trim();
  result.label = String(result.label || '').trim();
  result.catalog_number = String(result.catalog_number || '').trim();
  result.country = String(result.country || '').trim();
  result.pressing = String(result.pressing || '').trim();
  result.format_details = String(result.format_details || '').trim();
  result.release_type = String(result.release_type || '').trim();
  result.sleeve_type = String(result.sleeve_type || type || '').trim();
  result.genre = String(result.genre || '').trim();
  result.condition = String(result.condition || '').trim();
  result.condition_notes = String(result.condition_notes || '').trim();
  result.matrix_runout = String(result.matrix_runout || '').trim();
  result.variant = String(result.variant || '').trim();
  result.variant_confidence = String(result.variant_confidence || '').trim();
  result.label_details = String(result.label_details || '').trim();
  result.track_titles = normalizeTrackTitles(result.track_titles);

  result.sealed = Boolean(sealed || result.sealed || cleanText(type).includes('sealed'));
  result.release_type = normalizeReleaseType(format, type, result);

  if (!Array.isArray(result.catalog_aliases)) {
    result.catalog_aliases = [];
  }

  const generatedAliases = buildCatalogAliases(
    result.catalog_number,
    result.label,
    result.release_type
  );

  generatedAliases.forEach(alias => {
    if (!result.catalog_aliases.some(existing => normalizeCatalog(existing) === normalizeCatalog(alias))) {
      result.catalog_aliases.push(alias);
    }
  });

  if (result.sealed && !cleanText(result.pressing).includes('sealed')) {
    result.pressing = result.pressing ? result.pressing + ', Sealed' : 'Sealed';
  }

  if (!result.format_details) {
    if (result.release_type === 'VINYL_LP') result.format_details = '12 inch LP';
    else if (result.release_type === 'VINYL_12_SINGLE') result.format_details = '12 inch single';
    else if (result.release_type === 'VINYL_7_SINGLE') result.format_details = '7 inch 45';
    else if (result.release_type === 'VINYL_7_EP') result.format_details = '7 inch EP';
    else if (result.release_type === 'CD_ALBUM') result.format_details = 'CD album';
    else if (result.release_type === 'CD_SINGLE') result.format_details = 'CD single';
    else if (result.release_type === 'CASSETTE_ALBUM') result.format_details = 'Cassette album';
    else if (result.release_type === 'CASSETTE_SINGLE') result.format_details = 'Cassette single';
    else if (result.release_type === '8_TRACK') result.format_details = '8-Track';
  }

  const descriptionParts = [
    result.artist && result.title ? result.artist + ' — ' + result.title : '',
    result.label ? 'Label: ' + result.label : '',
    result.catalog_number ? 'Catalog #: ' + result.catalog_number : '',
    result.catalog_aliases && result.catalog_aliases.length ? 'Catalog aliases: ' + result.catalog_aliases.join(', ') : '',
    result.track_titles && result.track_titles.length ? 'Visible Tracks: ' + result.track_titles.join(', ') : '',
    result.year ? 'Release Year: ' + result.year : '',
    result.country ? 'Country: ' + result.country : '',
    result.format_details ? 'Format: ' + result.format_details : '',
    result.pressing ? 'Pressing: ' + result.pressing : '',
    result.matrix_runout ? 'Matrix / Runout: ' + result.matrix_runout : '',
    result.variant ? 'Variant Notes: ' + result.variant : '',
    result.label_details ? 'Label Details: ' + result.label_details : '',
    result.condition ? 'Condition: ' + result.condition : '',
    result.condition_notes ? 'Condition Notes: ' + result.condition_notes : '',
  ].filter(Boolean);

  result.description = sanitizeNoExternalReferences(
    result.description && result.description.length > 20
      ? result.description
      : descriptionParts.join('\n')
  );

  result.notes = sanitizeNoExternalReferences(result.notes || '');
  result.variant = sanitizeNoExternalReferences(result.variant || '');
  result.condition_notes = sanitizeNoExternalReferences(result.condition_notes || '');
  result.label_details = sanitizeNoExternalReferences(result.label_details || '');

  result.catalogNumber = result.catalog_number;
  result.matrixRunout = result.matrix_runout;
  result.variantClues = result.variant;
  result.format = result.format_details;
  result.tracks = result.track_titles;

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    images,
    format,
    type,
    pressing,
    sleeveType,
    sealed,
    photoLabels,
  } = req.body;

  if (!images || images.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const promptText = buildScanPrompt(
      format || '',
      type || pressing || sleeveType || '',
      Boolean(sealed),
      photoLabels || []
    );

    const content = [
      ...images.map(function (img) {
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: img,
          },
        };
      }),
      {
        type: 'text',
        text: promptText,
      },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2200,
        messages: [
          {
            role: 'user',
            content: content,
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(500).json({
        error: 'AI scanning failed',
        details: data.error,
      });
    }

    const text = data?.content?.[0]?.text || '';
    const rawResult = safeJsonParse(text);

    const result = postProcessResult(
      rawResult,
      format || '',
      type || pressing || sleeveType || '',
      Boolean(sealed)
    );

    return res.status(200).json(result);
  } catch (err) {
    console.error('Scan error:', err);

    return res.status(500).json({
      error: 'Scanning failed',
      message: err.message,
    });
  }
}
