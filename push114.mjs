// push114.mjs — ZERØ MERIDIAN 2026
// push114: FINAL font sweep — MetricCard + PWAInstallPrompt (IBM Plex Mono missed)
//
// CARA RUN:
//   $env:GH_TOKEN = "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"
//   cd D:\FILEK
//   node push114.mjs

import https from "https";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const OWNER = "wr98-code", REPO = "new-zeromeridian";
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error("ERROR: GH_TOKEN tidak di-set!"); process.exit(1); }

const __dir = dirname(fileURLToPath(import.meta.url));
const b64 = (name) => readFileSync(join(__dir, name)).toString("base64");

const FILES = [
  {
    path: "src/components/shared/MetricCard.tsx",
    content: b64("MetricCard.tsx"),
    msg: "push114: MetricCard — IBM Plex Mono→JetBrains Mono (font standar wajib, final sweep)",
  },
  {
    path: "src/components/shared/PWAInstallPrompt.tsx",
    content: b64("PWAInstallPrompt.tsx"),
    msg: "push114: PWAInstallPrompt — IBM Plex Mono→JetBrains Mono (missed di push112, final sweep)",
  },
];

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const r = https.request({
      hostname: "api.github.com", path, method,
      headers: {
        "Authorization": "token " + TOKEN, "User-Agent": "zeromeridian-push114",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch { resolve({ status: res.statusCode, body: raw }); } });
    });
    r.on("error", reject); r.write(data); r.end();
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function getSHA(fp) {
  const r = await req("GET", `/repos/${OWNER}/${REPO}/contents/${fp}`, {});
  return r.status === 200 ? r.body.sha : null;
}

async function pushFile(fp, content, msg) {
  for (let a = 1; a <= 3; a++) {
    console.log(`  [attempt ${a}] ${fp}`);
    const sha = await getSHA(fp);
    const body = { message: msg, content };
    if (sha) body.sha = sha;
    const r = await req("PUT", `/repos/${OWNER}/${REPO}/contents/${fp}`, body);
    if (r.status === 200 || r.status === 201) { console.log(`  ✅ OK: ${fp}`); return true; }
    if (r.status === 409) { await delay(2500 * a); continue; }
    console.error(`  ❌ FAIL (${r.status}): ${fp}`); return false;
  }
  return false;
}

console.log("=== push114 ZERØ MERIDIAN — FINAL FONT SWEEP ===\n");
let ok = 0, fail = 0;
for (const f of FILES) {
  console.log(`→ ${f.path}`);
  (await pushFile(f.path, f.content, f.msg)) ? ok++ : fail++;
  await delay(500);
}
console.log(`\n=== DONE: ${ok} sukses, ${fail} gagal ===`);
if (ok === FILES.length) console.log("\n✅ Codebase sekarang 100% JetBrains Mono di semua layer!");
if (fail > 0) process.exit(1);
