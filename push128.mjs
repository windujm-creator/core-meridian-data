/**
 * push128.mjs — ZERØ MERIDIAN
 * Dua fix sekaligus:
 *
 * 1. GlobalStatsBar.tsx — TypeError crash fix
 *    - useGlobalStats() returns GlobalStats directly, NOT { stats }
 *    - Field names: marketCapChange → marketCapChange24h, activeCurrencies → activeCryptos
 *
 * 2. XLogo.tsx — Logo nggak blend sama dark background
 *    - Ganti base64 PNG inline → pakai /logo.png (public asset)
 *    - Tambah mix-blend-mode: screen (background putih logo hilang di dark bg)
 *    - Tambah drop-shadow cyan glow sesuai design system
 */

import { readFileSync, existsSync } from 'fs';

const REPO   = 'wr98-code/new-zeromeridian';
const BRANCH = 'main';
const TOKEN  = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌ GH_TOKEN not set. Run: $env:GH_TOKEN = "ghp_..."');
  process.exit(1);
}

const FILES = [
  {
    repoPath:  'src/components/shared/GlobalStatsBar.tsx',
    localPath: 'D:\\FILEK\\GlobalStatsBar.tsx',
    desc: 'GlobalStatsBar.tsx — TypeError crash fix',
  },
  {
    repoPath:  'src/components/shared/XLogo.tsx',
    localPath: 'D:\\FILEK\\XLogo.tsx',
    desc: 'XLogo.tsx — dark background blend fix',
  },
];

console.log('🔍 Pre-flight check...');
let allOk = true;
for (const f of FILES) {
  if (!existsSync(f.localPath)) {
    console.error(`  ❌ File not found: ${f.localPath}`);
    allOk = false;
  } else {
    console.log(`  ✅ ${f.localPath}`);
  }
}
if (!allOk) process.exit(1);

async function apiGet(path) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function pushFile(repoPath, localPath, retries = 3) {
  const b64 = readFileSync(localPath).toString('base64');

  let sha;
  try {
    const existing = await apiGet(`contents/${repoPath}?ref=${BRANCH}`);
    sha = existing.sha;
    console.log(`    📄 Got SHA for ${repoPath}`);
  } catch {
    console.log(`    📄 New file: ${repoPath}`);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await apiPut(`contents/${repoPath}`, {
        message: `push128: fix GlobalStatsBar crash + XLogo dark bg blend\n\n- GlobalStatsBar: useGlobalStats() destructuring fix, field names fix\n- XLogo: /logo.png + mix-blend-mode:screen + cyan glow`,
        content: b64,
        sha,
        branch: BRANCH,
      });
      console.log(`    ✅ Pushed!`);
      return;
    } catch (e) {
      if (attempt < retries) {
        const wait = Math.min(1000 * 2 ** attempt, 30_000);
        console.log(`    ⚠️  Attempt ${attempt} failed, retry in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw e;
      }
    }
  }
}

console.log('\n🚀 push128 — GlobalStatsBar crash fix + XLogo dark bg fix\n');

try {
  for (const f of FILES) {
    console.log(`📤 ${f.desc}`);
    await pushFile(f.repoPath, f.localPath);
    console.log();
  }

  console.log('✅ push128 complete!');
  console.log('🌐 Vercel auto-deploy ~30s → https://new-zeromeridian.pages.dev/dashboard\n');
  console.log('📋 Changelog:');
  console.log('  [1] GlobalStatsBar.tsx');
  console.log('      • const stats = useGlobalStats()  ← bukan { stats }');
  console.log('      • stats.marketCapChange24h  ← bukan marketCapChange');
  console.log('      • stats.activeCryptos       ← bukan activeCurrencies');
  console.log('  [2] XLogo.tsx');
  console.log('      • /logo.png (public) ← bukan base64 inline 600KB 😅');
  console.log('      • mix-blend-mode: screen → bg putih hilang di dark theme');
  console.log('      • drop-shadow cyan glow rgba(0,238,255,0.55)');
} catch (err) {
  console.error('\n❌ Push failed:', err.message);
  process.exit(1);
}
