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
  ].join(' '));

  if (hasAny(fullText, expectedRules.rejectAny)) {
    return { accepted: false, reason: 'Wrong format/release type' };
  }

  if (expectedRules.requiredAny.length && !hasAny(fullText, expectedRules.requiredAny)) {
    return { accepted: false, reason: 'Could not verify exact format' };
  }

  return { accepted: true };
}

function getFormatSearchTerms(releaseType) {
  switch (releaseType) {
    case 'VINYL_7_SINGLE': return ' 7" 45 single';
    case 'VINYL_7_EP': return ' 7" EP';
    case 'VINYL_12_SINGLE': return ' 12" single maxi';
    case 'VINYL_LP': return ' LP album vinyl';
    case 'CD_ALBUM': return ' CD album';
    case 'CD_SINGLE': return ' CD single';
    case 'CASSETTE_ALBUM': return ' cassette';
    case 'CASSETTE_SINGLE': return ' cassette single';
    default: return '';
  }
}

async function getDiscogsPrice(artist, title, token, releaseType) {
  try {
    const headers = {
      'Authorization': 'Discogs token=' + token,
      'User-Agent': '4EverMemoriesRecords/2.0',
    };

    const query =
      encodeURIComponent(stripAccents(artist + ' ' + title + getFormatSearchTerms(releaseType)));

    const searchRes = await fetch(
      'https://api.discogs.com/database/search?q=' + query + '&per_page=20',
      { headers }
    );

    const searchData = await searchRes.json();
    const results = searchData.results || [];

    const expectedRules = getExpectedRules(releaseType);

    var acceptedPrices = [];
    var listings = [];
    var rejected = [];

    for (var i = 0; i < results.length; i++) {
      var result = results[i];

      var item = {
        title: result.title || '',
        description: [
          result.format ? result.format.join(' ') : '',
          result.country || '',
          result.year || '',
        ].join(' '),
        format: result.format ? result.format.join(' ') : '',
      };

      var check = validateMatch(item, expectedRules, artist, title);

      if (!check.accepted) {
        rejected.push({
          source: 'Discogs',
          title: result.title,
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

        if (stats.median && stats.median.value) {
          price = stats.median.value;
        } else if (stats.lowest_price && stats.lowest_price.value) {
          price = stats.lowest_price.value;
        }

        listings.push({
          source: 'Discogs',
          title: result.title,
          price: price ? price.toFixed(2) : null,
          url: 'https://www.discogs.com/release/' + result.id,
        });

        if (price) acceptedPrices.push(price);

      } catch (e) {}
    }

    return {
      source: 'Discogs',
      range: getRangeFromPrices(acceptedPrices),
      listings: listings.slice(0, 5),
      matchesUsed: acceptedPrices.length,
      rejected: rejected,
    };

  } catch (err) {
    return {
      source: 'Discogs',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [],
    };
  }
}

async function getEbayPrices(artist, title, releaseType, clientId, clientSecret) {
  try {
    const credentials =
      Buffer.from(clientId + ':' + clientSecret).toString('base64');

    const tokenRes = await fetch(
      'https://api.ebay.com/identity/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + credentials,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body:
          'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
      }
    );

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const query =
      encodeURIComponent(stripAccents(artist + ' ' + title + getFormatSearchTerms(releaseType)));

    const searchRes = await fetch(
      'https://api.ebay.com/buy/browse/v1/item_summary/search?q=' +
      query +
      '&category_ids=176985&limit=25',
      {
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      }
    );

    const searchData = await searchRes.json();
    const items = searchData.itemSummaries || [];

    const expectedRules = getExpectedRules(releaseType);

    var acceptedPrices = [];
    var listings = [];
    var rejected = [];

    items.forEach(function (i) {
      var item = {
        title: i.title || '',
        description: i.shortDescription || '',
        condition: i.condition || '',
      };

      var check = validateMatch(item, expectedRules, artist, title);

      if (!check.accepted) {
        rejected.push({
          source: 'eBay',
          title: i.title,
          reason: check.reason,
        });
        return;
      }

      var price =
        parseFloat(i.price && i.price.value ? i.price.value : 0);

      if (!price) return;

      acceptedPrices.push(price);

      listings.push({
        source: 'eBay',
        title: i.title,
        price: price.toFixed(2),
        condition: i.condition || '',
        url: i.itemWebUrl,
      });
    });

    return {
      source: 'eBay',
      range: getRangeFromPrices(acceptedPrices),
      listings: listings.slice(0, 5),
      matchesUsed: acceptedPrices.length,
      rejected: rejected,
    };

  } catch (err) {
    return {
      source: 'eBay',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [],
    };
  }
}

function getSuggestedPrice(overallRange) {
  if (!overallRange) return null;

  var median = parseFloat(overallRange.median);

  return (Math.ceil(median) - 0.01).toFixed(2);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const {
    artist,
    title,
    format,
  } = req.query;

  if (!artist || !title) {
    return res.status(400).json({
      error: 'Missing artist or title',
    });
  }

  try {
    const releaseType =
      detectReleaseType(format || '', title || '', '');

    const discogsResult = await getDiscogsPrice(
      artist,
      title,
      process.env.DISCOGS_TOKEN,
      releaseType
    );

    const ebayResult = await getEbayPrices(
      artist,
      title,
      releaseType,
      process.env.EBAY_CLIENT_ID,
      process.env.EBAY_CLIENT_SECRET
    );

    var allPrices = [];

    if (discogsResult.range) {
      allPrices.push(discogsResult.range.low);
      allPrices.push(discogsResult.range.high);
    }

    if (ebayResult.range) {
      allPrices.push(ebayResult.range.low);
      allPrices.push(ebayResult.range.high);
    }

    const overallRange = getRangeFromPrices(allPrices);

    const suggestedPrice =
      getSuggestedPrice(overallRange);

    const totalMatches =
      (discogsResult.matchesUsed || 0) +
      (ebayResult.matchesUsed || 0);

    const confidence =
      totalMatches >= 8
        ? 'high'
        : totalMatches >= 3
        ? 'medium'
        : 'low';

    return res.status(200).json({
      recordFound: {
        artist: artist,
        title: title,
        format: format,
        releaseType: releaseType,
      },

      overallMarketRange:
        overallRange
          ? '$' + overallRange.low + ' - $' + overallRange.high
          : null,

      suggestedStorePrice:
        suggestedPrice,

      collectionValue:
        overallRange
          ? '$' + overallRange.low + ' - $' + overallRange.high
          : null,

      confidence: confidence,

      sourceBreakdown: [
        {
          source: 'Discogs',
          range:
            discogsResult.range
              ? '$' +
                discogsResult.range.low +
                ' - $' +
                discogsResult.range.high
              : null,
          listings: discogsResult.listings,
          matchesUsed: discogsResult.matchesUsed,
        },
        {
          source: 'eBay Active',
          range:
            ebayResult.range
              ? '$' +
                ebayResult.range.low +
                ' - $' +
                ebayResult.range.high
              : null,
          listings: ebayResult.listings,
          matchesUsed: ebayResult.matchesUsed,
        },
        {
          source: 'eBay Sold',
          range: null,
          status: 'Not connected yet',
        },
        {
          source: 'Popsike',
          range: null,
          status: 'Research source only currently',
          searchUrl:
            'https://www.popsike.com/php/quicksearch.php?searchtext=' +
            encodeURIComponent(artist + ' ' + title),
        },
        {
          source: 'MusicStack',
          range: null,
          status: 'Research source only currently',
          searchUrl:
            'https://www.musicstack.com/search/' +
            encodeURIComponent(artist + ' ' + title),
        },
        {
          source: 'CDandLP',
          range: null,
          status: 'Research source only currently',
          searchUrl:
            'https://www.cdandlp.com/en/search/?q=' +
            encodeURIComponent(artist + ' ' + title),
        },
      ],

      rejectedResults: [
        ...(discogsResult.rejected || []),
        ...(ebayResult.rejected || []),
      ].slice(0, 25),

      notes:
        overallRange
          ? 'Suggested price is based only on verified exact-match source data.'
          : 'Insufficient exact verified market data.',

      safetyLock: {
        aiCanInventPrice: false,
      },
    });

  } catch (err) {
    console.error('Pricing error:', err);

    return res.status(500).json({
      error: 'Pricing lookup failed',
    });
  }
}
