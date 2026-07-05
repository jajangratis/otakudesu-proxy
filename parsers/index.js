const { load } = require('cheerio');
const { detectPageKind, normalizePath } = require('./utils');
const { parseGridPage, parseHomePage } = require('./grid');
const { parseDetailPage } = require('./detail');
const { parseEpisodePage } = require('./episode');
const { parseSchedulePage } = require('./schedule');
const { parseGenreListPage } = require('./genres');
const { parseBatchPage } = require('./batch');
const { parseAnimeListPage } = require('./animeList');

function parsePage(html, path) {
  const normalizedPath = normalizePath(path);
  const kind = detectPageKind(normalizedPath);
  const $ = load(html);

  switch (kind) {
    case 'home':
      return parseHomePage($, normalizedPath);
    case 'grid':
    case 'search':
      return parseGridPage($, normalizedPath);
    case 'genreList':
      return parseGenreListPage($, normalizedPath);
    case 'schedule':
      return parseSchedulePage($, normalizedPath);
    case 'animeList':
      return parseAnimeListPage($, normalizedPath);
    case 'detail':
      return parseDetailPage($, normalizedPath);
    case 'episode':
      return parseEpisodePage($, normalizedPath);
    case 'batch':
      return parseBatchPage($, normalizedPath);
    default:
      return {
        ok: false,
        kind: 'unknown',
        path: normalizedPath,
        error: 'Halaman tidak didukung mode native',
        fallbackPath: normalizedPath,
      };
  }
}

module.exports = {
  detectPageKind,
  normalizePath,
  parsePage,
};
