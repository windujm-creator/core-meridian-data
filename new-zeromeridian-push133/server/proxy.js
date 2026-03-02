/**
 * server/proxy.js — ZERØ MERIDIAN API Proxy
 * Semua paid API keys di SERVER — tidak pernah masuk client bundle.
 *
 * Setup:
 *   ZM_SANTIMENT_KEY=xxx ZM_MESSARI_KEY=xxx node server/proxy.js
 *
 * Routes:
 *   GET /api/santiment/social-volume
 *   GET /api/token-terminal/projects
 *   GET /api/messari/btc|eth|sol|news
 *   GET /api/dune/:queryId
 */

const http  = require('http');
const https = require('https');
const url   = require('url');

const KEYS = {
  santiment:     process.env.ZM_SANTIMENT_KEY     || '',
  tokenTerminal: process.env.ZM_TOKEN_TERMINAL_KEY || '',
  messari:       process.env.ZM_MESSARI_KEY        || '',
  dune:          process.env.ZM_DUNE_KEY           || '',
};

const PORT = process.env.ZM_PROXY_PORT || 3001;
const cache = new Map();

function getCached(key, ttlMs) {
  const e = cache.get(key);
  if (e && Date.now() - e.ts < ttlMs) return e.data;
  return null;
}
function setCached(key, data) { cache.set(key, { data, ts: Date.now() }); }

function proxyFetch(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.get({ ...parsed, headers }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ZM_ALLOWED_ORIGIN || 'http://localhost:8080');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const ROUTES = {
  '/api/santiment/social-volume': async () => {
    const c = getCached('sv', 60_000); if (c) return c;
    const d = await proxyFetch('https://api.santiment.net/graphql',
      { Authorization: `Apikey ${KEYS.santiment}` });
    setCached('sv', d); return d;
  },
  '/api/token-terminal/projects': async () => {
    const c = getCached('tt', 120_000); if (c) return c;
    const d = await proxyFetch('https://api.tokenterminal.com/v2/projects',
      { Authorization: `Bearer ${KEYS.tokenTerminal}` });
    setCached('tt', d); return d;
  },
  '/api/messari/btc': async () => {
    const c = getCached('mbtc', 30_000); if (c) return c;
    const d = await proxyFetch('https://data.messari.io/api/v1/assets/bitcoin/metrics',
      { 'x-messari-api-key': KEYS.messari });
    setCached('mbtc', d); return d;
  },
  '/api/messari/eth': async () => {
    const c = getCached('meth', 30_000); if (c) return c;
    const d = await proxyFetch('https://data.messari.io/api/v1/assets/ethereum/metrics',
      { 'x-messari-api-key': KEYS.messari });
    setCached('meth', d); return d;
  },
  '/api/messari/sol': async () => {
    const c = getCached('msol', 30_000); if (c) return c;
    const d = await proxyFetch('https://data.messari.io/api/v1/assets/solana/metrics',
      { 'x-messari-api-key': KEYS.messari });
    setCached('msol', d); return d;
  },
  '/api/messari/news': async () => {
    const c = getCached('mnews', 300_000); if (c) return c;
    const d = await proxyFetch('https://data.messari.io/api/v1/news',
      { 'x-messari-api-key': KEYS.messari });
    setCached('mnews', d); return d;
  },
};

http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const pathname = url.parse(req.url).pathname;

  if (pathname.startsWith('/api/dune/')) {
    const qid = pathname.split('/')[3];
    const c = getCached('dune_' + qid, 300_000); if (c) { json(res, c); return; }
    try {
      const d = await proxyFetch(`https://api.dune.com/api/v1/query/${qid}/results`,
        { 'X-Dune-API-Key': KEYS.dune });
      setCached('dune_' + qid, d); json(res, d);
    } catch (e) { json(res, { error: e.message }, 502); }
    return;
  }

  const handler = ROUTES[pathname];
  if (!handler) { json(res, { error: 'Not found' }, 404); return; }
  try { json(res, await handler()); }
  catch (e) { json(res, { error: e.message }, 502); }
}).listen(PORT, () => {
  console.log('[ZM Proxy] Port', PORT);
  console.log('[ZM Proxy] Keys:', Object.entries(KEYS).filter(([,v])=>v).map(([k])=>k).join(', ') || 'NONE');
});
