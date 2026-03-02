/**
 * MetricCard.tsx — ZERØ MERIDIAN 2026 push132
 * push132: Full reskin — light professional, price flash animation kept
 * - React.memo + displayName ✓  rgba() only ✓  Zero className ✓
 * - useCallback + useMemo + mountedRef ✓
 */

import { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { type LucideIcon } from 'lucide-react';
import Skeleton from './Skeleton';

const FONT = "'JetBrains Mono', monospace";

const C = Object.freeze({
  bg:        'rgba(255,255,255,1)',
  bgHover:   'rgba(250,251,254,1)',
  border:    'rgba(15,40,100,0.09)',
  borderHov: 'rgba(15,40,180,0.20)',
  accent:    'rgba(15,40,180,1)',
  accentDim: 'rgba(15,40,180,0.08)',
  positive:  'rgba(0,155,95,1)',
  negative:  'rgba(208,35,75,1)',
  textPri:   'rgba(8,12,40,1)',
  textMuted: 'rgba(110,120,160,1)',
  textFaint: 'rgba(165,175,210,1)',
  shadow:    '0 1px 4px rgba(15,40,100,0.06), 0 0 0 1px rgba(15,40,100,0.05)',
  shadowHov: '0 4px 14px rgba(15,40,100,0.09), 0 0 0 1px rgba(15,40,180,0.12)',
});

interface MetricCardProps {
  label:        string;
  value:        string;
  change?:      number;
  icon?:        LucideIcon;
  accentColor?: string;
  loading?:     boolean;
  subtitle?:    string;
}

// ─── Animated value with price flash ─────────────────────────────────────────

const AnimatedValue = memo(({ value, change }: { value: string; change?: number }) => {
  const prevRef  = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const mountRef = useRef(true);

  useEffect(() => { mountRef.current = true; return () => { mountRef.current = false; }; }, []);

  useEffect(() => {
    if (prevRef.current !== value) {
      if (mountRef.current) {
        const dir = change !== undefined ? (change >= 0 ? 'up' : 'down') : null;
        setFlash(dir);
        const t = setTimeout(() => { if (mountRef.current) setFlash(null); }, 650);
        prevRef.current = value;
        return () => clearTimeout(t);
      }
      prevRef.current = value;
    }
  }, [value, change]);

  const flashBg = useMemo(() => {
    if (flash === 'up')   return 'rgba(0,155,95,0.12)';
    if (flash === 'down') return 'rgba(208,35,75,0.10)';
    return 'transparent';
  }, [flash]);

  return (
    <span style={{
      display: 'inline-block',
      fontFamily: FONT, fontSize: '1.2rem', fontWeight: 700,
      color: C.textPri,
      willChange: 'transform',
      borderRadius: '5px',
      padding: flash ? '1px 4px' : '1px 0',
      background: flashBg,
      transition: 'background 0.55s ease, padding 0.13s',
      ...({ fontVariantNumeric: 'tabular-nums' } as React.CSSProperties),
    }}>
      {value}
    </span>
  );
});
AnimatedValue.displayName = 'AnimatedValue';

// ─── MetricCard ───────────────────────────────────────────────────────────────

const MetricCard = memo(({
  label, value, change, icon: Icon, accentColor, loading = false, subtitle,
}: MetricCardProps) => {
  const [hovered, setHovered] = useState(false);
  const handleEnter = useCallback(() => setHovered(true),  []);
  const handleLeave = useCallback(() => setHovered(false), []);

  const cardStyle = useMemo(() => ({
    position:      'relative' as const,
    background:    hovered ? C.bgHover : C.bg,
    border:        '1px solid ' + (hovered ? (accentColor ? accentColor.replace(/[\d.]+\)$/, '0.22)') : C.borderHov) : C.border),
    borderRadius:  10,
    padding:       '14px 16px',
    display:       'flex',
    flexDirection: 'column' as const,
    gap:           5,
    minHeight:     88,
    boxShadow:     hovered ? C.shadowHov : C.shadow,
    transform:     hovered ? 'translateY(-1px)' : 'translateY(0)',
    transition:    'transform 180ms ease, box-shadow 180ms ease, border-color 150ms ease',
    willChange:    'transform' as const,
    cursor:        'default' as const,
  }), [hovered, accentColor]);

  const accentLineStyle = useMemo(() => ({
    position:   'absolute' as const,
    top: 0, left: 0, right: 0, height: '2px',
    background: accentColor ?? C.accent,
    borderRadius: '10px 10px 0 0',
    opacity:    hovered ? 1 : 0.6,
    transition: 'opacity 180ms ease',
  }), [accentColor, hovered]);

  const changeColor = useMemo(() => {
    if (change === undefined) return undefined;
    return change >= 0 ? C.positive : C.negative;
  }, [change]);

  const changeStr = useMemo(() => {
    if (change === undefined) return undefined;
    return (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  }, [change]);

  if (loading) {
    return (
      <div style={{
        background: C.bg, border: '1px solid ' + C.border,
        borderRadius: 10, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 8, minHeight: 88,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton width={70} height={9} />
          <Skeleton width={14} height={14} borderRadius={4} />
        </div>
        <Skeleton width="60%" height={26} borderRadius={5} />
        <Skeleton width={50} height={9} />
      </div>
    );
  }

  return (
    <div style={cardStyle} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <div style={accentLineStyle} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: FONT, fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.10em', color: C.textFaint, fontWeight: 600,
        }}>
          {label}
        </span>
        {Icon && <Icon size={13} style={{ color: accentColor ?? C.textFaint, flexShrink: 0 }} />}
      </div>
      <AnimatedValue value={value} change={change} />
      {changeStr !== undefined && (
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600,
          color: changeColor,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <span style={{ fontSize: 9 }}>{(change ?? 0) >= 0 ? '▲' : '▼'}</span>
          {changeStr}
        </span>
      )}
      {subtitle && (
        <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint }}>
          {subtitle}
        </span>
      )}
    </div>
  );
});

MetricCard.displayName = 'MetricCard';
export default MetricCard;
