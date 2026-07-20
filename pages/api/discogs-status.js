// FIX (July 19 session — real bug caught live): the Discogs status
// check was calling FYT_BASE's /api/collection/discogs-auth directly
// from the browser. Confirmed live: Brave Shields (and likely other
// privacy/ad-blocking extensions) intercepted this specific
// cross-origin request with a 0ms synthetic failure — almost
// certainly because the URL contains "auth", a word privacy blockers
// commonly flag as tracking/authentication-related on third-party
// requests. Requiring visitors to disable their ad blocker isn't a
// real fix for a business tool, so this proxies the check through
// 4ever-records' own backend instead — server-to-server fetches are
// never subject to browser extension blocking, only requests the
// browser itself makes are.

const FYT_BASE = 'https://findyourtunes.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // FIX (multi-account Discogs switching): no more hardcoded email —
    // the backend now reports whichever store_discogs_connections row is
    // currently active, so this just asks "what's active right now."
    const response = await fetch(
      FYT_BASE + '/api/collection/discogs-auth?check=1&_t=' + Date.now(),
      { headers: { 'x-4ever-admin': process.env.NEXT_PUBLIC_ADMIN_SHARED_SECRET || '' }, cache: 'no-store' }
    );
    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      // Not valid JSON — likely an HTML page (e.g. Vercel's own
      // deployment/access protection intercepting the request before it
      // ever reaches our function code). Surface a snippet so this is
      // distinguishable from a genuine application-level error.
      console.error('discogs-status proxy: non-JSON response', response.status, rawText.slice(0, 300));
      return res.status(200).json({
        connected: false, username: null,
        error: 'Upstream returned non-JSON (status ' + response.status + '): ' + rawText.slice(0, 150).replace(/\s+/g, ' '),
      });
    }
    if (!response.ok) {
      console.error('discogs-status proxy: upstream failed', response.status, data);
      return res.status(200).json({ connected: false, username: null, error: data.error || 'Status check returned ' + response.status, debug: data.debug || null });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({ connected: false, username: null, error: 'Could not reach status check: ' + err.message });
  }
}
// redeploy trigger: env var update (2026-07-20T04:12:00Z)
