/**
 * SmartMoney.tsx — ZERØ MERIDIAN 2026 push110
 * push110: Responsive polish — mobile 320px + desktop 1440px
 * - useBreakpoint ✓  table overflowX scroll on mobile ✓
 * - React.memo + displayName ✓
 * - rgba() only ✓  Zero className ✓  Zero hex color ✓
 * - JetBrains Mono only ✓
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

const TABS = Object.freeze(["Whale Flows","Whale Wallets","Smart Positions"] as const);
type TabType = typeof TABS[number];

interface WhaleFlow {
  id: string;
  symbol: string;
  side: "BUY"|"SELL";
  amount: number;
  amountUsd: number;
  from: string;
  to: string;
  ts: number;
  chain: string;
}

interface SmartMoneyData {
  flows: WhaleFlow[];
  lastUpdated: number;
}

// ─── FlowRow ──────────────────────────────────────────────────────────────────

interface FlowRowProps { flow: WhaleFlow; }
const FlowRow = memo(({ flow }: FlowRowProps) => {
  const [hovered, setHovered] = useState(false);
  const onEnter = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => setHovered(false), []);

  const sideColor = flow.side === "BUY" ? C.positive : C.negative;
  const rowStyle = useMemo(() => ({
    display: "grid" as const,
    gridTemplateColumns: "60px 52px 100px 1fr 1fr 70px",
    gap: 12,
    padding: "0 16px",
    height: 52,
    alignItems: "center" as const,
    borderBottom: `1px solid ${C.glassBorder}`,
    background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
    transition: "background 0.15s ease",
    minWidth: "500px",
  }), [hovered]);

  const badgeStyle = useMemo(() => ({
    fontFamily: FONT,
    fontSize: 9,
    fontWeight: 700,
    color: sideColor,
    background: `${sideColor}18`,
    borderRadius: 4,
    padding: "2px 6px",
    textAlign: "center" as const,
    display: "inline-block",
  }), [sideColor]);

  const ts = useMemo(() => {
    const diff = Math.floor((Date.now() - flow.ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  }, [flow.ts]);

  const fmt = useCallback((n: number) => {
    if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }, []);

  return (
    <div style={rowStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{flow.symbol}</span>
      <span style={badgeStyle}>{flow.side}</span>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: sideColor }}>{fmt(flow.amountUsd)}</span>
      <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{flow.from}</span>
      <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{flow.to}</span>
      <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>{ts}</span>
    </div>
  );
});
FlowRow.displayName = "FlowRow";

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState = memo(() => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 12 }}>
    <span style={{ fontSize: 32, opacity: 0.25 }}>🐋</span>
    <span style={{ fontFamily: FONT, fontSize: 12, color: C.textFaint }}>No whale flows detected in this window.</span>
    <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, opacity: 0.6 }}>Flows appear as on-chain data is indexed.</span>
  </div>
));
EmptyState.displayName = "EmptyState";

// ─── SmartMoney (Main) ────────────────────────────────────────────────────────

const SmartMoney = memo(() => {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<TabType>("Whale Flows");
  const [data, setData] = useState<SmartMoneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.etherscan.io/v2/api?module=account&action=txlist&address=0x&sort=desc");
      if (!mountedRef.current) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!mountedRef.current) return;
      setData({ flows: json.result ?? [], lastUpdated: Date.now() });
    } catch (e) {
      if (!mountedRef.current) return;
      setError(`Failed to load whale data: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  const lastUpdatedStr = useMemo(() => {
    if (!data?.lastUpdated) return "—";
    const diff = Math.floor((Date.now() - data.lastUpdated) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  }, [data]);

  const makeTabStyle = useCallback((t: TabType) => ({
    fontFamily: FONT,
    fontSize: isMobile ? 9 : 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: t === activeTab ? C.accent : C.textFaint,
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${t === activeTab ? C.accent : "transparent"}`,
    padding: isMobile ? "8px 10px" : "8px 14px",
    cursor: "pointer",
    transition: "color 0.15s ease",
    whiteSpace: "nowrap" as const,
  }), [activeTab, isMobile]);

  const pageStyle = useMemo(() => ({
    background: C.bgBase, minHeight: "100vh", color: C.textPrimary, fontFamily: FONT,
    padding: isMobile ? "16px 12px" : "20px 16px",
  }), [isMobile]);

  const cardStyle = useMemo(() => ({
    background: C.glassBg, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: "hidden" as const,
  }), []);

  const handleRefresh = useCallback(() => fetchData(), [fetchData]);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 16 : 20, fontWeight: 700, letterSpacing: "0.06em", color: C.textPrimary, margin: 0 }}>Smart Money</h1>
          <p style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint, margin: "6px 0 0" }}>Whale flows · On-chain intelligence</p>
        </div>
        <button
          style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(0,238,255,0.08)", border: "1px solid rgba(0,238,255,0.2)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}
          onClick={handleRefresh}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Main Card */}
      <div style={cardStyle}>
        {/* Card Header — tabs scrollable on mobile */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: `1px solid ${C.glassBorder}`, overflowX: "auto" as const }}>
          <div style={{ display: "flex", gap: 0, flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t} style={makeTabStyle(t)} onClick={() => setActiveTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint, flexShrink: 0, paddingLeft: 12 }}>Updated {lastUpdatedStr}</span>
        </div>

        {loading && (
          <div style={{ padding: "40px 24px", textAlign: "center", fontFamily: FONT, fontSize: 11, color: C.textFaint }}>
            Loading whale data...
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

        {!loading && !error && activeTab === "Whale Flows" && (
          /* overflowX scroll wrapper for mobile */
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 52px 100px 1fr 1fr 70px", gap: 12, padding: "8px 16px", borderBottom: `1px solid rgba(255,255,255,0.1)`, minWidth: "500px" }}>
              {["Symbol","Side","USD Value","From","To","Time"].map(h => (
                <span key={h} style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textFaint }}>{h}</span>
              ))}
            </div>
            {(data?.flows ?? []).length === 0
              ? <EmptyState />
              : (data!.flows as WhaleFlow[]).map(f => <FlowRow key={f.id} flow={f} />)
            }
          </div>
        )}

        {!loading && !error && activeTab !== "Whale Flows" && (
          <EmptyState />
        )}
      </div>
    </div>
  );
});
SmartMoney.displayName = "SmartMoney";

export default SmartMoney;
