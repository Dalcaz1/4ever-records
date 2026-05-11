export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { artist, title, format } = req.query;
  if (!artist) return res.status(400).json({ error: 'artist required' });

  try {
    const isAlbum = (format && format.indexOf('12') !== -1) || format === 'CD' || format === 'Cassette' || format === '8-Track';
    const query = isAlbum
      ? artist + ' ' + title + ' full album'
      : artist + ' ' + title + ' official';

    const searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(query) + '&type=video&maxResults=1&key=' + process.env.YOUTUBE_API_KEY;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      return res.status(500).json({ error: 'YouTube API error' });
    }

    const items = data.items || [];
    if (items.length === 0) return res.status(200).json({ videoId: null });

    const videoId = items[0].id.videoId;
    const videoTitle = items[0].snippet.title;

    return res.status(200).json({ videoId, videoTitle });
  } catch (err) {
    console.error('YouTube search error:', err);
    return res.status(500).json({ error: 'YouTube search failed' });
  }
}
