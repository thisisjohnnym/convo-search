import gsap from 'gsap'
import {
  DUR,
  EASE,
  ENTER_FROM,
  ENTER_TO,
  EXIT_TO,
  prefersReducedMotion,
  staggerEach,
  STAGGER,
  type Size,
} from './tokens'

type Targets = gsap.TweenTarget

const toArray = (t: Targets): Element[] =>
  gsap.utils.toArray(t as string) as Element[]

/**
 * Enter: scale + opacity + blur with slight overshoot, staggered top to bottom.
 * Elements are tweened in DOM order, which is reading order.
 * overwrite:"auto" so a new call retargets from the current value instead of queueing.
 */
export function enter(
  targets: Targets,
  opts: { size?: Size; stagger?: number; delay?: number; duration?: number } = {},
) {
  const els = toArray(targets)
  if (!els.length) return gsap.timeline()
  const size = opts.size ?? 'base'
  const reduced = prefersReducedMotion()

  if (reduced) {
    return gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.12, overwrite: 'auto', clearProps: 'opacity' })
  }
  return gsap.fromTo(els, ENTER_FROM[size], {
    ...ENTER_TO,
    duration: opts.duration ?? (size === 'surface' ? DUR.surface : DUR.component),
    ease: size === 'surface' ? EASE.enterSoft : EASE.enter,
    stagger: opts.stagger ?? staggerEach(els.length),
    delay: opts.delay ?? 0,
    overwrite: 'auto',
    clearProps: 'filter',
  })
}

/** Exit: shorter than enter, no overshoot, staggers bottom to top. Returns the tween (await onComplete). */
export function exit(targets: Targets, opts: { size?: 'base' | 'surface'; onComplete?: () => void } = {}) {
  const els = toArray(targets).reverse()
  const size = opts.size ?? 'base'
  if (!els.length) {
    opts.onComplete?.()
    return gsap.timeline()
  }
  if (prefersReducedMotion()) {
    return gsap.to(els, { opacity: 0, duration: 0.12, overwrite: 'auto', onComplete: opts.onComplete })
  }
  return gsap.to(els, {
    ...EXIT_TO[size],
    duration: DUR.exit,
    ease: EASE.exit,
    stagger: staggerEach(els.length, STAGGER.exit),
    overwrite: 'auto',
    onComplete: opts.onComplete,
  })
}

/** Count roll: tween a proxy and render each frame (never hard-swap numbers). */
export function rollNumber(el: HTMLElement, to: number, format: (n: number) => string = (n) => String(Math.round(n))) {
  const from = Number(el.dataset.value ?? to)
  const proxy = { v: from }
  el.dataset.value = String(to)
  if (prefersReducedMotion()) {
    el.textContent = format(to)
    return
  }
  gsap.to(proxy, {
    v: to,
    duration: DUR.component + 0.1,
    ease: EASE.settle,
    overwrite: 'auto',
    onUpdate: () => {
      el.textContent = format(proxy.v)
    },
  })
}

/** Blur-crossfade for swapped text (titles, labels): out fast, set, in with overshoot. */
export function swapText(el: HTMLElement, next: string) {
  if (el.textContent === next) return
  if (prefersReducedMotion()) {
    el.textContent = next
    return
  }
  gsap
    .timeline({ defaults: { overwrite: 'auto' } })
    .to(el, { opacity: 0, filter: 'blur(6px)', y: -4, duration: 0.14, ease: EASE.exit })
    .call(() => {
      el.textContent = next
    })
    .fromTo(
      el,
      { opacity: 0, filter: 'blur(6px)', y: 6 },
      { opacity: 1, filter: 'blur(0px)', y: 0, duration: DUR.component, ease: EASE.enter, clearProps: 'filter' },
    )
}
