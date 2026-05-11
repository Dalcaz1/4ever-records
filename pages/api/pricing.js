function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getFormatSearchTerms(format) {
  if (!format) return '';
  if (format.indexOf('7') !== -1) return ' 45rpm 7 inch single';
  if (format.indexOf('12') !== -1) return ' LP album 12 inch vinyl';
  if (format === 'CD') return ' CD album';
  if (format === 'Cassette') return ' cassette tape';
  if (format === '8-Track') return ' 8 track';
  return '';
}

async function getDiscogsPrice(artist, title, token, catalog_number, country, year) {
  const titleQuery = encodeURIComponent(stripAccents(title));
  const artistQuery = encodeURIComponent(stripAccents(artist));
  const headers = {
    'Authorization': 'Discogs token=' + token,
    'User-Agent': '4EverMemoriesRecords/1.0',
  };

  var results = [];

  if (catalog_number) {
    const catRes = await fetch(
      'https://api.discogs.com/database/search?catno=' + encodeURIComponent(catalog_number) + '&artist=' + artistQuery + '&per_page=10',
      { headers }
    );
    const catData = await catRes.json();
    results = catData.results || [];
  }

  if (results.length === 0) {
    var url = 'https://api.discogs.com/database/search?title=' + titleQuery + '&artist=' + artistQuery + '&per_page=10';
    if (country) url += '&country=' + encodeURIComponent(country);
    if (year) url += '&year=' + encodeURIComponent(year);
    const searchRes = await fetch(url, { headers });
    const searchData = await searchRes.json();
    results = searchData.results || [];
  }

  if (results.length === 0) {
    const searchRes = await fetch(
      'https://api.discogs.com/database/search?title=' + titleQuery + '&artist=' + artistQuery + '&per_page=10',
      { headers }
    );
    const searchData = await searchRes.json();
    results = searchData.results || [];
  }

  if (results.length === 0) {
    const fallbackRes = await fetch(
      'https://api.discogs.com/database/search?q=' + titleQuery + '+' + artistQuery + '&per_page=10',
      { headers }
    );
    const fallbackData = await fallbackRes.json();
    results = fallbackData.results || [];
  }

  if (results.length === 0) {
    const titleOnlyRes = await fetch(
      'https://api.discogs.com/database/search?q=' + titleQuery + '&per_page=10',
      { headers }
    );
    const titleOnlyData = await titleOnlyRes.json();
    results = titleOnlyData.results || [];
  }

  if (results.length === 0) return { price: null, notes: 'Not found on Discogs', wantHave: null };

  var bestPrice = null;
  var bestNotes = '';
  var wantHave = null;

  for (var i = 0; i < Math.min(results.length, 5); i++) {
    var result = results[i];
    const statsRes = await fetch(
      'https://api.discogs.com/marketplace/stats/' + result.id,
      { headers }
    );
    const stats = await statsRes.json();
    var price = null;
    if (stats.lowest_price && stats.lowest_price.value) {
      price = stats.lowest_price.value;
    } else if (stats.median && stats.median.value) {
      price = stats.median.value;
    }
    if (price && (!bestPrice || price < bestPrice)) {
      bestPrice = price;
      bestNotes = 'Found on Discogs: ' + result.title;
      if (result.community && result.community.want && result.community.have) {
        wantHave = result.community.want + ' want / ' + result.community.have + ' have';
      }
    }
  }

  return {
    price: bestPrice ? bestPrice.toFixed(2) : null,
    notes: bestNotes || 'Found on Discogs but no price data',
    wantHave: wantHave,
  };
}

async function getEbayPrices(artist, title, format, clientId, clientSecret) {
  try {
    const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + credentials,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return null;

    const formatTerms = getFormatSearchTerms(format);
    const query = encodeURIComponent(stripAccents(artist) + ' ' + stripAccents(title) + formatTerms);

    const searchRes = await fetch(
      'https://api.ebay.com/buy/browse/v1/item_summary/search?q=' + query + '&category_ids=176985&limit=15',
      {
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=' + (process.env.EBAY_EPN_CAMPAIGN_ID || '') + ',contextualLocation=country=US,zip=78501',
        },
      }
    );
    const searchData = await searchRes.json();
    const items = searchData.itemSummaries || [];
    if (items.length === 0) return null;

    const prices = items
      .map(function(i) { return parseFloat(i.price && i.price.value ? i.price.value : 0); })
      .filter(function(p) { return p > 0; })
      .sort(function(a, b) { return a - b; });

    const lowest = prices.length ? prices[0].toFixed(2) : null;
    const avg = prices.length ? (prices.reduce(function(a, b) { return a + b; }, 0) / prices.length).toFixed(2) : null;
    const median = prices.length ? prices[Math.floor(prices.length / 2)].toFixed(2) : null;

    const topListings = items.slice(0, 3).map(function(i) {
      return {
        title: i.title,
        price: parseFloat(i.price && i.price.value ? i.price.value : 0).toFixed(2),
        condition: i.condition || 'Unknown',
        url: i.itemAffiliateWebUrl || i.itemWebUrl,
      };
    });

    return {
      lowest: lowest,
      avg: avg,
      median: median,
      count: prices.length,
      topListings: topListings,
    };
  } catch (err) {
    console.error('eBay pricing error:', err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { artist, title, catalog_number, country, year, pressing, format } = req.query;
  if (!artist || !title) return res.status(400).json({ error: 'Missing artist or title' });

  try {
    const discogsPromise = getDiscogsPrice(
      artist, title,
      process.env.DISCOGS_TOKEN,
      catalog_number || '',
      country || '',
      year || ''
    );
    const ebayPromise = getEbayPrices(
      artist, title,
      format || '',
      process.env.EBAY_CLIENT_ID,
      process.env.EBAY_CLIENT_SECRET
    );

    const discogsResult = await discogsPromise;
    const ebayResult = await ebayPromise;

    const discogs = discogsResult.price;
    const ebay = ebayResult ? {
      lowest: ebayResult.lowest,
      avg: ebayResult.avg,
      median: ebayResult.median,
      count: ebayResult.count,
      topListings: ebayResult.topListings,
    } : null;

    var recommended = discogs || (ebayResult ? ebayResult.avg : null);
    var popsike = null;

    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: 'You are a vinyl record pricing expert. Give a recommended sell price for: Artist: "' + artist + '" Title: "' + title + '" Format: ' + (format || 'unknown') + ' Year: ' + (year || 'unknown') + ' Country: ' + (country || 'unknown') + ' Pressing: ' + (pressing || 'unknown') + ' Catalog: ' + (catalog_number || 'unknown') + ' Discogs lowest: ' + (discogs ? '$' + discogs : 'not found') + ' Discogs demand: ' + (discogsResult.wantHave || 'unknown') + ' eBay lowest: $' + (ebayResult ? ebayResult.lowest : 'unknown') + ' eBay avg: $' + (ebayResult ? ebayResult.avg : 'unknown') + ' eBay count: ' + (ebayResult ? ebayResult.count : 0) + ' listings. Return ONLY JSON with no markdown: {"popsike": "estimated auction price or null", "recommended": "suggested sell price"}',
          }],
        }),
      });
      const aiData = await aiRes.json();
      const aiText = aiData.content[0].text.replace(/```json|```/g, '').trim();
      const aiPricing = JSON.parse(aiText);
      popsike = aiPricing.popsike;
      recommended = aiPricing.recommended || recommended;
    } catch (aiErr) {
      console.error('AI pricing failed:', aiErr);
    }

    return res.status(200).json({
      discogs: discogs,
      ebay: ebay,
      popsike: popsike,
      recommended: recommended,
      confidence: discogs && ebay ? 'high' : (discogs || ebay) ? 'medium' : 'low',
      notes: discogsResult.notes,
    });
  } catch (err) {
    console.error('Pricing error:', err);
    return res.status(500).json({ error: 'Pricing lookup failed' });
  }
}
