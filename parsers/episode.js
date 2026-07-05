const { cleanText, isAdPath, toAbsoluteUrl, toSitePath } = require('./utils');

const STREAM_HOST_KEYWORDS = [
  'desustream',
  'desustream.info',
  'link.desustream',
  'yourupload',
  'mp4upload',
  'streamwish',
  'embedwish',
  'luluvdo',
  'filemoon',
  'vidhide',
  'dood',
  'doodstream',
  'gdrive',
  'googlevideo',
  'streamtape',
  'mixdrop',
  'voe.sx',
  'vidguard',
  'streamsb',
  'sbembed',
  'tubeload',
  'upstream',
  'mp4hydra',
];

const DOWNLOAD_LABEL_KEYWORDS = [
  'filedon',
  'pdrain',
  'acefile',
  'gofile',
  'mega',
  'kfiles',
  'mediafire',
  'zippyshare',
  'solidfiles',
  'userscloud',
];

function isStreamUrl(url) {
  if (!url) {
    return false;
  }

  if (isAdPath(url)) {
    return false;
  }

  try {
    const host = new URL(url, 'https://otakudesu.blog').hostname.toLowerCase();
    return STREAM_HOST_KEYWORDS.some((keyword) => host.includes(keyword));
  } catch {
    return STREAM_HOST_KEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));
  }
}

function isDownloadMirrorLabel(label) {
  const normalized = label.toLowerCase();
  return DOWNLOAD_LABEL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function parseEpisodePage($, path) {
  const title =
    cleanText($('h1').first().text()) ||
    cleanText($('.posttl').first().text()) ||
    'Episode';

  const streams = [];
  const seen = new Set();

  const iframeSrc =
    $('iframe[src*="desustream"]').first().attr('src') ||
    $('#embed_holder iframe').first().attr('src') ||
    $('#lightsVideo iframe').first().attr('src');

  if (iframeSrc) {
    const absolute = toAbsoluteUrl(iframeSrc);
    if (absolute && !seen.has(absolute)) {
      seen.add(absolute);
      streams.push({ label: 'Player', path: absolute, external: true });
    }
  }

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href || href === '#' || isAdPath(href)) {
      return;
    }

    const label = cleanText($(element).text());
    if (!label || isDownloadMirrorLabel(label)) {
      return;
    }

    if (/^\d{3}p$/i.test(label) && isStreamUrl(href)) {
      const streamPath = href.startsWith('http') ? href : toSitePath(href);
      if (!streamPath || seen.has(streamPath)) {
        return;
      }

      seen.add(streamPath);
      streams.push({
        label,
        path: streamPath,
        external: href.startsWith('http'),
      });
      return;
    }

    if (/odstream|stream/i.test(label) && isStreamUrl(href)) {
      const streamPath = href.startsWith('http') ? href : toSitePath(href);
      if (!streamPath || seen.has(streamPath)) {
        return;
      }

      seen.add(streamPath);
      streams.push({
        label: label || 'Stream',
        path: streamPath,
        external: href.startsWith('http'),
      });
    }
  });

  return {
    ok: true,
    kind: 'episode',
    path,
    title,
    streams,
    playerPath: path,
  };
}

module.exports = {
  parseEpisodePage,
};
