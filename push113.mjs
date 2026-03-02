// push113.mjs — ZERØ MERIDIAN 2026
// push113: CRITICAL HOTFIX — website tidak bisa dibuka
//
//   MASALAH:
//   Service Worker zm-v5 cache terlalu agresif — serve file lama terus.
//   User yang sudah pernah visit tidak bisa dapat update terbaru.
//
//   FIX:
//   1. public/sw.js   — bump CACHE_NAME zm-v5 → zm-v6 (force invalidate semua cache lama)
//   2. src/pages/Portal.tsx — potong splash 2800ms → 1400ms + sessionStorage (lebih reliable)
//
// CARA RUN (Windows PowerShell):
//   $env:GH_TOKEN = "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"
//   cd D:\FILEK
//   node push113.mjs

import https from "https";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const OWNER = "wr98-code", REPO = "new-zeromeridian";
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error("ERROR: GH_TOKEN env var tidak di-set!");
  process.exit(1);
}

const __dir = dirname(fileURLToPath(import.meta.url));
const b64 = (name) => readFileSync(join(__dir, name)).toString("base64");

const FILES = [
  {
    path: "public/sw.js",
    content: b64("sw.js"),
    msg: "push113 HOTFIX: sw.js — cache bump zm-v5→zm-v6 (force invalidate cache lama, fix website tidak bisa dibuka)",
  },
  {
    path: "src/pages/Portal.tsx",
    content: b64("Portal.tsx"),
    msg: "push113 HOTFIX: Portal — splash 2800ms→1400ms + sessionStorage (lebih reliable dari localStorage)",
  },
];

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        "Authorization": "token " + TOKEN,
        "User-Agent": "zeromeridian-push113-hotfix",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const r = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on("error", reject);
    r.write(data);
    r.end();
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getSHA(fp) {
  const r = await req("GET", `/repos/${OWNER}/${REPO}/contents/${fp}`, {});
  return r.status === 200 ? r.body.sha : null;
}

async function pushFile(fp, content, msg) {
  for (let a = 1; a <= 3; a++) {
    console.log(`  [attempt ${a}] getSHA: ${fp}`);
    const sha = await getSHA(fp);
    const body = { message: msg, content };
    if (sha) body.sha = sha;

    const r = await req("PUT", `/repos/${OWNER}/${REPO}/contents/${fp}`, body);
    if (r.status === 200 || r.status === 201) {
      console.log(`  ✅ OK (${r.status}): ${fp}`);
      return true;
    }
    if (r.status === 409) {
      console.warn(`  ⚠️  409 conflict — retry in ${2500 * a}ms`);
      await delay(2500 * a);
      continue;
    }
    console.error(`  ❌ FAIL (${r.status}): ${fp}`, r.body?.message ?? "");
    return false;
  }
  console.error(`  ❌ FAIL setelah 3 attempt: ${fp}`);
  return false;
}

console.log("=== push113 HOTFIX ZERØ MERIDIAN ===");
console.log(`Files: ${FILES.length}`);
console.log("");

let ok = 0, fail = 0;

for (const f of FILES) {
  console.log(`→ ${f.path}`);
  const success = await pushFile(f.path, f.content, f.msg);
  if (success) ok++;
  else fail++;
  await delay(500);
}

console.log("");
console.log(`=== DONE: ${ok} sukses, ${fail} gagal ===`);
if (ok === FILES.length) {
  console.log("");
  console.log("⚡ SETELAH DEPLOY (~2-3 menit):");
  console.log("   1. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)");
  console.log("   2. Atau buka di tab incognito/private baru");
  console.log("   3. Service Worker zm-v6 akan replace zm-v5 otomatis");
}
if (fail > 0) process.exit(1);
