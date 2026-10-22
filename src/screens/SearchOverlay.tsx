import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildOpen, morph } from '../motion/morph'
import { Presence } from '../motion/Presence'
import { AnimatedList } from '../motion/AnimatedList'
import { Chip } from '../components/Chip'
import { Rail } from '../components/Rail'
import { Roll } from '../components/Text'
import { Thread } from './Thread'
import { catalog } from '../data/catalog'
import { chipsFromFilters } from '../engine/suggest'
import { describe, relaxations, search, count } from '../engine/search'
import type { App } from '../state/useApp'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const history = ['p19', 'p20', 'p21'].map((id) => catalog.find((p) => p.id === id)!)

function Row({ text, typed, n, onTap }: { text: string; typed: string; n: number; onTap: () => void }) {
  const t = typed.toLowerCase()
  const lead = text.toLowerCase().startsWith(t) ? t.length : 0
  return (
    <button data-press onClick={onTap} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--divider)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="icon" style={{ fontSize: 22 }}>search</span>
        <span className="label" style={{ fontSize: 14 }}>
          <b style={{ fontWeight: 600 }}>{text.slice(0, lead)}</b>
          <span style={{ opacity: lead ? 0.5 : 1, fontWeight: lead ? 400 : 500 }}>{text.slice(lead)}</span>
        </span>
      </span>
      <Roll value={n} suffix=" results" className="label" style={{ fontSize: 14 }} />
    </button>
  )
}

export function SearchOverlay({ app }: { app: App }) {
  const { overlay, view, typed, base } = app
  const open = overlay !== 'closed'
  const inThread = overlay === 'thread'
  const inputRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const wrap = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const bgGrey = useRef<HTMLDivElement>(null)
  const bgWhite = useRef<HTMLDivElement>(null)
  const icon = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const tlRef = useRef<{ kill(): unknown; timeScale(n: number): { reverse(): unknown } } | null>(null)
  const wasOpen = useRef(false)
  const prevOpen = useRef(false)
  // content waits for the sheet only on the very render that opens the overlay
  const enterDelay = open && !prevOpen.current ? 0.3 : 0
  prevOpen.current = open

  // Morph the search bar into the field and unroll the white sheet (and reverse it on close)
  useLayoutEffect(() => {
    const parts = { wrap: wrap.current, sheet: sheet.current, field: field.current, bgGrey: bgGrey.current, bgWhite: bgWhite.current, icon: icon.current, text: textRef.current, close: closeBtn.current }
    if (Object.values(parts).some((x) => !x)) return
    const P = parts as Record<string, HTMLElement>
    if (open && !wasOpen.current) {
      tlRef.current?.kill()
      // measure the field at its final position: it is rendered (opacity 0) while closed
      const tl = buildOpen(P as never, { fromThread: overlay === 'thread', fromEl: morph.source })
      tlRef.current = tl
      tl.play()
    } else if (!open && wasOpen.current) {
      const tl = tlRef.current
      if (tl) { tl.timeScale(1.25).reverse() }
    }
    wasOpen.current = open
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Returning from the thread to search: refocus (a user gesture just happened, so iOS allows it)
  useEffect(() => {
    if (overlay === 'search') inputRef.current?.focus({ preventScroll: true })
  }, [overlay])
  useEffect(() => { if (!open) setMsg('') }, [open])

  const baseChips = useMemo(() => chipsFromFilters(base), [base])
  const isEmpty = !typed && baseChips.length === 0
  const ghost = view.suggestions[0] && typed && view.suggestions[0].text.toLowerCase().startsWith(typed.toLowerCase()) ? view.suggestions[0].text.slice(typed.length) : ''
  const mode = view.mode
  const closest = useMemo(() => {
    if (mode !== 'zero') return []
    return relaxations(view.filters).slice(0, 3).map((r) => ({ text: describe(r.filters), n: r.count, filters: r.filters }))
  }, [mode, view.filters])

  const f = view.filters
  const redFam = f.colors.length && f.family ? `${cap(f.colors[0])} ${cap(f.family)}s` : 'Those'
  const minPrice = (() => { const g = { ...f, maxPrice: undefined, hardware: undefined }; const p = search(g).map((x) => x.price).sort((a, b) => a - b); return p[0] })()
  const rescueBody = f.maxPrice && minPrice ? `${redFam} start at $${minPrice}, and ${f.family ? cap(f.family) + 's' : 'bags'} under $${f.maxPrice} aren't ${f.colors[0] ?? 'that'}. Loosen one, or let Coach find the closest.` : "Those filters don't overlap yet. Loosen one, or let Coach find the closest."

  const submitInput = () => {
    if (inThread) { const t = msg.trim(); if (t) { app.answer({ text: t }); setMsg('') } }
    else app.submit()
  }

  // nothing typed and no chips yet: the dock stays quiet until the user starts
  const dockPills = isEmpty ? [] : mode === 'zero'
    ? view.relax.slice(0, 3).map((r) => ({ key: `r:${r.key}`, node: <Chip label={r.label} onClick={() => app.tapRelax(r)} /> }))
    : view.complete.length
    ? view.complete.map((c) => ({ key: `c:${c.id}`, node: <Chip label={c.label} icon={<span className="icon" style={{ fontSize: 18, order: 2 }}>north_west</span>} onClick={() => { app.complete(c.text); inputRef.current?.focus({ preventScroll: true }) }} /> }))
    : view.next.map((c) => ({ key: `n:${c.id}`, node: <Chip label={c.label} icon={<span className="icon" style={{ fontSize: 18, order: 2 }}>search</span>} onClick={() => app.addChip(c)} /> }))

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 'calc(56px + var(--safe-top)) 0 0 0', zIndex: 5, display: 'flex', flexDirection: 'column', pointerEvents: open ? 'auto' : 'none' }}>
      {/* White sheet that unrolls from the search bar and covers the page */}
      <div ref={sheet} style={{ position: 'absolute', inset: 0, background: '#fff', clipPath: 'inset(0px 0px 100% 0px)' }} />

      {/* Field: the bar morphs into this. Chips + typed text, mirrors the Paper "chip field" */}
      <div ref={field} onClick={() => inputRef.current?.focus()} style={{ position: 'relative', flexShrink: 0, display: inThread ? 'none' : 'block', opacity: 0 }}>
        <div ref={bgGrey} style={{ position: 'absolute', inset: 0, background: 'var(--grey-bg)' }} />
        <div ref={bgWhite} style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0 }} />
        <div style={{ position: 'relative', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', gap: 8, minHeight: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
              <span ref={icon} className="icon" style={{ fontSize: 22, display: baseChips.length === 0 ? 'inline-block' : 'none' }}>search</span>
              <AnimatedList
                items={baseChips.map((c) => ({ key: c.id, node: <Chip label={c.label} size="sm" onRemove={() => app.removeChip(c)} /> }))}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} size="small" />
              <span ref={textRef} className="label" style={{ fontSize: 15, minWidth: 0 }}>
                {typed ? <>{typed}<span style={{ opacity: 0.25 }}>{ghost}</span></> : <span style={{ color: 'var(--placeholder)' }}>{baseChips.length ? '' : 'Search anything'}</span>}
              </span>
            </div>
            <button ref={closeBtn} data-press onClick={(e) => { e.stopPropagation(); app.closeOverlay() }} aria-label="Close search"><span className="icon" style={{ fontSize: 20 }}>close</span></button>
          </div>
        </div>
      </div>

      {/* Everything below the field enters after the morph, top to bottom */}
      <Presence show={open} size="base" mode="children" keepMounted delay={0.26} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Still searching? nudge (2+ refinements, no product tap) */}
      <Presence show={open && !inThread && mode === 'stalled'} size="base" mode="self" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="icon" style={{ fontSize: 20 }}>auto_awesome</span>
            <div><div className="label" style={{ fontSize: 12, color: 'var(--muted)' }}>Still looking?</div><div className="label" style={{ fontSize: 14, marginTop: 4 }}>Tell me what you need.</div></div>
          </div>
          <button data-press className="btn-black" onClick={app.askCoach} style={{ fontSize: 13, padding: '10px 14px' }}>Ask Coach</button>
        </div>
      </Presence>

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* SEARCH BODY */}
        <Presence show={open && !inThread} size="base" mode="children" delay={enterDelay} style={{ position: 'absolute', inset: 0 }}>
          <div className="scroll" style={{ height: '100%', padding: '0 0 24px' }}>
            {isEmpty ? (
              <div style={{ padding: '24px 8px 0' }}>
                <div data-enter className="label" style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>Previously searched</div>
                {history.map((p, i) => (
                  <div key={i} data-enter data-press style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                    <img src={`/products/${p.img}`} alt="" style={{ width: 38, height: 46, objectFit: 'cover', background: '#efefef' }} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 16 }}>{p.name}</div><div style={{ fontSize: 16 }}>${p.price}</div></div>
                    <span className="icon" style={{ fontSize: 22 }}>add_circle</span>
                    <span style={{ width: 1, height: 24, background: 'var(--outline)' }} />
                    <span className="icon" style={{ fontSize: 20, paddingRight: 6 }}>north_east</span>
                  </div>
                ))}
                <button data-enter data-press className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'var(--grey-bg)', padding: 16, marginTop: 12, fontSize: 14 }}>
                  <u>View search history</u><span className="icon" style={{ fontSize: 20 }}>history</span>
                </button>
              </div>
            ) : (
              <>
                {/* Are you looking for */}
                <Presence show={!!typed && view.suggestions.length > 0 && mode !== 'zero'} size="base" mode="self">
                  <div style={{ padding: '24px 8px 0' }}>
                    <div className="label" style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>Are you looking for</div>
                    <AnimatedList items={view.suggestions.map((s) => ({ key: s.text, node: <Row text={s.text} typed={typed} n={s.count} onTap={() => app.tapSuggestion(s)} /> }))} size="base" />
                  </div>
                </Presence>

                {/* Rescue: nothing matches everything */}
                <Presence show={mode === 'zero'} size="base" mode="children">
                  <div style={{ padding: '24px 8px 0' }}>
                    <div data-enter className="label" style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>Closest matches</div>
                    <AnimatedList items={closest.map((c) => ({ key: c.text, node: <Row text={c.text} typed="" n={c.n} onTap={() => app.tapRelax(c)} /> }))} size="base" animateInitial />
                    <div data-enter style={{ background: 'var(--grey-bg)', padding: '20px 16px', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 20, lineHeight: 1.1, letterSpacing: '-0.01em' }}>No match for all {Math.max(2, chipsFromFilters(f).length)}.</div>
                        <div style={{ fontSize: 14, lineHeight: 1.4, color: '#444' }}>{rescueBody}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <button data-press className="btn-black" onClick={app.askCoach}><span className="icon" style={{ fontSize: 18 }}>auto_awesome</span>Ask Coach</button>
                        <button data-press className="label" style={{ fontSize: 13, textDecoration: 'underline' }} onClick={() => view.relax[0] && app.tapRelax(view.relax[0])}>Clear a filter</button>
                      </div>
                    </div>
                  </div>
                </Presence>

                {/* Rails: title re-titles, cards re-rank */}
                {view.results.length > 0 && (
                  <>
                    <Rail title={view.title} note={view.note} count={mode === 'zero' ? undefined : view.total} items={view.rail} onTap={app.tapProduct} />
                    {view.more.map((r) => <Rail key={r.title} title={r.title} items={r.products.map((p) => ({ product: p }))} onTap={app.tapProduct} />)}
                    {view.also ? <Rail title={view.also.title} items={view.also.products.map((p) => ({ product: p }))} onTap={app.tapProduct} /> : null}
                  </>
                )}
              </>
            )}
          </div>
        </Presence>

        {/* THREAD BODY */}
        <Presence show={open && inThread} size="base" mode="children" delay={enterDelay} style={{ position: 'absolute', inset: 0 }}>
          <Thread app={app} />
        </Presence>
      </div>

      {/* Dock: pills / offer + input */}
      <div data-enter style={{ padding: '0 8px calc(8px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, background: 'linear-gradient(180deg,#fff0 0%,#fff 18%)' }}>
        <Presence show={open && !inThread && mode === 'vague'} size="base" mode="self">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#fff', outline: '1px solid var(--outline)', padding: '10px 10px 10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="icon" style={{ fontSize: 20 }}>auto_awesome</span><span className="label" style={{ fontSize: 13 }}>Want help narrowing this?</span></div>
            <button data-press className="btn-black" onClick={app.askCoach} style={{ fontSize: 13, padding: '10px 14px' }}>Ask Coach</button>
          </div>
        </Presence>
        {!inThread && (
          <div onMouseDown={(e) => e.preventDefault()}>
            <AnimatedList items={dockPills} style={{ display: 'flex', gap: 8, padding: 1, overflowX: 'auto', scrollbarWidth: 'none' }} itemStyle={{ flexShrink: 0 }} size="small" />
          </div>
        )}
        {inThread && <div className="label" style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.3 }}>You&rsquo;re asking Coach&rsquo;s AI assistant. It can make mistakes.</div>}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--grey-bg)', padding: '14px 8px 14px 16px', gap: 12 }}>
          {inThread ? (
            <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitInput()} placeholder="Ask anything about these bags" enterKeyHint="send" style={{ fontSize: 16 }} />
          ) : (
            <input id="search-input" ref={inputRef} value={typed} onChange={(e) => app.setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitInput()}
              placeholder={baseChips.length ? 'Tap to add more terms' : 'Tap to start searching'} enterKeyHint="search" autoCapitalize="off" autoCorrect="off" style={{ fontSize: 16 }} />
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 6 }}>
            {(inThread ? msg : typed) ? <button data-press onClick={submitInput} aria-label="Send"><span className="icon" style={{ fontSize: 20 }}>send</span></button> : <span className="icon" style={{ fontSize: 20 }}>mic</span>}
          </span>
        </div>
      </div>
      </Presence>
    </div>
  )
}

export const _unused = { count }
