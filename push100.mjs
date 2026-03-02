/**
 * push100.mjs — ZERØ MERIDIAN
 * ══════════════════════════════════════════════════════
 * Portal.tsx — FULL REWRITE
 *   ✅ Animasi "Materialize" — NO rotation loop
 *   ✅ X logo: scale-in + single glow pulse
 *   ✅ Scan line: cyan sweep top→bottom (Bloomberg terminal boot)
 *   ✅ Typewriter: "ZERØ MERIDIAN" karakter per karakter
 *   ✅ Tagline: fade in setelah typewriter selesai
 *   ✅ Grid background: subtle cyan grid lines
 *   ✅ Progress bar: cyan glow tipis
 *   ✅ Auto-enter 2.8s | click to skip
 *   ✅ Skip jika sudah pernah visit
 *
 * Jalankan: $env:GH_TOKEN = "ghp_TOKEN"; node push100.mjs
 * ══════════════════════════════════════════════════════
 */

import https from 'https';

const OWNER = 'wr98-code';
const REPO  = 'new-zeromeridian';
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌ GH_TOKEN tidak ada! Set dulu: $env:GH_TOKEN = "ghp_..."');
  process.exit(1);
}

// ── GitHub API helper ────────────────────────────────────────────────────────

function ghReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path, method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'zm-push100',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getSHA(fp) {
  const r = await ghReq('GET', `/repos/${OWNER}/${REPO}/contents/${fp}`);
  return r.status === 200 ? r.body.sha : null;
}

// ✅ Sequential + retry 3x on 409
async function push(fp, content, msg) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const sha = await getSHA(fp);
    const body = { message: msg, content: Buffer.from(content).toString('base64') };
    if (sha) body.sha = sha;
    const r = await ghReq('PUT', `/repos/${OWNER}/${REPO}/contents/${fp}`, body);
    if (r.status === 200 || r.status === 201) {
      console.log(`  ✅ ${fp}`);
      return true;
    }
    if (r.status === 409) {
      console.log(`  ⚠ 409 SHA conflict, retry ${attempt}/3...`);
      await new Promise(res => setTimeout(res, 2000));
      continue;
    }
    console.log(`  ❌ ${fp} → ${r.status} ${r.body?.message ?? ''}`);
    return false;
  }
  console.log(`  ❌ ${fp} → gagal setelah 3 attempts`);
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// Portal.tsx — MATERIALIZE ANIMATION
// ══════════════════════════════════════════════════════════════════════════════

const PORTAL = `/**
 * Portal.tsx — ZERØ MERIDIAN push100
 * ══════════════════════════════════════════════════
 * Animasi MATERIALIZE — Bloomberg terminal boot feel
 *
 * Sequence:
 *   0ms   → mount, background grid visible
 *   80ms  → X logo scale-in dari 0.6 + fade in
 *   300ms → scan line cyan sweep top→bottom
 *   800ms → typewriter "ZERØ MERIDIAN" 70ms/char
 *   1800ms→ tagline + corner decorations fade in
 *   2800ms→ auto-navigate ke /dashboard
 *
 * Rules:
 *   ✅ Zero className ✅ rgba() only ✅ memo+displayName
 *   ✅ useCallback ✅ useMemo ✅ mountedRef
 * ══════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useCallback, useMemo, useState, memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import XLogo from '@/components/shared/XLogo';

const AUTO_MS    = 2800;
const VISITED_KEY = 'zm_visited';
const TITLE      = 'ZERØ MERIDIAN';

// ─── Corner decoration ────────────────────────────────────────────────────────

const Corner = memo(({ pos }: { pos: 'tl'|'tr'|'bl'|'br' }) => {
  const style = useMemo(() => {
    const base = {
      position: 'absolute' as const,
      width: 20, height: 20,
      borderColor: 'rgba(0,238,255,0.35)',
      borderStyle: 'solid' as const,
    };
    if (pos === 'tl') return { ...base, top: 24, left: 24, borderWidth: '1px 0 0 1px' };
    if (pos === 'tr') return { ...base, top: 24, right: 24, borderWidth: '1px 1px 0 0' };
    if (pos === 'bl') return { ...base, bottom: 24, left: 24, borderWidth: '0 0 1px 1px' };
    return { ...base, bottom: 24, right: 24, borderWidth: '0 1px 1px 0' };
  }, [pos]);
  return <div style={style} />;
});
Corner.displayName = 'Corner';

// ─── Portal ───────────────────────────────────────────────────────────────────

const Portal: React.FC = () => {
  const navigate   = useNavigate();
  const mountedRef = useRef(true);
  const rm         = useReducedMotion();

  const [phase,    setPhase]    = useState(0);
  const [typeIdx,  setTypeIdx]  = useState(0);
  const [progress, setProgress] = useState(0);
  const [scanDone, setScanDone] = useState(false);

  const doEnter = useCallback(() => {
    if (!mountedRef.current) return;
    localStorage.setItem(VISITED_KEY, '1');
    navigate('/dashboard');
  }, [navigate]);

  useEffect(() => {
    mountedRef.current = true;

    if (localStorage.getItem(VISITED_KEY)) {
      navigate('/dashboard');
      return;
    }

    // Phase sequence timers
    const t1 = setTimeout(() => { if (mountedRef.current) setPhase(1); }, 80);
    const t2 = setTimeout(() => { if (mountedRef.current) setPhase(2); }, 300);
    const t3 = setTimeout(() => { if (mountedRef.current) setPhase(3); }, 800);
    const t4 = setTimeout(() => { if (mountedRef.current) setPhase(4); }, 1800);
    const ts = setTimeout(() => { if (mountedRef.current) setScanDone(true); }, 1000);

    // Typewriter
    let idx = 0;
    const typeTimer = setInterval(() => {
      if (!mountedRef.current) return;
      idx++;
      setTypeIdx(idx);
      if (idx >= TITLE.length) clearInterval(typeTimer);
    }, 70);

    // Progress
    const start = Date.now();
    const progTimer = setInterval(() => {
      if (!mountedRef.current) return;
      const pct = Math.min((Date.now() - start) / AUTO_MS * 100, 100);
      setProgress(pct);
      if (pct >= 100) { clearInterval(progTimer); doEnter(); }
    }, 30);

    return () => {
      mountedRef.current = false;
      clearTimeout(t1); clearTimeout(t2);
      clearTimeout(t3); clearTimeout(t4);
      clearTimeout(ts);
      clearInterval(typeTimer);
      clearInterval(progTimer);
    };
  }, [doEnter, navigate]);

  const containerStyle = useMemo(() => ({
    position:       'fixed' as const,
    inset:          0,
    background:     'rgba(5,7,13,1)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexDirection:  'column' as const,
    gap:            28,
    zIndex:         9999,
    cursor:         'pointer',
    overflow:       'hidden' as const,
  }), []);

  const gridStyle = useMemo(() => ({
    position:   'absolute' as const,
    inset:      0,
    backgroundImage:
      'linear-gradient(rgba(0,238,255,0.028) 1px, transparent 1px),' +
      'linear-gradient(90deg, rgba(0,238,255,0.028) 1px, transparent 1px)',
    backgroundSize:    '60px 60px',
    pointerEvents:     'none' as const,
  }), []);

  const radialStyle = useMemo(() => ({
    position:   'absolute' as const,
    inset:      0,
    background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,238,255,0.06) 0%, transparent 65%)',
    pointerEvents: 'none' as const,
  }), []);

  const logoWrapStyle = useMemo(() => ({
    position: 'relative' as const,
    width: 180, height: 180,
  }), []);

  const titleStyle = useMemo(() => ({
    fontFamily:    "'JetBrains Mono', monospace",
    fontSize:      30,
    fontWeight:    700,
    color:         'rgba(228,232,244,1)',
    letterSpacing: '-0.02em',
    lineHeight:    1,
    minHeight:     36,
    minWidth:      260,
    textAlign:     'center' as const,
  }), []);

  const taglineStyle = useMemo(() => ({
    fontFamily:    "'JetBrains Mono', monospace",
    fontSize:      10,
    color:         'rgba(0,238,255,0.5)',
    letterSpacing: '0.22em',
    marginTop:     8,
    textTransform: 'uppercase' as const,
  }), []);

  const progTrackStyle = useMemo(() => ({
    width:        150,
    height:       1,
    background:   'rgba(255,255,255,0.06)',
    borderRadius: 1,
    overflow:     'hidden' as const,
  }), []);

  const hintStyle = useMemo(() => ({
    fontFamily:    "'JetBrains Mono', monospace",
    fontSize:      9,
    color:         'rgba(78,84,110,0.8)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
  }), []);

  const displayText  = TITLE.slice(0, typeIdx);
  const cursorActive = phase >= 3 && typeIdx < TITLE.length;

  return (
    <div
      style={containerStyle}
      onClick={doEnter}
      role="button"
      tabIndex={0}
      aria-label="Enter ZERØ MERIDIAN terminal"
      onKeyDown={useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') doEnter();
      }, [doEnter])}
    >
      {/* Subtle grid */}
      <div style={gridStyle} />
      {/* Center radial glow */}
      <div style={radialStyle} />

      {/* Corner decorations */}
      <AnimatePresence>
        {phase >= 4 && !rm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'absolute' as const, inset: 0, pointerEvents: 'none' as const }}
          >
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={rm ? {} : { opacity: 0 }}
            animate={rm ? {} : { opacity: 1 }}
            transition={{ duration: 0.35 }}
            style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 24 }}
          >

            {/* ── X Logo ── */}
            <div style={logoWrapStyle}>
              {/* Scale-in logo */}
              <motion.div
                initial={rm ? {} : { opacity: 0, scale: 0.65 }}
                animate={rm ? {} : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <XLogo size={180} />
              </motion.div>

              {/* Scan line — cyan sweep top to bottom */}
              {phase >= 2 && !scanDone && !rm && (
                <motion.div
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: 185, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeIn' }}
                  style={{
                    position:     'absolute' as const,
                    top:          0,
                    left:         -16,
                    right:        -16,
                    height:       2,
                    background:   'linear-gradient(90deg, transparent 0%, rgba(0,238,255,0.95) 40%, rgba(0,238,255,0.95) 60%, transparent 100%)',
                    boxShadow:    '0 0 14px rgba(0,238,255,0.9), 0 0 30px rgba(0,238,255,0.4)',
                    pointerEvents:'none' as const,
                    willChange:   'transform',
                  }}
                />
              )}

              {/* Single glow pulse after scan */}
              {scanDone && !rm && (
                <motion.div
                  initial={{ opacity: 0.7, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 1.4 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    position:      'absolute' as const,
                    inset:         -20,
                    borderRadius:  '50%',
                    background:    'radial-gradient(circle, rgba(0,238,255,0.18) 0%, transparent 70%)',
                    pointerEvents: 'none' as const,
                    willChange:    'transform, opacity',
                  }}
                />
              )}
            </div>

            {/* ── Title typewriter ── */}
            <div style={{ textAlign: 'center' as const }}>
              <div style={titleStyle}>
                {phase >= 3 ? displayText : ''}
                {cursorActive && (
                  <motion.span
                    animate={rm ? {} : { opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    style={{ color: 'rgba(0,238,255,1)', marginLeft: 1 }}
                  >
                    |
                  </motion.span>
                )}
              </div>

              {/* Tagline */}
              <AnimatePresence>
                {phase >= 4 && (
                  <motion.div
                    initial={rm ? {} : { opacity: 0, y: 5 }}
                    animate={rm ? {} : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={taglineStyle}
                  >
                    Crypto Intelligence Terminal
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Progress + hint ── */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 10 }}>
              <div style={progTrackStyle}>
                <motion.div
                  style={{
                    height:          '100%',
                    background:      'rgba(0,238,255,1)',
                    transformOrigin: 'left',
                    boxShadow:       '0 0 6px rgba(0,238,255,0.9)',
                  }}
                  animate={{ scaleX: progress / 100 }}
                  transition={{ duration: 0 }}
                />
              </div>
              <div style={hintStyle}>Click to enter</div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

Portal.displayName = 'Portal';
export default memo(Portal);
`;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   ZERØ MERIDIAN — push100                           ║');
  console.log('║   Portal: Materialize Entrance Animation            ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  const me = await ghReq('GET', '/user');
  if (me.status !== 200) {
    console.error('❌ Token tidak valid! Buat token baru di github.com/settings/tokens');
    process.exit(1);
  }
  console.log('✅ Token OK — user: ' + me.body.login);
  console.log('');
  console.log('Pushing files...');
  console.log('');

  // Sequential — satu per satu, tidak parallel
  const r1 = await push(
    'src/pages/Portal.tsx',
    PORTAL,
    'push100: Portal — Materialize entrance animation (scan line + typewriter, no rotation)'
  );

  // ✅ FIX: CF Pages SPA routing
  // Tanpa file ini, buka /dashboard /markets langsung → 404
  // Dengan ini: semua URL → index.html → React Router handle
  const REDIRECTS = ['/', '*'].join('') + ' /index.html 200';
  const r2 = await push(
    'public/_redirects',
    REDIRECTS,
    'push100: Fix CF Pages SPA routing — direct URL tidak 404'
  );

  console.log('');

  if (r1 && r2) {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   ✅ BERHASIL!                                      ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║                                                      ║');
    console.log('║   Portal Animation — Materialize:                   ║');
    console.log('║   ✅ Background: subtle cyan grid lines             ║');
    console.log('║   ✅ X Logo: scale-in dari 0.6x (55ms ease)        ║');
    console.log('║   ✅ Scan line: cyan sweep top→bottom               ║');
    console.log('║   ✅ Glow pulse: 1x setelah scan (tidak loop)       ║');
    console.log('║   ✅ Typewriter: ZERØ MERIDIAN 70ms/char            ║');
    console.log('║   ✅ Cursor blink saat mengetik                     ║');
    console.log('║   ✅ Tagline fade-in setelah typewriter             ║');
    console.log('║   ✅ Corner decorations fade-in                     ║');
    console.log('║   ✅ Progress bar: cyan glow tipis                  ║');
    console.log('║   ✅ Auto-enter: 2.8s | click to skip              ║');
    console.log('║   ✅ Skip portal jika sudah pernah visit            ║');
    console.log('║   ✅ useReducedMotion: semua animasi skip jika      ║');
    console.log('║      user prefer-reduced-motion                     ║');
    console.log('║                                                      ║');
    console.log('║   🕐 Tunggu 1-2 menit CF Pages deploy...           ║');
    console.log('║   🌐 https://new-zeromeridian.pages.dev            ║');
    console.log('║   💡 Clear localStorage untuk lihat portal lagi:   ║');
    console.log('║      DevTools → Application → localStorage →       ║');
    console.log('║      hapus key "zm_visited"                         ║');
    console.log('╚══════════════════════════════════════════════════════╝');
  } else {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   ⚠ GAGAL — cek error di atas                     ║');
    console.log('╚══════════════════════════════════════════════════════╝');
  }
  console.log('');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
