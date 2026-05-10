function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { artist, title } = req.query;
  if (!artist || !title) return res.status(400).json({ error: 'Missing artist or title' });

  try {
    const token = process.env.DISCOGS_TOKEN;
    const titleQuery = encodeURIComponent(stripAccents(title));
    const artistQuery = encodeURIComponent(stripAccents(artist));

    const searchUrl = 'https://api.discogs.com/database/search?title=' + titleQuery + '&artist=' + artistQuery + '&per_page=5';
    const headers = { 'Authorization': 'Discogs token=' + token, 'User-Agent': '4EverMemoriesRecords/1.0' };

    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();
    let results = searchData.results || [];

    if (results.length === 0) {
      const fallbackUrl = 'https://api.discogs.com/database/search?q=' + titleQuery + '&per_page=5';
      const fallbackRes = await fetch(fallbackUrl, { headers });
      const fallbackData = await fallbackRes.json();
      results = fallbackData.results || [];
    }

    let discogs = null;
    let notes = '';

    if (results.length > 0) {
      const releaseId = results[0].id;
      const statsUrl = 'https://api.discogs.com/marketplace/stats/' + releaseId;
      const statsRes = await fetch(statsUrl, { headers });
      const stats = await statsRes.json();

      if (stats.lowest_price && stats.lowest_price.value) {
        discogs = stats.lowest_price.value.toFixed(2);
      } else if (stats.median && stats.median.value) {
        discogs = stats.median.value.toFixed(2);
      }

      notes = 'Found on Discogs: ' + results[0].title;
    } else {
      notes = 'Not found on Discogs';
    }

    let ebay = null;
    let popsike = null;
    let recommended = discogs;

    try {
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
            content: 'Estimate eBay sold price and Popsike auction price for: "' + artist + '" - "' + title + '". Discogs price is ' + (discogs ? '$' + discogs : 'unknown') + '. Return ONLY JSON: {"ebay": "price or null", "popsike": "price or null", "recommended": "suggested sell price or null"}',
          }],
        }),
      });
      const aiData = await aiRes.json();
      const aiText = aiData.content[0].text.replace(/```json|```/g, '').trim();
      const aiPricing = JSON.parse(aiText);
      ebay = aiPricing.ebay;
      popsike = aiPricing.popsike;
      recommended = aiPricing.recommended || discogs;
    } catch (aiErr) {
      console.error('AI pricing failed:', aiErr);
    }

    return res.status(200).json({
      discogs,
      ebay,
      popsike,
      recommended,
      confidence: discogs ? 'high' : 'medium',
      notes,
    });

  } catch (err) {
    console.error('Pricing error:', err);
    return res.status(500).json({ error: 'Pricing lookup failed' });
  }
}
