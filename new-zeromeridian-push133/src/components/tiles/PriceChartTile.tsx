/**
 * PriceChartTile.tsx — ZERØ MERIDIAN 2026 Phase 7
 * UPGRADE Phase 7:
 * - useWebGPU: detect render backend, show badge, optimize canvas hints
 * - OffscreenCanvas: transfer control to chartWorker for off-thread drawing
 * - React.memo + displayName ✓  rgba() only ✓  Zero template literals in JSX ✓
 */

import { memo, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../shared/GlassCard';
import { useWebGPU } from '@/hooks/useWebGPU';

type Interval  = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type ChartMode = 'candle' | 'line' | 'area';
type ChartSymbol = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' | 'BNBUSDT';

interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; }

const SYMBOLS: readonly ChartSymbol[] = Object.freeze(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']);
const INTERVALS: readonly Interval[]  = Object.freeze(['1m', '5m', '15m', '1h', '4h', '1d']);
const LIMIT = 120;

const SYMBOL_LABELS: Record<ChartSymbol, string> = Object.freeze({
  BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL', BNBUSDT: 'BNB',
});

const SYMBOL_COLORS: Record<ChartSymbol, string> = Object.freeze({
  BTCUSDT: 'rgba(251,191,36,1)',
  ETHUSDT: 'rgba(96,165,250,1)',
  SOLUSDT: 'rgba(167,139,250,1)',
  BNBUSDT: 'rgba(251,191,36,0.8)',
});

const COLOR = Object.freeze({
  up:   'rgba(52,211,153,1)',
  down: 'rgba(251,113,133,1)',
});

const PAD = Object.freeze({ top: 20, right: 60, bottom: 48, left: 8 });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  if (n >= 10000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 100)   return '$' + n.toFixed(2);
  if (n >= 1)     return '$' + n.toFixed(4);
  return '$' + n.toFixed(6);
}

function formatTime(ts: number, interval: Interval): string {
  const d = new Date(ts);
  if (interval === '1d') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (interval === '4h' || interval === '1h') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ─── Main-thread Canvas draw (fallback) ──────────────────────────────────────

function drawChartMainThread(
  ctx: CanvasRenderingContext2D,
  candles: Candle[], w: number, h: number,
  mode: ChartMode, symbolColor: string,
  crosshair: { x: number; y: number } | null,
  interval: Interval, dpr: number
): void {
  ctx.clearRect(0, 0, w, h);
  if (candles.length < 2) return;
  const chartW = w - PAD.left - PAD.right;
  const chartH = h - PAD.top - PAD.bottom;
  const volH   = Math.floor(chartH * 0.18);
  const priceH = chartH - volH - 8;

  let minP = Infinity, maxP = -Infinity;
  for (const c of candles) { if (c.l < minP) minP = c.l; if (c.h > maxP) maxP = c.h; }
  const pricePad = (maxP - minP || 1) * 0.05;
  const lo = minP - pricePad, hi = maxP + pricePad;
  const range = hi - lo;
  let maxV = 0;
  for (const c of candles) if (c.v > maxV) maxV = c.v;

  const px = (i: number) => PAD.left + (i / (candles.length - 1)) * chartW;
  const py = (price: number) => PAD.top + priceH - ((price - lo) / range) * priceH;
  const vy = (vol: number) => h - PAD.bottom - (vol / (maxV || 1)) * volH;

  ctx.strokeStyle = 'rgba(96,165,250,0.06)';
  ctx.lineWidth = 1 / dpr;
  for (let i = 0; i <= 5; i++) {
    const yy = PAD.top + (priceH / 5) * i;
    ctx.beginPath(); ctx.moveTo(PAD.left, yy); ctx.lineTo(PAD.left + chartW, yy); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(148,163,184,0.5)';
  ctx.font = (10 / dpr) + 'px JetBrains Mono, monospace';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const price = hi - (range / 5) * i;
    ctx.fillText(formatPrice(price), w - 4, PAD.top + (priceH / 5) * i + 4);
  }
  ctx.textAlign = 'center';
  const step = Math.floor(candles.length / Math.min(6, candles.length));
  for (let i = 0; i < candles.length; i += step) {
    ctx.fillText(formatTime(candles[i].t, interval), px(i) + PAD.left / 2, h - PAD.bottom + 14);
  }
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]; const x = px(i); const bw = Math.max(1, chartW / candles.length - 1);
    ctx.fillStyle = c.c >= c.o ? 'rgba(52,211,153,0.18)' : 'rgba(251,113,133,0.18)';
    ctx.fillRect(x - bw / 2, vy(c.v), bw, h - PAD.bottom - vy(c.v));
  }
  if (mode === 'candle') {
    const bw = Math.max(1.5, (chartW / candles.length) * 0.6);
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]; const x = px(i); const isUp = c.c >= c.o;
      ctx.strokeStyle = isUp ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)';
      ctx.fillStyle   = isUp ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)';
      ctx.lineWidth = 1 / dpr;
      ctx.beginPath(); ctx.moveTo(x, py(c.h)); ctx.lineTo(x, py(c.l)); ctx.stroke();
      const top = py(Math.max(c.o, c.c)); const bodyH = Math.max(1, py(Math.min(c.o, c.c)) - top);
      ctx.fillRect(x - bw / 2, top, bw, bodyH); ctx.strokeRect(x - bw / 2, top, bw, bodyH);
    }
  } else {
    ctx.beginPath();
    for (let i = 0; i < candles.length; i++) { const x = px(i); const y = py(candles[i].c); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    if (mode === 'area') {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + priceH);
      grad.addColorStop(0, symbolColor.replace('1)', '0.3)')); grad.addColorStop(1, symbolColor.replace('1)', '0.0)'));
      ctx.lineTo(px(candles.length - 1), PAD.top + priceH); ctx.lineTo(px(0), PAD.top + priceH);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < candles.length; i++) { const x = px(i); const y = py(candles[i].c); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    }
    ctx.strokeStyle = symbolColor; ctx.lineWidth = 1.5 / dpr; ctx.lineJoin = 'round'; ctx.stroke();
  }
  if (crosshair) {
    ctx.strokeStyle = 'rgba(96,165,250,0.4)'; ctx.lineWidth = 1 / dpr; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(crosshair.x, PAD.top); ctx.lineTo(crosshair.x, PAD.top + priceH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.left, crosshair.y); ctx.lineTo(PAD.left + chartW, crosshair.y); ctx.stroke();
    ctx.setLineDash([]);
    const hoverPrice = hi - ((crosshair.y - PAD.top) / priceH) * range;
    if (hoverPrice >= lo && hoverPrice <= hi) {
      ctx.fillStyle = symbolColor;
      ctx.fillRect(PAD.left + chartW + 2, crosshair.y - 8, 56, 16);
      ctx.fillStyle = 'rgba(5,5,14,1)'; ctx.font = (9 / dpr) + 'px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(formatPrice(hoverPrice), PAD.left + chartW + 30, crosshair.y + 4);
    }
  }
}

// ─── OHLCV hook ───────────────────────────────────────────────────────────────

function useOHLCV(symbol: ChartSymbol, interval: Interval) {
  const [candles, setCandles]     = useState<Candle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastPrice, setLastPrice] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const mountedRef = useRef(true);
  const wsRef      = useRef<WebSocket | null>(null);

  const fetchKlines = useCallback(async (sig: AbortSignal) => {
    try {
      const url = 'https://api.binance.com/api/v3/klines?symbol=' + symbol + '&interval=' + interval + '&limit=' + LIMIT;
      const res = await fetch(url, { signal: sig });
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json() as [number, string, string, string, string, string][];
      if (!mountedRef.current) return;
      const parsed: Candle[] = data.map(d => ({ t: d[0], o: +d[1], h: +d[2], l: +d[3], c: +d[4], v: +d[5] }));
      setCandles(parsed);
      if (parsed.length > 0) setLastPrice(parsed[parsed.length - 1].c);
      setLoading(false);
    } catch {}
  }, [symbol, interval]);

  const fetch24h = useCallback(async (sig: AbortSignal) => {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=' + symbol, { signal: sig });
      if (!res.ok || !mountedRef.current) return;
      const d = await res.json() as Record<string, string>;
      if (!mountedRef.current) return;
      setChange24h(parseFloat(d.priceChangePercent));
    } catch {}
  }, [symbol]);

  useEffect(() => {
    mountedRef.current = true;
    const ctrl = new AbortController();
    setLoading(true);
    fetchKlines(ctrl.signal);
    fetch24h(ctrl.signal);

    const wsUrl = 'wss://stream.binance.com:9443/ws/' + symbol.toLowerCase() + '@kline_' + interval;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e: MessageEvent<string>) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(e.data) as { k: Record<string, string | boolean> };
        const k = msg.k;
        if (!k) return;
        const c: Candle = { t: Number(k.t), o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v };
        setLastPrice(c.c);
        setCandles(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.t === c.t) { const next = [...prev]; next[next.length - 1] = c; return next; }
          return [...prev.slice(-(LIMIT - 1)), c];
        });
      } catch {}
    };
    ws.onerror = () => ws.close();

    return () => { mountedRef.current = false; ctrl.abort(); ws.close(); };
  }, [symbol, interval, fetchKlines, fetch24h]);

  return { candles, loading, lastPrice, change24h };
}

// ─── Component ────────────────────────────────────────────────────────────────

const PriceChartTile = memo(() => {
  const [symbol,    setSymbol]    = useState<ChartSymbol>('BTCUSDT');
  const [interval,  setInterval]  = useState<Interval>('1h');
  const [mode,      setMode]      = useState<ChartMode>('candle');
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [hoverCandle, setHoverCandle] = useState<Candle | null>(null);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef      = useRef<number>(0);
  const workerRef    = useRef<Worker | null>(null);
  const offscreenRef = useRef<boolean>(false); // true = worker mode active
  const mountedRef   = useRef(true);

  const { candles, loading, lastPrice, change24h } = useOHLCV(symbol, interval);

  // Phase 7: useWebGPU — detect render backend
  const { backend, isWebGL2 } = useWebGPU();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const symbolColor = useMemo(() => SYMBOL_COLORS[symbol], [symbol]);
  const symbolLabel = useMemo(() => SYMBOL_LABELS[symbol], [symbol]);

  // ── Phase 7: OffscreenCanvas worker setup ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof OffscreenCanvas === 'undefined' || !canvas.transferControlToOffscreen) {
      offscreenRef.current = false;
      return;
    }
    try {
      const worker = new Worker(
        new URL('../../workers/chartWorker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'INIT', canvas: offscreen }, [offscreen]);

      worker.onmessage = (e: MessageEvent<{ type: string }>) => {
        if (e.data.type === 'READY') offscreenRef.current = true;
      };
      worker.onerror = () => {
        offscreenRef.current = false;
        workerRef.current = null;
      };
    } catch {
      offscreenRef.current = false;
      workerRef.current    = null;
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current    = null;
      offscreenRef.current = false;
    };
  }, []); // run once on mount

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    if (!mountedRef.current) return;
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w   = container.clientWidth;
    const h   = container.clientHeight;

    if (offscreenRef.current && workerRef.current) {
      // OffscreenCanvas path — send draw command to worker
      workerRef.current.postMessage({
        type: 'DRAW', candles, w, h, mode, symbolColor, crosshair, interval, dpr,
      });
    } else {
      // Main-thread fallback
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width  = w + 'px';
        canvas.style.height = h + 'px';
      }
      // Hint: WebGL2 available — enable imageSmoothingQuality high
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) return;
      if (isWebGL2) ctx.imageSmoothingQuality = 'high';
      ctx.save();
      ctx.scale(dpr, dpr);
      drawChartMainThread(ctx, candles, w, h, mode, symbolColor, crosshair, interval, dpr);
      ctx.restore();
    }
  }, [candles, mode, symbolColor, crosshair, interval, isWebGL2]);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(draw);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrosshair({ x, y });
    const chartW = rect.width - PAD.left - PAD.right;
    const idx    = Math.round(((x - PAD.left) / chartW) * (candles.length - 1));
    setHoverCandle(candles[Math.max(0, Math.min(idx, candles.length - 1))]);
  }, [candles]);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
    setHoverCandle(null);
  }, []);

  const onSymbol   = useCallback((s: ChartSymbol) => setSymbol(s), []);
  const onInterval = useCallback((iv: Interval) => setInterval(iv), []);
  const onMode     = useCallback((m: ChartMode) => setMode(m), []);

  const changeColor = useMemo(() =>
    change24h >= 0 ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)', [change24h]);

  const headerStyle = useMemo(() => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, flexWrap: 'wrap' as const, gap: 6,
  }), []);

  const btnBase: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    padding: '3px 8px', borderRadius: 4,
    border: '1px solid rgba(96,165,250,0.15)',
    background: 'transparent', color: 'rgba(148,163,184,0.6)',
    cursor: 'pointer', transition: 'all 0.15s',
  };
  const btnActive: React.CSSProperties = {
    ...btnBase, background: 'rgba(96,165,250,0.12)',
    color: 'rgba(226,232,240,0.92)', borderColor: 'rgba(96,165,250,0.4)',
  };

  // Backend badge color
  const backendColor = useMemo(() => {
    if (backend === 'webgpu')  return 'rgba(167,139,250,0.7)';
    if (backend === 'webgl2')  return 'rgba(96,165,250,0.7)';
    if (backend === 'webgl1')  return 'rgba(251,191,36,0.7)';
    return 'rgba(148,163,184,0.4)';
  }, [backend]);

  return (
    <GlassCard style={{ height: 420, display: 'flex', flexDirection: 'column', padding: '12px' }} accentColor={symbolColor}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {SYMBOLS.map(s => (
            <button
              key={s}
              style={symbol === s ? { ...btnActive, color: SYMBOL_COLORS[s], borderColor: SYMBOL_COLORS[s].replace('1)', '0.5)') } : btnBase}
              onClick={() => onSymbol(s)}
              aria-label={SYMBOL_LABELS[s]}
              aria-pressed={symbol === s}
            >
              {SYMBOL_LABELS[s]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: 'rgba(226,232,240,0.95)' }}>
            {lastPrice > 0 ? formatPrice(lastPrice) : '—'}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: changeColor }}>
            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
          </span>
          {/* Phase 7: Backend badge */}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: backendColor, letterSpacing: '0.06em' }}>
            {backend.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {INTERVALS.map(iv => (
            <button key={iv} style={interval === iv ? btnActive : btnBase} onClick={() => onInterval(iv)} aria-label={iv}>
              {iv}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {(['candle', 'line', 'area'] as ChartMode[]).map(m => (
            <button key={m} style={mode === m ? btnActive : btnBase} onClick={() => onMode(m)} aria-label={m}>
              {m === 'candle' ? '🕯' : m === 'line' ? '📈' : '▲'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hoverCandle && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ display: 'flex', gap: 12, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(148,163,184,0.8)' }}
          >
            <span style={{ color: 'rgba(148,163,184,0.5)' }}>{formatTime(hoverCandle.t, interval)}</span>
            <span>O <span style={{ color: 'rgba(226,232,240,0.9)' }}>{formatPrice(hoverCandle.o)}</span></span>
            <span>H <span style={{ color: COLOR.up }}>{formatPrice(hoverCandle.h)}</span></span>
            <span>L <span style={{ color: COLOR.down }}>{formatPrice(hoverCandle.l)}</span></span>
            <span>C <span style={{ color: hoverCandle.c >= hoverCandle.o ? COLOR.up : COLOR.down }}>{formatPrice(hoverCandle.c)}</span></span>
            <span>V <span style={{ color: 'rgba(226,232,240,0.7)' }}>{formatCompact(hoverCandle.v)}</span></span>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(96,165,250,0.5)' }}>
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
              {'LOADING ' + symbolLabel + '/USD [' + interval + ']...'}
            </motion.span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', willChange: 'transform' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-label={'Price chart for ' + symbolLabel}
          role="img"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(148,163,184,0.3)' }}>
        <span>{'BINANCE · ' + symbolLabel + '/USDT · ' + interval.toUpperCase()}</span>
        <span style={{ color: 'rgba(52,211,153,0.5)' }}>
          {offscreenRef.current ? '⚡ OFFSCREEN · LIVE' : '● LIVE'}
        </span>
      </div>
    </GlassCard>
  );
});

PriceChartTile.displayName = 'PriceChartTile';
export default PriceChartTile;
