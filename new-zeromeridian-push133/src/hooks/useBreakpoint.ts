/**
 * useBreakpoint.ts — ZERØ MERIDIAN 2026 push26
 * Mobile/Tablet/Desktop breakpoint detection hook
 * - Zero JSX (pure .ts hook) ✓
 * - Zero template literals → string concat ✓
 * - mountedRef + MediaQueryList listeners ✓
 * - useCallback + useMemo ✓
 * - Zero any ✓
 * - Object.freeze() static data ✓
 */

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';

// ─── Breakpoint pixel values (Object.freeze, no template literals) ────────────

const BP = Object.freeze({
  xs:  0,
  sm:  480,
  md:  768,
  lg:  1024,
  xl:  1280,
  xxl: 1536,
} as const);

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface BreakpointState {
  width:     number;
  bp:        Breakpoint;
  isMobile:  boolean;   // < 768px
  isTablet:  boolean;   // 768-1023px
  isDesktop: boolean;   // >= 1024px
}

function getBreakpoint(w: number): Breakpoint {
  if (w >= BP.xxl) return 'xxl';
  if (w >= BP.xl)  return 'xl';
  if (w >= BP.lg)  return 'lg';
  if (w >= BP.md)  return 'md';
  if (w >= BP.sm)  return 'sm';
  return 'xs';
}

function buildState(w: number): BreakpointState {
  const bp = getBreakpoint(w);
  return {
    width:     w,
    bp,
    isMobile:  w < BP.md,
    isTablet:  w >= BP.md && w < BP.lg,
    isDesktop: w >= BP.lg,
  };
}

export function useBreakpoint(): BreakpointState {
  const mountedRef = useRef(true);

  const getWidth = useCallback((): number => {
    return typeof window !== 'undefined' ? window.innerWidth : BP.lg;
  }, []);

  const [state, setState] = useState<BreakpointState>(() => buildState(getWidth()));

  const handleResize = useCallback(() => {
    if (!mountedRef.current) return;
    const w = getWidth();
    setState(prev => (prev.width === w ? prev : buildState(w)));
  }, [getWidth]);

  useEffect(() => {
    mountedRef.current = true;

    // Use MediaQueryList for efficient detection (no polling)
    const mqlMobile  = window.matchMedia('(max-width: 767px)');
    const mqlTablet  = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const mqlDesktop = window.matchMedia('(min-width: 1024px)');

    mqlMobile.addEventListener('change',  handleResize);
    mqlTablet.addEventListener('change',  handleResize);
    mqlDesktop.addEventListener('change', handleResize);

    handleResize(); // sync on mount

    return () => {
      mountedRef.current = false;
      mqlMobile.removeEventListener('change',  handleResize);
      mqlTablet.removeEventListener('change',  handleResize);
      mqlDesktop.removeEventListener('change', handleResize);
    };
  }, [handleResize]);

  return useMemo(() => state, [state]);
}
