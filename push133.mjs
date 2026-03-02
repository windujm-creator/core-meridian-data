#!/usr/bin/env node
/**
 * push133.mjs — ZERØ MERIDIAN Auto-Push Script
 * Jalankan dari D:\FILEK:
 *   node push133.mjs
 *
 * Token via env:
 *   $env:GH_TOKEN = "ghp_xxxx"   (PowerShell)
 *   node push133.mjs
 *
 * Yang dilakukan:
 *   1. Validasi GH_TOKEN
 *   2. Jalankan zm-check di new-zeromeridian-push133
 *   3. Copy semua file yang berubah ke new-zeromeridian-main
 *   4. Git add + commit + push ke GitHub
 */

import { execSync }                       from 'child_process';
import { existsSync, readdirSync, statSync,
         readFileSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname, relative }        from 'path';
import { fileURLToPath }                  from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const PUSH_ID    = 'push133';
const COMMIT_MSG = 'push133: Full light professional reskin — Bloomberg mode all pages\n\n- AISignals, Sentiment, OnChain, Defi, Converter, Tokens, Networks\n- SmartMoney, Security, OrderBook, Fundamentals, Intelligence\n- Derivatives, Portal → light theme push132 tokens\n- Zero dark neon colors remaining\n- All CSS vars (--zm-*) replaced with hardcoded rgba()\n- ZM-CHECK ✅ LOLOS';

const SRC_DIR  = join(__dirname, 'new-zeromeridian-push133');
const DEST_DIR = join(__dirname, 'new-zeromeridian-main');

// Files/dirs to skip when copying
const SKIP = new Set([
  'node_modules', '.git', 'dist', '.cache',
  'vite.config.ts.timestamp-1772125602932-d476a3ac270258.mjs',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const log  = (msg) => console.log(`  ${msg}`);
const ok   = (msg) => console.log(`\x1b[32m  ✅ ${msg}\x1b[0m`);
const err  = (msg) => console.error(`\x1b[31m  ❌ ${msg}\x1b[0m`);
const info = (msg) => console.log(`\x1b[36m  ℹ  ${msg}\x1b[0m`);
const warn = (msg) => console.log(`\x1b[33m  ⚠  ${msg}\x1b[0m`);

function run(cmd, cwd = DEST_DIR) {
  return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] }).trim();
}

function copyDir(src, dest) {
  let count = 0;
  const entries = readdirSync(src);
  for (const entry of entries) {
    if (SKIP.has(entry)) continue;
    const srcPath  = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
      count += copyDir(srcPath, destPath);
    } else {
      // Only copy if different
      let shouldCopy = true;
      if (existsSync(destPath)) {
        try {
          const a = readFileSync(srcPath);
          const b = readFileSync(destPath);
          shouldCopy = !a.equals(b);
        } catch { shouldCopy = true; }
      }
      if (shouldCopy) {
        const destDirPath = dirname(destPath);
        if (!existsSync(destDirPath)) mkdirSync(destDirPath, { recursive: true });
        copyFileSync(srcPath, destPath);
        count++;
      }
    }
  }
  return count;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\n\x1b[1m\x1b[36m━━━ ZERØ MERIDIAN — ' + PUSH_ID.toUpperCase() + ' Auto Push ━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

// 1. Token check
const token = process.env.GH_TOKEN;
if (!token) {
  err('GH_TOKEN tidak ditemukan!');
  err('Set dulu: $env:GH_TOKEN = "ghp_xxxx"');
  process.exit(1);
}
ok('GH_TOKEN found');

// 2. Validate directories
if (!existsSync(SRC_DIR)) {
  err(`Source tidak ditemukan: ${SRC_DIR}`);
  process.exit(1);
}
if (!existsSync(DEST_DIR)) {
  err(`Destination tidak ditemukan: ${DEST_DIR}`);
  process.exit(1);
}
ok(`Folders validated`);

// 3. Run zm-check on source
log('Menjalankan zm-check...');
try {
  const zmResult = execSync('node zm-check.mjs', {
    cwd: SRC_DIR,
    encoding: 'utf-8',
    stdio: ['pipe','pipe','pipe']
  });
  if (zmResult.includes('LOLOS')) {
    ok('ZM-CHECK ✅ LOLOS');
  } else {
    warn('ZM-CHECK output tidak expected, lanjut...');
    log(zmResult.slice(0, 200));
  }
} catch (e) {
  err('ZM-CHECK GAGAL! Fix violations dulu.');
  console.error(e.stdout || e.message);
  process.exit(1);
}

// 4. Copy files
log(`Copying ${SRC_DIR} → ${DEST_DIR}...`);
const copied = copyDir(SRC_DIR, DEST_DIR);
ok(`${copied} file(s) updated`);

// 5. Git status
let gitStatus;
try {
  gitStatus = run('git status --porcelain');
} catch (e) {
  err('Git error: ' + e.message);
  process.exit(1);
}

if (!gitStatus) {
  info('Tidak ada perubahan di git. Mungkin sudah up to date.');
  process.exit(0);
}

const changedFiles = gitStatus.split('\n').filter(Boolean);
info(`${changedFiles.length} file(s) changed:`);
changedFiles.slice(0, 15).forEach(f => log('  ' + f));
if (changedFiles.length > 15) log(`  ... dan ${changedFiles.length - 15} lainnya`);

// 6. Git add
log('Git add...');
try {
  run('git add -A');
  ok('git add -A done');
} catch (e) {
  err('git add gagal: ' + e.message);
  process.exit(1);
}

// 7. Git commit
log('Git commit...');
try {
  run(`git commit -m "${COMMIT_MSG.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
  ok('Committed: ' + PUSH_ID);
} catch (e) {
  err('git commit gagal: ' + e.message);
  process.exit(1);
}

// 8. Set remote with token
log('Setting remote URL dengan token...');
try {
  const remoteUrl = run('git remote get-url origin');
  // Extract repo path from existing URL
  const repoPath = remoteUrl
    .replace('https://github.com/', '')
    .replace(/^.*@github\.com[:/]/, '')
    .replace(/\.git$/, '');
  const tokenUrl = `https://${token}@github.com/${repoPath}.git`;
  run(`git remote set-url origin "${tokenUrl}"`);
  ok('Remote URL updated');
} catch (e) {
  err('Remote URL gagal: ' + e.message);
  process.exit(1);
}

// 9. Git push
log('Pushing ke GitHub...');
try {
  const branch = run('git rev-parse --abbrev-ref HEAD');
  const pushOut = run(`git push origin ${branch}`);
  ok(`Push berhasil → branch: ${branch}`);
  if (pushOut) log(pushOut);
} catch (e) {
  err('git push gagal:');
  console.error(e.stderr || e.message);
  process.exit(1);
}

// 10. Reset remote URL (remove token from URL for security)
try {
  const remoteUrl = run('git remote get-url origin');
  const cleanUrl = remoteUrl.replace(/https:\/\/[^@]+@/, 'https://');
  run(`git remote set-url origin "${cleanUrl}"`);
} catch {}

console.log('\n\x1b[1m\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[1m\x1b[32m  🚀 PUSH133 BERHASIL! Vercel auto-deploy triggered.\x1b[0m');
console.log('\x1b[1m\x1b[32m  🔗 https://zeromeridian.vercel.app\x1b[0m');
console.log('\x1b[1m\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
