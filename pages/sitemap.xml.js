const SITE_URL = 'https://www.4evermemoriesrecordstore.com';

function toXml(urls) {
  const body = urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq || 'weekly'}</changefreq>
    <priority>${u.priority || '0.5'}</priority>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Deliberately no .eq('active', ...) filter — sold records get a page in
  // the sitemap same as active ones, since dropping out of /browse means
  // the sitemap is the ONLY discovery path left for a sold item's page.
  const { data } = await supabase
    .from('records')
    .select('id, updated_at, created_at, active')
    .order('created_at', { ascending: false })
    .limit(5000);

  const staticUrls = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/browse`, changefreq: 'daily', priority: '0.9' },
  ];

  const recordUrls = (data || []).map(r => ({
    loc: `${SITE_URL}/records/${r.id}`,
    lastmod: (r.updated_at || r.created_at || '').slice(0, 10) || undefined,
    changefreq: r.active === false ? 'monthly' : 'weekly',
    priority: r.active === false ? '0.3' : '0.6',
  }));

  res.setHeader('Content-Type', 'text/xml');
  res.write(toXml([...staticUrls, ...recordUrls]));
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
