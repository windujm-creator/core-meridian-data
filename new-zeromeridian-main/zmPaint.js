/**
 * houdiniPaintWorklet.js — ZERØ MERIDIAN 2026 Phase 9
 * CSS Houdini Paint Worklet — custom chart backgrounds.
 *
 * Registered as: CSS.paintWorklet.addModule('/houdini/zmPaint.js')
 * Used via CSS: background: paint(zm-aurora-grid)
 *
 * Paints:
 * 1. zm-aurora-grid   — animated aurora glow + subtle grid overlay
 * 2. zm-price-bg      — gradient bg that responds to --zm-trend (1 = up, -1 = down)
 * 3. zm-noise-tile    — crypto-noir grain texture
 *
 * Custom Properties consumed:
 * --zm-trend      <number>   : -1 to 1 (bearish → bullish)
 * --zm-intensity  <number>   : 0 to 1 (pulse strength)
 * --zm-hue        <number>   : 0 to 360 (base color)
 */

/* global registerPaint */

// ── zm-aurora-grid ────────────────────────────────────────────────────────────
class ZMAuroraGrid {
  static get inputProperties() {
    return ['--zm-trend', '--zm-intensity', '--zm-hue'];
  }

  paint(ctx, geom, props) {
    const W = geom.width;
    const H = geom.height;

    const trend     = parseFloat(props.get('--zm-trend')?.toString()  ?? '0');
    const intensity = parseFloat(props.get('--zm-intensity')?.toString() ?? '0.5');
    const hue       = parseFloat(props.get('--zm-hue')?.toString() ?? '220');

    // Base dark fill
    ctx.fillStyle = 'rgba(5,5,14,0.98)';
    ctx.fillRect(0, 0, W, H);

    // Aurora blobs
    const blobColor1 = trend >= 0
      ? `rgba(52,211,153,${0.06 * intensity})`    // bullish = green
      : `rgba(251,113,133,${0.06 * intensity})`;   // bearish = red

    const blobColor2 = `rgba(96,165,250,${0.04 * intensity})`;

    // Blob 1 — top left
    const g1 = ctx.createRadialGradient(W * 0.15, H * 0.3, 0, W * 0.15, H * 0.3, W * 0.5);
    g1.addColorStop(0, blobColor1);
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // Blob 2 — bottom right
    const g2 = ctx.createRadialGradient(W * 0.85, H * 0.7, 0, W * 0.85, H * 0.7, W * 0.45);
    g2.addColorStop(0, blobColor2);
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    const GRID_SIZE = 32;
    ctx.strokeStyle = `rgba(${hue > 180 ? '96,165,250' : '154,230,180'},0.04)`;
    ctx.lineWidth = 0.5;

    for (let x = 0; x < W; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Scanline effect (subtle horizontal lines every 2px)
    ctx.fillStyle = 'rgba(0,0,0,0.015)';
    for (let y = 0; y < H; y += 2) {
      ctx.fillRect(0, y, W, 1);
    }
  }
}

// ── zm-price-bg ───────────────────────────────────────────────────────────────
class ZMPriceBg {
  static get inputProperties() {
    return ['--zm-trend', '--zm-intensity'];
  }

  paint(ctx, geom, props) {
    const W = geom.width;
    const H = geom.height;

    const trend     = parseFloat(props.get('--zm-trend')?.toString()  ?? '0');
    const intensity = parseFloat(props.get('--zm-intensity')?.toString() ?? '0.5');

    // Background
    ctx.fillStyle = 'rgba(8,10,18,0.97)';
    ctx.fillRect(0, 0, W, H);

    // Trend-responsive gradient (bottom → top)
    const alpha = 0.08 * Math.abs(trend) * intensity;
    const color = trend >= 0
      ? `rgba(52,211,153,${alpha})`
      : `rgba(251,113,133,${alpha})`;

    const g = ctx.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, color);
    g.addColorStop(0.5, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Border glow (bottom edge)
    const borderAlpha = 0.15 * Math.abs(trend) * intensity;
    const borderColor = trend >= 0
      ? `rgba(52,211,153,${borderAlpha})`
      : `rgba(251,113,133,${borderAlpha})`;

    ctx.fillStyle = borderColor;
    ctx.fillRect(0, H - 1, W, 1);
  }
}

// ── zm-noise-tile ─────────────────────────────────────────────────────────────
class ZMNoiseTile {
  static get inputProperties() {
    return ['--zm-intensity'];
  }

  paint(ctx, geom, props) {
    const W = geom.width;
    const H = geom.height;
    const intensity = parseFloat(props.get('--zm-intensity')?.toString() ?? '0.3');

    // Base
    ctx.fillStyle = 'rgba(8,10,18,1)';
    ctx.fillRect(0, 0, W, H);

    // Noise grain (deterministic pattern — NOT Math.random)
    const imageData = ctx.createImageData(W, H);
    const data = imageData.data;

    // Deterministic noise: based on pixel position hash
    for (let i = 0; i < data.length; i += 4) {
      const px = (i / 4) % W;
      const py = Math.floor((i / 4) / W);
      // Simple hash
      const n = ((px * 127 + py * 311) ^ (px * 53)) & 0xFF;
      const grain = (n / 255) * intensity * 20;
      data[i]     = grain;
      data[i + 1] = grain;
      data[i + 2] = grain;
      data[i + 3] = Math.floor(grain * 0.8);
    }

    ctx.putImageData(imageData, 0, 0);
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

registerPaint('zm-aurora-grid', ZMAuroraGrid);
registerPaint('zm-price-bg',    ZMPriceBg);
registerPaint('zm-noise-tile',  ZMNoiseTile);
