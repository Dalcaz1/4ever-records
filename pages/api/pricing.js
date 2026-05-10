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

      // Return debug here before Claude call
      return res.status(200).json({
        debug: true,
        discogs,
        notes,
        stats,
        results_count: results.length,
      });
    }

    return res.status(200).json({ debug: true, discogs: null, notes: 'Not found', results_count: 0 });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
