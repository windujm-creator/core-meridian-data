#!/usr/bin/env node
/**
 * zm-check.mjs — ZERØ MERIDIAN Pre-Push Standards Checker
 *
 * Jalankan sebelum SETIAP push:
 *   node zm-check.mjs
 *
 * Exit code 0 = LOLOS, siap push
 * Exit code 1 = ADA VIOLATION, push diblokir
 *
 * Checks:
 *   CRITICAL  → className=, hex color, fontFamily monospace raw, Math.random, mock/fake data
 *   MANDATORY → React.memo, displayName, mountedRef di async useEffect
 *   WARNING   → Inter/IBM Plex font load, missing --zm-font CSS vars, Object.freeze pada data
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const SRC_ROOT = './src';

// Folder yang di-scan (bukan ui/ dari shadcn)
const SCAN_DIRS = [
  'src/pages',
  'src/components/layout',
  'src/components/shared',
  'src/components/tiles',
  'src/hooks',
  'src/lib',
  'src/contexts',
];

const EXTRA_FILES = [
  'index.html',
  'src/index.css',
  'src/App.css',
];

// ─── Color helpers ────────────────────────────────────────────────────────────

const R = '\x1b[31m';   // red
const Y = '\x1b[33m';   // yellow
const G = '\x1b[32m';   // green
const C = '\x1b[36m';   // cyan
const B = '\x1b[1m';    // bold
const DIM = '\x1b[2m';  // dim
const RST = '\x1b[0m';  // reset

// ─── File collector ───────────────────────────────────────────────────────────

function collectFiles(dir, exts = ['.tsx', '.ts', '.css', '.html']) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (exts.includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

function readFile(path) {
  try { return readFileSync(path, 'utf-8'); }
  catch { return ''; }
}

// ─── Violation tracker ────────────────────────────────────────────────────────

const violations = { CRITICAL: [], MANDATORY: [], WARNING: [] };

function addViolation(level, file, line, message, snippet = '') {
  violations[level].push({ file: relative('.', file), line, message, snippet: snippet.trim().slice(0, 120) });
}

// ─── Check runners ────────────────────────────────────────────────────────────

function checkLines(filePath, lines, level, pattern, message, excludePattern = null) {
  lines.forEach((line, idx) => {
    if (excludePattern && excludePattern.test(line)) return;
    const match = pattern.test(line);
    if (match) {
      addViolation(level, filePath, idx + 1, message, line);
    }
  });
}

function scanTsxTs(files) {
  for (const fp of files) {
    // Skip test files dan ui/ folder
    if (fp.includes('.test.') || fp.includes('src/components/ui/')) continue;

    const content = readFile(fp);
    const lines   = content.split('\n');

    // ── CRITICAL: className= ──────────────────────────────────────────────
    checkLines(fp, lines, 'CRITICAL',
      /className=/,
      'className= dilarang — pakai style={{ }} only',
      /\/\/.*className=|^\s*\*/  // skip comments
    );

    // ── CRITICAL: hex color ───────────────────────────────────────────────
    checkLines(fp, lines, 'CRITICAL',
      /#[0-9a-fA-F]{3,8}\b/,
      'Hex color dilarang — pakai rgba() only',
      /\/\/.*#[0-9a-fA-F]|^\s*\*|theme.color|meta.*content|manifest|favicon|eslint|#region|#endregion/
    );

    // ── CRITICAL: fontFamily raw monospace ───────────────────────────────
    checkLines(fp, lines, 'CRITICAL',
      /fontFamily\s*[=:]\s*["'`]monospace["'`]/,
      "fontFamily='monospace' dilarang — pakai \"'JetBrains Mono', monospace\"",
    );

    // ── CRITICAL: Math.random() ───────────────────────────────────────────
    checkLines(fp, lines, 'CRITICAL',
      /Math\.random\(\)/,
      'Math.random() dilarang — pakai deterministicJitter',
      /\/\/.*Math\.random|Zero.*Math\.random|\* -/
    );

    // ── CRITICAL: mock/fake/dummy data sebagai state/return ───────────────
    checkLines(fp, lines, 'CRITICAL',
      /useState\s*\(\s*(MOCK_|FAKE_|DUMMY_|mockData|fakeData)/,
      'Mock/fake data sebagai initial state dilarang — pakai [] atau null',
    );
    checkLines(fp, lines, 'CRITICAL',
      /return\s+(MOCK_|FAKE_|DUMMY_)[A-Z_]+\s*;/,
      'Mengembalikan mock data dilarang — tampilkan error state',
    );
    // Fallback ke mock saat API error
    checkLines(fp, lines, 'CRITICAL',
      /catch[^{]*\{[^}]*set[A-Z][a-z]+\s*\(\s*(MOCK_|FAKE_|DUMMY_)/,
      'Fallback ke mock data saat catch — tampilkan error state',
    );

    // ── MANDATORY: React.memo() ───────────────────────────────────────────
    // Class components (extends Component/PureComponent) tidak bisa pakai memo() — skip
    const isClassComponent  = /extends\s+(?:React\.)?(?:PureComponent|Component)\s*[<{]/.test(content);
    const isPageOrComponent =
      fp.includes('src/pages/') ||
      fp.includes('src/components/layout/') ||
      fp.includes('src/components/shared/') ||
      fp.includes('src/components/tiles/');

    if (isPageOrComponent && extname(fp) === '.tsx' && !isClassComponent) {
      if (!content.includes('memo(') && !content.includes('React.memo(')) {
        addViolation('MANDATORY', fp, 0, 'Tidak ada React.memo() — semua komponen wajib pakai memo()');
      }
      if (!content.includes('.displayName') && !content.includes('static displayName')) {
        addViolation('MANDATORY', fp, 0, 'Tidak ada .displayName — semua komponen wajib set displayName');
      }
    }

    // ── MANDATORY: mountedRef di async useEffect ──────────────────────────
    const hasAsyncEffect = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?async|useEffect\s*\(\s*async/.test(content)
      || /async\s+function.*fetch|const fetch.*=.*async|fetchData.*async/.test(content);
    // Detect semua variasi: mountedRef, m.current, mounted.current, isMounted, dll
    const hasMountedRef = /mountedRef|isMounted|\.current\s*=\s*(?:true|false)/.test(content);

    if (isPageOrComponent && hasAsyncEffect && !hasMountedRef) {
      addViolation('MANDATORY', fp, 0, 'Async useEffect tanpa mountedRef — risiko setState after unmount');
    }

    // ── MANDATORY: Object.freeze di UI constants ──────────────────────────
    // Pastikan TABS, PAIRS, dll sudah freeze
    const constArrays = content.match(/^const\s+([A-Z_]+)\s*(?::\s*[^=]+)?\s*=\s*\[/gm) || [];
    for (const match of constArrays) {
      const varName = match.match(/const\s+([A-Z_]+)/)?.[1];
      if (!varName) continue;
      // Kalau const array uppercase tapi tidak pakai Object.freeze
      const assignPattern = new RegExp('const\\s+' + varName + '\\s*(?::[^=]+)?=\\s*(?!Object\\.freeze)\\[');
      if (assignPattern.test(content)) {
        // Hanya flag kalau itu config/UI constant (bukan state/data)
        if (['TABS','PAIRS','COLS','FILTERS','CATEGORIES','HEADERS','ITEMS'].some(k => varName.includes(k))) {
          addViolation('MANDATORY', fp, 0,
            'Constant ' + varName + ' tidak pakai Object.freeze() — wajib freeze untuk UI constants'
          );
        }
      }
    }

    // ── WARNING: font selain JetBrains Mono ───────────────────────────────
    checkLines(fp, lines, 'WARNING',
      /fontFamily.*(?:\bInter\b|Arial|Roboto|sans-serif|IBM Plex|Space Grotesk|system-ui)/,
      'Font non-JetBrains Mono terdeteksi — JetBrains Mono only',
      /\/\/|^\s*\*/
    );
  }
}

function scanHtml(files) {
  for (const fp of files) {
    if (!fp.endsWith('.html')) continue;
    const content = readFile(fp);
    const lines   = content.split('\n');

    // Cek font load yang tidak diperlukan
    checkLines(fp, lines, 'WARNING',
      /googleapis.*(?:Inter|IBM\+Plex|Space\+Grotesk|Arial|Roboto)/,
      'Font non-JetBrains Mono diload di HTML — hapus, load JetBrains Mono only',
    );

    // Hex color di meta tags (theme-color) — ini boleh, skip
    // className di HTML — tidak relevan
  }
}

function scanCss(files) {
  for (const fp of files) {
    if (!fp.endsWith('.css')) continue;
    const content = readFile(fp);

    // Cek --zm-font vars terdefinisi
    if (fp.includes('index.css')) {
      if (!content.includes('--zm-font-ui')) {
        addViolation('WARNING', fp, 0, '--zm-font-ui belum didefinisikan di :root CSS vars');
      }
      if (!content.includes('--zm-font-data')) {
        addViolation('WARNING', fp, 0, '--zm-font-data belum didefinisikan di :root CSS vars');
      }
      // Cek kalau ada font selain JetBrains di CSS
      const lines = content.split('\n');
      checkLines(fp, lines, 'WARNING',
        /font-family:.*(?:Inter|Arial|Roboto|IBM Plex|Space Grotesk)(?!.*JetBrains)/,
        'Font non-JetBrains Mono di CSS',
        /\/\//
      );
    }
  }
}

// ─── Run all checks ───────────────────────────────────────────────────────────

console.log('');
console.log(B + C + '━━━ ZERØ MERIDIAN — Pre-Push Standards Check ━━━━━━━━━━━━━━━━━━━' + RST);
console.log('');

const tsxFiles  = SCAN_DIRS.flatMap(d => collectFiles(d, ['.tsx', '.ts']));
const htmlFiles = EXTRA_FILES.filter(f => f.endsWith('.html')).filter(existsSync);
const cssFiles  = EXTRA_FILES.filter(f => f.endsWith('.css')).filter(existsSync);

console.log(DIM + '  Scanning ' + tsxFiles.length + ' TS/TSX files...' + RST);

scanTsxTs(tsxFiles);
scanHtml(htmlFiles);
scanCss(cssFiles);

// ─── Report ───────────────────────────────────────────────────────────────────

const totalCritical  = violations.CRITICAL.length;
const totalMandatory = violations.MANDATORY.length;
const totalWarning   = violations.WARNING.length;
const totalAll       = totalCritical + totalMandatory + totalWarning;

function printViolations(level, color, items) {
  if (items.length === 0) return;
  console.log('');
  console.log(B + color + '  ── ' + level + ' (' + items.length + ') ──────────────────────────────────────' + RST);
  for (const v of items) {
    const loc = v.line > 0 ? ':' + v.line : '';
    console.log(color + '  ✗ ' + RST + B + v.file + loc + RST);
    console.log('    ' + v.message);
    if (v.snippet) {
      console.log(DIM + '    → ' + v.snippet + RST);
    }
  }
}

printViolations('CRITICAL',  R, violations.CRITICAL);
printViolations('MANDATORY', Y, violations.MANDATORY);
printViolations('WARNING',   C, violations.WARNING);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (totalAll === 0) {
  console.log(B + G + '  ✅  LOLOS — Semua checks bersih. Siap push!' + RST);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  process.exit(0);
} else {
  const blockPush = totalCritical > 0 || totalMandatory > 0;
  console.log(
    '  ' +
    (totalCritical  > 0 ? R + B + totalCritical  + ' CRITICAL ' + RST : '') +
    (totalMandatory > 0 ? Y + B + totalMandatory + ' MANDATORY ' + RST : '') +
    (totalWarning   > 0 ? C + totalWarning + ' WARNING ' + RST : '')
  );
  if (blockPush) {
    console.log(R + B + '  ❌  PUSH DIBLOKIR — Perbaiki CRITICAL + MANDATORY dulu!' + RST);
  } else {
    console.log(Y + '  ⚠   WARNING saja — push boleh, tapi sebaiknya perbaiki.' + RST);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  process.exit(blockPush ? 1 : 0);
}
