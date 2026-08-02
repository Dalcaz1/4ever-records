import Head from 'next/head';
import Link from 'next/link';

// Only these columns are ever sent to the browser / a crawler. Deliberately
// excludes internal-only fields like `cost`, `notes`, `identity_conflict_note` —
// the previous public lookup (`/api/get-record.js`, still used by the quick-view
// modal on /browse) does `select('*')` and has been silently leaking dealer cost
// to anyone who opens devtools on a record's network request. Not fixed here
// (out of scope for this page), but worth closing separately.
const PUBLIC_FIELDS = [
  'id', 'sku', 'artist', 'title', 'label', 'year', 'genre', 'condition',
  'price', 'description', 'photo_cover', 'photo_a', 'photo_b', 'photo_c',
  'catalog_number', 'country', 'pressing', 'category', 'active',
  'sold_price', 'sold_at', 'discogs_listing_url', 'created_at',
];

async function fetchPublicRecord(id) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const { data, error } = await supabase
    .from('records')
    .select(PUBLIC_FIELDS.join(','))
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data;
}

export async function getStaticPaths() {
  // Pre-build only the most recent 200 at deploy time — everything else
  // renders on first real visit via fallback: 'blocking' and gets cached
  // from then on. Keeps builds fast as the catalog grows.
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const { data } = await supabase
    .from('records')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(200);
  return {
    paths: (data || []).map(r => ({ params: { id: r.id } })),
    fallback: 'blocking',
  };
}

export async function getStaticProps({ params }) {
  const record = await fetchPublicRecord(params.id);
  if (!record) return { notFound: true };
  return {
    props: { record },
    // Sold status / price can change; re-render in the background at most
    // every 5 minutes rather than on every request.
    revalidate: 300,
  };
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ''; }
}

export default function RecordDetailPage({ record }) {
  if (!record) return null;

  const isSold = record.active === false;
  const siteUrl = 'https://www.4evermemoriesrecordstore.com';
  const pageUrl = `${siteUrl}/records/${record.id}`;
  const displayPrice = isSold && record.sold_price != null ? record.sold_price : record.price;

  const titleTag = `${record.artist} — ${record.title}${record.year ? ' (' + record.year + ')' : ''} | 4 Ever Memories Records`;
  const descBits = [
    record.category, record.label, record.year ? `${record.year}` : null,
    record.condition ? `condition ${record.condition}` : null,
    record.catalog_number ? `catalog # ${record.catalog_number}` : null,
  ].filter(Boolean).join(' · ');
  const metaDescription = isSold
    ? `${record.artist} "${record.title}" — ${descBits}. Sold at 4 Ever Memories Records${record.sold_at ? ' on ' + formatDate(record.sold_at) : ''}. Browse our current in-stock vinyl, CDs, and cassettes.`
    : `${record.artist} "${record.title}" — ${descBits}. $${Number(record.price).toFixed(2)}. In stock now at 4 Ever Memories Records.`;

  return (
    <>
      <Head>
        <title>{titleTag}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={titleTag} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={pageUrl} />
        {record.photo_cover && <meta property="og:image" content={record.photo_cover} />}
        {/* Sold items stay indexable on purpose — they're real, useful search
            results ("is this pressing worth anything", "did you have X") even
            after the item itself is gone, and they funnel traffic back to the
            live store. Only truly broken/removed records should ever get
            noindex, which getStaticProps' notFound already handles. */}
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: `${record.artist} — ${record.title}`,
          image: record.photo_cover ? [record.photo_cover] : undefined,
          description: metaDescription,
          sku: record.sku,
          brand: record.label ? { '@type': 'Brand', name: record.label } : undefined,
          offers: {
            '@type': 'Offer',
            url: pageUrl,
            priceCurrency: 'USD',
            price: displayPrice != null ? Number(displayPrice).toFixed(2) : undefined,
            availability: isSold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          },
        }) }} />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#e8d5b0', fontFamily: 'Georgia, serif', padding: '24px 16px 60px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <Link href="/browse" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none' }}>← Back to all records</Link>

          <div style={{ marginTop: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '220px', height: '220px', borderRadius: '10px', overflow: 'hidden', background: '#111', border: '1px solid #2a2a2a', flexShrink: 0 }}>
              {record.photo_cover ? (
                <img src={record.photo_cover} alt={`${record.artist} — ${record.title}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>💿</div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '240px' }}>
              {isSold && (
                <div style={{ display: 'inline-block', background: '#2a1a0a', border: '1px solid #7a5a2a', color: '#e8b86a', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', borderRadius: '6px', padding: '4px 10px', marginBottom: '10px' }}>
                  Sold at the Store{record.sold_at ? ' — ' + formatDate(record.sold_at) : ''}
                </div>
              )}
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', margin: '0 0 4px' }}>{record.title}</h1>
              <div style={{ fontSize: '16px', color: '#ddd', fontStyle: 'italic', marginBottom: '12px' }}>{record.artist}{record.year ? ` · ${record.year}` : ''}</div>

              {!isSold && (
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#c9a84c', marginBottom: '14px' }}>${Number(record.price).toFixed(2)}</div>
              )}

              <div style={{ fontSize: '13px', color: '#bbb', lineHeight: 1.8 }}>
                {record.label && <div>Label: <span style={{ color: '#e8d5b0' }}>{record.label}</span></div>}
                {record.category && <div>Format: <span style={{ color: '#e8d5b0' }}>{record.category}</span></div>}
                {record.condition && <div>Condition: <span style={{ color: '#e8d5b0' }}>{record.condition}</span></div>}
                {record.catalog_number && <div>Catalog #: <span style={{ color: '#e8d5b0' }}>{record.catalog_number}</span></div>}
                {record.country && <div>Country: <span style={{ color: '#e8d5b0' }}>{record.country}</span></div>}
                {record.pressing && <div>Pressing: <span style={{ color: '#e8d5b0' }}>{record.pressing}</span></div>}
              </div>

              {record.description && (
                <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6, marginTop: '16px' }}>{record.description}</p>
              )}

              <div style={{ marginTop: '24px' }}>
                {isSold ? (
                  <Link href="/browse" style={{ display: 'inline-block', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8d5b0', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none' }}>
                    See what's in stock now →
                  </Link>
                ) : (
                  <Link href={`/browse?record=${record.id}`} style={{ display: 'inline-block', background: '#c9a84c', color: '#0d0d0d', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                    Buy This Record →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
