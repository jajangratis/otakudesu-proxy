const { cleanText, toSitePath } = require('./utils');

function parseSearchPageFromHref(href) {
  if (!href) {
    return null;
  }

  try {
    const parsed = new URL(href, 'https://otakudesu.blog');
    const paged = parsed.searchParams.get('paged');
    if (paged && /^\d+$/.test(paged)) {
      return Number(paged);
    }
  } catch {
    return null;
  }

  return null;
}

function extractPagination($, currentPath) {
  const $nav = $('.pagination .pagenavix, .pagination, .nav-links, .wp-pagenavi').first();
  if (!$nav.length) {
    return {
      currentPage: 1,
      prevPath: null,
      nextPath: null,
      pages: [],
    };
  }

  let currentPage = 1;
  let prevPath = null;
  let nextPath = null;
  const pages = [];
  const seenPaths = new Set();

  const addPage = function(label, path, current) {
    if (!path || seenPaths.has(path)) {
      return;
    }

    seenPaths.add(path);
    pages.push({
      label,
      path,
      current: Boolean(current),
    });
  };

  $nav.find('a.page-numbers, span.page-numbers').each((_, element) => {
    const $el = $(element);
    const text = cleanText($el.text());
    if (!text || $el.hasClass('dots')) {
      return;
    }

    const href = $el.attr('href');
    const path = href ? toSitePath(href) : null;
    const isCurrent = $el.hasClass('current') || $el.attr('aria-current') === 'page';

    if ($el.hasClass('prev') || /sebelumnya|«/i.test(text)) {
      prevPath = path;
      return;
    }

    if ($el.hasClass('next') || /berikutnya|»/i.test(text)) {
      nextPath = path;
      return;
    }

    if (isCurrent) {
      const pageNumber = /^\d+$/.test(text) ? Number(text) : 1;
      currentPage = pageNumber;
      addPage(text, path || currentPath, true);
      return;
    }

    if (path && /^\d+$/.test(text)) {
      addPage(text, path, false);
    }
  });

  if (!nextPath) {
    const $next = $nav.find('a.next, a.next.page-numbers').first();
    if ($next.length) {
      nextPath = toSitePath($next.attr('href'));
    }
  }

  if (!prevPath) {
    const $prev = $nav.find('a.prev, a.prev.page-numbers').first();
    if ($prev.length) {
      prevPath = toSitePath($prev.attr('href'));
    }
  }

  return {
    currentPage,
    prevPath,
    nextPath,
    pages,
  };
}

module.exports = {
  extractPagination,
  parseSearchPageFromHref,
};
