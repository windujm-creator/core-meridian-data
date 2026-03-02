/**
 * push122.mjs — ZERØ MERIDIAN
 * push122: Logo PNG asli diembed langsung — 100% identik dengan brand image
 *   - XLogo.tsx: embed PNG logo X langsung (base64)
 *   - Portal.tsx: splash screen pakai full brand image sebagai background
 *   - icon-192.png + icon-512.png: crop dari PNG asli
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
  { path: 'src/components/shared/XLogo.tsx',  local: 'XLogo.tsx'   },
  { path: 'src/pages/Portal.tsx',              local: 'Portal.tsx'  },
  { path: 'public/icon-192.png',               local: 'icon-192.png' },
  { path: 'public/icon-512.png',               local: 'icon-512.png' },
  { path: 'icon-192.png',                      local: 'icon-192.png' },
  { path: 'icon-512.png',                      local: 'icon-512.png' },
];

async function getSHA(path) {
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getSHA ${path}: ${r.status}`);
  return (await r.json()).sha;
}

async function pushFile(path, local, attempt = 1) {
  const b64 = readFileSync(join(__dir, local)).toString('base64');
  const sha  = await getSHA(path);
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `push122: Logo PNG asli diembed — 100% identik brand image`,
        content: b64, branch: BRANCH,
        ...(sha ? { sha } : {}),
      }),
    }
  );
  if (r.ok) { console.log(`✅ ${path}`); return; }
  const err = await r.text();
  if (attempt < 3) {
    console.warn(`⚠ ${path} attempt ${attempt} (${r.status}) — retrying...`);
    await new Promise(res => setTimeout(res, 2500 * attempt));
    return pushFile(path, local, attempt + 1);
  }
  throw new Error(`❌ ${path}: ${r.status} — ${err}`);
}

(async () => {
  console.log('🚀 push122 — Logo PNG asli, 100% identik\n');
  let ok = 0, fail = 0;
  for (const { path, local } of FILES) {
    try { await pushFile(path, local); ok++; await new Promise(r => setTimeout(r, 600)); }
    catch (e) { console.error(e.message); fail++; }
  }
  console.log(`\nDone: ${ok} ok · ${fail} failed`);
  if (fail > 0) process.exit(1);
})();
