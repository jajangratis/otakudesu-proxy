const { ORIGIN } = require('../filter');

function normalizePath(path) {
  if (!path || path === '/') {
    return '/';
  }

  const withLeading = path.startsWith('/') ? path : `/${path}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function toAbsoluteUrl(rawUrl) {
  if (!rawUrl) {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:')) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  return `${ORIGIN}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

function toSitePath(rawUrl) {
  if (!rawUrl) {
    return null;
  }

  try {
    const absolute = toAbsoluteUrl(rawUrl);
    if (!absolute) {
      return null;
    }

    const parsed = new URL(absolute);
    const originHost = new URL(ORIGIN).hostname.toLowerCase();
    const host = parsed.hostname.toLowerCase();

    if (host !== originHost && host !== `www.${originHost}`) {
      return null;
    }

    const path = parsed.pathname || '/';
    const search = parsed.search;
    return normalizePath(path) + (search || '');
  } catch {
    if (rawUrl.startsWith('/')) {
      return normalizePath(rawUrl);
    }

    return null;
  }
}

function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function detectPageKind(path) {
  const normalized = normalizePath(path);

  if (normalized === '/') {
    return 'home';
  }

  if (normalized.startsWith('/search')) {
    return 'search';
  }

  if (normalized === '/ongoing-anime/' || normalized === '/complete-anime/') {
    return 'grid';
  }

  if (normalized === '/genre-list/') {
    return 'genreList';
  }

  if (normalized.startsWith('/genres/')) {
    return 'grid';
  }

  if (normalized === '/jadwal-rilis/') {
    return 'schedule';
  }

  if (normalized === '/anime-list/') {
    return 'animeList';
  }

  if (normalized.startsWith('/anime/')) {
    return 'detail';
  }

  if (normalized.startsWith('/episode/')) {
    return 'episode';
  }

  if (normalized.startsWith('/batch/')) {
    return 'batch';
  }

  return 'unknown';
}

function isAdPath(path) {
  if (!path) {
    return true;
  }

  return /rebrand\.ly|bit\.ly|tinyurl/i.test(path);
}

module.exports = {
  cleanText,
  detectPageKind,
  isAdPath,
  normalizePath,
  toAbsoluteUrl,
  toSitePath,
};
