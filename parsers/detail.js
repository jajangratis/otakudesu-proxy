const { cleanText, isAdPath, toAbsoluteUrl, toSitePath } = require('./utils');

function parseDetailPage($, path) {
  const title =
    cleanText($('h1').first().text()) ||
    cleanText($('.infozin .judul').first().text()) ||
    cleanText($('.posttl').first().text()) ||
    'Detail Anime';

  const thumbnail =
    toAbsoluteUrl($('.infozin .thumb img').attr('src')) ||
    toAbsoluteUrl($('.thumb img').first().attr('src'));

  const info = {};
  $('.infozin .infox .infox span, .infox span').each((_, element) => {
    const text = cleanText($(element).text());
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = cleanText(parts[0]).toLowerCase();
      const value = cleanText(parts.slice(1).join(':'));
      if (key && value) {
        info[key] = value;
      }
    }
  });

  const episodes = [];
  const seen = new Set();

  $('a[href*="/episode/"]').each((_, element) => {
    const href = $(element).attr('href');
    const episodePath = toSitePath(href);
    if (!episodePath || isAdPath(episodePath) || seen.has(episodePath)) {
      return;
    }

    seen.add(episodePath);
    const label = cleanText($(element).text()) || episodePath.split('/').filter(Boolean).pop();
    episodes.push({ label, path: episodePath });
  });

  const batchLinks = [];
  $('a[href*="/batch/"]').each((_, element) => {
    const href = $(element).attr('href');
    const batchPath = toSitePath(href);
    if (!batchPath || isAdPath(batchPath)) {
      return;
    }

    batchLinks.push({
      label: cleanText($(element).text()) || 'Batch',
      path: batchPath,
    });
  });

  return {
    ok: true,
    kind: 'detail',
    path,
    title,
    thumbnail,
    info,
    episodes,
    batchLinks,
    synopsis: cleanText($('.sinopc p').first().text()) || cleanText($('.entry-content p').first().text()),
  };
}

module.exports = {
  parseDetailPage,
};
