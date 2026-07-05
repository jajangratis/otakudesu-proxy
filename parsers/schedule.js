const { cleanText, toSitePath } = require('./utils');
const { parseGridCard } = require('./grid');

function parseSchedulePage($, path) {
  const days = [];
  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  dayNames.forEach((dayName) => {
    const $heading = $(`h2:contains("${dayName}"), h3:contains("${dayName}")`).first();
    if (!$heading.length) {
      return;
    }

    const items = [];
    const seen = new Set();
    let $cursor = $heading.next();

    while ($cursor.length && !$cursor.is('h2, h3')) {
      $cursor.find('a[href*="/anime/"]').each((_, link) => {
        const href = $(link).attr('href');
        const itemPath = toSitePath(href);
        if (!itemPath || seen.has(itemPath)) {
          return;
        }

        seen.add(itemPath);
        items.push({
          title: cleanText($(link).text()),
          path: itemPath,
          thumbnail: null,
          badge: null,
        });
      });

      $cursor.find('.venz li, .detpost').each((_, element) => {
        const item = parseGridCard($, element);
        if (!item || seen.has(item.path)) {
          return;
        }

        seen.add(item.path);
        items.push(item);
      });

      $cursor = $cursor.next();
    }

    if (items.length > 0) {
      days.push({ day: dayName, items });
    }
  });

  if (days.length === 0) {
    $('.jadwal').each((_, element) => {
      const $block = $(element);
      const day = cleanText($block.find('h2, h3').first().text()) || 'Jadwal';
      const items = [];

      $block.find('a[href*="/anime/"]').each((__, link) => {
        const href = $(link).attr('href');
        const itemPath = toSitePath(href);
        if (!itemPath) {
          return;
        }

        items.push({
          title: cleanText($(link).text()),
          path: itemPath,
          thumbnail: null,
          badge: null,
        });
      });

      if (items.length > 0) {
        days.push({ day, items });
      }
    });
  }

  return {
    ok: true,
    kind: 'schedule',
    path,
    title: cleanText($('h1').first().text()) || 'Jadwal Rilis',
    days,
  };
}

module.exports = {
  parseSchedulePage,
};
