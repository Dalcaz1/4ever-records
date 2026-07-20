// Same-origin proxy to findyourtunes' discogs-admin-connections.js — same
// reasoning as discogs-status.js: server-to-server fetches aren't subject
// to browser extension blocking, only requests the browser itself makes.

const FYT_BASE = 'https://findyourtunes.vercel.app';

export default async function handler(req, res) {
  const adminHeader = { 'x-4ever-admin': process.env.NEXT_PUBLIC_ADMIN_SHARED_SECRET || '' };

  try {
    if (req.method === 'GET') {
      const response = await fetch(
        FYT_BASE + '/api/collection/discogs-admin-connections?_t=' + Date.now(),
        { headers: adminHeader, cache: 'no-store' }
      );
      const data = await response.json();
      return res.status(response.ok ? 200 : response.status).json(data);
    }

    if (req.method === 'POST') {
      const response = await fetch(FYT_BASE + '/api/collection/discogs-admin-connections', {
        method: 'POST',
        headers: { ...adminHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });
      const data = await response.json();
      return res.status(response.ok ? 200 : response.status).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(200).json({ error: 'Could not reach connections manager: ' + err.message });
  }
}
