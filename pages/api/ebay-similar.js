async function getEbayToken(clientId, clientSecret) {
  const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');
  const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + credentials,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });
  const data = await tokenRes.json();
  return data.access_token;
}

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { artist } = req.query;
  if (!artist) return res.status(400).json({ error: 'artist required' });

  try {
    const token = await getEbayToken(
      process.env.EBAY_CLIENT_ID,
      process.env.EBAY_CLIENT_SECRET
    );
    const campaignId = process.env.EBAY_EPN_CAMPAIGN_ID || '';
    const cleanArtist = stripAccents(artist);

    const query = encodeURIComponent(cleanArtist + ' memorabilia poster book collectible');
    const res2 = await fetch(
      'https://api.ebay.com/buy/browse/v1/item_summary/search?q=' + query + '&limit=8',
      {
        headers: {
          'Authorization': 'Bearer ' + token,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=' + campaignId + ',contextualLocation=country=US,zip=78501',
        },
      }
    );
    const data = await res2.json();
    const memorabilia = (data.itemSummaries || []).map(function(item) {
      return {
        title: item.title,
        price: parseFloat(item.price && item.price.value ? item.price.value : 0).toFixed(2),
        condition: item.condition || 'Unknown',
        image: item.image && item.image.imageUrl ? item.image.imageUrl : null,
        url: item.itemAffiliateWebUrl || item.itemWebUrl || '',
      };
    });

    return res.status(200).json({ memorabilia });
  } catch (err) {
    console.error('eBay similar error:', err);
    return res.status(500).json({ error: 'eBay lookup failed' });
  }
}
