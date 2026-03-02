#!/usr/bin/env node
/**
 * push131.mjs — ZERØ MERIDIAN
 * push131: Fix Markets STARTUP ERROR + Dashboard data unavailable
 *   - Markets.tsx: useMarketWorker signature fix (async sortAndFilter + inline fallback)
 *   - Markets.tsx: VirtualList props fix (containerHeight→height, add getKey)
 *   - Dashboard.tsx: safeFetch wrapper + AbortSignal.timeout + mountedRef guard
 *
 * Jalankan:
 *   $env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
 *   node push131.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';

// ─── Config ───────────────────────────────────────────────────────────────────

const PUSH       = 'push131';
const REPO_OWNER = 'wr98-code';
const REPO_NAME  = 'new-zeromeridian';
const BRANCH     = 'main';
const TOKEN      = process.env.GH_TOKEN;

const FILES = [
  {
    localPath:  'Markets.tsx',          // ada di D:\FILEK\Markets.tsx
    remotePath: 'src/pages/Markets.tsx', // posisi di repo GitHub
    description: 'Fix: useMarketWorker async pattern + VirtualList height/getKey props',
  },
  {
    localPath:  'Dashboard.tsx',          // ada di D:\FILEK\Dashboard.tsx
    remotePath: 'src/pages/Dashboard.tsx', // posisi di repo GitHub
    description: 'Fix: safeFetch + AbortSignal.timeout + mountedRef guard',
  },
];

const COMMIT_MESSAGE =
  `${PUSH}: Fix Markets STARTUP ERROR + Dashboard data unavailable\n\n` +
  `- Markets.tsx: useMarketWorker was called with params (broken) → now uses\n` +
  `  async sortAndFilter() correctly with inline fallback sort\n` +
  `- Markets.tsx: VirtualList containerHeight → height, add missing getKey prop\n` +
  `- Dashboard.tsx: wrap each fetch in safeFetch() with AbortSignal.timeout(8000)\n` +
  `  to handle CoinGecko rate limits gracefully instead of crashing`;

// ─── Colors ───────────────────────────────────────────────────────────────────

const R   = '\x1b[31m';
const Y   = '\x1b[33m';
const G   = '\x1b[32m';
const C   = '\x1b[36m';
const B   = '\x1b[1m';
const DIM = '\x1b[2m';
const RST = '\x1b[0m';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg)  { console.log(msg); }
function ok(msg)   { log(G  + '  ✅ ' + RST + msg); }
function err(msg)  { log(R  + '  ✗  ' + RST + B + msg + RST); }
function info(msg) { log(C  + '  →  ' + RST + msg); }
function warn(msg) { log(Y  + '  ⚠  ' + RST + msg); }
function dim(msg)  { log(DIM + '     ' + msg + RST); }

function sep() { log(C + '─'.repeat(66) + RST); }

async function githubAPI(path, method = 'GET', body = null) {
  const url = `https://api.github.com${path}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept':        'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type':  'application/json',
      'User-Agent':    'zero-meridian-push',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function retry(fn, attempts = 3, delayMs = 1500) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === attempts - 1) throw e;
      warn(`Attempt ${i + 1} failed: ${e.message} — retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// ─── Pre-flight checks ────────────────────────────────────────────────────────

function preflight() {
  log('');
  log(B + C + `━━━ ZERØ MERIDIAN — ${PUSH} Pre-Flight Check ━━━━━━━━━━━━━━━━━━━━━━` + RST);
  sep();

  let ok_count = 0;
  let fail_count = 0;

  // Token
  if (!TOKEN || TOKEN === 'ghp_xxxxxxxxxxxxxxxxxxxx' || TOKEN.length < 20) {
    err('GH_TOKEN tidak di-set atau invalid');
    log('');
    log(Y + '  Set dulu sebelum run:' + RST);
    log(DIM + '  $env:GH_TOKEN = "ghp_xxx..."' + RST);
    fail_count++;
  } else {
    ok(`GH_TOKEN OK (${TOKEN.slice(0,8)}...)`);
    ok_count++;
  }

  // Files
  for (const f of FILES) {
    if (!existsSync(f.localPath)) {
      err(`File tidak ditemukan: ${f.localPath}`);
      fail_count++;
    } else {
      const size = readFileSync(f.localPath).length;
      ok(`${f.localPath} ${DIM}(${(size/1024).toFixed(1)} KB)${RST}`);
      ok_count++;
    }
  }

  sep();
  log('');

  if (fail_count > 0) {
    log(R + B + `  ❌ ${fail_count} check gagal — push dibatalkan.` + RST);
    log('');
    process.exit(1);
  }

  log(G + B + `  ✅ Semua ${ok_count} checks lolos — lanjut push.` + RST);
  log('');
}

// ─── Get current SHA for each file ───────────────────────────────────────────

async function getFileSHA(remotePath) {
  try {
    const data = await githubAPI(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${remotePath}?ref=${BRANCH}`
    );
    return data.sha;
  } catch (e) {
    if (e.message.includes('404')) return null; // file baru
    throw e;
  }
}

// ─── Push single file ─────────────────────────────────────────────────────────

async function pushFile(file, commitMsg, index, total) {
  info(`[${index}/${total}] ${file.remotePath}`);
  dim(file.description);

  const content    = readFileSync(file.localPath);
  const b64content = content.toString('base64');

  const sha = await retry(() => getFileSHA(file.remotePath));
  if (sha) {
    dim(`  SHA saat ini: ${sha.slice(0, 12)}...`);
  } else {
    dim('  File baru — akan dibuat');
  }

  const payload = {
    message: commitMsg,
    content: b64content,
    branch:  BRANCH,
    ...(sha ? { sha } : {}),
  };

  await retry(() =>
    githubAPI(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${file.remotePath}`,
      'PUT',
      payload
    )
  );

  ok(`${file.remotePath} → pushed`);
  log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {

  preflight();

  log(B + C + `━━━ Pushing ${FILES.length} files → ${REPO_OWNER}/${REPO_NAME}@${BRANCH} ━━━━━━━━━━━━━` + RST);
  sep();
  log('');

  // Show commit message
  info('Commit message:');
  COMMIT_MESSAGE.split('\n').forEach(l => dim(l || ' '));
  log('');
  sep();
  log('');

  const startTime = Date.now();

  for (let i = 0; i < FILES.length; i++) {
    await pushFile(FILES[i], COMMIT_MESSAGE, i + 1, FILES.length);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  sep();
  log('');
  log(G + B + `  ✅ ${PUSH} SELESAI — ${FILES.length} files pushed dalam ${elapsed}s` + RST);
  log('');
  log(C + '  Vercel auto-deploy dalam ~30 detik.' + RST);
  log(C + '  Cek: https://new-zeromeridian.pages.dev/markets' + RST);
  log(C + '       https://new-zeromeridian.pages.dev/dashboard' + RST);
  log('');
  log(B + C + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + RST);
  log('');
}

main().catch(e => {
  log('');
  err('Push gagal: ' + e.message);
  log('');
  if (e.message.includes('401')) {
    warn('Token expired atau tidak punya permission. Buat token baru:');
    dim('  github.com → Settings → Developer settings → Personal access tokens');
    dim('  Perlu scope: repo (full)');
  } else if (e.message.includes('409')) {
    warn('Conflict — ada push lain yang lebih baru. Pull dulu atau cek repo.');
  } else if (e.message.includes('404')) {
    warn('Repo tidak ditemukan. Cek REPO_OWNER dan REPO_NAME di script.');
  }
  log('');
  process.exit(1);
});
