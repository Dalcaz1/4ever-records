export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { artist, title } = req.query;
  if (!artist || !title) return res.status(400).json({ error: 'Missing artist or title' });

  try {
    const token = process.env.DISCOGS_TOKEN;
    const titleQuery = encodeURIComponent(title);
    const artistQuery = encodeURIComponent(artist);

    const searchRes = await fetch(
      `https://api.discogs.com/database/search?title=${titleQuery}&artist=${artistQuery}&per_page=5`,
      { headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': '4EverMemoriesRecords/1.0' } }
    );
    const searchData = await searchRes.json();

    // Return debug info so we can see what Discogs is returning
    return res.status(200).json({
      debug: true,
      token_exists: !!token,
      token_preview: token ? token.slice(0, 8) + '...' : 'MISSING',
      search_status: searchRes.status,
      results_count: searchData.results?.length || 0,
      first_result: searchData.results?.[0] || null,
      raw_response: searchData,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
