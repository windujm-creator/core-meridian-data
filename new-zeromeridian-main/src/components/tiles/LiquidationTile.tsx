/**
 * LiquidationTile.tsx — ZERØ MERIDIAN 2026
 * Realtime liquidation bubble map — pure Canvas.
 * Data: useLiquidations hook (Binance Futures forceOrder WS — already in repo)
 * Visualisation: animated bubbles sized by USD value, colored by side
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero template literals in JSX attrs ✓
 * - useCallback + useMemo ✓
 */

import { memo, useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../shared/GlassCard';
import { useLiquidations, type LiquidationEvent } from '@/hooks/useLiquidations';
import { deterministicJitter } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bubble {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  glowColor: string;
  label: string;
  usdValue: number;
  alpha: number;
  age: number;     // ms since birth
  maxAge: number;
  isWhale: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BUBBLES = 60;
const BUBBLE_LIFE = 12000; // ms

const COLOR = Object.freeze({
  long:      'rgba(251,113,133,1)',    // SELL = long liquidated = red
  longGlow:  'rgba(251,113,133,0.6)',
  short:     'rgba(52,211,153,1)',     // BUY = short liquidated = green
  shortGlow: 'rgba(52,211,153,0.6)',
  whale:     'rgba(251,191,36,1)',
  whaleGlow: 'rgba(251,191,36,0.7)',
  text:      'rgba(226,232,240,0.9)',
  faint:     'rgba(148,163,184,0.4)',
  grid:      'rgba(96,165,250,0.04)',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function usdToRadius(usd: number): number {
  if (usd >= 10_000_000) return 38;
  if (usd >= 1_000_000)  return 28;
  if (usd >= 500_000)    return 22;
  if (usd >= 100_000)    return 16;
  if (usd >= 50_000)     return 12;
  if (usd >= 10_000)     return 9;
  return 6;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function eventToBubble(ev: LiquidationEvent, canvasW: number, canvasH: number): Bubble {
  const isWhale = ev.isWhale;
  const isLong = ev.side === 'SELL'; // SELL = long position liquidated

  const color = isWhale ? COLOR.whale : isLong ? COLOR.long : COLOR.short;
  const glowColor = isWhale ? COLOR.whaleGlow : isLong ? COLOR.longGlow : COLOR.shortGlow;

  const r = usdToRadius(ev.usdValue);
  const margin = r + 4;

  // deterministicJitter returns 0-511, normalize to 0-1
  const seed = ev.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const jx  = deterministicJitter(seed)      / 511;
  const jy  = deterministicJitter(seed + 1)  / 511;
  const jvx = deterministicJitter(seed + 2)  / 511;
  const jvy = deterministicJitter(seed + 3)  / 511;

  return {
    id: ev.id,
    x: margin + jx * (canvasW - margin * 2),
    y: margin + jy * (canvasH * 0.7),
    vx: (jvx - 0.5) * 0.4,
    vy: (jvy - 0.5) * 0.4,
    r,
    color,
    glowColor,
    label: ev.symbol.replace('USDT', ''),
    usdValue: ev.usdValue,
    alpha: 1,
    age: 0,
    maxAge: isWhale ? BUBBLE_LIFE * 1.5 : BUBBLE_LIFE,
    isWhale,
  };
}

// ─── Canvas Engine ────────────────────────────────────────────────────────────

function drawBubbles(
  ctx: CanvasRenderingContext2D,
  bubbles: Bubble[],
  w: number,
  h: number,
  dpr: number,
) {
  ctx.clearRect(0, 0, w, h);

  // Grid lines (subtle)
  ctx.strokeStyle = COLOR.grid;
  ctx.lineWidth = 1 / dpr;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  for (const b of bubbles) {
    const alpha = b.alpha;
    if (alpha <= 0) continue;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow
    if (b.r > 10) {
      const glowSize = b.isWhale ? b.r * 2.5 : b.r * 1.8;
      const grd = ctx.createRadialGradient(b.x, b.y, b.r * 0.3, b.x, b.y, glowSize);
      grd.addColorStop(0, b.glowColor.replace('0.', '0.15'.slice(0, -1)));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bubble body
    const bodyGrd = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
    bodyGrd.addColorStop(0, b.color.replace('1)', '0.6)'));
    bodyGrd.addColorStop(1, b.color.replace('1)', '0.2)'));
    ctx.fillStyle = bodyGrd;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.isWhale ? 2 / dpr : 1 / dpr;
    ctx.stroke();

    // Whale pulse ring
    if (b.isWhale) {
      const pulse = 1 + Math.sin(Date.now() / 400) * 0.15;
      ctx.strokeStyle = b.color.replace('1)', '0.4)');
      ctx.lineWidth = 1 / dpr;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * pulse * 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Label
    if (b.r >= 9) {
      ctx.fillStyle = COLOR.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.min(9, b.r * 0.65);
      ctx.font = 'bold ' + (fontSize / dpr * dpr) + 'px JetBrains Mono, monospace';
      ctx.fillText(b.label, b.x, b.r >= 14 ? b.y - 3 : b.y);

      if (b.r >= 14) {
        ctx.fillStyle = b.color;
        ctx.font = (fontSize * 0.75 / dpr * dpr) + 'px JetBrains Mono, monospace';
        ctx.fillText(formatUsd(b.usdValue), b.x, b.y + 5);
      }
    }

    ctx.restore();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const LiquidationTile = memo(() => {
  const { events, stats, wsStatus } = useLiquidations();

  const mountedRef    = useRef(true);  // push75: mountedRef
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const bubblesRef    = useRef<Bubble[]>([]);
  const rafRef        = useRef<number>(0);
  const lastEvCountRef = useRef(0);
  const lastFrameRef  = useRef(Date.now());

  // push75: mountedRef cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Spawn new bubbles from new events
  useEffect(() => {
    const container = containerRef.current;
    if (!container || events.length === 0) return;
    const newCount = events.length - lastEvCountRef.current;
    if (newCount <= 0 && lastEvCountRef.current > 0) return;
    lastEvCountRef.current = events.length;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const newEvents = events.slice(0, Math.min(newCount > 0 ? newCount : 5, 10));

    for (const ev of newEvents) {
      if (bubblesRef.current.find(b => b.id === ev.id)) continue;
      bubblesRef.current.push(eventToBubble(ev, w, h));
    }

    // Trim to max
    if (bubblesRef.current.length > MAX_BUBBLES) {
      bubblesRef.current = bubblesRef.current.slice(-MAX_BUBBLES);
    }
  }, [events]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) { rafRef.current = requestAnimationFrame(animate); return; }

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(animate); return; }

    const now = Date.now();
    const dt = now - lastFrameRef.current;
    lastFrameRef.current = now;

    // Update bubbles
    bubblesRef.current = bubblesRef.current.filter(b => b.alpha > 0.01);

    for (const b of bubblesRef.current) {
      b.age += dt;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.998;
      b.vy *= 0.998;

      // Bounce off walls
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
      if (b.y + b.r > h) { b.y = h - b.r; b.vy = -Math.abs(b.vy); }

      // Fade out near end of life
      const progress = b.age / b.maxAge;
      b.alpha = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    drawBubbles(ctx, bubblesRef.current, w, h, dpr);
    ctx.restore();

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  const statusColor = useMemo(() => {
    if (wsStatus === 'connected') return 'rgba(52,211,153,0.8)';
    if (wsStatus === 'reconnecting') return 'rgba(251,191,36,0.8)';
    return 'rgba(251,113,133,0.8)';
  }, [wsStatus]);

  const formatCompact = (n: number) => {
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n.toFixed(0);
  };

  return (
    <GlassCard
      style={{ height: 300, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
      accentColor="rgba(251,113,133,1)"
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px 6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: 'rgba(226,232,240,0.7)', fontWeight: 600, letterSpacing: '0.05em',
          }}>
            LIQUIDATIONS
          </span>
          <span style={{ fontSize: 8, color: statusColor }}>●</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(148,163,184,0.3)' }}>LONGS LIQ</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(251,113,133,0.9)' }}>
              {formatCompact(stats.totalLongLiqUsd)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(148,163,184,0.3)' }}>SHORTS LIQ</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(52,211,153,0.9)' }}>
              {formatCompact(stats.totalShortLiqUsd)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'rgba(148,163,184,0.3)' }}>PER MIN</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(251,191,36,0.9)' }}>
              {stats.eventsPerMinute}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {events.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 6,
          }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor,
              }}
            />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: 'rgba(148,163,184,0.3)',
            }}>
              {wsStatus === 'connected' ? 'WAITING FOR LIQUIDATIONS...' : wsStatus.toUpperCase() + '...'}
            </span>
          </div>
        )}
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Legend + latest whale */}
      <div style={{
        padding: '4px 12px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 8 }}>
          <span style={{ color: 'rgba(251,113,133,0.7)' }}>● LONG LIQ</span>
          <span style={{ color: 'rgba(52,211,153,0.7)' }}>● SHORT LIQ</span>
          <span style={{ color: 'rgba(251,191,36,0.7)' }}>● WHALE ≥$1M</span>
        </div>
        {stats.largestEvent && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
            color: 'rgba(148,163,184,0.35)',
          }}>
            LARGEST: {stats.largestEvent.symbol.replace('USDT', '')} {formatCompact(stats.largestEvent.usdValue)}
          </div>
        )}
      </div>
    </GlassCard>
  );
});

LiquidationTile.displayName = 'LiquidationTile';
export default LiquidationTile;
