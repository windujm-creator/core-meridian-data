/**
 * SparklineChart.tsx — ZERØ MERIDIAN 2026 Phase 7
 * UPGRADE Phase 7:
 * - OffscreenCanvas: draw off-thread via new OffscreenCanvas() + transferToImageBitmap()
 * - BitmapRenderer context for zero-copy transfer to visible canvas
 * Fallback to main-thread canvas2d if OffscreenCanvas not supported.
 * React.memo + displayName ✓  rgba() only ✓
 */

import { memo, useRef, useEffect, useMemo } from 'react';

interface SparklineChartProps {
  data:   number[];
  width:  number;
  height: number;
  color?: 'auto' | string;
}

function drawSparkline(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  data: number[], width: number, height: number,
  color: string, isPositive: boolean
): void {
  ctx.clearRect(0, 0, width, height);
  if (data.length < 2) return;

  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pad   = 2;
  const w     = width;
  const h     = height - pad * 2;
  const stepX = w / (data.length - 1);

  const grad = ctx.createLinearGradient(0, pad, 0, height);
  grad.addColorStop(0, isPositive ? 'rgba(0,155,95,0.25)' : 'rgba(208,35,75,0.20)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  data.forEach((val, i) => {
    const x = i * stepX;
    const y = pad + h - ((val - min) / range) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo((data.length - 1) * stepX, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  data.forEach((val, i) => {
    const x = i * stepX;
    const y = pad + h - ((val - min) / range) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();

  const lastX = (data.length - 1) * stepX;
  const lastY = pad + h - ((data[data.length - 1] - min) / range) * h;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

const SparklineChart = memo(({ data, width, height, color = 'auto' }: SparklineChartProps) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const isPositive = useMemo(() => {
    if (!data || data.length < 2) return true;
    return data[data.length - 1] >= data[0];
  }, [data]);

  const resolvedColor = useMemo(() => {
    if (color !== 'auto') return color;
    return isPositive ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)';
  }, [color, isPositive]);

  useEffect(() => {
    if (!data || data.length < 2 || !canvasRef.current || !mountedRef.current) return;
    cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (!mountedRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const dpr    = window.devicePixelRatio || 1;
      const pw     = width  * dpr;
      const ph     = height * dpr;

      // Phase 7: OffscreenCanvas path — draw off-thread, transfer bitmap
      if (typeof OffscreenCanvas !== 'undefined' && 'transferToImageBitmap' in OffscreenCanvas.prototype) {
        try {
          const offscreen = new OffscreenCanvas(pw, ph);
          const octx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
          if (octx) {
            octx.scale(dpr, dpr);
            drawSparkline(octx, data, width, height, resolvedColor, isPositive);
            const bitmap = offscreen.transferToImageBitmap();

            canvas.width  = pw;
            canvas.height = ph;
            canvas.style.width  = width  + 'px';
            canvas.style.height = height + 'px';

            // BitmapRenderer context — zero-copy transfer
            const brc = canvas.getContext('bitmaprenderer') as ImageBitmapRenderingContext | null;
            if (brc) {
              brc.transferFromImageBitmap(bitmap);
            } else {
              // fallback: drawImage
              const ctx2 = canvas.getContext('2d');
              if (ctx2) { ctx2.drawImage(bitmap, 0, 0); }
              bitmap.close();
            }
            return;
          }
        } catch {
          // OffscreenCanvas failed — fall through to main-thread
        }
      }

      // Main-thread fallback
      canvas.width  = pw;
      canvas.height = ph;
      canvas.style.width  = width  + 'px';
      canvas.style.height = height + 'px';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      drawSparkline(ctx, data, width, height, resolvedColor, isPositive);
    });
  }, [data, width, height, resolvedColor, isPositive]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', borderRadius: '4px', willChange: 'transform' }}
      aria-hidden="true"
    />
  );
});

SparklineChart.displayName = 'SparklineChart';
export default SparklineChart;
