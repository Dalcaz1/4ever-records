const getEbayToken = async () => {
  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  const data = await res.json();
  return data.access_token;
};

export default async function handler(req, res) {
  const { artist, title } = req.query;

  if (!artist && !title) {
    return res.status(400).json({ error: 'artist or title required' });
  }

  try {
    const token = await getEbayToken();

    const query = encodeURIComponent(`${artist || ''} ${title || ''} vinyl record`.trim());

    const searchRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&category_ids=176985&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'X-EBAY-C-ENDUSERCTX': `affiliateCampaignId=${process.env.EBAY_EPN_CAMPAIGN_ID || ''},contextualLocation=country=US,zip=78501`,
        },
      }
    );

    const data = await searchRes.json();

    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      return res.status(200).json({ results: [], message: 'No eBay listings found' });
    }

    const results = data.itemSummaries.map((item) => ({
      title: item.title,
      price: parseFloat(item.price?.value || 0),
      currency: item.price?.currency || 'USD',
      condition: item.condition || 'Unknown',
      url: item.itemAffiliateWebUrl || item.itemWebUrl,
      image: item.image?.imageUrl || null,
    }));

    const prices = results.map((r) => r.price).filter((p) => p > 0);
    const avgPrice = prices.length
      ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
      : null;
    const lowestPrice = prices.length ? Math.min(...prices).toFixed(2) : null;

    return res.status(200).json({
      results,
      summary: {
        count: results.length,
        lowestPrice,
        avgPrice,
      },
    });
  } catch (err) {
    console.error('eBay API error:', err);
    return res.status(500).json({ error: 'eBay API error', detail: err.message });
  }
}
