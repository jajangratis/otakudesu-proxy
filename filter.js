const { load } = require('cheerio');

const ORIGIN = 'https://otakudesu.blog';

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
];

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

function toProxyPath(rawUrl) {
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('javascript:')) {
    return rawUrl;
  }

  const parsed = new URL(rawUrl, ORIGIN);
  if (!parsed.hostname.includes('otakudesu')) {
    return rawUrl;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function rewriteHtml(html) {
  const $ = load(html);

  $('script, iframe, a, link, img, source, video, form').each((_, element) => {
    const node = $(element);

    ['src', 'href', 'action', 'data-src'].forEach((attribute) => {
      const value = node.attr(attribute);
      if (!value) {
        return;
      }

      if (isBlockedUrl(value)) {
        node.removeAttr(attribute);
        if (element.tagName === 'script' || element.tagName === 'iframe') {
          node.remove();
        }
        return;
      }

      node.attr(attribute, toProxyPath(value));
    });

    ['onclick', 'onmouseover', 'onload'].forEach((attribute) => {
      node.removeAttr(attribute);
    });

    if (node.attr('target') === '_blank') {
      node.attr('target', '_self');
    }
  });

  $('script').each((_, element) => {
    const node = $(element);
    const scriptBody = node.html() || '';
    if (isBlockedUrl(node.attr('src')) || /window\.open|popunder|onclick/i.test(scriptBody)) {
      node.remove();
    }
  });

  const antiAdCss = `${hideSelectors.join(', ')} { display: none !important; visibility: hidden !important; max-height: 0 !important; }`;
  const antiPopupJs = `
    (() => {
      const noop = () => null;
      window.open = noop;
      window.print = noop;

      document.addEventListener('click', (event) => {
        const link = event.target && event.target.closest ? event.target.closest('a[target="_blank"]') : null;
        if (link) {
          event.preventDefault();
          link.setAttribute('target', '_self');
          location.href = link.href;
        }
      }, true);
    })();
  `;

  $('head').append(`<style data-otakudesu-proxy="true">${antiAdCss}</style>`);
  $('head').append(`<script data-otakudesu-proxy="true">${antiPopupJs}</script>`);

  return $.html();
}

module.exports = {
  ORIGIN,
  isBlockedUrl,
  rewriteHtml,
  toProxyPath,
};
