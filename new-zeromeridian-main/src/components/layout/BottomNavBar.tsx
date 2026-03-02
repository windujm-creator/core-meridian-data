/**
 * BottomNavBar.tsx — ZERØ MERIDIAN v30
 * Mobile bottom navigation — 5 tabs + More sheet
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Tab {
  label: string;
  path:  string;
  icon:  React.ReactNode;
}

const I = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MAIN_TABS: readonly Tab[] = Object.freeze([
  {
    label: 'Dash',
    path:  '/dashboard',
    icon:  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  { label: 'Markets', path: '/markets',   icon: I('M2 15 L6 9 L10 12 L14.5 5 L18 8') },
  { label: 'Alerts',  path: '/alerts',    icon: I('M10 3C7.5 3 5.5 5 5.5 7.5V13L3.5 15h13L14.5 13V7.5C14.5 5 12.5 3 10 3ZM8 17a2 2 0 004 0') },
  { label: 'Watch',   path: '/watchlist', icon: I('M10 2L12.4 7L18 7.8L14 11.6L15 17L10 14.3L5 17L6 11.6L2 7.8L7.6 7L10 2Z') },
  { label: 'More',    path: '__more__',   icon: I('M5 10h.01M10 10h.01M15 10h.01') },
]);

const MORE_ITEMS: readonly Tab[] = Object.freeze([
  { label: 'Charts',      path: '/charts',       icon: I('M2 16 L6 10 L10 13 L14 7 L18 9') },
  { label: 'Order Book',  path: '/orderbook',    icon: I('M2 5h8M2 8h5M2 13h9M2 16h6') },
  { label: 'DeFi',        path: '/defi',         icon: I('M4 10 a3 3 0 1 0 6 0 a3 3 0 1 0-6 0M10 5 a3 3 0 1 0 6 0') },
  { label: 'On-Chain',    path: '/onchain',      icon: I('M2 16 L2 10 L6 10 M7 16 L7 7 L11 7 M12 16 L12 2 L16 2 L16 16') },
  { label: 'Derivatives', path: '/derivatives',  icon: I('M2 15 L5.5 8 L9.5 11.5 L14 4 L18 8') },
  { label: 'Converter',   path: '/converter',    icon: I('M2 6h14M12 2l4 4-4 4M16 14H2M6 10l-4 4 4 4') },
  { label: 'Smart Money', path: '/smart-money',  icon: I('M2 14 L6 7 L10 10 L13.5 4 L18 7') },
  { label: 'Security',    path: '/security',     icon: I('M10 2L17 5V10C17 14 13.5 17.5 10 19C6.5 17.5 3 14 3 10V5L10 2Z') },
  { label: 'Tokens',      path: '/tokens',       icon: I('M10 2a8 8 0 100 16A8 8 0 0010 2ZM10 6v4h4') },
  { label: 'Portfolio',   path: '/portfolio',    icon: I('M10 2a8 8 0 100 16') },
  { label: 'AI Signals',  path: '/ai-signals',   icon: I('M2 10 L6 6 L10 8 L14 4 L18 6') },
  { label: 'Networks',    path: '/networks',     icon: I('M10 10m-3 0a3 3 0 106 0a3 3 0 10-6 0M3 3m-2 0a2 2 0 104 0a2 2 0 10-4 0') },
]);

const MoreSheet = memo(({ onClose, onNav }: { onClose: () => void; onNav: (p: string) => void }) => (
  <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(8,12,40,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    />
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 36 }}
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 201,
        background: 'rgba(255,255,255,1)',
        borderTop: '1px solid var(--zm-border)',
        borderRadius: '16px 16px 0 0',
        padding: '12px 16px 40px',
      }}
    >
      <div style={{
        width: 36, height: 4, borderRadius: 2,
        background: 'rgba(15,40,100,0.18)',
        margin: '0 auto 16px',
      }} />
      <div style={{
        fontFamily: 'var(--zm-font-data)',
        fontSize: 9, letterSpacing: '0.14em',
        color: 'rgba(110,120,160,1)',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        All Features
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}>
        {MORE_ITEMS.map(item => (
          <button
            key={item.path}
            type="button"
            onClick={() => { onNav(item.path); onClose(); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '12px 4px',
              background: 'rgba(248,249,252,1)',
              border: '1px solid var(--zm-border)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'rgba(55,65,110,1)',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {item.icon}
            <span style={{
              fontFamily: 'var(--zm-font-ui)',
              fontSize: 10, fontWeight: 500,
              color: 'rgba(55,65,110,1)',
              textAlign: 'center',
              lineHeight: 1.2,
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  </>
));
MoreSheet.displayName = 'MoreSheet';

const BottomNavBar = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNav = useCallback((path: string) => {
    if (path === '__more__') { setMoreOpen(true); return; }
    navigate(path);
  }, [navigate]);

  const containerStyle = useMemo(() => ({
    position:    'fixed' as const,
    bottom:      0, left: 0, right: 0,
    zIndex:      100,
    display:     'flex',
    background:  'rgba(255,255,255,1)',
    borderTop:   '1px solid var(--zm-border)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  }), []);

  return (
    <>
      <nav role="navigation" aria-label="Bottom navigation" style={containerStyle}>
        {MAIN_TABS.map(tab => {
          const active = tab.path !== '__more__' &&
            (location.pathname === tab.path || location.pathname.startsWith(tab.path + '/'));
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => handleNav(tab.path)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: 56, padding: '6px 4px',
                background: 'transparent',
                border: 'none', cursor: 'pointer', outline: 'none',
                color: active ? 'rgba(15,40,180,1)' : 'rgba(110,120,160,1)',
                WebkitTapHighlightColor: 'transparent',
                transition: 'color 120ms ease',
              }}
            >
              {tab.icon}
              <span style={{
                fontFamily: 'var(--zm-font-data)',
                fontSize: 9, letterSpacing: '0.05em',
                marginTop: 3, lineHeight: 1,
                color: 'inherit',
              }}>
                {tab.label}
              </span>
              {active && (
                <motion.div
                  layoutId="bottom-tab-indicator"
                  style={{
                    position: 'absolute', top: 0,
                    width: 20, height: 2, borderRadius: 2,
                    background: 'rgba(15,40,180,1)',
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <MoreSheet onClose={() => setMoreOpen(false)} onNav={(p) => navigate(p)} />
        )}
      </AnimatePresence>
    </>
  );
});

BottomNavBar.displayName = 'BottomNavBar';
export default BottomNavBar;
