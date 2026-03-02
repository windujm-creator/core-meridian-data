/**
 * Intelligence.tsx — ZERØ MERIDIAN push130
 * push130: Zero :any — CCNewsItem + CPNewsItem + CPCurrency interfaces
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

const CATEGORIES = Object.freeze(["All","Bitcoin","Ethereum","DeFi","Regulation","Macro"] as const);
type CategoryType = typeof CATEGORIES[number];

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface CCSourceInfo { name?: string; }
interface CCNewsItem {
  id?:          number | string;
  title?:       string;
  url?:         string;
  source?:      string;
  source_info?: CCSourceInfo;
  published_on?: number;
  categories?:  string;
}
interface CCResponse { Data?: CCNewsItem[]; }

interface CPCurrency { code?: string; }
interface CPVotes    { positive?: number; negative?: number; }
interface CPSource   { title?: string; }
interface CPNewsItem {
  id?:           number | string;
  title?:        string;
  url?:          string;
  source?:       CPSource;
  published_at?: string;
  votes?:        CPVotes;
  currencies?:   CPCurrency[];
}
interface CPResponse { results?: CPNewsItem[]; }

// ─── App types ────────────────────────────────────────────────────────────────

interface NewsItem {
  id:          string;
  title:       string;
  source:      string;
  url:         string;
  publishedAt: number;
  sentiment:   "positive" | "negative" | "neutral";
  votes:       { positive: number; negative: number; };
  currencies:  string[];
}

interface IntelligenceData {
  news:        NewsItem[];
  lastUpdated: number;
}

// ─── SentimentBadge ───────────────────────────────────────────────────────────

interface SentimentBadgeProps { sentiment: NewsItem["sentiment"]; }
const SentimentBadge = memo(({ sentiment }: SentimentBadgeProps) => {
  const color = useMemo(() => ({
    positive: C.positive,
    negative: C.negative,
    neutral:  C.textFaint,
  })[sentiment], [sentiment]);
  return (
    <span style={{
      fontFamily: FONT, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
      color, background: `${color}18`, borderRadius: 4,
      padding: "2px 6px", display: "inline-block", flexShrink: 0,
    }}>
      {sentiment.toUpperCase()}
    </span>
  );
});
SentimentBadge.displayName = "SentimentBadge";

// ─── NewsCard ─────────────────────────────────────────────────────────────────

interface NewsCardProps { item: NewsItem; isMobile: boolean; }
const NewsCard = memo(({ item, isMobile }: NewsCardProps) => {
  const [hovered, setHovered] = useState(false);
  const onEnter = useCallback(() => setHovered(true),  []);
  const onLeave = useCallback(() => setHovered(false), []);

  const ts = useMemo(() => {
    const diff = Math.floor((Date.now() - item.publishedAt) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }, [item.publishedAt]);

  const cardStyle = useMemo(() => ({
    background: hovered ? "rgba(255,255,255,0.04)" : C.glassBg,
    border: `1px solid ${hovered ? "rgba(0,238,255,0.15)" : C.glassBorder}`,
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 10,
    transition: "background 0.15s ease, border-color 0.15s ease",
    cursor: "pointer",
  }), [hovered, isMobile]);

  const handleClick = useCallback(() => window.open(item.url, "_blank"), [item.url]);

  return (
    <div style={cardStyle} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={handleClick}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontFamily: FONT, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: C.textPrimary, lineHeight: "1.5", flex: 1 }}>
          {item.title}
        </span>
        <SentimentBadge sentiment={item.sentiment} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.accent, opacity: 0.8 }}>{item.source}</span>
          {item.currencies.slice(0, isMobile ? 2 : 3).map(c => (
            <span key={c} style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint, background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "1px 5px" }}>{c}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.positive }}>▲ {item.votes.positive}</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.negative }}>▼ {item.votes.negative}</span>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>{ts}</span>
        </div>
      </div>
    </div>
  );
});
NewsCard.displayName = "NewsCard";

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps { category: CategoryType; onRetry: () => void; }
const EmptyState = memo(({ category, onRetry }: EmptyStateProps) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 12 }}>
    <span style={{ fontSize: 32, opacity: 0.25 }}>📰</span>
    <span style={{ fontFamily: FONT, fontSize: 12, color: C.textFaint, textAlign: "center" }}>
      {category === "All" ? "No intelligence feeds available." : `No ${category} news found.`}
    </span>
    <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, opacity: 0.6 }}>
      Try refreshing or selecting a different category.
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

// ─── Intelligence (Main) ──────────────────────────────────────────────────────

const Intelligence = memo(() => {
  const { isMobile } = useBreakpoint();
  const [category, setCategory] = useState<CategoryType>("All");
  const [data, setData]         = useState<IntelligenceData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const mountedRef              = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cryptopanic.com/api/free/v1/posts/?auth_token=free&public=true");
      if (!mountedRef.current) return;

      if (!res.ok) {
        // Fallback: CryptoCompare
        const fallback = await fetch("https://min-api.cryptocompare.com/data/v2/news/?lang=EN");
        if (!mountedRef.current) return;
        if (!fallback.ok) throw new Error("All news sources unavailable");
        const json = await fallback.json() as CCResponse;
        if (!mountedRef.current) return;

        const items: NewsItem[] = (json.Data ?? []).slice(0, 30).map((n): NewsItem => ({
          id:          String(n.id ?? ""),
          title:       n.title ?? "",
          source:      n.source_info?.name ?? n.source ?? "Unknown",
          url:         n.url ?? "",
          publishedAt: (n.published_on ?? 0) * 1000,
          sentiment:   "neutral",
          votes:       { positive: 0, negative: 0 },
          currencies:  (n.categories ?? "").split("|").filter(Boolean),
        }));
        setData({ news: items, lastUpdated: Date.now() });
        return;
      }

      // Primary: CryptoPanic
      const json = await res.json() as CPResponse;
      if (!mountedRef.current) return;

      const items: NewsItem[] = (json.results ?? []).slice(0, 30).map((n): NewsItem => {
        const pos = n.votes?.positive ?? 0;
        const neg = n.votes?.negative ?? 0;
        return {
          id:          String(n.id ?? ""),
          title:       n.title ?? "",
          source:      n.source?.title ?? "Unknown",
          url:         n.url ?? "",
          publishedAt: new Date(n.published_at ?? "").getTime(),
          sentiment:   neg > pos ? "negative" : pos > 5 ? "positive" : "neutral",
          votes:       { positive: pos, negative: neg },
          currencies:  (n.currencies ?? []).map(c => c.code ?? "").filter(Boolean).slice(0, 3),
        };
      });
      setData({ news: items, lastUpdated: Date.now() });

    } catch (e) {
      if (!mountedRef.current) return;
      setError(`Failed to load intelligence data: ${e instanceof Error ? e.message : "Unknown error"}`);
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
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [data]);

  const filteredNews = useMemo(() => {
    if (!data?.news) return [];
    if (category === "All") return data.news;
    const q = category.toLowerCase();
    return data.news.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.currencies.some(c => c.toLowerCase().includes(q))
    );
  }, [data, category]);

  const makeCatStyle = useCallback((c: CategoryType) => ({
    fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
    color: c === category ? C.bgBase : C.textFaint,
    background: c === category ? C.accent : "transparent",
    border: `1px solid ${c === category ? C.accent : C.glassBorder}`,
    borderRadius: 6, padding: "4px 10px", cursor: "pointer",
  }), [category]);

  const pageStyle = useMemo(() => ({
    background: C.bgBase, minHeight: "100vh", color: C.textPrimary, fontFamily: FONT,
    padding: isMobile ? "16px 12px" : "20px 16px",
  }), [isMobile]);

  const handleRefresh = useCallback(() => fetchData(), [fetchData]);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 16 : 20, fontWeight: 700, letterSpacing: "0.06em", color: C.textPrimary, margin: 0 }}>Intelligence</h1>
          <p style={{ fontFamily: FONT, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textFaint, margin: "6px 0 0" }}>
            News · Sentiment · Updated {lastUpdatedStr}
          </p>
        </div>
        <button
          style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(0,238,255,0.08)", border: "1px solid rgba(0,238,255,0.2)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}
          onClick={handleRefresh}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" as const }}>
        {CATEGORIES.map(c => (
          <button key={c} style={makeCatStyle(c)} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: FONT, fontSize: 11, color: C.textFaint }}>
          Loading intelligence feeds...
        </div>
      )}

      {!loading && error && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "64px 24px" }}>
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
        filteredNews.length === 0
          ? <EmptyState category={category} onRetry={fetchData} />
          : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredNews.map(item => <NewsCard key={item.id} item={item} isMobile={isMobile} />)}
            </div>
      )}
    </div>
  );
});
Intelligence.displayName = "Intelligence";

export default Intelligence;
