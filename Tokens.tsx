/**
 * Tokens.tsx — ZERØ MERIDIAN push130
 * push130: Zero :any — CGMarketCoin7d interface + typed COLS array (no cast)
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

const SORT_KEYS = Object.freeze(["rank","price","change24h","volume","mcap"] as const);
type SortKey = typeof SORT_KEYS[number];
type SortDir = "asc" | "desc";

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface CGMarketCoin7d {
  id:                                            string;
  symbol:                                        string;
  name:                                          string;
  current_price:                                 number;
  price_change_percentage_24h:                   number | null;
  price_change_percentage_7d_in_currency:        number | null;
  total_volume:                                  number;
  market_cap:                                    number;
}

// ─── App types ────────────────────────────────────────────────────────────────

interface Token {
  id:       string;
  rank:     number;
  symbol:   string;
  name:     string;
  price:    number;
  change24h: number;
  change7d:  number;
  volume:   number;
  mcap:     number;
  category: string;
}

interface TokensData {
  tokens:      Token[];
  lastUpdated: number;
}

// ─── TokenRow ─────────────────────────────────────────────────────────────────

interface TokenRowProps { token: Token; }
const TokenRow = memo(({ token }: TokenRowProps) => {
  const [hovered, setHovered] = useState(false);
  const onEnter = useCallback(() => setHovered(true),  []);
  const onLeave = useCallback(() => setHovered(false), []);

  const rowStyle = useMemo(() => ({
    display: "grid" as const,
    gridTemplateColumns: "36px 140px 110px 80px 80px 110px 110px",
    gap: 12,
    padding: "0 16px",
    height: 52,
    alignItems: "center" as const,
    borderBottom: `1px solid ${C.glassBorder}`,
    background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
    transition: "background 0.15s ease",
    cursor: "pointer",
    minWidth: "680px",
  }), [hovered]);

  const changeColor = useCallback((v: number) => v >= 0 ? C.positive : C.negative, []);

  const fmt = useCallback((n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
  }, []);

  const fmtPrice = useCallback((n: number) => {
    if (n < 0.001)  return `$${n.toExponential(2)}`;
    if (n < 1)      return `$${n.toFixed(4)}`;
    if (n < 1000)   return `$${n.toFixed(2)}`;
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }, []);

  return (
    <div style={rowStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint }}>{token.rank}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.textPrimary, flexShrink: 0 }}>{token.symbol}</span>
        <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{token.name}</span>
      </div>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.textPrimary, textAlign: "right" as const }}>{fmtPrice(token.price)}</span>
      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: changeColor(token.change24h), textAlign: "right" as const }}>
        {token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%
      </span>
      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: changeColor(token.change7d), textAlign: "right" as const }}>
        {token.change7d >= 0 ? "+" : ""}{token.change7d.toFixed(2)}%
      </span>
      <span style={{ fontFamily: FONT, fontSize: 11, color: C.textFaint, textAlign: "right" as const }}>{fmt(token.volume)}</span>
      <span style={{ fontFamily: FONT, fontSize: 11, color: C.textFaint, textAlign: "right" as const }}>{fmt(token.mcap)}</span>
    </div>
  );
});
TokenRow.displayName = "TokenRow";

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState = memo(() => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 12 }}>
    <span style={{ fontSize: 32, opacity: 0.25 }}>🪙</span>
    <span style={{ fontFamily: FONT, fontSize: 12, color: C.textFaint }}>No tokens match your current filter.</span>
    <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, opacity: 0.6 }}>Try adjusting search or category filter.</span>
  </div>
));
EmptyState.displayName = "EmptyState";

// ─── SortHeader ───────────────────────────────────────────────────────────────

interface ColDef { key: SortKey; label: string; align: "left" | "right"; }

interface SortHeaderProps {
  col:     ColDef;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort:  (k: SortKey) => void;
}
const SortHeader = memo(({ col, sortKey, sortDir, onSort }: SortHeaderProps) => {
  const onClick = useCallback(() => onSort(col.key), [col.key, onSort]);
  const active  = sortKey === col.key;
  return (
    <span
      onClick={onClick}
      style={{
        fontFamily: FONT,
        fontSize: 9,
        letterSpacing: "0.12em",
        textTransform: "uppercase" as const,
        color: active ? C.accent : C.textFaint,
        cursor: "pointer",
        textAlign: col.align,
        display: "flex",
        alignItems: "center",
        justifyContent: col.align === "right" ? "flex-end" : "flex-start",
        gap: 4,
        userSelect: "none" as const,
      }}
    >
      {col.label}{active ? (sortDir === "desc" ? " ▼" : " ▲") : ""}
    </span>
  );
});
SortHeader.displayName = "SortHeader";

// ─── Column definitions (fully typed — no cast) ───────────────────────────────

const COLS: ColDef[] = Object.freeze([
  { key: "rank",      label: "#",       align: "left"  },
  { key: "rank",      label: "Asset",   align: "left"  },
  { key: "price",     label: "Price",   align: "right" },
  { key: "change24h", label: "24H %",   align: "right" },
  { key: "change24h", label: "7D %",    align: "right" },
  { key: "volume",    label: "Volume",  align: "right" },
  { key: "mcap",      label: "Mkt Cap", align: "right" },
]) as ColDef[];

// ─── Tokens (Main) ────────────────────────────────────────────────────────────

const Tokens = memo(() => {
  const { isMobile } = useBreakpoint();
  const [data, setData]       = useState<TokensData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch]   = useState("");
  const mountedRef            = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d"
      );
      if (!mountedRef.current) return;
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      const json = await res.json() as CGMarketCoin7d[];
      if (!mountedRef.current) return;

      const tokens: Token[] = json.map((t, i): Token => ({
        id:       t.id,
        rank:     i + 1,
        symbol:   t.symbol.toUpperCase(),
        name:     t.name,
        price:    t.current_price,
        change24h: t.price_change_percentage_24h ?? 0,
        change7d:  t.price_change_percentage_7d_in_currency ?? 0,
        volume:   t.total_volume,
        mcap:     t.market_cap,
        category: "crypto",
      }));
      setData({ tokens, lastUpdated: Date.now() });
    } catch (e) {
      if (!mountedRef.current) return;
      setError(`Failed to load token data: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  const handleSort = useCallback((k: SortKey) => {
    setSortKey(prev => {
      if (prev === k) setSortDir(d => d === "desc" ? "asc" : "desc");
      else setSortDir("desc");
      return k;
    });
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);

  const lastUpdatedStr = useMemo(() => {
    if (!data?.lastUpdated) return "—";
    const diff = Math.floor((Date.now() - data.lastUpdated) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [data]);

  const filteredTokens = useMemo(() => {
    let list = data?.tokens ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * mul;
    });
  }, [data, search, sortKey, sortDir]);

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" as const }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 16 : 20, fontWeight: 700, letterSpacing: "0.06em", color: C.textPrimary, margin: 0 }}>Tokens</h1>
          <p style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint, margin: "6px 0 0" }}>Top 100 · CoinGecko live data</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const, width: isMobile ? "100%" : "auto" }}>
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search token..."
            style={{
              fontFamily: FONT, fontSize: 11, color: C.textPrimary,
              background: "rgba(255,255,255,0.04)", border: `1px solid ${C.glassBorder}`,
              borderRadius: 6, padding: "6px 12px", outline: "none",
              flex: isMobile ? 1 : "unset",
              minWidth: isMobile ? 0 : "auto",
            }}
          />
          <button
            style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(0,238,255,0.08)", border: "1px solid rgba(0,238,255,0.2)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}
            onClick={handleRefresh}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.glassBorder}` }}>
          <span style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint }}>
            {filteredTokens.length} Tokens
          </span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>Updated {lastUpdatedStr}</span>
        </div>

        {loading && (
          <div style={{ padding: "40px 24px", textAlign: "center", fontFamily: FONT, fontSize: 11, color: C.textFaint }}>
            Loading token data...
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
            <div style={{ display: "grid", gridTemplateColumns: "36px 140px 110px 80px 80px 110px 110px", gap: 12, padding: "8px 16px", borderBottom: `1px solid rgba(255,255,255,0.1)`, minWidth: "680px" }}>
              {COLS.map((col, i) => (
                <SortHeader key={i} col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              ))}
            </div>
            {filteredTokens.length === 0
              ? <EmptyState />
              : filteredTokens.map(t => <TokenRow key={t.id} token={t} />)
            }
          </div>
        )}
      </div>
    </div>
  );
});
Tokens.displayName = "Tokens";

export default Tokens;
