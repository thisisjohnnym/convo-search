import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { AnimatedList } from '../motion/AnimatedList'
import { Presence } from '../motion/Presence'
import { Chip } from '../components/Chip'
import { MsgCarousel } from '../components/MsgCarousel'
import { chipsFromFilters } from '../engine/suggest'
import type { App } from '../state/useApp'
import type { Msg } from '../engine/coach'

function TypingDots() {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.to('.dot', { y: -4, opacity: 1, duration: 0.32, ease: 'power2.inOut', stagger: { each: 0.12, repeat: -1, yoyo: true }, overwrite: false })
  }, { scope: ref })
  return (
    <div ref={ref} style={{ background: 'var(--grey-bg)', padding: '14px 14px', display: 'inline-flex', gap: 6, alignSelf: 'flex-start' }}>
      {[0, 1, 2].map((i) => <span key={i} className="dot" style={{ width: 6, height: 6, borderRadius: 6, background: '#000', opacity: 0.35 }} />)}
    </div>
  )
}

function Bubble({ m, onSee }: { m: Msg; onSee?: () => void }) {
  if (m.from === 'user') {
    return <div style={{ alignSelf: 'flex-end', background: '#000', color: '#fff', padding: '12px 14px', maxWidth: 300, fontSize: 16, lineHeight: 1.35 }}>{m.text}</div>
  }
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="label" style={{ fontSize: 12, color: 'var(--muted)' }}>Coach</span>
      <div style={{ background: 'var(--grey-bg)', padding: '12px 14px', fontSize: 16, lineHeight: 1.35 }}>{m.text}</div>
      {m.carousel ? <MsgCarousel c={m.carousel} onSee={onSee} /> : null}
    </div>
  )
}

export function Thread({ app }: { app: App }) {
  const t = app.thread
  const scroller = useRef<HTMLDivElement>(null)
  const msgCount = t?.msgs.length ?? 0
  useEffect(() => {
    const el = scroller.current
    if (el) window.setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 80)
  }, [msgCount, app.coachTyping])
  if (!t) return null

  const chips = chipsFromFilters(t.filters)
  const lastCarousel = [...t.msgs].reverse().find((m) => m.carousel)
  const lastCoach = [...t.msgs].reverse().find((m) => m.from === 'coach')
  const last = t.msgs[t.msgs.length - 1]
  const showOptions = !app.coachTyping && last?.from === 'coach' && lastCoach?.options?.length

  const items = t.msgs.map((m) => ({ key: `m:${m.id}`, node: <Bubble m={m} onSee={m.id === lastCarousel?.id ? app.showThese : undefined} /> }))
  if (app.coachTyping) items.push({ key: 'typing', node: <TypingDots /> })
  if (showOptions && lastCoach?.options) {
    items.push({
      key: `opts:${lastCoach.id}`,
      node: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 1 }}>
          {lastCoach.options.map((o) => (
            <Chip key={o.id} label={o.label} dashed={o.free} icon={o.free ? <span className="icon" style={{ fontSize: 16 }}>edit</span> : undefined}
              onClick={() => (o.free ? (document.querySelector('input[placeholder^="Ask anything"]') as HTMLInputElement | null)?.focus() : app.answer({ option: o }))} />
          ))}
        </div>
      ),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chips stay on screen as the conversation's context */}
      <div data-enter style={{ background: 'var(--grey-bg)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
        <AnimatedList items={chips.map((c, i) => ({ key: c.id, node: <Chip label={c.label} size="sm" dark={i === chips.length - 1 && t.msgs.length > 2} /> }))} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} size="small" />
        <button data-press onClick={app.backToSearch} aria-label="Back to search"><span className="icon" style={{ fontSize: 20 }}>close</span></button>
      </div>

      <div ref={scroller} data-enter className="scroll" style={{ flex: 1, padding: '20px 16px 16px', minHeight: 0 }}>
        <AnimatedList items={items} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} size="base" animateInitial delay={0.25} stagger={0.12} flip={false} itemStyle={{ display: 'flex', flexDirection: 'column' }} />
      </div>
    </div>
  )
}

export const _p = Presence
