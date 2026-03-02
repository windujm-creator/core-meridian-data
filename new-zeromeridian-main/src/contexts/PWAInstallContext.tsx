/**
 * PWAInstallContext.tsx — ZERØ MERIDIAN 2026 push78
 * push78: Expose PWA install prompt globally so Topbar can trigger install.
 * Architecture:
 *   - PWAInstallProvider: intercepts beforeinstallprompt, stores deferred event
 *   - usePWAInstall(): { canInstall, isIOS, isInstalled, triggerInstall, dismissInstall }
 *   - Consumed by: Topbar (install button) + PWAInstallPrompt (banner)
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero className ✓
 * - Zero template literals ✓
 * - useCallback + useMemo + mountedRef ✓
 * - Object.freeze() static data ✓
 */

import React, {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, useMemo, type ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PWAInstallAPI {
  /** true if Chrome/Edge/Android — native install prompt available */
  canInstall:     boolean;
  /** true if Safari iOS — show manual steps */
  isIOS:          boolean;
  /** true if already installed (standalone mode) */
  isInstalled:    boolean;
  /** true if user dismissed and pressed X */
  isDismissed:    boolean;
  /** Call to trigger the native install prompt (or show iOS sheet) */
  triggerInstall: () => Promise<void>;
  /** Call to permanently dismiss */
  dismissInstall: () => void;
  /** Reset dismissed state (for settings page) */
  resetDismiss:   () => void;
}

const NOOP_API: PWAInstallAPI = Object.freeze({
  canInstall:     false,
  isIOS:          false,
  isInstalled:    false,
  isDismissed:    false,
  triggerInstall: async () => {},
  dismissInstall: () => {},
  resetDismiss:   () => {},
});

// ─── Context ──────────────────────────────────────────────────────────────────

const PWAInstallContext = createContext<PWAInstallAPI>(NOOP_API);
PWAInstallContext.displayName = 'PWAInstallContext';

// ─── Provider ─────────────────────────────────────────────────────────────────

export const PWAInstallProvider = React.memo(({ children }: { children: ReactNode }) => {
  const mountedRef  = useRef(true);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  const [canInstall,  setCanInstall]  = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // ── Detect environment ────────────────────────────────────────────────────

  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream: unknown }).MSStream;
  }, []);

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone: boolean }).standalone === true
    );
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    // Pre-load dismissed state
    try {
      if (localStorage.getItem('zm-pwa-dismissed') === '1') setIsDismissed(true);
    } catch { /* storage blocked */ }

    if (isStandalone) {
      setIsInstalled(true);
      return () => { mountedRef.current = false; };
    }

    // iOS: can "install" via manual steps
    if (isIOS) {
      setCanInstall(true);
      return () => { mountedRef.current = false; };
    }

    // Chrome/Edge: listen for deferred prompt
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      if (mountedRef.current) setCanInstall(true);
    };

    const handleInstalled = () => {
      if (mountedRef.current) {
        setIsInstalled(true);
        setCanInstall(false);
        deferredRef.current = null;
      }
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [isIOS, isStandalone]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const triggerInstall = useCallback(async () => {
    if (!mountedRef.current) return;
    if (isIOS) {
      // Dispatch custom event — PWAInstallPrompt listens for this to show iOS sheet
      window.dispatchEvent(new CustomEvent('zm-show-ios-install'));
      return;
    }
    if (!deferredRef.current) return;
    try {
      await deferredRef.current.prompt();
      const choice = await deferredRef.current.userChoice;
      if (mountedRef.current && choice.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
      }
      deferredRef.current = null;
    } catch { /* user cancelled or prompt already shown */ }
  }, [isIOS]);

  const dismissInstall = useCallback(() => {
    if (!mountedRef.current) return;
    setIsDismissed(true);
    try { localStorage.setItem('zm-pwa-dismissed', '1'); } catch { /* noop */ }
  }, []);

  const resetDismiss = useCallback(() => {
    if (!mountedRef.current) return;
    setIsDismissed(false);
    try { localStorage.removeItem('zm-pwa-dismissed'); } catch { /* noop */ }
  }, []);

  const api = useMemo<PWAInstallAPI>(() => ({
    canInstall:     canInstall && !isInstalled,
    isIOS,
    isInstalled,
    isDismissed,
    triggerInstall,
    dismissInstall,
    resetDismiss,
  }), [canInstall, isIOS, isInstalled, isDismissed, triggerInstall, dismissInstall, resetDismiss]);

  return (
    <PWAInstallContext.Provider value={api}>
      {children}
    </PWAInstallContext.Provider>
  );
});

PWAInstallProvider.displayName = 'PWAInstallProvider';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePWAInstall(): PWAInstallAPI {
  return useContext(PWAInstallContext);
}

export default PWAInstallContext;
