const express = require('express');
const os = require('os');
const { ORIGIN, getOriginHost, isBlockedUrl, rewriteHtml } = require('./filter');
const { fetchUpstreamHtml } = require('./parsers/fetch');
const { normalizePath, parsePage } = require('./parsers/index');

const app = express();
const port = Number(process.env.PORT || 8787);

function buildTargetUrl(pathname, searchParams) {
  const safePath = pathname === '/' ? '/' : pathname.replace(/\/{2,}/g, '/');
  const search = searchParams.toString();
  return `${ORIGIN}${safePath}${search ? `?${search}` : ''}`;
}

function copyHeaders(response, upstreamResponse) {
  ['content-type', 'cache-control', 'etag', 'last-modified'].forEach((header) => {
    const value = upstreamResponse.headers.get(header);
    if (value) {
      response.setHeader(header, value);
    }
  });
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
}

function printStartupInfo() {
  const lanAddresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);

  console.log(`Otakudesu proxy aktif di http://0.0.0.0:${port}`);
  console.log(`Situs sumber: ${ORIGIN}`);
  console.log(`Ubah domain: SITE_ORIGIN=https://otakudesu.care npm run start`);
  console.log(`Health check: http://127.0.0.1:${port}/health`);
  console.log(`Android emulator: http://10.0.2.2:${port}`);
  if (lanAddresses.length > 0) {
    console.log('LAN devices:');
    lanAddresses.forEach((address) => {
      console.log(`  http://${address}:${port}`);
    });
  }
  console.log('Tekan Ctrl+C untuk menghentikan proxy.');
}

app.use((request, response, next) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }
  next();
});

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    origin: ORIGIN,
    siteHost: getOriginHost(),
    port,
    apiVersion: 1,
    features: ['home', 'grid', 'detail', 'episode', 'schedule', 'genreList', 'batch', 'animeList'],
  });
});

async function handleApiPage(request, response) {
  const rawPath = typeof request.query.path === 'string' ? request.query.path : '/';
  const path = normalizePath(rawPath);

  if (isBlockedUrl(`${ORIGIN}${path}`)) {
    response.status(403).json({ ok: false, error: 'Blocked by proxy filter' });
    return;
  }

  try {
    const searchParams = new URLSearchParams();
    Object.entries(request.query).forEach(([key, value]) => {
      if (key === 'path' || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => searchParams.append(key, String(entry)));
        return;
      }

      searchParams.set(key, String(value));
    });

    const { html } = await fetchUpstreamHtml(path, searchParams);
    const payload = parsePage(html, path);
    response.json(payload);
  } catch (error) {
    response.status(502).json({
      ok: false,
      error: 'Failed to parse page',
      details: error instanceof Error ? error.message : String(error),
      fallbackPath: path,
    });
  }
}

app.get('/api/page', handleApiPage);

app.get('/api/search', async (request, response) => {
  const keyword = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  if (!keyword) {
    response.status(400).json({ ok: false, error: 'Parameter q wajib diisi' });
    return;
  }

  const searchParams = new URLSearchParams({
    s: keyword,
    post_type: 'anime',
  });

  const page = Number(request.query.page);
  if (Number.isFinite(page) && page > 1) {
    searchParams.set('paged', String(Math.floor(page)));
  }

  try {
    const { html } = await fetchUpstreamHtml('/', searchParams);
    const payload = parsePage(html, '/search/');
    if (payload.ok && payload.kind === 'grid') {
      payload.searchKeyword = keyword;
      payload.searchPage = Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
    }
    response.json(payload);
  } catch (error) {
    response.status(502).json({
      ok: false,
      error: 'Failed to parse search',
      details: error instanceof Error ? error.message : String(error),
      fallbackPath: '/',
    });
  }
});

app.get('/{*path}', async (request, response) => {
  const targetUrl = buildTargetUrl(request.path, new URLSearchParams(request.query));

  if (isBlockedUrl(targetUrl)) {
    response.status(403).json({ error: 'Blocked by proxy filter' });
    return;
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        'accept-language': request.headers['accept-language'] || 'en-US,en;q=0.9,id;q=0.8',
        'user-agent':
          request.headers['user-agent'] ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        referer: ORIGIN,
        'x-forwarded-host': request.headers.host || `localhost:${port}`,
      },
      redirect: 'follow',
    });

    copyHeaders(response, upstreamResponse);
    response.status(upstreamResponse.status);

    const contentType = upstreamResponse.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await upstreamResponse.text();
      response.send(rewriteHtml(html));
      return;
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    response.send(Buffer.from(arrayBuffer));
  } catch (error) {
    response.status(502).json({
      error: 'Failed to fetch Otakudesu',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

const server = app.listen(port, '0.0.0.0');

server.on('listening', () => {
  printStartupInfo();
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nGagal start: port ${port} sudah dipakai proses lain.`);
    console.error('Proxy mungkin sudah jalan di terminal lain.');
    console.error('\nCek proses yang memakai port:');
    console.error(`  netstat -ano | findstr :${port}`);
    console.error('\nHentikan proses lama (ganti <PID> dengan angka dari perintah di atas):');
    console.error('  taskkill /PID <PID> /F');
    console.error('\nAtau pakai port lain:');
    console.error('  $env:PORT=8788; npm run start');
  } else {
    console.error('Gagal menjalankan proxy:', error.message);
  }

  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nProxy dihentikan.');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

// Hindari proses langsung selesai di beberapa terminal Windows.
if (process.stdin.isTTY) {
  process.stdin.resume();
}
