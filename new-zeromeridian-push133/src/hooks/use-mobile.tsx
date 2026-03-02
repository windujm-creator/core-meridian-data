/**
 * use-mobile.tsx — ZERØ MERIDIAN 2026 push75
 * push75: Fixed template literal → string concatenation.
 * NOTE: This hook is shadcn boilerplate, kept for compatibility.
 * Prefer useBreakpoint.ts for ZM internal usage.
 * - Zero template literals ✓
 */

import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: ' + (MOBILE_BREAKPOINT - 1) + 'px)');
    const onChange = () => { setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
