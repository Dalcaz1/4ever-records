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
        { headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': '4EverMemoriesR
