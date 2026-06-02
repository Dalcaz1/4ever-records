import {
  cleanText,
  normalizeCatalogNumber,
  getCountryFromCatalog,
  wordScore,
  hasAny,
  getFormatSearchTerms,
} from './PricingHelpers';

export function getStrictFormatRules(releaseType) {
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

export function strictFormatPass(fullText, releaseType, catalogHit) {
  var rules = getStrictFormatRules(releaseType);

  if (hasAny(fullText, rules.hardRejectAny)) {
    return { accepted: false, reason: 'Rejected cross-format match' };
  }

  if (!rules.mustIncludeAny.length) {
    return { accepted: true, reason: 'Unknown format allowed' };
  }

  if (hasAny(fullText, rules.mustIncludeAny)) {
    return { accepted: true, reason: 'Format confirmed' };
  }

  if (catalogHit) {
    return { accepted: true, reason: 'Format accepted by catalog-aware match' };
  }

  return { accepted: false, reason: 'Could not confirm exact selected format' };
}

export function validateMatch(item, releaseType, artist, title, catalogAliases, label, catalogNumber) {
  var fullText = cleanText([
    item.title,
    item.description,
    item.format,
    item.condition,
    item.source,
    item.catno,
    item.label,
    item.year,
    item.country,
  ].join(' '));

  var artistScore = wordScore(fullText, artist);
  var titleScore = wordScore(fullText, title);

  if (artistScore < 0.4) {
    return { accepted: false, reason: 'Artist did not match closely enough', score: 0 };
  }

  if (titleScore < 0.4) {
    return { accepted: false, reason: 'Title did not match closely enough', score: 0 };
  }

  // Check catalog match
  var catalogHit = false;
  var aliases = catalogAliases || [];
  if (aliases.length) {
    catalogHit = aliases.some(function(alias) {
      var cleanAlias = normalizeCatalogNumber(alias);
      return cleanAlias && normalizeCatalogNumber(fullText).indexOf(cleanAlias) !== -1;
    });
  }

  // Check country match from catalog prefix
  var catalogCountry = getCountryFromCatalog(catalogNumber || '');
  var itemCountry = cleanText(item.country || '');

  var countryMismatch = false;
  if (catalogCountry && itemCountry) {
    var expectedCountry = cleanText(catalogCountry);
    if (itemCountry !== expectedCountry && !itemCountry.includes(expectedCountry)) {
      // Only hard reject if we have a catalog hit on a different country
      if (catalogHit) {
        countryMismatch = false; // catalog match overrides country check
      } else {
        countryMismatch = true;
      }
    }
  }

  if (countryMismatch) {
    return { accepted: false, reason: 'Country mismatch for catalog prefix', score: 0 };
  }

  var formatCheck = strictFormatPass(fullText, releaseType, catalogHit);
  if (!formatCheck.accepted) {
    return { accepted: false, reason: formatCheck.reason, score: 0 };
  }

  var score = 0;
  score += artistScore * 30;
  score += titleScore * 30;
  score += catalogHit ? 25 : 0;
  score += label ? wordScore(fullText, label) * 10 : 0;
  score += 5;

  // Bonus for country match
  if (catalogCountry && itemCountry && itemCountry.includes(cleanText(catalogCountry))) {
    score += 10;
  }

  return {
    accepted: true,
    reason: catalogHit ? 'Accepted exact catalog-aware match' : 'Accepted exact format match',
    score: Math.round(score),
    catalogHit: catalogHit,
  };
}
