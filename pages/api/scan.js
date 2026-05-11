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
        text: `You are an expert music collector and vinyl record identifier with decades of experience reading record labels, album covers, CD cases, and cassette inserts.

Analyze these ${format} photos carefully and extract the correct artist and title information.

USE ALL OF THESE CLUES TOGETHER to identify the artist vs title:

1. KNOWN ARTISTS: If you recognize a known musical act (band, singer, orchestra, composer), that is the artist regardless of text size or position. Examples: "The 4 Seasons", "Elvis Presley", "Frank Sinatra", "The Beatles", "Miles Davis".

2. GRAMMAR CLUES: Look for words like "by", "performed by", "featuring", "presents", "with" — these introduce the artist name.

3. FORMAT CLUES:
   - 7" singles (45s): Usually show song title prominently and artist below or alongside. But some labels (especially older ones) put the artist first.
   - 12" albums: Usually artist name is prominent, album title below.
   - CDs and cassettes: Usually artist on top, album title below.

4. LABEL CLUES: Record label names (VeeJay, Columbia, RCA, Capitol, Decca, Atlantic, Motown, Mercury, Chess, Sun, Stax, Blue Note, etc.) are NEVER the artist.

5. CATALOG NUMBERS: Alphanumeric codes like "VJ 465", "62-2649", "ASCAP-2:25" are catalog/matrix numbers, NOT artist or title.

6. B-SIDE INFO: Text like "From Album X" or a secondary song name is supplemental info, not the artist.

7. WHEN UNCERTAIN: Use your knowledge of music history. If you see "Big Girl's Don't Cry" and "The 4 Seasons" — you know The 4 Seasons is the famous group that recorded that song. Use that knowledge.

8. CONDITION ASSESSMENT: Look at the physical state of the record/sleeve for scratches, scuffs, writing, splits, or wear to determine condition grade.

Return ONLY a JSON object with these exact fields:
{
  "artist": "the performing artist or group name",
  "title": "the song or album title",
  "year": "4 digit release year or empty string if unknown",
  "label": "record label company name only, not catalog number",
  "genre": "one of: Rock, Jazz, Blues, Country, Spanish, Classical, Children's, Holiday, Pop, Religious, Comedy, Soundtracks",
  "condition": "one of: M, NM, VG+, VG, G - based on visible wear",
  "notes": "catalog number, B-side title, pressing info, promo markings, or other useful details"
}

Return ONLY the JSON. No markdown, no explanation, no extra text.`,
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
