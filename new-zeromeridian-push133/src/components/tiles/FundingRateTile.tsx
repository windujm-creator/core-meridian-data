/**
 * FundingRateTile.tsx — ZERØ MERIDIAN 2026
 * Funding rate visualization — SVG bars per exchange + per symbol.
 * Data: Binance Futures REST /fapi/v1/fundingRate (free, no key needed)
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero template literals in JSX attrs ✓
 * - mountedRef + AbortController ✓
 * - useCallback + useMemo ✓
 */

import { memo, useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../shared/GlassCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FundingRate {
  symbol: string;
  rate: number;        // e.g. 0.0001 = 0.01%
  nextFundingTime: number;
  markPrice: number;
  indexPrice: number;
}

interface PremiumIndex {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  time: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SYMBOLS = Object.freeze([
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'LINKUSDT', 'DOTUSDT',
]);

const SYMBOL_COLORS: Record<string, string> = Object.freeze({
  BTCUSDT:  'rgba(251,191,36,1)',
  ETHUSDT:  'rgba(96,165,250,1)',
  SOLUSDT:  'rgba(167,139,250,1)',
  BNBUSDT:  'rgba(251,191,36,0.7)',
  XRPUSDT:  'rgba(34,211,238,1)',
  ADAUSDT:  'rgba(52,211,153,1)',
  AVAXUSDT: 'rgba(251,113,133,1)',
  DOGEUSDT: 'rgba(251,191,36,0.5)',
  LINKUSDT: 'rgba(96,165,250,0.7)',
  DOTUSDT:  'rgba(196,181,253,1)',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRate(r: number): string {
  return (r * 100).toFixed(4) + '%';
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, ms - Date.now());
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

function rateToColor(rate: number): string {
  if (rate > 0.001)  return 'rgba(52,211,153,1)';   // very positive
  if (rate > 0.0002) return 'rgba(52,211,153,0.7)';
  if (rate > 0)      return 'rgba(52,211,153,0.4)';
  if (rate === 0)    return 'rgba(148,163,184,0.4)';
  if (rate > -0.0002)return 'rgba(251,113,133,0.4)';
  if (rate > -0.001) return 'rgba(251,113,133,0.7)';
  return 'rgba(251,113,133,1)';                       // very negative
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useFundingRates() {
  const [rates, setRates] = useState<FundingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextFunding, setNextFunding] = useState(0);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRates = useCallback(async (signal: AbortSignal) => {
    try {
      // Binance Futures premium index (includes funding rate, mark/index price)
      const url = 'https://fapi.binance.com/fapi/v1/premiumIndex';
      const res = await fetch(url, { signal });
      if (!res.ok || !mountedRef.current) return;
      const data: PremiumIndex[] = await res.json();
      if (!mountedRef.current) return;

      const filtered: FundingRate[] = SYMBOLS.map(sym => {
        const found = data.find(d => d.symbol === sym);
        return {
          symbol: sym,
          rate: found ? parseFloat(found.lastFundingRate) : 0,
          nextFundingTime: found ? found.nextFundingTime : 0,
          markPrice: found ? parseFloat(found.markPrice) : 0,
          indexPrice: found ? parseFloat(found.indexPrice) : 0,
        };
      }).filter(r => r.markPrice > 0);

      setRates(filtered);
      if (filtered.length > 0 && filtered[0].nextFundingTime > 0) {
        setNextFunding(filtered[0].nextFundingTime);
      }
      setLoading(false);
    } catch {}
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const ctrl = new AbortController();
    fetchRates(ctrl.signal);
    const t = setInterval(() => fetchRates(ctrl.signal), 30000);
    return () => {
      mountedRef.current = false;
      ctrl.abort();
      clearInterval(t);
    };
  }, [fetchRates]);

  return { rates, loading, nextFunding };
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

interface FundingBarChartProps {
  rates: FundingRate[];
}

const FundingBarChart = memo(({ rates }: FundingBarChartProps) => {
  const maxAbsRate = useMemo(() => {
    let max = 0;
    for (const r of rates) if (Math.abs(r.rate) > max) max = Math.abs(r.rate);
    return max || 0.001;
  }, [rates]);

  const barH = 16;
  const barGap = 4;
  const labelW = 72;
  const valueW = 60;
  const totalH = rates.length * (barH + barGap);
  const midX = '50%';

  return (
    <svg
      width="100%"
      height={totalH}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Zero line */}
      <line x1={midX} y1={0} x2={midX} y2={totalH} stroke="rgba(96,165,250,0.15)" strokeWidth={1} strokeDasharray="3,3" />

      {rates.map((r, i) => {
        const y = i * (barH + barGap);
        const pct = Math.abs(r.rate) / maxAbsRate;
        const color = rateToColor(r.rate);
        const symbolColor = SYMBOL_COLORS[r.symbol] ?? 'rgba(148,163,184,0.7)';
        const label = r.symbol.replace('USDT', '');
        const isPos = r.rate >= 0;

        return (
          <g key={r.symbol}>
            {/* Symbol label */}
            <text
              x={labelW - 4}
              y={y + barH / 2 + 4}
              textAnchor="end"
              fill={symbolColor}
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              {label}
            </text>

            {/* Bar background */}
            <rect
              x={labelW}
              y={y}
              width={'calc(100% - ' + (labelW + valueW) + 'px)'}
              height={barH}
              rx={2}
              fill="rgba(255,255,255,0.03)"
            />

            {/* Actual bar — extends from center */}
            <rect
              x={isPos ? '50%' : undefined}
              y={y}
              width={pct * 45 + '%'}
              height={barH}
              rx={2}
              fill={color}
              style={isPos ? {} : { transform: 'translateX(-' + (pct * 45) + '%)' }}
            />

            {/* Rate value */}
            <text
              x={'calc(100% - ' + (valueW - 4) + 'px)'}
              y={y + barH / 2 + 4}
              textAnchor="start"
              fill={rateToColor(r.rate)}
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              {r.rate >= 0 ? '+' : ''}{formatRate(r.rate)}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
FundingBarChart.displayName = 'FundingBarChart';

// ─── Countdown ────────────────────────────────────────────────────────────────

const FundingCountdown = memo(({ nextFundingTime }: { nextFundingTime: number }) => {
  const [countdown, setCountdown] = useState('--:--:--');

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(nextFundingTime));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [nextFundingTime]);

  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      color: 'rgba(251,191,36,0.9)',
      letterSpacing: '0.08em',
    }}>
      {countdown}
    </span>
  );
});
FundingCountdown.displayName = 'FundingCountdown';

// ─── Summary Stats ────────────────────────────────────────────────────────────

interface SummaryProps {
  rates: FundingRate[];
}

const FundingSummary = memo(({ rates }: SummaryProps) => {
  const stats = useMemo(() => {
    if (rates.length === 0) return null;
    const positive = rates.filter(r => r.rate > 0).length;
    const negative = rates.filter(r => r.rate < 0).length;
    const avg = rates.reduce((s, r) => s + r.rate, 0) / rates.length;
    const max = rates.reduce((a, r) => r.rate > a.rate ? r : a, rates[0]);
    const min = rates.reduce((a, r) => r.rate < a.rate ? r : a, rates[0]);
    return { positive, negative, avg, max, min };
  }, [rates]);

  if (!stats) return null;

  const statStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(96,165,250,0.08)',
    borderRadius: 6,
    flex: 1,
  };

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
      <div style={statStyle}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(148,163,184,0.4)', letterSpacing: '0.1em' }}>AVG RATE</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: rateToColor(stats.avg) }}>
          {stats.avg >= 0 ? '+' : ''}{formatRate(stats.avg)}
        </span>
      </div>
      <div style={statStyle}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(148,163,184,0.4)', letterSpacing: '0.1em' }}>LONGS PAY</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(52,211,153,0.9)' }}>
          {stats.positive}/{rates.length}
        </span>
      </div>
      <div style={statStyle}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(148,163,184,0.4)', letterSpacing: '0.1em' }}>SHORTS PAY</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(251,113,133,0.9)' }}>
          {stats.negative}/{rates.length}
        </span>
      </div>
      <div style={statStyle}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(148,163,184,0.4)', letterSpacing: '0.1em' }}>HIGHEST</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(52,211,153,0.9)' }}>
          {stats.max.symbol.replace('USDT', '')} {stats.max.rate >= 0 ? '+' : ''}{formatRate(stats.max.rate)}
        </span>
      </div>
    </div>
  );
});
FundingSummary.displayName = 'FundingSummary';

// ─── Main Component ───────────────────────────────────────────────────────────

const FundingRateTile = memo(() => {
  const { rates, loading, nextFunding } = useFundingRates();

  return (
    <GlassCard
      style={{ height: 300, display: 'flex', flexDirection: 'column', padding: '12px' }}
      accentColor="rgba(251,191,36,1)"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: 'rgba(226,232,240,0.7)', fontWeight: 600, letterSpacing: '0.05em',
          }}>
            FUNDING RATES
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: 'rgba(148,163,184,0.35)', marginTop: 2,
          }}>
            BINANCE PERP · 8H INTERVAL
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(148,163,184,0.35)', marginBottom: 2 }}>
            NEXT FUNDING
          </div>
          {nextFunding > 0 && <FundingCountdown nextFundingTime={nextFunding} />}
        </div>
      </div>

      {/* Summary */}
      {rates.length > 0 && <FundingSummary rates={rates} />}

      {/* Chart */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <AnimatePresence>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: 'rgba(251,191,36,0.4)',
              }}
            >
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                FETCHING FUNDING DATA...
              </motion.span>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <FundingBarChart rates={rates} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Annotation */}
      <div style={{
        marginTop: 6,
        display: 'flex', gap: 12,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
        color: 'rgba(148,163,184,0.25)',
      }}>
        <span style={{ color: 'rgba(52,211,153,0.5)' }}>■</span>
        <span>POSITIVE = longs pay shorts</span>
        <span style={{ color: 'rgba(251,113,133,0.5)' }}>■</span>
        <span>NEGATIVE = shorts pay longs</span>
      </div>
    </GlassCard>
  );
});

FundingRateTile.displayName = 'FundingRateTile';
export default FundingRateTile;
