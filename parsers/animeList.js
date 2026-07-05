const { cleanText, toSitePath } = require('./utils');

function parseAnimeListPage($, path) {
  const sections = [];
  const seen = new Set();

  $('.bariskelom, .bariskolom, .anime-list, .genx').each((_, element) => {
    const $block = $(element);
    const letter =
      cleanText($block.find('h3, h4, .bariskelom h3').first().text()) ||
      cleanText($block.prev('h3, h4').text());

    const items = [];

    $block.find('a[href*="/anime/"]').each((__, link) => {
      const href = $(link).attr('href');
      const itemPath = toSitePath(href);
      if (!itemPath || seen.has(itemPath)) {
        return;
      }

      const title = cleanText($(link).text());
      if (!title) {
        return;
      }

      seen.add(itemPath);
      items.push({ title, path: itemPath });
    });

    if (items.length > 0) {
      sections.push({ letter: letter || '#', items });
    }
  });

  if (sections.length === 0) {
    const items = [];
    $('a[href*="/anime/"]').each((_, link) => {
      const href = $(link).attr('href');
      const itemPath = toSitePath(href);
      if (!itemPath || seen.has(itemPath)) {
        return;
      }

      const title = cleanText($(link).text());
      if (!title) {
        return;
      }

      seen.add(itemPath);
      items.push({ title, path: itemPath });
    });

    if (items.length > 0) {
      sections.push({ letter: 'A-Z', items });
    }
  }

  return {
    ok: true,
    kind: 'animeList',
    path,
    title: cleanText($('h1').first().text()) || 'Anime List',
    sections,
  };
}

module.exports = {
  parseAnimeListPage,
};
