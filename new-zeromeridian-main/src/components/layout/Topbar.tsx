/**
 * Topbar.tsx — ZERØ MERIDIAN 2026 push132
 * push132: Full reskin — light professional mode, navy accent, Bloomberg-grade
 * - React.memo + displayName ✓  rgba() only ✓  Zero className ✓
 * - useCallback + useMemo + mountedRef ✓
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePWAInstall } from '@/contexts/PWAInstallContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const FONT = "'JetBrains Mono', monospace";

const C = Object.freeze({
  bg:        'rgba(255,255,255,0.97)',
  border:    'rgba(15,40,100,0.09)',
  accent:    'rgba(15,40,180,1)',
  accentDim: 'rgba(15,40,180,0.08)',
  accentBdr: 'rgba(15,40,180,0.22)',
  textPri:   'rgba(8,12,40,1)',
  textSec:   'rgba(55,65,110,1)',
  textMuted: 'rgba(110,120,160,1)',
  textFaint: 'rgba(165,175,210,1)',
  btnBg:     'rgba(15,40,100,0.05)',
  btnBdr:    'rgba(15,40,100,0.10)',
  searchBg:  'rgba(248,249,252,1)',
  searchBdr: 'rgba(15,40,100,0.10)',
  positive:  'rgba(0,155,95,1)',
});

interface TopbarProps {
  onMenuToggle:     () => void;
  sidebarExpanded:  boolean;
  onOpenCmdPalette: () => void;
}

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="3" width={open ? 13 : 8} height="1.3" rx="0.65" fill="currentColor" style={{ transition: 'width 0.18s' }}/>
    <rect x="1" y="6.8" width="10" height="1.3" rx="0.65" fill="currentColor"/>
    <rect x="1" y="10.6" width={open ? 13 : 5} height="1.3" rx="0.65" fill="currentColor" style={{ transition: 'width 0.18s' }}/>
  </svg>
);

const InstallButton = React.memo(() => {
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall();
  const [justInstalled, setJustInstalled] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (isInstalled && mountedRef.current) {
      setJustInstalled(true);
      const t = setTimeout(() => { if (mountedRef.current) setJustInstalled(false); }, 3000);
      return () => clearTimeout(t);
    }
  }, [isInstalled]);

  const handleClick = useCallback(async () => { await triggerInstall(); }, [triggerInstall]);
  if (!canInstall && !justInstalled) return null;

  return (
    <button type="button" onClick={justInstalled ? undefined : handleClick}
      aria-label={justInstalled ? 'App installed' : 'Install app'}
      style={{
        height: '28px', padding: '0 10px', borderRadius: '6px',
        background: C.accentDim, border: '1px solid ' + C.accentBdr,
        cursor: justInstalled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '5px',
        fontFamily: FONT, fontSize: '10px', fontWeight: 600,
        color: C.accent, flexShrink: 0,
      }}
    >
      {justInstalled ? '✓ Installed' : '↓ Install'}
    </button>
  );
});
InstallButton.displayName = 'InstallButton';

const Topbar: React.FC<TopbarProps> = ({ onMenuToggle, sidebarExpanded, onOpenCmdPalette }) => {
  const mountedRef = useRef(true);
  const prefersRM  = useReducedMotion();
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    mountedRef.current = true;
    const iv = setInterval(() => {
      if (mountedRef.current) setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => { mountedRef.current = false; clearInterval(iv); };
  }, []);

  const handleToggle     = useCallback(() => onMenuToggle(), [onMenuToggle]);
  const handleCmdPalette = useCallback(() => onOpenCmdPalette(), [onOpenCmdPalette]);

  const topbarStyle = useMemo((): React.CSSProperties => ({
    position: 'fixed', top: 28, right: 0, left: 0, zIndex: 40,
    height: '52px',
    background: C.bg,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid ' + C.border,
    boxShadow: '0 1px 0 rgba(15,40,100,0.06)',
    display: 'flex', alignItems: 'center',
    padding: isMobile ? '0 12px' : '0 20px',
    gap: '10px', overflow: 'hidden',
  }), [isMobile]);

  const iconBtnStyle = useMemo((): React.CSSProperties => ({
    width: '30px', height: '30px', borderRadius: '7px',
    background: C.btnBg, border: '1px solid ' + C.btnBdr,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: C.textMuted,
    flexShrink: 0, transition: 'all 0.13s',
  }), []);

  const searchStyle = useMemo((): React.CSSProperties => ({
    flex: 1, maxWidth: '360px', height: '32px',
    background: C.searchBg, border: '1px solid ' + C.searchBdr,
    borderRadius: '7px', display: 'flex', alignItems: 'center',
    gap: '8px', padding: '0 10px', cursor: 'pointer',
    transition: 'border-color 0.15s',
  }), []);

  return (
    <header role="banner" style={topbarStyle} aria-label="Application topbar">
      {/* Menu toggle */}
      <button type="button" onClick={handleToggle} style={iconBtnStyle}
        aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={sidebarExpanded}
      >
        <MenuIcon open={sidebarExpanded} />
      </button>

      {/* Brand name — desktop only */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{
            fontFamily: FONT, fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.14em', color: C.textPri,
          }}>
            ZERØ MERIDIAN
          </span>
          <span style={{
            fontFamily: FONT, fontSize: '8px', fontWeight: 600,
            padding: '2px 6px', borderRadius: '4px',
            background: C.accentDim, border: '1px solid ' + C.accentBdr,
            color: C.accent, letterSpacing: '0.06em',
          }}>
            PRO
          </span>
        </div>
      )}

      {/* Search / command palette */}
      <button type="button" onClick={handleCmdPalette} style={searchStyle}
        aria-label="Search pages (Ctrl+K)"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accentBdr; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.searchBdr; }}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke={C.textFaint} strokeWidth="1.4"/>
          <line x1="9.5" y1="9.5" x2="13" y2="13" stroke={C.textFaint} strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span style={{ fontFamily: FONT, fontSize: '11px', color: C.textFaint, flex: 1 }}>
          {isMobile ? 'Search...' : 'Search pages, assets...'}
        </span>
        {!isMobile && (
          <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
            <span style={{
              background: C.btnBg, border: '1px solid ' + C.btnBdr,
              borderRadius: '4px', padding: '1px 5px',
              fontFamily: FONT, fontSize: '9px', color: C.textFaint,
            }}>
              {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}
            </span>
            <span style={{
              background: C.btnBg, border: '1px solid ' + C.btnBdr,
              borderRadius: '4px', padding: '1px 5px',
              fontFamily: FONT, fontSize: '9px', color: C.textFaint,
            }}>K</span>
          </div>
        )}
      </button>

      <div style={{ flex: 1 }} />

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px', flexShrink: 0 }}>
        {/* Clock */}
        {!isMobile && (
          <span style={{
            fontFamily: FONT, fontSize: '11px', color: C.textMuted,
            letterSpacing: '0.06em', whiteSpace: 'nowrap',
            minWidth: '68px', textAlign: 'right',
            ...({ fontVariantNumeric: 'tabular-nums' } as React.CSSProperties),
          }} aria-live="polite" aria-atomic="true">
            {time}
          </span>
        )}

        <InstallButton />

        {/* Live indicator */}
        {!isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'rgba(0,155,95,0.07)',
            border: '1px solid rgba(0,155,95,0.22)',
            borderRadius: '14px', padding: '4px 9px',
            fontFamily: FONT, fontSize: '9px', fontWeight: 600,
            color: C.positive, letterSpacing: '0.07em', flexShrink: 0,
          }} role="status" aria-label="Live data">
            <motion.div
              style={{ width: 5, height: 5, borderRadius: '50%', background: C.positive, flexShrink: 0 }}
              animate={prefersRM ? {} : { opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              aria-hidden="true"
            />
            LIVE
          </div>
        )}

        {/* Avatar */}
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: C.accentDim, border: '1px solid ' + C.accentBdr,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: C.accent,
          flexShrink: 0, cursor: 'pointer',
        }} aria-label="User profile">
          W
        </div>
      </div>
    </header>
  );
};

Topbar.displayName = 'Topbar';
export default React.memo(Topbar);
