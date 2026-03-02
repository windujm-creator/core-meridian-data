// push105b.mjs — Hotfix: OrderBook.tsx syntax error line 521 (trailing backslash)
import https from "https";

const OWNER = "wr98-code", REPO = "new-zeromeridian";
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error("❌ GH_TOKEN tidak ada! Set dulu: $env:GH_TOKEN = \"ghp_xxx\"");
  process.exit(1);
}

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "User-Agent": "push105b-hotfix",
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

async function getSHA(fp) {
  const r = await req("GET", `/repos/${OWNER}/${REPO}/contents/${fp}`);
  return r.status === 200 ? r.body.sha : null;
}

async function getFileContent(fp) {
  const r = await req("GET", `/repos/${OWNER}/${REPO}/contents/${fp}`);
  if (r.status !== 200) throw new Error(`Gagal fetch ${fp}: ${r.status}`);
  return {
    content: Buffer.from(r.body.content, "base64").toString("utf8"),
    sha: r.body.sha
  };
}

async function push(fp, content, msg) {
  const b64 = Buffer.from(content, "utf8").toString("base64");
  for (let a = 1; a <= 3; a++) {
    const sha = await getSHA(fp);
    const body = { message: msg, content: b64 };
    if (sha) body.sha = sha;
    const r = await req("PUT", `/repos/${OWNER}/${REPO}/contents/${fp}`, body);
    if (r.status === 200 || r.status === 201) return true;
    if (r.status === 409) { await delay(2500 * a); continue; }
    console.error(`❌ Push failed: ${r.status}`, r.body);
    return false;
  }
  return false;
}

async function main() {
  console.log("🔧 push105b — Hotfix OrderBook.tsx syntax error\n");

  const fp = "src/pages/OrderBook.tsx";

  // 1. Fetch file dari GitHub
  console.log(`📥 Fetching ${fp}...`);
  const { content: original } = await getFileContent(fp);

  // 2. Fix: hapus trailing backslash di line yang mengandung pattern ini
  // Pattern: return () => { mountedRef.current = false; };\
  // Fix:     return () => { mountedRef.current = false; };
  const fixed = original.replace(
    /return \(\) => \{ mountedRef\.current = false; \};\\(\r?\n)/g,
    "return () => { mountedRef.current = false; };$1"
  );

  if (fixed === original) {
    // Fallback: cari backslash di akhir baris manapun yang ada semicolon
    const lines = original.split("\n");
    let fixCount = 0;
    const fixedLines = lines.map((line, i) => {
      // Hapus trailing backslash jika ada (bukan dalam string/template literal)
      if (line.endsWith("\\") && !line.trimStart().startsWith("//") && !line.includes("`")) {
        console.log(`  Fixed line ${i + 1}: ${line.trim()}`);
        fixCount++;
        return line.slice(0, -1);
      }
      return line;
    });
    
    if (fixCount === 0) {
      console.error("❌ Pattern tidak ditemukan! Cek manual OrderBook.tsx line 521.");
      process.exit(1);
    }
    
    const fixedContent = fixedLines.join("\n");
    console.log(`✅ ${fixCount} trailing backslash dihapus\n`);
    
    console.log(`📤 Pushing fix...`);
    const ok = await push(fp, fixedContent, "push105b: OrderBook — fix trailing backslash syntax error line 521");
    
    if (ok) {
      console.log("✅ push105b COMPLETE!");
      console.log("🚀 Cloudflare Pages akan rebuild otomatis.");
      console.log("⏳ Tunggu ~2 menit lalu cek: https://new-zeromeridian.pages.dev/orderbook");
    } else {
      console.error("❌ Push gagal!");
    }
  } else {
    console.log("✅ Pattern ditemukan dan diperbaiki\n");
    console.log(`📤 Pushing fix...`);
    const ok = await push(fp, fixed, "push105b: OrderBook — fix trailing backslash syntax error line 521");
    
    if (ok) {
      console.log("✅ push105b COMPLETE!");
      console.log("🚀 Cloudflare Pages akan rebuild otomatis.");
      console.log("⏳ Tunggu ~2 menit lalu cek: https://new-zeromeridian.pages.dev/orderbook");
    } else {
      console.error("❌ Push gagal!");
    }
  }
}

main().catch(console.error);
