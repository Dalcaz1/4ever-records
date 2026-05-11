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
  'Analyze the photos carefully. Read ALL visible text including small print.',
  'IDENTIFY FROM THE LABEL OR COVER:',
  'Record label company name.',
  'Artist or group name.',
  'Song title - use Side A as main title for 45s.',
  'Year if visible on label.',
  'Catalog number such as FR-801 or VJ 465 - critical for identifying the pressing.',
  'Country of manufacture if visible such as Made in USA or Hecho en Mexico or Made in Japan.',
  'Pressing details such as Original or Reissue or Promo or Stereo or Mono or Colored Vinyl.',
  'RULES:',
  'The label company name is NOT the artist. Put it in the label field.',
  'The artist is the performer or group.',
  'Catalog numbers go in catalog_number field AND notes.',
  'Read both sides if visible.',
  'Preserve Spanish accents.',
  'Use your music knowledge to confirm what you read.',
  'Never return a number like 1 or 2 as the artist name.',
  'If year is not clearly visible return empty string - do not guess.',
  'Return ONLY valid JSON with no markdown and no extra text.',
  'Use exactly these keys:',
  'artist - performing artist or group, empty string if unreadable',
  'title - main song or album title, empty string if unreadable',
  'year - 4 digit year if clearly visible, otherwise empty string',
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
