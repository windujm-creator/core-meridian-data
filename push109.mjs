// push109.mjs — ZERØ MERIDIAN
import https from "https";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const OWNER = "wr98-code";
const REPO  = "new-zeromeridian";
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) { console.error("ERROR: GH_TOKEN env var not set"); process.exit(1); }

const __dir = dirname(fileURLToPath(import.meta.url));
const b64 = (name) => readFileSync(join(__dir, name)).toString("base64");

const FILES = [
  { path: "src/pages/Security.tsx",     content: b64("Security.tsx"),     msg: "push109: Security — memo+displayName, JetBrains Mono, empty state" },
  { path: "src/pages/SmartMoney.tsx",   content: b64("SmartMoney.tsx"),   msg: "push109: SmartMoney — memo+displayName, JetBrains Mono, empty state" },
  { path: "src/pages/Tokens.tsx",       content: b64("Tokens.tsx"),       msg: "push109: Tokens — memo+displayName, JetBrains Mono, empty state" },
  { path: "src/pages/Dashboard.tsx",    content: b64("Dashboard.tsx"),    msg: "push109: Dashboard — empty state added" },
  { path: "src/pages/Intelligence.tsx", content: b64("Intelligence.tsx"), msg: "push109: Intelligence — empty state added" },
  { path: "src/pages/Derivatives.tsx",  content: b64("Derivatives.tsx"),  msg: "push109: Derivatives — last updated timestamp" },
];

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "User-Agent": "zeromeridian-push",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "Accept": "application/vnd.github.v3+json",
      },
    };
    const r = https.request(opts, res => {
      let buf = "";
      res.on("data", d => buf += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    r.on("error", reject);
    r.write(data);
    r.end();
  });
}

async function getSHA(filePath) {
  const r = await req("GET", `/repos/${OWNER}/${REPO}/contents/${filePath}`, {});
  if (r.status === 200) return r.body.sha;
  return null;
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function pushFile(filePath, b64content, msg) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const sha = await getSHA(filePath);
    const body = { message: msg, content: b64content };
    if (sha) body.sha = sha;
    const r = await req("PUT", `/repos/${OWNER}/${REPO}/contents/${filePath}`, body);
    if (r.status === 200 || r.status === 201) {
      console.log(`✅ [${r.status}] ${filePath}`);
      return true;
    }
    if (r.status === 409) {
      console.log(`⚠️  409 conflict, retrying ${filePath}...`);
      await delay(2500 * attempt);
      continue;
    }
    console.error(`❌ [${r.status}] ${filePath} — ${JSON.stringify(r.body).slice(0, 200)}`);
    return false;
  }
  return false;
}

console.log("🚀 push109 — ZERØ MERIDIAN — 6 files\n");

let ok = 0, fail = 0;
for (const file of FILES) {
  const result = await pushFile(file.path, file.content, file.msg);
  if (result) ok++; else fail++;
  await delay(500);
}

console.log(`\n─────────────────────────────`);
console.log(`push109 complete: ${ok} ok, ${fail} failed`);
if (fail === 0) console.log("✅ All 6 files pushed. https://new-zeromeridian.pages.dev");
