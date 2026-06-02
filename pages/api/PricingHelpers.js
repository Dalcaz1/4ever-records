export function stripAccents(str) {
  if (!str) return '';
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function cleanText(str) {
  return stripAccents(str || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  var cleaned = String(value).replace(/[^0-9.]/g, '');
  var n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getRangeFromPrices(prices) {
  var nums = (prices || [])
    .map(parseMoney)
    .filter(function(p) { return p && p > 0; })
    .sort(function(a, b) { return a - b; });

  if (!nums.length) return null;

  return {
    low: nums[0].toFixed(2),
    high: nums[nums.length - 1].toFixed(2),
    median: nums[Math.floor(nums.length / 2)].toFixed(2),
    avg: (nums.reduce(function(a, b) { return a + b; }, 0) / nums.length).toFixed(2),
    count: nums.length,
  };
}

export function normalizeCatalogNumber(value) {
  return cleanText(value || '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function getCatalogPrefix(catalogNumber) {
  var match = String(catalogNumber || '').match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : '';
}

// Known country-specific catalog prefixes
export const CATALOG_COUNTRY_MAP = {
  'MILS': 'Spain',
  'PL':   'Spain',
  'NL':   'Spain',
  'SRS':  'Spain',
  'HILS': 'Spain',
  'EPC':  'Spain',
  'BJS':  'Spain',
  'MCA':  'US',
  'LSP':  'US',
  'LPM':  'US',
  'AFL':  'US',
  'AFL1': 'US',
  'CPL':  'US',
  'APL':  'US',
  'SFL':  'US',
  'VIP':  'Japan',
  'RVP':  'Japan',
  'SHP':  'Japan',
  'EMS':  'Japan',
  'BVJP': 'Japan',
  // Tejano / South Texas regional labels
  'FR':   'US-Regional',
  'LP':   'US-Regional',
};

export function getCountryFromCatalog(catalogNumber) {
  var prefix = getCatalogPrefix(catalogNumber);
  return CATALOG_COUNTRY_MAP[prefix] || null;
}

export function getCatalogAliases(catalogNumber, label) {
  var original = String(catalogNumber || '').trim();
  var normalized = normalizeCatalogNumber(original);
  var aliases = [];

  function add(value) {
    var v = String(value || '').trim();
    if (!v) return;
    var exists = aliases.some(function(a) {
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

export function wordScore(sourceText, targetText) {
  var source = cleanText(sourceText);
  var words = cleanText(targetText)
    .split(' ')
    .filter(function(w) { return w.length > 2; });
  if (!words.length) return 1;
  var hits = words.filter(function(w) {
    return source.indexOf(w) !== -1;
  }).length;
  return hits / words.length;
}

export function hasAny(text, terms) {
  return (terms || []).some(function(term) {
    return text.indexOf(cleanText(term)) !== -1;
  });
}

export function getFormatSearchTerms(releaseType) {
  switch (releaseType) {
    case 'VINYL_LP':        return ' LP album vinyl 33';
    case 'VINYL_12_SINGLE': return ' 12" single maxi vinyl';
    case 'VINYL_7_SINGLE':  return ' 7" 45 single vinyl';
    case 'VINYL_7_EP':      return ' 7" EP extended play vinyl';
    case 'CD_ALBUM':        return ' CD album';
    case 'CD_SINGLE':       return ' CD single';
    case 'CASSETTE_ALBUM':  return ' cassette tape album';
    case 'CASSETTE_SINGLE': return ' cassette single';
    case '8_TRACK':         return ' 8 track';
    default:                return '';
  }
}

export function detectReleaseType(format, title, pressing) {
  var f = cleanText(format);
  var combined = cleanText(format + ' ' + title + ' ' + pressing);

  if (f.indexOf('7') !== -1) {
    if (combined.indexOf('ep') !== -1 || combined.indexOf('extended play') !== -1) return 'VINYL_7_EP';
    return 'VINYL_7_SINGLE';
  }
  if (f.indexOf('12') !== -1) {
    if (combined.indexOf('single') !== -1 || combined.indexOf('maxi') !== -1) {
      if (combined.indexOf('album') !== -1 || combined.indexOf('lp') !== -1) return 'VINYL_LP';
      return 'VINYL_12_SINGLE';
    }
    return 'VINYL_LP';
  }
  if (f.indexOf('lp') !== -1 || f.indexOf('album') !== -1) return 'VINYL_LP';
  if (f.indexOf('cd') !== -1) return combined.indexOf('single') !== -1 ? 'CD_SINGLE' : 'CD_ALBUM';
  if (f.indexOf('cassette') !== -1 || f.indexOf('tape') !== -1) return combined.indexOf('single') !== -1 ? 'CASSETTE_SINGLE' : 'CASSETTE_ALBUM';
  if (f.indexOf('8') !== -1) return '8_TRACK';
  return 'UNKNOWN';
}

export function conditionMultiplier(condition, sealed) {
  var c = cleanText(condition);
  if (sealed) return 1.45;
  if (c === 'm') return 1.35;
  if (c === 'nm') return 1.25;
  if (c === 'vg+' || (c.indexOf('vg') !== -1 && c.indexOf('+') !== -1)) return 1.12;
  if (c === 'vg') return 1.0;
  if (c === 'g') return 0.72;
  return 1.0;
}

// FIX: now accepts catalogCountry as 5th argument so catalog-detected
// country (e.g. Spain from MILS prefix) triggers the regional floor
// even when artist/title/label contain no Spanish language terms.
export function isSpanishOrRegionalLikely(artist, title, genre, label, catalogCountry) {
  var text = cleanText([artist, title, genre, label, catalogCountry || ''].join(' '));
  var terms = [
    'tejano', 'conjunto', 'norteno', 'norteño', 'regional mexican',
    'spanish', 'mexican', 'freddie', 'latin', 'ranchera', 'cumbia',
    'spain', 'espana', 'españa', 'us-regional',
  ];
  return terms.some(function(term) { return text.indexOf(cleanText(term)) !== -1; });
}

export function buildSearchUrl(source, artist, title, releaseType, catalogNumber, label) {
  var q = encodeURIComponent(
    stripAccents([artist, title, label, catalogNumber, getFormatSearchTerms(releaseType)].filter(Boolean).join(' '))
  );
  if (source === 'eBay Sold') return 'https://www.ebay.com/sch/i.html?_nkw=' + q + '&LH_Sold=1&LH_Complete=1';
  if (source === 'Popsike') return 'https://www.popsike.com/php/quicksearch.php?searchtext=' + q;
  if (source === 'MusicStack') return 'https://www.musicstack.com/search/' + q;
  if (source === 'CDandLP') return 'https://www.cdandlp.com/en/search/?q=' + q;
  if (source === 'Online Record Stores') return 'https://www.google.com/search?q=' + q + '+record+store';
  if (source === 'Auction Sites') return 'https://www.google.com/search?q=' + q + '+auction+sold';
  return null;
}
