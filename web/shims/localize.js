/**
 * Web shim for react-native-localize, backed by navigator.languages.
 */

function browserLanguages() {
  if (typeof navigator === 'undefined') { return ['en']; }
  if (navigator.languages && navigator.languages.length) { return navigator.languages; }
  return [navigator.language || 'en'];
}

export function findBestLanguageTag(supported) {
  for (const lang of browserLanguages()) {
    const lower = lang.toLowerCase();
    const match = supported.find(
      s => lower === s.toLowerCase() || lower.startsWith(s.toLowerCase() + '-')
    );
    if (match) { return { languageTag: match, isRTL: false }; }
  }
  return undefined;
}

export function getLocales() {
  return browserLanguages().map(tag => ({
    languageCode: tag.split('-')[0],
    languageTag: tag,
    countryCode: (tag.split('-')[1] || '').toUpperCase(),
    isRTL: false,
  }));
}

export function getTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return 'UTC'; }
}

export function uses24HourClock() { return true; }
