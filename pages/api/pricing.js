export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { artist, title } = req.query;
  if (!artist || !title) return res.status(400).json({ error: 'Missing artist or title' });

  try {
    const token = process.env.DISCOGS_TOKEN;
    const titleQuery = encodeURIComponent(title);
    const artistQuery = encodeURIComponent(artist);

    // Search Discogs
    const searchRes = await fetch(
      `https://api.discogs.com/database/search?title=${titleQuery}&artist=${artistQuery}&per_page=5`,
      { headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': '4EverMemoriesRecords/1.0' } }
    );
    const searchData = await searchRes.json();
    let results = searchData.results || [];

    // Fallback: title only
    if (results.length === 0) {
      const fallbackRes = await fetch(
        `https://api.discogs.com/database/search?q=${titleQuery}&per_page=5`,
        { headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': '4EverMemoriesRecords/1.0' } }
      );
      const fallbackData = await fallbackRes.json();
      results = fallbackData.results || [];
    }

    let discogs = null;
    let notes = '';

    if (results.length > 0) {
      const releaseId = results[0].id;
      const statsRes = await fetch(
        `https://api.discogs.com/marketplace/stats/${releaseId}`,
        { headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': '4EverMemoriesRecords/1.0' } }
      );
      const stats = await statsRes.json();

      if (stats.lowest_price?.value) discogs = stats.lowest_price.value.toFixed(2);
      else if (stats.median?.value) discogs = stats.median.value.toFixed(2);

      notes = `Found on Discogs: ${results[0].title}`;
    } else {
      notes = 'Not found on Discogs';
    }

    // Claude estimates eBay + Popsike
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Estimate eBay sold price and Popsike auction price for: "${artist}" - "${title}". Discogs price is ${discogs ? '$' + discogs : 'unknown'}.
Return ONLY JSON: {"ebay": "price or null", "popsike": "price or null", "recommended": "suggested sell price or null"}`,
        }],
      }),
    });
    const aiData = await aiRes.json();
    const aiText = aiData.content[0].text.replace(/```json|```/g, '').trim();
    const aiPricing = JSON.parse(aiText);

    return res.status(200).json({
      discogs,
      ebay: aiPricing.ebay,
      popsike: aiPricing.popsike,
      recommended: aiPricing.recommended || discogs,
      confidence: discogs ? 'high' : 'medium',
      notes,
    });

  } catch (err) {
    console.error('Pricing error:', err);
    return res.status(500).json({ error: 'Pricing lookup failed' });
  }
}
