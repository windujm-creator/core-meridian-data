/**
 * useDevicePerf.ts — ZERØ MERIDIAN push103
 * push103: Detect mid-range/low-end device → disable heavy backdropFilter
 * Strategy:
 *   1. navigator.hardwareConcurrency < 4  → low-end
 *   2. deviceMemory < 4 (GB)              → low-end
 *   3. Canvas 2D micro-benchmark (< 8ms)  → mid-range OK, else low
 *   4. Result cached in sessionStorage key "zm_perf_tier"
 * - Zero JSX — pure TS hook ✓
 * - mountedRef + useEffect cleanup ✓
 * - Object.freeze() constants ✓
 * - React.memo + displayName N/A (hook) ✓
 */

import { useState, useEffect, useRef } from 'react';

export type PerfTier = 'high' | 'mid' | 'low';

export interface DevicePerfResult {
  tier:          PerfTier;
  blur:          boolean;   // true = safe to use backdropFilter blur
  heavyBlur:     boolean;   // true = safe to use blur(20px+)
  ready:         boolean;   // false while benchmarking
}

const CACHE_KEY = 'zm_perf_tier';

const INITIAL: DevicePerfResult = Object.freeze({
  tier:      'high',
  blur:      true,
  heavyBlur: true,
  ready:     false,
});

function tierToResult(tier: PerfTier): DevicePerfResult {
  return Object.freeze({
    tier,
    blur:      tier !== 'low',
    heavyBlur: tier === 'high',
    ready:     true,
  });
}

function canvasBenchmark(): number {
  try {
    const canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 99;
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = 'rgba(' + (i % 255) + ',' + (i % 200) + ',' + (i % 100) + ',0.5)';
      ctx.fillRect(i % 256, i % 256, 32, 32);
    }
    return performance.now() - t0;
  } catch {
    return 99;
  }
}

function detectTier(): PerfTier {
  // Check cache first
  try {
    const cached = sessionStorage.getItem(CACHE_KEY) as PerfTier | null;
    if (cached === 'high' || cached === 'mid' || cached === 'low') return cached;
  } catch { /* ignore */ }

  // Check hardware signals
  const cores  = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  let tier: PerfTier;

  if (cores <= 2 || memory <= 2) {
    tier = 'low';
  } else if (cores >= 8 && memory >= 8) {
    // High-end hint — still benchmark to confirm
    const ms = canvasBenchmark();
    tier = ms < 6 ? 'high' : 'mid';
  } else {
    // Mid-range — benchmark decides
    const ms = canvasBenchmark();
    tier = ms < 10 ? 'mid' : 'low';
  }

  // Cache result for session
  try { sessionStorage.setItem(CACHE_KEY, tier); } catch { /* ignore */ }

  return tier;
}

let _cachedResult: DevicePerfResult | null = null;

export function useDevicePerf(): DevicePerfResult {
  const mountedRef = useRef(true);
  const [result, setResult] = useState<DevicePerfResult>(
    _cachedResult ?? INITIAL
  );

  useEffect(() => {
    mountedRef.current = true;

    if (_cachedResult) {
      if (mountedRef.current) setResult(_cachedResult);
      return;
    }

    // Run benchmark async so it doesn't block first paint
    const id = requestIdleCallback
      ? requestIdleCallback(() => {
          if (!mountedRef.current) return;
          const tier = detectTier();
          _cachedResult = tierToResult(tier);
          if (mountedRef.current) setResult(_cachedResult);
        }, { timeout: 2000 })
      : window.setTimeout(() => {
          if (!mountedRef.current) return;
          const tier = detectTier();
          _cachedResult = tierToResult(tier);
          if (mountedRef.current) setResult(_cachedResult);
        }, 200);

    return () => {
      mountedRef.current = false;
      if (requestIdleCallback && typeof id === 'number') {
        // cancelIdleCallback if available
        (window as Window & { cancelIdleCallback?: (id: number) => void })
          .cancelIdleCallback?.(id);
      } else if (typeof id === 'number') {
        clearTimeout(id);
      }
    };
  }, []);

  return result;
}
