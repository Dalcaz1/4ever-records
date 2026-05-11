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
        text: `You are an expert music collector and vinyl record identifier with decades of experience reading record labels, album covers, CD cases, and cassette inserts. You are fluent in English, Spanish, and other languages commonly found on records.

Analyze these ${format} photos carefully. Read ALL visible text in the images including small print.

YOUR TASK: Identify the following from the label(s) and/or cover(s):
- The RECORD LABEL company (e.g. Freddie Records, VeeJay, Columbia, RCA, Discos CBS, etc.)
- The ARTIST or GROUP NAME (e.g. Los Vaqueros Del Norte, The 4 Seasons, etc.)
- The SONG TITLE(S) — there may be a Side A and Side B title visible
- The release YEAR if visible
- The CATALOG NUMBER (e.g. FR-801, VJ 465) — put this in notes

IMPORTANT RULES:
1. The RECORD LABEL name printed on the label (Freddie, VeeJay, Columbia, Motown, etc.) is NOT the artist — it is the company that released the record. Put it in the "label" field.
2. The ARTIST is the performer or group. On Spanish records this is often a band like "Los Vaqueros Del Norte", "Conjunto Bernal", "Ramon Ayala", etc.
3. The SONG TITLE is what the record is called. On a 45, there is a Side A title and a Side B title — use the A side as the main title and put the B side in notes.
4. Catalog numbers like "FR-801", "VJ-465", "45 RPM", "Stereo", "ASCAP" are NOT artist names — put them in notes.
5. If you see both sides of the record, read both labels carefully.
6. For Spanish language records, preserve the correct spelling including accents (é, á, ó, ú, ñ, etc.).
7. Use your music knowledge — if you recognize a known artist or label, use that knowledge to confirm what you read.
8. NEVER return a number like "1" or "2" as the artist name — if you cannot read the artist clearly, return an empty string.

Return ONLY a JSON object:
{
  "artist": "the performing artist or group name, empty string if truly unreadable",
  "title": "the main song or album title (Side A for 45s), empty string if truly unreadable",
  "year": "4 digit release year or empty string if unknown",
  "label": "record label company name only",
  "genre": "one of: Rock, Jazz, Blues, Country, Spanish, Classical, Children's, Holiday, Pop, Religious, Comedy, Soundtracks",
  "condition": "one of: M, NM, VG+, VG, G - based on visible wear",
  "notes": "B-side title, catalog number, pressing info, promo markings, or other useful details"
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
        model: 'claude-sonnet-4-20250514',
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
