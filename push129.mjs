/**
 * push129.mjs — ZERØ MERIDIAN
 * push129: Zero :any TypeScript — fix all 6 hooks with proper typed interfaces
 *
 * Files:
 *   src/hooks/useTrendingTokens.ts  — CGTrendingItem, CGMarketCoin interfaces
 *   src/hooks/useWhaleTracker.ts    — EtherscanTx, EtherscanTokenTx, etc.
 *   src/hooks/useCryptoNews.ts      — CPNewsItem, CCNewsItem interfaces
 *   src/hooks/useNetworkStats.ts    — JsonRpcResult interface
 *   src/hooks/useTokenSecurity.ts   — GoPlusTokenData, GoPlusDex interfaces
 *   src/hooks/useSocialSentiment.ts — FnGResponse, BinanceFundingItem interfaces
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const OWNER  = 'wr98-code';
const REPO   = 'new-zeromeridian';
const BRANCH = 'main';
const TOKEN  = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌  GH_TOKEN not set. Run: $env:GH_TOKEN = "ghp_..."');
  process.exit(1);
}

const FILES = [
  { local: 'useTrendingTokens.ts', remote: 'src/hooks/useTrendingTokens.ts' },
  { local: 'useWhaleTracker.ts',   remote: 'src/hooks/useWhaleTracker.ts'   },
  { local: 'useCryptoNews.ts',     remote: 'src/hooks/useCryptoNews.ts'     },
  { local: 'useNetworkStats.ts',   remote: 'src/hooks/useNetworkStats.ts'   },
  { local: 'useTokenSecurity.ts',  remote: 'src/hooks/useTokenSecurity.ts'  },
  { local: 'useSocialSentiment.ts',remote: 'src/hooks/useSocialSentiment.ts'},
];

// ─── Pre-flight check ─────────────────────────────────────────────────────────

console.log('🔍 Pre-flight check...');
let ok = true;
for (const f of FILES) {
  try {
    readFileSync(join(__dir, f.local));
    console.log(`  ✅ ${f.local}`);
  } catch {
    console.error(`  ❌ MISSING: ${f.local}`);
    ok = false;
  }
}
if (!ok) { console.error('\n❌ Pre-flight failed. Aborting.'); process.exit(1); }

// ─── GitHub API helpers ───────────────────────────────────────────────────────

const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;

async function getSHA(remotePath) {
  const res = await fetch(BASE_URL + remotePath + `?ref=${BRANCH}`, {
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.sha ?? null;
}

async function pushFile(local, remote, attempt = 1) {
  const content  = readFileSync(join(__dir, local), 'utf8');
  const b64      = Buffer.from(content).toString('base64');
  const sha      = await getSHA(remote);
  const commitMsg = `push129: ${local} — zero :any TypeScript types`;

  const body = JSON.stringify({
    message: commitMsg,
    content: b64,
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  });

  const res = await fetch(BASE_URL + remote, {
    method: 'PUT',
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body,
  });

  if (res.ok) {
    console.log(`  ✅ Pushed! ${remote}`);
    return true;
  }

  const err = await res.json().catch(() => ({}));
  if (attempt < 3) {
    console.log(`  ⏳ Retry ${attempt}/3 — ${err.message ?? res.status}`);
    await new Promise(r => setTimeout(r, 2500 * attempt));
    return pushFile(local, remote, attempt + 1);
  }

  console.error(`  ❌ FAILED: ${remote} — ${err.message ?? res.status}`);
  return false;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n🚀 push129 — Zero :any TypeScript fixes (6 hooks)\n');

let allOk = true;
for (const f of FILES) {
  console.log(`📄 ${f.local}`);
  const sha = await getSHA(f.remote);
  console.log(`  📋 Got SHA: ${sha ? sha.slice(0, 7) : 'new file'}`);
  const ok = await pushFile(f.local, f.remote);
  if (!ok) allOk = false;
  await new Promise(r => setTimeout(r, 600));
}

if (allOk) {
  console.log('\n✅ push129 complete!');
  console.log('🌐 Vercel auto-deploy ~30s → https://new-zeromeridian.pages.dev/dashboard');
  console.log('\n📋 Changelog:');
  console.log('  [1] useTrendingTokens.ts  — CGTrendingItem + CGMarketCoin interfaces');
  console.log('  [2] useWhaleTracker.ts    — EtherscanTx, EtherscanTokenTx, GasOracle interfaces');
  console.log('  [3] useCryptoNews.ts      — CPNewsItem, CPVotes, CCNewsItem interfaces');
  console.log('  [4] useNetworkStats.ts    — JsonRpcResult interface');
  console.log('  [5] useTokenSecurity.ts   — GoPlusTokenData, GoPlusDex, GoPlusResponse interfaces');
  console.log('  [6] useSocialSentiment.ts — FnGResponse, BinanceFundingItem, BinanceOIItem interfaces');
  console.log('\n  All err: unknown (was: err: any) — (err instanceof Error) guard pattern');
} else {
  console.error('\n❌ push129 had errors. Check above.');
  process.exit(1);
}
