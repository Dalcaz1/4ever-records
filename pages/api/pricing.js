function stripAccents(str) {
  if (!str) return '';
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function cleanText(str) {
  return stripAccents(str || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMoney(value) {
  var n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatMoney(value) {
  var n = parseMoney(value);
  return n ? n.toFixed(2) : null;
}

function getRangeFromPrices(prices) {
  var nums = (prices || [])
    .map(parseMoney)
    .filter(function (p) { return p && p > 0; })
    .sort(function (a, b) { return a - b; });

  if (!nums.length) return null;

  return {
    low: nums[0].toFixed(2),
    high: nums[nums.length - 1].toFixed(2),
    median: nums[Math.floor(nums.length / 2)].toFixed(2),
    avg: (nums.reduce(function (a, b) { return a + b; }, 0) / nums.length).toFixed(2),
    count: nums.length,
  };
}

function detectReleaseType(format, title, pressing) {
  var f = cleanText(format);
  var t = cleanText(title + ' ' + pressing);

  var isEP = /\bep\b/.test(t) || /\bextended play\b/.test(t);
  var isSingle = /\bsingle\b/.test(t) || /\b45\b/.test(t);
  var isLP = /\blp\b/.test(t) || /\balbum\b/.test(t);

  if (f.indexOf('7') !== -1) return isEP ? 'VINYL_7_EP' : 'VINYL_7_SINGLE';
  if (f.indexOf('12') !== -1) return isLP ? 'VINYL_LP' : 'VINYL_12_SINGLE';
  if (f.indexOf('lp') !== -1 || f.indexOf('album') !== -1) return 'VINYL_LP';
  if (f.indexOf('cd') !== -1) return isSingle ? 'CD_SINGLE' : 'CD_ALBUM';
  if (f.indexOf('cassette') !== -1 || f.indexOf('tape') !== -1) return isSingle ? 'CASSETTE_SINGLE' : 'CASSETTE_ALBUM';
  if (f.indexOf('8') !== -1) return '8_TRACK';

  return 'UNKNOWN';
}

function getExpectedRules(releaseType) {
  var rules = {
    VINYL_7_SINGLE: {
      label: '7" Single',
      requiredAny: ['7', '7"', '45', 'single'],
      rejectAny: ['12"', '12 inch', 'lp', 'album', 'ep', 'cd', 'cassette', 'tape', '8 track'],
    },
    VINYL_7_EP: {
      label: '7" EP',
      requiredAny: ['7', '7"', 'ep'],
      rejectAny: ['12"', '12 inch', 'lp', 'album', 'cd', 'cassette', 'tape', '8 track'],
    },
    VINYL_12_SINGLE: {
      label: '12" Single',
      requiredAny: ['12', '12"', 'single', 'maxi'],
      rejectAny: ['7"', '7 inch', 'lp', 'album', 'cd', 'cassette', 'tape', '8 track'],
    },
    VINYL_LP: {
      label: 'LP / Album',
      requiredAny: ['lp', 'album', 'vinyl'],
      rejectAny: ['7"', '7 inch', '45', '12" single', 'maxi single', 'cd', 'cassette', 'tape', '8 track'],
    },
    CD_ALBUM: {
      label: 'CD Album',
      requiredAny: ['cd'],
      rejectAny: ['vinyl', '7"', '12"', 'lp', 'cassette', 'tape', '8 track'],
    },
    CD_SINGLE: {
      label: 'CD Single',
      requiredAny: ['cd', 'single'],
      rejectAny: ['vinyl', '7"', '12"', 'lp', 'cassette', 'tape', '8 track'],
    },
    CASSETTE_ALBUM: {
      label: 'Cassette Album',
      requiredAny: ['cassette', 'tape'],
      rejectAny: ['vinyl', '7"', '12"', 'lp', 'cd', '8 track'],
    },
    CASSETTE_SINGLE: {
      label: 'Cassette Single',
      requiredAny: ['cassette', 'single'],
      rejectAny: ['vinyl', '7"', '12"', 'lp', 'cd', '8 track'],
    },
    '8_TRACK': {
      label: '8-Track',
      requiredAny: ['8 track', '8-track'],
      rejectAny: ['vinyl', '7"', '12"', 'lp', 'cd', 'cassette'],
    },
    UNKNOWN: {
      label: 'Unknown Format',
      requiredAny: [],
      rejectAny: [],
    },
  };

  return rules[releaseType] || rules.UNKNOWN;
}

function hasAny(text, terms) {
  return (terms || []).some(function (term) {
    return text.indexOf(cleanText(term)) !== -1;
  });
}

function validateMatch(item, expectedRules, artist, title) {
  var fullText = cleanText([
    item.title,
    item.description,
    item.format,
    item.condition,
    item.source,
  ].join(' '));

  var artistWords = cleanText(artist).split(' ').filter(function (w) { return w.length > 2; });
  var titleWords = cleanText(title).split(' ').filter(function (w) { return w.length > 2; });

  var artistMatch = artistWords.length === 0 || artistWords.some(function (w) { return fullText.indexOf(w) !== -1; });
  var titleMatch = titleWords.length === 0 || titleWords.some(function (w) { return fullText.indexOf(w) !== -1; });

  if (!artistMatch) return { accepted: false, reason: 'Artist did not match' };
  if (!titleMatch) return { accepted: false, reason: 'Title did not match' };

  if (hasAny(fullText, expectedRules.rejectAny)) {
    return { accepted: false, reason: 'Wrong format/release type for ' + expectedRules.label };
  }

  if (expectedRules.requiredAny.length && !hasAny(fullText, expectedRules.requiredAny)) {
    return { accepted: false, reason: 'Could not confirm exact format: ' + expectedRules.label };
  }

  return { accepted: true, reason: 'Accepted exact match' };
}

function getFormatSearchTerms(releaseType) {
  switch (releaseType) {
    case 'VINYL_7_SINGLE': return ' 7" 45 single';
    case 'VINYL_7_EP': return ' 7" EP';
    case 'VINYL_12_SINGLE': return ' 12" single maxi';
    case 'VINYL_LP': return ' LP album vinyl';
    case 'CD_ALBUM': return ' CD album';
    case 'CD_SINGLE': return ' CD single';
    case 'CASSETTE_ALBUM': return ' cassette album';
    case 'CASSETTE_SINGLE': return ' cassette single';
    case '8_TRACK': return ' 8 track';
    default: return '';
  }
}

async function getDiscogsPrice(artist, title, token, catalog_number, country, year, releaseType) {
  if (!token) {
    return {
      source: 'Discogs',
      range: null,
      notes: 'Discogs token missing',
      wantHave: null,
      matchesUsed: 0,
      rejected: [],
    };
  }

  const titleQuery = encodeURIComponent(stripAccents(title));
  const artistQuery = encodeURIComponent(stripAccents(artist));
  const headers = {
    Authorization: 'Discogs token=' + token,
    'User-Agent': '4EverMemoriesRecords/1.0',
  };

  var results = [];
  var rejected = [];
  var expectedRules = getExpectedRules(releaseType);

  async function safeDiscogsSearch(url) {
    try {
      const r = await fetch(url, { headers });
      const d = await r.json();
      return d.results || [];
    } catch (e) {
      return [];
    }
  }

  if (catalog_number) {
    results = await safeDiscogsSearch(
      'https://api.discogs.com/database/search?catno=' +
      encodeURIComponent(catalog_number) +
      '&artist=' + artistQuery +
      '&per_page=20'
    );
  }

  if (!results.length) {
    var url = 'https://api.discogs.com/database/search?title=' + titleQuery + '&artist=' + artistQuery + '&per_page=20';
    if (country) url += '&country=' + encodeURIComponent(country);
    if (year) url += '&year=' + encodeURIComponent(year);
    results = await safeDiscogsSearch(url);
  }

  if (!results.length) {
    results = await safeDiscogsSearch(
      'https://api.discogs.com/database/search?q=' +
      encodeURIComponent(stripAccents(artist + ' ' + title + getFormatSearchTerms(releaseType))) +
      '&per_page=20'
    );
  }

  var acceptedPrices = [];
  var acceptedTitles = [];
  var wantHave = null;

  for (var i = 0; i < Math.min(results.length, 10); i++) {
    var result = results[i];

    var item = {
      source: 'Discogs',
      title: result.title || '',
      description: [
        result.format ? result.format.join(' ') : '',
        result.country || '',
        result.year || '',
        result.catno || '',
      ].join(' '),
      format: result.format ? result.format.join(' ') : '',
    };

    var check = validateMatch(item, expectedRules, artist, title);

    if (!check.accepted) {
      rejected.push({
        source: 'Discogs',
        title: result.title || 'Unknown',
        reason: check.reason,
      });
      continue;
    }

    try {
      const statsRes = await fetch('https://api.discogs.com/marketplace/stats/' + result.id, { headers });
      const stats = await statsRes.json();

      var price = null;
      if (stats.median && stats.median.value) price = stats.median.value;
      else if (stats.lowest_price && stats.lowest_price.value) price = stats.lowest_price.value;

      if (price) {
        acceptedPrices.push(price);
        acceptedTitles.push(result.title);
      }

      if (!wantHave && result.community && result.community.want && result.community.have) {
        wantHave = result.community.want + ' want / ' + result.community.have + ' have';
      }
    } catch (e) {
      rejected.push({
        source: 'Discogs',
        title: result.title || 'Unknown',
        reason: 'Discogs stats unavailable',
      });
    }
  }

  var range = getRangeFromPrices(acceptedPrices);

  return {
    source: 'Discogs',
    range: range,
    price: range ? range.median : null,
    notes: range ? 'Discogs exact matches: ' + acceptedTitles.slice(0, 3).join('; ') : 'No exact Discogs price matches',
    wantHave: wantHave,
    matchesUsed: acceptedPrices.length,
    rejected: rejected,
  };
}

async function getEbayPrices(artist, title, releaseType, clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    return {
      source: 'eBay Active',
      range: null,
      matchesUsed: 0,
      topListings: [],
      rejected: [{ source: 'eBay Active', title: 'eBay', reason: 'eBay credentials missing' }],
    };
  }

  try {
    const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + credentials,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return null;

    const formatTerms = getFormatSearchTerms(releaseType);
    const query = encodeURIComponent(stripAccents(artist + ' ' + title + formatTerms));

    const searchRes = await fetch(
      'https://api.ebay.com/buy/browse/v1/item_summary/search?q=' +
      query +
      '&category_ids=176985&limit=30',
      {
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'X-EBAY-C-ENDUSERCTX':
            'affiliateCampaignId=' +
            (process.env.EBAY_EPN_CAMPAIGN_ID || '') +
            ',contextualLocation=country=US,zip=78501',
        },
      }
    );

    const searchData = await searchRes.json();
    const items = searchData.itemSummaries || [];
    const expectedRules = getExpectedRules(releaseType);

    var accepted = [];
    var rejected = [];

    items.forEach(function (i) {
      var item = {
        source: 'eBay Active',
        title: i.title || '',
        description: [
          i.shortDescription || '',
          i.condition || '',
          i.itemLocation ? i.itemLocation.country : '',
        ].join(' '),
        format: '',
        condition: i.condition || '',
      };

      var check = validateMatch(item, expectedRules, artist, title);
      var price = parseMoney(i.price && i.price.value ? i.price.value : null);

      if (!check.accepted) {
        rejected.push({
          source: 'eBay Active',
          title: i.title || 'Unknown',
          reason: check.reason,
        });
        return;
      }

      if (!price) {
        rejected.push({
          source: 'eBay Active',
          title: i.title || 'Unknown',
          reason: 'No usable price',
        });
        return;
      }

      accepted.push({
        title: i.title,
        price: price,
        condition: i.condition || 'Unknown',
        url: i.itemAffiliateWebUrl || i.itemWebUrl,
      });
    });

    var prices = accepted.map(function (i) { return i.price; });
    var range = getRangeFromPrices(prices);

    return {
      source: 'eBay Active',
      range: range,
      lowest: range ? range.low : null,
      avg: range ? range.avg : null,
      median: range ? range.median : null,
      count: accepted.length,
      matchesUsed: accepted.length,
      topListings: accepted.slice(0, 3).map(function (i) {
        return {
          title: i.title,
          price: i.price.toFixed(2),
          condition: i.condition,
          url: i.url,
        };
      }),
      rejected: rejected,
    };
  } catch (err) {
    console.error('eBay pricing error:', err);
    return {
      source: 'eBay Active',
      range: null,
      matchesUsed: 0,
      topListings: [],
      rejected: [{ source: 'eBay Active', title: 'eBay', reason: 'eBay lookup failed' }],
    };
  }
}

function getFutureSourcePlaceholder(sourceName) {
  return {
    source: sourceName,
    range: null,
    matchesUsed: 0,
    status: 'Not connected yet',
    rejected: [],
  };
}

function buildOverallRange(sources) {
  var prices = [];

  sources.forEach(function (s) {
    if (s && s.range) {
      prices.push(s.range.low);
      prices.push(s.range.high);
      prices.push(s.range.median);
    }
  });

  return getRangeFromPrices(prices);
}

function buildSourceBreakdown(sources) {
  return sources.map(function (s) {
    return {
      source: s.source,
      range: s.range ? '$' + s.range.low + ' - $' + s.range.high : null,
      low: s.range ? s.range.low : null,
      high: s.range ? s.range.high : null,
      median: s.range ? s.range.median : null,
      avg: s.range ? s.range.avg : null,
      matchesUsed: s.matchesUsed || 0,
      status: s.status || (s.range ? 'Connected' : 'No exact matches'),
    };
  });
}

function getConfidence(totalMatches, connectedSources) {
  if (connectedSources >= 2 && totalMatches >= 8) return 'high';
  if (connectedSources >= 1 && totalMatches >= 3) return 'medium';
  return 'low';
}

async function getAiRecommendedPrice(params) {
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
        max_tokens: 250,
        messages: [{
          role: 'user',
          content:
            'You are a record store pricing expert. Use ONLY the exact-match pricing data below. Do not invent unavailable source data. Return ONLY JSON with no markdown: {"recommended": "suggested store price like 14.99", "popsike": null, "reason": "short reason"}\n\n' +
            JSON.stringify(params),
        }],
      }),
    });

    const aiData = await aiRes.json();
    const aiText = aiData.content && aiData.content[0] && aiData.content[0].text
      ? aiData.content[0].text.replace(/```json|```/g, '').trim()
      : '';

    return JSON.parse(aiText);
  } catch (err) {
    console.error('AI pricing failed:', err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { artist, title, catalog_number, country, year, pressing, format } = req.query;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Missing artist or title' });
  }

  try {
    const releaseType = detectReleaseType(format || '', title || '', pressing || '');
    const expectedRules = getExpectedRules(releaseType);

    const discogsPromise = getDiscogsPrice(
      artist,
      title,
      process.env.DISCOGS_TOKEN,
      catalog_number || '',
      country || '',
      year || '',
      releaseType
    );

    const ebayPromise = getEbayPrices(
      artist,
      title,
      releaseType,
      process.env.EBAY_CLIENT_ID,
      process.env.EBAY_CLIENT_SECRET
    );

    const discogsResult = await discogsPromise;
    const ebayResult = await ebayPromise;

    const popsikeResult = getFutureSourcePlaceholder('Popsike');
    const musicStackResult = getFutureSourcePlaceholder('MusicStack');
    const cdAndLpResult = getFutureSourcePlaceholder('CDandLP');
    const onlineStoresResult = getFutureSourcePlaceholder('Online Record Stores');
    const auctionSitesResult = getFutureSourcePlaceholder('Auction Sites');

    const sources = [
      discogsResult,
      ebayResult,
      popsikeResult,
      musicStackResult,
      cdAndLpResult,
      onlineStoresResult,
      auctionSitesResult,
    ];

    const connectedSources = sources.filter(function (s) {
      return s && s.range && s.matchesUsed > 0;
    }).length;

    const totalMatches = sources.reduce(function (sum, s) {
      return sum + (s && s.matchesUsed ? s.matchesUsed : 0);
    }, 0);

    const overallRange = buildOverallRange(sources);
    const sourceBreakdown = buildSourceBreakdown(sources);

    var recommended = overallRange ? overallRange.median : null;
    var popsike = null;

    const aiPricing = await getAiRecommendedPrice({
      artist: artist,
      title: title,
      format: format || '',
      exactReleaseType: expectedRules.label,
      year: year || '',
      country: country || '',
      pressing: pressing || '',
      catalog_number: catalog_number || '',
      overallRange: overallRange,
      sourceBreakdown: sourceBreakdown,
      discogsDemand: discogsResult.wantHave || null,
    });

    if (aiPricing) {
      recommended = aiPricing.recommended || recommended;
      popsike = aiPricing.popsike || null;
    }

    const rejectedResults = [];
    sources.forEach(function (s) {
      if (s && s.rejected && s.rejected.length) {
        s.rejected.forEach(function (r) {
          rejectedResults.push(r);
        });
      }
    });

    const confidence = getConfidence(totalMatches, connectedSources);

    return res.status(200).json({
      recordFound: {
        artist: artist,
        title: title,
        format: format || '',
        releaseType: releaseType,
        exactType: expectedRules.label,
        catalog_number: catalog_number || '',
        country: country || '',
        year: year || '',
        pressing: pressing || '',
      },

      discogs: discogsResult.price,
      ebay: ebayResult ? {
        lowest: ebayResult.lowest,
        avg: ebayResult.avg,
        median: ebayResult.median,
        count: ebayResult.count,
        topListings: ebayResult.topListings,
      } : null,
      popsike: popsike,
      recommended: recommended,

      overallMarketRange: overallRange
        ? '$' + overallRange.low + ' - $' + overallRange.high
        : null,

      sourceBreakdown: sourceBreakdown,
      rejectedResults: rejectedResults.slice(0, 25),
      matchedResultsUsed: totalMatches,

      confidence: confidence,
      notes: discogsResult.notes,
      exactMatchRules: {
        expected: expectedRules.label,
        releaseType: releaseType,
      },
    });
  } catch (err) {
    console.error('Pricing error:', err);
    return res.status(500).json({ error: 'Pricing lookup failed' });
  }
}
