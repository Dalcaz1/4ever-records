export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { limit = 8, offset = 0, category, genre, search, sortBy = 'created_at', sortDir = 'desc', id } = req.query;
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

    let query = supabase
      .from('records')
      .select('*', { count: 'exact' })
      .eq('active', true)
      .order(safeSortBy, { ascending: safeSortDir === 'asc' });

    if (category) query = query.eq('category', category);
    if (genre) query = query.eq('genre', genre);
    if (id) query = query.eq('id', id);
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
