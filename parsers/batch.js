const { cleanText, isAdPath, toSitePath } = require('./utils');

function parseBatchPage($, path) {
  const title = cleanText($('h1').first().text()) || 'Batch Download';
  const downloads = [];
  const seen = new Set();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href || isAdPath(href)) {
      return;
    }

    const label = cleanText($(element).text());
    const downloadPath = toSitePath(href);

    if (!label || !downloadPath || seen.has(downloadPath)) {
      return;
    }

    if (!/batch|download|720|480|360|240|mp4|mkv|zip/i.test(label + href)) {
      return;
    }

    seen.add(downloadPath);
    downloads.push({ label, path: downloadPath });
  });

  return {
    ok: true,
    kind: 'batch',
    path,
    title,
    downloads,
  };
}

module.exports = {
  parseBatchPage,
};
