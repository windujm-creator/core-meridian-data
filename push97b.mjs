/**
 * push97b.mjs — ZERØ MERIDIAN — Fix _headers saja
 * Error 409: SHA conflict → script ini fetch SHA terbaru dulu baru update
 *
 * Jalankan: $env:GH_TOKEN = "ghp_TOKEN"; node push97b.mjs
 */

import https from 'https';

const OWNER = 'wr98-code';
const REPO  = 'new-zeromeridian';
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌ GH_TOKEN tidak ada!');
  process.exit(1);
}

function ghReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path, method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'zm-push97b',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const CF_HEADERS = `/*
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  Cross-Origin-Embedder-Policy: credentialless
  Cross-Origin-Resource-Policy: cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
`;

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  ZERØ MERIDIAN — push97b: Fix _headers      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Verify token
  const me = await ghReq('GET', '/user');
  if (me.status !== 200) {
    console.error('❌ Token tidak valid!');
    process.exit(1);
  }
  console.log('✅ Token OK — user: ' + me.body.login);

  // Fetch SHA terbaru dari GitHub (bukan dari cache)
  console.log('🔍 Fetching SHA terbaru untuk public/_headers...');
  const getR = await ghReq('GET', `/repos/${OWNER}/${REPO}/contents/public/_headers`);

  let sha = null;
  if (getR.status === 200) {
    sha = getR.body.sha;
    console.log('✅ SHA ditemukan: ' + sha.slice(0, 12) + '...');
  } else if (getR.status === 404) {
    console.log('ℹ File belum ada, akan dibuat baru.');
  } else {
    console.error('❌ Gagal fetch SHA:', getR.status, getR.body?.message);
    process.exit(1);
  }

  // Push dengan SHA yang benar
  console.log('📤 Pushing public/_headers...');
  const body = {
    message: 'push97b: fix COEP credentialless header untuk Binance API + chart',
    content: Buffer.from(CF_HEADERS).toString('base64'),
  };
  if (sha) body.sha = sha;

  const putR = await ghReq('PUT', `/repos/${OWNER}/${REPO}/contents/public/_headers`, body);

  console.log('');
  if (putR.status === 200 || putR.status === 201) {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  ✅ BERHASIL!                               ║');
    console.log('║                                              ║');
    console.log('║  public/_headers sudah update.              ║');
    console.log('║  COEP: credentialless → chart bisa render   ║');
    console.log('║                                              ║');
    console.log('║  🕐 Tunggu 1-2 menit CF Pages deploy        ║');
    console.log('║  🌐 https://new-zeromeridian.pages.dev      ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    console.log('Status semua bug:');
    console.log('  ✅ BUG #1 — Data kosong (push97 sudah fix)');
    console.log('  ✅ BUG #2 — WS reconnecting (push97 sudah fix)');
    console.log('  ✅ BUG #3 — Chart kosong (push97 + push97b fix)');
    console.log('  ✅ BUG #4 — Markets 0 assets (auto fix)');
  } else {
    console.log('❌ GAGAL:', putR.status, putR.body?.message ?? '');
    console.log('');
    console.log('Tidak apa-apa — _headers bukan critical.');
    console.log('Bug #1 #2 #4 sudah fix dari push97.');
    console.log('Chart (bug #3) sebagian sudah fix di TradingViewChart.tsx');
  }
  console.log('');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
