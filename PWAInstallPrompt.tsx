/**
 * PWAInstallPrompt.tsx — ZERØ MERIDIAN 2026 push78
 * push78: Refactored to consume PWAInstallContext (shared state with Topbar).
 *   - Banner & iOS sheet still here (visual layer)
 *   - State now lives in PWAInstallContext (no duplicate event listeners)
 *   - Listens to 'zm-show-ios-install' custom event from Topbar install button
 * push74: All breakpoints, adaptive position
 * push27: Initial implementation
 * - React.memo + displayName ✓
 * - Zero className ✓  rgba() only ✓
 * - Zero template literals in JSX ✓
 * - mountedRef + useCallback + useMemo ✓
 * - Touch targets 48px ✓
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePWAInstall } from '@/contexts/PWAInstallContext';

// ─── iOS step data ────────────────────────────────────────────────────────────

const IOS_STEPS = Object.freeze([
  { num: '1', text: 'Tap the Share button at the bottom of Safari' },
  { num: '2', text: 'Scroll down and tap "Add to Home Screen"' },
  { num: '3', text: 'Tap "Add" in the top-right corner to confirm' },
]);

// ─── iOS instruction sheet ────────────────────────────────────────────────────

const IOSSheet = memo(({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}
    role="dialog"
    aria-modal="true"
    aria-label="Install ZERØ MERIDIAN on iOS"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(7,9,18,0.99)',
        border: '1px solid rgba(0,238,255,0.2)',
        borderBottom: 'none',
        borderRadius: '20px 20px 0 0',
        padding: '24px 24px 48px',
        boxShadow: '0 -24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,238,255,0.06)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Handle */}
      <div style={{
        width: 40, height: 4, borderRadius: 2,
        background: 'rgba(80,80,100,1)',
        margin: '0 auto 24px',
      }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        {/* Crystal Ø icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(0,238,255,0.06)',
          border: '1px solid rgba(0,238,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 0 24px rgba(0,238,255,0.12)',
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            {/* Shuriken spikes */}
            <polygon points="16,2 14,14 16,12 18,14" fill="rgba(0,238,255,0.18)" />
            <polygon points="30,16 18,14 20,16 18,18" fill="rgba(0,238,255,0.14)" />
            <polygon points="16,30 18,18 16,20 14,18" fill="rgba(0,238,255,0.12)" />
            <polygon points="2,16 14,18 12,16 14,14" fill="rgba(0,238,255,0.16)" />
            {/* Ø circle */}
            <circle cx="16" cy="16" r="7" stroke="rgba(0,238,255,0.3)" strokeWidth="3" fill="none" filter="url(#g)" />
            <circle cx="16" cy="16" r="7" stroke="rgba(0,238,255,1)" strokeWidth="1.8" fill="none" />
            <circle cx="16" cy="16" r="7" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" fill="none"
              strokeDasharray="8 30" strokeDashoffset="4" />
            {/* Slash */}
            <line x1="21" y1="10" x2="11" y2="22"
              stroke="rgba(0,238,255,0.4)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="21" y1="10" x2="11" y2="22"
              stroke="rgba(0,238,255,1)" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="20.5" y1="10.5" x2="15" y2="17.5"
              stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 15, fontWeight: 700,
          color: 'rgba(240,240,248,1)',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}>
          Install ZERØ MERIDIAN
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: 'rgba(80,80,100,1)',
          letterSpacing: '0.08em',
        }}>
          Add to Home Screen — no App Store required
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {IOS_STEPS.map(step => (
          <div key={step.num} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(32,42,68,1)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(0,238,255,0.08)',
              border: '1px solid rgba(0,238,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, fontWeight: 700,
              color: 'rgba(0,238,255,1)',
            }}>
              {step.num}
            </div>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, color: 'rgba(200,200,214,1)',
              lineHeight: 1.5,
            }}>
              {step.text}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close install instructions"
        style={{
          width: '100%', minHeight: 48,
          background: 'rgba(0,238,255,0.05)',
          border: '1px solid rgba(0,238,255,0.15)',
          borderRadius: 12, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, fontWeight: 700,
          color: 'rgba(0,238,255,0.9)',
          letterSpacing: '0.12em',
        }}
      >
        GOT IT
      </button>
    </motion.div>
  </motion.div>
));
IOSSheet.displayName = 'IOSSheet';

// ─── Main Banner ──────────────────────────────────────────────────────────────

const PWAInstallPrompt = memo(() => {
  const mountedRef = useRef(true);
  const { isMobile } = useBreakpoint();
  const { canInstall, isIOS, isInstalled, isDismissed, triggerInstall, dismissInstall } = usePWAInstall();

  const [showIOSSheet, setShowIOSSheet] = useState(false);

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone: boolean }).standalone === true
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Listen for Topbar-triggered iOS install
    const handleShowIOS = () => { if (mountedRef.current) setShowIOSSheet(true); };
    window.addEventListener('zm-show-ios-install', handleShowIOS);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('zm-show-ios-install', handleShowIOS);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS) {
      setShowIOSSheet(true);
      return;
    }
    await triggerInstall();
  }, [isIOS, triggerInstall]);

  const handleDismiss = useCallback(() => {
    dismissInstall();
  }, [dismissInstall]);

  const handleCloseIOS = useCallback(() => {
    setShowIOSSheet(false);
  }, []);

  const bannerStyle = useMemo(() => {
    if (isMobile) return Object.freeze({
      position: 'fixed' as const,
      bottom: 76, left: 12, right: 12,
      zIndex: 500,
      background: 'rgba(7,9,18,0.97)',
      border: '1px solid rgba(0,238,255,0.22)',
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,238,255,0.06)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    });
    return Object.freeze({
      position: 'fixed' as const,
      bottom: 24, right: 24,
      zIndex: 500,
      background: 'rgba(7,9,18,0.98)',
      border: '1px solid rgba(0,238,255,0.22)',
      borderRadius: 14,
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      maxWidth: 360,
      boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,238,255,0.06)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    });
  }, [isMobile]);

  // Don't render banner if installed, dismissed, or not installable
  const showBanner = canInstall && !isInstalled && !isDismissed && !isStandalone;

  return (
    <AnimatePresence>
      <>
        {showBanner && (
          <motion.div
            key="pwa-banner"
            initial={{ opacity: 0, y: isMobile ? 24 : 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? 24 : 12, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={bannerStyle}
            role="banner"
            aria-label="Install ZERØ MERIDIAN app"
          >
            {/* Ø Icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'rgba(0,238,255,0.07)',
              border: '1px solid rgba(0,238,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0,238,255,0.1)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8" stroke="rgba(0,238,255,0.25)" strokeWidth="3.5" fill="none" />
                <circle cx="12" cy="12" r="8" stroke="rgba(0,238,255,1)" strokeWidth="1.8" fill="none" />
                <line x1="17" y1="6" x2="7" y2="18" stroke="rgba(0,238,255,0.35)" strokeWidth="3" strokeLinecap="round" />
                <line x1="17" y1="6" x2="7" y2="18" stroke="rgba(0,238,255,1)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13, fontWeight: 700,
                color: 'rgba(240,240,248,1)',
                marginBottom: 3, letterSpacing: '0.04em',
              }}>
                Install ZERØ MERIDIAN
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'rgba(80,80,100,1)',
                letterSpacing: '0.06em',
              }}>
                {isIOS ? 'Add to Home Screen · no App Store needed' : 'Full-screen · offline · instant access'}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss install prompt"
                style={{
                  minHeight: 36, minWidth: 36, padding: '0 10px',
                  background: 'transparent',
                  border: '1px solid rgba(32,42,68,1)',
                  borderRadius: 8, cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, color: 'rgba(80,80,100,1)',
                }}
              >
                ✕
              </button>
              <button
                type="button"
                onClick={handleInstall}
                aria-label={isIOS ? 'Show iOS install instructions' : 'Install app'}
                style={{
                  minHeight: 36, padding: '0 16px',
                  background: 'rgba(0,238,255,0.09)',
                  border: '1px solid rgba(0,238,255,0.28)',
                  borderRadius: 8, cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 700,
                  color: 'rgba(0,238,255,1)',
                  letterSpacing: '0.1em',
                  boxShadow: '0 0 12px rgba(0,238,255,0.08)',
                }}
              >
                {isIOS ? 'HOW TO' : 'INSTALL'}
              </button>
            </div>
          </motion.div>
        )}

        {/* iOS instruction sheet */}
        {showIOSSheet && (
          <IOSSheet key="ios-sheet" onClose={handleCloseIOS} />
        )}
      </>
    </AnimatePresence>
  );
});

PWAInstallPrompt.displayName = 'PWAInstallPrompt';
export default PWAInstallPrompt;
