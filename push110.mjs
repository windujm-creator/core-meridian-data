// push110.mjs — ZERØ MERIDIAN 2026
// push110: font fix (Networks) + responsive polish semua halaman (Dashboard, Derivatives,
//          Intelligence, Security, SmartMoney, Tokens)
//
// CARA RUN (Windows PowerShell):
//   $env:GH_TOKEN = "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"
//   cd D:\FILEK
//   node push110.mjs

import https from "https";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const OWNER = "wr98-code", REPO = "new-zeromeridian";
const TOKEN = process.env.GH_TOKEN; // SELALU dari env var

if (!TOKEN) {
  console.error("ERROR: GH_TOKEN env var tidak di-set!");
  process.exit(1);
}

const __dir = dirname(fileURLToPath(import.meta.url));
const b64 = (name) => readFileSync(join(__dir, name)).toString("base64");

const FILES = [
  {
    path: "src/pages/Networks.tsx",
    content: b64("Networks.tsx"),
    msg: "push110: Networks — fix Space Grotesk → JetBrains Mono (standar wajib) + responsive isMobile prop",
  },
  {
    path: "src/pages/Dashboard.tsx",
    content: b64("Dashboard.tsx"),
    msg: "push110: Dashboard — useBreakpoint + responsive grid (mobile 2col, tablet 3col, desktop 5col)",
  },
  {
    path: "src/pages/Derivatives.tsx",
    content: b64("Derivatives.tsx"),
    msg: "push110: Derivatives — useBreakpoint + summary responsive grid + table overflowX scroll mobile",
  },
  {
    path: "src/pages/Intelligence.tsx",
    content: b64("Intelligence.tsx"),
    msg: "push110: Intelligence — useBreakpoint + responsive padding + NewsCard mobile adapt",
  },
  {
    path: "src/pages/Security.tsx",
    content: b64("Security.tsx"),
    msg: "push110: Security — useBreakpoint + metrics responsive grid + table overflowX scroll mobile",
  },
  {
    path: "src/pages/SmartMoney.tsx",
    content: b64("SmartMoney.tsx"),
    msg: "push110: SmartMoney — useBreakpoint + table overflowX scroll + tabs scroll mobile",
  },
  {
    path: "src/pages/Tokens.tsx",
    content: b64("Tokens.tsx"),
    msg: "push110: Tokens — useBreakpoint + table overflowX scroll + search full-width mobile",
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
        "User-Agent": "zeromeridian-push110",
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

// ─── getSHA — fresh per attempt, avoid 409 conflict ──────────────────────────

async function getSHA(fp) {
  const r = await req("GET", `/repos/${OWNER}/${REPO}/contents/${fp}`, {});
  return r.status === 200 ? r.body.sha : null;
}

// ─── pushFile — 3 retry dengan backoff ────────────────────────────────────────

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

console.log("=== push110 ZERØ MERIDIAN ===");
console.log(`Files to push: ${FILES.length}`);
console.log("");

let ok = 0, fail = 0;

for (const f of FILES) {
  console.log(`→ ${f.path}`);
  const success = await pushFile(f.path, f.content, f.msg);
  if (success) ok++;
  else fail++;
  await delay(500); // throttle antar push
}

console.log("");
console.log(`=== DONE: ${ok} sukses, ${fail} gagal ===`);
if (fail > 0) process.exit(1);
