import gsap from 'gsap'
import { DUR, EASE, prefersReducedMotion } from './tokens'

/** The element the search was opened from (the PLP search bar), so the overlay can morph out of it. */
export const morph = { source: null as HTMLElement | null }

type Parts = {
  wrap: HTMLElement
  sheet: HTMLElement
  field: HTMLElement
  bgGrey: HTMLElement
  bgWhite: HTMLElement
  icon: HTMLElement
  text: HTMLElement
  close: HTMLElement
}

const rect = (el: Element) => el.getBoundingClientRect()

/**
 * Open: the white search bar grows into the grey search field while a white sheet unrolls beneath it
 * and covers the page. Nothing pops: the bar's icon and text travel to their new place.
 * Returns a timeline that can be reversed to close.
 */
export function buildOpen(p: Parts, opts: { fromThread: boolean; fromEl: HTMLElement | null }): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true })
  const wr = rect(p.wrap)
  const reduced = prefersReducedMotion()

  if (reduced) {
    gsap.set(p.sheet, { clipPath: 'inset(0px 0px 0px 0px)', opacity: 0 })
    gsap.set(p.field, { opacity: 0 })
    tl.to(p.sheet, { opacity: 1, duration: 0.12 }, 0).to(p.field, { opacity: 1, duration: 0.12 }, 0)
    return tl
  }

  // Opened from the Ask Coach dock (thread, no search field): the sheet rises from the bottom.
  if (opts.fromThread || !opts.fromEl) {
    const fromBottom = opts.fromThread
    gsap.set(p.sheet, { clipPath: fromBottom ? 'inset(100% 0px 0px 0px)' : 'inset(0px 0px 100% 0px)' })
    gsap.set(p.field, { opacity: 0 })
    tl.to(p.sheet, { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.42, ease: 'expo.out' }, 0)
    tl.to(p.field, { opacity: 1, duration: DUR.component, ease: EASE.settle }, 0.12)
    return tl
  }

  const src = opts.fromEl
  const sr = rect(src)
  const fr = rect(p.field)
  const dy = sr.top - fr.top
  const k = sr.height / fr.height // the bar is shorter than the field

  // sheet starts as exactly the bar's strip, so it is seamless with the white bar underneath
  const stripBottom = Math.max(0, wr.height - (dy + sr.height))
  gsap.set(p.sheet, { clipPath: `inset(0px 0px ${wr.height - sr.height}px 0px)` })
  void stripBottom

  // field: starts white and bar-shaped, ends grey and field-shaped
  gsap.set(p.field, { opacity: 1 })
  gsap.set([p.bgGrey, p.bgWhite], { transformOrigin: 'top', scaleY: k, y: dy })
  gsap.set(p.bgGrey, { opacity: 0 })
  gsap.set(p.bgWhite, { opacity: 1 })

  // icon + text travel from where they sat in the bar
  const si = src.querySelector('[data-morph-icon]')
  const st = src.querySelector('[data-morph-text]')
  const ixy = si ? { x: rect(si).left - rect(p.icon).left, y: rect(si).top - rect(p.icon).top } : { x: -8, y: 0 }
  const txy = st ? { x: rect(st).left - rect(p.text).left, y: rect(st).top - rect(p.text).top } : { x: -8, y: 0 }
  gsap.set(p.icon, ixy)
  gsap.set(p.text, txy)
  gsap.set(p.close, { opacity: 0, scale: 0.6, filter: 'blur(4px)' })

  tl.set(src, { opacity: 0 }, 0)
  tl.to(p.sheet, { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.42, ease: 'expo.out' }, 0)
  tl.to([p.bgGrey, p.bgWhite], { scaleY: 1, y: 0, duration: DUR.surface, ease: EASE.enterSoft }, 0)
  tl.to(p.bgWhite, { opacity: 0, duration: DUR.component, ease: 'power1.out' }, 0.04)
  tl.to(p.bgGrey, { opacity: 1, duration: DUR.component, ease: 'power1.out' }, 0.04)
  tl.to([p.icon, p.text], { x: 0, y: 0, duration: DUR.surface, ease: EASE.enter, stagger: 0.03 }, 0)
  tl.to(p.close, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: DUR.component, ease: EASE.enter, clearProps: 'filter' }, 0.18)
  tl.eventCallback('onReverseComplete', () => { gsap.set(src, { opacity: 1 }) })
  return tl
}
