export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const PROMPT_LINES = [
  'You are an expert music collector and vinyl record identifier with decades of experience.',
  'You are fluent in English, Spanish, and other languages commonly found on records.',
  'You have deep knowledge of record label history, catalog numbering systems, and pressing dates.',
  'Analyze the photos carefully. Read ALL visible text including small print.',
  'IDENTIFY FROM THE LABEL OR COVER:',
  'Record label company name.',
  'Artist or group name.',
  'Song title - use Side A as main title for 45s.',
  'Year if visible on label.',
  'Catalog number such as FR-801 or VJ 465 or 47-8041 - critical for identifying the pressing.',
  'Country of manufacture if visible such as Made in USA or Hecho en Mexico or Made in Japan.',
  'Pressing details such as Original or Reissue or Promo or Stereo or Mono or Colored Vinyl.',
  'DETERMINING THE YEAR:',
  'First look for a year printed directly on the label or sleeve.',
  'If no year is printed, use your knowledge of catalog numbering systems to estimate the year.',
  'Examples of catalog number dating:',
  'RCA Victor 47-8000 to 47-8099 = 1962, 47-8100 to 47-8299 = 1963, 47-8300 to 47-8499 = 1964, 47-8500 to 47-8699 = 1965, 47-8700 to 47-8999 = 1966.',
  'Columbia 4-40000 to 4-41000 = late 1950s, 4-41000 to 4-42000 = 1959 to 1962, 4-42000 to 4-43000 = 1962 to 1964.',
  'Capitol F-series = 1950s, Capitol 2000 to 3000 = late 1950s to early 1960s, Capitol 4000 to 5000 = 1963 to 1965.',
  'Motown 1000 to 1060 = 1959 to 1963, 1060 to 1100 = 1964 to 1966, 1100 to 1150 = 1967 to 1969.',
  'Atlantic 1000 to 2000 = 1950s, 2000 to 2300 = early 1960s, 2300 to 2600 = mid 1960s, 2600 to 2900 = late 1960s.',
  'Decca 9-28000 to 9-30000 = early 1950s, 9-30000 to 9-32000 = mid 1950s.',
  'Chess 1500 to 1700 = mid 1950s, 1700 to 1850 = late 1950s, 1850 to 1950 = early 1960s.',
  'Sun Records 200 to 250 = 1954 to 1956, 250 to 300 = 1957 to 1959.',
  'Freddie Records FR-001 to FR-200 = late 1960s to mid 1970s, FR-200 to FR-500 = mid to late 1970s.',
  'For Spanish labels like Discos CBS, Musart, Peerless, Bego, use label design and catalog range to estimate decade.',
  'If you can estimate the year from the catalog number use it - return just the 4 digit year.',
  'If you truly cannot determine the year even from the catalog number return empty string.',
  'RULES:',
  'The label company name is NOT the artist. Put it in the label field.',
  'The artist is the performer or group.',
  'Catalog numbers go in catalog_number field AND notes.',
  'Read both sides if visible.',
  'Preserve Spanish accents.',
  'Use your music knowledge to confirm what you read.',
  'Never return a number like 1 or 2 as the artist name.',
  'Never guess 1975 or any default year - use catalog number dating or return empty string.',
  'Return ONLY valid JSON with no markdown and no extra text.',
  'Use exactly these keys:',
  'artist - performing artist or group, empty string if unreadable',
  'title - main song or album title, Side A for 45s, empty string if unreadable',
  'year - 4 digit year from label or estimated from catalog number, otherwise empty string',
  'label - record label company name only',
  'catalog_number - exact catalog number as printed, empty string if not visible',
  'country - country of manufacture if visible, otherwise empty string',
  'pressing - Original or Reissue or Promo or DJ Copy or Stereo or Mono or empty string',
  'genre - one of: Rock Jazz Blues Country Spanish Classical Pop Religious Comedy Soundtracks',
  'condition - one of: M NM VG+ VG G based on visible wear',
  'notes - B-side title and any additional details',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { images, format } = req.body;
  if (!images || images.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const promptText = 'Analyzing ' + format + ' photos.\n' + PROMPT_LINES.join('\n');

    const content = [
      ...images.map(function(img) {
        return {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: img },
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
        max_tokens: 1000,
        messages: [{ role: 'user', content: content }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(500).json({ error: 'AI scanning failed', details: data.error });
    }

    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);
    return res.status(200).json(result);

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Scanning failed', message: err.message });
  }
}
