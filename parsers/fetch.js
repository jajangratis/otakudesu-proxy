const { ORIGIN } = require('../filter');

async function fetchUpstreamHtml(path, searchParams) {
  const safePath = path === '/' ? '/' : path.replace(/\/{2,}/g, '/');
  const search = searchParams ? searchParams.toString() : '';
  const targetUrl = `${ORIGIN}${safePath}${search ? `?${search}` : ''}`;

  const response = await fetch(targetUrl, {
    headers: {
      'accept-language': 'en-US,en;q=0.9,id;q=0.8',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      referer: ORIGIN,
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    const error = new Error(`Upstream returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const html = await response.text();
  return { html, targetUrl };
}

module.exports = {
  fetchUpstreamHtml,
};
