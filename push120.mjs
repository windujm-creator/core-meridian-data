/**
 * push120.mjs — ZERØ MERIDIAN
 * push120: ErrorBoundary wrap di App.tsx — fix blank screen / crash tak tertangkap
 *          AppErrorFallback full-screen agar crash tidak jadi layar hitam
 *          _headers asset cache fix
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir   = dirname(fileURLToPath(import.meta.url));
const OWNER   = 'wr98-code';
const REPO    = 'new-zeromeridian';
const BRANCH  = 'main';
const TOKEN   = process.env.GH_TOKEN;

if (!TOKEN) { console.error('❌ GH_TOKEN not set'); process.exit(1); }

const FILES = [
  { path: 'src/App.tsx',       local: 'App.tsx'      },
  { path: 'public/_headers',   local: '_headers'     },
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
  const content = readFileSync(join(__dir, local));
  const b64     = content.toString('base64');
  const sha     = await getSHA(path);

  const body = {
    message: `push120: App.tsx ErrorBoundary wrap — fix blank screen crash`,
    content: b64,
    branch:  BRANCH,
    ...(sha ? { sha } : {}),
  };

  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method:  'PUT',
      headers: {
        Authorization:  `Bearer ${TOKEN}`,
        Accept:         'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (r.ok) {
    console.log(`✅ ${path}`);
    return;
  }

  const err = await r.text();
  if (attempt < 3) {
    console.warn(`⚠ ${path} attempt ${attempt} failed (${r.status}) — retrying...`);
    await new Promise(res => setTimeout(res, 2500 * attempt));
    return pushFile(path, local, attempt + 1);
  }
  throw new Error(`❌ ${path}: ${r.status} — ${err}`);
}

(async () => {
  console.log('🚀 push120 — ErrorBoundary fix blank screen\n');
  let ok = 0, fail = 0;

  for (const { path, local } of FILES) {
    try {
      await pushFile(path, local);
      ok++;
      await new Promise(res => setTimeout(res, 600));
    } catch (e) {
      console.error(e.message);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} ok · ${fail} failed`);
  if (fail > 0) process.exit(1);
})();
