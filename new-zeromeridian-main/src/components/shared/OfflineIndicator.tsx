/**
 * OfflineIndicator.tsx — ZERØ MERIDIAN 2026 push107
 * push107: In-app offline/online status banner
 *   - Listens to navigator.onLine + online/offline events
 *   - SW BACK_ONLINE message integration
 *   - Animated slide-in from top
 *   - Auto-dismisses 3s after reconnecting
 *   - Zero className ✓  rgba() only ✓
 *   - JetBrains Mono ✓  React.memo + displayName ✓
 *   - mountedRef ✓  useCallback + useMemo ✓
 *   - will-change: transform on animated element ✓
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type NetworkStatus = 'online' | 'offline' | 'reconnected';

// ─── OfflineIndicator ─────────────────────────────────────────────────────────

const OfflineIndicator = memo(() => {
  const mountedRef                          = useRef(true);
  const dismissTimerRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus]                 = useState<NetworkStatus>(
    () => (typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online')
  );
  const [visible, setVisible]               = useState<boolean>(
    () => (typeof navigator !== 'undefined' && !navigator.onLine)
  );

  // ─── Event handlers ─────────────────────────────────────────────────────────

  const handleOffline = useCallback(() => {
    if (!mountedRef.current) return;
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setStatus('offline');
    setVisible(true);
  }, []);

  const handleOnline = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus('reconnected');
    setVisible(true);
    // Auto-dismiss after 3 s
    dismissTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setVisible(false);
    }, 3000);
  }, []);

  const handleSWMessage = useCallback((event: MessageEvent) => {
    if (!mountedRef.current) return;
    if (event.data?.type === 'BACK_ONLINE') handleOnline();
  }, [handleOnline]);

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setVisible(false);
  }, []);

  // ─── Effect ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    return () => {
      mountedRef.current = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [handleOffline, handleOnline, handleSWMessage]);

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const isOffline      = status === 'offline';
  const isReconnected  = status === 'reconnected';

  const accentColor    = isOffline
    ? 'rgba(255,68,136,1)'
    : 'rgba(34,255,170,1)';
  const accentDim      = isOffline
    ? 'rgba(255,68,136,0.12)'
    : 'rgba(34,255,170,0.1)';
  const accentBorder   = isOffline
    ? 'rgba(255,68,136,0.28)'
    : 'rgba(34,255,170,0.22)';
  const accentGlow     = isOffline
    ? 'rgba(255,68,136,0.15)'
    : 'rgba(34,255,170,0.12)';

  const bannerStyle = useMemo(() => ({
    position:        'fixed'    as const,
    top:             0,
    left:            0,
    right:           0,
    zIndex:          9998,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             '10px',
    padding:         '10px 16px',
    background:      'rgba(5,7,13,0.97)',
    borderBottom:    `1px solid ${accentBorder}`,
    boxShadow:       `0 4px 32px ${accentGlow}, inset 0 -1px 0 ${accentBorder}`,
    backdropFilter:  'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    willChange:      'transform',
  }), [accentBorder, accentGlow]);

  const dotStyle = useMemo(() => ({
    width:           8,
    height:          8,
    borderRadius:    '50%',
    background:      accentColor,
    flexShrink:      0,
    boxShadow:       `0 0 8px ${accentColor}`,
  }), [accentColor]);

  const labelStyle = useMemo(() => ({
    fontFamily:      "'JetBrains Mono', monospace",
    fontSize:        '11px',
    fontWeight:      700,
    color:           accentColor,
    letterSpacing:   '0.12em',
    textTransform:   'uppercase' as const,
  }), [accentColor]);

  const subStyle = useMemo(() => ({
    fontFamily:      "'JetBrains Mono', monospace",
    fontSize:        '10px',
    fontWeight:      400,
    color:           'rgba(138,138,158,1)',
    letterSpacing:   '0.06em',
  }), []);

  const dismissBtnStyle = useMemo(() => ({
    marginLeft:      'auto',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    width:           24,
    height:          24,
    background:      accentDim,
    border:          `1px solid ${accentBorder}`,
    borderRadius:    '4px',
    cursor:          'pointer',
    fontFamily:      "'JetBrains Mono', monospace",
    fontSize:        '11px',
    color:           accentColor,
    flexShrink:      0,
  }), [accentColor, accentDim, accentBorder]);

  const wrapStyle = useMemo(() => ({
    display:        'flex',
    alignItems:     'center',
    gap:            '10px',
    flex:           1,
    maxWidth:       600,
  }), []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-indicator"
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={bannerStyle}
          role="status"
          aria-live="polite"
          aria-label={isOffline ? 'You are offline' : 'Connection restored'}
        >
          {/* Left: dot + label */}
          <div style={wrapStyle}>
            {/* Pulsing dot */}
            <motion.div
              style={dotStyle}
              animate={isOffline
                ? { opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }
                : { opacity: 1,           scale: 1 }
              }
              transition={isOffline
                ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' }
                : { duration: 0.3 }
              }
            />

            {/* Label */}
            <span style={labelStyle}>
              {isOffline ? 'No Internet Connection' : 'Connection Restored'}
            </span>

            {/* Sub-label */}
            <span style={subStyle}>
              {isOffline
                ? 'Cached data is shown — live prices paused'
                : 'Live data is resuming…'}
            </span>
          </div>

          {/* Dismiss button */}
          {isReconnected && (
            <motion.button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              style={dismissBtnStyle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              ✕
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

OfflineIndicator.displayName = 'OfflineIndicator';
export default OfflineIndicator;
