const { cleanText, isAdPath, toAbsoluteUrl, toSitePath } = require('./utils');

function extractThumbnail($card) {
  const img =
    $card.find('.thumb img').first().attr('src') ||
    $card.find('.thumbz img').first().attr('src') ||
    $card.find('img').first().attr('src') ||
    $card.find('img').first().attr('data-src') ||
    $card.find('img').first().attr('data-lazy-src');

  return toAbsoluteUrl(img);
}

function extractTitle($card) {
  const title =
    cleanText($card.find('h2').first().text()) ||
    cleanText($card.find('.jdlflm').first().text()) ||
    cleanText($card.find('.judul').first().text()) ||
    cleanText($card.find('a').first().attr('title'));

  return title;
}

function extractBadge($card) {
  return (
    cleanText($card.find('.epz').first().text()) ||
    cleanText($card.find('.epztipe').first().text()) ||
    cleanText($card.find('.dtla').first().text()) ||
    null
  );
}

function parseGridCard($, element) {
  const $card = $(element);
  const link = $card.find('a[href*="/anime/"]').first();
  const href = link.attr('href') || $card.find('a').first().attr('href');
  const path = toSitePath(href);

  if (!path || isAdPath(path)) {
    return null;
  }

  const title = extractTitle($card);
  if (!title) {
    return null;
  }

  return {
    title,
    path,
    thumbnail: extractThumbnail($card),
    badge: extractBadge($card),
  };
}

function collectGridItems($) {
  const seen = new Set();
  const items = [];

  $('.venz li, .detpost, .animepost').each((_, element) => {
    const item = parseGridCard($, element);
    if (!item || seen.has(item.path)) {
      return;
    }

    seen.add(item.path);
    items.push(item);
  });

  if (items.length === 0) {
    $('a[href*="/anime/"]').each((_, element) => {
      const href = $(element).attr('href');
      const path = toSitePath(href);
      if (!path || isAdPath(path) || seen.has(path)) {
        return;
      }

      const title = cleanText($(element).text()) || cleanText($(element).attr('title'));
      if (!title || title.length < 2) {
        return;
      }

      seen.add(path);
      items.push({
        title,
        path,
        thumbnail: null,
        badge: null,
      });
    });
  }

  return items;
}

function parseGridPage($, path, title) {
  const pageTitle =
    title ||
    cleanText($('h1').first().text()) ||
    cleanText($('.breadcrumb').last().text()) ||
    'Anime';

  return {
    ok: true,
    kind: 'grid',
    path,
    title: pageTitle,
    items: collectGridItems($),
    nextPath: null,
  };
}

function extractMoreLinkMeta($, $section) {
  const $parent = $section.parent();
  const $moreLink = $parent
    .find('a[href*="/ongoing-anime/"], a[href*="/complete-anime/"]')
    .first();

  if (!$moreLink.length) {
    return { title: null, moreLabel: null, morePath: null };
  }

  const morePath = toSitePath($moreLink.attr('href'));
  const title =
    cleanText($moreLink.find('h1').first().text()) ||
    cleanText($moreLink.find('h2').first().text()) ||
    null;

  let moreLabel =
    cleanText($moreLink.find('.iconf').first().text()) ||
    cleanText($moreLink.text().match(/Cek Anime[\s\S]*?Lainnya/i)?.[0] || '');

  if (!moreLabel && morePath) {
    if (morePath.includes('ongoing-anime')) {
      moreLabel = 'Cek Anime On-going Lainnya';
    } else if (morePath.includes('complete-anime')) {
      moreLabel = 'Cek Anime Selesai Lainnya';
    }
  }

  return {
    title,
    moreLabel: moreLabel || null,
    morePath,
  };
}

function parseHomePage($, path) {
  const sections = [];

  $('.venz').each((_, element) => {
    const $section = $(element);
    const meta = extractMoreLinkMeta($, $section);
    const heading =
      meta.title ||
      cleanText($section.prev('h2').text()) ||
      cleanText($section.prev('.bixbox').find('h2').text()) ||
      cleanText($section.closest('.bixbox').find('h2').first().text()) ||
      (meta.morePath?.includes('ongoing-anime') ? 'On-going Anime' : null) ||
      (meta.morePath?.includes('complete-anime') ? 'Complete Anime' : null) ||
      'Anime';

    const items = [];
    const seen = new Set();

    $section.find('li').each((__, li) => {
      const item = parseGridCard($, li);
      if (!item || seen.has(item.path)) {
        return;
      }

      seen.add(item.path);
      items.push(item);
    });

    if (items.length > 0) {
      sections.push({
        title: heading,
        items,
        moreLabel: meta.moreLabel,
        morePath: meta.morePath,
      });
    }
  });

  if (sections.length === 0) {
    const items = collectGridItems($);
    sections.push({ title: 'Beranda', items });
  }

  const mergedSections = [];
  const sectionIndex = new Map();

  sections.forEach((section) => {
    const existing = sectionIndex.get(section.title);
    if (!existing) {
      const next = {
        title: section.title,
        items: [...section.items],
        moreLabel: section.moreLabel,
        morePath: section.morePath,
      };
      sectionIndex.set(section.title, next);
      mergedSections.push(next);
      return;
    }

    const seen = new Set(existing.items.map((item) => item.path));
    section.items.forEach((item) => {
      if (seen.has(item.path)) {
        return;
      }

      seen.add(item.path);
      existing.items.push(item);
    });

    if (!existing.morePath && section.morePath) {
      existing.morePath = section.morePath;
      existing.moreLabel = section.moreLabel;
    }
  });

  return {
    ok: true,
    kind: 'home',
    path,
    title: cleanText($('h1').first().text()) || 'Beranda',
    sections: mergedSections,
    nextPath: null,
  };
}

module.exports = {
  collectGridItems,
  parseGridCard,
  parseGridPage,
  parseHomePage,
};
