/**
 * NewsTickerTile.tsx — ZERØ MERIDIAN 2026
 * Bloomberg-style scrolling news ticker — CSS animation, no Canvas.
 * Data: CryptoCompare News API (free, no key needed for basic)
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero template literals in JSX attrs ✓
 * - mountedRef + AbortController ✓
 * - useCallback + useMemo ✓
 * - ZERO mock/fake/static data — real API only, error state on fail ✓
 */

import { memo, useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../shared/GlassCard';

const FONT = "'JetBrains Mono', monospace";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: number;
  categories: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  tags: string[];
}

interface NewsRaw {
  id: string | number;
  title: string;
  source_info?: { name?: string };
  source?: string;
  url: string;
  published_on: number;
  categories?: string;
  sentiment?: string;
  tags?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SENTIMENT_COLOR = Object.freeze({
  positive: 'rgba(52,211,153,0.9)',
  negative: 'rgba(251,113,133,0.9)',
  neutral:  'rgba(148,163,184,0.6)',
});

const TAG_COLOR = Object.freeze({
  BTC:     'rgba(251,191,36,0.8)',
  ETH:     'rgba(96,165,250,0.8)',
  SOL:     'rgba(167,139,250,0.8)',
  DEFI:    'rgba(52,211,153,0.7)',
  ETF:     'rgba(34,211,238,0.7)',
  L2:      'rgba(96,165,250,0.6)',
  LIQ:     'rgba(251,113,133,0.7)',
  BULL:    'rgba(52,211,153,0.8)',
  BEAR:    'rgba(251,113,133,0.8)',
  default: 'rgba(148,163,184,0.5)',
});

function getTagColor(tag: string): string {
  return (TAG_COLOR as Record<string, string>)[tag] ?? TAG_COLOR.default;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000)   return Math.floor(diff / 1000) + 's ago';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  return Math.floor(diff / 3600000) + 'h ago';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface NewsState {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
}

function useNewsData() {
  const [state, setState] = useState<NewsState>({ items: [], loading: true, error: null });
  const mountedRef = useRef(true);

  const fetchNews = useCallback(async (signal: AbortSignal) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(
        'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest',
        { signal }
      );
      if (!mountedRef.current) return;
      if (!res.ok) {
        setState({ items: [], loading: false, error: 'News API error: ' + res.status });
        return;
      }
      const data = await res.json();
      if (!mountedRef.current) return;
      if (!data.Data || !Array.isArray(data.Data)) {
        setState({ items: [], loading: false, error: 'Invalid response from news API' });
        return;
      }
      const mapped: NewsItem[] = data.Data.slice(0, 20).map((n: NewsRaw) => ({
        id:          String(n.id),
        title:       n.title,
        source:      n.source_info?.name ?? n.source ?? 'Unknown',
        url:         n.url,
        publishedAt: n.published_on * 1000,
        categories:  (n.categories ?? '').split('|').filter(Boolean),
        sentiment:   n.sentiment === 'Positive' ? 'positive' :
                     n.sentiment === 'Negative' ? 'negative' : 'neutral',
        tags:        (n.tags ?? '').split('|').filter(Boolean).slice(0, 3),
      }));
      if (mapped.length === 0) {
        setState({ items: [], loading: false, error: 'No news articles returned' });
        return;
      }
      setState({ items: mapped, loading: false, error: null });
    } catch (err) {
      if (!mountedRef.current) return;
      if ((err as Error).name === 'AbortError') return;
      setState({ items: [], loading: false, error: 'Failed to load news feed' });
    }
  }, []);

  const refetch = useCallback(() => {
    const ctrl = new AbortController();
    fetchNews(ctrl.signal);
    return ctrl;
  }, [fetchNews]);

  useEffect(() => {
    mountedRef.current = true;
    const ctrl = new AbortController();
    fetchNews(ctrl.signal);
    const t = setInterval(() => fetchNews(ctrl.signal), 120_000);
    return () => {
      mountedRef.current = false;
      ctrl.abort();
      clearInterval(t);
    };
  }, [fetchNews]);

  return { ...state, refetch };
}

// ─── Ticker Item ──────────────────────────────────────────────────────────────

const TickerNewsItem = memo(({ item, isActive }: { item: NewsItem; isActive: boolean }) => {
  const sentColor = item.sentiment ? SENTIMENT_COLOR[item.sentiment] : SENTIMENT_COLOR.neutral;
  const handleClick = useCallback(() => {
    if (item.url && item.url !== '#') window.open(item.url, '_blank', 'noopener,noreferrer');
  }, [item.url]);

  return (
    <div
      onClick={handleClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', whiteSpace: 'nowrap', cursor: 'pointer' }}
    >
      <span style={{ fontSize: 8, color: sentColor, flexShrink: 0 }}>●</span>
      {item.tags.slice(0, 2).map(tag => (
        <span key={tag} style={{
          fontFamily: FONT, fontSize: 8, padding: '1px 5px', borderRadius: 3,
          border: '1px solid ' + getTagColor(tag).replace('0.8','0.3').replace('0.7','0.3').replace('0.6','0.3'),
          color: getTagColor(tag), flexShrink: 0,
        }}>
          {tag}
        </span>
      ))}
      <span style={{
        fontFamily: FONT, fontSize: 11,
        color: isActive ? 'rgba(226,232,240,0.92)' : 'rgba(148,163,184,0.6)',
        letterSpacing: '0.01em',
      }}>
        {item.title}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(96,165,250,0.5)', flexShrink: 0 }}>
        {item.source}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(148,163,184,0.25)', flexShrink: 0 }}>
        {formatAge(item.publishedAt)}
      </span>
      <span style={{ color: 'rgba(96,165,250,0.15)', flexShrink: 0, margin: '0 8px' }}>◆</span>
    </div>
  );
});
TickerNewsItem.displayName = 'TickerNewsItem';

// ─── Error State ──────────────────────────────────────────────────────────────

const NewsError = memo(({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', height: 36 }}>
    <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(255,68,136,0.7)' }}>
      ⚠ {message}
    </span>
    <button
      onClick={onRetry}
      style={{
        fontFamily: FONT, fontSize: 9, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
        background: 'rgba(255,68,136,0.08)', border: '1px solid rgba(255,68,136,0.25)',
        color: 'rgba(255,68,136,0.7)',
      }}
    >
      RETRY
    </button>
  </div>
));
NewsError.displayName = 'NewsError';

// ─── Main Component ───────────────────────────────────────────────────────────

const NewsTickerTile = memo(() => {
  const { items, loading, error, refetch } = useNewsData();
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused]       = useState(false);

  useEffect(() => {
    if (paused || items.length === 0) return;
    const t = setInterval(() => setActiveIdx(i => (i + 1) % items.length), 4000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  const onMouseEnter  = useCallback(() => setPaused(true),  []);
  const onMouseLeave  = useCallback(() => setPaused(false), []);
  const handleRetry   = useCallback(() => { refetch(); },   [refetch]);
  const doubledItems  = useMemo(() => [...items, ...items], [items]);

  return (
    <GlassCard style={{ height: 'auto', padding: 0, overflow: 'hidden' }} accentColor="rgba(96,165,250,0.6)">

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        borderBottom: '1px solid rgba(96,165,250,0.08)', background: 'rgba(96,165,250,0.04)',
      }}>
        <span style={{ fontSize: 8, color: error ? 'rgba(255,68,136,0.8)' : 'rgba(52,211,153,0.9)' }}>●</span>
        <span style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(96,165,250,0.8)', fontWeight: 700, letterSpacing: '0.12em' }}>
          CRYPTO INTELLIGENCE FEED
        </span>
        <span style={{ flex: 1 }} />
        {loading && (
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(96,165,250,0.4)' }}
          >
            UPDATING...
          </motion.span>
        )}
        {!loading && !error && (
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(148,163,184,0.3)' }}>
            {items.length} STORIES
          </span>
        )}
        <span style={{ fontFamily: FONT, fontSize: 9, color: paused ? 'rgba(251,191,36,0.6)' : 'rgba(148,163,184,0.25)' }}>
          {paused ? '⏸ PAUSED' : '▶ LIVE'}
        </span>
      </div>

      {/* Body */}
      {loading && (
        <div style={{ height: 36, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(96,165,250,0.4)', letterSpacing: '0.1em' }}
          >
            LOADING LIVE NEWS FEED...
          </motion.div>
        </div>
      )}

      {!loading && error && <NewsError message={error} onRetry={handleRetry} />}

      {!loading && !error && items.length > 0 && (
        <div
          style={{ overflow: 'hidden', position: 'relative' }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {/* Fade edges */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(90deg, rgba(5,5,14,0.8), transparent)', zIndex: 2, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(270deg, rgba(5,5,14,0.8), transparent)', zIndex: 2, pointerEvents: 'none' }} />

          <div style={{
            display: 'flex', alignItems: 'center', height: 36,
            animation: paused ? 'none' : 'zm-ticker-scroll 60s linear infinite',
            willChange: 'transform',
          }}>
            <style>{`@keyframes zm-ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
            {doubledItems.map((item, i) => (
              <TickerNewsItem
                key={item.id + '_' + i}
                item={item}
                isActive={i % items.length === activeIdx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active story detail */}
      <AnimatePresence>
        {!loading && !error && items[activeIdx] && (
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: '6px 12px 8px', borderTop: '1px solid rgba(96,165,250,0.06)', display: 'flex', alignItems: 'flex-start', gap: 8 }}
          >
            <div style={{
              width: 2, minHeight: 20, flexShrink: 0, marginTop: 2, borderRadius: 1,
              background: items[activeIdx].sentiment
                ? SENTIMENT_COLOR[items[activeIdx].sentiment!]
                : SENTIMENT_COLOR.neutral,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(226,232,240,0.75)', lineHeight: 1.4 }}>
                {items[activeIdx].title}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, fontFamily: FONT, fontSize: 8, color: 'rgba(148,163,184,0.35)' }}>
                <span style={{ color: 'rgba(96,165,250,0.5)' }}>{items[activeIdx].source}</span>
                <span>{formatAge(items[activeIdx].publishedAt)}</span>
                {items[activeIdx].tags.map(tag => (
                  <span key={tag} style={{ color: getTagColor(tag) }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(148,163,184,0.25)', flexShrink: 0 }}>
              {activeIdx + 1}/{items.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </GlassCard>
  );
});

NewsTickerTile.displayName = 'NewsTickerTile';
export default NewsTickerTile;
