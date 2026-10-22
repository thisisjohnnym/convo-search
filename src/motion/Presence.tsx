import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { enter, exit } from './animate'
import type { Size } from './tokens'

type Props = {
  show: boolean
  children: ReactNode
  /** Size controls blur/scale amount and duration. */
  size?: Size
  className?: string
  style?: React.CSSProperties
  /** 'self' animates the wrapper; 'children' staggers [data-enter] descendants top to bottom; 'both' does the wrapper first, then children. */
  mode?: 'self' | 'children' | 'both'
  as?: 'div' | 'section'
  delay?: number
  /** Stay in the DOM (invisible, non-interactive) after exit, e.g. so an input can be focused inside a tap on iOS. */
  keepMounted?: boolean
}

/**
 * Keeps content mounted until its exit finishes, so nothing ever just disappears.
 * Enter/exit use the shared scale + opacity + blur recipe with overshoot and stagger.
 */
export function Presence({ show, children, size = 'base', className, style, mode = 'children', delay = 0, keepMounted = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(show || keepMounted)
  const [hidden, setHidden] = useState(!show)

  useLayoutEffect(() => {
    if (show) { setMounted(true); setHidden(false) }
  }, [show])

  useLayoutEffect(() => {
    const root = ref.current
    if (!root || !mounted) return
    if (!show && hidden) return // already hidden, nothing to exit
    const kids = mode === 'self' ? [] : Array.from(root.querySelectorAll('[data-enter]')).filter((el) => el.closest('[data-presence]') === root)
    const animateSelf = mode !== 'children' || kids.length === 0
    if (show) {
      if (animateSelf) enter([root], { size, delay })
      if (kids.length) enter(kids, { size: size === 'surface' ? 'base' : size, delay: delay + (animateSelf ? 0.08 : 0) })
    } else {
      const finish = () => { if (keepMounted) setHidden(true); else setMounted(false) }
      const exitSize = size === 'small' ? 'base' : size
      if (kids.length && animateSelf) {
        exit(kids, { size: 'base' })
        gsap.delayedCall(0.1, () => exit([root], { size: exitSize, onComplete: finish }))
      } else {
        exit(kids.length ? kids : [root], { size: exitSize, onComplete: finish })
      }
    }
  }, [show, mounted, mode, size]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null
  return (
    <div ref={ref} data-presence className={className} aria-hidden={hidden || undefined} style={hidden ? { ...style, opacity: 0, pointerEvents: 'none' } : style}>
      {children}
    </div>
  )
}
