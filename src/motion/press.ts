import gsap from 'gsap'
import { DUR, EASE, prefersReducedMotion } from './tokens'

/**
 * Global press feedback for any element with [data-press].
 * Called once at app start. Springs back with overshoot on release.
 */
export function installPressFeedback() {
  const target = (e: Event) => (e.target as Element | null)?.closest?.('[data-press]') as HTMLElement | null
  let active: HTMLElement | null = null

  const down = (e: PointerEvent) => {
    const el = target(e)
    if (!el || prefersReducedMotion()) return
    active = el
    gsap.to(el, { scale: 0.97, duration: DUR.press, ease: EASE.press, overwrite: 'auto' })
  }
  const up = () => {
    if (!active) return
    const el = active
    active = null
    gsap.to(el, { scale: 1, duration: DUR.release, ease: EASE.release, overwrite: 'auto' })
  }
  document.addEventListener('pointerdown', down)
  document.addEventListener('pointerup', up)
  document.addEventListener('pointercancel', up)
  document.addEventListener('pointerleave', up)
  return () => {
    document.removeEventListener('pointerdown', down)
    document.removeEventListener('pointerup', up)
    document.removeEventListener('pointercancel', up)
    document.removeEventListener('pointerleave', up)
  }
}
