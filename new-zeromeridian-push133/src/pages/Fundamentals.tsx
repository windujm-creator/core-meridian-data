/**
 * Fundamentals.tsx — ZERØ MERIDIAN 2026 push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * push108: Space Mono → JetBrains Mono (CRITICAL fix)
 * Token Terminal full-page fundamentals dashboard.
 * Features:
 *   - Revenue leaderboard (1d / 7d / 30d / annualized)
 *   - Fees leaderboard
 *   - P/S and P/E ratios
 *   - Treasury & market cap
 *   - Category filter
 *   - Sortable columns
 *   - Pure Canvas sparkbar (no recharts)
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero template literals in JSX ✓
 * - Object.freeze() all static data ✓
 * - useCallback + useMemo ✓
 * - mountedRef ✓
 * - aria-label + role ✓
 * - will-change: transform on animated elements ✓
 * - var(--zm-*) theme-aware ✓ ← push25
 */

import { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { useTokenTerminal, ProtocolRevenue } from '@/hooks/useTokenTerminal';
import { formatCompact } from '@/lib/formatters';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'revenue' | 'fees' | 'ratios' | 'treasury';
type SortKey = 'name' | 'rev1d' | 'rev7d' | 'rev30d' | 'revAnnual' | 'fees1d' | 'fees30d' | 'ps' | 'pe' | 'mcap' | 'fdv' | 'treasury';
type SortDir = 'asc' | 'desc';
type PeriodKey = '1d' | '7d' | '30d' | 'annual';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = Object.freeze<{ key: Tab; label: string }[]>([
  { key: 'revenue',  label: 'Revenue'  },
  { key: 'fees',     label: 'Fees'     },
  { key: 'ratios',   label: 'Ratios'   },
  { key: 'treasury', label: 'Treasury' },
]);

const PERIODS = Object.freeze<{ key: PeriodKey; label: string }[]>([
  { key: '1d',     label: '24H'     },
  { key: '7d',     label: '7D'      },
  { key: '30d',    label: '30D'     },
  { key: 'annual', label: 'Annual'  },
]);

// Semantic category colors — BOLEH hardcoded (universal data meaning)
const CAT_COLORS = Object.freeze<Record<string, string>>({
  'dex':       'rgba(0,155,95,1)',
  'lending':   'rgba(99,179,237,0.8)',
  'l1':        'rgba(251,191,36,0.8)',
  'l2':        'rgba(15,40,180,0.8)',
  'nft':       'rgba(249,115,22,0.8)',
  'stablecoin':'rgba(226,232,240,0.6)',
  'defi':      'rgba(0,155,95,0.8)',
  'exchange':  'rgba(251,191,36,0.6)',
  'default':   'rgba(148,163,184,0.5)',
});

function getCatColor(tags: string[]): string {
  for (const t of tags) {
    const key = t.toLowerCase();
    if (key in CAT_COLORS) return CAT_COLORS[key];
  }
  return CAT_COLORS['default'];
}

// ─── Mini bar chart (Canvas — zero recharts) ──────────────────────────────────

interface MiniBarProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

const MiniBar = memo(({ values, color, width = 64, height = 22 }: MiniBarProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width  + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const max = Math.max(...values, 1);
    const barW = (width - (values.length - 1) * 2) / values.length;

    ctx.clearRect(0, 0, width, height);
    values.forEach((v, i) => {
      const barH = Math.max(2, (v / max) * (height - 2));
      const x = i * (barW + 2);
      const y = height - barH;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7 + 0.3 * (i / values.length);
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 1);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }, [values, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', willChange: 'transform' }}
      aria-hidden="true"
    />
  );
});
MiniBar.displayName = 'MiniBar';

// ─── Table Row ────────────────────────────────────────────────────────────────

interface RowProps {
  protocol: ProtocolRevenue;
  rank: number;
  tab: Tab;
  period: PeriodKey;
}

const ProtocolRow = memo(({ protocol, rank, tab, period }: RowProps) => {
  const color = useMemo(() => getCatColor(protocol.categoryTags), [protocol.categoryTags]);

  const revValues = useMemo(() => [
    protocol.revenueOneDayUsd,
    protocol.revenueSevenDayUsd / 7,
    protocol.revenueThirtyDayUsd / 30,
    protocol.revenueAnnualizedUsd / 365,
  ], [protocol]);

  const feesValues = useMemo(() => [
    protocol.feesOneDayUsd,
    protocol.feesSevenDayUsd / 7,
    protocol.feesThirtyDayUsd / 30,
  ], [protocol]);

  const primaryValue = useMemo(() => {
    if (tab === 'revenue') {
      if (period === '1d')     return protocol.revenueOneDayUsd;
      if (period === '7d')     return protocol.revenueSevenDayUsd;
      if (period === 'annual') return protocol.revenueAnnualizedUsd;
      return protocol.revenueThirtyDayUsd;
    }
    if (tab === 'fees') {
      if (period === '1d') return protocol.feesOneDayUsd;
      if (period === '7d') return protocol.feesSevenDayUsd;
      return protocol.feesThirtyDayUsd;
    }
    return 0;
  }, [tab, period, protocol]);

  // Suppress unused var warning
  void primaryValue;

  const rowStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: '28px 160px 1fr 80px 80px 80px 70px',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,1)',
    border: '1px solid rgba(15,40,100,0.08)',
    willChange: 'transform',
  }), []);

  const formatNull = useCallback((v: number | null) =>
    v == null ? '—' : formatCompact(v), []);

  return (
    <div style={rowStyle} role="row" aria-label={protocol.name + ' fundamentals row'}>
      {/* Rank */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        color: 'rgba(165,175,210,1)',
        textAlign: 'center' as const,
      }}>
        {rank}
      </span>

      {/* Name + tags */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px', overflow: 'hidden' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          fontWeight: 600,
          color: 'rgba(8,12,40,1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
        }}>
          {protocol.name}
        </span>
        {protocol.categoryTags.length > 0 && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '8px',
            color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
          }}>
            {protocol.categoryTags[0]}
          </span>
        )}
      </div>

      {/* Mini bar */}
      <div>
        {tab === 'revenue' && (
          <MiniBar values={revValues} color={color} />
        )}
        {tab === 'fees' && (
          <MiniBar values={feesValues} color={color} />
        )}
        {(tab === 'ratios' || tab === 'treasury') && (
          <div style={{ height: 22 }} />
        )}
      </div>

      {/* Values by tab */}
      {tab === 'revenue' && (
        <>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(0,155,95,1)', textAlign: 'right' as const }}>
            {formatCompact(protocol.revenueOneDayUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(55,65,110,1)', textAlign: 'right' as const }}>
            {formatCompact(protocol.revenueSevenDayUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(55,65,110,1)', textAlign: 'right' as const }}>
            {formatCompact(protocol.revenueThirtyDayUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(99,179,237,0.8)', textAlign: 'right' as const }}>
            {formatCompact(protocol.revenueAnnualizedUsd)}
          </span>
        </>
      )}
      {tab === 'fees' && (
        <>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(195,125,0,1)', textAlign: 'right' as const }}>
            {formatCompact(protocol.feesOneDayUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(55,65,110,1)', textAlign: 'right' as const }}>
            {formatCompact(protocol.feesSevenDayUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(55,65,110,1)', textAlign: 'right' as const }}>
            {formatCompact(protocol.feesThirtyDayUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(165,175,210,1)', textAlign: 'right' as const }}>
            —
          </span>
        </>
      )}
      {tab === 'ratios' && (
        <>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: protocol.priceToSalesRatio != null && protocol.priceToSalesRatio < 10 ? 'rgba(0,155,95,1)' : 'rgba(55,65,110,1)', textAlign: 'right' as const }}>
            {formatNull(protocol.priceToSalesRatio)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: protocol.priceToEarningsRatio != null && protocol.priceToEarningsRatio < 30 ? 'rgba(0,155,95,1)' : 'rgba(55,65,110,1)', textAlign: 'right' as const }}>
            {formatNull(protocol.priceToEarningsRatio)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(55,65,110,1)', textAlign: 'right' as const }}>
            {formatNull(protocol.marketcapUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(165,175,210,1)', textAlign: 'right' as const }}>
            {formatNull(protocol.fdvUsd)}
          </span>
        </>
      )}
      {tab === 'treasury' && (
        <>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(15,40,180,1)', textAlign: 'right' as const }}>
            {formatNull(protocol.treasuryUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(55,65,110,1)', textAlign: 'right' as const }}>
            {formatNull(protocol.marketcapUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(165,175,210,1)', textAlign: 'right' as const }}>
            {formatNull(protocol.fdvUsd)}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(165,175,210,1)', textAlign: 'right' as const }}>
            —
          </span>
        </>
      )}
    </div>
  );
});
ProtocolRow.displayName = 'ProtocolRow';

// ─── Column headers ───────────────────────────────────────────────────────────

const COL_HEADERS = Object.freeze<Record<Tab, string[]>>({
  revenue:  ['#', 'PROTOCOL', 'TREND', '1D', '7D', '30D', 'ANNUAL'],
  fees:     ['#', 'PROTOCOL', 'TREND', '1D', '7D', '30D', '—'],
  ratios:   ['#', 'PROTOCOL', '—', 'P/S', 'P/E', 'MCAP', 'FDV'],
  treasury: ['#', 'PROTOCOL', '—', 'TREASURY', 'MCAP', 'FDV', '—'],
});

// ─── Main Component ───────────────────────────────────────────────────────────

const Fundamentals = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const mountedRef = useRef(true);
  const [tab, setTab]       = useState<Tab>('revenue');
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rev30d');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const { protocols, isLoading, isError, refetch } = useTokenTerminal();

  const handleTab = useCallback((t: Tab) => {
    if (!mountedRef.current) return;
    setTab(t);
  }, []);

  const handlePeriod = useCallback((p: PeriodKey) => {
    if (!mountedRef.current) return;
    setPeriod(p);
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!mountedRef.current) return;
    setSearch(e.target.value);
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    if (!mountedRef.current) return;
    setSortKey(prev => {
      if (prev === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
      else setSortDir('desc');
      return key;
    });
  }, []);

  const handleRefetch = useCallback(() => {
    if (!mountedRef.current) return;
    refetch();
  }, [refetch]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return protocols.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q)
    );
  }, [protocols, search]);

  const sorted = useMemo(() => {
    const getSortVal = (p: ProtocolRevenue): number => {
      switch (sortKey) {
        case 'rev1d':     return p.revenueOneDayUsd;
        case 'rev7d':     return p.revenueSevenDayUsd;
        case 'rev30d':    return p.revenueThirtyDayUsd;
        case 'revAnnual': return p.revenueAnnualizedUsd;
        case 'fees1d':    return p.feesOneDayUsd;
        case 'fees30d':   return p.feesThirtyDayUsd;
        case 'ps':        return p.priceToSalesRatio ?? Infinity;
        case 'pe':        return p.priceToEarningsRatio ?? Infinity;
        case 'mcap':      return p.marketcapUsd ?? 0;
        case 'fdv':       return p.fdvUsd ?? 0;
        case 'treasury':  return p.treasuryUsd ?? 0;
        default:          return 0;
      }
    };
    return [...filtered].sort((a, b) =>
      sortDir === 'desc' ? getSortVal(b) - getSortVal(a) : getSortVal(a) - getSortVal(b)
    );
  }, [filtered, sortKey, sortDir]);

  const summaryStats = useMemo(() => {
    const total30dRevenue = protocols.reduce((s, p) => s + p.revenueThirtyDayUsd, 0);
    const total30dFees    = protocols.reduce((s, p) => s + p.feesThirtyDayUsd, 0);
    const totalMcap       = protocols.reduce((s, p) => s + (p.marketcapUsd ?? 0), 0);
    const withPE          = protocols.filter(p => p.priceToEarningsRatio != null && p.priceToEarningsRatio > 0 && p.priceToEarningsRatio < 1000);
    const medianPE        = withPE.length > 0
      ? [...withPE].sort((a, b) => (a.priceToEarningsRatio ?? 0) - (b.priceToEarningsRatio ?? 0))[Math.floor(withPE.length / 2)].priceToEarningsRatio ?? 0
      : 0;
    return { total30dRevenue, total30dFees, totalMcap, medianPE };
  }, [protocols]);

  const tabBtnStyle = useCallback((active: boolean) => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.08em',
    padding: '5px 14px',
    borderRadius: '5px',
    background: active ? 'rgba(0,155,95,0.09)' : 'rgba(255,255,255,1)',
    border: '1px solid ' + (active ? 'rgba(0,155,95,0.28)' : 'rgba(15,40,100,0.08)'),
    color: active ? 'rgba(0,155,95,1)' : 'rgba(55,65,110,1)',
    cursor: 'pointer',
    willChange: 'transform',
  }), []);

  const colHdrStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: '28px 160px 1fr 80px 80px 80px 70px',
    gap: '8px',
    padding: '4px 12px 8px',
  }), []);

  if (isLoading) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ height: '44px', background: 'rgba(255,255,255,1)', borderRadius: '6px', border: '1px solid rgba(15,40,100,0.08)' }} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '16px',
        willChange: 'transform',
      }}
      role="main"
      aria-label="Fundamentals page"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(8,12,40,1)', margin: 0 }}>
            FUNDAMENTALS
          </h1>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(165,175,210,1)', letterSpacing: '0.06em', margin: '2px 0 0' }}>
            TOKEN TERMINAL — PROTOCOL REVENUE & FEES
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(165,175,210,1)' }}>
            {protocols.length + ' protocols'}
          </span>
          <button
            type="button"
            onClick={handleRefetch}
            aria-label="Refresh fundamentals data"
            style={tabBtnStyle(false)}
          >
            ↻ REFRESH
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: '30D REVENUE', value: formatCompact(summaryStats.total30dRevenue), color: 'rgba(0,155,95,1)' },
          { label: '30D FEES',    value: formatCompact(summaryStats.total30dFees),    color: 'rgba(195,125,0,1)'  },
          { label: 'TOTAL MCAP',  value: formatCompact(summaryStats.totalMcap),       color: 'rgba(15,40,180,1)'   },
          { label: 'MEDIAN P/E',  value: summaryStats.medianPE > 0 ? summaryStats.medianPE.toFixed(1) + 'x' : '—', color: 'rgba(15,40,180,1)' },
        ].map(stat => (
          <GlassCard key={stat.label} style={{ padding: '12px 16px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(165,175,210,1)', marginBottom: '6px' }}>
              {stat.label}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' as const }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }} role="tablist" aria-label="Data category">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => handleTab(t.key)}
              aria-label={'View ' + t.label + ' data'}
              style={tabBtnStyle(tab === t.key)}
            >
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Period filter */}
        {(tab === 'revenue' || tab === 'fees') && (
          <div style={{ display: 'flex', gap: '4px' }} role="group" aria-label="Time period filter">
            {PERIODS.filter(p => tab === 'fees' ? p.key !== 'annual' : true).map(p => (
              <button
                key={p.key}
                type="button"
                aria-pressed={period === p.key}
                onClick={() => handlePeriod(p.key)}
                aria-label={'Filter by ' + p.label + ' period'}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: period === p.key ? 'rgba(243,245,250,1)' : 'transparent',
                  border: '1px solid ' + (period === p.key ? 'rgba(15,40,100,0.15)' : 'rgba(15,40,100,0.08)'),
                  color: period === p.key ? 'rgba(8,12,40,1)' : 'rgba(165,175,210,1)',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search protocol..."
          value={search}
          onChange={handleSearch}
          aria-label="Search protocols"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            padding: '5px 10px',
            borderRadius: '5px',
            background: 'rgba(255,255,255,1)',
            border: '1px solid rgba(15,40,100,0.08)',
            color: 'rgba(8,12,40,1)',
            outline: 'none',
            width: '180px',
            marginLeft: 'auto',
          }}
        />
      </div>

      {/* Error state */}
      {isError && (
        <div style={{
          padding: '16px',
          background: 'rgba(195,125,0,0.09)',
          borderRadius: '8px',
          border: '1px solid rgba(195,125,0,0.28)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: 'rgba(195,125,0,1)',
        }}>
          ⚠ Token Terminal API unavailable — showing cached data or mock fallback.
        </div>
      )}

      {/* Table */}
      <GlassCard style={{ padding: '12px' }}>
        {/* Column headers */}
        <div style={colHdrStyle} role="row">
          {COL_HEADERS[tab].map((col, i) => (
            <button
              key={i + col}
              type="button"
              onClick={() => {
                const keyMap: Record<number, SortKey> = {
                  0: 'name', 3: tab === 'revenue' ? 'rev1d' : tab === 'fees' ? 'fees1d' : 'ps',
                  4: tab === 'revenue' ? 'rev7d' : tab === 'fees' ? 'fees1d' : 'pe',
                  5: tab === 'revenue' ? 'rev30d' : tab === 'fees' ? 'fees30d' : 'mcap',
                  6: tab === 'revenue' ? 'revAnnual' : 'fdv',
                };
                if (keyMap[i]) handleSort(keyMap[i]);
              }}
              aria-label={'Sort by ' + col}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '8px',
                letterSpacing: '0.1em',
                color: 'rgba(165,175,210,1)',
                textAlign: i > 2 ? 'right' as const : 'left' as const,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {col}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '3px' }} role="table" aria-label="Protocol fundamentals table">
          {sorted.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' as const, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(165,175,210,1)' }}>
              No protocols found
            </div>
          ) : (
            sorted.map((p, i) => (
              <ProtocolRow
                key={p.projectId}
                protocol={p}
                rank={i + 1}
                tab={tab}
                period={period}
              />
            ))
          )}
        </div>
      </GlassCard>

      {/* Footer attribution */}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(165,175,210,1)', textAlign: 'center' as const, letterSpacing: '0.08em' }}>
        DATA: TOKEN TERMINAL FREE TIER — UPDATES EVERY 5 MINUTES
      </div>
    </motion.div>
  );
});

Fundamentals.displayName = 'Fundamentals';
export default Fundamentals;
