/**
 * WasmOrderBook.tsx — ZERØ MERIDIAN 2026 Phase 9
 * OrderBook visualization powered by WASM computation engine.
 * - WASM computes: midPrice, spread, VWAP, imbalance, bid/ask qty
 * - CSS Houdini paints the trend-reactive background
 * - Protobuf decoder for binary/JSON stream
 * - React.memo + displayName ✓
 * - rgba() only ✓  Zero template literals in JSX ✓
 * - Object.freeze() all static data ✓
 * - useCallback + useMemo ✓
 * - mountedRef ✓
 * - aria-label + role ✓
 * - will-change: transform on animated elements ✓
 */

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useWasm } from '@/hooks/useWasm';
import { useHoudini } from '@/hooks/useHoudini';
import { useProtobuf } from '@/hooks/useProtobuf';
import type { OrderLevel } from '@/hooks/useWasm';
import GlassCard from '@/components/shared/GlassCard';

// ─── Static data ──────────────────────────────────────────────────────────────

const DEPTH_LEVELS = Object.freeze([20, 50, 100] as const);
type DepthLevel = typeof DEPTH_LEVELS[number];

const MOCK_SEED = Object.freeze({
  btcPrice: 67_840,
  spread:   12,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface WasmOrderBookProps {
  symbol?:    string;
  basePrice?: number;
}

interface BookState {
  bids: OrderLevel[];
  asks: OrderLevel[];
  ts:   number;
}

// ─── Deterministic level generator (deterministicJitter already in formatters) ─

function buildLevels(basePrice: number, side: 'bid' | 'ask', depth: DepthLevel, ts: number): OrderLevel[] {
  const levels: OrderLevel[] = [];
  const dir  = side === 'bid' ? -1 : 1;
  const seed = Math.floor(ts / 500); // changes every 500ms

  for (let i = 0; i < depth; i++) {
    // Deterministic jitter: no Math.random()
    const priceDelta = (i + 1) * 5 + ((seed * 7 + i * 13) % 5);
    const qtyBase    = 0.1 + (((seed * 11 + i * 17) % 50) / 100);
    levels.push({
      price: basePrice + dir * priceDelta,
      qty:   parseFloat(qtyBase.toFixed(4)),
    });
  }
  return levels;
}

// ─── SubComponents ────────────────────────────────────────────────────────────

interface LevelRowProps {
  level:     OrderLevel;
  maxQty:    number;
  side:      'bid' | 'ask';
  index:     number;
}

const LevelRow = memo(({ level, maxQty, side, index }: LevelRowProps) => {
  const pct       = maxQty > 0 ? (level.qty / maxQty) * 100 : 0;
  const isBid     = side === 'bid';
  const barColor  = isBid ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)';
  const priceColor = isBid ? 'rgba(52,211,153,0.9)' : 'rgba(251,113,133,0.9)';

  const rowStyle = useMemo(() => ({
    position:   'relative' as const,
    display:    'flex',
    justifyContent: 'space-between',
    padding:    '2px 12px',
    fontSize:   '11px',
    fontFamily: "'JetBrains Mono', monospace",
    willChange: 'opacity' as const,
  }), []);

  const barStyle = useMemo(() => ({
    position:        'absolute' as const,
    top:             0, bottom: 0,
    right:           isBid ? 0 : undefined,
    left:            isBid ? undefined : 0,
    width:           pct + '%',
    background:      barColor,
    pointerEvents:   'none' as const,
    willChange:      'width' as const,
  }), [isBid, pct, barColor]);

  const levelLabel = 'Price ' + level.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' qty ' + level.qty;

  return (
    <motion.div
      style={rowStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.005, duration: 0.15 }}
      role="row"
      aria-label={levelLabel}
    >
      <div style={barStyle} aria-hidden="true" />
      <span style={{ color: priceColor, position: 'relative' }}>
        {level.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span style={{ color: 'rgba(148,163,184,0.7)', position: 'relative' }}>
        {level.qty.toFixed(4)}
      </span>
      <span style={{ color: 'rgba(100,116,139,0.6)', position: 'relative', minWidth: '60px', textAlign: 'right' }}>
        {(level.price * level.qty).toFixed(0)}
      </span>
    </motion.div>
  );
});
LevelRow.displayName = 'LevelRow';

// ─── Imbalance Bar ────────────────────────────────────────────────────────────

const ImbalanceBar = memo(({ imbalance }: { imbalance: number }) => {
  const prefersReducedMotion = useReducedMotion();
  const pct = Math.abs(imbalance) * 50; // 0..50%
  const isBid = imbalance >= 0;

  const containerStyle = useMemo(() => ({
    height:     '6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow:   'hidden',
    position:   'relative' as const,
    willChange: 'transform' as const,
  }), []);

  const barStyle = useMemo(() => ({
    position:     'absolute' as const,
    top:          0, bottom: 0,
    left:         isBid ? '50%' : (50 - pct) + '%',
    width:        pct + '%',
    background:   isBid ? 'rgba(52,211,153,0.7)' : 'rgba(251,113,133,0.7)',
    borderRadius: '3px',
    willChange:   'width' as const,
  }), [isBid, pct]);

  const centerStyle = useMemo(() => ({
    position:  'absolute' as const,
    top:       0, bottom: 0,
    left:      'calc(50% - 0.5px)',
    width:     '1px',
    background: 'rgba(255,255,255,0.15)',
  }), []);

  return (
    <div style={containerStyle} role="meter" aria-label={'Order imbalance: ' + (imbalance * 100).toFixed(1) + '%'} aria-valuenow={imbalance} aria-valuemin={-1} aria-valuemax={1}>
      <motion.div
        style={barStyle}
        animate={prefersReducedMotion ? {} : { width: pct + '%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
      <div style={centerStyle} aria-hidden="true" />
    </div>
  );
});
ImbalanceBar.displayName = 'ImbalanceBar';

// ─── Main Component ───────────────────────────────────────────────────────────

const WasmOrderBook = memo(({ symbol = 'BTCUSDT', basePrice = MOCK_SEED.btcPrice }: WasmOrderBookProps) => {
  const mountedRef           = useRef(true);
  const timerRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const [depth, setDepth]   = useState<DepthLevel>(20);
  const [book, setBook]     = useState<BookState>({ bids: [], asks: [], ts: Date.now() });

  const wasm     = useWasm();
  const houdini  = useHoudini();
  const protobuf = useProtobuf();

  // Compute book metrics via WASM
  const metrics = useMemo(() => {
    if (book.bids.length === 0 || book.asks.length === 0) {
      return { midPrice: basePrice, spread: 0, spreadPct: 0, imbalance: 0, bidVwap: 0, askVwap: 0, totalBidQty: 0, totalAskQty: 0 };
    }
    return wasm.compute(book.bids, book.asks);
  }, [book, wasm, basePrice]);

  // Max qty for bar sizing
  const maxBidQty = useMemo(() => book.bids.reduce((m, l) => Math.max(m, l.qty), 0), [book.bids]);
  const maxAskQty = useMemo(() => book.asks.reduce((m, l) => Math.max(m, l.qty), 0), [book.asks]);

  // Generate book (simulated — in prod: real Binance WS + protobuf.decode)
  const refreshBook = useCallback(() => {
    if (!mountedRef.current) return;
    const ts = Date.now();
    setBook({
      bids: buildLevels(basePrice, 'bid', depth, ts),
      asks: buildLevels(basePrice, 'ask', depth, ts),
      ts,
    });
  }, [basePrice, depth]);

  useEffect(() => {
    mountedRef.current = true;
    refreshBook();
    timerRef.current = setInterval(refreshBook, 500);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshBook]);

  const handleDepth = useCallback((d: DepthLevel) => {
    if (!mountedRef.current) return;
    setDepth(d);
  }, []);

  // Houdini background (trend driven by imbalance)
  const cardBg = useMemo(() => houdini.getPriceBg(metrics.imbalance, 0.6), [houdini, metrics.imbalance]);

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const headerStyle = useMemo(() => ({
    display:     'flex',
    alignItems:  'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  }), []);

  const titleStyle = useMemo(() => ({
    fontFamily:    "'JetBrains Mono', monospace",
    fontSize:      '13px',
    fontWeight:    700,
    color:         'rgba(255,255,255,0.9)',
    letterSpacing: '0.08em',
    display:       'flex',
    alignItems:    'center',
    gap:           '8px',
  }), []);

  const wasmBadgeStyle = useMemo(() => ({
    fontSize:      '9px',
    padding:       '2px 6px',
    borderRadius:  '4px',
    fontFamily:    "'JetBrains Mono', monospace",
    letterSpacing: '0.06em',
    background:    wasm.status === 'ready' ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)',
    border:        '1px solid ' + (wasm.status === 'ready' ? 'rgba(52,211,153,0.3)' : 'rgba(96,165,250,0.25)'),
    color:         wasm.status === 'ready' ? 'rgba(52,211,153,0.9)' : 'rgba(96,165,250,0.7)',
  }), [wasm.status]);

  const metricsRowStyle = useMemo(() => ({
    display:             'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap:                 '8px',
    marginBottom:        '12px',
  }), []);

  const metricBoxStyle = useMemo(() => ({
    background:   'rgba(255,255,255,0.03)',
    border:       '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding:      '8px',
    textAlign:    'center' as const,
  }), []);

  const metricValueStyle = useMemo(() => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize:   '12px',
    fontWeight: 700,
    color:      'rgba(255,255,255,0.9)',
  }), []);

  const metricLabelStyle = useMemo(() => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize:   '9px',
    color:      'rgba(148,163,184,0.5)',
    marginTop:  '2px',
  }), []);

  const bookGridStyle = useMemo(() => ({
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 '8px',
  }), []);

  const sideHeaderStyle = useMemo(() => ({
    display:        'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    padding:        '4px 12px',
    fontSize:       '9px',
    fontFamily:     "'JetBrains Mono', monospace",
    color:          'rgba(100,116,139,0.6)',
    letterSpacing:  '0.06em',
    borderBottom:   '1px solid rgba(255,255,255,0.05)',
    marginBottom:   '4px',
  }), []);

  const midPriceStyle = useMemo(() => ({
    textAlign:  'center' as const,
    padding:    '8px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize:   '14px',
    fontWeight: 700,
    color:      metrics.imbalance >= 0 ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)',
    borderTop:   '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    willChange: 'color' as const,
  }), [metrics.imbalance]);

  const benchStyle = useMemo(() => ({
    fontSize:   '9px',
    fontFamily: "'JetBrains Mono', monospace",
    color:      'rgba(100,116,139,0.4)',
    textAlign:  'right' as const,
    marginTop:  '8px',
  }), []);

  const depthTabsStyle = useMemo(() => ({
    display: 'flex',
    gap:     '4px',
  }), []);

  return (
    <GlassCard style={{ ...cardBg, padding: '16px' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1" y="6" width="5" height="7" rx="1" fill="rgba(52,211,153,0.7)" />
            <rect x="8" y="2" width="5" height="11" rx="1" fill="rgba(251,113,133,0.7)" />
          </svg>
          {symbol}
          <span style={wasmBadgeStyle}>
            {wasm.status === 'ready' ? 'WASM' : wasm.status === 'fallback' ? 'JS' : 'LOADING'}
          </span>
          {houdini.status === 'ready' && (
            <span style={{ ...wasmBadgeStyle, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: 'rgba(168,85,247,0.8)' }}>
              HOUDINI
            </span>
          )}
          {protobuf.status === 'ready' && (
            <span style={{ ...wasmBadgeStyle, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.7)' }}>
              PROTO
            </span>
          )}
        </div>

        {/* Depth selector */}
        <div style={depthTabsStyle} role="group" aria-label="Order book depth">
          {DEPTH_LEVELS.map((d) => (
            <motion.button
              key={d}
              onClick={() => handleDepth(d)}
              style={{
                padding:      '3px 8px',
                borderRadius: '4px',
                border:       'none',
                cursor:       'pointer',
                fontSize:     '10px',
                fontFamily:   "'JetBrains Mono', monospace",
                background:   depth === d ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                color:        depth === d ? 'rgba(96,165,250,0.9)' : 'rgba(148,163,184,0.5)',
                willChange:   'transform',
              }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              aria-label={'Show ' + d + ' depth levels'}
              aria-pressed={depth === d}
            >
              {d}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Metrics row */}
      <div style={metricsRowStyle} role="group" aria-label="Order book metrics">
        <div style={metricBoxStyle}>
          <div style={metricValueStyle}>
            {metrics.midPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
          <div style={metricLabelStyle}>MID PRICE</div>
        </div>
        <div style={metricBoxStyle}>
          <div style={{ ...metricValueStyle, color: 'rgba(251,191,36,0.9)' }}>
            ${metrics.spread.toFixed(2)}
          </div>
          <div style={metricLabelStyle}>SPREAD</div>
        </div>
        <div style={metricBoxStyle}>
          <div style={{ ...metricValueStyle, color: metrics.imbalance >= 0 ? 'rgba(52,211,153,0.9)' : 'rgba(251,113,133,0.9)' }}>
            {(metrics.imbalance * 100).toFixed(1)}%
          </div>
          <div style={metricLabelStyle}>IMBALANCE</div>
        </div>
        <div style={metricBoxStyle}>
          <div style={metricValueStyle}>
            {(metrics.totalBidQty + metrics.totalAskQty).toFixed(1)}
          </div>
          <div style={metricLabelStyle}>TOTAL QTY</div>
        </div>
      </div>

      {/* Imbalance bar */}
      <div style={{ marginBottom: '12px' }}>
        <ImbalanceBar imbalance={metrics.imbalance} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(100,116,139,0.5)' }}>
          <span>SELL</span>
          <span>BUY</span>
        </div>
      </div>

      {/* Book grid */}
      <div style={bookGridStyle} role="table" aria-label="Order book">
        {/* Bids */}
        <div>
          <div style={sideHeaderStyle}>
            <span>PRICE</span>
            <span style={{ textAlign: 'right' }}>QTY</span>
            <span style={{ textAlign: 'right' }}>TOTAL</span>
          </div>
          <div role="rowgroup">
            {book.bids.slice(0, 12).map((level, i) => (
              <LevelRow key={level.price} level={level} maxQty={maxBidQty} side="bid" index={i} />
            ))}
          </div>
        </div>

        {/* Asks */}
        <div>
          <div style={sideHeaderStyle}>
            <span>PRICE</span>
            <span style={{ textAlign: 'right' }}>QTY</span>
            <span style={{ textAlign: 'right' }}>TOTAL</span>
          </div>
          <div role="rowgroup">
            {book.asks.slice(0, 12).map((level, i) => (
              <LevelRow key={level.price} level={level} maxQty={maxAskQty} side="ask" index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Mid price line */}
      <div style={midPriceStyle} aria-live="polite" aria-label={'Mid price: ' + metrics.midPrice.toLocaleString()}>
        ≈ {metrics.midPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: '8px' }}>
          VWAP Bid: {metrics.bidVwap.toFixed(2)} | Ask: {metrics.askVwap.toFixed(2)}
        </span>
      </div>

      {/* Benchmark footer */}
      <div style={benchStyle} aria-hidden="true">
        {wasm.status === 'ready' ? 'WASM engine' : 'JS engine'}
        {' · '}compute: {wasm.benchmarkNs > 1000 ? (wasm.benchmarkNs / 1000).toFixed(1) + 'µs' : wasm.benchmarkNs + 'ns'}
        {' · '}proto decoded: {protobuf.decodedCount}
        {' · '}houdini: {houdini.status}
      </div>
    </GlassCard>
  );
});

WasmOrderBook.displayName = 'WasmOrderBook';
export default WasmOrderBook;
