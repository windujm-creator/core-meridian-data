// push112.mjs — ZERØ MERIDIAN 2026
// push112: FINAL FONT SWEEP + CSS CLEANUP
//   - ComingSoon.tsx      — Space Grotesk → JetBrains Mono
//   - PWAInstallPrompt.tsx— Space Grotesk → JetBrains Mono
//   - PageStub.tsx        — Space Grotesk + IBM Plex Mono → JetBrains Mono
//   - App.css             — buang semua Vite default junk
//   - index.css           — hapus Space Grotesk + IBM Plex Mono dari Google Fonts import
//                           + fix font-family violations di utility classes
//
// CARA RUN (Windows PowerShell):
//   $env:GH_TOKEN = "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"
//   cd D:\FILEK
//   node push112.mjs

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
    path: "src/components/shared/ComingSoon.tsx",
    content: b64("ComingSoon.tsx"),
    msg: "push112: ComingSoon — Space Grotesk→JetBrains Mono (font standar wajib)",
  },
  {
    path: "src/components/shared/PWAInstallPrompt.tsx",
    content: b64("PWAInstallPrompt.tsx"),
    msg: "push112: PWAInstallPrompt — Space Grotesk→JetBrains Mono (font standar wajib)",
  },
  {
    path: "src/components/shared/PageStub.tsx",
    content: b64("PageStub.tsx"),
    msg: "push112: PageStub — Space Grotesk+IBM Plex Mono→JetBrains Mono (font standar wajib)",
  },
  {
    path: "src/App.css",
    content: b64("App.css"),
    msg: "push112: App.css — hapus semua Vite default junk (.logo .card .read-the-docs)",
  },
  {
    path: "src/index.css",
    content: b64("index.css"),
    msg: "push112: index.css — hapus Space Grotesk+IBM Plex Mono dari Google Fonts + fix utility classes",
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
        "User-Agent": "zeromeridian-push112",
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

console.log("=== push112 ZERØ MERIDIAN ===");
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
if (fail > 0) process.exit(1);
