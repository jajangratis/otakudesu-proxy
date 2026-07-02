const { load } = require('cheerio');

const DEFAULT_ORIGIN = 'https://otakudesu.blog';
const ORIGIN = (process.env.SITE_ORIGIN || process.env.OTAKUDESU_ORIGIN || DEFAULT_ORIGIN).replace(
  /\/+$/,
  ''
);

function getOriginHost() {
  try {
    return new URL(ORIGIN).hostname.toLowerCase();
  } catch {
    return 'otakudesu.blog';
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const blockedHostKeywords = [
  'doubleclick',
  'googlesyndication',
  'googleadservices',
  'adnxs',
  'exoclick',
  'popads',
  'hilltopads',
  'juicyads',
  'trafficstars',
  'propellerads',
  'adsterra',
  'onclickads',
  'adskeeper',
  'adcash',
  'taboola',
  'outbrain',
  'mgid',
  'clickadu',
  'banner',
  'popup',
  'rebrand.ly',
  'bit.ly',
  'tinyurl',
];

const hideSelectors = [
  'iframe',
  'ins.adsbygoogle',
  '[id*="ad"]',
  '[class*="ad-"]',
  '[class^="ad-"]',
  '[class*="ads"]',
  '[class*="banner"]',
  '[class*="popup"]',
  '[data-ad]',
  '.ads',
  '.adsbox',
  '.adsbygoogle',
  '.banner',
  '.popup',
  '.popunder',
  '.sticky-ads',
  '.box_item_ads',
  '.box_item_ads_popup',
  '.iklan',
  '#overplay',
  '#iklanbawah',
  '[id^="iklantengah"]',
];

const episodeAdRemoveSelectors = [
  '#overplay',
  '#iklanbawah',
  '.box_item_ads_popup',
  '[id^="iklantengah"]',
];

const episodeAdCloseSelectors = [
  '#close-button2',
  '#close-iklanbawah',
  '.box_item_ads_popup .close-button',
  '[id*="close-button"]',
  '[id*="close-iklan"]',
];

function isSiteHost(host) {
  const originHost = getOriginHost();
  const normalizedHost = host.toLowerCase();
  return (
    normalizedHost === originHost ||
    normalizedHost === `www.${originHost}` ||
    originHost === `www.${normalizedHost}`
  );
}

function isBlockedUrl(rawUrl) {
  if (!rawUrl) {
    return false;
  }

  try {
    const parsed = new URL(rawUrl, ORIGIN);
    const host = parsed.hostname.toLowerCase();
    return blockedHostKeywords.some((keyword) => host.includes(keyword));
  } catch {
    return blockedHostKeywords.some((keyword) => rawUrl.toLowerCase().includes(keyword));
  }
}

function isSiteUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl, ORIGIN);
    return isSiteHost(parsed.hostname);
  } catch {
    return rawUrl.toLowerCase().includes(getOriginHost());
  }
}

function toProxyPath(rawUrl) {
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('javascript:')) {
    return rawUrl;
  }

  if (isBlockedUrl(rawUrl)) {
    return '';
  }

  const parsed = new URL(rawUrl, ORIGIN);
  if (!isSiteHost(parsed.hostname)) {
    return rawUrl;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function rewriteHtml(html) {
  const $ = load(html);
  const siteHost = getOriginHost();

  $('script, iframe, a, link, img, source, video, form, area').each((_, element) => {
    const node = $(element);

    ['src', 'href', 'action', 'data-src', 'data-href', 'poster'].forEach((attribute) => {
      const value = node.attr(attribute);
      if (!value) {
        return;
      }

      if (isBlockedUrl(value)) {
        node.removeAttr(attribute);
        if (element.tagName === 'script' || element.tagName === 'iframe' || element.tagName === 'a') {
          node.remove();
        }
        return;
      }

      const rewritten = toProxyPath(value);
      if (!rewritten) {
        node.remove();
        return;
      }

      node.attr(attribute, rewritten);
    });

    ['onclick', 'onmouseover', 'onload'].forEach((attribute) => {
      const id = (node.attr('id') || '').toLowerCase();
      const className = (node.attr('class') || '').toLowerCase();
      const isDismissControl =
        id.includes('close') || className.includes('close') || id.includes('tutup');

      if (!isDismissControl) {
        node.removeAttr(attribute);
      }
    });

    if (node.attr('target') === '_blank') {
      node.attr('target', '_self');
    }
  });

  $('[srcset]').each((_, element) => {
    const node = $(element);
    const srcset = node.attr('srcset');
    if (!srcset) {
      return;
    }

    const rewritten = srcset
      .split(',')
      .map((entry) => {
        const parts = entry.trim().split(/\s+/);
        const url = parts[0];
        const descriptor = parts.slice(1).join(' ');
        const nextUrl = toProxyPath(url);
        if (!nextUrl) {
          return '';
        }
        return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
      })
      .filter(Boolean)
      .join(', ');

    if (rewritten) {
      node.attr('srcset', rewritten);
    } else {
      node.removeAttr('srcset');
    }
  });

  $('a[href*="rebrand.ly"], a[href*="bit.ly"]').remove();

  $('#overplay, #iklanbawah, .box_item_ads_popup, [id^="iklantengah"]').remove();
  $('.iklan').remove();

  $('script[type="application/ld+json"]').remove();

  $('script').each((_, element) => {
    const node = $(element);
    const scriptBody = node.html() || '';
    if (
      isBlockedUrl(node.attr('src')) ||
      /window\.open|popunder|rebrand\.ly|box_item_ads_popup|iklanbawah|counter_tampilan/i.test(
        scriptBody
      )
    ) {
      node.remove();
    }
  });

  if ($('base').length === 0) {
    $('head').prepend('<base href="/" data-otakudesu-proxy="true">');
  }

  const antiAdCss = `${hideSelectors.join(', ')} { display: none !important; visibility: hidden !important; max-height: 0 !important; pointer-events: none !important; }`;
  const antiPopupJs = `
    (() => {
      const siteHost = ${JSON.stringify(siteHost)};
      const removeEpisodeAdSelectors = ${JSON.stringify(episodeAdRemoveSelectors)};
      const closeEpisodeAdSelectors = ${JSON.stringify(episodeAdCloseSelectors)};
      const noop = () => null;
      window.open = noop;
      window.print = noop;

      const dismissEpisodeAds = () => {
        removeEpisodeAdSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((node) => node.remove());
        });
      };

      const wireEpisodeAdCloseButtons = () => {
        closeEpisodeAdSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((button) => {
            if (button.getAttribute('data-otakudesu-wired') === 'true') {
              return;
            }

            button.setAttribute('data-otakudesu-wired', 'true');
            button.addEventListener(
              'click',
              (event) => {
                event.preventDefault();
                event.stopPropagation();

                const overplay = document.getElementById('overplay');
                if (overplay) {
                  overplay.remove();
                  return;
                }

                const bottomAd = document.getElementById('iklanbawah');
                if (bottomAd) {
                  bottomAd.remove();
                  return;
                }

                const popup = button.closest('.box_item_ads_popup');
                if (popup) {
                  popup.remove();
                  return;
                }

                const container = button.closest(
                  '#overplay, #iklanbawah, .box_item_ads_popup, [id^="iklantengah"]'
                );
                if (container) {
                  container.remove();
                }
              },
              true
            );
          });
        });
      };

      const guardEpisodeAds = () => {
        dismissEpisodeAds();
        wireEpisodeAdCloseButtons();
      };

      guardEpisodeAds();
      setInterval(guardEpisodeAds, 800);
      if (document.documentElement) {
        new MutationObserver(guardEpisodeAds).observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      }

      const isSiteHost = (host) => {
        const normalized = host.toLowerCase();
        return normalized === siteHost || normalized === 'www.' + siteHost || siteHost === 'www.' + normalized;
      };

      const toLocalSitePath = (rawUrl) => {
        try {
          const parsed = new URL(rawUrl, window.location.origin);
          if (isSiteHost(parsed.hostname)) {
            return parsed.pathname + parsed.search + parsed.hash;
          }
        } catch {}
        return null;
      };

      document.addEventListener('click', (event) => {
        const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (!link) {
          return;
        }

        try {
          const parsed = new URL(link.href);
          const host = parsed.hostname.toLowerCase();

          if (host.includes('rebrand.ly') || host.includes('bit.ly')) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          const localPath = toLocalSitePath(link.href);
          if (localPath) {
            event.preventDefault();
            event.stopPropagation();
            link.setAttribute('target', '_self');
            window.location.href = localPath;
            return;
          }
        } catch {}

        if (link.getAttribute('target') === '_blank') {
          event.preventDefault();
          link.setAttribute('target', '_self');
          window.location.href = link.href;
        }
      }, true);

      const originalAssign = window.location.assign.bind(window.location);
      const originalReplace = window.location.replace.bind(window.location);

      window.location.assign = (url) => {
        const localPath = toLocalSitePath(url);
        if (localPath) {
          originalAssign(localPath);
          return;
        }
        originalAssign(url);
      };

      window.location.replace = (url) => {
        const localPath = toLocalSitePath(url);
        if (localPath) {
          originalReplace(localPath);
          return;
        }
        originalReplace(url);
      };
    })();
  `;

  $('head').append(`<style data-otakudesu-proxy="true">${antiAdCss}</style>`);
  $('head').append(`<script data-otakudesu-proxy="true">${antiPopupJs}</script>`);

  const originPattern = new RegExp(
    `https?:\\/\\/(?:www\\.)?${escapeRegExp(siteHost)}`,
    'gi'
  );

  return $.html()
    .replace(originPattern, '')
    .replace(/https?:\/\/[^"'\\s>]*rebrand\.ly[^"'\\s>]*/gi, '');
}

module.exports = {
  DEFAULT_ORIGIN,
  ORIGIN,
  getOriginHost,
  isBlockedUrl,
  isSiteUrl,
  isSiteHost,
  rewriteHtml,
  toProxyPath,
};
