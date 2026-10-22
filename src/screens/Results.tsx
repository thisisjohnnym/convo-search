import { useMemo } from 'react'
import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import gsap from 'gsap'
import { AnimatedList } from '../motion/AnimatedList'
import { Presence } from '../motion/Presence'
import { enter } from '../motion/animate'
import { Chip } from '../components/Chip'
import { Roll, SwapText } from '../components/Text'
import { chipsFromFilters } from '../engine/suggest'
import { search, whyTag, count } from '../engine/search'
import { summary } from '../engine/coach'
import type { App } from '../state/useApp'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function Results({ app, show }: { app: App; show: boolean }) {
  const f = app.resultsF
  const root = useRef<HTMLDivElement>(null)
  const ps = useMemo(() => search(f), [f])
  const chips = useMemo(() => chipsFromFilters(f), [f])
  useGSAP(() => {
    if (!show) return
    const tl = gsap.timeline()
    tl.add(enter('[data-enter="chrome"]'))
    tl.add(enter('[data-enter="dock"]', { size: 'base' }), '+=0.35')
  }, { scope: root, dependencies: [show] })

  if (!show) return null
  const title = cap(summary(f))
  return (
    <div ref={root} style={{ position: 'absolute', inset: 'calc(56px + var(--safe-top)) 0 0 0', background: 'var(--grey-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="scroll" style={{ flex: 1, paddingBottom: 90 }}>
        <button data-enter="chrome" onClick={(e) => app.openSearch(e.currentTarget)} style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: '#fff', padding: '16px', fontSize: 16 }}>
          <span data-morph-icon className="icon" style={{ fontSize: 22 }}>search</span>
          <span data-morph-text className="label" style={{ fontSize: 15 }}>{summary(f)}</span>
        </button>
        <div data-enter="chrome" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '20px 12px 8px' }}>
          <SwapText text={title} className="label" style={{ fontSize: 16, fontWeight: 500 }} />
          <span className="label" style={{ fontSize: 14 }}><Roll value={ps.length} /> Products</span>
        </div>
        <div data-enter="chrome" style={{ padding: '8px 12px 12px' }}>
          <AnimatedList items={chips.map((c) => ({ key: c.id, node: <Chip label={cap(c.label)} size="sm" onRemove={() => app.removeResultChip(c)} /> }))} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} size="small" />
        </div>
        <div data-enter="chrome" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px 16px' }}>
          <span data-press className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 130, padding: '10px 16px', fontSize: 13 }}><span className="icon" style={{ fontSize: 18 }}>tune</span>Filter / Sort</span>
          <span className="label" style={{ fontSize: 12, color: 'var(--muted)' }}>{count(ps)} styles &amp; colors</span>
        </div>
        <AnimatedList
          items={ps.map((p, i) => ({
            key: p.id,
            node: (
              <button data-press onClick={app.tapProduct} style={{ position: 'relative', display: 'block', width: '100%', textAlign: 'center', paddingBottom: 24 }}>
                <img src={`/products/${p.img}`} alt={p.name} style={{ width: '100%', aspectRatio: '220/275', objectFit: 'cover', background: '#efefef', display: 'block' }} />
                {i < 2 && whyTag(p, f) ? <span className="label" style={{ position: 'absolute', left: 8, top: 8, background: '#fff', padding: '4px 8px', fontSize: 11 }}>{whyTag(p, f)}</span> : null}
                <div style={{ padding: '16px 12px 8px', fontSize: 16, lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 8 }}>
                  {p.swatches.slice(0, 4).map((c, k) => <span key={k} style={{ width: 20, height: 20, borderRadius: 20, background: c, outline: '1px solid rgba(0,0,0,.12)' }} />)}
                </div>
                <div className="label" style={{ fontSize: 12 }}>{p.was ? <s style={{ color: 'var(--muted)', marginRight: 6 }}>${p.was}</s> : null}${p.price}</div>
              </button>
            ),
          }))}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }} size="base" animateInitial delay={0.2} stagger={0.06} />
      </div>

      {/* Persistent Ask Coach dock: cannot be scrolled past */}
      <div data-enter="dock" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '1px solid var(--divider)', padding: '8px 8px calc(8px + var(--safe-bottom))' }}>
        <button data-press onClick={app.askCoachFromResults} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'var(--grey-bg)', paddingRight: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, background: '#000', color: '#fff' }}><span className="icon" style={{ fontSize: 22 }}>auto_awesome</span></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 16 }}>Ask Coach about these {ps.length}</span>
              <span className="label" style={{ fontSize: 12, color: 'var(--muted)' }}>Compare, size, or style them</span>
            </span>
          </span>
          <span className="icon" style={{ fontSize: 20 }}>mic</span>
        </button>
      </div>
    </div>
  )
}

export const _pr = Presence
