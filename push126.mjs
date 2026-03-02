/**
 * push126.mjs — ZERØ MERIDIAN
 * ═══════════════════════════════════════════════════════════════
 * push126: Ganti favicon + PWA icon → logo X ZERØ MERIDIAN
 *
 *   ✅ icon-192.png  → public/icon-192.png
 *      Logo X (crop+resize dari logo.png, background #06080E)
 *      Dipakai sebagai: favicon tab browser, PWA shortcut icon,
 *      apple-touch-icon, manifest icon 192
 *
 *   ✅ icon-512.png  → public/icon-512.png
 *      Sama, ukuran 512x512 untuk PWA install prompt & splash
 *
 * ═══════════════════════════════════════════════════════════════
 * CARA PAKAI:
 *   1. Taruh di satu folder:
 *        push126.mjs
 *        icon-192.png
 *        icon-512.png
 *
 *   2. $env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
 *
 *   3. cd D:\FILEK
 *      node push126.mjs
 * ═══════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const OWNER  = 'wr98-code';
const REPO   = 'new-zeromeridian';
const BRANCH = 'main';
const TOKEN  = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌  GH_TOKEN belum di-set!');
  console.error('    Jalankan dulu: $env:GH_TOKEN = "ghp_xxxxx"');
  process.exit(1);
}

const COMMIT_MSG = 'push126: ganti favicon + PWA icons → logo X ZERØ MERIDIAN';

const FILES = [
  { path: 'public/icon-192.png', local: 'icon-192.png' },
  { path: 'public/icon-512.png', local: 'icon-512.png' },
];

const delay = ms => new Promise(r => setTimeout(r, ms));

async function getSHA(filePath) {
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`,
    { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getSHA ${filePath}: HTTP ${r.status}`);
  return (await r.json()).sha ?? null;
}

async function pushFile(filePath, localName, attempt = 1) {
  console.log(`  ↑  ${filePath}${attempt > 1 ? '  (retry ' + attempt + ')' : ''}`);
  const b64 = readFileSync(join(__dir, localName)).toString('base64');
  const sha = await getSHA(filePath);

  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: COMMIT_MSG, content: b64, branch: BRANCH,
        ...(sha ? { sha } : {}),
      }),
    }
  );

  if (r.ok) { console.log(`  ✅ ${filePath}`); return; }

  const errText = await r.text();
  if (attempt < 3) {
    const wait = 2500 * attempt;
    console.warn(`  ⚠️  HTTP ${r.status} — retry dalam ${wait}ms…`);
    await delay(wait);
    return pushFile(filePath, localName, attempt + 1);
  }
  throw new Error(`GAGAL ${filePath}: HTTP ${r.status}\n     ${errText}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🚀  push126 — ZERØ MERIDIAN  (Icon Replacement)\n');
console.log('    Files yang akan di-push:');
FILES.forEach(f => console.log(`    • ${f.local.padEnd(16)} →  ${f.path}`));
console.log();

let missing = false;
for (const f of FILES) {
  try { readFileSync(join(__dir, f.local)); }
  catch { console.error(`❌  File tidak ditemukan: ${f.local}`); missing = true; }
}
if (missing) { console.error('\n    Pastikan semua file ada di folder yang sama.'); process.exit(1); }

let ok = 0, fail = 0;
for (const f of FILES) {
  try { await pushFile(f.path, f.local); ok++; }
  catch (e) { console.error(`\n  ❌ ${e.message}\n`); fail++; }
  await delay(700);
}

console.log(`\n${'─'.repeat(54)}`);
if (fail === 0) {
  console.log(`✅  Semua ${ok} file berhasil di-push ke ${OWNER}/${REPO}@${BRANCH}`);
  console.log('');
  console.log('    Setelah Vercel deploy (~30s):');
  console.log('    → Tab browser akan tampil logo X ZERØ MERIDIAN');
  console.log('    → PWA install icon juga pakai logo X');
  console.log('    → Hard refresh: Ctrl+Shift+R biar cache favicon clear');
} else {
  console.log(`⚠️   ${ok} berhasil · ${fail} gagal`);
}
console.log();

if (fail > 0) process.exit(1);
