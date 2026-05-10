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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `You are a vintage music marketplace expert with deep knowledge of collector pricing across multiple platforms.

For the record/item: "${artist}" - "${title}"

Research and estimate current market pricing based on your knowledge of these sources:
- Discogs (vinyl specialist marketplace)
- eBay (recent sold listings)
- Popsike (auction price archive for records)
- MusicStack (vinyl & CD marketplace)
- Amazon (especially for CDs and cassettes)

Consider condition grades (VG+/NM typically command highest prices).

If this is a well-known item, provide realistic market estimates.
If this is obscure or unknown, provide conservative estimates based on similar items.
If you truly cannot identify this item at all, set all prices to null.

Return ONLY this JSON, no other text:
{
  "discogs": "price as number string like 24.99 or null if unknown",
  "ebay": "price as number string like 19.99 or null if unknown",
  "popsike": "price as number string like 22.00 or null if unknown",
  "recommended": "your recommended selling price as number string or null if completely unknown",
  "confidence": "high, medium, or low",
  "notes": "brief note about pricing rationale or why item is hard to price"
}`,
        }],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(500).json({ error: 'Pricing lookup failed' });
    }

    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const pricing = JSON.parse(text);
    return res.status(200).json(pricing);

  } catch (err) {
    console.error('Pricing error:', err);
    return res.status(500).json({ error: 'Pricing lookup failed' });
  }
}
