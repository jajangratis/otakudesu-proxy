const { cleanText, isAdPath, toSitePath } = require('./utils');

// Link mirror batch ada di .batchlink / .download2 / .download: tiap <li> berisi
// <strong>MP4 360p</strong> lalu beberapa <a> ke host eksternal (link.desustream.com dll).
function collectMirrorLinks($) {
  const downloads = [];
  const seen = new Set();

  $('.batchlink li, .download2 li, .download li').each((_, element) => {
    const $row = $(element);
    const quality = cleanText($row.find('strong').first().text());

    $row.find('a[href]').each((__, link) => {
      const href = ($(link).attr('href') || '').trim();
      if (!/^https?:\/\//i.test(href) || isAdPath(href) || seen.has(href)) {
        return;
      }

      const host = cleanText($(link).text()) || 'Download';
      seen.add(href);
      downloads.push({
        label: quality ? `${quality} · ${host}` : host,
        path: href,
        quality: quality || null,
        host,
        external: true,
      });
    });
  });

  return downloads;
}

function collectLegacyLinks($) {
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

  return downloads;
}

function parseBatchPage($, path) {
  const title = cleanText($('h1').first().text()) || 'Batch Download';
  const mirrors = collectMirrorLinks($);

  return {
    ok: true,
    kind: 'batch',
    path,
    title,
    downloads: mirrors.length > 0 ? mirrors : collectLegacyLinks($),
  };
}

module.exports = {
  parseBatchPage,
};
