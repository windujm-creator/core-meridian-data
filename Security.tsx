/**
 * Security.tsx — ZERØ MERIDIAN 2026 push110
 * push110: Responsive polish — mobile 320px + desktop 1440px
 * - useBreakpoint ✓  metrics responsive grid ✓  table overflowX scroll ✓
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

const FILTERS = Object.freeze(["ALL","CRITICAL","HIGH","MEDIUM","LOW"] as const);
type FilterType = typeof FILTERS[number];

interface SecurityEvent {
  id: string;
  severity: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW";
  type: string;
  message: string;
  source: string;
  ts: number;
}

interface SecurityMetric {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
}

interface SecurityData {
  events: SecurityEvent[];
  metrics: SecurityMetric[];
  lastUpdated: number;
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps { metric: SecurityMetric; }
const MetricCard = memo(({ metric }: MetricCardProps) => {
  const s = useMemo(() => ({
    card: {
      background: C.cardBg,
      border: `1px solid ${C.glassBorder}`,
      borderRadius: 12,
      padding: 16,
      display: "flex" as const,
      flexDirection: "column" as const,
      gap: 8,
    },
    label: { fontFamily: FONT, fontSize: 9, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.textFaint },
    value: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textPrimary },
    delta: { fontFamily: FONT, fontSize: 10, fontWeight: 400, color: metric.deltaPositive ? C.positive : C.negative },
  }), [metric.deltaPositive]);

  return (
    <div style={s.card}>
      <span style={s.label}>{metric.label}</span>
      <span style={s.value}>{metric.value}</span>
      <span style={s.delta}>{metric.delta}</span>
    </div>
  );
});
MetricCard.displayName = "MetricCard";

// ─── EventRow ─────────────────────────────────────────────────────────────────

interface EventRowProps { event: SecurityEvent; }
const EventRow = memo(({ event }: EventRowProps) => {
  const [hovered, setHovered] = useState(false);
  const onEnter = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => setHovered(false), []);

  const severityColor = useMemo(() => ({
    CRITICAL: C.negative,
    HIGH:     "rgba(255,140,0,1)",
    MEDIUM:   C.warning,
    LOW:      C.textFaint,
  }[event.severity]), [event.severity]);

  const rowStyle = useMemo(() => ({
    display: "grid" as const,
    gridTemplateColumns: "80px 72px 1fr 100px 80px",
    gap: 12,
    padding: "0 16px",
    height: 52,
    alignItems: "center" as const,
    borderBottom: `1px solid ${C.glassBorder}`,
    background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
    transition: "background 0.15s ease",
    cursor: "default",
    minWidth: "500px",
  }), [hovered]);

  const badgeStyle = useMemo(() => ({
    fontFamily: FONT,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: severityColor,
    background: `${severityColor}18`,
    borderRadius: 4,
    padding: "2px 6px",
    textAlign: "center" as const,
    display: "inline-block",
  }), [severityColor]);

  const ts = useMemo(() => new Date(event.ts).toLocaleTimeString("en-US", { hour12: false }), [event.ts]);

  return (
    <div style={rowStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>{ts}</span>
      <span style={badgeStyle}>{event.severity}</span>
      <span style={{ fontFamily: FONT, fontSize: 11, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.message}</span>
      <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint }}>{event.type}</span>
      <span style={{ fontFamily: FONT, fontSize: 10, color: C.accent, opacity: 0.7 }}>{event.source}</span>
    </div>
  );
});
EventRow.displayName = "EventRow";

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps { filter: FilterType; }
const EmptyState = memo(({ filter }: EmptyStateProps) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 12 }}>
    <span style={{ fontSize: 32, opacity: 0.25 }}>🛡</span>
    <span style={{ fontFamily: FONT, fontSize: 12, color: C.textFaint, textAlign: "center" }}>
      {filter === "ALL" ? "No security events detected." : `No ${filter} severity events.`}
    </span>
    <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, opacity: 0.6 }}>All systems operating within normal parameters.</span>
  </div>
));
EmptyState.displayName = "EmptyState";

// ─── Security (Main) ──────────────────────────────────────────────────────────

const Security = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.example.com/security/events");
      if (!mountedRef.current) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SecurityData = await res.json();
      if (!mountedRef.current) return;
      setData(json);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(`Failed to load security data: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  const filteredEvents = useMemo(() =>
    filter === "ALL" ? (data?.events ?? []) : (data?.events ?? []).filter(e => e.severity === filter),
    [data, filter]
  );

  const lastUpdatedStr = useMemo(() => {
    if (!data?.lastUpdated) return "—";
    const diff = Math.floor((Date.now() - data.lastUpdated) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [data]);

  const makeFilterStyle = useCallback((f: FilterType) => ({
    fontFamily: FONT,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: f === filter ? C.bgBase : C.textFaint,
    background: f === filter ? C.accent : "transparent",
    border: `1px solid ${f === filter ? C.accent : C.glassBorder}`,
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
  }), [filter]);

  const pageStyle = useMemo(() => ({
    background: C.bgBase, minHeight: "100vh", color: C.textPrimary, fontFamily: FONT,
    padding: isMobile ? "16px 12px" : "20px 16px",
  }), [isMobile]);

  const cardStyle = useMemo(() => ({
    background: C.glassBg, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: "hidden" as const,
  }), []);

  // metrics: mobile=2col, tablet=2col, desktop=4col
  const metricsGridCols = isMobile ? "repeat(2,1fr)" : isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)";

  const handleRefresh = useCallback(() => fetchData(), [fetchData]);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 16 : 20, fontWeight: 700, letterSpacing: "0.06em", color: C.textPrimary, margin: 0 }}>Security</h1>
          <p style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint, margin: "6px 0 0" }}>Threat monitoring · Incident feed</p>
        </div>
        <button
          style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(0,238,255,0.08)", border: "1px solid rgba(0,238,255,0.2)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}
          onClick={handleRefresh}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Metrics — responsive grid */}
      {data && data.metrics.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: metricsGridCols, gap: 12, marginBottom: 20 }}>
          {data.metrics.map(m => <MetricCard key={m.label} metric={m} />)}
        </div>
      )}

      {/* Event Log Card */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.glassBorder}` }}>
          <span style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint }}>Security Events</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>Updated {lastUpdatedStr}</span>
        </div>

        {/* Filters — wrap on mobile */}
        <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${C.glassBorder}`, flexWrap: "wrap" as const }}>
          {FILTERS.map(f => (
            <button key={f} style={makeFilterStyle(f)} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ padding: "40px 24px", textAlign: "center", fontFamily: FONT, fontSize: 11, color: C.textFaint }}>
            Loading security events...
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
          /* overflowX scroll wrapper for mobile */
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 72px 1fr 100px 80px", gap: 12, padding: "8px 16px", borderBottom: `1px solid rgba(255,255,255,0.1)`, minWidth: "500px" }}>
              {["Time","Severity","Message","Type","Source"].map(h => (
                <span key={h} style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textFaint }}>{h}</span>
              ))}
            </div>
            {filteredEvents.length === 0
              ? <EmptyState filter={filter} />
              : filteredEvents.map(e => <EventRow key={e.id} event={e} />)
            }
          </div>
        )}
      </div>
    </div>
  );
});
Security.displayName = "Security";

export default Security;
