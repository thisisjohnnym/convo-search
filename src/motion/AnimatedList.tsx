import { useLayoutEffect, useReducer, useRef, type CSSProperties, type ReactNode } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { enter, exit } from './animate'
import { DUR, EASE, prefersReducedMotion, type Size } from './tokens'

export type ListItem = { key: string; node: ReactNode }

type Props = {
  items: ListItem[]
  className?: string
  style?: CSSProperties
  itemStyle?: CSSProperties
  size?: Size
  /** Delay before newly added items enter (lets a parent choreography go first). */
  delay?: number
  /** Animate the very first render too (set false when a parent Presence already staggers this container). */
  animateInitial?: boolean
  /** Extra per-item stagger step in seconds. */
  stagger?: number
  /** Glide surviving items to new positions (GSAP Flip). Off for append-only lists like chat. */
  flip?: boolean
}

/**
 * A list where nothing appears, disappears or jumps instantly:
 *  - new items enter with scale + opacity + blur + overshoot, staggered in order
 *  - removed items stay mounted until their exit finishes
 *  - surviving items glide to their new position (GSAP Flip) instead of snapping
 */
export function AnimatedList({ items, className, style, itemStyle, size = 'small', delay = 0, animateInitial = false, stagger, flip = true }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const last = useRef<ListItem[]>([]) // what was rendered last commit
  const done = useRef(new Set<string>()) // exits that finished
  const flipState = useRef<Flip.FlipState | null>(null)
  const started = useRef(new Set<string>())
  const first = useRef(true)
  const lastSig = useRef('')
  const [, force] = useReducer((n: number) => n + 1, 0)

  // ---- render phase: merge new items with still-exiting old ones, in old positions
  const newKeys = new Set(items.map((i) => i.key))
  for (const k of [...done.current]) if (newKeys.has(k)) done.current.delete(k) // item came back
  const merged: (ListItem & { leaving?: boolean })[] = [...items]
  last.current.forEach((old, idx) => {
    if (!newKeys.has(old.key) && !done.current.has(old.key)) merged.splice(Math.min(idx, merged.length), 0, { ...old, leaving: true })
  })

  // capture positions of survivors before the DOM updates, but only when the list really changed,
  // and never for elements still mid-entrance (Flip would cancel their enter tween)
  const sig = items.map((i) => i.key).join('|')
  const changed = sig !== lastSig.current
  if (flip && box.current && !first.current && changed) {
    const prevKeys = new Set(last.current.map((i) => i.key))
    const survivors = items
      .filter((i) => prevKeys.has(i.key))
      .map((i) => box.current!.querySelector(`[data-key="${CSS.escape(i.key)}"]`))
      .filter((el): el is Element => !!el && gsap.getTweensOf(el).length === 0) as Element[]
    flipState.current = survivors.length ? Flip.getState(survivors) : null
  }

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const prevKeys = new Set(last.current.map((i) => i.key))
    const added = items.filter((i) => !prevKeys.has(i.key)).map((i) => el.querySelector(`[data-key="${CSS.escape(i.key)}"]`)).filter(Boolean) as Element[]
    const leaving = merged.filter((m) => m.leaving && !started.current.has(m.key))

    lastSig.current = sig
    if (flipState.current && changed && !prefersReducedMotion()) {
      Flip.from(flipState.current, { duration: DUR.surface, ease: EASE.move, stagger: 0.02, overwrite: 'auto' })
    }
    flipState.current = null

    if (added.length && (animateInitial || !first.current)) {
      enter(added, { size, delay, stagger })
    }
    for (const m of leaving) {
      started.current.add(m.key)
      const node = el.querySelector(`[data-key="${CSS.escape(m.key)}"]`)
      if (!node) { done.current.add(m.key); continue }
      exit(node, {
        onComplete: () => {
          done.current.add(m.key)
          started.current.delete(m.key)
          force()
        },
      })
    }
    last.current = merged.map(({ key, node }) => ({ key, node }))
    first.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  return (
    <div ref={box} className={className} style={style}>
      {merged.map((m) => (
        <div key={m.key} data-key={m.key} style={itemStyle}>
          {m.node}
        </div>
      ))}
    </div>
  )
}
