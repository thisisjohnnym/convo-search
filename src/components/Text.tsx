import { useLayoutEffect, useRef } from 'react'
import { rollNumber, swapText } from '../motion/animate'

/** Text that blur-crossfades when its content changes (never a hard swap). */
export function SwapText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  const first = useRef(true)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (first.current) { el.textContent = text; first.current = false; return }
    swapText(el, text)
  }, [text])
  return <span ref={ref} className={className} style={{ display: 'inline-block', ...style }} />
}

/** A number that rolls to its new value, with an optional suffix ("results"). */
export function Roll({ value, suffix = '', className, style }: { value: number; suffix?: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  const first = useRef(true)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fmt = (n: number) => `${Math.round(n)}${suffix}`
    if (first.current) { el.dataset.value = String(value); el.textContent = fmt(value); first.current = false; return }
    rollNumber(el, value, fmt)
  }, [value, suffix])
  return <span ref={ref} className={className} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums', ...style }} />
}
