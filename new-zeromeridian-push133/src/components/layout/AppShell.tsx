/**
 * AppShell.tsx — ZERØ MERIDIAN 2026 push103
 * push103: useDevicePerf → reduce overlay backdropFilter on low/mid device
 * push85: Integrate CommandPalette + Ctrl+K global shortcut
 * - React.memo + displayName ✓  rgba() only ✓  Zero className ✓
 * - useCallback + useMemo + mountedRef ✓
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ZMSidebar from './ZMSidebar';
import Topbar from './Topbar';
import BottomNavBar from './BottomNavBar';
import PageTransition from '../shared/PageTransition';
import GlobalStatsBar from '../shared/GlobalStatsBar';
import CommandPalette from '../shared/CommandPalette';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDevicePerf } from '@/hooks/useDevicePerf';
import PWAInstallPrompt from '@/components/shared/PWAInstallPrompt';

interface AppShellProps { children: React.ReactNode; currentPath?: string; }

const shellVariants = Object.freeze({
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
});

const drawerVariants = Object.freeze({
  hidden:  { x: '-100%', opacity: 0 },
  visible: { x: '0%',   opacity: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit:    { x: '-100%', opacity: 0, transition: { duration: 0.22, ease: [0.36, 0, 0.66, 0] } },
});

const overlayVariants = Object.freeze({
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
});

const AppShell: React.FC<AppShellProps> = ({ children, currentPath: propPath }) => {
  const mountedRef = useRef(true);
  const [sidebarExpanded,  setSidebarExpanded]  = React.useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [cmdPaletteOpen,   setCmdPaletteOpen]   = React.useState(false);
  const prefersRM  = useReducedMotion();
  const location   = useLocation();
  const { isMobile, isTablet } = useBreakpoint();
  const { blur }   = useDevicePerf();

  const currentPath      = propPath ?? location.pathname;
  const showBottomNav    = isMobile;
  const showMobileDrawer = isMobile || isTablet;

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  React.useEffect(() => {
    if (showMobileDrawer && mobileDrawerOpen) setMobileDrawerOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  // Global Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (mountedRef.current) setCmdPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape' && cmdPaletteOpen) {
        if (mountedRef.current) setCmdPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdPaletteOpen]);

  const toggleSidebar   = useCallback(() => {
    if (!mountedRef.current) return;
    if (showMobileDrawer) setMobileDrawerOpen(prev => !prev);
    else setSidebarExpanded(prev => !prev);
  }, [showMobileDrawer]);

  const closeDrawer     = useCallback(() => { if (mountedRef.current) setMobileDrawerOpen(false); }, []);
  const openCmdPalette  = useCallback(() => { if (mountedRef.current) setCmdPaletteOpen(true);  }, []);
  const closeCmdPalette = useCallback(() => { if (mountedRef.current) setCmdPaletteOpen(false); }, []);

  const mainVariants = useMemo(() => Object.freeze({
    collapsed: { marginLeft: 68  },
    expanded:  { marginLeft: 256 },
    mobile:    { marginLeft: 0   },
  }), []);

  const mainAnimate = useMemo(() => {
    if (showMobileDrawer) return 'mobile';
    return sidebarExpanded ? 'expanded' : 'collapsed';
  }, [showMobileDrawer, sidebarExpanded]);

  const mainStyle = useMemo(() => ({
    minHeight:  '100vh',
    background: 'rgba(248,249,252,1)',
    transition: prefersRM ? 'none' : 'margin-left 0.3s cubic-bezier(0.22,1,0.36,1)',
    willChange: 'margin-left' as const,
  }), [prefersRM]);

  const contentStyle = useMemo(() => ({
    padding:       isMobile ? '0 16px 32px' : '0 24px 32px',
    paddingTop:    '100px',
    paddingBottom: showBottomNav ? '80px' : '32px',
    maxWidth:      '1800px',
    margin:        '0 auto',
    boxSizing:     'border-box' as const,
    width:         '100%',
    overflowX:     'hidden' as const,
  }), [showBottomNav, isMobile]);

  // blur fallback: on low/mid device skip backdropFilter on overlay
  const overlayStyle = useMemo(() => ({
    position: 'fixed' as const, inset: 0, zIndex: 149,
    background: 'rgba(8,12,40,0.40)',
    ...(blur
      ? { backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }
      : {}
    ),
  }), [blur]);

  const drawerStyle = useMemo(() => ({
    position: 'fixed' as const, top: 0, left: 0, bottom: 0,
    zIndex: 150, width: '240px', willChange: 'transform' as const,
  }), []);

  return (
    <motion.div variants={shellVariants} initial="initial" animate="animate"
      style={{ display: 'flex', minHeight: '100vh', background: 'rgba(248,249,252,1)' }}
    >
      {/* Desktop sidebar */}
      {!showMobileDrawer && (
        <ZMSidebar expanded={sidebarExpanded} onToggle={toggleSidebar} currentPath={currentPath} />
      )}

      {/* Mobile/Tablet drawer */}
      <AnimatePresence>
        {showMobileDrawer && mobileDrawerOpen && (
          <>
            <motion.div key="overlay" variants={overlayVariants} initial="hidden" animate="visible" exit="exit"
              style={overlayStyle} onClick={closeDrawer} role="button" aria-label="Close navigation drawer" />
            <motion.div key="drawer" variants={prefersRM ? {} : drawerVariants} initial="hidden" animate="visible" exit="exit" style={drawerStyle}>
              <ZMSidebar expanded={true} onToggle={closeDrawer} currentPath={currentPath} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <motion.main animate={mainAnimate} variants={mainVariants}
        transition={prefersRM ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ ...mainStyle, flex: 1, minWidth: 0 }}
      >
        <Topbar onMenuToggle={toggleSidebar} sidebarExpanded={sidebarExpanded} onOpenCmdPalette={openCmdPalette} />
        <GlobalStatsBar />
        <div style={contentStyle}>
          <AnimatePresence mode="wait">
            <PageTransition key={currentPath}>{children}</PageTransition>
          </AnimatePresence>
        </div>
      </motion.main>

      {showBottomNav && <BottomNavBar />}
      <PWAInstallPrompt />

      {/* Command Palette */}
      <CommandPalette open={cmdPaletteOpen} onClose={closeCmdPalette} />
    </motion.div>
  );
};

AppShell.displayName = 'AppShell';
export default React.memo(AppShell);
