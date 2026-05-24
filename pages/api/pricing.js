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

function money(value) {
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
