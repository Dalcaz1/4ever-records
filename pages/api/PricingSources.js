import {
  stripAccents,
  cleanText,
  parseMoney,
  getRangeFromPrices,
  normalizeCatalogNumber,
  getCatalogAliases,
  getCountryFromCatalog,
  getFormatSearchTerms,
  buildSearchUrl,
} from './PricingHelpers';

import { validateMatch } from './PricingMatcher';

// ─── Shared helpers ──────────────────────────────────────────────────────────

async function discogsFetch(url, headers) {
  try {
    const r = await fetch(url, { headers });
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

  if (!stats) return { price: null, priceType: null, raw: null };

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

// ─── eBay shared token helper ─────────────────────────────────────────────────

async function getEbayToken(clientId, clientSecret) {
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
  return tokenData.access_token || null;
}

// Build eBay queries — catalog number as quoted string first, then broader fallbacks
function buildEbayQueries(artist, title, releaseType, catalog_number, label) {
  var catalogCountry = getCountryFromCatalog(catalog_number || '');
  var formatTerms = getFormatSearchTerms(releaseType);
  var queries = [];

  if (catalog_number) {
    queries.push('"' + stripAccents(catalog_number) + '" ' + stripAccents(artist));
  }

  if (catalog_number) {
    queries.push(
      [stripAccents(artist), stripAccents(title), catalog_number, formatTerms]
        .filter(Boolean).join(' ')
    );
  }

  if (catalogCountry) {
    queries.push(
      [stripAccents(artist), stripAccents(title), catalogCountry, formatTerms]
        .filter(Boolean).join(' ')
    );
  }

  if (label) {
    queries.push(
      [stripAccents(artist), stripAccents(title), stripAccents(label), formatTerms]
        .filter(Boolean).join(' ')
    );
  }

  queries.push(
    [stripAccents(artist), stripAccents(title), formatTerms]
      .filter(Boolean).join(' ')
  );

  return queries;
}

// ─── Discogs ──────────────────────────────────────────────────────────────────

function buildDiscogsSearchUrls(artist, title, catalogAliases, year, countryFilter, label, releaseType, catalogNumber) {
  var urls = [];
  var catalogCountry = getCountryFromCatalog(catalogNumber || '');
  var effectiveCountry = countryFilter || catalogCountry || '';

  function add(url) {
    if (url && urls.indexOf(url) === -1) urls.push(url);
  }

  catalogAliases.forEach(function(cat) {
    var catUrl =
      'https://api.discogs.com/database/search?catno=' +
      encodeURIComponent(cat) +
      '&artist=' +
      encodeURIComponent(stripAccents(artist)) +
      '&per_page=50';
    if (effectiveCountry) catUrl += '&country=' + encodeURIComponent(effectiveCountry);
    add(catUrl);
  });

  if (catalogNumber) {
    var catOnlyUrl =
      'https://api.discogs.com/database/search?catno=' +
      encodeURIComponent(catalogNumber) +
      '&per_page=50';
    if (effectiveCountry) catOnlyUrl += '&country=' + encodeURIComponent(effectiveCountry);
    add(catOnlyUrl);
  }

  var qUrl =
    'https://api.discogs.com/database/search?q=' +
    encodeURIComponent(stripAccents([artist, title, label, getFormatSearchTerms(releaseType)].filter(Boolean).join(' '))) +
    '&per_page=50';
  if (effectiveCountry) qUrl += '&country=' + encodeURIComponent(effectiveCountry);
  add(qUrl);

  var titleUrl =
    'https://api.discogs.com/database/search?title=' +
    encodeURIComponent(stripAccents(title)) +
    '&artist=' +
    encodeURIComponent(stripAccents(artist)) +
    '&per_page=50';
  if (year) titleUrl += '&year=' + encodeURIComponent(year);
  if (effectiveCountry) titleUrl += '&country=' + encodeURIComponent(effectiveCountry);
  add(titleUrl);

  var broadUrl =
    'https://api.discogs.com/database/search?q=' +
    encodeURIComponent(stripAccents([artist, title, label, getFormatSearchTerms(releaseType)].filter(Boolean).join(' '))) +
    '&per_page=50';
  add(broadUrl);

  return urls;
}

export async function getDiscogsMarket(
  artist, title, token, catalog_number, year,
  releaseType, countryFilter, marketLabel, label
) {
  if (!token) {
    return {
      source: marketLabel,
      sourceType: 'release_stats',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [{ source: marketLabel, title: 'Record Database', reason: 'Token missing' }],
    };
  }

  const headers = {
    Authorization: 'Discogs token=' + token,
    'User-Agent': 'FindYourTunes/1.0',
  };

  const catalogAliases = getCatalogAliases(catalog_number, label);

  const urls = buildDiscogsSearchUrls(
    artist, title, catalogAliases, year,
    countryFilter, label, releaseType, catalog_number
  );

  var allResults = [];
  var seenResultIds = {};

  for (var u = 0; u < urls.length; u++) {
    const data = await discogsFetch(urls[u], headers);
    var results = data && data.results ? data.results : [];

    results.forEach(function(result) {
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

    var check = validateMatch(item, releaseType, artist, title, catalogAliases, label, catalog_number);

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

// ─── eBay Active ──────────────────────────────────────────────────────────────

export async function getEbayActivePrices(
  artist, title, releaseType, clientId, clientSecret, catalog_number, label
) {
  if (!clientId || !clientSecret) {
    return {
      source: 'eBay Active',
      sourceType: 'active_listing',
      range: null,
      listings: [],
      matchesUsed: 0,
      rejected: [{ source: 'eBay Active', title: 'Marketplace', reason: 'eBay credentials missing' }],
    };
  }

  try {
    const accessToken = await getEbayToken(clientId, clientSecret);

    if (!accessToken) {
      return {
        source: 'eBay Active',
        sourceType: 'active_listing',
        range: null,
        listings: [],
        matchesUsed: 0,
        rejected: [{ source: 'eBay Active', title: 'Marketplace', reason: 'Could not get eBay access token' }],
      };
    }

    const catalogAliases = getCatalogAliases(catalog_number, label);
    const queries = buildEbayQueries(artist, title, releaseType, catalog_number, label);

    var allItems = [];
    var seenItemIds = {};

    for (var q = 0; q < queries.length; q++) {
      const query = encodeURIComponent(queries[q]);
      const searchRes = await fetch(
        'https://api.ebay.com/buy/browse/v1/item_summary/search?q=' +
        query + '&category_ids=176985&limit=50',
        {
          headers: {
            Authorization: 'Bearer ' + accessToken,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
            'X-EBAY-C-ENDUSERCTX':
              'affiliateCampaignId=' + (process.env.EBAY_EPN_CAMPAIGN_ID || '') +
              ',contextualLocation=country=US,zip=78501',
          },
        }
      );

      const searchData = await searchRes.json();
      const items = searchData.itemSummaries || [];

      items.forEach(function(i) {
        var id = i.itemId || i.legacyItemId || i.itemWebUrl || i.title;
        if (id && !seenItemIds[id]) {
          seenItemIds[id] = true;
          allItems.push(i);
        }
      });

      if (allItems.length >= 100) break;
    }

    var accepted = [];
    var rejected = [];
    var weightedPrices = [];

    allItems.forEach(function(i) {
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
        country: i.itemLocation ? i.itemLocation.country : '',
      };

      var check = validateMatch(item, releaseType, artist, title, catalogAliases, label, catalog_number);
      var price = parseMoney(i.price && i.price.value ? i.price.value : null);

      if (!check.accepted) {
        rejected.push({ source: 'eBay Active', title: i.title || 'Unknown', reason: check.reason });
        return;
      }

      if (!price) {
        rejected.push({ source: 'eBay Active', title: i.title || 'Unknown', reason: 'No usable price' });
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

    var prices = accepted.map(function(i) { return i.price; });

    return {
      source: 'eBay Active',
      sourceType: 'active_listing',
      range: getRangeFromPrices(weightedPrices.length ? weightedPrices : prices),
      rawRange: getRangeFromPrices(prices),
      listings: accepted.slice(0, 8).map(function(i) {
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
      rejected: [{ source: 'eBay Active', title: 'Marketplace', reason: 'Active listing lookup failed: ' + err.message }],
    };
  }
}

// ─── eBay Sold ────────────────────────────────────────────────────────────────

export async function getEbaySoldPrices(
  artist, title, releaseType, clientId, clientSecret, catalog_number, label
) {
  if (!clientId || !clientSecret) {
    return {
      source: 'eBay Sold',
      sourceType: 'sold_listing',
      range: null,
      listings: [],
      matchesUsed: 0,
      status: 'eBay credentials missing',
      rejected: [],
    };
  }

  try {
    const catalogAliases = getCatalogAliases(catalog_number, label);
    const queries = buildEbayQueries(artist, title, releaseType, catalog_number, label);

    var allItems = [];
    var seenItemIds = {};

    for (var q = 0; q < Math.min(queries.length, 3); q++) {
      const query = encodeURIComponent(stripAccents(queries[q]));

      const url =
        'https://svcs.ebay.com/services/search/FindingService/v1' +
        '?OPERATION-NAME=findCompletedItems' +
        '&SERVICE-VERSION=1.0.0' +
        '&SECURITY-APPNAME=' + encodeURIComponent(clientId) +
        '&RESPONSE-DATA-FORMAT=JSON' +
        '&REST-PAYLOAD' +
        '&keywords=' + query +
        '&categoryId=176985' +
        '&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true' +
        '&itemFilter(1).name=ListingType&itemFilter(1).value=AuctionWithBIN' +
        '&itemFilter(2).name=ListingType&itemFilter(2).value=FixedPrice' +
        '&itemFilter(3).name=ListingType&itemFilter(3).value=Auction' +
        '&sortOrder=EndTimeSoonest' +
        '&paginationInput.entriesPerPage=100';

      const res = await fetch(url);
      const data = await res.json();

      var searchResult =
        data &&
        data.findCompletedItemsResponse &&
        data.findCompletedItemsResponse[0] &&
        data.findCompletedItemsResponse[0].searchResult &&
        data.findCompletedItemsResponse[0].searchResult[0];

      var items =
        searchResult && searchResult.item ? searchResult.item : [];

      items.forEach(function(i) {
        var id = i.itemId ? i.itemId[0] : null;
        if (id && !seenItemIds[id]) {
          seenItemIds[id] = true;
          allItems.push(i);
        }
      });

      if (allItems.length >= 100) break;
    }

    var accepted = [];
    var rejected = [];
    var weightedPrices = [];

    allItems.forEach(function(i) {
      var itemTitle = i.title ? i.title[0] : '';
      var sellingStatus = i.sellingStatus ? i.sellingStatus[0] : {};
      var currentPrice = sellingStatus.currentPrice ? sellingStatus.currentPrice[0] : null;
      var priceValue = currentPrice ? parseMoney(currentPrice.__value__ || currentPrice['$'] || '') : null;
      var country = i.country ? i.country[0] : '';

      var item = {
        source: 'eBay Sold',
        title: itemTitle,
        description: [
          itemTitle,
          i.condition && i.condition[0] && i.condition[0].conditionDisplayName
            ? i.condition[0].conditionDisplayName[0]
            : '',
          country,
        ].join(' '),
        format: '',
        condition: i.condition && i.condition[0] && i.condition[0].conditionDisplayName
          ? i.condition[0].conditionDisplayName[0]
          : '',
        catno: '',
        label: '',
        country: country,
      };

      var check = validateMatch(item, releaseType, artist, title, catalogAliases, label, catalog_number);

      if (!check.accepted) {
        rejected.push({ source: 'eBay Sold', title: itemTitle || 'Unknown', reason: check.reason });
        return;
      }

      if (!priceValue) {
        rejected.push({ source: 'eBay Sold', title: itemTitle || 'Unknown', reason: 'No usable sold price' });
        return;
      }

      accepted.push({
        source: 'eBay Sold',
        title: itemTitle,
        price: priceValue,
        condition: item.condition || 'Unknown',
        matchScore: check.score || 0,
      });

      var weight = 2;
      if (check.catalogHit) weight += 2;
      if ((check.score || 0) >= 90) weight += 1;
      for (var w = 0; w < Math.max(1, Math.round(weight)); w++) {
        weightedPrices.push(priceValue);
      }
    });

    var prices = accepted.map(function(i) { return i.price; });

    return {
      source: 'eBay Sold',
      sourceType: 'sold_listing',
      range: getRangeFromPrices(weightedPrices.length ? weightedPrices : prices),
      rawRange: getRangeFromPrices(prices),
      listings: accepted.slice(0, 8).map(function(i) {
        return {
          source: 'eBay Sold',
          title: i.title,
          price: i.price.toFixed(2),
          condition: i.condition,
          matchScore: i.matchScore,
        };
      }),
      matchesUsed: accepted.length,
      status: accepted.length
        ? 'Connected with verified sold transactions'
        : 'No sold matches found for this pressing',
      rejected: rejected,
    };
  } catch (err) {
    return {
      source: 'eBay Sold',
      sourceType: 'sold_listing',
      range: null,
      listings: [],
      matchesUsed: 0,
      status: 'eBay Sold lookup failed: ' + err.message,
      rejected: [],
    };
  }
}

// ─── Popsike ──────────────────────────────────────────────────────────────────

export async function getPopsikePrices(
  artist, title, releaseType, catalog_number, label
) {
  try {
    var query = encodeURIComponent(
      stripAccents([artist, title, catalog_number || label, getFormatSearchTerms(releaseType)].filter(Boolean).join(' '))
    );

    var url = 'https://www.popsike.com/php/quicksearch.php?searchtext=' + query + '&perpage=50&sortord=pricedesc';

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FindYourTunes/1.0)' },
    });

    if (!res.ok) throw new Error('Popsike returned ' + res.status);

    const html = await res.text();

    var pricePattern = /\$\s*([\d,]+\.?\d{0,2})/g;
    var extractedPrices = [];
    var priceMatch;
    while ((priceMatch = pricePattern.exec(html)) !== null) {
      var p = parseMoney(priceMatch[1]);
      // Cap at $500 — anything higher is almost certainly a scrape error for common records
      if (p && p > 0.5 && p <= 500) extractedPrices.push(p);
    }

    // Require at least 5 raw prices before Popsike contributes to pricing
    if (extractedPrices.length < 5) {
      return {
        source: 'Popsike',
        sourceType: 'auction_history',
        range: null,
        listings: [],
        matchesUsed: 0,
        status: 'Insufficient Popsike auction data — minimum 5 results required',
        searchUrl: buildSearchUrl('Popsike', artist, title, releaseType, catalog_number || '', label || ''),
        rejected: [],
      };
    }

    extractedPrices.sort(function(a, b) { return a - b; });
    var trim = Math.max(1, Math.floor(extractedPrices.length * 0.1));
    var trimmed = extractedPrices.slice(trim, extractedPrices.length - trim);

    // Require at least 3 prices after trimming
    if (trimmed.length < 3) {
      return {
        source: 'Popsike',
        sourceType: 'auction_history',
        range: null,
        listings: [],
        matchesUsed: 0,
        status: 'Insufficient Popsike auction data after outlier removal',
        searchUrl: buildSearchUrl('Popsike', artist, title, releaseType, catalog_number || '', label || ''),
        rejected: [],
      };
    }

    return {
      source: 'Popsike',
      sourceType: 'auction_history',
      range: getRangeFromPrices(trimmed),
      rawRange: getRangeFromPrices(extractedPrices),
      listings: trimmed.slice(0, 8).map(function(p) {
        return {
          source: 'Popsike',
          title: [artist, title].join(' - '),
          price: p.toFixed(2),
          condition: 'Unknown',
          matchScore: 50,
        };
      }),
      matchesUsed: trimmed.length,
      status: 'Popsike historical auction data found',
      searchUrl: buildSearchUrl('Popsike', artist, title, releaseType, catalog_number || '', label || ''),
      rejected: [],
    };
  } catch (err) {
    return {
      source: 'Popsike',
      sourceType: 'auction_history',
      range: null,
      listings: [],
      matchesUsed: 0,
      status: 'Popsike lookup failed: ' + err.message,
      searchUrl: buildSearchUrl('Popsike', artist, title, releaseType, catalog_number || '', label || ''),
      rejected: [],
    };
  }
}

// ─── 45cat ────────────────────────────────────────────────────────────────────

export async function get45catPressingInfo(
  artist, title, catalog_number, label
) {
  try {
    var query = encodeURIComponent(
      stripAccents([artist, title, catalog_number].filter(Boolean).join(' '))
    );

    var url = 'https://www.45cat.com/search.php?s=' + query + '&t=r';

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FindYourTunes/1.0)' },
    });

    if (!res.ok) throw new Error('45cat returned ' + res.status);

    const html = await res.text();

    var countryPattern = /\b(Spain|Mexico|US|USA|United States|UK|Germany|France|Japan)\b/gi;
    var countries = [];
    var countryMatch;
    while ((countryMatch = countryPattern.exec(html)) !== null) {
      if (countries.indexOf(countryMatch[1]) === -1) countries.push(countryMatch[1]);
    }

    var catNumbers = [];
    var catPattern = /cat(?:alog|alogue)?\s*(?:no|number|#)?[:\s]*([A-Z0-9\-]+)/gi;
    var catMatch;
    while ((catMatch = catPattern.exec(html)) !== null) {
      if (catNumbers.indexOf(catMatch[1]) === -1 && catNumbers.length < 10) catNumbers.push(catMatch[1]);
    }

    var normalizedCat = (catalog_number || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    var catalogFound = normalizedCat && html.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(normalizedCat) !== -1;
    var hasResults = html.indexOf('search-result') !== -1 || html.indexOf('result') !== -1;

    return {
      source: '45cat',
      sourceType: 'identification',
      found: catalogFound || hasResults,
      catalogFound: catalogFound,
      countriesFound: countries,
      catalogNumbersFound: catNumbers,
      pressingConfirmed: catalogFound,
      status: catalogFound
        ? '45cat pressing confirmed'
        : hasResults
        ? '45cat results found but catalog not confirmed'
        : 'No 45cat pressing found',
      searchUrl: 'https://www.45cat.com/search.php?s=' + query,
      note: 'Identification only — not used for pricing',
    };
  } catch (err) {
    return {
      source: '45cat',
      sourceType: 'identification',
      found: false,
      catalogFound: false,
      countriesFound: [],
      catalogNumbersFound: [],
      pressingConfirmed: false,
      status: '45cat lookup failed: ' + err.message,
      searchUrl: '',
      note: 'Identification only — not used for pricing',
    };
  }
}

// ─── MusicBrainz ────────────────────────────────────────────────────────────
// Ported from findyourtunes/pages/api/PricingSources.js — free, open API, no
// key required. Identification/corroboration only, same as 45cat above:
// never used for pricing, never auto-applied to identification fields.
// Displayed in admin.js's Pricing Transparency panel next to 45cat.

export async function getMusicBrainzIdentification(artist, title, catalog_number, label, releaseType) {
  const MB_USER_AGENT = '4EverMemoriesRecords/1.0 ( https://www.4evermemoriesrecordstore.com )';
  try {
    var formatType = '';
    if (releaseType && releaseType.indexOf('VINYL') !== -1) formatType = 'Vinyl';
    else if (releaseType && releaseType.indexOf('CD') !== -1) formatType = 'CD';
    else if (releaseType && releaseType.indexOf('CASSETTE') !== -1) formatType = 'Cassette';
    var queryParts = [];
    if (artist) queryParts.push('artist:"' + stripAccents(artist).replace(/"/g, '') + '"');
    if (title) queryParts.push('release:"' + stripAccents(title).replace(/"/g, '') + '"');
    if (label) queryParts.push('label:"' + stripAccents(label).replace(/"/g, '') + '"');
    if (catalog_number) queryParts.push('catno:"' + catalog_number.replace(/"/g, '') + '"');
    var searchUrl = 'https://musicbrainz.org/ws/2/release/?query=' + encodeURIComponent(queryParts.join(' AND ')) + '&fmt=json&limit=10';
    if (formatType) searchUrl += '&format=' + encodeURIComponent(formatType);
    const res = await fetch(searchUrl, { headers: { 'User-Agent': MB_USER_AGENT } });
    if (!res.ok) throw new Error('MusicBrainz returned ' + res.status);
    const data = await res.json();
    var releases = data.releases || [];
    if (!releases.length) { return { source: 'MusicBrainz', sourceType: 'identification', found: false, releases: [], status: 'No MusicBrainz releases found', note: 'Identification only' }; }
    var identified = releases.slice(0, 5).map(function(r) {
      var labelInfo = r['label-info'] && r['label-info'].length ? r['label-info'].map(function(li) { return { label: li.label ? li.label.name : '', catalog: li['catalog-number'] || '' }; }) : [];
      return { mbid: r.id || '', title: r.title || '', artist: r['artist-credit'] ? r['artist-credit'].map(function(ac) { return ac.name || (ac.artist && ac.artist.name) || ''; }).join(', ') : '', date: r.date || '', country: r.country || '', labelInfo: labelInfo, trackCount: r['track-count'] || 0, score: r.score || 0 };
    });
    var best = identified[0];
    return { source: 'MusicBrainz', sourceType: 'identification', found: true, bestMatch: best, releases: identified, confirmedCountry: best.country || null, confirmedLabel: best.labelInfo.length ? best.labelInfo[0].label : null, confirmedCatalog: best.labelInfo.length ? best.labelInfo[0].catalog : null, status: 'MusicBrainz — ' + identified.length + ' release(s) found', note: 'Identification only — not used for pricing' };
  } catch (err) {
    return { source: 'MusicBrainz', sourceType: 'identification', found: false, releases: [], status: 'MusicBrainz failed: ' + err.message, note: 'Identification only' };
  }
}



export async function getMusicStackPrices(
  artist, title, releaseType, catalog_number, label
) {
  try {
    var query = encodeURIComponent(
      stripAccents([artist, title, catalog_number || label].filter(Boolean).join(' '))
    );

    var url = 'https://www.musicstack.com/search.cgi?q=' + query + '&qe=&cat=records';

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FindYourTunes/1.0)' },
    });

    if (!res.ok) throw new Error('MusicStack returned ' + res.status);

    const html = await res.text();

    var pricePattern = /\$\s*([\d,]+\.?\d{0,2})/g;
    var priceMatch;
    var extractedPrices = [];
    while ((priceMatch = pricePattern.exec(html)) !== null) {
      var p = parseMoney(priceMatch[1]);
      if (p && p > 0.5 && p < 2000) extractedPrices.push(p);
    }

    if (extractedPrices.length < 2) {
      return {
        source: 'MusicStack',
        sourceType: 'dealer_marketplace',
        range: null,
        listings: [],
        matchesUsed: 0,
        status: 'No MusicStack listings found',
        searchUrl: 'https://www.musicstack.com/search.cgi?q=' + query,
        rejected: [],
      };
    }

    extractedPrices.sort(function(a, b) { return a - b; });
    var trim = Math.max(1, Math.floor(extractedPrices.length * 0.1));
    var trimmed = extractedPrices.slice(trim, extractedPrices.length - trim);

    return {
      source: 'MusicStack',
      sourceType: 'dealer_marketplace',
      range: getRangeFromPrices(trimmed),
      rawRange: getRangeFromPrices(extractedPrices),
      listings: trimmed.slice(0, 8).map(function(p) {
        return {
          source: 'MusicStack',
          title: [artist, title].join(' - '),
          price: p.toFixed(2),
          condition: 'Unknown',
          matchScore: 50,
        };
      }),
      matchesUsed: trimmed.length,
      status: 'MusicStack dealer listings found',
      searchUrl: 'https://www.musicstack.com/search.cgi?q=' + query,
      rejected: [],
    };
  } catch (err) {
    return {
      source: 'MusicStack',
      sourceType: 'dealer_marketplace',
      range: null,
      listings: [],
      matchesUsed: 0,
      status: 'MusicStack lookup failed: ' + err.message,
      searchUrl: buildSearchUrl('MusicStack', artist, title, releaseType, catalog_number || '', label || ''),
      rejected: [],
    };
  }
}

// ─── 4 Ever Memories internal data ───────────────────────────────────────────

export async function getFourEverMemoriesData(
  artist, title, releaseType, catalog_number, label, condition
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

    data.forEach(function(row) {
      var item = {
        source: '4 Ever Memories Verified Sales',
        title: [row.artist, row.title].filter(Boolean).join(' '),
        description: [row.label || '', row.catalog_number || '', row.format || '', row.condition || '', row.status || ''].join(' '),
        format: row.format || '',
        condition: row.condition || '',
        catno: row.catalog_number || '',
        label: row.label || '',
        country: '',
      };

      var check = validateMatch(item, releaseType, artist, title, catalogAliases, label, catalog_number);
      var sold = parseMoney(row.sold_price);
      var listed = parseMoney(row.price);
      var price = sold || listed;

      if (!check.accepted) {
        rejected.push({ source: '4 Ever Memories Verified Sales', title: item.title || 'Internal Record', reason: check.reason });
        return;
      }

      if (!price) {
        rejected.push({ source: '4 Ever Memories Verified Sales', title: item.title || 'Internal Record', reason: 'No usable internal price' });
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
    accepted.forEach(function(i) {
      var weight = i.status && cleanText(i.status).indexOf('sold') !== -1 ? 4 : 2;
      if ((i.matchScore || 0) >= 90) weight += 2;
      for (var w = 0; w < weight; w++) { prices.push(i.price); }
    });

    return {
      source: '4 Ever Memories Verified Sales',
      sourceType: 'internal_verified_data',
      range: getRangeFromPrices(prices),
      rawRange: getRangeFromPrices(accepted.map(function(i) { return i.price; })),
      listings: accepted.slice(0, 8).map(function(i) {
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
      rejected: [{ source: '4 Ever Memories Verified Sales', title: 'Internal Data', reason: 'Lookup failed' }],
    };
  }
}

// ─── Research link fallback ───────────────────────────────────────────────────

export function getResearchSource(sourceName, artist, title, releaseType, catalogNumber, label, note) {
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
