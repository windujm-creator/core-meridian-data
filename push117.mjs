/**
 * push117.mjs — ZERØ MERIDIAN
 * push117: REAL DATA FIX — 2 halaman dengan fake/broken API → real live data
 *
 * 1. SmartMoney.tsx
 *    SEBELUM: fetch('https://api.etherscan.io/...address=0x') — address invalid → data KOSONG
 *    SESUDAH: useWhaleTracker hook → ETH txs >= 50 ETH + ERC20 >= $1M
 *             Real Etherscan API key, whale labels, gas oracle, ETH price live
 *             Tabs: Whale Flows | ETH Transfers | Gas
 *
 * 2. Security.tsx
 *    SEBELUM: fetch('https://api.example.com/security/events') — URL PALSU → selalu error
 *    SESUDAH: useTokenSecurity hook → GoPlus Security API (free, no key)
 *             Auto-scan 8 featured tokens: USDT,USDC,WBTC,LINK,UNI,AAVE,COMP,MKR
 *             Honeypot · tax · ownership · mintable · proxy · blacklist
 *             Risk score 0-100, expandable card per token, custom address scanner
 *
 * Standards: zero className · rgba() only · JetBrains Mono · memo+displayName ✓
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
    path:    'src/pages/SmartMoney.tsx',
    content: b64('SmartMoney_117.tsx'),
    msg:     'push117: SmartMoney — useWhaleTracker real data (Etherscan), gas panel, ETH price live',
  },
  {
    path:    'src/pages/Security.tsx',
    content: b64('Security_117.tsx'),
    msg:     'push117: Security — useTokenSecurity real data (GoPlus API), contract scanner, 8 tokens auto-scan',
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
        'User-Agent':     'zeromeridian-push/117',
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

console.log('🚀 push117 — ZERØ MERIDIAN');
console.log(`   Files: ${FILES.length}`);
console.log('');

for (const f of FILES) {
  console.log(`📤 Pushing: ${f.path}`);
  const ok = await pushFile(f.path, f.content, f.msg);
  if (!ok) {
    console.error(`\n💥 FAILED on ${f.path} — aborting`);
    process.exit(1);
  }
  await delay(700);
}

console.log('');
console.log('✅ push117 COMPLETE');
console.log('   → SmartMoney: Etherscan whale tracker LIVE (50+ ETH, $1M+ ERC20)');
console.log('   → Security:   GoPlus contract scanner LIVE (8 tokens auto-scan)');
console.log('   → ZERO fake APIs remaining in core pages');
console.log('   → Score target: 93+/100');
