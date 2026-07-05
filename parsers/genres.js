const { cleanText, toSitePath } = require('./utils');

function parseGenreListPage($, path) {
  const genres = [];
  const seen = new Set();

  $('a[href*="/genres/"]').each((_, element) => {
    const href = $(element).attr('href');
    const genrePath = toSitePath(href);
    if (!genrePath || seen.has(genrePath)) {
      return;
    }

    const label = cleanText($(element).text());
    if (!label) {
      return;
    }

    seen.add(genrePath);
    genres.push({ label, path: genrePath });
  });

  return {
    ok: true,
    kind: 'genreList',
    path,
    title: cleanText($('h1').first().text()) || 'Genre List',
    genres,
  };
}

module.exports = {
  parseGenreListPage,
};
