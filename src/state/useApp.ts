import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emptyF, parseQuery } from '../engine/parse'
import { computeView, type View } from '../engine/session'
import { applyChip, chipsFromFilters, removeChip as removeChipF, type Suggestion } from '../engine/suggest'
import { morph } from '../motion/morph'
import { telemetry } from '../telemetry'
import { opening, reply, type Msg, type Option, type Trigger } from '../engine/coach'
import { isEmptyFilters, relaxations, search } from '../engine/search'
import type { Chip, Filters } from '../engine/types'

export type Overlay = 'closed' | 'search' | 'thread'
export type Screen = 'plp' | 'results'

export type App = ReturnType<typeof useApp>

export function useApp() {
  const [screen, setScreen] = useState<Screen>('plp')
  const [overlay, setOverlay] = useState<Overlay>('closed')
  const [base, setBase] = useState<Filters>(emptyF())
  const [typed, setTyped] = useState('')
  const [adds, setAdds] = useState(0) // refinements since the last product tap
  const [resultsF, setResultsF] = useState<Filters>(emptyF())
  const [thread, setThread] = useState<{ msgs: Msg[]; filters: Filters; baseline: number; answered: string[] } | null>(null)
  const [coachTyping, setCoachTyping] = useState(false)
  const [returnTo, setReturnTo] = useState<Screen>('plp')

  const view: View = useMemo(() => computeView(base, typed, { refinementsWithoutTap: adds }), [base, typed, adds])

  // What each pause in typing produced: the line that answers "did the search understand them?"
  useEffect(() => {
    if (overlay !== 'search' || !typed.trim()) return
    const id = window.setTimeout(() => telemetry.log('query', {
      typed, kind: view.kind, mode: view.mode, total: view.total, title: view.title, note: view.note,
      lost: !!view.note?.startsWith("Didn't find"), chips: view.chips.map((c) => c.label), pills: (view.complete.length ? view.complete : view.next).map((c) => ('text' in c ? c.text : c.label)),
    }), 900)
    return () => clearTimeout(id)
  }, [typed, view, overlay])

  const openSearch = useCallback((source?: HTMLElement) => {
    morph.source = source ?? null
    // iOS Safari only raises the keyboard if focus happens inside the tap itself
    document.getElementById('search-input')?.focus({ preventScroll: true })
    telemetry.log('open_search')
    setBase(emptyF()); setTyped(''); setAdds(0); setThread(null); setReturnTo('plp'); setOverlay('search')
  }, [])
  const closeOverlay = useCallback(() => { telemetry.log('close_overlay'); setOverlay('closed'); setThread(null); setCoachTyping(false) }, [])

  const tapSuggestion = useCallback((s: Suggestion) => { telemetry.log('tap_suggestion', { text: s.text }); setBase(s.filters); setTyped(''); setAdds((n) => n + 1) }, [])
  const addChip = useCallback((c: Chip) => { telemetry.log('tap_next_pill', { label: c.label }); setBase(applyChip(view.filters, c)); setTyped(''); setAdds((n) => n + 1) }, [view.filters])
  const removeChip = useCallback((c: Chip) => { telemetry.log('remove_chip', { label: c.label }); setBase(removeChipF(base, c)); setAdds(0) }, [base])
  // finish the unfinished last word in place; typed text and focus stay put
  const complete = useCallback((text: string) => { telemetry.log('tap_completion', { text }); setTyped((t) => t.replace(/[^\s]+$/, '') + text + ' ') }, [])
  const tapRelax = useCallback((r: { filters: Filters; label?: string }) => { telemetry.log('tap_relax', { label: r.label }); setBase(r.filters); setTyped(''); setAdds((n) => n + 1) }, [])
  const tapProduct = useCallback(() => { telemetry.log('tap_product'); setAdds(0) }, [])

  const goResults = useCallback((f: Filters) => {
    telemetry.log('land_results', { filters: chipsFromFilters(f).map((c) => c.label), n: search(f).length })
    setResultsF(f); setScreen('results'); setOverlay('closed'); setThread(null); setCoachTyping(false)
  }, [])
  const startThread = useCallback((filters: Filters, trigger: Trigger, from: Screen) => {
    telemetry.log('open_coach', { trigger, from, filters: chipsFromFilters(filters).map((c) => c.label) })
    if (from === 'results') morph.source = null
    setReturnTo(from)
    setThread({ msgs: opening(filters, trigger), filters, baseline: search(filters).reduce((a, p) => a + p.skus, 0), answered: [] })
    setOverlay('thread')
  }, [])
  // Enter: land on results, stay in the overlay when nothing matches (the rescue is the answer),
  // and hand a query we could not read at all to Coach instead of dumping the whole catalog
  const submit = useCallback(() => {
    const parsed = parseQuery(typed)
    const merged = computeView(base, typed, { refinementsWithoutTap: 0 })
    if (parsed.kind === 'empty' && isEmptyFilters(base)) { telemetry.log('submit', { typed, outcome: 'empty' }); return }
    if (merged.mode === 'zero') { telemetry.log('submit', { typed, outcome: 'stayed_zero_results' }); return }
    telemetry.log('submit', { typed, outcome: isEmptyFilters(merged.filters) ? 'to_coach_not_understood' : 'to_results' })
    if (isEmptyFilters(merged.filters)) { startThread(merged.filters, 'vague', 'plp'); return }
    goResults(merged.filters)
  }, [base, typed, goResults, startThread])
  const askCoach = useCallback(() => {
    const t: Trigger = isEmptyFilters(view.filters) ? 'manual' : view.mode === 'zero' ? 'zero' : view.mode === 'vague' ? 'vague' : view.mode === 'stalled' ? 'stalled' : 'normal'
    startThread(view.filters, t, 'plp')
  }, [view, startThread])
  const askCoachFromResults = useCallback(() => startThread(resultsF, 'normal', 'results'), [resultsF, startThread])

  const answer = useCallback((input: { text?: string; option?: Option }) => {
    if (!thread) return
    const r = reply(thread.filters, input)
    telemetry.log('coach_say', { said: input.text ?? input.option?.label, typed: !!input.text, outcome: r.outcome, widened: r.widened, coach: r.msgs[1].text })
    const [user, coach] = r.msgs
    // user message appears at once (animated), Coach "types" briefly, then answers
    setThread((t) => (t ? { ...t, answered: JSON.stringify(r.filters) === JSON.stringify(t.filters) ? t.answered : [...t.answered, user.text], msgs: [...t.msgs.map((m): Msg => ({ ...m, options: undefined })), user] } : t))
    setCoachTyping(true)
    window.setTimeout(() => {
      setCoachTyping(false)
      setThread((t) => (t ? { ...t, filters: r.filters, msgs: t.msgs.concat(coach) } : t))
    }, 900)
  }, [thread])

  const showThese = useCallback(() => { telemetry.log('show_these'); if (thread) goResults(thread.filters) }, [thread, goResults])
  const removeResultChip = useCallback((c: Chip) => { telemetry.log('remove_result_chip', { label: c.label }); setResultsF((f) => removeChipF(f, c)) }, [])
  const backToSearch = useCallback(() => {
    telemetry.log('coach_back')
    // leaving the thread without landing: return to where the user was
    if (returnTo === 'results') { setOverlay('closed'); setThread(null) } else { setOverlay('search') ; setThread(null) }
  }, [returnTo])

  const reset = useCallback(() => {
    setScreen('plp'); setOverlay('closed'); setBase(emptyF()); setTyped(''); setAdds(0); setThread(null); setCoachTyping(false)
  }, [])

  // Deep links for demos and QA: ?state=search|zero|vague|stalled|thread|results
  const deepLinked = useRef(false) // StrictMode runs effects twice in dev; seed the state only once
  useEffect(() => {
    if (deepLinked.current) return
    deepLinked.current = true
    const st = new URLSearchParams(window.location.search).get('state')
    if (!st) return
    const work = parseQuery('tabby brown for work').filters
    if (st === 'search') setOverlay('search')
    if (st === 'zero') { setOverlay('search'); setTyped('red tabby gold hardware under $200') }
    if (st === 'vague') { setOverlay('search'); setTyped("something for my sister's wedding") }
    if (st === 'stalled') { setOverlay('search'); setBase(work); setAdds(2) }
    if (st === 'thread') { setBase(work); setAdds(2); startThread(work, 'stalled', 'plp') }
    if (st === 'results') { setResultsF(work); setScreen('results') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    screen, overlay, base, typed, setTyped, adds, view, thread, coachTyping, resultsF,
    openSearch, closeOverlay, tapSuggestion, addChip, complete, removeChip, tapRelax, tapProduct, submit,
    reset, askCoach, askCoachFromResults, answer, showThese, removeResultChip, backToSearch,
    relaxFor: (f: Filters) => relaxations(f),
  }
}
