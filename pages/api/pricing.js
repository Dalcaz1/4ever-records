import {
  parseMoney,
  getRangeFromPrices,
  getCatalogAliases,
  getCountryFromCatalog,
  detectReleaseType,
  conditionMultiplier,
  isSpanishOrRegionalLikely,
  buildSearchUrl,
  getFormatSearchTerms,
} from './PricingHelpers';

import { getStrictFormatRules } from './PricingMatcher';

import {
  getDiscogsMarket,
  getEbayActivePrices,
  getEbaySoldPrices,
  getPopsikePrices,
  get45catPressingInfo,
  getMusicBrainzIdentification,
  getMusicStackPrices,
  getFourEverMemoriesData,
  getResearchSource,
} from './PricingSources';

function applyOutlierProtection(sources) {
  var rejectedByProtection = [];
  var prices = [];

  var connected = (sources || []).filter(function(s) {
    return s && s.range && s.matchesUsed > 0;
  });

  var medians = connected
    .map(function(s) { return parseMoney(s.range.median); })
    .filter(Boolean);

  var anchorMedian = null;
  if (medians.length) {
    medians.sort(function(a, b) { return a - b; });
    anchorMedian = medians[Math.floor(medians.length / 2)];
  }

  connected.forEach(function(source) {
    var median = parseMoney(source.range.median);

    if (anchorMedian && median && median < anchorMedian * 0.55) {
      rejectedByProtection.push({
        source: source.source,
        title: source.source + ' range',
        reason: 'Outlier protection rejected weak low range',
      });
      return;
    }
    // Reject sources whose median is more than 10x the anchor — upper outlier
    if (anchorMedian && median && median > anchorMedian * 10) {
      rejectedByProtection.push({
        source: source.source,
        title: source.source + ' range',
        reason: 'Outlier protection rejected extreme high range',
      });
      return;
    }
    var sourceWeight = 1;
    if (source.source === '4 Ever Memories Verified Sales') sourceWeight = 5;
    if (source.source === 'eBay Sold') sourceWeight = 3;
    if (source.source === 'eBay Active') sourceWeight = 2;
    if (source.source === 'Discogs U.S.') sourceWeight = 2;
    if (source.source === 'Discogs Global') sourceWeight = 1;
    if (source.source === 'Popsike') sourceWeight = 2;
    if (source.source === 'MusicStack') sourceWeight = 1;

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

function getProtectedMarketFloor(releaseType, artist, title, label, condition, sealed, catalogCountry) {
  var regional = isSpanishOrRegionalLikely(artist, title, '', label, catalogCountry);
  var c = String(condition || '').toLowerCase().trim();

  if (releaseType === 'VINYL_LP' && regional) {
    if (sealed) return 34.99;
    if (c === 'm' || c === 'nm') return 24.99;
    if (c === 'vg+' || (c.includes('vg') && c.includes('+'))) return 19.99;
    if (c === 'vg') return 17.99;
    return 16.99;
  }

  if (releaseType === 'VINYL_7_SINGLE' && regional) {
    if (sealed) return 14.99;
    if (c === 'm' || c === 'nm') return 9.99;
    if (c === 'vg+' || (c.includes('vg') && c.includes('+'))) return 7.99;
    if (c === 'vg') return 5.99;
    return 4.99;
  }

  return null;
}

function chooseSuggestedPrice(
  overallRange, isSpanishRegional, marketContext,
  condition, sealed, releaseType, artist, title, label, catalogCountry
) {
  var floor = getProtectedMarketFloor(releaseType, artist, title, label, condition, sealed, catalogCountry);

  if (!overallRange) {
    return floor ? (Math.ceil(floor) - 0.01).toFixed(2) : null;
  }

  var median = parseMoney(overallRange.median);
  var high = parseMoney(overallRange.high);

  if (!median) {
    return floor ? (Math.ceil(floor) - 0.01).toFixed(2) : null;
  }

  var suggested = median * conditionMultiplier(condition, sealed);

  if (marketContext && marketContext.usMarketWeakGlobalExists) suggested *= 1.08;
  if (isSpanishRegional) suggested *= 1.08;

  if (floor && suggested < floor) suggested = floor;
  if (high && suggested > high && !(floor && suggested === floor)) suggested = high;

  return (Math.ceil(suggested) - 0.01).toFixed(2);
}

function buildSourceBreakdown(sources) {
  return sources.map(function(s) {
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    artist, title, catalog_number, country, year,
    pressing, format, genre, label, sealed, condition,
  } = req.query;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Missing artist or title' });
  }

  try {
    const releaseType = detectReleaseType(format || '', title || '', pressing || '');
    const expectedRules = getStrictFormatRules(releaseType);
    const catalogAliases = getCatalogAliases(catalog_number || '', label || '');
    const catalogCountry = getCountryFromCatalog(catalog_number || '');
    const isSealed = sealed === 'true';

    const usCountryFilter = catalogCountry || 'US';

    const [
      internalResult,
      discogsUSResult,
      discogsGlobalResult,
      ebayResult,
      ebaySoldResult,
      popsikePrices,
      musicStackResult,
      pressingInfo,
      musicBrainzResult,
    ] = await Promise.all([
      getFourEverMemoriesData(artist, title, releaseType, catalog_number || '', label || '', condition || ''),
      getDiscogsMarket(artist, title, process.env.DISCOGS_TOKEN, catalog_number || '', year || '', releaseType, usCountryFilter, 'Discogs U.S.', label || ''),
      getDiscogsMarket(artist, title, process.env.DISCOGS_TOKEN, catalog_number || '', year || '', releaseType, '', 'Discogs Global', label || ''),
      getEbayActivePrices(artist, title, releaseType, process.env.EBAY_CLIENT_ID, process.env.EBAY_CLIENT_SECRET, catalog_number || '', label || ''),
      getEbaySoldPrices(artist, title, releaseType, process.env.EBAY_CLIENT_ID, process.env.EBAY_CLIENT_SECRET, catalog_number || '', label || ''),
      getPopsikePrices(artist, title, releaseType, catalog_number || '', label || ''),
      getMusicStackPrices(artist, title, releaseType, catalog_number || '', label || ''),
      get45catPressingInfo(artist, title, catalog_number || '', label || ''),
      getMusicBrainzIdentification(artist, title, catalog_number || '', label || '', releaseType),
    ]);

    const sources = [
      internalResult,
      discogsUSResult,
      discogsGlobalResult,
      ebayResult,
      ebaySoldResult,
      popsikePrices,
      musicStackResult,
      getResearchSource('CDandLP', artist, title, releaseType, catalog_number || '', label || '', 'International dealer marketplace research source.'),
      getResearchSource('Collector Catalog References', artist, title, releaseType, catalog_number || '', label || '', 'Printed and licensed collector-reference style data.'),
      getResearchSource('Auction Sites', artist, title, releaseType, catalog_number || '', label || '', 'Auction research source.'),
    ];

    const protectedPricing = applyOutlierProtection(sources);

    const connectedSources = [
      internalResult, discogsUSResult, discogsGlobalResult,
      ebayResult, ebaySoldResult, popsikePrices, musicStackResult,
    ].filter(function(s) { return s && s.range && s.matchesUsed > 0; }).length;

    const totalMatches = sources.reduce(function(sum, s) {
      return sum + (s && s.matchesUsed ? s.matchesUsed : 0);
    }, 0);

    const hasAnyMarketData = connectedSources > 0;

    const usHasData =
      !!(internalResult && internalResult.range) ||
      !!(discogsUSResult && discogsUSResult.range) ||
      !!(ebayResult && ebayResult.range) ||
      !!(ebaySoldResult && ebaySoldResult.range);

    const globalHasData = !!(discogsGlobalResult && discogsGlobalResult.range);

    const marketContext = {
      usMarketWeakGlobalExists: !usHasData && globalHasData,
      usHasData,
      globalHasData,
    };

    // catalogCountry passed in so MILS → Spain triggers regional floor
    // even when artist/title/label contain no Spanish language terms
    const isSpanishRegional = isSpanishOrRegionalLikely(
      artist, title, genre || '', label || '', catalogCountry || ''
    );

    const overallRange = protectedPricing.range;

    // DEBUG — remove after confirming floor fires correctly
    console.log('PRICING DEBUG', {
      artist,
      title,
      condition,
      releaseType,
      catalogCountry,
      isSpanishRegional,
      hasAnyMarketData,
      connectedSources,
      totalMatches,
      overallRange,
      floor: getProtectedMarketFloor(releaseType, artist, title, label || '', condition || '', isSealed, catalogCountry || ''),
    });

    const suggested = chooseSuggestedPrice(
      overallRange, isSpanishRegional, marketContext,
      condition || '', isSealed, releaseType,
      artist, title, label || '', catalogCountry || ''
    );

    var rejectedResults = [];
    sources.forEach(function(s) {
      if (s && s.rejected && s.rejected.length) {
        rejectedResults = rejectedResults.concat(s.rejected);
      }
    });
    rejectedResults = rejectedResults.concat(protectedPricing.rejectedByProtection || []);

    var hasCatalogAwareMatch = false;
    [internalResult, discogsUSResult, discogsGlobalResult, ebayResult, ebaySoldResult].forEach(function(source) {
      (source.listings || []).forEach(function(listing) {
        if ((listing.matchScore || 0) >= 85) hasCatalogAwareMatch = true;
      });
    });

    const hasInternalData = !!(internalResult && internalResult.range && internalResult.matchesUsed > 0);
    const confidence = getConfidence(totalMatches, connectedSources, hasInternalData, hasCatalogAwareMatch);
    const weightedAverage = overallRange ? overallRange.avg : null;

    return res.status(200).json({
      recordFound: {
        artist, title, format: format || '', releaseType,
        exactType: expectedRules.label,
        catalog_number: catalog_number || '',
        catalogAliases, catalogCountry,
        country: country || '', year: year || '',
        pressing: pressing || '', condition: condition || '',
        sealed: isSealed,
      },

      discogs: discogsUSResult.range
        ? discogsUSResult.range.median
        : discogsGlobalResult.range
        ? discogsGlobalResult.range.median
        : null,

      ebay: ebayResult ? {
        lowest: ebayResult.range ? ebayResult.range.low : null,
        avg: ebayResult.range ? ebayResult.range.avg : null,
        median: ebayResult.range ? ebayResult.range.median : null,
        count: ebayResult.matchesUsed,
        topListings: ebayResult.listings || [],
      } : null,

      fourEverMemories: internalResult ? {
        range: internalResult.range ? '$' + internalResult.range.low + ' - $' + internalResult.range.high : null,
        median: internalResult.range ? internalResult.range.median : null,
        avg: internalResult.range ? internalResult.range.avg : null,
        count: internalResult.matchesUsed,
      } : null,

      ebaySold: ebaySoldResult ? {
        range: ebaySoldResult.range ? '$' + ebaySoldResult.range.low + ' - $' + ebaySoldResult.range.high : null,
        median: ebaySoldResult.range ? ebaySoldResult.range.median : null,
        avg: ebaySoldResult.range ? ebaySoldResult.range.avg : null,
        count: ebaySoldResult.matchesUsed,
        topListings: ebaySoldResult.listings || [],
        status: ebaySoldResult.status || null,
      } : null,

      popsike: popsikePrices ? {
        range: popsikePrices.range ? '$' + popsikePrices.range.low + ' - $' + popsikePrices.range.high : null,
        median: popsikePrices.range ? popsikePrices.range.median : null,
        count: popsikePrices.matchesUsed,
        status: popsikePrices.status || null,
        searchUrl: popsikePrices.searchUrl || null,
      } : null,

      musicStack: musicStackResult ? {
        range: musicStackResult.range ? '$' + musicStackResult.range.low + ' - $' + musicStackResult.range.high : null,
        median: musicStackResult.range ? musicStackResult.range.median : null,
        count: musicStackResult.matchesUsed,
        status: musicStackResult.status || null,
        searchUrl: musicStackResult.searchUrl || null,
      } : null,

      pressingIdentification: pressingInfo ? {
        source: '45cat',
        confirmed: pressingInfo.pressingConfirmed || false,
        catalogFound: pressingInfo.catalogFound || false,
        countriesFound: pressingInfo.countriesFound || [],
        status: pressingInfo.status || null,
        searchUrl: pressingInfo.searchUrl || null,
      } : null,

      musicBrainzIdentification: musicBrainzResult ? {
        found: musicBrainzResult.found || false,
        bestMatch: musicBrainzResult.bestMatch || null,
        releases: musicBrainzResult.releases || [],
        confirmedCountry: musicBrainzResult.confirmedCountry || null,
        confirmedLabel: musicBrainzResult.confirmedLabel || null,
        confirmedCatalog: musicBrainzResult.confirmedCatalog || null,
        status: musicBrainzResult.status || null,
      } : null,

      weightedAverage,
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

      sourceBreakdown: buildSourceBreakdown(sources),
      rejectedResults: rejectedResults.slice(0, 80),
      confidence,

      notes: overallRange
        ? 'Suggested price based on exact selected-format matches only. Country-aware catalog matching applied.'
        : isSpanishRegional
        ? 'No market data found. Protected market floor applied for Spanish/Regional pressing.'
        : 'Insufficient exact selected-format market data.',

      regionalDemandModifier: {
        applied: isSpanishRegional,
        amount: isSpanishRegional ? '8%' : '0%',
      },

      conditionModifier: {
        condition: condition || '',
        sealed: isSealed,
        multiplier: conditionMultiplier(condition || '', isSealed),
      },

      safetyLock: {
        aiCanInventPrice: false,
        outlierProtection: true,
        hardFormatLock: true,
        countryAwareCatalogMatching: true,
        sevenInchSingleAndEPSeparated: true,
        protectedMarketFloorAlwaysFires: true,
      },

      exactMatchRules: {
        expected: expectedRules.label,
        releaseType,
        catalogAliases,
        catalogCountry,
      },
    });
  } catch (err) {
    console.error('Pricing error:', err);
    return res.status(500).json({ error: 'Pricing lookup failed' });
  }
}
