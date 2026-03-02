/**
 * GlobalStatsBar.tsx — ZERØ MERIDIAN push132
 * push132: Full reskin — light professional, navy accent, real API data
 * - React.memo + displayName ✓  rgba() only ✓  Zero className ✓
 * - useCallback + useMemo + mountedRef ✓
 */

import { memo, useMemo, useRef, useEffect } from 'react';
import { useGlobalStats } from '@/hooks/useGlobalStats';
import { formatCompact } from '@/lib/formatters';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const FONT = "'JetBrains Mono', monospace";

const C = Object.freeze({
  bg:       'rgba(255,255,255,1)',
  border:   'rgba(15,40,100,0.08)',
  accent:   'rgba(15,40,180,1)',
  positive: 'rgba(0,155,95,1)',
  negative: 'rgba(208,35,75,1)',
  warning:  'rgba(195,125,0,1)',
  textPri:  'rgba(8,12,40,1)',
  textMuted:'rgba(110,120,160,1)',
  textFaint:'rgba(165,175,210,1)',
  divider:  'rgba(15,40,100,0.08)',
});

interface StatItemProps {
  label:    string;
  value:    string;
  change?:  number;
  color?:   string;
}

const StatItem = memo(({ label, value, change, color }: StatItemProps) => {
  const isPos = (change ?? 0) >= 0;
  const changeColor = isPos ? C.positive : C.negative;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint, letterSpacing: '0.10em', textTransform: 'uppercase' as const, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: color ?? C.textPri, ...({ fontVariantNumeric: 'tabular-nums' } as React.CSSProperties) }}>
        {value}
      </span>
      {change !== undefined && (
        <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: changeColor, ...({ fontVariantNumeric: 'tabular-nums' } as React.CSSProperties) }}>
          {isPos ? '+' : ''}{change.toFixed(1)}%
        </span>
      )}
    </div>
  );
});
StatItem.displayName = 'StatItem';

const Div = memo(() => (
  <div style={{ width: 1, height: 11, background: C.divider, flexShrink: 0 }} aria-hidden="true" />
));
Div.displayName = 'Div';

import React from 'react';

const GlobalStatsBar = memo(() => {
  const mountedRef = useRef(true);
  const stats      = useGlobalStats();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const barStyle = useMemo(() => ({
    position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 200, height: 28,
    background: C.bg,
    borderBottom: '1px solid ' + C.border,
    display: 'flex', alignItems: 'center',
    padding: '0 20px', gap: 12, overflow: 'hidden',
  }), []);

  const scrollStyle = useMemo(() => ({
    display: 'flex', alignItems: 'center', gap: 12,
    overflowX: 'auto' as const, scrollbarWidth: 'none' as const,
    flex: 1, minWidth: 0,
  }), []);

  if (stats.loading && stats.lastUpdate === 0) {
    return (
      <div style={barStyle}>
        <div style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint, letterSpacing: '0.10em' }}>
          LOADING MARKET DATA...
        </div>
      </div>
    );
  }

  const totalMcap  = stats.totalMarketCap    ?? 0;
  const totalVol   = stats.totalVolume24h    ?? 0;
  const btcDom     = stats.btcDominance      ?? 0;
  const ethDom     = stats.ethDominance      ?? 0;
  const mcapChange = stats.marketCapChange24h ?? 0;
  const actCoins   = stats.activeCryptos     ?? 0;

  return (
    <div style={barStyle} role="complementary" aria-label="Global market stats bar">
      <div style={scrollStyle}>

        <StatItem label="MCAP" value={'$' + formatCompact(totalMcap)} change={mcapChange} color={C.accent} />
        {!isMobile && <Div />}
        {!isMobile && <StatItem label="VOL 24H" value={'$' + formatCompact(totalVol)} />}
        <Div />
        <StatItem label="BTC.D" value={btcDom.toFixed(1) + '%'} color={C.warning} />
        {!isMobile && <Div />}
        {!isMobile && <StatItem label="ETH.D" value={ethDom.toFixed(1) + '%'} />}
        {!isMobile && <Div />}
        {!isMobile && <StatItem label="COINS" value={actCoins.toLocaleString()} />}

      </div>

      {stats.lastUpdate > 0 && (
        <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint, flexShrink: 0, marginLeft: 'auto', letterSpacing: '0.04em' }}>
          Updated {new Date(stats.lastUpdate).toLocaleTimeString('en-US', { hour12: false })}
        </span>
      )}
    </div>
  );
});

GlobalStatsBar.displayName = 'GlobalStatsBar';
export default GlobalStatsBar;
