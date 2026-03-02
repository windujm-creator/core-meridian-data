/**
 * OrderBookTile.tsx — ZERØ MERIDIAN 2026
 * Live order book — pure Canvas depth visualization + SVG spread bar.
 * Data: useOrderBook hook (Binance WS depth20@100ms — already in repo)
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero template literals in JSX attrs ✓
 * - useCallback + useMemo ✓
 */

import { memo, useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../shared/GlassCard';
import { useOrderBook, ORDER_BOOK_SYMBOLS, type OrderBookSymbol, type OrderBookLevel } from '@/hooks/useOrderBook';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR = Object.freeze({
  bid:       'rgba(52,211,153,1)',
  bidBg:     'rgba(52,211,153,0.08)',
  bidBar:    'rgba(52,211,153,0.18)',
  ask:       'rgba(251,113,133,1)',
  askBg:     'rgba(251,113,133,0.08)',
  askBar:    'rgba(251,113,133,0.18)',
  mid:       'rgba(96,165,250,1)',
  text:      'rgba(226,232,240,0.85)',
  faint:     'rgba(148,163,184,0.4)',
  grid:      'rgba(96,165,250,0.05)',
  highlight: 'rgba(255,255,255,0.04)',
});

const SYMBOL_LABELS: Partial<Record<OrderBookSymbol, string>> = Object.freeze({
  btcusdt: 'BTC/USDT',
  ethusdt: 'ETH/USDT',
  solusdt: 'SOL/USDT',
  bnbusdt: 'BNB/USDT',
  xrpusdt: 'XRP/USDT',
});

const VISIBLE_SYMBOLS = Object.freeze(['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt'] as const);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(4);
  return n.toFixed(6);
}

function formatSize(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
  if (n >= 1)    return n.toFixed(3);
  return n.toFixed(6);
}

function formatUsd(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

// ─── Row Component ────────────────────────────────────────────────────────────

interface LevelRowProps {
  level: OrderBookLevel;
  side: 'bid' | 'ask';
  midPrice: number;
  isFlash: boolean;
}

const LevelRow = memo(({ level, side, midPrice, isFlash }: LevelRowProps) => {
  const isBid = side === 'bid';
  const color = isBid ? COLOR.bid : COLOR.ask;
  const barColor = isBid ? COLOR.bidBar : COLOR.askBar;
  const usdVal = level.price * level.size;

  const deltaColor = useMemo(() => {
    if (level.delta === 'new') return 'rgba(251,191,36,0.9)';
    if (level.delta === 'up') return color;
    if (level.delta === 'down') return 'rgba(148,163,184,0.5)';
    return color;
  }, [level.delta, color]);

  return (
    <motion.div
      initial={false}
      animate={{ backgroundColor: isFlash ? (isBid ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)') : 'transparent' }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        padding: '2px 8px',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Depth bar (fills from right for bids, left for asks) */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0,
        width: level.depthPct + '%',
        right: isBid ? 0 : undefined,
        left: isBid ? undefined : 0,
        background: barColor,
        pointerEvents: 'none',
      }} />

      {/* Price */}
      <span style={{ color: deltaColor, fontWeight: 600, position: 'relative' }}>
        {formatPrice(level.price)}
      </span>

      {/* Size */}
      <span style={{ color: COLOR.faint, textAlign: 'center', position: 'relative' }}>
        {formatSize(level.size)}
      </span>

      {/* USD Value */}
      <span style={{ color: 'rgba(148,163,184,0.3)', textAlign: 'right', position: 'relative' }}>
        {formatUsd(usdVal)}
      </span>
    </motion.div>
  );
});
LevelRow.displayName = 'LevelRow';

// ─── Spread Bar (SVG) ─────────────────────────────────────────────────────────

interface SpreadBarProps {
  bidAskRatio: number;
  spread: number;
  spreadPct: number;
  midPrice: number;
}

const SpreadBar = memo(({ bidAskRatio, spread, spreadPct, midPrice }: SpreadBarProps) => {
  const bidPct = bidAskRatio * 100;
  const askPct = 100 - bidPct;

  return (
    <div style={{
      padding: '4px 8px',
      background: 'rgba(96,165,250,0.04)',
      borderTop: '1px solid rgba(96,165,250,0.08)',
      borderBottom: '1px solid rgba(96,165,250,0.08)',
    }}>
      {/* Labels row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        marginBottom: 4,
      }}>
        <span style={{ color: COLOR.bid }}>{bidPct.toFixed(1)}% BID</span>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: COLOR.mid, fontSize: 11, fontWeight: 700 }}>
            {formatPrice(midPrice)}
          </span>
          <span style={{ color: 'rgba(148,163,184,0.3)', marginLeft: 6 }}>
            Δ{formatPrice(spread)} ({spreadPct.toFixed(3)}%)
          </span>
        </div>
        <span style={{ color: COLOR.ask }}>{askPct.toFixed(1)}% ASK</span>
      </div>

      {/* Bar */}
      <svg width="100%" height="6" style={{ display: 'block', borderRadius: 3, overflow: 'hidden' }}>
        <rect x="0" y="0" width={bidPct + '%'} height="6" fill="rgba(52,211,153,0.6)" rx="3" />
        <rect x={bidPct + '%'} y="0" width={askPct + '%'} height="6" fill="rgba(251,113,133,0.6)" rx="3" />
      </svg>
    </div>
  );
});
SpreadBar.displayName = 'SpreadBar';

// ─── Depth Canvas Chart ───────────────────────────────────────────────────────

interface DepthChartProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

function drawDepth(ctx: CanvasRenderingContext2D, bids: OrderBookLevel[], asks: OrderBookLevel[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  if (bids.length === 0 && asks.length === 0) return;

  const allLevels = [...bids.slice().reverse(), ...asks];
  const maxCum = Math.max(
    bids.length > 0 ? bids[bids.length - 1].cumSize : 0,
    asks.length > 0 ? asks[asks.length - 1].cumSize : 0,
  );

  // Price range
  const minP = allLevels[0]?.price ?? 0;
  const maxP = allLevels[allLevels.length - 1]?.price ?? 1;
  const priceRange = maxP - minP || 1;

  const px = (price: number) => ((price - minP) / priceRange) * w;
  const py = (cum: number) => h - (cum / (maxCum || 1)) * h;

  // Bid area
  ctx.beginPath();
  const midX = bids.length > 0 ? px(bids[0].price) : w / 2;
  ctx.moveTo(0, h);
  for (const b of [...bids].reverse()) {
    ctx.lineTo(px(b.price), py(b.cumSize));
  }
  ctx.lineTo(midX, h);
  ctx.closePath();
  const bidGrad = ctx.createLinearGradient(0, 0, midX, 0);
  bidGrad.addColorStop(0, 'rgba(52,211,153,0.05)');
  bidGrad.addColorStop(1, 'rgba(52,211,153,0.25)');
  ctx.fillStyle = bidGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(52,211,153,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ask area
  ctx.beginPath();
  ctx.moveTo(midX, h);
  for (const a of asks) {
    ctx.lineTo(px(a.price), py(a.cumSize));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  const askGrad = ctx.createLinearGradient(midX, 0, w, 0);
  askGrad.addColorStop(0, 'rgba(251,113,133,0.25)');
  askGrad.addColorStop(1, 'rgba(251,113,133,0.05)');
  ctx.fillStyle = askGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(251,113,133,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Mid line
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(96,165,250,0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.moveTo(midX, 0);
  ctx.lineTo(midX, h);
  ctx.stroke();
  ctx.setLineDash([]);
}

const DepthChart = memo(({ bids, asks }: DepthChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawDepth(ctx, bids, asks, w, h);
  }, [bids, asks]);

  return (
    <div ref={containerRef} style={{ height: 60, position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
});
DepthChart.displayName = 'DepthChart';

// ─── Main Component ───────────────────────────────────────────────────────────

const ROWS = 12;

const OrderBookTile = memo(() => {
  const [symbol, setSymbol] = useState<OrderBookSymbol>('btcusdt');
  const ob = useOrderBook(symbol);

  const bids = useMemo(() => ob.bids.slice(0, ROWS), [ob.bids]);
  const asks = useMemo(() => ob.asks.slice(0, ROWS), [ob.asks]);

  const onSymbol = useCallback((s: OrderBookSymbol) => setSymbol(s), []);

  const statusColor = useMemo(() => {
    if (ob.wsStatus === 'connected') return 'rgba(52,211,153,0.8)';
    if (ob.wsStatus === 'reconnecting') return 'rgba(251,191,36,0.8)';
    return 'rgba(251,113,133,0.8)';
  }, [ob.wsStatus]);

  const btnBase: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    padding: '2px 6px',
    borderRadius: 3,
    border: '1px solid rgba(96,165,250,0.12)',
    background: 'transparent',
    color: 'rgba(148,163,184,0.5)',
    cursor: 'pointer',
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(96,165,250,0.1)',
    color: 'rgba(226,232,240,0.9)',
    borderColor: 'rgba(96,165,250,0.35)',
  };

  const colHeader: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    padding: '4px 8px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: 'rgba(148,163,184,0.3)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  };

  return (
    <GlassCard style={{ height: 420, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px 6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: 'rgba(226,232,240,0.8)', fontWeight: 600, letterSpacing: '0.05em',
          }}>
            ORDER BOOK
          </span>
          <span style={{ fontSize: 8, color: statusColor }}>●</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: statusColor }}>
            {ob.wsStatus.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {VISIBLE_SYMBOLS.map(s => (
            <button
              key={s}
              style={symbol === s ? btnActive : btnBase}
              onClick={() => onSymbol(s)}
              aria-label={'Select ' + (SYMBOL_LABELS[s] ?? s)}
              aria-pressed={symbol === s}
            >
              {(SYMBOL_LABELS[s] ?? s).split('/')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Depth chart */}
      <div style={{ padding: '0 8px' }}>
        <DepthChart bids={ob.bids} asks={ob.asks} />
      </div>

      {/* Spread bar */}
      <SpreadBar
        bidAskRatio={ob.bidAskRatio}
        spread={ob.spread}
        spreadPct={ob.spreadPct}
        midPrice={ob.midPrice}
      />

      {/* Column headers */}
      <div style={colHeader}>
        <span>PRICE (USDT)</span>
        <span style={{ textAlign: 'center' }}>SIZE</span>
        <span style={{ textAlign: 'right' }}>TOTAL</span>
      </div>

      {/* Ask levels (reversed — highest ask at top) */}
      <div style={{ flex: 1, overflowY: 'hidden', minHeight: 0 }}>
        <div>
          {[...asks].reverse().map((level, i) => (
            <LevelRow key={level.price + '_ask'} level={level} side="ask" midPrice={ob.midPrice} isFlash={i === 0 && level.delta === 'new'} />
          ))}
        </div>

        {/* Bid levels */}
        <div>
          {bids.map((level, i) => (
            <LevelRow key={level.price + '_bid'} level={level} side="bid" midPrice={ob.midPrice} isFlash={i === 0 && level.delta === 'new'} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '4px 8px',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: 'rgba(148,163,184,0.25)',
        borderTop: '1px solid rgba(96,165,250,0.06)',
      }}>
        <span>BINANCE · {(SYMBOL_LABELS[symbol] ?? symbol).toUpperCase()}</span>
        <span>DEPTH 20 · 100ms</span>
      </div>
    </GlassCard>
  );
});

OrderBookTile.displayName = 'OrderBookTile';
export default OrderBookTile;
