// FIX (July 22 session, direct instruction from the app owner): "When 4
// Ever Admin does a scan, every piece of it should be done using FYT which
// is supposed to be our ultimate scan, identify and price mechanism." The
// actual AI identification/pricing backend has always correctly been
// shared (this app calls FYT's own /api/identify, /api/scan, /api/pricing
// directly) — but the CLIENT-SIDE format definitions, capture guide
// settings, and year-backfill logic were two independently hand-maintained
// copies that had already measurably drifted (confirmed real bugs: Picture
// Disc types missing entirely here, year backfill existing only here and
// not on FYT, a picture-disc capture guide neither app had).
//
// This script is the actual fix, not just today's cleanup: it runs before
// every single build (and every local dev server start — see package.json
// prebuild/predev), fetching the current canonical files directly from
// findyourtunes' own GitHub repo. This app cannot build without pulling
// whatever is currently there. A fix made once in FYT is a fix made
// everywhere, permanently, by construction — not by remembering to copy
// files over.
//
// Direct, honest tradeoff: this makes a build-time network dependency on
// GitHub's raw content being reachable. That's about as reliable as
// anything in this stack already depends on (Vercel itself, Supabase, the
// Anthropic API), but it is a real dependency, not a hypothetical one. If
// this script fails, the build fails loudly with a clear message — on
// purpose. Silently falling back to a stale local copy would just
// reintroduce the exact "quietly out of sync" problem this exists to solve.

const https = require('https');
const fs = require('fs');
const path = require('path');

const FILES = ['scanFormats.js', 'captureGuide.js', 'yearBackfill.js', 'discogsLookup.js'];
const BASE_URL = 'https://raw.githubusercontent.com/Dalcaz1/findyourtunes/main/shared/';
const OUT_DIR = path.join(__dirname, '..', 'shared');

// findyourtunes is a private repository — unauthenticated raw.githubusercontent.com
// requests 404 even for a real, existing file. Needs a token with at least
// read access to that repo. Set as FYT_SHARED_SYNC_TOKEN in this project's
// Vercel environment variables (and in .env.local for local dev) — a
// fine-grained GitHub personal access token scoped to read-only contents
// access on Dalcaz1/findyourtunes is sufficient, no broader scope needed.
const TOKEN = process.env.FYT_SHARED_SYNC_TOKEN;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': '4ever-records-sync-script' };
    if (TOKEN) headers['Authorization'] = 'token ' + TOKEN;
    https.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`${url} returned HTTP ${res.statusCode}${!TOKEN ? ' (FYT_SHARED_SYNC_TOKEN is not set — findyourtunes is a private repo and needs an authenticated request)' : ''}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const results = await Promise.allSettled(
    FILES.map(async (name) => {
      const text = await fetchText(BASE_URL + name);
      if (!text || text.trim().length === 0) {
        throw new Error(`${name} came back empty — refusing to write an empty shared file`);
      }
      fs.writeFileSync(path.join(OUT_DIR, name), text);
      return name;
    })
  );

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error('\n❌ Failed to sync shared/ files from findyourtunes:');
    failures.forEach(f => console.error('   ' + f.reason.message));
    console.error(
      '\nThis build depends on findyourtunes\' shared/ directory being ' +
      'reachable on GitHub — by design, so this app can never silently ' +
      'build against stale or drifted scan/identify logic. Check that ' +
      'FYT_SHARED_SYNC_TOKEN is set in this project\'s environment ' +
      'variables (a GitHub token with read access to the private ' +
      'Dalcaz1/findyourtunes repo), and that its main branch still has a ' +
      'shared/ directory with these files.\n'
    );
    process.exit(1);
  }

  console.log('✅ Synced shared/ files from findyourtunes:', FILES.join(', '));
}

main().catch((err) => {
  console.error('❌ Unexpected error syncing shared/ files:', err);
  process.exit(1);
});
