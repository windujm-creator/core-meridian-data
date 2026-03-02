/**
 * tokens.ts — ZERØ MERIDIAN 2026
 * Single source of truth for all design tokens.
 * - Object.freeze() all exports ✓
 * - rgba() only ✓
 * - No className ✓
 * - No template literals ✓
 * - Pure TS (no JSX) ✓
 */

// ─── Color Palette ────────────────────────────────────────────────────────────

export const COLOR = Object.freeze({

  // ── Brand cyan ──
  cyan:         'rgba(0,238,255,1)',
  cyanDim:      'rgba(0,238,255,0.7)',
  cyanFaint:    'rgba(0,238,255,0.12)',
  cyanGlow:     'rgba(0,238,255,0.04)',
  cyanBorder:   'rgba(0,238,255,0.18)',

  // ── Background ──
  bgBase:       'rgba(5,5,7,1)',
  bgCard:       'rgba(14,17,28,1)',
  bgCardHover:  'rgba(18,22,36,1)',
  bgGlass:      'rgba(255,255,255,0.05)',
  bgOverlay:    'rgba(0,0,0,0.72)',

  // ── Border ──
  border:       'rgba(32,42,68,1)',
  borderFaint:  'rgba(32,42,68,0.5)',
  borderGlass:  'rgba(255,255,255,0.07)',

  // ── Text ──
  textPrimary:  'rgba(240,240,248,1)',
  textSecondary:'rgba(148,163,184,1)',
  textFaint:    'rgba(80,80,100,1)',
  textDisabled: 'rgba(80,80,100,0.5)',

  // ── Positive / Negative ──
  positive:     'rgba(34,255,170,1)',
  positiveDim:  'rgba(34,255,170,0.7)',
  positiveBg:   'rgba(34,255,170,0.08)',
  negative:     'rgba(255,68,136,1)',
  negativeDim:  'rgba(255,68,136,0.7)',
  negativeBg:   'rgba(255,68,136,0.08)',

  // ── Semantic ──
  gold:         'rgba(251,191,36,1)',
  goldBg:       'rgba(251,191,36,0.08)',
  blue:         'rgba(96,165,250,1)',
  blueBg:       'rgba(96,165,250,0.08)',
  purple:       'rgba(167,139,250,1)',
  purpleBg:     'rgba(167,139,250,0.08)',
  orange:       'rgba(251,146,60,1)',
  orangeBg:     'rgba(251,146,60,0.08)',

  // ── Neutral grays ──
  white:        'rgba(255,255,255,1)',
  white80:      'rgba(255,255,255,0.8)',
  white40:      'rgba(255,255,255,0.4)',
  white10:      'rgba(255,255,255,0.1)',
  white05:      'rgba(255,255,255,0.05)',
  white03:      'rgba(255,255,255,0.03)',
  black:        'rgba(0,0,0,1)',
  black60:      'rgba(0,0,0,0.6)',
  black30:      'rgba(0,0,0,0.3)',

} as const);

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONT = Object.freeze({
  display:  "'JetBrains Mono', monospace",
  mono:     "'JetBrains Mono', monospace",
  label:    "'JetBrains Mono', monospace",
  ui:       "'JetBrains Mono', monospace",
} as const);

export const FONT_SIZE = Object.freeze({
  xs:   '9px',
  sm:   '10px',
  base: '12px',
  md:   '13px',
  lg:   '14px',
  xl:   '16px',
  '2xl':'20px',
  '3xl':'24px',
  '4xl':'32px',
} as const);

export const FONT_WEIGHT = Object.freeze({
  regular: 400,
  medium:  500,
  semibold:600,
  bold:    700,
  black:   800,
} as const);

export const LETTER_SPACING = Object.freeze({
  tight:  '-0.02em',
  normal: '0em',
  wide:   '0.06em',
  wider:  '0.10em',
  widest: '0.15em',
} as const);

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SPACE = Object.freeze({
  px:  '1px',
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10':'40px',
  '12':'48px',
  '16':'64px',
} as const);

// ─── Border Radius ────────────────────────────────────────────────────────────

export const RADIUS = Object.freeze({
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl':20,
  full: 9999,
} as const);

// ─── Shadows / Glows ──────────────────────────────────────────────────────────

export const SHADOW = Object.freeze({
  card:     '0 4px 24px rgba(0,0,0,0.4)',
  cardHover:'0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,238,255,0.08)',
  glow:     '0 0 24px rgba(0,238,255,0.15)',
  glowStrong:'0 0 48px rgba(0,238,255,0.25)',
  panel:    '0 24px 80px rgba(0,0,0,0.6)',
  inner:    'inset 0 1px 0 rgba(255,255,255,0.06)',
} as const);

// ─── Z-index ──────────────────────────────────────────────────────────────────

export const Z = Object.freeze({
  base:    0,
  card:    10,
  sticky:  20,
  sidebar: 30,
  topbar:  40,
  modal:   50,
  toast:   60,
  tooltip: 70,
} as const);

// ─── Breakpoints ──────────────────────────────────────────────────────────────

export const BP = Object.freeze({
  mobile:  480,
  tablet:  768,
  desktop: 1024,
  wide:    1440,
} as const);

// ─── Animation Durations ─────────────────────────────────────────────────────

export const DURATION = Object.freeze({
  instant: 80,
  fast:    150,
  normal:  280,
  slow:    500,
  xslow:   800,
} as const);
