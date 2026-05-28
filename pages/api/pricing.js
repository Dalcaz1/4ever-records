// ---- FIND YOUR TUNES PRICING ENGINE — PROTECTED STANDALONE VERSION ----

if (typeof globalThis.FYT_MAX_VISIBLE_LISTINGS === 'undefined') {
  globalThis.FYT_MAX_VISIBLE_LISTINGS = 12;
}

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
  if (value === null || value === undefined || value === '') return null;
  var cleaned = String(value).replace(/[^0-9.]/g, '');
  var n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getRangeFromPrices(prices) {
  var nums = (prices || [])
    .map(parseMoney)
    .filter(function (p) {
      return p && p > 0;
    })
    .sort(function (a, b) {
      return a - b;
    });

  if (!nums.length) return null;

  return {
    low: nums[0].toFixed(2),
    high: nums[nums.length - 1].toFixed(2),
    median: nums[Math.floor(nums.length / 2)].toFixed(2),
    avg: (
      nums.reduce(function (a, b) {
        return a + b;
      }, 0) / nums.length
    ).toFixed(2),
    count: nums.length,
  };
}

function normalizeCatalogNumber(value) {
  return cleanText(value || '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function getCatalogAliases(catalogNumber, label) {
  var original = String(catalogNumber || '').trim();
  var normalized = normalizeCatalogNumber(original);
  var aliases = [];

  function add(value) {
    var v = String(value || '').trim();
    if (!v) return;

    var exists = aliases.some(function (a) {
      return normalizeCatalogNumber(a) === normalizeCatalogNumber(v);
    });

    if (!exists) aliases.push(v);
  }

  add(original);

  if (normalized) {
    add(normalized);
    add(normalized.toUpperCase());

    var numberOnly = normalized.replace(/^[a-z]+/, '');

    if (numberOnly) {
      add(numberOnly);
      add('LP-' + numberOnly);
      add('LP ' + numberOnly);
      add('LP' + numberOnly);
      add('FR-' + numberOnly);
      add('FR ' + numberOnly);
      add('FR' + numberOnly);
      add('FREDDIE-' + numberOnly);
    }

    if (normalized.indexOf('fr') === 0) {
      add('LP-' + normalized.replace(/^fr/, ''));
    }

    if (normalized.indexOf('lp') === 0) {
      add('FR-' + normalized.replace(/^lp/, ''));
    }
  }

  if (cleanText(label).indexOf('freddie') !== -1 && normalized) {
    var digits = normalized.replace(/\D/g, '');

    if (digits) {
      add('LP-' + digits);
      add('FR-' + digits);
      add('Freddie LP-' + digits);
      add('Freddie FR-' + digits);
    }
  }

  return aliases.filter(Boolean);
}

function wordScore(sourceText, targetText) {
  var source = cleanText(sourceText);

  var words = cleanText(targetText)
    .split(' ')
    .filter(function (w) {
      return w.length > 2;
    });

  if (!words.length) return 1;

  var hits = words.filter(function (w) {
    return source.indexOf(w) !== -1;
  }).length;

  return hits / words.length;
}

function hasAny(text, terms) {
  return (terms || []).some(function (term) {
    return text.indexOf(cleanText(term)) !== -1;
  });
}

function detectReleaseType(format, title, pressing) {
  var f = cleanText(format);
  var combined = cleanText(format + ' ' + title + ' ' + pressing);

  if (f.indexOf('7') !== -1) {
    if (combined.indexOf('ep') !== -1 || combined.indexOf('extended play') !== -1) {
      return 'VINYL_7_EP';
    }

    return 'VINYL_7_SINGLE';
  }

  if (f.indexOf('12') !== -1) {
    if (
      combined.indexOf('single') !== -1 ||
      combined.indexOf('maxi') !== -1
    ) {
      if (
        combined.indexOf('album') !== -1 ||
        combined.indexOf('lp') !== -1
      ) {
        return 'VINYL_LP';
      }

      return 'VINYL_12_SINGLE';
    }

    return 'VINYL_LP';
  }

  if (f.indexOf('lp') !== -1 || f.indexOf('album') !== -1) {
    return 'VINYL_LP';
  }

  if (f.indexOf('cd') !== -1) {
    return combined.indexOf('single') !== -1 ? 'CD_SINGLE' : 'CD_ALBUM';
  }

  if (f.indexOf('cassette') !== -1 || f.indexOf('tape') !== -1) {
    return combined.indexOf('single') !== -1 ? 'CASSETTE_SINGLE' : 'CASSETTE_ALBUM';
  }

  if (f.indexOf('8') !== -1) {
    return '8_TRACK';
  }

  return 'UNKNOWN';
}

function getStrictFormatRules(releaseType) {
  var rules = {
    VINYL_LP: {
      label: 'LP / Album',
      mustIncludeAny: ['lp', 'album', '12', '12"', '33', 'vinyl'],
      hardRejectAny: ['7"', '7 inch', '45', 'single', 'maxi single', 'cd', 'cassette', 'tape', '8 track', '8-track'],
    },
    VINYL_12_SINGLE: {
      label: '12" Single',
      mustIncludeAny: ['12', '12"', 'single', 'maxi', 'vinyl'],
      hardRejectAny: ['7"', '7 inch', '45', 'lp', 'album', 'cd', 'cassette', 'tape', '8 track', '8-track'],
    },
    VINYL_7_SINGLE: {
      label: '7" Single',
      mustIncludeAny: ['7', '7"', '45', 'single', 'vinyl'],
      hardRejectAny: ['12"', '12 inch', 'lp', 'album', 'ep', 'extended play', 'cd', 'cassette', 'tape', '8 track', '8-track'],
    },
    VINYL_7_EP: {
      label: '7" EP',
      mustIncludeAny: ['7', '7"', 'ep', 'extended play', 'vinyl'],
      hardRejectAny: ['12"', '12 inch', 'lp', 'album', '45 single', 'cd', 'cassette', 'tape', '8 track', '8-track'],
    },
    CD_ALBUM: {
      label: 'CD Album',
      mustIncludeAny: ['cd'],
      hardRejectAny: ['vinyl', '7"', '12"', 'lp', 'cassette', 'tape', '8 track', '8-track'],
    },
    CD_SINGLE: {
      label: 'CD Single',
      mustIncludeAny: ['cd', 'single'],
      hardRejectAny: ['vinyl', '7"', '12"', 'lp', 'album', 'cassette', 'tape', '8 track', '8-track'],
    },
    CASSETTE_ALBUM: {
      label: 'Cassette Album',
      mustIncludeAny: ['cassette', 'tape'],
      hardRejectAny: ['vinyl', '7"', '12"', 'lp', 'cd', '8 track', '8-track', 'single'],
    },
    CASSETTE_SINGLE: {
      label: 'Cassette Single',
      mustIncludeAny: ['cassette', 'single'],
      hardRejectAny: ['vinyl', '7"', '12"', 'lp', 'cd', '8 track', '8-track'],
    },
    '8_TRACK': {
      label: '8-Track',
      mustIncludeAny: ['8 track', '8-track'],
      hardRejectAny: ['vinyl', '7"', '12"', 'lp', 'cd', 'cassette'],
    },
    UNKNOWN: {
      label: 'Unknown Format',
      mustIncludeAny: [],
      hardRejectAny: [],
    },
  };

  return rules[releaseType] || rules.UNKNOWN;
}

function getFormatSearchTerms(releaseType) {
  switch (releaseType) {
    case 'VINYL_LP':
      return ' LP album vinyl 33';
    case 'VINYL_12_SINGLE':
      return ' 12" single maxi vinyl';
    case 'VINYL_7_SINGLE':
      return ' 7" 45 single vinyl';
    case 'VINYL_7_EP':
      return ' 7" EP extended play vinyl';
    case 'CD_ALBUM':
      return ' CD album';
    case 'CD_SINGLE':
      return ' CD single';
    case 'CASSETTE_ALBUM':
      return ' cassette tape album';
    case 'CASSETTE_SINGLE':
      return ' cassette single';
    case '8_TRACK':
      return ' 8 track';
    default:
      return '';
  }
}

function strictFormatPass(fullText, releaseType, catalogHit) {
  var rules = getStrictFormatRules(releaseType);

  if (hasAny(fullText, rules.hardRejectAny)) {
    return {
      accepted: false,
      reason: 'Rejected cross-format match',
    };
  }

  if (!rules.mustIncludeAny.length) {
    return {
      accepted: true,
      reason: 'Unknown format allowed',
    };
  }

  if (hasAny(fullText, rules.mustIncludeAny)) {
    return {
      accepted: true,
      reason: 'Format confirmed',
    };
  }

  if (catalogHit) {
    return {
      accepted: true,
      reason: 'Format accepted by catalog-aware match',
    };
  }

  return {
    accepted: false,
    reason: 'Could not confirm exact selected format',
  };
}

function validateMatch(item, releaseType, artist, title, catalogAliases, label) {
  var fullText = cleanText(
    [
      item.title,
      item.description,
      item.format,
      item.condition,
      item.source,
      item.catno,
      item.label,
      item.year,
      item.country,
    ].join(' ')
  );

  var artistScore = wordScore(fullText, artist);
  var titleScore = wordScore(fullText, title);
  var labelScore = label ? wordScore(fullText, label) : 1;

  var catalogHit = false;
  var aliases = catalogAliases || [];

  if (aliases.length) {
    catalogHit = aliases.some(function (alias) {
      var cleanAlias = normalizeCatalogNumber(alias);
      return cleanAlias && normalizeCatalogNumber(fullText).indexOf(cleanAlias) !== -1;
    });
  }

  if (artistScore < 0.45) {
    return {
      accepted: false,
      reason: 'Artist did not match closely enough',
      score: 0,
    };
  }

  if (titleScore < 0.45) {
    return {
      accepted: false,
      reason: 'Title did not match closely enough',
      score: 0,
    };
  }

  var formatCheck = strictFormatPass(fullText, releaseType, catalogHit);

  if (!formatCheck.accepted) {
    return {
      accepted: false,
      reason: formatCheck.reason,
      score: 0,
    };
  }

  var score = 0;
  score += artistScore * 35;
  score += titleScore * 35;
  score += labelScore * 10;
  score += catalogHit ? 15 : 0;
  score += 5;

  return {
    accepted: true,
    reason: catalogHit ? 'Accepted exact catalog-aware match' : 'Accepted exact format match',
    score: Math.round(score),
    catalogHit: catalogHit,
  };
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
    'freddie',
    'latin',
    'ranchera',
    'cumbia',
  ];

  return terms.some(function (term) {
    return text.indexOf(cleanText(term)) !== -1;
  });
}

function conditionMultiplier(condition, sealed) {
  var c = cleanText(condition);

  if (sealed) return 1.45;
  if (c === 'm') return 1.35;
  if (c === 'nm') return 1.25;
  if (c === 'vg') return 1.0;
  if (c === 'vg+') return 1.12;
  if (c.indexOf('vg') !== -1 && c.indexOf('+') !== -1) return 1.12;
  if (c === 'g') return 0.72;

  return 1.0;
}

function getProtectedMarketFloor(releaseType, artist, title, label, condition, sealed, hasAnyMarketData) {
  if (!hasAnyMarketData) return null;

  var regional = isSpanishOrRegionalLikely(artist, title, '', label);
  var c = cleanText(condition);

  if (releaseType === 'VINYL_LP' && regional) {
    if (sealed) return 34.99;
    if (c === 'm' || c === 'nm') return 24.99;
    if (c === 'vg+' || (c.indexOf('vg') !== -1 && c.indexOf('+') !== -1)) return 19.99;
    if (c === 'vg') return 17.99;
    return 16.99;
  }

  return null;
}

function buildSearchUrl(source, artist, title, releaseType, catalogNumber, label) {
  var q = encodeURIComponent(
    stripAccents(
      [
        artist,
        title,
        label,
        catalogNumber,
        getFormatSearchTerms(releaseType),
      ].filter(Boolean).join(' ')
    )
  );

  if (source === 'eBay Sold') {
    return 'https://www.ebay.com/sch/i.html?_nkw=' + q + '&LH_Sold=1&LH_Complete=1';
  }

  if (source === 'Popsike') {
    return 'https://www.popsike.com/php/quicksearch.php?searchtext=' + q;
  }

  if (source === 'MusicStack') {
    return 'https://www.musicstack.com/search/' + q;
  }

  if (source === 'CDandLP') {
    return 'https://www.cdandlp.com/en/search/?q=' + q;
  }

  if (source === 'Online Record Stores') {
    return 'https://www.google.com/search?q=' + q + '+record+store';
  }

  if (source === 'Auction Sites') {
    return 'https://www.google.com/search?q=' + q + '+auction+sold';
  }

  return null;
}

async function discogsFetch(url, headers) {
  try {
    const r = await fetch(url, {
      headers: headers,
    });

    const d = await r.json();

    return d;
  } catch (e) {
    return null;
  }
}

async function getDiscogsReleaseStats(releaseId, headers) {
  const stats = await discogsFetch(
    'https://api.discogs.com/marketplace/stats/' + releaseId,
    headers
  );

  if (!stats) {
    return {
      price: null,
      priceType: null,
      raw: null,
    };
  }

  if (stats.median && stats.median.value) {
    return {
      price: parseMoney(stats.median.value),
      priceType: 'median marketplace stat',
      raw: stats,
    };
  }

  if (stats.lowest_price && stats.lowest_price.value) {
    return {
      price: parseMoney(stats.lowest_price.value),
      priceType: 'lowest marketplace stat',
      raw: stats,
    };
  }

  return {
    price: null,
    priceType: 'release found, no marketplace stat',
    raw: stats,
  };
}

function buildDiscogsSearchUrls(artist, title, catalogAliases, year, countryFilter, label, releaseType) {
  var urls = [];

  function add(url) {
    if (url && urls.indexOf(url) === -1) urls.push(url);
  }

  catalogAliases.forEach(function (cat) {
    var catUrl =
      'https://api.discogs.com/database/search?catno=' +
      encodeURIComponent(cat) +
      '&artist=' +
      encodeURIComponent(stripAccents(artist)) +
      '&per_page=50';

    if (countryFilter) catUrl += '&country=' + encodeURIComponent(countryFilter);
    add(catUrl);

    var qCatUrl =
      'https://api.discogs.com/database/search?q=' +
      encodeURIComponent(stripAccents([artist, title, label, cat, getFormatSearchTerms(releaseType)].filter(Boolean).join(' '))) +
      '&per_page=50';

    if (countryFilter) qCatUrl += '&country=' + encodeURIComponent(countryFilter);
    add(qCatUrl);
  });

  var titleUrl =
    'https://api.discogs.com/database/search?title=' +
    encodeURIComponent(stripAccents(title)) +
    '&artist=' +
    encodeURIComponent(stripAccents(artist)) +
    '&per_page=50';

  if (year) titleUrl += '&year=' + encodeURIComponent(year);
  if (countryFilter) titleUrl += '&country=' + encodeURIComponent(countryFilter);
  add(titleUrl);

  var broadUrl =
    'https://api.discogs.com/database/search?q=' +
    encodeURIComponent(stripAccents([artist, title, label, getFormatSearchTerms(releaseType)].filter(Boolean).join(' '))) +
    '&per_page=50';

  if (countryFilter) broadUrl += '&country=' + encodeURIComponent(countryFilter);
  add(broadUrl);

  return urls;
}

async function getDiscogsMarket(
  artist,
  title,
  token,
  catalog_number,
  year,
  releaseType,
  countryFilter,
  marketLabel,
  label
) {
  if (!token) {
    return {
      source: marketLabel,
      sourceType: 'release_stats',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [
        {
          source: marketLabel,
          title: 'Record Database',
          reason: 'Token missing',
        },
      ],
    };
  }

  const headers = {
    Authorization: 'Discogs token=' + token,
    'User-Agent': 'FindYourTunes/1.0',
  };

  const catalogAliases = getCatalogAliases(catalog_number, label);
  const urls = buildDiscogsSearchUrls(
    artist,
    title,
    catalogAliases,
    year,
    countryFilter,
    label,
    releaseType
  );

  var allResults = [];
  var seenResultIds = {};

  for (var u = 0; u < urls.length; u++) {
    const data = await discogsFetch(urls[u], headers);
    var results = data && data.results ? data.results : [];

    results.forEach(function (result) {
      if (result && result.id && !seenResultIds[result.id]) {
        seenResultIds[result.id] = true;
        allResults.push(result);
      }
    });

    if (allResults.length >= 60) break;
  }

  var prices = [];
  var weightedPrices = [];
  var listings = [];
  var rejected = [];
  var acceptedReleaseIds = {};

  for (var i = 0; i < Math.min(allResults.length, 30); i++) {
    var result = allResults[i];

    if (!result || !result.id || acceptedReleaseIds[result.id]) continue;

    var item = {
      source: marketLabel,
      title: result.title || '',
      description: [
        result.format ? result.format.join(' ') : '',
        result.country || '',
        result.year || '',
        result.catno || '',
        result.label ? result.label.join(' ') : '',
      ].join(' '),
      format: result.format ? result.format.join(' ') : '',
      catno: result.catno || '',
      label: result.label ? result.label.join(' ') : '',
      year: result.year || '',
      country: result.country || '',
    };

    var check = validateMatch(item, releaseType, artist, title, catalogAliases, label);

    if (!check.accepted) {
      rejected.push({
        source: marketLabel,
        title: result.title || 'Unknown',
        reason: check.reason,
      });
      continue;
    }

    acceptedReleaseIds[result.id] = true;

    const stats = await getDiscogsReleaseStats(result.id, headers);
    var price = stats.price;

    listings.push({
      source: marketLabel,
      title: result.title || '',
      price: price ? price.toFixed(2) : null,
      priceType: stats.priceType || 'release found, no marketplace stat',
      format: result.format ? result.format.join(', ') : '',
      year: result.year || '',
      country: result.country || '',
      catno: result.catno || '',
      matchScore: check.score || 0,
    });

    if (price) {
      prices.push(price);

      var weight = 1;
      if (check.catalogHit) weight += 2;
      if ((check.score || 0) >= 90) weight += 1;
      if (countryFilter === 'US') weight += 0.5;

      for (var w = 0; w < Math.max(1, Math.round(weight)); w++) {
        weightedPrices.push(price);
      }
    }
  }

  return {
    source: marketLabel,
    sourceType: 'release_stats',
    range: getRangeFromPrices(weightedPrices.length ? weightedPrices : prices),
    rawRange: getRangeFromPrices(prices),
    listings: listings.slice(0, 8),
    matchesUsed: prices.length,
    rejected: rejected,
  };
}
async function getEbayActivePrices(
  artist,
  title,
  releaseType,
  clientId,
  clientSecret,
  catalog_number,
  label
) {
  if (!clientId || !clientSecret) {
    return {
      source: 'eBay Active',
      sourceType: 'active_listing',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [
        {
          source: 'eBay Active',
          title: 'Marketplace',
          reason: 'eBay credentials missing',
        },
      ],
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
        sourceType: 'active_listing',
        range: null,
        listings: [],
        matchesUsed: 0,
        rejected: [
          {
            source: 'eBay Active',
            title: 'Marketplace',
            reason: 'Could not get marketplace access token',
          },
        ],
      };
    }

    const catalogAliases = getCatalogAliases(catalog_number, label);

    var queries = [
      [artist, title, label, catalog_number, getFormatSearchTerms(releaseType)].filter(Boolean).join(' '),
      [artist, title, catalogAliases[0], getFormatSearchTerms(releaseType)].filter(Boolean).join(' '),
      [artist, title, label, getFormatSearchTerms(releaseType)].filter(Boolean).join(' '),
    ];

    var allItems = [];
    var seenItemIds = {};

    for (var q = 0; q < queries.length; q++) {
      const query = encodeURIComponent(stripAccents(queries[q]));

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

      items.forEach(function (i) {
        var id = i.itemId || i.legacyItemId || i.itemWebUrl || i.title;
        if (id && !seenItemIds[id]) {
          seenItemIds[id] = true;
          allItems.push(i);
        }
      });
    }

    var accepted = [];
    var rejected = [];
    var weightedPrices = [];

    allItems.forEach(function (i) {
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
        catno: '',
        label: '',
      };

      var check = validateMatch(item, releaseType, artist, title, catalogAliases, label);
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
        matchScore: check.score || 0,
      });

      var weight = 1;
      if (check.catalogHit) weight += 2;
      if ((check.score || 0) >= 90) weight += 1;

      for (var w = 0; w < Math.max(1, Math.round(weight)); w++) {
        weightedPrices.push(price);
      }
    });

    var prices = accepted.map(function (i) {
      return i.price;
    });

    return {
      source: 'eBay Active',
      sourceType: 'active_listing',
      range: getRangeFromPrices(weightedPrices.length ? weightedPrices : prices),
      rawRange: getRangeFromPrices(prices),
      listings: accepted.slice(0, 8).map(function (i) {
        return {
          source: 'eBay Active',
          title: i.title,
          price: i.price.toFixed(2),
          condition: i.condition,
          matchScore: i.matchScore,
        };
      }),
      matchesUsed: accepted.length,
      rejected: rejected,
    };
  } catch (err) {
    return {
      source: 'eBay Active',
      sourceType: 'active_listing',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [
        {
          source: 'eBay Active',
          title: 'Marketplace',
          reason: 'Marketplace lookup failed',
        },
      ],
    };
  }
}

async function getFourEverMemoriesData(
  artist,
  title,
  releaseType,
  catalog_number,
  label,
  condition
) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return {
        source: '4 Ever Memories Verified Sales',
        sourceType: 'internal_verified_data',
        range: null,
        listings: [],
        matchesUsed: 0,
        status: 'Internal data connection not available',
        rejected: [],
      };
    }

    const catalogAliases = getCatalogAliases(catalog_number, label);

    const queryUrl =
      process.env.SUPABASE_URL +
      '/rest/v1/records?select=artist,title,label,catalog_number,format,condition,price,sold_price,status,sold_at,created_at';

    const response = await fetch(queryUrl, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!Array.isArray(data)) {
      return {
        source: '4 Ever Memories Verified Sales',
        sourceType: 'internal_verified_data',
        range: null,
        listings: [],
        matchesUsed: 0,
        status: 'Internal data returned no usable records',
        rejected: [],
      };
    }

    var accepted = [];
    var rejected = [];

    data.forEach(function (row) {
      var item = {
        source: '4 Ever Memories Verified Sales',
        title: [row.artist, row.title].filter(Boolean).join(' '),
        description: [
          row.label || '',
          row.catalog_number || '',
          row.format || '',
          row.condition || '',
          row.status || '',
        ].join(' '),
        format: row.format || '',
        condition: row.condition || '',
        catno: row.catalog_number || '',
        label: row.label || '',
      };

      var check = validateMatch(item, releaseType, artist, title, catalogAliases, label);
      var sold = parseMoney(row.sold_price);
      var listed = parseMoney(row.price);
      var price = sold || listed;

      if (!check.accepted) {
        rejected.push({
          source: '4 Ever Memories Verified Sales',
          title: item.title || 'Internal Record',
          reason: check.reason,
        });
        return;
      }

      if (!price) {
        rejected.push({
          source: '4 Ever Memories Verified Sales',
          title: item.title || 'Internal Record',
          reason: 'No usable internal price',
        });
        return;
      }

      accepted.push({
        source: '4 Ever Memories Verified Sales',
        title: item.title,
        price: price,
        condition: row.condition || condition || '',
        status: row.status || '',
        matchScore: check.score || 0,
      });
    });

    var prices = [];

    accepted.forEach(function (i) {
      var weight = i.status && cleanText(i.status).indexOf('sold') !== -1 ? 4 : 2;
      if ((i.matchScore || 0) >= 90) weight += 2;

      for (var w = 0; w < weight; w++) {
        prices.push(i.price);
      }
    });

    return {
      source: '4 Ever Memories Verified Sales',
      sourceType: 'internal_verified_data',
      range: getRangeFromPrices(prices),
      rawRange: getRangeFromPrices(accepted.map(function (i) { return i.price; })),
      listings: accepted.slice(0, 8).map(function (i) {
        return {
          source: i.source,
          title: i.title,
          price: i.price.toFixed(2),
          condition: i.condition,
          status: i.status,
          matchScore: i.matchScore,
        };
      }),
      matchesUsed: accepted.length,
      status: accepted.length ? 'Connected with internal exact-format matches' : 'No internal exact-format match found',
      rejected: rejected,
    };
  } catch (err) {
    return {
      source: '4 Ever Memories Verified Sales',
      sourceType: 'internal_verified_data',
      range: null,
      listings: [],
      matchesUsed: 0,
      status: 'Internal data lookup failed',
      rejected: [
        {
          source: '4 Ever Memories Verified Sales',
          title: 'Internal Data',
          reason: 'Lookup failed',
        },
      ],
    };
  }
}

function getResearchSource(sourceName, artist, title, releaseType, catalogNumber, label, note) {
  return {
    source: sourceName,
    sourceType: 'research_link',
    range: null,
    listings: [],
    matchesUsed: 0,
    status: 'Research link only - not used for automated pricing',
    searchUrl: buildSearchUrl(sourceName, artist, title, releaseType, catalogNumber, label),
    note: note,
    rejected: [],
  };
}

function applyOutlierProtection(sources) {
  var rejectedByProtection = [];
  var prices = [];

  var connected = (sources || []).filter(function (s) {
    return s && s.range && s.matchesUsed > 0;
  });

  var medians = connected
    .map(function (s) {
      return parseMoney(s.range.median);
    })
    .filter(Boolean);

  var anchorMedian = null;

  if (medians.length) {
    medians.sort(function (a, b) {
      return a - b;
    });
    anchorMedian = medians[Math.floor(medians.length / 2)];
  }

  connected.forEach(function (source) {
    var median = parseMoney(source.range.median);

    if (anchorMedian && median && median < anchorMedian * 0.55) {
      rejectedByProtection.push({
        source: source.source,
        title: source.source + ' range',
        reason: 'Outlier protection rejected weak low range',
      });
      return;
    }

    var sourceWeight = 1;

    if (source.source === '4 Ever Memories Verified Sales') sourceWeight = 5;
    if (source.source === 'eBay Active') sourceWeight = 2;
    if (source.source === 'Discogs U.S.') sourceWeight = 2;
    if (source.source === 'Discogs Global') sourceWeight = 1;

    for (var w = 0; w < sourceWeight; w++) {
      prices.push(source.range.low);
      prices.push(source.range.median);
      prices.push(source.range.high);
    }
  });

  return {
    range: getRangeFromPrices(prices),
    rejectedByProtection: rejectedByProtection,
  };
}

function chooseSuggestedPrice(
  overallRange,
  isSpanishRegional,
  marketContext,
  condition,
  sealed,
  releaseType,
  artist,
  title,
  label,
  hasAnyMarketData
) {
  if (!overallRange) return null;

  var median = parseMoney(overallRange.median);
  var high = parseMoney(overallRange.high);

  if (!median) return null;

  var suggested = median;

  suggested = suggested * conditionMultiplier(condition, sealed);

  if (marketContext && marketContext.usMarketWeakGlobalExists) {
    suggested = suggested * 1.08;
  }

  if (isSpanishRegional) {
    suggested = suggested * 1.08;
  }

  var floor = getProtectedMarketFloor(
    releaseType,
    artist,
    title,
    label,
    condition,
    sealed,
    hasAnyMarketData
  );

  if (floor && suggested < floor) {
    suggested = floor;
  }

  if (high && suggested > high && !floor) {
    suggested = high;
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
      status: s.status || (s.range ? 'Connected with exact-format matches' : 'No exact-format verified price found'),
      searchUrl: s.searchUrl || null,
      note: s.note || null,
    };
  });
}

function getConfidence(totalMatches, connectedSources, hasInternalData, hasCatalogAwareMatch) {
  if (hasInternalData && totalMatches >= 1) return 'high';
  if (hasCatalogAwareMatch && connectedSources >= 2 && totalMatches >= 4) return 'high';
  if (connectedSources >= 2 && totalMatches >= 5) return 'high';
  if (connectedSources >= 1 && totalMatches >= 2) return 'medium';
  if (connectedSources >= 1 && totalMatches >= 1) return 'low-medium';
  return 'low';
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
    catalog_number,
    country,
    year,
    pressing,
    format,
    genre,
    label,
    sealed,
    condition,
  } = req.query;

  if (!artist || !title) {
    return res.status(400).json({
      error: 'Missing artist or title',
    });
  }

  try {
    const releaseType = detectReleaseType(format || '', title || '', pressing || '');
    const expectedRules = getStrictFormatRules(releaseType);
    const catalogAliases = getCatalogAliases(catalog_number || '', label || '');
    const isSealed = sealed === 'true';

    const internalPromise = getFourEverMemoriesData(
      artist,
      title,
      releaseType,
      catalog_number || '',
      label || '',
      condition || ''
    );

    const discogsUSPromise = getDiscogsMarket(
      artist,
      title,
      process.env.DISCOGS_TOKEN,
      catalog_number || '',
      year || '',
      releaseType,
      'US',
      'Discogs U.S.',
      label || ''
    );

    const discogsGlobalPromise = getDiscogsMarket(
      artist,
      title,
      process.env.DISCOGS_TOKEN,
      catalog_number || '',
      year || '',
      releaseType,
      '',
      'Discogs Global',
      label || ''
    );

    const ebayPromise = getEbayActivePrices(
      artist,
      title,
      releaseType,
      process.env.EBAY_CLIENT_ID,
      process.env.EBAY_CLIENT_SECRET,
      catalog_number || '',
      label || ''
    );

    const internalResult = await internalPromise;
    const discogsUSResult = await discogsUSPromise;
    const discogsGlobalResult = await discogsGlobalPromise;
    const ebayResult = await ebayPromise;

    const ebaySoldResult = {
      source: 'eBay Sold',
      sourceType: 'pending_sold_data_access',
      range: null,
      listings: [],
      matchesUsed: 0,
      status: 'Sold-data connection not active yet',
      searchUrl: buildSearchUrl('eBay Sold', artist, title, releaseType, catalog_number || '', label || ''),
      rejected: [],
    };

    const sources = [
      internalResult,
      discogsUSResult,
      discogsGlobalResult,
      ebayResult,
      ebaySoldResult,
      getResearchSource(
        'Popsike',
        artist,
        title,
        releaseType,
        catalog_number || '',
        label || '',
        'Historical auction research source. Not used for automated pricing unless connected through an approved data method.'
      ),
      getResearchSource(
        'MusicStack',
        artist,
        title,
        releaseType,
        catalog_number || '',
        label || '',
        'Dealer marketplace research source. Not used for automated pricing unless connected through an approved data method.'
      ),
      getResearchSource(
        'CDandLP',
        artist,
        title,
        releaseType,
        catalog_number || '',
        label || '',
        'International dealer marketplace research source. Not used for automated pricing unless connected through an approved data method.'
      ),
      getResearchSource(
        'Collector Catalog References',
        artist,
        title,
        releaseType,
        catalog_number || '',
        label || '',
        'Printed and licensed collector-reference style data should be added only through FYT-owned or licensed datasets.'
      ),
      getResearchSource(
        'Auction Sites',
        artist,
        title,
        releaseType,
        catalog_number || '',
        label || '',
        'Auction research source. Not used for automated pricing unless connected through an approved data method.'
      ),
    ];

    const protectedPricing = applyOutlierProtection(sources);

    const connectedSources = [
      internalResult,
      discogsUSResult,
      discogsGlobalResult,
      ebayResult,
    ].filter(function (s) {
      return s && s.range && s.matchesUsed > 0;
    }).length;

    const totalMatches = sources.reduce(function (sum, s) {
      return sum + (s && s.matchesUsed ? s.matchesUsed : 0);
    }, 0);

    const hasAnyMarketData = connectedSources > 0;

    const usHasData =
      !!(internalResult && internalResult.range) ||
      !!(discogsUSResult && discogsUSResult.range) ||
      !!(ebayResult && ebayResult.range);

    const globalHasData = !!(discogsGlobalResult && discogsGlobalResult.range);

    const marketContext = {
      usMarketWeakGlobalExists: !usHasData && globalHasData,
      usHasData: usHasData,
      globalHasData: globalHasData,
    };

    const isSpanishRegional = isSpanishOrRegionalLikely(
      artist,
      title,
      genre || '',
      label || ''
    );

    const overallRange = protectedPricing.range;

    const suggested = chooseSuggestedPrice(
      overallRange,
      isSpanishRegional,
      marketContext,
      condition || '',
      isSealed,
      releaseType,
      artist,
      title,
      label || '',
      hasAnyMarketData
    );

    var rejectedResults = [];

    sources.forEach(function (s) {
      if (s && s.rejected && s.rejected.length) {
        rejectedResults = rejectedResults.concat(s.rejected);
      }
    });

    rejectedResults = rejectedResults.concat(protectedPricing.rejectedByProtection || []);

    var hasCatalogAwareMatch = false;

    [internalResult, discogsUSResult, discogsGlobalResult, ebayResult].forEach(function (source) {
      (source.listings || []).forEach(function (listing) {
        if ((listing.matchScore || 0) >= 85) hasCatalogAwareMatch = true;
      });
    });

    const hasInternalData = !!(internalResult && internalResult.range && internalResult.matchesUsed > 0);

    const confidence = getConfidence(
      totalMatches,
      connectedSources,
      hasInternalData,
      hasCatalogAwareMatch
    );

    const weightedAverage = overallRange ? overallRange.avg : null;

    return res.status(200).json({
      recordFound: {
        artist: artist,
        title: title,
        format: format || '',
        releaseType: releaseType,
        exactType: expectedRules.label,
        catalog_number: catalog_number || '',
        catalogAliases: catalogAliases,
        country: country || '',
        year: year || '',
        pressing: pressing || '',
        condition: condition || '',
        sealed: isSealed,
      },

      discogs: discogsUSResult.range
        ? discogsUSResult.range.median
        : discogsGlobalResult.range
        ? discogsGlobalResult.range.median
        : null,

      ebay: ebayResult
        ? {
            lowest: ebayResult.range ? ebayResult.range.low : null,
            avg: ebayResult.range ? ebayResult.range.avg : null,
            median: ebayResult.range ? ebayResult.range.median : null,
            count: ebayResult.matchesUsed,
            topListings: ebayResult.listings || [],
          }
        : null,

      fourEverMemories: internalResult
        ? {
            range: internalResult.range
              ? '$' + internalResult.range.low + ' - $' + internalResult.range.high
              : null,
            median: internalResult.range ? internalResult.range.median : null,
            avg: internalResult.range ? internalResult.range.avg : null,
            count: internalResult.matchesUsed,
          }
        : null,

      ebaySold: null,
      popsike: null,

      weightedAverage: weightedAverage,
      average: weightedAverage,

      recommended: suggested,
      recommendedPrice: suggested,
      suggestedStorePrice: suggested,

      collectionValue: overallRange ? '$' + overallRange.low + ' - $' + overallRange.high : null,
      marketRange: overallRange ? '$' + overallRange.low + ' - $' + overallRange.high : null,
      overallMarketRange: overallRange ? '$' + overallRange.low + ' - $' + overallRange.high : null,

      matchesUsed: totalMatches,
      matchCount: totalMatches,
      matchedResultsUsed: totalMatches,

      exactType: expectedRules.label,

      marketScope: {
        usMarketRange:
          internalResult.range || discogsUSResult.range || (ebayResult && ebayResult.range)
            ? {
                fourEverMemories: internalResult.range
                  ? '$' + internalResult.range.low + ' - $' + internalResult.range.high
                  : null,
                discogsUS: discogsUSResult.range
                  ? '$' + discogsUSResult.range.low + ' - $' + discogsUSResult.range.high
                  : null,
                ebayUS: ebayResult && ebayResult.range
                  ? '$' + ebayResult.range.low + ' - $' + ebayResult.range.high
                  : null,
              }
            : null,
        globalMarketRange: discogsGlobalResult.range
          ? '$' + discogsGlobalResult.range.low + ' - $' + discogsGlobalResult.range.high
          : null,
        rule: 'Only exact selected-format matches are allowed. 7" singles and 7" EPs are priced as separate release types.',
      },

      sourceBreakdown: buildSourceBreakdown(sources),

      rejectedResults: rejectedResults.slice(0, 80),

      confidence: confidence,

      notes: overallRange
        ? 'Suggested price is based only on exact selected-format matches, with 4 Ever Memories internal data weighted strongest, U.S./global separation, protected regional floor logic, and outlier protection.'
        : 'Insufficient exact selected-format market data.',

      regionalDemandModifier: {
        applied: isSpanishRegional,
        amount: isSpanishRegional ? '8%' : '0%',
        rule: 'Applied only after exact selected-format verified market data exists.',
      },

      conditionModifier: {
        condition: condition || '',
        sealed: isSealed,
        multiplier: conditionMultiplier(condition || '', isSealed),
      },

      protectedFloor: {
        applied: !!getProtectedMarketFloor(
          releaseType,
          artist,
          title,
          label || '',
          condition || '',
          isSealed,
          hasAnyMarketData
        ),
        amount: getProtectedMarketFloor(
          releaseType,
          artist,
          title,
          label || '',
          condition || '',
          isSealed,
          hasAnyMarketData
        ),
      },

      safetyLock: {
        aiCanInventPrice: false,
        outlierProtection: true,
        hardFormatLock: true,
        fourEverMemoriesDataIncluded: true,
        sevenInchSingleAndEPSeparated: true,
        researchLinksNotUsedForPricing: true,
        licensedCollectorDataOnly: true,
        rule: 'No cross-format pricing. Selected format must match. 7" Single and 7" EP are separate pricing classes. Research-only sources are not used for automated pricing unless connected through an approved or licensed data method.',
      },

      exactMatchRules: {
        expected: expectedRules.label,
        releaseType: releaseType,
        catalogAliases: catalogAliases,
      },
    });
  } catch (err) {
    console.error('Pricing error:', err);

    return res.status(500).json({
      error: 'Pricing lookup failed',
    });
  }
}
