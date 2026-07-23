export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { limit = 8, offset = 0, category, genre, search, sortBy = 'created_at', sortDir = 'desc', active } = req.query;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const validSortFields = ['created_at', 'price', 'artist', 'title', 'year', 'condition', 'category'];
    const validSortDirs = ['asc', 'desc'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortDir = validSortDirs.includes(sortDir) ? sortDir : 'desc';

    // FIX (July 22 session, direct user report — real sold items with real
    // SKUs, sold_at, and sold_price on file were completely invisible to
    // the admin's own "Manage Inventory" search, with no way to tell a
    // genuine confirmed sale apart from "this SKU doesn't exist" from the
    // UI alone): this previously hardcoded .eq('active', true) no matter
    // what the caller asked for — active=false or active=all had no
    // effect at all. There was no way to view sold inventory through this
    // app's own search, ever, which is exactly what made two real,
    // legitimately sold records look like a mysterious SKU gap.
    //
    // The public storefront (browse.js, index.js, inventory.js) all call
    // this endpoint with no active param at all and must keep seeing only
    // active=true — sold items should never appear for sale publicly.
    // That default is preserved exactly. Only a caller that explicitly
    // asks for active=false or active=all, AND proves it's the trusted
    // admin app, gets anything else — sold prices and sale history are
    // genuinely sensitive data this app was otherwise about to make
    // reachable by anyone who knew to add a query param, on an endpoint
    // (like every other admin endpoint in this app) with no auth check at
    // all up to this point.
    const wantsNonDefault = active === 'false' || active === 'all';
    if (wantsNonDefault) {
      const adminSecret = req.headers['x-4ever-admin'];
      if (!adminSecret || adminSecret !== process.env.ADMIN_SHARED_SECRET) {
        return res.status(401).json({ error: 'Viewing inactive/sold records requires admin authentication' });
      }
    }

    let query = supabase
      .from('records')
      .select('*', { count: 'exact' })
      .order(safeSortBy, { ascending: safeSortDir === 'asc' });

    if (active === 'all' && wantsNonDefault) {
      // no active filter at all — both active and sold/inactive
    } else if (active === 'false' && wantsNonDefault) {
      query = query.eq('active', false);
    } else {
      query = query.eq('active', true); // the safe, public-facing default
    }

    if (category) query = query.eq('category', category);
    if (genre) query = query.eq('genre', genre);
    if (search) query = query.or('artist.ilike.%' + search + '%,title.ilike.%' + search + '%,label.ilike.%' + search + '%,genre.ilike.%' + search + '%');
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch records' });
    }
    return res.status(200).json({ records: data, total: count });
  } catch (err) {
    console.error('Records API error:', err);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
}
