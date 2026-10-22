// All motion values live here. No magic numbers in components. See CLAUDE.md "MOTION RULE".

export const EASE = {
  enter: 'back.out(1.4)', // slight overshoot on arrival
  enterSoft: 'back.out(1.15)', // large surfaces
  move: 'back.out(1.2)', // reorders, shared-element moves
  exit: 'power2.in',
  settle: 'power3.out',
  press: 'power2.out',
  release: 'back.out(2.2)',
} as const

export const DUR = {
  micro: 0.2,
  component: 0.36,
  surface: 0.48,
  exit: 0.22,
  press: 0.12,
  release: 0.42,
} as const

export const STAGGER = {
  enter: 0.045, // top to bottom
  exit: 0.025, // bottom to top
  maxTotal: 0.4,
} as const

export const ENTER_FROM = {
  small: { opacity: 0, scale: 0.9, y: 6, filter: 'blur(4px)' },
  base: { opacity: 0, scale: 0.96, y: 8, filter: 'blur(8px)' },
  surface: { opacity: 0, scale: 0.98, y: 12, filter: 'blur(6px)' },
} as const

export const ENTER_TO = {
  opacity: 1,
  scale: 1,
  y: 0,
  filter: 'blur(0px)',
} as const

export const EXIT_TO = {
  base: { opacity: 0, scale: 0.98, y: -4, filter: 'blur(4px)' },
  surface: { opacity: 0, scale: 0.985, y: 6, filter: 'blur(4px)' },
} as const

export type Size = keyof typeof ENTER_FROM

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Per-item stagger that never exceeds STAGGER.maxTotal (later items group together). */
export const staggerEach = (count: number, step: number = STAGGER.enter) =>
  count <= 1 ? 0 : Math.min(step, STAGGER.maxTotal / (count - 1))
