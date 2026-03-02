/**
 * push124.mjs — ZERØ MERIDIAN
 * ═══════════════════════════════════════════════════════════════
 * push124: Splash screen fix + SharedArrayBuffer crash fix
 *
 *   ✅ useSharedBuffer.ts  → src/hooks/useSharedBuffer.ts
 *      fix SharedArrayBuffer SecurityError crash (try/catch fallback)
 *
 *   ✅ Portal.tsx          → src/pages/Portal.tsx
 *      - logo pakai img /logo.png (bukan XLogo invisible)
 *      - teks "ZERØ / MERIDIAN" dua baris besar bold putih
 *
 *   ✅ logo.png            → public/logo.png
 *      logo X murni tanpa teks (untuk splash screen)
 *
 * ═══════════════════════════════════════════════════════════════
 * CARA PAKAI:
 *   1. Taruh semua file ini di satu folder:
 *        push124.mjs
 *        useSharedBuffer.ts
 *        Portal.tsx
 *        logo.png
 *
 *   2. Set GitHub token:
 *        $env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
 *
 *   3. Jalankan:
 *        cd D:\FILEK
 *        node push124.mjs
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

const COMMIT_MSG = 'push124: splash screen fix (logo img + teks 2 baris) + useSharedBuffer SAB crash fix';

const FILES = [
  {
    path:   'src/hooks/useSharedBuffer.ts',
    local:  'useSharedBuffer.ts',
    binary: false,
  },
  {
    path:   'src/pages/Portal.tsx',
    local:  'Portal.tsx',
    binary: false,
  },
  {
    path:   'public/logo.png',
    local:  'logo.png',
    binary: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = ms => new Promise(r => setTimeout(r, ms));

async function getSHA(filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getSHA ${filePath}: HTTP ${r.status}`);
  const j = await r.json();
  return j.sha ?? null;
}

async function pushFile(filePath, localName, binary = false, attempt = 1) {
  console.log(`  ↑  ${filePath}${attempt > 1 ? `  (retry ${attempt})` : ''}`);

  const raw  = readFileSync(join(__dir, localName));
  const b64  = raw.toString('base64');
  const sha  = await getSHA(filePath);

  const body = {
    message: COMMIT_MSG,
    content: b64,
    branch:  BRANCH,
    ...(sha ? { sha } : {}),
  };

  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (r.ok) {
    console.log(`  ✅ ${filePath}`);
    return;
  }

  const errText = await r.text();

  if (attempt < 3) {
    const wait = 2500 * attempt;
    console.warn(`  ⚠️  HTTP ${r.status} — retry dalam ${wait}ms…`);
    await delay(wait);
    return pushFile(filePath, localName, binary, attempt + 1);
  }

  throw new Error(`GAGAL push ${filePath}: HTTP ${r.status}\n     ${errText}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🚀  push124 — ZERØ MERIDIAN\n');
console.log('    Files yang akan di-push:');
FILES.forEach(f => console.log(`    • ${f.local}  →  ${f.path}`));
console.log();

// Cek semua file lokal ada sebelum mulai
let missing = false;
for (const f of FILES) {
  try {
    readFileSync(join(__dir, f.local));
  } catch {
    console.error(`❌  File tidak ditemukan: ${f.local}`);
    missing = true;
  }
}
if (missing) {
  console.error('\n    Pastikan semua file ada di folder yang sama dengan push124.mjs');
  process.exit(1);
}

let ok = 0, fail = 0;

for (const f of FILES) {
  try {
    await pushFile(f.path, f.local, f.binary);
    ok++;
  } catch (e) {
    console.error(`\n  ❌ ${e.message}\n`);
    fail++;
  }
  await delay(700);
}

console.log(`\n${'─'.repeat(50)}`);
if (fail === 0) {
  console.log(`✅  Semua ${ok} file berhasil di-push ke ${OWNER}/${REPO}@${BRANCH}`);
  console.log('    Vercel akan auto-deploy dalam ~30 detik.');
} else {
  console.log(`⚠️   ${ok} berhasil · ${fail} gagal`);
  console.log('    Cek error di atas, lalu coba lagi.');
}
console.log();

if (fail > 0) process.exit(1);
