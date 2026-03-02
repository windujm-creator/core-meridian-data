/**
 * GlassCard.tsx — ZERØ MERIDIAN 2026 push132
 * push132: Full reskin — light professional, navy accent, clean card style
 * - React.memo + displayName ✓  rgba() only ✓  Zero className ✓
 * - useMemo style objects ✓  hover lift ✓
 */

import { memo, type ReactNode, type CSSProperties, useMemo, useState, useCallback } from 'react';

const FONT = "'JetBrains Mono', monospace";

const C = Object.freeze({
  bg:        'rgba(255,255,255,1)',
  bgHover:   'rgba(250,251,254,1)',
  border:    'rgba(15,40,100,0.10)',
  borderHov: 'rgba(15,40,180,0.22)',
  accent:    'rgba(15,40,180,1)',
  textPri:   'rgba(8,12,40,1)',
  textMuted: 'rgba(110,120,160,1)',
  accentDim: 'rgba(15,40,180,0.6)',
  shadow:    '0 1px 4px rgba(15,40,100,0.07), 0 0 0 1px rgba(15,40,100,0.06)',
  shadowHov: '0 4px 16px rgba(15,40,100,0.10), 0 0 0 1px rgba(15,40,100,0.09)',
});

interface GlassCardProps {
  children:      ReactNode;
  style?:        CSSProperties;
  onClick?:      () => void;
  hoverable?:    boolean;
  title?:        string;
  actions?:      ReactNode;
  accentColor?:  string;
  padding?:      string | number;
  role?:         string;
  'aria-label'?: string;
}

const GlassCard = memo(({
  children, style, onClick, hoverable = true,
  title, actions, accentColor, padding = '16px 20px',
  role, 'aria-label': ariaLabel,
}: GlassCardProps) => {
  const [hovered, setHovered] = useState(false);

  const handleEnter = useCallback(() => setHovered(true),  []);
  const handleLeave = useCallback(() => setHovered(false), []);

  const cardStyle = useMemo((): CSSProperties => ({
    background:   hovered && hoverable ? C.bgHover : C.bg,
    border:       '1px solid ' + (hovered && hoverable ? (accentColor ? accentColor.replace(/[\d.]+\)$/, '0.28)') : C.borderHov) : C.border),
    borderRadius: 12,
    boxShadow:    hovered && hoverable ? C.shadowHov : C.shadow,
    padding,
    position:     'relative',
    transform:    hovered && hoverable ? 'translateY(-1px)' : 'translateY(0)',
    transition:   'transform 180ms ease, box-shadow 180ms ease, border-color 150ms ease',
    cursor:       onClick ? 'pointer' : 'default',
    fontFamily:   FONT,
    overflow:     'hidden',
    willChange:   'transform',
    ...style,
  }), [hovered, hoverable, accentColor, padding, onClick, style]);

  const accentLineStyle = useMemo((): CSSProperties | null => {
    if (!accentColor) return null;
    return {
      position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
      background: accentColor.replace(/[\d.]+\)$/, '0.7)'),
      borderRadius: '12px 12px 0 0',
    };
  }, [accentColor]);

  const titleBarStyle = useMemo((): CSSProperties => ({
    height: 36, display: 'flex', justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(15,40,100,0.07)',
    marginBottom: 12, paddingBottom: 8,
  }), []);

  return (
    <div
      onClick={onClick}
      onMouseEnter={hoverable ? handleEnter : undefined}
      onMouseLeave={hoverable ? handleLeave : undefined}
      style={cardStyle}
      role={role}
      aria-label={ariaLabel}
    >
      {accentLineStyle && <div style={accentLineStyle} />}

      {title && (
        <div style={titleBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 2, height: 16,
              background: accentColor ?? C.accent,
              borderRadius: 1,
            }} />
            <span style={{
              fontFamily: FONT, fontSize: 12, fontWeight: 600,
              color: C.textPri,
            }}>{title}</span>
          </div>
          {actions && <div style={{ display: 'flex', gap: 4 }}>{actions}</div>}
        </div>
      )}

      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';
export default GlassCard;
