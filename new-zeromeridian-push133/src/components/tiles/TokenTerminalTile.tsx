/**
 * TokenTerminalTile.tsx — ZERØ MERIDIAN 2026 push111
 * Protocol revenue leaderboard from Token Terminal free tier.
 * Shows top protocols by 30D revenue + P/E + P/S ratios.
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero template literals in JSX ✓
 * - Object.freeze() all static data ✓
 * - useCallback + useMemo ✓
 * - mountedRef ✓
 * - aria-label ✓
 */

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { useTokenTerminal } from '@/hooks/useTokenTerminal';
import { formatCompact } from '@/lib/formatters';

// ─── Static data ──────────────────────────────────────────────────────────────

type TabKey = 'revenue' | 'fees';

const TAB_CONFIG = Object.freeze({
  revenue: { label: 'Revenue 30D', color: 'rgba(52,211,153,1)' },
  fees:    { label: 'Fees 30D',    color: 'rgba(96,165,250,1)' },
} as const);

const CARD_STYLE = Object.freeze({
  padding: '16px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  height: '100%',
});

const ROW_STYLE = Object.freeze({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
});

// ─── Sub components ───────────────────────────────────────────────────────────

interface SkeletonRowProps { n: number }
const SkeletonRows = memo(({ n }: SkeletonRowProps) => (
  <>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ ...ROW_STYLE, opacity: 1 - i * 0.08 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ flex: 1, height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ width: 64, height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
      </div>
    ))}
  </>
));
SkeletonRows.displayName = 'SkeletonRows';

// ─── Main Component ───────────────────────────────────────────────────────────

const TokenTerminalTile = memo(() => {
  const mountedRef = useRef(true);
  const { topByRevenue, topByFees, isLoading, isError, refetch } = useTokenTerminal();
  const [activeTab, setActiveTab] = useState<TabKey>('revenue');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleTabRevenue = useCallback(() => { if (mountedRef.current) setActiveTab('revenue'); }, []);
  const handleTabFees    = useCallback(() => { if (mountedRef.current) setActiveTab('fees'); }, []);
  const handleRefetch    = useCallback(() => { refetch(); }, [refetch]);

  const rows = activeTab === 'revenue' ? topByRevenue : topByFees;
  const cfg  = TAB_CONFIG[activeTab];

  const maxVal = useMemo(() => {
    if (rows.length === 0) return 1;
    return activeTab === 'revenue'
      ? Math.max(...rows.map(r => r.revenueThirtyDayUsd), 1)
      : Math.max(...rows.map(r => r.feesThirtyDayUsd), 1);
  }, [rows, activeTab]);

  const headerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }), []);

  const tabsStyle = useMemo(() => ({
    display: 'flex',
    gap: '4px',
  }), []);

  return (
    <GlassCard style={CARD_STYLE}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="1" y="7" width="2" height="4" fill="rgba(52,211,153,0.7)" rx="0.5" />
            <rect x="5" y="4" width="2" height="7" fill="rgba(52,211,153,0.85)" rx="0.5" />
            <rect x="9" y="1" width="2" height="10" fill="rgba(52,211,153,1)" rx="0.5" />
          </svg>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.65)' }}>
            TOKEN TERMINAL
          </span>
        </div>
        <div style={tabsStyle}>
          {(Object.keys(TAB_CONFIG) as TabKey[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={tab === 'revenue' ? handleTabRevenue : handleTabFees}
              aria-pressed={activeTab === tab}
              aria-label={'Show ' + TAB_CONFIG[tab].label}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: '4px',
                background: activeTab === tab ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
                border: '1px solid ' + (activeTab === tab ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)'),
                color: activeTab === tab ? 'rgba(52,211,153,1)' : 'rgba(148,163,184,0.5)',
                cursor: 'pointer',
                willChange: 'transform',
              }}
            >
              {TAB_CONFIG[tab].label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleRefetch}
            aria-label="Refresh Token Terminal data"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              padding: '3px 6px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(148,163,184,0.4)',
              cursor: 'pointer',
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 0 4px' }}>
        <div style={{ width: 24 }} />
        <div style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(148,163,184,0.35)', letterSpacing: '0.1em' }}>PROTOCOL</div>
        <div style={{ width: 70, textAlign: 'right' as const, fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(148,163,184,0.35)', letterSpacing: '0.1em' }}>{cfg.label.split(' ')[0]}</div>
        <div style={{ width: 40, textAlign: 'right' as const, fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(148,163,184,0.35)', letterSpacing: '0.1em' }}>P/E</div>
      </div>

      {/* Rows */}
      <div style={{ overflowY: 'auto' as const, maxHeight: '260px' }}>
        {isLoading ? (
          <SkeletonRows n={8} />
        ) : isError || rows.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '24px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(148,163,184,0.3)' }}>
            No data — Token Terminal may require API key for this endpoint.
          </div>
        ) : rows.map((p, i) => {
          const val = activeTab === 'revenue' ? p.revenueThirtyDayUsd : p.feesThirtyDayUsd;
          const barPct = (val / maxVal * 100).toFixed(1) + '%';
          return (
            <motion.div
              key={p.projectId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              style={ROW_STYLE}
            >
              {/* Rank */}
              <div style={{ width: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(148,163,184,0.3)', textAlign: 'right' as const }}>
                {i + 1}
              </div>

              {/* Logo or placeholder */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                ) : (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '7px', color: 'rgba(255,255,255,0.4)' }}>
                    {p.symbol.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name + bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '1px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: barPct, background: cfg.color, willChange: 'width', borderRadius: '1px' }} />
                </div>
              </div>

              {/* Value */}
              <div style={{ width: 70, textAlign: 'right' as const, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: cfg.color, letterSpacing: '0.04em' }}>
                {formatCompact(val)}
              </div>

              {/* P/E */}
              <div style={{ width: 40, textAlign: 'right' as const, fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: p.priceToEarningsRatio != null ? 'rgba(251,191,36,0.8)' : 'rgba(148,163,184,0.2)' }}>
                {p.priceToEarningsRatio != null ? p.priceToEarningsRatio.toFixed(0) + 'x' : '—'}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(148,163,184,0.25)', letterSpacing: '0.06em', marginTop: 'auto' }}>
        SOURCE · TOKEN TERMINAL · FREE TIER
      </div>
    </GlassCard>
  );
});
TokenTerminalTile.displayName = 'TokenTerminalTile';

export default TokenTerminalTile;
