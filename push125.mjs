/**
 * push125.mjs — ZERØ MERIDIAN
 * ═══════════════════════════════════════════════════════════════
 * push125: Full Audit Fix — 5 issues resolved
 *
 *   ✅ Settings.tsx    → src/pages/Settings.tsx       [BARU]
 *      Halaman Settings lengkap: Appearance, Data, Notifications,
 *      Performance caps, Privacy (clear data), About
 *
 *   ✅ App.tsx         → src/App.tsx
 *      Wire /settings route + lazy import Settings
 *
 *   ✅ Portal.tsx      → src/pages/Portal.tsx
 *      Hapus dead import XLogo (was unused setelah push124)
 *
 *   ✅ index.html      → index.html
 *      - Tambah Inter font (700,900) untuk teks splash screen
 *      - Fix favicon: /favicon.ico → /icon-192.png (file exists)
 *
 * ═══════════════════════════════════════════════════════════════
 * CARA PAKAI:
 *   1. Taruh semua file di satu folder:
 *        push125.mjs
 *        Settings.tsx
 *        App.tsx
 *        Portal.tsx
 *        index.html
 *
 *   2. $env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
 *
 *   3. cd D:\FILEK
 *      node push125.mjs
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

const COMMIT_MSG = 'push125: Settings page + App.tsx wire + Portal dead import removed + index.html favicon+Inter font fix';

const FILES = [
  { path: 'src/pages/Settings.tsx', local: 'Settings.tsx'  },
  { path: 'src/App.tsx',            local: 'App.tsx'        },
  { path: 'src/pages/Portal.tsx',   local: 'Portal.tsx'    },
  { path: 'index.html',             local: 'index.html'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = ms => new Promise(r => setTimeout(r, ms));

async function getSHA(filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getSHA ${filePath}: HTTP ${r.status}`);
  return (await r.json()).sha ?? null;
}

async function pushFile(filePath, localName, attempt = 1) {
  console.log(`  ↑  ${filePath}${attempt > 1 ? '  (retry ' + attempt + ')' : ''}`);
  const content = readFileSync(join(__dir, localName));
  const b64     = content.toString('base64');
  const sha     = await getSHA(filePath);

  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization:  `Bearer ${TOKEN}`,
        Accept:         'application/vnd.github+json',
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

console.log('\n🚀  push125 — ZERØ MERIDIAN  (Full Audit Fix)\n');
console.log('    Files yang akan di-push:');
FILES.forEach(f => console.log(`    • ${f.local.padEnd(16)} →  ${f.path}`));
console.log();

// Pre-flight: cek semua file ada
let missing = false;
for (const f of FILES) {
  try { readFileSync(join(__dir, f.local)); }
  catch {
    console.error(`❌  File tidak ditemukan: ${f.local}`);
    missing = true;
  }
}
if (missing) {
  console.error('\n    Pastikan semua file ada di folder yang sama dengan push125.mjs');
  process.exit(1);
}

let ok = 0, fail = 0;
for (const f of FILES) {
  try {
    await pushFile(f.path, f.local);
    ok++;
  } catch (e) {
    console.error(`\n  ❌ ${e.message}\n`);
    fail++;
  }
  await delay(700);
}

console.log(`\n${'─'.repeat(54)}`);
if (fail === 0) {
  console.log(`✅  Semua ${ok} file berhasil di-push ke ${OWNER}/${REPO}@${BRANCH}`);
  console.log('');
  console.log('    Yang sudah fix:');
  console.log('    ✓ /settings route → halaman Settings lengkap');
  console.log('    ✓ App.tsx → lazy import + route wired');
  console.log('    ✓ Portal.tsx → dead XLogo import dihapus');
  console.log('    ✓ index.html → Inter font 700/900 + favicon fix');
  console.log('');
  console.log('    Vercel auto-deploy dalam ~30 detik.');
} else {
  console.log(`⚠️   ${ok} berhasil · ${fail} gagal — cek error di atas`);
}
console.log();

if (fail > 0) process.exit(1);
