/**
 * PageStub.tsx — ZERØ MERIDIAN 2026 push75
 * push75: FULL REBUILD — zero className, all inline styles.
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero className ✓
 * - Zero template literals in JSX ✓
 * - useMemo() for all style objects ✓
 * - Object.freeze() static styles ✓
 */

import React, { memo, useMemo } from 'react';
import { type LucideIcon } from 'lucide-react';

interface PageStubProps {
  title:       string;
  description: string;
  icon:        LucideIcon;
}

const STATIC = Object.freeze({
  outer: {
    display:        'flex',
    flexDirection:  'column' as const,
    alignItems:     'center',
    justifyContent: 'center',
    minHeight:      '60vh',
    textAlign:      'center' as const,
    padding:        '24px',
  },
  card: {
    background:          'rgba(255,255,255,1)',
    border:              '1px solid rgba(15,40,100,0.10)',
    borderRadius:        20,
    padding:             40,
    display:             'flex',
    flexDirection:       'column' as const,
    alignItems:          'center',
    gap:                 20,
    maxWidth:            420,
    width:               '100%',
    boxShadow:           '0 4px 24px rgba(15,40,100,0.10)',
    position:            'relative' as const,
    overflow:            'hidden' as const,
  },
  topLine: {
    position:     'absolute' as const,
    top:          0,
    left:         0,
    right:        0,
    height:       1,
    background:   'linear-gradient(90deg, transparent, rgba(15,40,180,0.35), transparent)',
    borderRadius: '20px 20px 0 0',
  },
  iconWrap: {
    width:          64,
    height:         64,
    borderRadius:   16,
    background:     'rgba(15,40,180,0.07)',
    border:         '1px solid rgba(15,40,180,0.18)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    boxShadow:      'none',
  },
  title: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize:   22,
    fontWeight: 700,
    background: 'rgba(15,40,180,1)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor:  'transparent' as const,
    backgroundClip:       'text' as const,
    lineHeight:           1.2,
    margin:               0,
  },
  description: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize:   13,
    color:      'rgba(110,120,160,1)',
    lineHeight: 1.65,
    maxWidth:   340,
    margin:     0,
  },
  badge: {
    display:     'flex',
    alignItems:  'center',
    gap:         8,
    marginTop:   4,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: '50%',
    background:   'rgba(15,40,180,1)',
    boxShadow:    'none',
    flexShrink:   0,
    animation:    'none', // no tailwind animate-pulse
  },
  badgeText: {
    fontFamily:    "'JetBrains Mono', monospace",
    fontSize:      11,
    color:         'rgba(110,120,160,1)',
    letterSpacing: '0.04em',
  },
});

const PageStub = memo(({ title, description, icon: Icon }: PageStubProps) => {
  // pulse animation via inline keyframes injected once
  useMemo(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('zm-pagestub-pulse')) return;
    const style = document.createElement('style');
    style.id = 'zm-pagestub-pulse';
    style.textContent = '@keyframes zm-pulse{0%,100%{opacity:1}50%{opacity:0.35}}';
    document.head.appendChild(style);
  }, []);

  const dotStyle = useMemo(() => ({
    ...STATIC.dot,
    animation: 'zm-pulse 2s ease-in-out infinite',
  }), []);

  return (
    <div style={STATIC.outer}>
      <div style={STATIC.card}>
        <div style={STATIC.topLine} />

        <div style={STATIC.iconWrap}>
          <Icon size={28} style={{ color: 'rgba(15,40,180,1)', display: 'block' }} />
        </div>

        <h1 style={STATIC.title}>{title}</h1>

        <p style={STATIC.description}>{description}</p>

        <div style={STATIC.badge}>
          <span style={dotStyle} />
          <span style={STATIC.badgeText}>Coming soon in v8.1</span>
        </div>
      </div>
    </div>
  );
});

PageStub.displayName = 'PageStub';
export default PageStub;
