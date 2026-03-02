// push105c.mjs — Hotfix agresif: hapus SEMUA trailing backslash di OrderBook.tsx
import https from "https";

const OWNER = "wr98-code", REPO = "new-zeromeridian";
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) { console.error("❌ Set GH_TOKEN dulu!"); process.exit(1); }

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.github.com", path, method,
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "User-Agent": "push105c",
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
      }
    };
    const r = https.request(options, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const fp = "src/pages/OrderBook.tsx";

  // 1. Fetch file
  console.log("📥 Fetching OrderBook.tsx dari GitHub...");
  const res = await req("GET", `/repos/${OWNER}/${REPO}/contents/${fp}`);
  if (res.status !== 200) { console.error("❌ Gagal fetch:", res.status); process.exit(1); }

  const sha = res.body.sha;
  const original = Buffer.from(res.body.content, "base64").toString("utf8");

  console.log(`📄 File size: ${original.length} chars`);

  // 2. Fix: hapus trailing backslash dari SEMUA baris
  const lines = original.split("\n");
  let fixCount = 0;

  const fixedLines = lines.map((line, i) => {
    // Cek apakah baris berakhir dengan backslash (tapi bukan \\)
    if (line.endsWith("\\") && !line.endsWith("\\\\")) {
      console.log(`  🔧 Line ${i + 1}: hapus trailing backslash`);
      console.log(`     Before: ${line.slice(-30)}`);
      console.log(`     After:  ${line.slice(0, -1).slice(-30)}`);
      fixCount++;
      return line.slice(0, -1);
    }
    return line;
  });

  if (fixCount === 0) {
    console.log("⚠️  Tidak ada trailing backslash ditemukan!");
    console.log("📋 Cek sekitar line 521:");
    lines.slice(518, 524).forEach((l, i) => {
      const codes = [...l].slice(-5).map(c => c.charCodeAt(0));
      console.log(`  Line ${519+i}: ${JSON.stringify(l)} | last chars: ${codes}`);
    });
    process.exit(1);
  }

  const fixed = fixedLines.join("\n");
  console.log(`\n✅ ${fixCount} baris diperbaiki\n`);

  // 3. Push
  console.log("📤 Pushing ke GitHub...");
  for (let a = 1; a <= 3; a++) {
    // Fresh SHA
    const freshRes = await req("GET", `/repos/${OWNER}/${REPO}/contents/${fp}`);
    const freshSha = freshRes.status === 200 ? freshRes.body.sha : sha;

    const b64 = Buffer.from(fixed, "utf8").toString("base64");
    const r = await req("PUT", `/repos/${OWNER}/${REPO}/contents/${fp}`, {
      message: "push105c: OrderBook — remove trailing backslash syntax error",
      content: b64,
      sha: freshSha
    });

    if (r.status === 200 || r.status === 201) {
      console.log("✅ push105c COMPLETE!");
      console.log("🚀 Cloudflare Pages rebuild otomatis ~2 menit");
      console.log("🔗 https://new-zeromeridian.pages.dev/orderbook");
      return;
    }
    if (r.status === 409) { console.log(`⚠️  Conflict, retry ${a}...`); await delay(3000 * a); continue; }
    console.error(`❌ Push failed: ${r.status}`, JSON.stringify(r.body));
    process.exit(1);
  }
  console.error("❌ Semua retry gagal!");
}

main().catch(console.error);
