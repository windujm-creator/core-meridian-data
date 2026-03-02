/**
 * Dashboard.tsx — ZERØ MERIDIAN 2026 push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * - Object.freeze() all static objects ✓  rgba() only ✓  Zero className ✓
 * - JetBrains Mono only ✓  React.memo + displayName ✓
 * - useMemo style objects ✓  mountedRef ✓  AbortController ✓
 * - Zero mock data → error state + retry ✓
 */

import React, { memo, useCallback, useMemo, useEffect, useRef, useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const FONT = "'JetBrains Mono', monospace";

const C = Object.freeze({
  bgBase:       "rgba(248,249,252,1)",
  bgCard:       "rgba(255,255,255,1)",
  bgCardHover:  "rgba(243,245,250,1)",
  accent:       "rgba(15,40,180,1)",
  accentDim:    "rgba(15,40,180,0.08)",
  accentBorder: "rgba(15,40,180,0.25)",
  positive:     "rgba(0,155,95,1)",
  positiveDim:  "rgba(0,155,95,0.09)",
  negative:     "rgba(208,35,75,1)",
  negativeDim:  "rgba(208,35,75,0.09)",
  warning:      "rgba(195,125,0,1)",
  textPrimary:  "rgba(8,12,40,1)",
  textSecondary:"rgba(55,65,110,1)",
  textMuted:    "rgba(110,120,160,1)",
  textFaint:    "rgba(165,175,210,1)",
  border:       "rgba(15,40,100,0.10)",
  borderFaint:  "rgba(15,40,100,0.06)",
  shadow:       "0 1px 4px rgba(15,40,100,0.07), 0 0 0 1px rgba(15,40,100,0.06)",
  shadowHov:    "0 4px 16px rgba(15,40,100,0.10), 0 0 0 1px rgba(15,40,100,0.08)",
});

interface CGGlobalData {
  total_market_cap:      Record<string, number>;
  total_volume:          Record<string, number>;
  market_cap_percentage: Record<string, number>;
  market_cap_change_percentage_24h_usd: number;
}
interface CGGlobalResponse { data: CGGlobalData; }
interface FnGItem { value: string; value_classification: string; }
interface FnGResponse { data: FnGItem[]; }
interface CGMarketCoin {
  id:                          string;
  symbol:                      string;
  name:                        string;
  current_price:               number;
  price_change_percentage_24h: number | null;
}
interface GlobalData {
  totalMarketCap: number; btcDominance: number; ethDominance: number;
  totalVolume24h: number; mcapChange24h: number;
  fngValue: number; fngLabel: string; lastUpdated: number;
}
interface TopMover { symbol: string; name: string; price: number; change24h: number; }
interface DashboardData { global: GlobalData; topGainers: TopMover[]; topLosers: TopMover[]; }

// ─── FearGreedGauge ───────────────────────────────────────────────────────────

const FearGreedGauge = memo(({ value, label }: { value: number; label: string }) => {
  const col = value <= 25 ? C.negative : value <= 45 ? C.warning : value <= 55 ? C.textMuted : C.positive;
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: FONT, fontSize: "9px", textTransform: "uppercase" as const, letterSpacing: "0.10em", color: C.textFaint, fontWeight: 600 }}>
          Fear & Greed
        </span>
        <span style={{ fontFamily: FONT, fontSize: "14px", fontWeight: 700, color: col }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: C.border, position: "relative" as const, overflow: "hidden" as const }}>
        <div style={{ position: "absolute" as const, top: 0, left: 0, height: "100%", width: Math.min(value, 100) + "%", background: col, borderRadius: 4, transition: "width 0.7s ease" }} />
      </div>
      <span style={{ fontFamily: FONT, fontSize: "9px", color: col, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
});
FearGreedGauge.displayName = "FearGreedGauge";

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard = memo(({ label, value, change, sub, topColor, children }: {
  label: string; value?: string; change?: number; sub?: string;
  topColor?: string; children?: React.ReactNode;
}) => {
  const [hov, setHov] = useState(false);
  const cardSt = useMemo(() => Object.freeze({
    background:   hov ? C.bgCardHover : C.bgCard,
    border:       "1px solid " + (hov ? "rgba(15,40,180,0.18)" : C.border),
    borderRadius: 10, padding: "14px 16px",
    display: "flex", flexDirection: "column" as const, gap: 5,
    minHeight: 88, boxShadow: hov ? C.shadowHov : C.shadow,
    transform: hov ? "translateY(-1px)" : "translateY(0)",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 150ms ease",
    willChange: "transform" as const, position: "relative" as const, overflow: "hidden" as const,
  }), [hov]);
  const changeCol = change !== undefined ? (change >= 0 ? C.positive : C.negative) : undefined;
  return (
    <div style={cardSt} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: "2px", background: topColor ?? C.accent, opacity: hov ? 1 : 0.55, transition: "opacity 160ms ease" }} />
      <span style={{ fontFamily: FONT, fontSize: "9px", textTransform: "uppercase" as const, letterSpacing: "0.10em", color: C.textFaint, fontWeight: 600 }}>{label}</span>
      {value && <span style={{ fontFamily: FONT, fontSize: "18px", fontWeight: 700, color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}>{value}</span>}
      {change !== undefined && <span style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: changeCol }}>{change >= 0 ? "▲ +" : "▼ "}{Math.abs(change).toFixed(2)}%</span>}
      {sub && <span style={{ fontFamily: FONT, fontSize: "10px", color: C.textMuted }}>{sub}</span>}
      {children}
    </div>
  );
});
StatCard.displayName = "StatCard";

// ─── MoverRow ─────────────────────────────────────────────────────────────────

const MoverRow = memo(({ mover, rank }: { mover: TopMover; rank: number }) => {
  const [hov, setHov] = useState(false);
  const isPos = mover.change24h >= 0;
  const rowSt = useMemo(() => Object.freeze({
    display: "grid" as const, gridTemplateColumns: "24px 1fr auto auto",
    alignItems: "center" as const, gap: "8px", padding: "10px 16px",
    borderBottom: "1px solid " + C.borderFaint,
    background: hov ? "rgba(15,40,180,0.025)" : "transparent",
    transition: "background 0.12s ease",
  }), [hov]);
  const badgeSt = useMemo(() => Object.freeze({
    fontFamily: FONT, fontSize: "10px", fontWeight: 700,
    color: isPos ? C.positive : C.negative,
    background: isPos ? C.positiveDim : C.negativeDim,
    border: "1px solid " + (isPos ? "rgba(0,155,95,0.22)" : "rgba(208,35,75,0.22)"),
    borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" as const,
    fontVariantNumeric: "tabular-nums",
  }), [isPos]);
  const fmt = (p: number) => p >= 1000 ? "$" + p.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : p < 0.01 ? "$" + p.toFixed(6) : "$" + p.toFixed(4);
  return (
    <div style={rowSt} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <span style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, textAlign: "right" as const }}>{rank}</span>
      <div style={{ display: "flex", flexDirection: "column" as const, minWidth: 0 }}>
        <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{mover.symbol}</span>
        <span style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{mover.name}</span>
      </div>
      <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: C.textSecondary, fontVariantNumeric: "tabular-nums" }}>{fmt(mover.price)}</span>
      <span style={badgeSt}>{isPos ? "+" : ""}{mover.change24h.toFixed(2)}%</span>
    </div>
  );
});
MoverRow.displayName = "MoverRow";

// ─── SectionPanel ─────────────────────────────────────────────────────────────

const SectionPanel = memo(({ title, titleColor, movers, onRetry }: {
  title: string; titleColor: string; movers: TopMover[]; onRetry: () => void;
}) => (
  <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, boxShadow: C.shadow, overflow: "hidden" as const }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid " + C.borderFaint, background: "rgba(248,249,252,0.6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: titleColor }} />
        <span style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: titleColor }}>{title}</span>
      </div>
      <span style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint }}>24H</span>
    </div>
    {movers.length === 0 ? (
      <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "36px 20px", gap: 10 }}>
        <span style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted }}>Data unavailable</span>
        <button onClick={onRetry} style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>↻ Retry</button>
      </div>
    ) : movers.map((m, i) => <MoverRow key={m.symbol} mover={m} rank={i + 1} />)}
  </div>
));
SectionPanel.displayName = "SectionPanel";

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

const LoadingSkeleton = memo(({ cols }: { cols: string }) => (
  <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{ height: 88, borderRadius: 10, background: "rgba(15,40,100,0.05)" }} />
      ))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div style={{ height: 290, borderRadius: 10, background: "rgba(15,40,100,0.05)" }} />
      <div style={{ height: 290, borderRadius: 10, background: "rgba(15,40,100,0.05)" }} />
    </div>
  </div>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const [data, setData]        = useState<DashboardData | null>(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState<string | null>(null);
  const mountedRef             = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const ctrl = new AbortController();
    try {
      const fetchOk = async (url: string) => {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r;
      };
      const [gRes, fRes, mRes] = await Promise.all([
        fetchOk("https://api.coingecko.com/api/v3/global"),
        fetchOk("https://api.alternative.me/fng/?limit=1"),
        fetchOk("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=24h"),
      ]);
      if (!mountedRef.current) return;
      const [gJson, fJson, mJson] = await Promise.all([
        gRes.json() as Promise<CGGlobalResponse>,
        fRes.json() as Promise<FnGResponse>,
        mRes.json() as Promise<CGMarketCoin[]>,
      ]);
      if (!mountedRef.current) return;
      const g = gJson.data;
      const movers = mJson.map(t => ({ symbol: t.symbol.toUpperCase(), name: t.name, price: t.current_price, change24h: t.price_change_percentage_24h ?? 0 }));
      const sorted = [...movers].sort((a, b) => b.change24h - a.change24h);
      setData({
        global: {
          totalMarketCap: g.total_market_cap.usd,
          btcDominance: g.market_cap_percentage.btc,
          ethDominance: g.market_cap_percentage.eth,
          totalVolume24h: g.total_volume.usd,
          mcapChange24h: g.market_cap_change_percentage_24h_usd,
          fngValue: parseInt(fJson.data[0].value, 10),
          fngLabel: fJson.data[0].value_classification,
          lastUpdated: Date.now(),
        },
        topGainers: sorted.slice(0, 5),
        topLosers: sorted.slice(-5).reverse(),
      });
    } catch (e) {
      if (!mountedRef.current) return;
      if ((e as Error).name === "AbortError") return;
      setError("Failed to load: " + ((e instanceof Error) ? e.message : "Unknown error"));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    const iv = setInterval(() => { if (mountedRef.current) fetchData(); }, 60_000);
    return () => { mountedRef.current = false; clearInterval(iv); };
  }, [fetchData]);

  const lastUpdStr = useMemo(() => {
    if (!data?.global.lastUpdated) return "—";
    const s = Math.floor((Date.now() - data.global.lastUpdated) / 1000);
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    return Math.floor(s / 3600) + "h ago";
  }, [data]);

  const fmtBig = useCallback((n: number) => {
    if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2)  + "B";
    return "$" + (n / 1e6).toFixed(0) + "M";
  }, []);

  const pageSt = useMemo(() => Object.freeze({
    background: C.bgBase, minHeight: "100vh", fontFamily: FONT,
    padding: isMobile ? "16px 12px" : "20px 20px",
  }), [isMobile]);

  const metCols = isMobile ? "repeat(2,1fr)" : isTablet ? "repeat(3,1fr)" : "repeat(5,1fr)";

  return (
    <div style={pageSt}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 22, borderRadius: 2, background: C.accent }} />
            <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: "-0.01em", color: C.textPrimary, margin: 0 }}>Dashboard</h1>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.textFaint, margin: "5px 0 0 13px" }}>
            Market overview · Updated {lastUpdStr}
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 6, padding: "7px 14px", cursor: "pointer", flexShrink: 0 }}
        >↻ Refresh</button>
      </div>

      {loading && <LoadingSkeleton cols={metCols} />}

      {!loading && error && (
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "64px 24px", gap: 12 }}>
          <span style={{ fontFamily: FONT, fontSize: "12px", color: C.negative, textAlign: "center" as const }}>{error}</span>
          <button onClick={fetchData} style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 6, padding: "7px 16px", cursor: "pointer" }}>↻ Retry</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: metCols, gap: 10, marginBottom: 12 }}>
            <StatCard label="Total Market Cap"  value={fmtBig(data.global.totalMarketCap)} change={data.global.mcapChange24h} topColor={C.accent} />
            <StatCard label="24H Volume"         value={fmtBig(data.global.totalVolume24h)} topColor="rgba(55,65,110,0.7)" />
            <StatCard label="BTC Dominance"      value={data.global.btcDominance.toFixed(1) + "%"} sub="of total market cap" topColor="rgba(195,125,0,1)" />
            <StatCard label="ETH Dominance"      value={data.global.ethDominance.toFixed(1) + "%"} sub="of total market cap" topColor="rgba(15,40,180,0.85)" />
            <StatCard label="" topColor="rgba(195,125,0,1)">
              <FearGreedGauge value={data.global.fngValue} label={data.global.fngLabel} />
            </StatCard>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <SectionPanel title="Top Gainers" titleColor={C.positive} movers={data.topGainers} onRetry={fetchData} />
            <SectionPanel title="Top Losers"  titleColor={C.negative} movers={data.topLosers}  onRetry={fetchData} />
          </div>
        </>
      )}

      {!loading && !error && !data && (
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "64px 24px", gap: 10 }}>
          <span style={{ fontFamily: FONT, fontSize: "12px", color: C.textMuted }}>No data available.</span>
          <button onClick={fetchData} style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>↻ Retry</button>
        </div>
      )}
    </div>
  );
});
Dashboard.displayName = "Dashboard";
export default Dashboard;
