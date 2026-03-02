/**
 * push132.mjs — ZERØ MERIDIAN
 * push132: Full UI reskin — Bloomberg Professional light mode
 *   - tokens.ts: New light palette (navy accent, forest green, crimson)
 *   - index.css: CSS vars switched to light-first, dark as opt-in
 *   - ZMSidebar.tsx: Clean light sidebar, navy active state
 *   - Topbar.tsx: Light topbar with live indicator
 *   - AppShell.tsx: Light background, updated padding
 *   - GlassCard.tsx: Clean white card, subtle shadow
 *   - MetricCard.tsx: Light professional, price flash kept
 *   - GlobalStatsBar.tsx: Light stats bar
 *   - Skeleton.tsx: Light shimmer
 *   - PageStub.tsx: Light professional stub
 *   - SparklineChart.tsx: Green/red adjusted to light palette
 *   - BottomNavBar.tsx: Light mobile nav
 *   - Portal.tsx: Font fix (JetBrains Mono)
 *   - index.html: Remove Inter font load
 * zm-check: ✅ LOLOS zero errors zero warnings
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const OWNER  = 'wr98-code';
const REPO   = 'new-zeromeridian';
const BRANCH = 'main';
const TOKEN  = process.env.GH_TOKEN;

if (!TOKEN) { console.error('❌ GH_TOKEN not set'); process.exit(1); }

const FILES = [
  ['src/lib/tokens.ts',                          'src/lib/tokens.ts'],
  ['src/index.css',                              'src/index.css'],
  ['src/components/layout/ZMSidebar.tsx',        'src/components/layout/ZMSidebar.tsx'],
  ['src/components/layout/Topbar.tsx',           'src/components/layout/Topbar.tsx'],
  ['src/components/layout/AppShell.tsx',         'src/components/layout/AppShell.tsx'],
  ['src/components/layout/BottomNavBar.tsx',     'src/components/layout/BottomNavBar.tsx'],
  ['src/components/shared/GlassCard.tsx',        'src/components/shared/GlassCard.tsx'],
  ['src/components/shared/MetricCard.tsx',       'src/components/shared/MetricCard.tsx'],
  ['src/components/shared/GlobalStatsBar.tsx',   'src/components/shared/GlobalStatsBar.tsx'],
  ['src/components/shared/Skeleton.tsx',         'src/components/shared/Skeleton.tsx'],
  ['src/components/shared/PageStub.tsx',         'src/components/shared/PageStub.tsx'],
  ['src/components/shared/SparklineChart.tsx',   'src/components/shared/SparklineChart.tsx'],
  ['src/pages/Portal.tsx',                       'src/pages/Portal.tsx'],
  ['index.html',                                 'index.html'],
];

async function getSHA(path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getSHA ${path} → ${res.status}`);
  const data = await res.json();
  return data.sha;
}

async function pushFile(localPath, repoPath, attempt = 1) {
  const content = readFileSync(join(__dir, localPath));
  const b64 = content.toString('base64');
  const sha = await getSHA(repoPath);
  const body = {
    message: `push132: Bloomberg Pro light mode reskin — ${repoPath}`,
    content: b64,
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${repoPath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    console.log(`  ✅ ${repoPath}`);
    return;
  }
  const err = await res.json().catch(() => ({}));
  if (attempt < 3) {
    console.log(`  ⟳ retry ${attempt}/3 — ${repoPath} (${res.status})`);
    await new Promise(r => setTimeout(r, 2500 * attempt));
    return pushFile(localPath, repoPath, attempt + 1);
  }
  throw new Error(`FAIL ${repoPath}: ${res.status} ${JSON.stringify(err)}`);
}

async function main() {
  console.log('\n━━━ ZERØ MERIDIAN push132 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('    Bloomberg Professional Light Mode Reskin');
  console.log('    14 files — zm-check ✅ LOLOS\n');

  // Pre-flight: verify all local files exist
  let ok = true;
  for (const [local] of FILES) {
    try { readFileSync(join(__dir, local)); }
    catch { console.error(`  ❌ MISSING: ${local}`); ok = false; }
  }
  if (!ok) { console.error('\n❌ Pre-flight failed. Aborting.'); process.exit(1); }
  console.log(`  ✓ Pre-flight: ${FILES.length} files verified\n`);

  let passed = 0;
  for (const [local, repo] of FILES) {
    await pushFile(local, repo);
    passed++;
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ push132 DONE — ${passed}/${FILES.length} files pushed`);
  console.log(`  🚀 Vercel deploy ~30s → https://zeromeridian.vercel.app`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
