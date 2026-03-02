/**
 * tokens.ts — ZERØ MERIDIAN 2026 push132
 * push132: Full reskin — light professional mode, navy accent (Bloomberg/CEX grade)
 * - Object.freeze() all exports ✓
 * - rgba() only ✓
 * - No className ✓
 * - No template literals ✓
 * - Pure TS (no JSX) ✓
 */

import React from 'react';

// ─── Color Palette ────────────────────────────────────────────────────────────

export const COLOR = Object.freeze({

  // ── Background ──
  bgBase:        'rgba(248,249,252,1)',
  bgCard:        'rgba(255,255,255,1)',
  bgCardHover:   'rgba(243,245,250,1)',
  bgModal:       'rgba(237,240,248,1)',
  bgSidebar:     'rgba(252,253,255,1)',
  bgTopbar:      'rgba(255,255,255,0.97)',

  // ── Accent — deep navy blue ──
  accent:        'rgba(15,40,180,1)',
  accentDim:     'rgba(15,40,180,0.08)',
  accentMid:     'rgba(15,40,180,0.30)',
  accentBorder:  'rgba(15,40,180,0.25)',
  accentHover:   'rgba(15,40,180,0.12)',

  // ── Positive — forest green ──
  positive:      'rgba(0,155,95,1)',
  positiveDim:   'rgba(0,155,95,0.09)',
  positiveMid:   'rgba(0,155,95,0.35)',
  positiveBorder:'rgba(0,155,95,0.28)',

  // ── Negative — crimson ──
  negative:      'rgba(208,35,75,1)',
  negativeDim:   'rgba(208,35,75,0.09)',
  negativeMid:   'rgba(208,35,75,0.35)',
  negativeBorder:'rgba(208,35,75,0.28)',

  // ── Warning — dark amber ──
  warning:       'rgba(195,125,0,1)',
  warningDim:    'rgba(195,125,0,0.09)',
  warningBorder: 'rgba(195,125,0,0.28)',

  // ── Text hierarchy ──
  textPrimary:   'rgba(8,12,40,1)',
  textSecondary: 'rgba(55,65,110,1)',
  textMuted:     'rgba(110,120,160,1)',
  textFaint:     'rgba(165,175,210,1)',

  // ── Borders ──
  border:        'rgba(15,40,100,0.10)',
  borderFaint:   'rgba(15,40,100,0.06)',
  borderMuted:   'rgba(15,40,100,0.12)',
  borderStrong:  'rgba(15,40,100,0.20)',

  // ── Misc ──
  white:         'rgba(255,255,255,1)',
  black:         'rgba(0,0,0,1)',
  overlay:       'rgba(8,12,40,0.45)',
  divider:       'rgba(15,40,100,0.08)',

} as const);

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONT = Object.freeze({
  display:     "'JetBrains Mono', monospace",
  mono:        "'JetBrains Mono', monospace",
  label:       "'JetBrains Mono', monospace",
  ui:          "'JetBrains Mono', monospace",
  tabularNums: { fontVariantNumeric: 'tabular-nums' } as React.CSSProperties,
} as const);

export const FONT_SIZE = Object.freeze({
  xs:   '9px',
  sm:   '10px',
  base: '11px',
  md:   '12px',
  lg:   '13px',
  xl:   '15px',
  '2xl':'18px',
  '3xl':'22px',
  '4xl':'28px',
} as const);

export const FONT_WEIGHT = Object.freeze({
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
  black:    800,
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
  px:   '1px',
  '0':  '0px',
  '1':  '4px',
  '2':  '8px',
  '3':  '12px',
  '4':  '16px',
  '5':  '20px',
  '6':  '24px',
  '8':  '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
} as const);

// ─── Border Radius ────────────────────────────────────────────────────────────

export const RADIUS = Object.freeze({
  sm:    4,
  md:    6,
  lg:    8,
  xl:    12,
  '2xl': 16,
  full:  9999,
} as const);

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const SHADOW = Object.freeze({
  card:      '0 1px 4px rgba(15,40,100,0.07), 0 0 0 1px rgba(15,40,100,0.06)',
  cardHover: '0 4px 16px rgba(15,40,100,0.10), 0 0 0 1px rgba(15,40,100,0.08)',
  elevated:  '0 8px 32px rgba(15,40,100,0.12), 0 0 0 1px rgba(15,40,100,0.08)',
  sidebar:   '2px 0 12px rgba(15,40,100,0.07)',
  topbar:    '0 1px 0 rgba(15,40,100,0.08)',
  focusRing: '0 0 0 3px rgba(15,40,180,0.14)',
  panel:     '0 2px 8px rgba(15,40,100,0.08)',
} as const);

// ─── Z-index ──────────────────────────────────────────────────────────────────

export const Z = Object.freeze({
  base:    0,
  card:    10,
  sticky:  20,
  sidebar: 50,
  topbar:  40,
  modal:   60,
  toast:   70,
  tooltip: 80,
} as const);

// ─── Breakpoints ──────────────────────────────────────────────────────────────

export const BP = Object.freeze({
  mobile:  480,
  tablet:  768,
  desktop: 1024,
  wide:    1440,
} as const);

// ─── Animation Durations ──────────────────────────────────────────────────────

export const DURATION = Object.freeze({
  instant: 80,
  fast:    150,
  normal:  250,
  slow:    400,
  xslow:   700,
} as const);

// ─── Shared types (kept from existing codebase) ───────────────────────────────

export interface CryptoAsset {
  id:                string;
  symbol:            string;
  name:              string;
  price:             number;
  change24h:         number;
  change7d:          number;
  change30d?:        number;
  marketCap:         number;
  volume24h:         number;
  high24h?:          number;
  low24h?:           number;
  circulatingSupply: number;
  totalSupply?:      number;
  ath?:              number;
  athDate?:          string;
  rank:              number;
  image?:            string;
  sparkline?:        number[];
  lastUpdated?:      string;
  priceDirection?:   'up' | 'down' | 'neutral';
}

export interface GlobalData {
  totalMcap:        number;
  totalVolume:      number;
  btcDominance:     number;
  ethDominance:     number;
  activeCurrencies: number;
  mcapChange24h:    number;
}

export interface FearGreedData {
  value: number;
  label: string;
}

export type MarketRegime = 'SURGE' | 'BULL' | 'CRAB' | 'BEAR';
export type AISignal     = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatCompact(n: number): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return '$' + (n / 1e9).toFixed(2)  + 'B';
  if (abs >= 1e6)  return '$' + (n / 1e6).toFixed(2)  + 'M';
  if (abs >= 1e3)  return '$' + (n / 1e3).toFixed(2)  + 'K';
  return '$' + n.toFixed(2);
}

export function formatCompactNum(n: number): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (abs >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (abs >= 1e3)  return (n / 1e3).toFixed(2)  + 'K';
  return n.toFixed(2);
}

export function getReconnectDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}
