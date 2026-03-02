/**
 * Derivatives.tsx — ZERØ MERIDIAN push130
 * push130: Zero :any — BinancePremiumIndex + BinanceOIItem interfaces
 * push110: Responsive polish — mobile 320px + desktop 1440px
 * - useBreakpoint ✓  React.memo + displayName ✓
 * - rgba() only ✓  Zero className ✓  Zero hex color ✓  Zero :any ✓
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

const PAIRS = Object.freeze(["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT"]);

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface BinancePremiumIndex {
  symbol:          string;
  markPrice:       string;
  indexPrice:      string;
  lastFundingRate: string;
  nextFundingTime: number;
}

interface BinanceOIItem {
  symbol:       string;
  openInterest: string;
}

// ─── App types ────────────────────────────────────────────────────────────────

interface FundingRate {
  symbol:         string;
  fundingRate:    number;
  nextFundingTime: number;
  markPrice:      number;
  indexPrice:     number;
  openInterest:   number;
  openInterestUsd: number;
}

interface DerivativesData {
  rates:       FundingRate[];
  lastUpdated: number;
}

// ─── FundingRow ───────────────────────────────────────────────────────────────

interface FundingRowProps { rate: FundingRate; }
const FundingRow = memo(({ rate }: FundingRowProps) => {
  const [hovered, setHovered] = useState(false);
  const onEnter = useCallback(() => setHovered(true),  []);
  const onLeave = useCallback(() => setHovered(false), []);

  const fundingColor = useMemo(() => {
    if (rate.fundingRate >  0.001) return C.positive;
    if (rate.fundingRate < -0.001) return C.negative;
    return C.textFaint;
  }, [rate.fundingRate]);

  const nextFunding = useMemo(() => {
    const diff = Math.max(0, rate.nextFundingTime - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }, [rate.nextFundingTime]);

  const rowStyle = useMemo(() => ({
    display: "grid" as const,
    gridTemplateColumns: "100px 110px 110px 100px 120px 100px",
    gap: 12,
    padding: "0 16px",
    height: 52,
    alignItems: "center" as const,
    borderBottom: `1px solid ${C.glassBorder}`,
    background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
    transition: "background 0.15s ease",
    minWidth: "660px",
  }), [hovered]);

  const fmtUsd = useCallback((n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
  }, []);

  return (
    <div style={rowStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{rate.symbol.replace("USDT","")}</span>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.textPrimary, textAlign: "right" as const }}>
        ${rate.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: fundingColor, textAlign: "right" as const }}>
        {(rate.fundingRate * 100).toFixed(4)}%
      </span>
      <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, textAlign: "right" as const }}>{nextFunding}</span>
      <span style={{ fontFamily: FONT, fontSize: 11, color: C.textFaint, textAlign: "right" as const }}>{fmtUsd(rate.openInterestUsd)}</span>
      <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, textAlign: "right" as const }}>
        {(Math.abs(rate.markPrice - rate.indexPrice) / rate.indexPrice * 100).toFixed(3)}%
      </span>
    </div>
  );
});
FundingRow.displayName = "FundingRow";

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps { onRetry: () => void; }
const EmptyState = memo(({ onRetry }: EmptyStateProps) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 12 }}>
    <span style={{ fontSize: 32, opacity: 0.25 }}>📉</span>
    <span style={{ fontFamily: FONT, fontSize: 12, color: C.textFaint }}>No derivatives data available.</span>
    <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, opacity: 0.6 }}>Binance Futures API may be temporarily unavailable.</span>
    <button
      onClick={onRetry}
      style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(0,238,255,0.08)", border: "1px solid rgba(0,238,255,0.2)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
    >
      Retry
    </button>
  </div>
));
EmptyState.displayName = "EmptyState";

// ─── Derivatives (Main) ───────────────────────────────────────────────────────

const Derivatives = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const [data, setData]       = useState<DerivativesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const mountedRef            = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundingRes, oiRes] = await Promise.all([
        fetch("https://fapi.binance.com/fapi/v1/premiumIndex"),
        fetch("https://fapi.binance.com/fapi/v1/openInterest?" + PAIRS.map(p => `symbol=${p}`).join("&")),
      ]);
      if (!mountedRef.current) return;
      if (!fundingRes.ok) throw new Error(`Binance HTTP ${fundingRes.status}`);

      const [fundingJson, oiJson] = await Promise.all([
        fundingRes.json() as Promise<BinancePremiumIndex[]>,
        oiRes.json()      as Promise<BinanceOIItem | BinanceOIItem[]>,
      ]);
      if (!mountedRef.current) return;

      const oiMap: Record<string, number> = {};
      const oiArr = Array.isArray(oiJson) ? oiJson : [oiJson];
      oiArr.forEach(o => { oiMap[o.symbol] = parseFloat(o.openInterest); });

      const rates: FundingRate[] = fundingJson
        .filter(f => PAIRS.includes(f.symbol))
        .map(f => {
          const mp = parseFloat(f.markPrice);
          const ip = parseFloat(f.indexPrice);
          const oi = oiMap[f.symbol] ?? 0;
          return {
            symbol:          f.symbol,
            fundingRate:     parseFloat(f.lastFundingRate),
            nextFundingTime: f.nextFundingTime,
            markPrice:       mp,
            indexPrice:      ip,
            openInterest:    oi,
            openInterestUsd: oi * mp,
          };
        })
        .sort((a, b) => b.openInterestUsd - a.openInterestUsd);

      setData({ rates, lastUpdated: Date.now() });
    } catch (e) {
      if (!mountedRef.current) return;
      setError(`Failed to load derivatives data: ${e instanceof Error ? e.message : "Unknown error"}`);
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
    if (!data?.lastUpdated) return "—";
    const diff = Math.floor((Date.now() - data.lastUpdated) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [data]);

  const avgFunding = useMemo(() => {
    if (!data?.rates.length) return null;
    const avg = data.rates.reduce((s, r) => s + r.fundingRate, 0) / data.rates.length;
    return (avg * 100).toFixed(4);
  }, [data]);

  const totalOI = useMemo(() => {
    if (!data?.rates.length) return null;
    const tot = data.rates.reduce((s, r) => s + r.openInterestUsd, 0);
    if (tot >= 1e9) return `$${(tot / 1e9).toFixed(2)}B`;
    return `$${(tot / 1e6).toFixed(2)}M`;
  }, [data]);

  const pageStyle = useMemo(() => ({
    background: C.bgBase, minHeight: "100vh", color: C.textPrimary, fontFamily: FONT,
    padding: isMobile ? "16px 12px" : "20px 16px",
  }), [isMobile]);

  const cardStyle = useMemo(() => ({
    background: C.glassBg, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: "hidden" as const,
  }), []);

  const summaryGridCols = isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(3,1fr)";

  const handleRefresh = useCallback(() => fetchData(), [fetchData]);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 16 : 20, fontWeight: 700, letterSpacing: "0.06em", color: C.textPrimary, margin: 0 }}>Derivatives</h1>
          <p style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint, margin: "6px 0 0" }}>
            Funding rates · Open interest · Updated {lastUpdatedStr}
          </p>
        </div>
        <button
          style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(0,238,255,0.08)", border: "1px solid rgba(0,238,255,0.2)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}
          onClick={handleRefresh}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Summary cards */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: summaryGridCols, gap: 12, marginBottom: 20 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textFaint }}>Avg Funding Rate</span>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{avgFunding ?? "—"}%</span>
            <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>8h average across {data.rates.length} pairs</span>
          </div>
          <div style={{ background: C.cardBg, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textFaint }}>Total Open Interest</span>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{totalOI ?? "—"}</span>
            <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>Binance Futures USDT-M</span>
          </div>
          <div style={{ background: C.cardBg, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textFaint }}>Auto-refresh</span>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.accent }}>60s</span>
            <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>Live Binance Futures API</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.glassBorder}` }}>
          <span style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint }}>Perpetual Contracts</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>Updated {lastUpdatedStr}</span>
        </div>

        {loading && (
          <div style={{ padding: "40px 24px", textAlign: "center", fontFamily: FONT, fontSize: 11, color: C.textFaint }}>
            Loading derivatives data...
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: FONT, fontSize: 12, color: C.negative, textAlign: "center" }}>{error}</span>
            <button
              style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.textPrimary, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}
              onClick={fetchData}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <div style={{ display: "grid", gridTemplateColumns: "100px 110px 110px 100px 120px 100px", gap: 12, padding: "8px 16px", borderBottom: `1px solid rgba(255,255,255,0.1)`, minWidth: "660px" }}>
              {(["Symbol","Mark Price","Funding","Next In","Open Interest","Basis"] as const).map(h => (
                <span key={h} style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textFaint, textAlign: h !== "Symbol" ? "right" as const : "left" as const }}>{h}</span>
              ))}
            </div>
            {(data?.rates ?? []).length === 0
              ? <EmptyState onRetry={fetchData} />
              : (data!.rates).map(r => <FundingRow key={r.symbol} rate={r} />)
            }
          </div>
        )}
      </div>
    </div>
  );
});
Derivatives.displayName = "Derivatives";

export default Derivatives;
