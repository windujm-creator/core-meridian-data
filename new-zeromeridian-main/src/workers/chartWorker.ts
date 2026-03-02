/**
 * chartWorker.ts — ZERØ MERIDIAN 2026 Phase 7
 * OffscreenCanvas chart renderer — off main thread drawing.
 * Receives canvas + draw commands, renders PriceChart off-thread.
 * Zero JSX. Zero DOM. Pure CanvasRenderingContext2D via OffscreenCanvas.
 */

type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type ChartMode = 'candle' | 'line' | 'area';

interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; }
interface Crosshair { x: number; y: number; }

type WorkerInMessage =
  | { type: 'INIT'; canvas: OffscreenCanvas }
  | { type: 'DRAW'; candles: Candle[]; w: number; h: number; mode: ChartMode; symbolColor: string; crosshair: Crosshair | null; interval: Interval; dpr: number };

type WorkerOutMessage =
  | { type: 'READY' }
  | { type: 'DRAWN' };

// ─── Drawing constants ────────────────────────────────────────────────────────

const COLOR = Object.freeze({
  up:        'rgba(52,211,153,1)',
  upFill:    'rgba(52,211,153,0.15)',
  down:      'rgba(251,113,133,1)',
  downFill:  'rgba(251,113,133,0.15)',
  grid:      'rgba(96,165,250,0.06)',
  text:      'rgba(148,163,184,0.5)',
  crosshair: 'rgba(96,165,250,0.4)',
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
  if (interval === '4h' || interval === '1h') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ─── Chart drawing ────────────────────────────────────────────────────────────

function drawChart(
  ctx: OffscreenCanvasRenderingContext2D,
  candles: Candle[],
  w: number, h: number,
  mode: ChartMode,
  symbolColor: string,
  crosshair: Crosshair | null,
  interval: Interval,
  dpr: number,
): void {
  ctx.clearRect(0, 0, w, h);
  if (candles.length < 2) return;

  const chartW = w - PAD.left - PAD.right;
  const chartH = h - PAD.top - PAD.bottom;
  const volH   = Math.floor(chartH * 0.18);
  const priceH = chartH - volH - 8;

  let minP = Infinity, maxP = -Infinity;
  for (const c of candles) {
    if (c.l < minP) minP = c.l;
    if (c.h > maxP) maxP = c.h;
  }
  const pricePad = (maxP - minP || 1) * 0.05;
  const lo = minP - pricePad;
  const hi = maxP + pricePad;
  const range = hi - lo;

  let maxV = 0;
  for (const c of candles) if (c.v > maxV) maxV = c.v;

  const px = (i: number) => PAD.left + (i / (candles.length - 1)) * chartW;
  const py = (price: number) => PAD.top + priceH - ((price - lo) / range) * priceH;
  const vy = (vol: number) => h - PAD.bottom - (vol / (maxV || 1)) * volH;

  // Grid
  ctx.strokeStyle = COLOR.grid;
  ctx.lineWidth = 1 / dpr;
  for (let i = 0; i <= 5; i++) {
    const yy = PAD.top + (priceH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(PAD.left, yy);
    ctx.lineTo(PAD.left + chartW, yy);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = COLOR.text;
  ctx.font = (10 / dpr) + 'px JetBrains Mono, monospace';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const price = hi - (range / 5) * i;
    const yy = PAD.top + (priceH / 5) * i;
    ctx.fillText(formatPrice(price), w - 4, yy + 4);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  const labelCount = Math.min(6, candles.length);
  const step = Math.floor(candles.length / labelCount);
  for (let i = 0; i < candles.length; i += step) {
    ctx.fillText(formatTime(candles[i].t, interval), px(i) + PAD.left / 2, h - PAD.bottom + 14);
  }

  // Volume bars
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const x = px(i);
    const bw = Math.max(1, chartW / candles.length - 1);
    ctx.fillStyle = c.c >= c.o ? 'rgba(52,211,153,0.18)' : 'rgba(251,113,133,0.18)';
    ctx.fillRect(x - bw / 2, vy(c.v), bw, h - PAD.bottom - vy(c.v));
  }

  if (mode === 'candle') {
    const bw = Math.max(1.5, (chartW / candles.length) * 0.6);
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = px(i);
      const isUp = c.c >= c.o;
      const col = isUp ? COLOR.up : COLOR.down;
      ctx.strokeStyle = col;
      ctx.fillStyle = isUp ? COLOR.upFill : COLOR.downFill;
      ctx.lineWidth = 1 / dpr;
      ctx.beginPath();
      ctx.moveTo(x, py(c.h));
      ctx.lineTo(x, py(c.l));
      ctx.stroke();
      const top = py(Math.max(c.o, c.c));
      const bot = py(Math.min(c.o, c.c));
      const bodyH = Math.max(1, bot - top);
      ctx.fillRect(x - bw / 2, top, bw, bodyH);
      ctx.strokeRect(x - bw / 2, top, bw, bodyH);
    }
  } else {
    ctx.beginPath();
    for (let i = 0; i < candles.length; i++) {
      const x = px(i);
      const y = py(candles[i].c);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    if (mode === 'area') {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + priceH);
      grad.addColorStop(0, symbolColor.replace('1)', '0.3)'));
      grad.addColorStop(1, symbolColor.replace('1)', '0.0)'));
      ctx.lineTo(px(candles.length - 1), PAD.top + priceH);
      ctx.lineTo(px(0), PAD.top + priceH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < candles.length; i++) {
        const x = px(i);
        const y = py(candles[i].c);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = symbolColor;
    ctx.lineWidth = 1.5 / dpr;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Crosshair
  if (crosshair) {
    ctx.strokeStyle = COLOR.crosshair;
    ctx.lineWidth = 1 / dpr;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(crosshair.x, PAD.top);
    ctx.lineTo(crosshair.x, PAD.top + priceH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(PAD.left, crosshair.y);
    ctx.lineTo(PAD.left + chartW, crosshair.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const hoverPrice = hi - ((crosshair.y - PAD.top) / priceH) * range;
    if (hoverPrice >= lo && hoverPrice <= hi) {
      ctx.fillStyle = symbolColor;
      ctx.fillRect(PAD.left + chartW + 2, crosshair.y - 8, 56, 16);
      ctx.fillStyle = 'rgba(5,5,14,1)';
      ctx.font = (9 / dpr) + 'px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatPrice(hoverPrice), PAD.left + chartW + 30, crosshair.y + 4);
    }
  }
}

// ─── Worker state ─────────────────────────────────────────────────────────────

let offscreen: OffscreenCanvas | null = null;

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === 'INIT') {
    offscreen = msg.canvas;
    const out: WorkerOutMessage = { type: 'READY' };
    self.postMessage(out);
    return;
  }

  if (msg.type === 'DRAW' && offscreen) {
    const { candles, w, h, mode, symbolColor, crosshair, interval, dpr } = msg;

    // Resize if needed
    if (offscreen.width !== Math.round(w * dpr) || offscreen.height !== Math.round(h * dpr)) {
      offscreen.width  = Math.round(w * dpr);
      offscreen.height = Math.round(h * dpr);
    }

    const ctx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    drawChart(ctx, candles, w, h, mode, symbolColor, crosshair, interval, dpr);
    ctx.restore();

    const out: WorkerOutMessage = { type: 'DRAWN' };
    self.postMessage(out);
  }
};
