/**
 * push119.mjs — ZERØ MERIDIAN
 *
 * SCOPE:
 * 1. zm-check.mjs — Automated pre-push standards checker
 *    Cek CRITICAL + MANDATORY + WARNING violations sebelum setiap push.
 *    Jalankan: node zm-check.mjs → exit 0 = LOLOS, exit 1 = DIBLOKIR
 *
 * WORKFLOW KE DEPAN:
 *   edit kode → node zm-check.mjs → kalau ✅ baru node pushXXX.mjs
 */

import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OWNER = 'wr98-code';
const REPO  = 'new-zeromeridian';
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('ERROR: GH_TOKEN env var tidak di-set!');
  process.exit(1);
}

const __dir = dirname(fileURLToPath(import.meta.url));
const b64   = (name) => readFileSync(join(__dir, name)).toString('base64');

const FILES = [
  {
    path:    'zm-check.mjs',
    content: b64('zm-check.mjs'),
    msg:     'push119: zm-check.mjs — automated pre-push standards checker',
  },
];

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization':  'token ' + TOKEN,
        'User-Agent':     'zeromeridian-push119',
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const request = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    if (r.status === 200 || r.status === 201) { console.log('  ✅', fp); return true; }
    if (r.status === 409) { console.log('  ⚠ 409, retry', attempt); await delay(2500 * attempt); continue; }
    console.error('  ❌ FAIL:', fp, r.status, JSON.stringify(r.body).slice(0, 200));
    return false;
  }
  return false;
}

console.log('\n━━━ ZERØ MERIDIAN push119 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  zm-check.mjs — pre-push standards checker');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let ok = 0, fail = 0;
for (const f of FILES) {
  console.log('→', f.path);
  if (await pushFile(f.path, f.content, f.msg)) ok++; else fail++;
  await delay(600);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Done:', ok, 'ok ·', fail, 'failed');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
if (fail > 0) process.exit(1);
