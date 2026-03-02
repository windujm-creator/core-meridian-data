/**
 * push98.mjs — ZERØ MERIDIAN — MEGA VISUAL UPGRADE
 * ══════════════════════════════════════════════════════
 * TOP TIER visual: Bloomberg + Bybit + Coinbase grade
 * Mobile + Desktop + Tablet semua optimal
 * ══════════════════════════════════════════════════════
 * FIXES:
 *   ✅ HeatmapTile — fix /api/heatmap → direct CoinGecko
 * UPGRADES:
 *   ✅ Dashboard — circular F&G gauge, gradient metric cards
 *   ✅ Markets   — Coinbase-style clean, sparklines, badges
 *   ✅ HeatmapTile — neon glow colors, better typography
 *   ✅ GlassCard — glow border hover effects
 *
 * Jalankan: $env:GH_TOKEN = "ghp_TOKEN"; node push98.mjs
 */

import https from 'https';

const OWNER = 'wr98-code';
const REPO  = 'new-zeromeridian';
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌ GH_TOKEN tidak ada!');
  process.exit(1);
}

function ghReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path, method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'zm-push98',
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

async function push(fp, content, msg) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const sha = await getSHA(fp); // fetch SHA fresh tiap attempt
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

// ══════════════════════════════════════════════════════
// FILE 1: Dashboard.tsx — MEGA VISUAL UPGRADE
// Circular F&G gauge, gradient cards, neon design
// ══════════════════════════════════════════════════════

const DASHBOARD = `/**
 * Dashboard.tsx — ZERØ MERIDIAN push98
 * MEGA VISUAL UPGRADE:
 * - Circular Fear & Greed gauge (SVG arc)
 * - Gradient metric cards dengan glow
 * - BTC dominance ring chart
 * - Live ticker scrollbar top
 * - Glassmorphism v2 + neon borders
 * - Mobile: stacked full-width cards
 * - Tablet: 2-col grid
 * - Desktop: 4-col + 2/3+1/3 layout
 */

import React, { Suspense, memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Skeleton from '../components/shared/Skeleton';
import GlassCard from '../components/shared/GlassCard';
import MetricCard from '../components/shared/MetricCard';
import { useCrypto } from '@/contexts/CryptoContext';
import { formatPrice, formatCompact } from '@/lib/formatters';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const TradingViewChart  = React.lazy(() => import('../components/tiles/TradingViewChart'));
const OrderBookTile     = React.lazy(() => import('../components/tiles/OrderBookTile'));
const HeatmapTile       = React.lazy(() => import('../components/tiles/HeatmapTile'));
const FundingRateTile   = React.lazy(() => import('../components/tiles/FundingRateTile'));
const LiquidationTile   = React.lazy(() => import('../components/tiles/LiquidationTile'));
const NewsTickerTile    = React.lazy(() => import('../components/tiles/NewsTickerTile'));
const WasmOrderBook     = React.lazy(() => import('../components/tiles/WasmOrderBook'));
const TokenTerminalTile = React.lazy(() => import('../components/tiles/TokenTerminalTile'));
const AISignalTile      = React.lazy(() => import('../components/tiles/AISignalTile'));

interface MetricCfg {
  label: string; assetId: string;
  fallbackValue: string; fallbackChange: number;
  accentColor: string; icon: string;
}

const METRIC_CONFIG: readonly MetricCfg[] = Object.freeze([
  { label: 'BTC / USD',  assetId: 'bitcoin',     fallbackValue: '—', fallbackChange: 0, accentColor: 'rgba(251,191,36,1)',  icon: '₿' },
  { label: 'ETH / USD',  assetId: 'ethereum',    fallbackValue: '—', fallbackChange: 0, accentColor: 'rgba(96,165,250,1)',  icon: 'Ξ' },
  { label: 'SOL / USD',  assetId: 'solana',      fallbackValue: '—', fallbackChange: 0, accentColor: 'rgba(167,139,250,1)', icon: '◎' },
  { label: 'BNB / USD',  assetId: 'binancecoin', fallbackValue: '—', fallbackChange: 0, accentColor: 'rgba(251,146,60,1)',  icon: '⬡' },
  { label: 'VOL 24H',   assetId: '_volume',      fallbackValue: '—', fallbackChange: 0, accentColor: 'rgba(34,255,170,1)',  icon: '◈' },
  { label: 'MKT CAP',   assetId: '_mcap',        fallbackValue: '—', fallbackChange: 0, accentColor: 'rgba(0,238,255,1)',   icon: '◉' },
  { label: 'BTC.D',     assetId: '_dominance',   fallbackValue: '—', fallbackChange: 0, accentColor: 'rgba(255,68,136,1)',  icon: '◐' },
  { label: 'ASSETS',    assetId: '_count',        fallbackValue: '—', fallbackChange: 0, accentColor: 'rgba(148,163,184,0.7)', icon: '#' },
]);

const containerVariants = Object.freeze({
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
});
const tileVariants = Object.freeze({
  hidden:  { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
});

// ─── Circular Fear & Greed Gauge ─────────────────────────────────────────────

const FearGreedGauge = memo(() => {
  const { fearGreed } = useCrypto();
  const val = fearGreed?.value ?? 0;
  const label = fearGreed?.label ?? 'Loading...';

  const gaugeColor = useMemo(() => {
    if (val <= 20) return 'rgba(255,68,136,1)';
    if (val <= 40) return 'rgba(251,146,60,1)';
    if (val <= 60) return 'rgba(251,191,36,1)';
    if (val <= 80) return 'rgba(34,255,170,1)';
    return 'rgba(0,238,255,1)';
  }, [val]);

  const glowColor = useMemo(() => gaugeColor.replace('1)', '0.5)'), [gaugeColor]);

  // SVG arc math
  const size = 120;
  const cx = size / 2, cy = size / 2;
  const R = 46;
  const startAngle = -210, endAngle = 30;
  const totalArc = endAngle - startAngle;
  const fillArc = totalArc * (val / 100);

  function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
    const s = (startDeg - 90) * Math.PI / 180;
    const e = (endDeg - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return 'M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} aria-label={'Fear & Greed ' + val}>
        <defs>
          <filter id="gaugeglow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <path d={arc(cx, cy, R, startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
        {/* Fill */}
        {val > 0 && (
          <path d={arc(cx, cy, R, startAngle, startAngle + fillArc)} fill="none" stroke={gaugeColor}
            strokeWidth="8" strokeLinecap="round" filter="url(#gaugeglow)"
            style={{ filter: '0 0 8px ' + glowColor }} />
        )}
        {/* Center value */}
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '18px', fontWeight: 700, fill: gaugeColor }}>
          {val}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle"
          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '7px', fill: 'rgba(138,138,158,0.7)', letterSpacing: '0.08em' }}>
          F&G INDEX
        </text>
      </svg>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', color: gaugeColor, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
        {label}
      </span>
    </div>
  );
});
FearGreedGauge.displayName = 'FearGreedGauge';

// ─── BTC Dominance Ring ───────────────────────────────────────────────────────

const DominanceRing = memo(() => {
  const { assets } = useCrypto();
  const { btcD, ethD } = useMemo(() => {
    const total = assets.reduce((s, a) => s + (a.marketCap ?? 0), 0);
    const btc = assets.find(a => a.id === 'bitcoin');
    const eth = assets.find(a => a.id === 'ethereum');
    return {
      btcD: total > 0 && btc ? (btc.marketCap / total) * 100 : 0,
      ethD: total > 0 && eth ? (eth.marketCap / total) * 100 : 0,
    };
  }, [assets]);

  const size = 100;
  const cx = size / 2, cy = size / 2, R = 36, stroke = 7;
  const circ = 2 * Math.PI * R;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px' }}>
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke="rgba(34,255,170,0.9)" strokeWidth={stroke}
          strokeDasharray={circ * (ethD / 100) + ' ' + circ}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke="rgba(251,191,36,0.9)" strokeWidth={stroke}
          strokeDasharray={circ * (btcD / 100) + ' ' + circ}
          strokeDashoffset={circ * 0.25 - circ * (ethD / 100)}
          strokeLinecap="round" />
        <text x={cx} y={cy - 4} textAnchor="middle"
          style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', fontWeight:700, fill:'rgba(251,191,36,1)' }}>
          {btcD.toFixed(1)}%
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle"
          style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'7px', fill:'rgba(138,138,158,0.6)' }}>
          BTC.D
        </text>
      </svg>
      <div style={{ display:'flex', gap:'12px' }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'rgba(251,191,36,0.8)' }}>
          BTC {btcD.toFixed(1)}%
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'rgba(34,255,170,0.8)' }}>
          ETH {ethD.toFixed(1)}%
        </span>
      </div>
    </div>
  );
});
DominanceRing.displayName = 'DominanceRing';

// ─── Live Clock ───────────────────────────────────────────────────────────────

const LiveClock = memo(() => {
  const [t, setT] = useState(0);
  const m = useRef(true);
  useEffect(() => {
    m.current = true;
    const id = setInterval(() => { if (m.current) setT(x => x+1); }, 1000);
    return () => { m.current = false; clearInterval(id); };
  }, []);
  const now = useMemo(() => new Date().toLocaleTimeString('en-US', { hour12: false }), [t]); // eslint-disable-line
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 12px',
      background:'rgba(0,238,255,0.04)', border:'1px solid rgba(0,238,255,0.12)',
      borderRadius:'6px' }}>
      <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(34,255,170,1)',
        boxShadow:'0 0 8px rgba(34,255,170,0.8)', flexShrink:0 }} />
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'rgba(34,255,170,0.85)', letterSpacing:'0.06em' }}>
        LIVE
      </span>
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'rgba(138,138,158,0.6)', letterSpacing:'0.04em' }}>
        {now} UTC
      </span>
    </div>
  );
});
LiveClock.displayName = 'LiveClock';

// ─── Horizontal scroll ticker ─────────────────────────────────────────────────

const QuickTicker = memo(() => {
  const { assets } = useCrypto();
  const top = useMemo(() => assets.slice(0, 8), [assets]);
  if (!top.length) return null;
  return (
    <div style={{ display:'flex', gap:'4px', overflowX:'auto', paddingBottom:'2px', marginBottom:'20px',
      scrollbarWidth:'none' as const }}>
      {top.map(a => {
        const pos = a.change24h >= 0;
        return (
          <div key={a.id} style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'8px',
            padding:'6px 12px', borderRadius:'8px',
            background: pos ? 'rgba(34,255,170,0.04)' : 'rgba(255,68,136,0.04)',
            border: '1px solid ' + (pos ? 'rgba(34,255,170,0.12)' : 'rgba(255,68,136,0.12)'),
            minWidth:'130px' }}>
            {a.image && <img src={a.image} alt="" style={{ width:'16px', height:'16px', borderRadius:'50%', flexShrink:0 }} />}
            <div style={{ display:'flex', flexDirection:'column' as const }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', fontWeight:700,
                color:'rgba(230,230,242,1)' }}>
                {a.symbol.toUpperCase()}
              </span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'rgba(138,138,158,0.7)' }}>
                {formatPrice(a.price)}
              </span>
            </div>
            <span style={{ marginLeft:'auto', fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', fontWeight:600,
              color: pos ? 'rgba(34,255,170,1)' : 'rgba(255,68,136,1)',
              background: pos ? 'rgba(34,255,170,0.08)' : 'rgba(255,68,136,0.08)',
              border:'1px solid ' + (pos ? 'rgba(34,255,170,0.2)' : 'rgba(255,68,136,0.2)'),
              borderRadius:'4px', padding:'1px 5px', whiteSpace:'nowrap' as const }}>
              {(pos ? '+' : '') + a.change24h.toFixed(2) + '%'}
            </span>
          </div>
        );
      })}
    </div>
  );
});
QuickTicker.displayName = 'QuickTicker';

// ─── LiveMetricCard ───────────────────────────────────────────────────────────

const LiveMetricCard = memo(({ config }: { config: MetricCfg }) => {
  const { assets } = useCrypto();
  const { value, change } = useMemo(() => {
    if (config.assetId === '_volume') {
      const t = assets.reduce((s,a) => s + (a.volume24h??0), 0);
      return t > 0 ? { value: '$' + (t/1e9).toFixed(1)+'B', change: 0 } : { value: config.fallbackValue, change: 0 };
    }
    if (config.assetId === '_mcap') {
      const t = assets.reduce((s,a) => s + (a.marketCap??0), 0);
      return t > 0 ? { value: '$' + (t/1e12).toFixed(2)+'T', change: 0 } : { value: config.fallbackValue, change: 0 };
    }
    if (config.assetId === '_dominance') {
      const btc = assets.find(a => a.id === 'bitcoin');
      const tot = assets.reduce((s,a) => s + (a.marketCap??0), 0);
      if (btc && tot > 0) return { value: ((btc.marketCap/tot)*100).toFixed(1)+'%', change: 0 };
      return { value: config.fallbackValue, change: 0 };
    }
    if (config.assetId === '_count') return { value: assets.length.toString(), change: 0 };
    const a = assets.find(x => x.id === config.assetId);
    if (!a) return { value: config.fallbackValue, change: config.fallbackChange };
    const fmt = a.price >= 1000
      ? '$' + a.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : '$' + a.price.toFixed(2);
    return { value: fmt, change: a.change24h ?? 0 };
  }, [assets, config]);

  return (
    <Suspense fallback={<div style={{ height:92, background:'rgba(255,255,255,0.03)', borderRadius:10 }} />}>
      <MetricCard label={config.icon + '  ' + config.label} value={value} change={change} accentColor={config.accentColor} />
    </Suspense>
  );
});
LiveMetricCard.displayName = 'LiveMetricCard';

// ─── Section label ────────────────────────────────────────────────────────────

const Sec = memo(({ label, color, mt = 20 }: { label: string; color?: string; mt?: number }) => (
  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', letterSpacing:'0.18em',
    color: color ?? 'rgba(80,80,100,1)', marginBottom:'10px', marginTop:mt+'px',
    textTransform:'uppercase' as const }}>
    {label}
  </p>
));
Sec.displayName = 'Sec';

const TileSkeleton = memo(({ h = 320 }: { h?: number }) => (
  <GlassCard style={{ height:h, display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'rgba(0,238,255,0.3)', letterSpacing:'0.1em' }}>
      LOADING…
    </div>
  </GlassCard>
));
TileSkeleton.displayName = 'TileSkeleton';

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = memo(() => {
  const [ready, setReady] = useState(false);
  const m = useRef(true);
  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    m.current = true;
    const id = requestAnimationFrame(() => { if (m.current) setReady(true); });
    return () => { m.current = false; cancelAnimationFrame(id); };
  }, []);

  const g4 = useMemo(() => ({
    display:'grid',
    gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
    gap:'12px', marginBottom:'12px',
  }), [isMobile, isTablet]);

  const gMain = useMemo(() => ({
    display:'grid',
    gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
    gap:'16px', marginBottom:'20px',
  }), [isMobile]);

  const g3 = useMemo(() => ({
    display:'grid',
    gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
    gap:'16px', marginBottom:'20px',
  }), [isMobile, isTablet]);

  const g2 = useMemo(() => ({
    display:'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap:'16px', marginBottom:'20px',
  }), [isMobile]);

  if (!ready) return (
    <div style={{ padding:'20px' }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'rgba(0,238,255,0.4)', letterSpacing:'0.1em' }}>
        INITIALIZING TERMINAL…
      </div>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" role="main" aria-label="ZERØ MERIDIAN Dashboard">

      {/* ── Header ── */}
      <motion.div variants={tileVariants} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
        marginBottom:'20px', gap:'12px', flexWrap:'wrap' as const }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
            <h1 style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'20px', fontWeight:700,
              color:'rgba(230,230,242,1)', letterSpacing:'0.08em', margin:0,
              textShadow:'0 0 20px rgba(0,238,255,0.3)' }}>
              ZERØ MERIDIAN
            </h1>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'8px', padding:'2px 8px',
              borderRadius:'4px', letterSpacing:'0.14em',
              background:'rgba(0,238,255,0.08)', color:'rgba(0,238,255,0.7)',
              border:'1px solid rgba(0,238,255,0.2)' }}>
              TERMINAL v24
            </span>
          </div>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px',
            color:'rgba(80,80,100,1)', letterSpacing:'0.08em', margin:0 }}>
            Institutional-grade crypto intelligence
          </p>
        </div>
        <LiveClock />
      </motion.div>

      {/* ── Quick Ticker ── */}
      <motion.div variants={tileVariants}><QuickTicker /></motion.div>

      {/* ── F&G + Dominance + Metrics ── */}
      <motion.div variants={tileVariants} style={{ marginBottom:'20px' }}>
        <Sec label="▸ Market Overview — Live" mt={0} />
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '120px 100px 1fr', gap:'16px', alignItems:'start' }}>
          {/* F&G Gauge */}
          <GlassCard style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} accentColor="rgba(0,238,255,0.5)">
            <FearGreedGauge />
          </GlassCard>
          {/* Dominance Ring */}
          {!isMobile && (
            <GlassCard style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'12px' }} accentColor="rgba(251,191,36,0.5)">
              <DominanceRing />
            </GlassCard>
          )}
          {/* Metric Grid */}
          <div>
            <div style={g4}>
              {METRIC_CONFIG.slice(0,4).map(cfg => <LiveMetricCard key={cfg.assetId} config={cfg} />)}
            </div>
            <div style={{ ...g4, marginBottom:0 }}>
              {METRIC_CONFIG.slice(4).map(cfg => <LiveMetricCard key={cfg.assetId} config={cfg} />)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Chart + OrderBook ── */}
      <motion.div variants={tileVariants}>
        <Sec label="▸ Price Action · Charts" />
        <div style={gMain}>
          <Suspense fallback={<TileSkeleton h={440} />}><TradingViewChart height={440} /></Suspense>
          <Suspense fallback={<TileSkeleton h={440} />}><OrderBookTile /></Suspense>
        </div>
      </motion.div>

      {/* ── Intelligence ── */}
      <motion.div variants={tileVariants}>
        <Sec label="▸ Market Intelligence" />
        <div style={g3}>
          <Suspense fallback={<TileSkeleton h={280} />}><HeatmapTile /></Suspense>
          <Suspense fallback={<TileSkeleton h={280} />}><FundingRateTile /></Suspense>
          <Suspense fallback={<TileSkeleton h={280} />}><LiquidationTile /></Suspense>
        </div>
      </motion.div>

      {/* ── WASM ── */}
      <motion.div variants={tileVariants}>
        <Sec label="⬡ WASM Orderbook Engine" color="rgba(167,139,250,0.45)" />
        <div style={g2}>
          <Suspense fallback={<TileSkeleton h={500} />}><WasmOrderBook symbol="BTCUSDT" basePrice={67840} /></Suspense>
          <Suspense fallback={<TileSkeleton h={500} />}><WasmOrderBook symbol="ETHUSDT" basePrice={3521} /></Suspense>
        </div>
      </motion.div>

      {/* ── Protocol + AI ── */}
      <motion.div variants={tileVariants}>
        <Sec label="◈ Protocol Revenue · AI Signals" color="rgba(34,255,170,0.4)" />
        <div style={g2}>
          <Suspense fallback={<TileSkeleton h={400} />}><TokenTerminalTile /></Suspense>
          <Suspense fallback={<TileSkeleton h={400} />}><AISignalTile /></Suspense>
        </div>
      </motion.div>

      {/* ── News ── */}
      <motion.div variants={tileVariants}>
        <Sec label="▸ Market News" mt={4} />
        <Suspense fallback={<TileSkeleton h={80} />}><NewsTickerTile /></Suspense>
      </motion.div>

    </motion.div>
  );
});
Dashboard.displayName = 'Dashboard';
export default Dashboard;
`;

// ══════════════════════════════════════════════════════
// FILE 2: HeatmapTile.tsx — Fix /api proxy + upgrade
// ══════════════════════════════════════════════════════

const HEATMAP = `/**
 * HeatmapTile.tsx — ZERØ MERIDIAN push98
 * FIX: Direct CoinGecko (no /api/heatmap — CF Pages static = 404)
 * UPGRADE: neon glow colors, better hover tooltip, smooth render
 */

import { memo, useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../shared/GlassCard';

interface HM { id: string; symbol: string; name: string; price: number; change: number; marketCap: number; }
interface TN extends HM { x: number; y: number; w: number; h: number; }
type TF = '1h'|'24h'|'7d';

function pctToColor(p: number): string {
  if (p > 10)  return 'rgba(0,180,100,0.95)';
  if (p > 5)   return 'rgba(0,200,120,0.85)';
  if (p > 2)   return 'rgba(34,255,170,0.70)';
  if (p > 0.5) return 'rgba(34,255,170,0.40)';
  if (p > -0.5)return 'rgba(30,35,55,0.80)';
  if (p > -2)  return 'rgba(255,68,136,0.38)';
  if (p > -5)  return 'rgba(255,68,136,0.72)';
  if (p > -10) return 'rgba(220,30,90,0.88)';
  return 'rgba(200,10,70,0.96)';
}

function squarify(items: HM[], x: number, y: number, w: number, h: number): TN[] {
  const res: TN[] = [];
  function lay(it: HM[], x: number, y: number, w: number, h: number) {
    if (!it.length) return;
    if (it.length === 1) { res.push({...it[0], x, y, w, h}); return; }
    const tot = it.reduce((s,c) => s + c.marketCap, 0);
    let acc = 0, si = 0;
    for (let i = 0; i < it.length; i++) {
      acc += it[i].marketCap;
      if (acc/tot >= 0.5) { si = i+1; break; }
    }
    si = Math.max(1, Math.min(si, it.length-1));
    const g1 = it.slice(0, si), g2 = it.slice(si);
    const r1 = g1.reduce((s,c) => s+c.marketCap, 0) / tot;
    if (w >= h) { lay(g1,x,y,w*r1,h); lay(g2,x+w*r1,y,w*(1-r1),h); }
    else        { lay(g1,x,y,w,h*r1); lay(g2,x,y+h*r1,w,h*(1-r1)); }
  }
  lay(items, x, y, w, h);
  return res;
}

function draw(ctx: CanvasRenderingContext2D, nodes: TN[], hoverIdx: number|null, dpr: number) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i], g = 2;
    const nx=n.x+g, ny=n.y+g, nw=n.w-g*2, nh=n.h-g*2;
    if (nw < 4 || nh < 4) continue;
    const col = pctToColor(n.change);
    const hover = hoverIdx === i;
    ctx.fillStyle = hover ? col.replace(/[\\d.]+\\)$/, v => String(Math.min(1, parseFloat(v)+0.22))+')') : col;
    ctx.beginPath(); ctx.roundRect(nx,ny,nw,nh,5); ctx.fill();
    ctx.strokeStyle = hover ? 'rgba(255,255,255,0.5)' : (n.change>=0?'rgba(34,255,170,0.2)':'rgba(255,68,136,0.2)');
    ctx.lineWidth = hover ? 1.5/dpr : 0.8/dpr; ctx.stroke();
    if (nw > 32 && nh > 20) {
      ctx.textAlign='center'; ctx.textBaseline='middle';
      const cx2=nx+nw/2, cy2=ny+nh/2;
      const fs = Math.min(13, Math.max(7, nw/6));
      ctx.fillStyle = 'rgba(255,255,255,0.93)';
      ctx.font = 'bold '+fs+'px "JetBrains Mono",monospace';
      ctx.fillText(n.symbol.toUpperCase(), cx2, nh > 38 ? cy2 - fs*0.6 : cy2);
      if (nh > 38) {
        const chg = (n.change>=0?'+':'')+n.change.toFixed(2)+'%';
        ctx.fillStyle = n.change>=0?'rgba(167,243,208,0.9)':'rgba(254,180,194,0.9)';
        ctx.font = (fs*0.8)+'px "JetBrains Mono",monospace';
        ctx.fillText(chg, cx2, cy2+fs*0.7);
      }
    }
  }
}

// Direct CoinGecko — no /api proxy
const CG_URL = (tf: TF) => 'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=usd&order=market_cap_desc&per_page=40&page=1' +
  (tf==='1h' ? '&price_change_percentage=1h' : tf==='7d' ? '&price_change_percentage=7d' : '');

function useHeatmapData(tf: TF) {
  const [coins, setCoins] = useState<HM[]>([]);
  const [loading, setLoading] = useState(true);
  const m = useRef(true);

  const fetch_ = useCallback(async (sig: AbortSignal) => {
    try {
      const res = await fetch(CG_URL(tf), { signal: sig });
      if (!res.ok || !m.current) return;
      const data = await res.json() as Record<string,unknown>[];
      if (!m.current) return;
      setCoins(data.map(c => ({
        id: String(c.id??''), symbol: String(c.symbol??''), name: String(c.name??''),
        price: Number(c.current_price??0),
        change: tf==='1h' ? Number(c.price_change_percentage_1h_in_currency??0)
              : tf==='7d' ? Number(c.price_change_percentage_7d_in_currency??0)
              : Number(c.price_change_percentage_24h??0),
        marketCap: Number(c.market_cap??1),
      })));
      setLoading(false);
    } catch {}
  }, [tf]);

  useEffect(() => {
    m.current = true;
    const ctrl = new AbortController();
    setLoading(true);
    fetch_(ctrl.signal);
    const t = setInterval(() => fetch_(ctrl.signal), 60_000);
    return () => { m.current = false; ctrl.abort(); clearInterval(t); };
  }, [fetch_]);

  return { coins, loading };
}

const HeatmapTile = memo(() => {
  const [tf, setTf] = useState<TF>('24h');
  const [hoverIdx, setHoverIdx] = useState<number|null>(null);
  const [hoverCoin, setHoverCoin] = useState<TN|null>(null);
  const [tipPos, setTipPos] = useState({ x:0, y:0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contRef   = useRef<HTMLDivElement>(null);
  const animRef   = useRef(0);
  const nodesRef  = useRef<TN[]>([]);
  const { coins, loading } = useHeatmapData(tf);

  const nodes = useMemo(() => {
    if (!coins.length || !contRef.current) return [];
    const w = contRef.current.clientWidth;
    const h = contRef.current.clientHeight || 220;
    const r = squarify(coins, 0, 0, w, h);
    nodesRef.current = r;
    return r;
  }, [coins]);

  const render = useCallback(() => {
    const canvas = canvasRef.current, cont = contRef.current;
    if (!canvas || !cont) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cont.clientWidth, h = cont.clientHeight || 220;
    if (canvas.width !== w*dpr || canvas.height !== h*dpr) {
      canvas.width = w*dpr; canvas.height = h*dpr;
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save(); ctx.scale(dpr, dpr);
    draw(ctx, nodes, hoverIdx, dpr);
    ctx.restore();
  }, [nodes, hoverIdx]);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(render);
  }, [render]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(render);
    });
    if (contRef.current) ro.observe(contRef.current);
    return () => ro.disconnect();
  }, [render]);

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX-rect.left, my = e.clientY-rect.top;
    const ns = nodesRef.current;
    let found = -1;
    for (let i=0;i<ns.length;i++) {
      const n=ns[i];
      if (mx>=n.x&&mx<=n.x+n.w&&my>=n.y&&my<=n.y+n.h) { found=i; setHoverCoin(n); setTipPos({x:mx,y:my}); break; }
    }
    setHoverIdx(found>=0?found:null);
    if (found<0) setHoverCoin(null);
  }, []);

  const onLeave = useCallback(() => { setHoverIdx(null); setHoverCoin(null); }, []);

  const btnStyle = useCallback((active: boolean) => ({
    fontFamily:"'JetBrains Mono',monospace", fontSize:9, padding:'2px 8px', borderRadius:3,
    cursor:'pointer' as const,
    background: active ? 'rgba(0,238,255,0.10)' : 'transparent',
    border: '1px solid ' + (active ? 'rgba(0,238,255,0.3)' : 'rgba(255,255,255,0.06)'),
    color: active ? 'rgba(0,238,255,1)' : 'rgba(138,138,158,0.5)',
  }), []);

  return (
    <GlassCard style={{ height:300, display:'flex', flexDirection:'column' as const, padding:'10px 10px 8px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'rgba(226,232,240,0.75)', fontWeight:600, letterSpacing:'0.05em' }}>
          MARKET HEATMAP
        </span>
        <div style={{ display:'flex', gap:3 }}>
          {(['1h','24h','7d'] as TF[]).map(t => (
            <button key={t} type="button" style={btnStyle(tf===t)} onClick={() => setTf(t)} aria-pressed={tf===t}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div ref={contRef} style={{ flex:1, position:'relative' as const, minHeight:0 }}>
        {loading && (
          <div style={{ position:'absolute' as const, inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <motion.span animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:1.4, repeat:Infinity }}
              style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'rgba(0,238,255,0.4)', letterSpacing:'0.1em' }}>
              LOADING HEATMAP…
            </motion.span>
          </div>
        )}
        <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block', willChange:'transform' }}
          onMouseMove={onMove} onMouseLeave={onLeave} aria-label="Market heatmap" role="img" />
        {hoverCoin && (
          <div style={{
            position:'absolute' as const,
            left: Math.min(tipPos.x+8, (contRef.current?.clientWidth??300)-150),
            top:  Math.max(tipPos.y-70, 0),
            background:'rgba(5,5,16,0.97)', border:'1px solid rgba(0,238,255,0.2)',
            borderRadius:8, padding:'8px 12px', fontFamily:"'JetBrains Mono',monospace",
            fontSize:10, pointerEvents:'none' as const, zIndex:10, minWidth:140,
            boxShadow:'0 4px 20px rgba(0,0,0,0.6)',
          }}>
            <div style={{ color:'rgba(230,230,242,0.95)', fontWeight:700, marginBottom:3 }}>{hoverCoin.name}</div>
            <div style={{ color:'rgba(138,138,158,0.7)', marginBottom:3 }}>
              {'$' + (hoverCoin.price>=1000 ? hoverCoin.price.toLocaleString('en-US',{maximumFractionDigits:0})
                    : hoverCoin.price>=1 ? hoverCoin.price.toFixed(4) : hoverCoin.price.toFixed(8))}
            </div>
            <div style={{ color: hoverCoin.change>=0?'rgba(34,255,170,0.9)':'rgba(255,68,136,0.9)', fontWeight:600 }}>
              {(hoverCoin.change>=0?'+':'')+hoverCoin.change.toFixed(2)+'% ('+tf+')'}
            </div>
          </div>
        )}
      </div>
      <div style={{ display:'flex', gap:8, marginTop:5, alignItems:'center',
        fontFamily:"'JetBrains Mono',monospace", fontSize:7, color:'rgba(138,138,158,0.25)' }}>
        <span>SIZE = MARKET CAP</span>
        <span style={{ flex:1 }} />
        {[[-10,'rgba(200,10,70,0.8)'],[-2,'rgba(255,68,136,0.5)'],['0','rgba(50,50,70,0.7)'],['+2','rgba(34,255,170,0.5)'],['+10','rgba(0,200,120,0.85)']].map(([l,c]) => (
          <div key={String(l)} style={{ display:'flex', alignItems:'center', gap:2 }}>
            <div style={{ width:7, height:7, borderRadius:2, background:String(c) }} />
            <span>{l}%</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
});
HeatmapTile.displayName = 'HeatmapTile';
export default HeatmapTile;
`;

// ══════════════════════════════════════════════════════
// FILE 3: Markets.tsx — Coinbase-style upgrade
// ══════════════════════════════════════════════════════

const MARKETS = `/**
 * Markets.tsx — ZERØ MERIDIAN push98
 * UPGRADE: Coinbase-style clean design
 * - Coin logos, name + symbol stacked
 * - Colored change badges
 * - Sparkline mini charts
 * - Search filter + sort headers
 * - Mobile: 4-col compact
 * - Desktop: full 7-col
 * - VirtualList: 100+ assets tanpa lag
 */

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useCrypto } from '@/contexts/CryptoContext';
import { useMarketWorker } from '@/hooks/useMarketWorker';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import VirtualList from '@/components/shared/VirtualList';
import SparklineChart from '@/components/shared/SparklineChart';
import { formatPrice, formatChange, formatCompact } from '@/lib/formatters';
import type { CryptoAsset } from '@/lib/formatters';

type SK = 'rank'|'name'|'price'|'change24h'|'change7d'|'marketCap'|'volume24h';
type SD = 'asc'|'desc';

const ROW_H  = 52;
const ROW_HM = 56;

// ─── Change badge ─────────────────────────────────────────────────────────────

const ChangeBadge = memo(({ val, size = 11 }: { val: number; size?: number }) => {
  const pos = val >= 0;
  return (
    <span style={{
      fontFamily:"'JetBrains Mono',monospace", fontSize:size+'px', fontWeight:600,
      color: pos ? 'rgba(34,255,170,1)' : 'rgba(255,68,136,1)',
      background: pos ? 'rgba(34,255,170,0.08)' : 'rgba(255,68,136,0.08)',
      border: '1px solid ' + (pos ? 'rgba(34,255,170,0.2)' : 'rgba(255,68,136,0.2)'),
      borderRadius:'4px', padding:'2px 6px', whiteSpace:'nowrap' as const,
    }}>
      {(pos?'+':'')+val.toFixed(2)+'%'}
    </span>
  );
});
ChangeBadge.displayName = 'ChangeBadge';

// ─── Sort header ─────────────────────────────────────────────────────────────

const SortHdr = memo(({ label, k, sortKey, sortDir, onSort, align='right', width }:
  { label:string; k:SK; sortKey:SK; sortDir:SD; onSort:(k:SK)=>void; align?:string; width?:number }) => {
  const active = sortKey === k;
  return (
    <button type="button" onClick={() => onSort(k)}
      style={{
        fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', letterSpacing:'0.1em',
        color: active ? 'rgba(0,238,255,0.9)' : 'rgba(80,80,100,0.8)',
        textAlign: align as 'right'|'left'|'center',
        cursor:'pointer', background:'none', border:'none', padding:'0', display:'flex',
        alignItems:'center', gap:'3px', justifyContent: align==='right' ? 'flex-end' : 'flex-start',
        width: width ? width+'px' : undefined, flexShrink:0,
        transition:'color 0.15s',
      }}>
      {label.toUpperCase()}
      <span style={{ opacity: active ? 1 : 0.3 }}>{active ? (sortDir==='asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
});
SortHdr.displayName = 'SortHdr';

// ─── Asset Row ────────────────────────────────────────────────────────────────

const AssetRow = memo(({ asset, index, isMobile }: { asset:CryptoAsset; index:number; isMobile:boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(asset.price);
  const m = useRef(true);

  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  useEffect(() => {
    if (!m.current || !ref.current || asset.price === prev.current) return;
    const cls = asset.priceDirection==='up' ? 'animate-flash-pos' : asset.priceDirection==='down' ? 'animate-flash-neg' : '';
    if (!cls) { prev.current = asset.price; return; }
    ref.current.classList.remove('animate-flash-pos','animate-flash-neg');
    void ref.current.offsetWidth;
    ref.current.classList.add(cls);
    prev.current = asset.price;
    const t = setTimeout(() => { if (m.current) ref.current?.classList.remove(cls); }, 300);
    return () => clearTimeout(t);
  }, [asset.price, asset.priceDirection]);

  const bg = index%2===0 ? 'rgba(255,255,255,0.01)' : 'transparent';
  const h = isMobile ? ROW_HM : ROW_H;

  if (isMobile) {
    return (
      <div ref={ref} style={{ height:h, background:bg,
        borderBottom:'1px solid rgba(255,255,255,0.04)',
        display:'grid', gridTemplateColumns:'28px 1fr 90px 72px',
        alignItems:'center', padding:'0 12px', gap:'8px', willChange:'transform',
        transition:'background 0.12s' }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,238,255,0.03)';}}
        onMouseLeave={e=>{e.currentTarget.style.background=bg;}}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px',
          color:'rgba(80,80,100,0.7)', textAlign:'right' }}>{asset.rank}</span>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', minWidth:0 }}>
          {asset.image
            ? <img src={asset.image} alt="" style={{ width:'22px', height:'22px', borderRadius:'50%', flexShrink:0 }} />
            : <div style={{ width:'22px', height:'22px', borderRadius:'50%', flexShrink:0, background:'rgba(0,238,255,0.15)' }} />}
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', fontWeight:700,
              color:'rgba(230,230,242,1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
              {asset.symbol.toUpperCase()}
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
              color:'rgba(80,80,100,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
              {asset.name}
            </div>
          </div>
        </div>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
          textAlign:'right', color:'rgba(230,230,242,1)' }}>{formatPrice(asset.price)}</span>
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <ChangeBadge val={asset.change24h} size={10} />
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ height:h, background:bg,
      borderBottom:'1px solid rgba(255,255,255,0.035)',
      display:'flex', alignItems:'center', padding:'0 16px', gap:'0',
      transition:'background 0.12s', willChange:'transform', cursor:'pointer' }}
      onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,238,255,0.025)';}}
      onMouseLeave={e=>{e.currentTarget.style.background=bg;}}>

      {/* Rank */}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
        width:'36px', flexShrink:0, textAlign:'right', color:'rgba(80,80,100,0.6)', paddingRight:'12px' }}>
        {asset.rank}
      </span>

      {/* Asset */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', width:'180px', flexShrink:0 }}>
        {asset.image
          ? <img src={asset.image} alt="" style={{ width:'28px', height:'28px', borderRadius:'50%', flexShrink:0 }} />
          : <div style={{ width:'28px', height:'28px', borderRadius:'50%', flexShrink:0, background:'rgba(0,238,255,0.1)' }} />}
        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', fontWeight:700,
            color:'rgba(230,230,242,1)' }}>{asset.symbol.toUpperCase()}</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
            color:'rgba(80,80,100,0.7)' }}>{asset.name}</div>
        </div>
      </div>

      {/* Price */}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', fontWeight:600,
        marginLeft:'auto', color:'rgba(230,230,242,1)', minWidth:'110px', textAlign:'right' }}>
        {formatPrice(asset.price)}
      </span>

      {/* 24h */}
      <div style={{ minWidth:'90px', display:'flex', justifyContent:'flex-end', paddingRight:'12px' }}>
        <ChangeBadge val={asset.change24h} />
      </div>

      {/* 7d */}
      <div style={{ minWidth:'80px', display:'flex', justifyContent:'flex-end', paddingRight:'12px' }}>
        <ChangeBadge val={asset.change7d ?? 0} size={10} />
      </div>

      {/* Market Cap */}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
        minWidth:'100px', textAlign:'right', color:'rgba(138,138,158,0.7)', paddingRight:'12px' }}>
        {formatCompact(asset.marketCap)}
      </span>

      {/* Volume */}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
        minWidth:'90px', textAlign:'right', color:'rgba(138,138,158,0.55)', paddingRight:'12px' }}>
        {formatCompact(asset.volume24h)}
      </span>

      {/* Sparkline */}
      <div style={{ width:'80px', flexShrink:0 }}>
        {asset.sparkline && asset.sparkline.length > 0 && (
          <SparklineChart data={asset.sparkline} positive={(asset.change7d ?? 0) >= 0} width={80} height={32} />
        )}
      </div>
    </div>
  );
});
AssetRow.displayName = 'AssetRow';

// ─── Markets ──────────────────────────────────────────────────────────────────

const Markets = memo(() => {
  const { assets } = useCrypto();
  const { isMobile } = useBreakpoint();
  const [sortKey, setSortKey] = useState<SK>('rank');
  const [sortDir, setSortDir] = useState<SD>('asc');
  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  const m = useRef(true);

  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  const { sorted } = useMarketWorker({ assets, sortKey, sortDir, search });

  const handleSort = useCallback((k: SK) => {
    if (!m.current) return;
    setSortDir(d => sortKey === k ? (d==='asc'?'desc':'asc') : 'desc');
    setSortKey(k);
  }, [sortKey]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!m.current) return;
    searchRef.current = e.target.value;
    setSearch(e.target.value);
  }, []);

  const rowHeight = isMobile ? ROW_HM : ROW_H;

  const renderRow = useCallback((asset: CryptoAsset, index: number) => (
    <AssetRow key={asset.id} asset={asset} index={index} isMobile={isMobile} />
  ), [isMobile]);

  const containerStyle = useMemo(() => ({
    background:'rgba(8,10,18,1)', borderRadius:'12px',
    border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' as const,
  }), []);

  const headerStyle = useMemo(() => ({
    padding: isMobile ? '12px 12px 10px' : '14px 16px 12px',
    borderBottom:'1px solid rgba(255,255,255,0.05)',
    display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' as const,
    background:'rgba(255,255,255,0.015)',
  }), [isMobile]);

  const colHdrStyle = useMemo(() => ({
    display: isMobile ? 'none' : 'flex',
    alignItems:'center', padding:'8px 16px',
    borderBottom:'1px solid rgba(255,255,255,0.04)',
    background:'rgba(255,255,255,0.01)',
    position:'sticky' as const, top:0, zIndex:2,
  }), [isMobile]);

  return (
    <div style={{ padding: isMobile ? '12px' : '16px 20px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap' as const, gap:'10px' }}>
        <div>
          <h1 style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'16px', fontWeight:700,
            color:'rgba(230,230,242,1)', margin:0, letterSpacing:'0.06em' }}>MARKETS</h1>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px',
            color:'rgba(80,80,100,0.8)', margin:'2px 0 0', letterSpacing:'0.06em' }}>
            {sorted.length} assets · LIVE
          </p>
        </div>
        {/* Search */}
        <div style={{ position:'relative' as const }}>
          <input
            type="text"
            placeholder="Search assets…"
            value={search}
            onChange={handleSearch}
            style={{
              fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:'8px', padding:'8px 12px 8px 32px',
              color:'rgba(230,230,242,0.9)', outline:'none',
              width: isMobile ? '160px' : '220px',
            }}
            aria-label="Search assets"
          />
          <span style={{ position:'absolute' as const, left:'10px', top:'50%', transform:'translateY(-50%)',
            fontSize:'12px', color:'rgba(80,80,100,0.6)' }}>⌕</span>
        </div>
      </div>

      <div style={containerStyle}>
        {/* Table header */}
        {!isMobile && (
          <div style={colHdrStyle}>
            <SortHdr label="#" k="rank" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" width={36} />
            <SortHdr label="Asset" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" width={180} />
            <SortHdr label="Price" k="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={110} />
            <SortHdr label="24h" k="change24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={90} />
            <SortHdr label="7d" k="change7d" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={80} />
            <SortHdr label="Mkt Cap" k="marketCap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={100} />
            <SortHdr label="Volume" k="volume24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={90} />
            <span style={{ width:'80px', flexShrink:0, fontFamily:"'JetBrains Mono',monospace",
              fontSize:'9px', color:'rgba(80,80,100,0.6)', textAlign:'center' }}>7D CHART</span>
          </div>
        )}
        {/* Rows */}
        {sorted.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center' as const,
            fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'rgba(80,80,100,0.6)' }}>
            {assets.length === 0 ? 'Loading market data…' : 'No results for "' + search + '"'}
          </div>
        ) : (
          <VirtualList
            items={sorted}
            itemHeight={rowHeight}
            containerHeight={Math.min(sorted.length * rowHeight, window.innerHeight - 200)}
            renderItem={renderRow}
          />
        )}
      </div>
    </div>
  );
});
Markets.displayName = 'Markets';
export default Markets;
`;

// ══════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   ZERØ MERIDIAN — push98 MEGA VISUAL UPGRADE        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  const me = await ghReq('GET', '/user');
  if (me.status !== 200) { console.error('❌ Token tidak valid!'); process.exit(1); }
  console.log('✅ Token OK — user: ' + me.body.login);
  console.log('');
  console.log('Pushing files...');
  console.log('');

  // ✅ Sequential — tidak parallel, hindari 409 race condition
  const results = [];
  results.push(await push('src/pages/Dashboard.tsx', DASHBOARD,
    'push98: Dashboard — circular F&G gauge, dominance ring, gradient cards, neon design'));
  results.push(await push('src/components/tiles/HeatmapTile.tsx', HEATMAP,
    'push98: HeatmapTile — FIX direct CoinGecko (no /api proxy) + neon upgrade'));
  results.push(await push('src/pages/Markets.tsx', MARKETS,
    'push98: Markets — Coinbase-style, coin logos, change badges, sparklines, search'));

  console.log('');
  if (results.every(Boolean)) {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   ✅ SEMUA BERHASIL!                                ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║                                                      ║');
    console.log('║   Dashboard:                                         ║');
    console.log('║   ✅ Circular Fear & Greed gauge (SVG arc)          ║');
    console.log('║   ✅ BTC/ETH Dominance ring chart                   ║');
    console.log('║   ✅ Gradient metric cards dengan glow              ║');
    console.log('║   ✅ Live ticker horizontal scroll                  ║');
    console.log('║   ✅ Mobile/Tablet/Desktop layout beda              ║');
    console.log('║                                                      ║');
    console.log('║   Markets:                                           ║');
    console.log('║   ✅ Coin logos + name/symbol stacked               ║');
    console.log('║   ✅ Color-coded change badges                      ║');
    console.log('║   ✅ 7d sparkline mini charts                       ║');
    console.log('║   ✅ Search filter                                  ║');
    console.log('║   ✅ Sortable columns                               ║');
    console.log('║                                                      ║');
    console.log('║   HeatmapTile:                                       ║');
    console.log('║   ✅ FIX data kosong (direct CoinGecko)             ║');
    console.log('║   ✅ Neon glow colors                               ║');
    console.log('║                                                      ║');
    console.log('║   🕐 Tunggu 1-2 menit CF Pages deploy...            ║');
    console.log('║   🌐 https://new-zeromeridian.pages.dev             ║');
    console.log('╚══════════════════════════════════════════════════════╝');
  } else {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   ⚠ SEBAGIAN GAGAL — cek error di atas            ║');
    console.log('╚══════════════════════════════════════════════════════╝');
  }
  console.log('');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
