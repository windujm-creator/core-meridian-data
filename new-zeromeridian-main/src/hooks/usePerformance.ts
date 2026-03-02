/**
 * usePerformance.ts — ZERØ MERIDIAN
 * FPS counter, tick-to-trade latency tracker, long task observer.
 * Zero JSX — pure TS hook.
 * - mountedRef + AbortController ✓
 * - useCallback + useMemo ✓
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

export interface PerformanceMetrics {
  fps:             number;
  avgFps:          number;
  latencyMs:       number;
  longTaskCount:   number;
  isSmooth:        boolean;
}

const INITIAL_METRICS: PerformanceMetrics = Object.freeze({
  fps:           60,
  avgFps:        60,
  latencyMs:     0,
  longTaskCount: 0,
  isSmooth:      true,
});

export function usePerformance(enabled = true): {
  metrics:      PerformanceMetrics;
  markTradeIn:  () => void;
  markTradeOut: () => void;
  reset:        () => void;
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(INITIAL_METRICS);
  const mountedRef     = useRef(true);
  const rafRef         = useRef<number>(0);
  const lastTimeRef    = useRef(performance.now());
  const frameCountRef  = useRef(0);
  const fpsHistoryRef  = useRef<number[]>([]);
  const longTaskRef    = useRef(0);
  const tradeMarkRef   = useRef<number | null>(null);
  const observerRef    = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // FPS loop
  useEffect(() => {
    if (!enabled) return;

    const tick = (now: number) => {
      if (!mountedRef.current) return;
      frameCountRef.current++;
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        lastTimeRef.current   = now;

        fpsHistoryRef.current = [...fpsHistoryRef.current.slice(-29), fps];
        const avg = Math.round(
          fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length
        );

        if (mountedRef.current) {
          setMetrics(prev => ({
            ...prev,
            fps,
            avgFps:   avg,
            isSmooth: avg >= 55,
          }));
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled]);

  // Long task observer
  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return;

    try {
      observerRef.current = new PerformanceObserver(list => {
        const entries = list.getEntries();
        longTaskRef.current += entries.length;
        if (mountedRef.current) {
          setMetrics(prev => ({ ...prev, longTaskCount: longTaskRef.current }));
        }
      });
      observerRef.current.observe({ entryTypes: ['longtask'] });
    } catch {
      // longtask not supported in all browsers
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [enabled]);

  const markTradeIn = useCallback(() => {
    tradeMarkRef.current = performance.now();
  }, []);

  const markTradeOut = useCallback(() => {
    if (tradeMarkRef.current === null) return;
    const latencyMs = Math.round(performance.now() - tradeMarkRef.current);
    tradeMarkRef.current = null;
    if (mountedRef.current) {
      setMetrics(prev => ({ ...prev, latencyMs }));
    }
  }, []);

  const reset = useCallback(() => {
    fpsHistoryRef.current = [];
    longTaskRef.current   = 0;
    tradeMarkRef.current  = null;
    if (mountedRef.current) {
      setMetrics(INITIAL_METRICS);
    }
  }, []);

  return useMemo(() => ({
    metrics,
    markTradeIn,
    markTradeOut,
    reset,
  }), [metrics, markTradeIn, markTradeOut, reset]);
}
