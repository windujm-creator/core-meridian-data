/**
 * Defi.tsx — ZERØ MERIDIAN push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * FULL REAL DATA — DefiLlama API (100% FREE, no API key)
 * Endpoints: protocols, chains TVL, yield pools
 *
 * ✅ Zero className  ✅ rgba() only  ✅ JetBrains Mono
 * ✅ React.memo + displayName  ✅ useCallback + useMemo  ✅ mountedRef
 * ✅ Zero dummy data — all live from DefiLlama
 */

import {
  memo, useState, useCallback, useMemo, useRef, useEffect,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDefiLlama, type DLProtocol, type DLYield } from '@/hooks/useDefiLlama';
import { formatCompact } from '@/lib/formatters';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const FONT = "'JetBrains Mono', monospace";

const TABS = Object.freeze(['Protocols', 'Chains', 'Yield Pools'] as const);
type Tab = typeof TABS[number];

// ─── Category colors ──────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = Object.freeze({
  'Dexes':          'rgba(15,40,180,1)',
  'Lending':        'rgba(15,40,180,1)',
  'Liquid Staking': 'rgba(0,155,95,1)',
  'Bridge':         'rgba(195,125,0,1)',
  'CDP':            'rgba(208,35,75,1)',
  'Yield':          'rgba(110,231,183,1)',
  'Derivatives':    'rgba(253,164,175,1)',
  'RWA':            'rgba(196,181,253,1)',
  'Other':          'rgba(148,163,184,1)',
});
function catColor(cat: string): string {
  return CAT_COLORS[cat] ?? 'rgba(110,120,160,0.8)';
}

const CHAIN_PAL: readonly string[] = Object.freeze([
  'rgba(15,40,180,1)', 'rgba(0,155,95,1)', 'rgba(15,40,180,1)',
  'rgba(195,125,0,1)', 'rgba(208,35,75,1)', 'rgba(45,212,191,1)',
  'rgba(249,115,22,1)', 'rgba(99,179,237,1)',  'rgba(196,181,253,1)',
  'rgba(110,231,183,1)','rgba(253,164,175,1)', 'rgba(147,197,253,1)',
  'rgba(134,239,172,1)','rgba(253,224,71,1)',  'rgba(216,180,254,1)',
]);

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
const Shimmer = memo(({ w = '100%', h = 14 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, borderRadius: 4, background: 'rgba(15,40,100,0.06)', overflow: 'hidden', position: 'relative' }}>
    <motion.div
      animate={{ x: ['-100%', '200%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(15,40,180,1), transparent)' }}
    />
  </div>
));
Shimmer.displayName = 'Shimmer';

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard = memo(({ label, value, change, color }:
  { label: string; value: string; change?: number; color: string }) => {
  const changeColor = change == null ? undefined : change >= 0 ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)';
  return (
    <div style={{
      flex: 1, borderRadius: 12, padding: '14px 16px',
      background: 'rgba(255,255,255,1)',
      border: '1px solid ' + color.replace(/[\d.]+\)$/, '0.16)'),
      position: 'relative', overflow: 'hidden',
      willChange: 'transform',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, ' + color + ', transparent)', opacity: 0.5,
      }} />
      <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,1)',
        letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
        {label}
      </p>
      <p style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color,
        margin: '0 0 4px', textShadow: '0 0 16px ' + color.replace(/[\d.]+\)$/, '0.35)') }}>
        {value}
      </p>
      {change != null && (
        <p style={{ fontFamily: FONT, fontSize: 10, color: changeColor, margin: 0 }}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}% (24h)
        </p>
      )}
    </div>
  );
});
MetricCard.displayName = 'MetricCard';

// ─── Protocol Row ─────────────────────────────────────────────────────────────
const ProtocolRow = memo(({ p, rank, index }: { p: DLProtocol; rank: number; index: number }) => {
  const c1d = p.change1d >= 0 ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)';
  const c7d = p.change7d >= 0 ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)';
  const cat = catColor(p.category);
  const bg  = index % 2 === 0 ? 'rgba(15,40,100,0.02)' : 'transparent';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      gap: 0, height: 50, background: bg,
      borderBottom: '1px solid rgba(15,40,100,0.05)',
      transition: 'background 0.12s', willChange: 'transform',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,40,100,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}
    >
      {/* Rank */}
      <span style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(165,175,210,0.7)',
        width: 32, flexShrink: 0 }}>{rank}</span>
      {/* Logo + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 200, flexShrink: 0 }}>
        {p.logo
          ? <img src={p.logo} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
          : <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: cat.replace(/[\d.]+\)$/, '0.15)') }} />
        }
        <div>
          <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'rgba(8,12,40,1)' }}>
            {p.name}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)' }}>
            {p.symbol !== '—' ? p.symbol : p.chains.slice(0, 2).join(' · ')}
          </div>
        </div>
      </div>
      {/* Category */}
      <span style={{
        fontFamily: FONT, fontSize: 9, padding: '2px 7px', borderRadius: 4,
        background: cat.replace(/[\d.]+\)$/, '0.1)'),
        border: '1px solid ' + cat.replace(/[\d.]+\)$/, '0.25)'),
        color: cat, letterSpacing: '0.06em',
        minWidth: 100, textAlign: 'center', flexShrink: 0,
      }}>
        {p.category}
      </span>
      {/* TVL */}
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600,
        color: 'rgba(8,12,40,1)', minWidth: 110, textAlign: 'right', paddingRight: 12 }}>
        {formatCompact(p.tvl)}
      </span>
      {/* 1d */}
      <span style={{ fontFamily: FONT, fontSize: 11, color: c1d,
        minWidth: 72, textAlign: 'right', paddingRight: 12 }}>
        {(p.change1d >= 0 ? '+' : '') + p.change1d.toFixed(2) + '%'}
      </span>
      {/* 7d */}
      <span style={{ fontFamily: FONT, fontSize: 11, color: c7d,
        minWidth: 72, textAlign: 'right' }}>
        {(p.change7d >= 0 ? '+' : '') + p.change7d.toFixed(2) + '%'}
      </span>
    </div>
  );
});
ProtocolRow.displayName = 'ProtocolRow';

// ─── Chain Bar Chart ──────────────────────────────────────────────────────────
const ChainChart = memo(({ chains }: { chains: { name: string; tvl: number }[] }) => {
  const top = useMemo(() => chains.slice(0, 15), [chains]);
  const max = useMemo(() => Math.max(...top.map(c => c.tvl), 1), [top]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {top.map((chain, i) => {
        const color = CHAIN_PAL[i % CHAIN_PAL.length];
        const pct   = (chain.tvl / max) * 100;
        return (
          <div key={chain.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(138,138,158,0.8)',
              width: 90, flexShrink: 0, textAlign: 'right',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {chain.name}
            </span>
            <div style={{ flex: 1, height: 22, background: 'rgba(15,40,100,0.05)', borderRadius: 4, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: pct + '%' }}
                transition={{ duration: 0.8, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%', background: color.replace(/[\d.]+\)$/, '0.65)'), borderRadius: 4 }}
              />
            </div>
            <span style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(110,120,160,0.8)',
              width: 70, flexShrink: 0, textAlign: 'right' }}>
              {formatCompact(chain.tvl)}
            </span>
          </div>
        );
      })}
    </div>
  );
});
ChainChart.displayName = 'ChainChart';

// ─── Yield Row ────────────────────────────────────────────────────────────────
const YieldRow = memo(({ y, index }: { y: DLYield; index: number }) => {
  const apyColor = y.apy >= 20 ? 'rgba(15,40,180,1)' : y.apy >= 10 ? 'rgba(0,155,95,1)' : 'rgba(138,138,158,0.8)';
  const ilColor  = y.ilRisk === 'YES' ? 'rgba(208,35,75,1)' : y.ilRisk === 'NO' ? 'rgba(0,155,95,1)' : 'rgba(195,125,0,0.09)';
  const bg = index % 2 === 0 ? 'rgba(15,40,100,0.02)' : 'transparent';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px', height: 50,
      background: bg, borderBottom: '1px solid rgba(15,40,100,0.05)',
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,40,180,1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}
    >
      {/* Symbol */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700,
          color: 'rgba(8,12,40,1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {y.symbol}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)' }}>
          {y.project} · {y.chain}
        </div>
      </div>
      {/* TVL */}
      <span style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(110,120,160,0.8)',
        minWidth: 90, textAlign: 'right', paddingRight: 12 }}>
        {formatCompact(y.tvlUsd)}
      </span>
      {/* APY */}
      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700,
        color: apyColor, minWidth: 80, textAlign: 'right', paddingRight: 12,
        textShadow: '0 0 10px ' + apyColor.replace(/[\d.]+\)$/, '0.4)') }}>
        {y.apy.toFixed(2)}%
      </span>
      {/* Base APY */}
      <span style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(15,40,180,0.65)',
        minWidth: 72, textAlign: 'right', paddingRight: 12 }}>
        {y.apyBase.toFixed(2)}% base
      </span>
      {/* IL Risk */}
      <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700,
        color: ilColor, minWidth: 50, textAlign: 'right' }}>
        {y.ilRisk === 'YES' ? '⚠ IL' : y.ilRisk === 'NO' ? '✓ No IL' : '~ IL'}
      </span>
    </div>
  );
});
YieldRow.displayName = 'YieldRow';

// ─── Protocols Tab ────────────────────────────────────────────────────────────
const ProtocolsTab = memo(({ protocols, loading }: { protocols: DLProtocol[]; loading: boolean }) => {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(protocols.map(p => p.category))].slice(0, 10);
    return cats;
  }, [protocols]);

  const filtered = useMemo(() => {
    let list = protocols;
    if (catFilter !== 'All') list = list.filter(p => p.category === catFilter);
    if (search.trim()) {
      const lq = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(lq) || p.symbol.toLowerCase().includes(lq));
    }
    return list;
  }, [protocols, catFilter, search]);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <input type="text" placeholder="Search protocol…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              fontFamily: FONT, fontSize: 11,
              background: 'rgba(15,40,100,0.05)',
              border: '1px solid rgba(15,40,100,0.10)',
              borderRadius: 8, padding: '7px 12px 7px 30px',
              color: 'rgba(55,65,110,1)', outline: 'none', width: 180,
            }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', fontSize: 12, color: 'rgba(165,175,210,0.7)' }}>⌕</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {categories.map(c => {
            const active = catFilter === c;
            const col    = c === 'All' ? 'rgba(15,40,180,1)' : catColor(c);
            return (
              <button key={c} type="button" onClick={() => setCatFilter(c)} style={{
                fontFamily: FONT, fontSize: 9, letterSpacing: '0.08em',
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                background: active ? col.replace(/[\d.]+\)$/, '0.12)') : 'rgba(15,40,100,0.05)',
                border: '1px solid ' + (active ? col.replace(/[\d.]+\)$/, '0.35)') : 'rgba(255,255,255,0.07)'),
                color: active ? col : 'rgba(110,120,160,0.7)',
                transition: 'all 0.15s',
              }}>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(15,40,100,0.08)', background: 'rgba(248,249,252,1)' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '9px 16px',
          borderBottom: '1px solid rgba(15,40,100,0.06)',
          background: 'rgba(15,40,100,0.03)',
        }}>
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)',
            letterSpacing: '0.1em', width: 32, flexShrink: 0 }}>#</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)',
            letterSpacing: '0.1em', width: 200, flexShrink: 0 }}>PROTOCOL</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)',
            letterSpacing: '0.1em', minWidth: 100, textAlign: 'center' }}>CATEGORY</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)',
            letterSpacing: '0.1em', minWidth: 110, textAlign: 'right', paddingRight: 12 }}>TVL</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)',
            letterSpacing: '0.1em', minWidth: 72, textAlign: 'right', paddingRight: 12 }}>24H</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)',
            letterSpacing: '0.1em', minWidth: 72, textAlign: 'right' }}>7D</span>
        </div>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(i => <Shimmer key={i} h={22} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: 'rgba(165,175,210,0.7)' }}>
            No protocols found
          </div>
        ) : (
          filtered.map((p, i) => (
            <ProtocolRow key={p.id} p={p} rank={i + 1} index={i} />
          ))
        )}
      </div>
    </div>
  );
});
ProtocolsTab.displayName = 'ProtocolsTab';

// ─── Chains Tab ───────────────────────────────────────────────────────────────
const ChainsTab = memo(({ chains, loading }: { chains: { name: string; tvl: number }[]; loading: boolean }) => {
  const totalTvl = useMemo(() => chains.reduce((s, c) => s + c.tvl, 0), [chains]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,1)',
          border: '1px solid rgba(15,40,180,0.12)' }}>
          <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,1)',
            letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>TOTAL TVL (ALL CHAINS)</p>
          {loading
            ? <Shimmer w={120} h={24} />
            : <p style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700,
                color: 'rgba(15,40,180,1)', margin: 0 }}>{formatCompact(totalTvl)}</p>
          }
        </div>
        <div style={{ flex: 1, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,1)',
          border: '1px solid rgba(0,155,95,0.18)' }}>
          <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,1)',
            letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>CHAINS TRACKED</p>
          {loading
            ? <Shimmer w={60} h={24} />
            : <p style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700,
                color: 'rgba(0,155,95,1)', margin: 0 }}>{chains.length}</p>
          }
        </div>
      </div>
      <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(255,255,255,1)',
        border: '1px solid rgba(15,40,100,0.08)' }}>
        <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.9)',
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
          TVL BY CHAIN — DEFI LLAMA
        </p>
        {loading
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(i => <Shimmer key={i} h={22} />)}
            </div>
          : <ChainChart chains={chains} />
        }
      </div>
    </div>
  );
});
ChainsTab.displayName = 'ChainsTab';

// ─── Yield Pools Tab ──────────────────────────────────────────────────────────
const YieldTab = memo(({ yields, loading }: { yields: DLYield[]; loading: boolean }) => {
  const [minApy, setMinApy] = useState(0);
  const [chainFilter, setChainFilter] = useState('All');

  const chains = useMemo(() => {
    const c = ['All', ...new Set(yields.map(y => y.chain))].slice(0, 8);
    return c;
  }, [yields]);

  const filtered = useMemo(() => {
    let list = yields;
    if (chainFilter !== 'All') list = list.filter(y => y.chain === chainFilter);
    if (minApy > 0) list = list.filter(y => y.apy >= minApy);
    return list.slice(0, 50);
  }, [yields, chainFilter, minApy]);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {chains.map(c => {
            const active = chainFilter === c;
            return (
              <button key={c} type="button" onClick={() => setChainFilter(c)} style={{
                fontFamily: FONT, fontSize: 9, letterSpacing: '0.08em',
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                background: active ? 'rgba(15,40,180,0.08)' : 'rgba(15,40,100,0.05)',
                border: '1px solid ' + (active ? 'rgba(15,40,180,1)' : 'rgba(255,255,255,0.07)'),
                color: active ? 'rgba(15,40,180,1)' : 'rgba(110,120,160,0.7)',
                transition: 'all 0.15s',
              }}>{c}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)' }}>Min APY:</span>
          {[0, 5, 10, 20, 50].map(v => (
            <button key={v} type="button" onClick={() => setMinApy(v)} style={{
              fontFamily: FONT, fontSize: 9, padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
              background: minApy === v ? 'rgba(0,155,95,0.09)' : 'rgba(15,40,100,0.05)',
              border: '1px solid ' + (minApy === v ? 'rgba(0,155,95,1)' : 'rgba(255,255,255,0.07)'),
              color: minApy === v ? 'rgba(0,155,95,1)' : 'rgba(110,120,160,0.7)',
            }}>{v === 0 ? 'All' : v + '%+'}</button>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(15,40,100,0.08)', background: 'rgba(248,249,252,1)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', padding: '9px 16px',
          borderBottom: '1px solid rgba(15,40,100,0.06)',
          background: 'rgba(15,40,100,0.03)',
        }}>
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)',
            letterSpacing: '0.1em', flex: 1 }}>POOL</span>
          {['TVL', 'APY', 'BASE', 'IL RISK'].map(h => (
            <span key={h} style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)',
              letterSpacing: '0.1em', minWidth: h === 'TVL' ? 90 : h === 'APY' ? 80 : h === 'BASE' ? 72 : 50,
              textAlign: 'right', paddingRight: h !== 'IL RISK' ? 12 : 0 }}>
              {h}
            </span>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(i => <Shimmer key={i} h={22} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: 'rgba(165,175,210,0.7)' }}>
            No yield pools match filters
          </div>
        ) : (
          filtered.map((y, i) => <YieldRow key={y.pool + i} y={y} index={i} />)
        )}
      </div>
    </div>
  );
});
YieldTab.displayName = 'YieldTab';

// ─── Main DeFi Page ───────────────────────────────────────────────────────────
const Defi = memo(() => {
  const { isMobile } = useBreakpoint();
  const mountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<Tab>('Protocols');
  const { global: g, protocols, chains, yields, loading, error, lastUpdate, refetch } = useDefiLlama();

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const handleTab  = useCallback((t: Tab) => { if (mountedRef.current) setActiveTab(t); }, []);

  const lastUpdStr = useMemo(() => {
    if (!lastUpdate) return '';
    const diff = Date.now() - lastUpdate;
    if (diff < 60_000) return Math.floor(diff / 1000) + 's ago';
    return Math.floor(diff / 60_000) + 'm ago';
  }, [lastUpdate]);

  const g4 = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
    gap: 12, marginBottom: 20,
  }), [isMobile]);

  return (
    <div style={{ padding: isMobile ? '12px' : '16px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700,
            color: 'rgba(8,12,40,1)', margin: 0, letterSpacing: '0.06em',
            textShadow: '0 0 20px rgba(15,40,180,0.25)' }}>
            DeFi INTELLIGENCE
          </h1>
          <p style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(165,175,210,0.9)',
            margin: '2px 0 0', letterSpacing: '0.06em' }}>
            Live data · DefiLlama · {protocols.length} protocols tracked
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {lastUpdStr && (
            <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.7)' }}>
              {lastUpdStr}
            </span>
          )}
          <button type="button" onClick={refetch} style={{
            fontFamily: FONT, fontSize: 9, letterSpacing: '0.1em',
            padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
            background: 'rgba(15,40,180,0.07)', border: '1px solid rgba(15,40,180,0.20)',
            color: 'rgba(15,40,180,1)', transition: 'all 0.15s',
          }}>↺ REFRESH</button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 10,
          background: 'rgba(208,35,75,1)', border: '1px solid rgba(208,35,75,0.22)' }}>
          <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(208,35,75,1)', margin: 0 }}>
            ⚠ {error}
          </p>
        </div>
      )}

      {/* Global Metrics */}
      <div style={g4}>
        <MetricCard
          label="Total DeFi TVL"
          value={g ? formatCompact(g.totalTvl) : loading ? '…' : '—'}
          change={g?.change1d}
          color="rgba(15,40,180,1)"
        />
        <MetricCard
          label="TVL Change 7D"
          value={g ? (g.change7d >= 0 ? '+' : '') + g.change7d.toFixed(2) + '%' : loading ? '…' : '—'}
          color={!g ? 'rgba(110,120,160,0.7)' : g.change7d >= 0 ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)'}
        />
        <MetricCard
          label="Protocols"
          value={protocols.length > 0 ? protocols.length.toString() : loading ? '…' : '—'}
          color="rgba(15,40,180,1)"
        />
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20,
        background: 'rgba(15,40,100,0.03)', borderRadius: 10, padding: 4,
        border: '1px solid rgba(15,40,100,0.06)', width: 'fit-content' }}>
        {TABS.map(t => {
          const active = activeTab === t;
          return (
            <button key={t} type="button" onClick={() => handleTab(t)} style={{
              fontFamily: FONT, fontSize: 10, letterSpacing: '0.1em',
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
              background: active ? 'rgba(15,40,180,0.08)' : 'transparent',
              border: active ? '1px solid rgba(15,40,180,0.25)' : '1px solid transparent',
              color: active ? 'rgba(15,40,180,1)' : 'rgba(110,120,160,0.7)',
              transition: 'all 0.18s', textTransform: 'uppercase',
            }}>{t}</button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeTab === 'Protocols'   && <ProtocolsTab protocols={protocols} loading={loading} />}
          {activeTab === 'Chains'      && <ChainsTab chains={chains} loading={loading} />}
          {activeTab === 'Yield Pools' && <YieldTab yields={yields} loading={loading} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});
Defi.displayName = 'Defi';
export default Defi;
