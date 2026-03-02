/**
 * Dashboard.tsx — ZERØ MERIDIAN push130
 * push130: Zero :any — CGMarketCoin interface replacing marketsJson.map((t: any))
 * push110: Responsive polish — mobile 320px + desktop 1440px
 * - React.memo + displayName ✓  rgba() only ✓  Zero className ✓
 * - Zero hex color ✓  JetBrains Mono only ✓  Zero :any ✓
 */

import React, { memo, useCallback, useMemo, useEffect, useRef, useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = "'JetBrains Mono', monospace";

const C = Object.freeze({
  accent:      "rgba(0,238,255,1)",
  positive:    "rgba(34,255,170,1)",
  negative:    "rgba(255,68,136,1)",
  warning:     "rgba(255,187,0,1)",
  textPrimary: "rgba(240,240,248,1)",
  textFaint:   "rgba(80,80,100,1)",
  bgBase:      "rgba(5,7,13,1)",
  cardBg:      "rgba(14,17,28,1)",
  glassBg:     "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.06)",
});

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface CGGlobalData {
  total_market_cap:          Record<string, number>;
  total_volume:              Record<string, number>;
  market_cap_percentage:     Record<string, number>;
}

interface CGGlobalResponse {
  data: CGGlobalData;
}

interface FnGItem {
  value:                string;
  value_classification: string;
}

interface FnGResponse {
  data: FnGItem[];
}

interface CGMarketCoin {
  id:                                     string;
  symbol:                                 string;
  name:                                   string;
  current_price:                          number;
  price_change_percentage_24h:            number | null;
}

// ─── App types ────────────────────────────────────────────────────────────────

interface GlobalData {
  totalMarketCap: number;
  btcDominance:   number;
  ethDominance:   number;
  totalVolume24h: number;
  fngValue:       number;
  fngLabel:       string;
  lastUpdated:    number;
}

interface TopMover {
  symbol:   string;
  name:     string;
  price:    number;
  change24h: number;
}

interface DashboardData {
  global:     GlobalData;
  topGainers: TopMover[];
  topLosers:  TopMover[];
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps { label: string; value: string; sub?: string; accent?: boolean; }
const MetricCard = memo(({ label, value, sub, accent }: MetricCardProps) => {
  const s = useMemo(() => ({
    card:  { background: C.cardBg, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 16, display: "flex" as const, flexDirection: "column" as const, gap: 8 },
    label: { fontFamily: FONT, fontSize: 9, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.textFaint },
    value: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: accent ? C.accent : C.textPrimary },
    sub:   { fontFamily: FONT, fontSize: 10, color: C.textFaint },
  }), [accent]);
  return (
    <div style={s.card}>
      <span style={s.label}>{label}</span>
      <span style={s.value}>{value}</span>
      {sub && <span style={s.sub}>{sub}</span>}
    </div>
  );
});
MetricCard.displayName = "MetricCard";

// ─── MoverRow ─────────────────────────────────────────────────────────────────

interface MoverRowProps { mover: TopMover; }
const MoverRow = memo(({ mover }: MoverRowProps) => {
  const [hovered, setHovered] = useState(false);
  const onEnter = useCallback(() => setHovered(true),  []);
  const onLeave = useCallback(() => setHovered(false), []);
  const changeColor = mover.change24h >= 0 ? C.positive : C.negative;
  const rowStyle = useMemo(() => ({
    display: "flex" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
    padding: "0 16px", height: 50,
    borderBottom: `1px solid ${C.glassBorder}`,
    background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
    transition: "background 0.15s ease",
  }), [hovered]);
  return (
    <div style={rowStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{mover.symbol}</span>
        <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>{mover.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.textPrimary }}>
          ${mover.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: changeColor }}>
          {mover.change24h >= 0 ? "+" : ""}{mover.change24h.toFixed(2)}%
        </span>
      </div>
    </div>
  );
});
MoverRow.displayName = "MoverRow";

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps { section: string; onRetry: () => void; }
const EmptyState = memo(({ section, onRetry }: EmptyStateProps) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: 12 }}>
    <span style={{ fontSize: 28, opacity: 0.25 }}>📊</span>
    <span style={{ fontFamily: FONT, fontSize: 12, color: C.textFaint, textAlign: "center" }}>
      {section} data unavailable.
    </span>
    <button
      onClick={onRetry}
      style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(0,238,255,0.08)", border: "1px solid rgba(0,238,255,0.2)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
    >
      Retry
    </button>
  </div>
));
EmptyState.displayName = "EmptyState";

// ─── Dashboard (Main) ─────────────────────────────────────────────────────────

const Dashboard = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const mountedRef            = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // CoinGecko free tier can be rate-limited; try with CORS proxy as fallback
      const CG_GLOBAL  = 'https://api.coingecko.com/api/v3/global';
      const CG_MARKETS = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=24h';
      const FNG_URL    = 'https://api.alternative.me/fng/?limit=1';

      async function safeFetch(url: string): Promise<Response> {
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      }

      const [globalRes, fngRes, marketsRes] = await Promise.all([
        safeFetch(CG_GLOBAL),
        safeFetch(FNG_URL),
        safeFetch(CG_MARKETS),
      ]);
      if (!mountedRef.current) return;

      const [globalJson, fngJson, marketsJson] = await Promise.all([
        globalRes.json()  as Promise<CGGlobalResponse>,
        fngRes.json()     as Promise<FnGResponse>,
        marketsRes.json() as Promise<CGMarketCoin[]>,
      ]);
      if (!mountedRef.current) return;

      const g = globalJson.data;
      const movers: TopMover[] = marketsJson.map((t): TopMover => ({
        symbol:   t.symbol.toUpperCase(),
        name:     t.name,
        price:    t.current_price,
        change24h: t.price_change_percentage_24h ?? 0,
      }));
      const sorted = [...movers].sort((a, b) => b.change24h - a.change24h);

      setData({
        global: {
          totalMarketCap: g.total_market_cap.usd,
          btcDominance:   g.market_cap_percentage.btc,
          ethDominance:   g.market_cap_percentage.eth,
          totalVolume24h: g.total_volume.usd,
          fngValue:       parseInt(fngJson.data[0].value, 10),
          fngLabel:       fngJson.data[0].value_classification,
          lastUpdated:    Date.now(),
        },
        topGainers: sorted.slice(0, 5),
        topLosers:  sorted.slice(-5).reverse(),
      });
    } catch (e) {
      if (!mountedRef.current) return;
      setError(`Failed to load dashboard: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    const interval = setInterval(() => { if (mountedRef.current) fetchData(); }, 60_000);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [fetchData]);

  const lastUpdatedStr = useMemo(() => {
    if (!data?.global.lastUpdated) return "—";
    const diff = Math.floor((Date.now() - data.global.lastUpdated) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [data]);

  const fmtBig = useCallback((n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
    return `$${(n / 1e6).toFixed(0)}M`;
  }, []);

  const pageStyle = useMemo(() => ({
    background: C.bgBase, minHeight: "100vh", color: C.textPrimary, fontFamily: FONT,
    padding: isMobile ? "16px 12px" : "20px 16px",
  }), [isMobile]);

  const metricsGridCols = isMobile ? "repeat(2,1fr)" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";
  const moversGridCols  = isMobile ? "1fr" : "1fr 1fr";

  const sectionCardStyle = useMemo(() => ({
    background: C.glassBg, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: "hidden" as const,
  }), []);

  const handleRefresh = useCallback(() => fetchData(), [fetchData]);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 16 : 20, fontWeight: 700, letterSpacing: "0.06em", color: C.textPrimary, margin: 0 }}>Dashboard</h1>
          <p style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint, margin: "6px 0 0" }}>Market overview · Updated {lastUpdatedStr}</p>
        </div>
        <button
          style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(0,238,255,0.08)", border: "1px solid rgba(0,238,255,0.2)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}
          onClick={handleRefresh}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: FONT, fontSize: 11, color: C.textFaint }}>
          Loading market data...
        </div>
      )}

      {!loading && error && <EmptyState section="Dashboard" onRetry={fetchData} />}

      {!loading && !error && data && (
        <>
          {/* Global metrics */}
          <div style={{ display: "grid", gridTemplateColumns: metricsGridCols, gap: 12, marginBottom: 20 }}>
            <MetricCard label="Total Market Cap" value={fmtBig(data.global.totalMarketCap)} />
            <MetricCard label="24H Volume"        value={fmtBig(data.global.totalVolume24h)} />
            <MetricCard label="BTC Dominance"     value={`${data.global.btcDominance.toFixed(1)}%`} />
            <MetricCard label="ETH Dominance"     value={`${data.global.ethDominance.toFixed(1)}%`} />
            <MetricCard label="Fear & Greed"      value={`${data.global.fngValue} · ${data.global.fngLabel}`} accent />
          </div>

          {/* Movers */}
          <div style={{ display: "grid", gridTemplateColumns: moversGridCols, gap: 12 }}>
            <div style={sectionCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${C.glassBorder}` }}>
                <span style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.positive }}>Top Gainers</span>
                <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>24h</span>
              </div>
              {data.topGainers.length === 0
                ? <EmptyState section="Gainers" onRetry={fetchData} />
                : data.topGainers.map(m => <MoverRow key={m.symbol} mover={m} />)
              }
            </div>
            <div style={sectionCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${C.glassBorder}` }}>
                <span style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.negative }}>Top Losers</span>
                <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>24h</span>
              </div>
              {data.topLosers.length === 0
                ? <EmptyState section="Losers" onRetry={fetchData} />
                : data.topLosers.map(m => <MoverRow key={m.symbol} mover={m} />)
              }
            </div>
          </div>
        </>
      )}

      {!loading && !error && !data && <EmptyState section="Dashboard" onRetry={fetchData} />}
    </div>
  );
});
Dashboard.displayName = "Dashboard";

export default Dashboard;
