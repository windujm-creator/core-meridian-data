/**
 * motion.ts — ZERØ MERIDIAN 2026
 * Centralized Framer Motion constants.
 * - Object.freeze() all exports ✓
 * - No className ✓
 * - No template literals ✓
 * - Pure TS (no JSX) ✓
 */

import type { Transition, Variants, TargetAndTransition } from 'framer-motion';

// ─── Transitions ──────────────────────────────────────────────────────────────

export const TRANSITION = Object.freeze({
  /** Snappy spring — cards, panels */
  spring: {
    type:      'spring',
    stiffness: 380,
    damping:   28,
    mass:      0.8,
  } as Transition,

  /** Bouncy spring — badge pop, dot indicator */
  springBouncy: {
    type:      'spring',
    stiffness: 500,
    damping:   20,
    mass:      0.6,
  } as Transition,

  /** Fast ease — tooltips, dropdowns */
  fast: {
    type:     'tween',
    duration: 0.15,
    ease:     [0.22, 1, 0.36, 1],
  } as Transition,

  /** Normal ease — page transitions, modals */
  normal: {
    type:     'tween',
    duration: 0.28,
    ease:     [0.22, 1, 0.36, 1],
  } as Transition,
} as const);

// ─── Hover / Tap ──────────────────────────────────────────────────────────────

export const HOVER = Object.freeze({
  /** Subtle lift for cards */
  lift: {
    y:      -2,
    scale:  1.01,
    boxShadow: '0 8px 32px rgba(0,238,255,0.08)',
  } as TargetAndTransition,

  /** Glow for icon buttons */
  glow: {
    scale:     1.08,
    filter:    'brightness(1.2)',
  } as TargetAndTransition,
} as const);

export const TAP = Object.freeze({
  /** Slight press — buttons, cards */
  press: {
    scale: 0.97,
    y:     1,
  } as TargetAndTransition,

  /** Hard press — CTAs */
  pressFirm: {
    scale: 0.94,
  } as TargetAndTransition,
} as const);

// ─── Variants ─────────────────────────────────────────────────────────────────

export const VARIANTS = Object.freeze({
  /** Page slide up — route transitions */
  pageSlideUp: {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0,  transition: TRANSITION.normal },
    exit:    { opacity: 0, y: -12, transition: TRANSITION.fast  },
  } as Variants,

  /** Animated number flip — price changes */
  numberFlip: {
    initial: { opacity: 0, y: 8  },
    animate: { opacity: 1, y: 0, transition: TRANSITION.spring  },
    exit:    { opacity: 0, y: -8, transition: TRANSITION.fast   },
  } as Variants,

  /** Fade in — overlays, tooltips */
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: TRANSITION.fast  },
    exit:    { opacity: 0, transition: TRANSITION.fast  },
  } as Variants,

  /** Slide in from right — side panel */
  slideInRight: {
    initial: { opacity: 0, x: 40  },
    animate: { opacity: 1, x: 0,   transition: TRANSITION.spring },
    exit:    { opacity: 0, x: 40,  transition: TRANSITION.fast   },
  } as Variants,

  /** Slide in from left — mobile drawer */
  slideInLeft: {
    initial: { opacity: 0, x: -40 },
    animate: { opacity: 1, x: 0,   transition: TRANSITION.spring },
    exit:    { opacity: 0, x: -40, transition: TRANSITION.fast   },
  } as Variants,

  /** Scale in — modals, dialogs */
  scaleIn: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1,    transition: TRANSITION.spring },
    exit:    { opacity: 0, scale: 0.92, transition: TRANSITION.fast   },
  } as Variants,

  /** Stagger container — list items */
  staggerContainer: {
    animate: {
      transition: { staggerChildren: 0.04, delayChildren: 0.06 },
    },
  } as Variants,

  /** Stagger child — used with staggerContainer */
  staggerChild: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0,  transition: TRANSITION.normal },
  } as Variants,
} as const);
