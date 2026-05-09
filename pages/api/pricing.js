export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const { artist, title } = req.query;
  if (!artist || !title) return res.status(400).json({ error: 'Missing artist or title' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are a vinyl record pricing expert with knowledge of Discogs and eBay market prices.

For the record: "${artist}" - "${title}"

Provide realistic current market pricing estimates.

Return ONLY this JSON, no other text:
{
  "discogs": "24.99",
  "ebay": "19.99",
  "recommended": "22.00",
  "notes": "brief note about market value"
}`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const pricing = JSON.parse(text);
    return res.status(200).json(pricing);

  } catch (err) {
    console.error('Pricing error:', err);
    return res.status(500).json({ error: 'Pricing lookup failed' });
  }
}
