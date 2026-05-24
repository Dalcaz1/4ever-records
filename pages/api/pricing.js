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

function wordScore(sourceText, targetText) {
  var source = cleanText(sourceText);
  var words = cleanText(targetText)
    .split(' ')
    .filter(function (w) { return w.length > 2; });

  if (!words.length) return 1;

  var hits = words.filter(function (w) {
    return source.indexOf(w) !== -1;
  }).length;

  return hits / words.length;
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

  var artistScore = wordScore(fullText, artist);
  var titleScore = wordScore(fullText, title);

  if (artistScore < 0.5) {
    return { accepted: false, reason: 'Artist did not match closely enough' };
  }

  if (titleScore < 0.5) {
    return { accepted: false, reason: 'Title did not match closely enough' };
  }

  if (hasAny(fullText, expectedRules.rejectAny)) {
    return { accepted: false, reason: 'Wrong format/release type' };
  }

  if (expectedRules.requiredAny.length && !hasAny(fullText, expectedRules.requiredAny)) {
    return { accepted: false, reason: 'Could not confirm exact format' };
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
    case 'CASSETTE_ALBUM': return ' cassette tape';
    case 'CASSETTE_SINGLE': return ' cassette single';
    case '8_TRACK': return ' 8 track';
    default: return '';
  }
}

function isSpanishOrRegionalLikely(artist, title, genre, label) {
  var text = cleanText([artist, title, genre, label].join(' '));
  var terms = [
    'tejano',
    'conjunto',
    'norteno',
    'norteño',
    'regional mexican',
    'spanish',
    'mexican',
    'mazz',
    'freddie',
    'latin',
  ];

  return terms.some(function (term) {
    return text.indexOf(cleanText(term)) !== -1;
  });
}

function buildSearchUrl(source, artist, title, releaseType) {
  var q = encodeURIComponent(stripAccents(artist + ' ' + title + getFormatSearchTerms(releaseType)));

  if (source === 'eBay Sold') return 'https://www.ebay.com/sch/i.html?_nkw=' + q + '&LH_Sold=1&LH_Complete=1';
  if (source === 'Popsike') return 'https://www.popsike.com/php/quicksearch.php?searchtext=' + q;
  if (source === 'MusicStack') return 'https://www.musicstack.com/search/' + q;
  if (source === 'CDandLP') return 'https://www.cdandlp.com/en/search/?q=' + q;
  if (source === 'Online Record Stores') return 'https://www.google.com/search?q=' + q + '+record+store';
  if (source === 'Auction Sites') return 'https://www.google.com/search?q=' + q + '+auction+sold';

  return null;
}

async function getDiscogsPrice(artist, title, token, catalog_number, country, year, releaseType) {
  if (!token) {
    return {
      source: 'Discogs',
      sourceType: 'verified_api',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [{ source: 'Discogs', title: 'Discogs', reason: 'Discogs token missing' }],
    };
  }

  const headers = {
    Authorization: 'Discogs token=' + token,
    'User-Agent': '4EverMemoriesRecords/2.1',
  };

  var expectedRules = getExpectedRules(releaseType);
  var results = [];
  var rejected = [];

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
      '&artist=' +
      encodeURIComponent(stripAccents(artist)) +
      '&per_page=25'
    );
  }

  if (!results.length) {
    var url =
      'https://api.discogs.com/database/search?title=' +
      encodeURIComponent(stripAccents(title)) +
      '&artist=' +
      encodeURIComponent(stripAccents(artist)) +
      '&per_page=25';

    if (country) url += '&country=' + encodeURIComponent(country);
    if (year) url += '&year=' + encodeURIComponent(year);

    results = await safeDiscogsSearch(url);
  }

  if (!results.length) {
    results = await safeDiscogsSearch(
      'https://api.discogs.com/database/search?q=' +
      encodeURIComponent(stripAccents(artist + ' ' + title + getFormatSearchTerms(releaseType))) +
      '&per_page=25'
    );
  }

  var prices = [];
  var listings = [];

  for (var i = 0; i < Math.min(results.length, 15); i++) {
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
      const statsRes = await fetch(
        'https://api.discogs.com/marketplace/stats/' + result.id,
        { headers }
      );

      const stats = await statsRes.json();

      var price = null;
      var priceType = null;

      if (stats.median && stats.median.value) {
        price = stats.median.value;
        priceType = 'median';
      } else if (stats.lowest_price && stats.lowest_price.value) {
        price = stats.lowest_price.value;
        priceType = 'lowest';
      }

      listings.push({
        source: 'Discogs',
        title: result.title || '',
        price: price ? price.toFixed(2) : null,
        priceType: priceType || 'release found, no marketplace price',
        url: 'https://www.discogs.com/release/' + result.id,
        format: result.format ? result.format.join(', ') : '',
        year: result.year || '',
        country: result.country || '',
      });

      if (price) prices.push(price);
    } catch (e) {
      rejected.push({
        source: 'Discogs',
        title: result.title || 'Unknown',
        reason: 'Discogs marketplace stats unavailable',
      });
    }
  }

  return {
    source: 'Discogs',
    sourceType: 'verified_api',
    range: getRangeFromPrices(prices),
    listings: listings.slice(0, 6),
    matchesUsed: prices.length,
    rejected: rejected,
  };
}

async function getEbayActivePrices(artist, title, releaseType, clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    return {
      source: 'eBay Active',
      sourceType: 'verified_api_active_listing',
      range: null,
      listings: [],
      matchesUsed: 0,
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

    if (!accessToken) {
      return {
        source: 'eBay Active',
        sourceType: 'verified_api_active_listing',
        range: null,
        listings: [],
        matchesUsed: 0,
        rejected: [{ source: 'eBay Active', title: 'eBay', reason: 'Could not get eBay access token' }],
      };
    }

    const query = encodeURIComponent(stripAccents(artist + ' ' + title + getFormatSearchTerms(releaseType)));

    const searchRes = await fetch(
      'https://api.ebay.com/buy/browse/v1/item_summary/search?q=' +
      query +
      '&category_ids=176985&limit=50',
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
        source: 'eBay Active',
        title: i.title,
        price: price,
        condition: i.condition || 'Unknown',
        url: i.itemAffiliateWebUrl || i.itemWebUrl,
      });
    });

    var prices = accepted.map(function (i) { return i.price; });

    return {
      source: 'eBay Active',
      sourceType: 'verified_api_active_listing',
      range: getRangeFromPrices(prices),
      listings: accepted.slice(0, 6).map(function (i) {
        return {
          source: 'eBay Active',
          title: i.title,
          price: i.price.toFixed(2),
          condition: i.condition,
          url: i.url,
        };
      }),
      matchesUsed: accepted.length,
      rejected: rejected,
    };
  } catch (err) {
    return {
      source: 'eBay Active',
      sourceType: 'verified_api_active_listing',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [{ source: 'eBay Active', title: 'eBay', reason: 'eBay lookup failed' }],
    };
  }
}

function getResearchSource(sourceName, artist, title, releaseType, note) {
  return {
    source: sourceName,
    sourceType: 'manual_research_link',
    range: null,
    listings: [],
    matchesUsed: 0,
    status: 'Research link created - automated price not connected yet',
    searchUrl: buildSearchUrl(sourceName, artist, title, releaseType),
    note: note,
    rejected: [],
  };
}

function applyOutlierProtection(discogsResult, ebayResult) {
  var rejectedByProtection = [];
  var usablePrices = [];

  var ebayMedian = ebayResult && ebayResult.range ? parseMoney(ebayResult.range.median) : null;
  var ebayLow = ebayResult && ebayResult.range ? parseMoney(ebayResult.range.low) : null;
  var ebayHigh = ebayResult && ebayResult.range ? parseMoney(ebayResult.range.high) : null;

  if (ebayResult && ebayResult.range && ebayResult.matchesUsed > 0) {
    usablePrices.push(ebayResult.range.low);
    usablePrices.push(ebayResult.range.median);
    usablePrices.push(ebayResult.range.high);
  }

  if (discogsResult && discogsResult.range && discogsResult.matchesUsed > 0) {
    var discogsLow = parseMoney(discogsResult.range.low);
    var discogsMedian = parseMoney(discogsResult.range.median);
    var discogsHigh = parseMoney(discogsResult.range.high);

    if (ebayMedian && discogsMedian && discogsMedian < ebayMedian * 0.6) {
      rejectedByProtection.push({
        source: 'Discogs',
        title: 'Discogs range',
        reason:
          'Outlier protection: Discogs median $' +
          discogsMedian.toFixed(2) +
          ' is too far below eBay exact-match median $' +
          ebayMedian.toFixed(2),
      });
    } else {
      usablePrices.push(discogsLow);
      usablePrices.push(discogsMedian);
      usablePrices.push(discogsHigh);
    }
  }

  var protectedRange = getRangeFromPrices(usablePrices);

  if (!protectedRange && ebayLow && ebayHigh) {
    protectedRange = getRangeFromPrices([ebayLow, ebayHigh]);
  }

  return {
    range: protectedRange,
    rejectedByProtection: rejectedByProtection,
  };
}

function chooseSuggestedPrice(overallRange, isSpanishRegional) {
  if (!overallRange) return null;

  var median = parseMoney(overallRange.median);
  var high = parseMoney(overallRange.high);

  if (!median) return null;

  var suggested = median;

  if (isSpanishRegional) {
    suggested = suggested * 1.08;
  }

  if (high) {
    suggested = Math.min(suggested, high);
  }

  return (Math.ceil(suggested) - 0.01).toFixed(2);
}

function buildSourceBreakdown(sources) {
  return sources.map(function (s) {
    return {
      source: s.source,
      sourceType: s.sourceType || '',
      range: s.range ? '$' + s.range.low + ' - $' + s.range.high : null,
      low: s.range ? s.range.low : null,
      high: s.range ? s.range.high : null,
      median: s.range ? s.range.median : null,
      avg: s.range ? s.range.avg : null,
      matchesUsed: s.matchesUsed || 0,
      listings: s.listings || [],
      status: s.status || (s.range ? 'Connected with exact matches' : 'No exact verified price found'),
      searchUrl: s.searchUrl || null,
      note: s.note || null,
    };
  });
}

function getConfidence(totalMatches, connectedSources, hasSoldData) {
  if (hasSoldData && connectedSources >= 2 && totalMatches >= 6) return 'high';
  if (connectedSources >= 2 && totalMatches >= 5) return 'medium';
  if (connectedSources >= 1 && totalMatches >= 1) return 'low-medium';
  return 'low';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    artist,
    title,
    catalog_number,
    country,
    year,
    pressing,
    format,
    genre,
    label,
  } = req.query;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Missing artist or title' });
  }

  try {
    const releaseType = detectReleaseType(format || '', title || '', pressing || '');
    const expectedRules = getExpectedRules(releaseType);

    const discogsResult = await getDiscogsPrice(
      artist,
      title,
      process.env.DISCOGS_TOKEN,
      catalog_number || '',
      country || '',
      year || '',
      releaseType
    );

    const ebayResult = await getEbayActivePrices(
      artist,
      title,
      releaseType,
      process.env.EBAY_CLIENT_ID,
      process.env.EBAY_CLIENT_SECRET
    );

    const protectedPricing = applyOutlierProtection(discogsResult, ebayResult);

    const ebaySoldResult = {
      source: 'eBay Sold',
      sourceType: 'pending_api_access',
      range: null,
      listings: [],
      matchesUsed: 0,
      status: 'Not connected yet - use research link until approved sold-data access is added',
      searchUrl: buildSearchUrl('eBay Sold', artist, title, releaseType),
      rejected: [],
    };

    const storeSalesResult = {
      source: '4 Ever Memories Verified Sales',
      sourceType: 'future_verified_internal_sales',
      range: null,
      listings: [],
      matchesUsed: 0,
      status: 'Not connected yet - will use exact artist/title/format/release type sales only',
      rejected: [],
    };

    const sources = [
      storeSalesResult,
      discogsResult,
      ebayResult,
      ebaySoldResult,
      getResearchSource('Popsike', artist, title, releaseType, 'Historical sales guide; strongest for vinyl auction history.'),
      getResearchSource('MusicStack', artist, title, releaseType, 'Dealer marketplace research source.'),
      getResearchSource('CDandLP', artist, title, releaseType, 'International dealer marketplace research source.'),
      getResearchSource('Online Record Stores', artist, title, releaseType, 'Broad online store research source.'),
      getResearchSource('Auction Sites', artist, title, releaseType, 'Auction research source.'),
    ];

    const connectedSources = [discogsResult, ebayResult].filter(function (s) {
      return s && s.range && s.matchesUsed > 0;
    }).length;

    const totalMatches = sources.reduce(function (sum, s) {
      return sum + (s && s.matchesUsed ? s.matchesUsed : 0);
    }, 0);

    const isSpanishRegional = isSpanishOrRegionalLikely(artist, title, genre || '', label || '');
    const overallRange = protectedPricing.range;
    const suggested = chooseSuggestedPrice(overallRange, isSpanishRegional);

    var rejectedResults = [];

    sources.forEach(function (s) {
      if (s && s.rejected && s.rejected.length) {
        rejectedResults = rejectedResults.concat(s.rejected);
      }
    });

    rejectedResults = rejectedResults.concat(protectedPricing.rejectedByProtection || []);

    const confidence = getConfidence(totalMatches, connectedSources, false);

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

      discogs: discogsResult.range ? discogsResult.range.median : null,

      ebay: ebayResult
        ? {
            lowest: ebayResult.range ? ebayResult.range.low : null,
            avg: ebayResult.range ? ebayResult.range.avg : null,
            median: ebayResult.range ? ebayResult.range.median : null,
            count: ebayResult.matchesUsed,
            topListings: ebayResult.listings || [],
          }
        : null,

      ebaySold: null,
      popsike: null,

      recommended: suggested,
      suggestedStorePrice: suggested,

      collectionValue: overallRange
        ? '$' + overallRange.low + ' - $' + overallRange.high
        : null,

      overallMarketRange: overallRange
        ? '$' + overallRange.low + ' - $' + overallRange.high
        : null,

      sourceBreakdown: buildSourceBreakdown(sources),

      rejectedResults: rejectedResults.slice(0, 50),
      matchedResultsUsed: totalMatches,

      confidence: confidence,

      notes: overallRange
        ? 'Suggested price is based only on verified exact-match source data with outlier protection applied.'
        : 'Insufficient exact verified market data.',

      regionalDemandModifier: {
        applied: isSpanishRegional,
        amount: isSpanishRegional ? '8%' : '0%',
        rule: 'Applied only after exact verified market data exists.',
      },

      safetyLock: {
        aiCanInventPrice: false,
        outlierProtection: true,
        rule: 'No AI pricing. Weak low outliers cannot drag pricing below stronger exact-match marketplace evidence.',
      },

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
