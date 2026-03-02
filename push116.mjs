/**
 * push116.mjs — ZERØ MERIDIAN
 * push116: App.tsx — Route fix lanjutan:
 *   - AISignals.tsx (full implementation, 400+ baris) disambung ke /aisignals
 *   - Path fix: /ai-signals → /aisignals (align dengan ZMSidebar nav)
 *   - Brain icon (unused) dihapus dari imports
 * Semua path mismatch antara ZMSidebar dan App.tsx kini resolved:
 *   /security   → Security.tsx     ✅ (push115)
 *   /smartmoney → SmartMoney.tsx   ✅ (push115)
 *   /sentiment  → Sentiment.tsx    ✅ (push115)
 *   /aisignals  → AISignals.tsx    ✅ (push116)
 */

import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OWNER = 'wr98-code';
const REPO  = 'new-zeromeridian';
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) { console.error('❌ GH_TOKEN env var missing'); process.exit(1); }

const __dir = dirname(fileURLToPath(import.meta.url));
const b64   = (name) => readFileSync(join(__dir, name)).toString('base64');

const FILES = [
  {
    path:    'src/App.tsx',
    content: b64('App_116.tsx'),
    msg:     'push116: App.tsx — AISignals → /aisignals real component; path mismatch semua resolved',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization':  `Bearer ${TOKEN}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent':     'zeromeridian-push/116',
        'Accept':         'application/vnd.github.v3+json',
      },
    };
    const r = https.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = {}; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    r.write(data);
    r.end();
  });
}

async function getSHA(fp) {
  const r = await req('GET', `/repos/${OWNER}/${REPO}/contents/${fp}`, {});
  return r.status === 200 ? r.body.sha : null;
}

async function pushFile(fp, content, msg) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const sha  = await getSHA(fp);
    const body = { message: msg, content };
    if (sha) body.sha = sha;

    const r = await req('PUT', `/repos/${OWNER}/${REPO}/contents/${fp}`, body);
    if (r.status === 200 || r.status === 201) {
      console.log(`✅ [${r.status}] ${fp}`);
      return true;
    }
    if (r.status === 409) {
      console.warn(`⚠️  409 conflict — retry ${attempt}/3`);
      await delay(2500 * attempt);
      continue;
    }
    console.error(`❌ [${r.status}] ${fp}`, JSON.stringify(r.body).slice(0, 200));
    return false;
  }
  return false;
}

// ── Sequential push ───────────────────────────────────────────────────────────

console.log('🚀 push116 — ZERØ MERIDIAN');
console.log(`   Files: ${FILES.length}`);
console.log('');

for (const f of FILES) {
  console.log(`📤 Pushing: ${f.path}`);
  const ok = await pushFile(f.path, f.content, f.msg);
  if (!ok) {
    console.error(`\n💥 FAILED on ${f.path} — aborting`);
    process.exit(1);
  }
  await delay(600);
}

console.log('');
console.log('✅ push116 COMPLETE');
console.log('   → /aisignals → AISignals.tsx (full TensorFlow.js implementation)');
console.log('   → Semua 4 path mismatch ZMSidebar↔App resolved');
console.log('   → Score target: 93+/100');
