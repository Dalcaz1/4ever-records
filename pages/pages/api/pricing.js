export default async function handler(req, res) {
  const { artist, title } = req.query;
  if (!artist || !title) return res.status(400).json({ error: 'Missing artist or title' });

  try {
    // Use Claude to estimate pricing based on market knowledge
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

Provide realistic current market pricing estimates based on your knowledge of what these records typically sell for.

Return ONLY a JSON object:
{
  "discogs": "average price on Discogs as a number like 24.99",
  "ebay": "average sold price on eBay as a number like 19.99",
  "recommended": "your recommended selling price as a number like 22.00",
  "notes": "brief note about this record's market value"
}

Return ONLY the JSON, no other text.`,
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
