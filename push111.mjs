// push111.mjs — ZERØ MERIDIAN 2026
// push111: TOTAL FONT SWEEP — semua Space Mono → JetBrains Mono (standar wajib)
//          + ZMSidebar visual polish (active glow, border, background depth)
//
// Files:
//   src/components/layout/ZMSidebar.tsx        — font fix + visual polish
//   src/components/shared/ErrorBoundary.tsx    — font fix
//   src/components/tiles/AISignalTile.tsx      — font fix
//   src/components/tiles/TokenTerminalTile.tsx — font fix
//   src/components/tiles/WasmOrderBook.tsx     — font fix
//   src/pages/NotFound.tsx                     — font fix
//
// CARA RUN (Windows PowerShell):
//   $env:GH_TOKEN = "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"
//   cd D:\FILEK
//   node push111.mjs

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
    path: "src/components/layout/ZMSidebar.tsx",
    content: b64("ZMSidebar.tsx"),
    msg: "push111: ZMSidebar — Space Mono→JetBrains Mono + visual polish (active glow, sidebar depth, ZERØ brighter)",
  },
  {
    path: "src/components/shared/ErrorBoundary.tsx",
    content: b64("ErrorBoundary.tsx"),
    msg: "push111: ErrorBoundary — Space Mono→JetBrains Mono (font standar wajib)",
  },
  {
    path: "src/components/tiles/AISignalTile.tsx",
    content: b64("AISignalTile.tsx"),
    msg: "push111: AISignalTile — Space Mono→JetBrains Mono (font standar wajib)",
  },
  {
    path: "src/components/tiles/TokenTerminalTile.tsx",
    content: b64("TokenTerminalTile.tsx"),
    msg: "push111: TokenTerminalTile — Space Mono→JetBrains Mono (font standar wajib)",
  },
  {
    path: "src/components/tiles/WasmOrderBook.tsx",
    content: b64("WasmOrderBook.tsx"),
    msg: "push111: WasmOrderBook — Space Mono→JetBrains Mono (font standar wajib)",
  },
  {
    path: "src/pages/NotFound.tsx",
    content: b64("NotFound.tsx"),
    msg: "push111: NotFound — Space Mono→JetBrains Mono + rgba() colors (font + color standar wajib)",
  },
];

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        "Authorization": "token " + TOKEN,
        "User-Agent": "zeromeridian-push111",
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

// ─── SEQUENTIAL — bukan Promise.all() ────────────────────────────────────────

console.log("=== push111 ZERØ MERIDIAN ===");
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
