/**
 * ComingSoon.tsx — ZERØ MERIDIAN 2026 push82
 * Reusable Coming Soon page — shown for pages without real data yet.
 * - React.memo + displayName ✓
 * - rgba() only ✓  Zero className ✓  Zero template literals in JSX ✓
 * - useMemo ✓
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ComingSoonProps {
  title: string;
  description: string;
  icon?: string;
  eta?: string;
}

const ComingSoon = React.memo(({ title, description, icon = '⚡', eta }: ComingSoonProps) => {
  const wrapStyle = useMemo(() => Object.freeze({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    padding: '40px 24px',
    textAlign: 'center' as const,
  }), []);

  const glassStyle = useMemo(() => Object.freeze({
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '20px',
    padding: '48px 40px',
    maxWidth: '440px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
  }), []);

  const iconStyle = useMemo(() => Object.freeze({
    fontSize: '48px',
    lineHeight: 1,
    filter: 'grayscale(0.3)',
  }), []);

  const titleStyle = useMemo(() => Object.freeze({
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    fontSize: '22px',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: '0.04em',
    margin: 0,
  }), []);

  const descStyle = useMemo(() => Object.freeze({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: '320px',
  }), []);

  const badgeStyle = useMemo(() => Object.freeze({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(0,200,255,0.07)',
    border: '1px solid rgba(0,200,255,0.18)',
    borderRadius: '20px',
    padding: '5px 14px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    color: 'rgba(0,200,255,0.7)',
    letterSpacing: '0.08em',
  }), []);

  const dividerStyle = useMemo(() => Object.freeze({
    width: '40px',
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
  }), []);

  const dotStyle = useMemo(() => Object.freeze({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(0,200,255,0.5)',
    boxShadow: '0 0 8px rgba(0,200,255,0.4)',
  }), []);

  return (
    <div style={wrapStyle}>
      <motion.div
        style={glassStyle}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          style={iconStyle}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          {icon}
        </motion.div>

        <h1 style={titleStyle}>{title}</h1>
        <div style={dividerStyle} />
        <p style={descStyle}>{description}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <div style={dotStyle} />
          <span style={badgeStyle}>
            {eta ? 'ETA ' + eta : 'COMING SOON'}
          </span>
          <div style={dotStyle} />
        </div>
      </motion.div>
    </div>
  );
});

ComingSoon.displayName = 'ComingSoon';
export default ComingSoon;
