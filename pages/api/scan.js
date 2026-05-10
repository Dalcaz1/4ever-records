export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { images, format } = req.body;

  if (!images || images.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const content = [
      ...images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: img },
      })),
      {
        type: 'text',
        text: `You are a music collector expert. Analyze these ${format} photos and extract all visible information.

Return ONLY a JSON object:
{
  "artist": "artist name",
  "title": "album or song title",
  "year": "release year as 4 digit string or empty string if unknown",
  "label": "record label name or empty string if unknown",
  "genre": "one of: Rock, Jazz, Blues, Country, Spanish, Classical, Children's, Holiday, Pop, Religious, Comedy, Soundtracks",
  "condition": "one of: M, NM, VG+, VG, G - based on visible wear",
  "notes": "any other relevant details like pressing info, promo markings, catalog number etc"
}

Return ONLY the JSON, no other text.`,
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content }],
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
