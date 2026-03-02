/**
 * push118.mjs — ZERØ MERIDIAN
 * 
 * SCOPE:
 * 1. AISignals.tsx       — CRITICAL FIX: fontFamily="monospace" → JetBrains Mono (SVG text baris 80-82)
 * 2. NewsTickerTile.tsx  — MANDATORY FIX: hapus MOCK_HEADLINES, proper error state, zero fake data
 * 3. index.html          — WARNING FIX: hapus Inter + IBM Plex Mono font load (JetBrains Mono only)
 * 4. index.css           — WARNING FIX: tambah --zm-font-ui & --zm-font-data di :root CSS vars
 *
 * Standards: Zero className · rgba() only · JetBrains Mono only · Sequential push · getSHA fresh
 */

import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OWNER = 'wr98-code';
const REPO  = 'new-zeromeridian';
const TOKEN = process.env.GH_TOKEN; // SELALU env var — JANGAN hardcode

if (!TOKEN) {
  console.error('ERROR: GH_TOKEN env var tidak di-set!');
  console.error('Jalankan: $env:GH_TOKEN = "ghp_..."');
  process.exit(1);
}

const __dir = dirname(fileURLToPath(import.meta.url));
const b64   = (name) => readFileSync(join(__dir, name)).toString('base64');

// ─── FILES TO PUSH ────────────────────────────────────────────────────────────

const FILES = [
  {
    path:    'src/pages/AISignals.tsx',
    content: b64('AISignals_118.tsx'),
    msg:     'push118: AISignals — CRITICAL fix fontFamily=monospace→JetBrains Mono SVG text',
  },
  {
    path:    'src/components/tiles/NewsTickerTile.tsx',
    content: b64('NewsTickerTile_118.tsx'),
    msg:     'push118: NewsTickerTile — MANDATORY fix zero mock data, real error state',
  },
  {
    path:    'index.html',
    content: b64('index_118.html'),
    msg:     'push118: index.html — remove Inter+IBM Plex Mono, JetBrains Mono only',
  },
  {
    path:    'src/index.css',
    content: b64('index_118.css'),
    msg:     'push118: index.css — add --zm-font-ui --zm-font-data CSS vars to :root',
  },
];

// ─── GITHUB API HELPERS ───────────────────────────────────────────────────────

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': 'token ' + TOKEN,
        'User-Agent':    'zeromeridian-push118',
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const request = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// getSHA fresh per attempt — avoid 409 conflict
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
      console.log('  ✅ OK:', fp);
      return true;
    }
    if (r.status === 409) {
      console.log('  ⚠ 409 conflict, retry', attempt, '/', 3);
      await delay(2500 * attempt);
      continue;
    }
    console.error('  ❌ FAIL:', fp, r.status, JSON.stringify(r.body).slice(0, 200));
    return false;
  }
  return false;
}

// ─── SEQUENTIAL PUSH — NO Promise.all() ──────────────────────────────────────

console.log('');
console.log('━━━ ZERØ MERIDIAN push118 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Critical + Mandatory + Warning fixes');
console.log('  Files: ' + FILES.length);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

let ok = 0;
let fail = 0;

for (const f of FILES) {
  console.log('→ Pushing:', f.path);
  const success = await pushFile(f.path, f.content, f.msg);
  if (success) { ok++; } else { fail++; }
  await delay(600);
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Done: ' + ok + ' ok · ' + fail + ' failed');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

if (fail > 0) process.exit(1);
