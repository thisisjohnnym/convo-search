import { chipsFromFilters } from './suggest'
import { count, isEmptyFilters, relaxations, search, whyTag } from './search'
import { alsoRail, completions, themeRails, nextChips, railTitle, suggestions, type Completion } from './suggest'
import { ADJACENT, COLOR_MATCH, OCCASION_PHRASES } from './lexicon'
import { mergeFilters, parseQuery } from './parse'
import type { Chip, Filters, Product, QueryKind } from './types'

export type Mode = 'normal' | 'zero' | 'vague' | 'stalled'

export type View = {
  filters: Filters
  kind: QueryKind
  mode: Mode
  results: Product[]
  total: number
  title: string
  rail: { product: Product; why?: string }[]
  moreRail?: { title: string; products: Product[] }
  suggestions: ReturnType<typeof suggestions>
  /** Second rail, always matched to the query (null = none). */
  also: { title: string; products: Product[] } | null
  /** Occasion queries: extra rails with different angles on the same occasion. */
  more: { title: string; products: Product[] }[]
  /** Plain-language line shown above the rail, e.g. when a color is not stocked. */
  note?: string
  next: Chip[]
  /** Live completions of the unfinished last word; empty when the word is complete. */
  complete: Completion[]
  relax: ReturnType<typeof relaxations>
  chips: Chip[]
}

/** "Perfect for a Night Out": headline that echoes the user's own occasion wording. */
function occasionTitle(typed: string, f: Filters): string | undefined {
  if (!f.occasions.length || f.family || f.category) return undefined
  const t = typed.toLowerCase()
  const hit = OCCASION_PHRASES.find(([re, occ]) => occ === f.occasions[0] && re.test(t))
  return hit ? `Perfect for ${hit[2]}` : undefined
}

/** Offered when a query was not understood at all: three safe ways to start. */
const STARTERS: Chip[] = [
  { id: 'occ:work', kind: 'occasion', label: 'for work', apply: { occasions: ['work'] } },
  { id: 'occ:gift', kind: 'occasion', label: 'for a gift', apply: { occasions: ['gift'] } },
  { id: 'price:300', kind: 'price', label: 'under $300', apply: { maxPrice: 300 } },
]

/** The single function the UI calls on every change. Pure: same inputs, same view. */
export function computeView(base: Filters, typed: string, opts: { refinementsWithoutTap: number }): View {
  const parsed = parseQuery(typed)
  const merged: Filters = mergeFilters(base, parsed.filters)
  const complete = completions(typed, base)
  // words we could not place. The unfinished last word is not "unknown" while completions still offer to finish it.
  const lastTok = typed.trim().toLowerCase().split(/[^a-z']+/).pop() ?? ''
  const finishing = !/\s$/.test(typed) && complete.length > 0
  const unknownWords = parsed.leftover.filter((w) => w.length >= 3 && !(finishing && lastTok.startsWith(w)))
  const noFilters = isEmptyFilters(merged)
  const lost = parsed.kind !== 'vague' && parsed.kind !== 'question' && unknownWords.length > 0
  // a color we do not stock (yellow, pink...): say so, and show the nearest shades we do have
  const unknown = merged.colors.filter((c) => (COLOR_MATCH[c]?.length ?? 1) === 0)
  let note: string | undefined
  let searchF = merged
  if (unknown.length) {
    const adj = Array.from(new Set(unknown.flatMap((c) => ADJACENT[c] ?? [])))
    searchF = { ...merged, colors: merged.colors.filter((c) => !unknown.includes(c)).concat(adj) }
    note = `No ${unknown[0]} bags right now. Here are the nearest shades.`
  }
  let results = search(searchF)
  let mode: Mode = 'normal'
  if (results.length === 0 && !noFilters) mode = 'zero'
  else if (parsed.kind === 'vague' || parsed.kind === 'question') mode = 'vague'
  else if (lost && noFilters) mode = 'vague'
  else if (opts.refinementsWithoutTap >= 2) mode = 'stalled'

  const relax = mode === 'zero' ? relaxations(merged) : []
  if (mode === 'zero') { note = undefined; results = relax.length ? search(relax[0].filters) : search({ colors: [], occasions: [], needs: [] }) }
  else if (!note && lost) note = noFilters ? `Didn't find “${unknownWords[0]}”. Here are our top picks.` : `Didn't find “${unknownWords[0]}”, so this is based on the rest.`
  else if (!note && parsed.fixes.length) note = `Showing results for “${parsed.fixes[0][1]}”.`
  if (mode === 'vague' && results.length === 0) {
    results = search({ colors: [], occasions: merged.occasions, needs: [] })
    if (!results.length) results = search({ colors: [], occasions: [], needs: [] })
  }

  const more = mode === 'normal' && !unknown.length ? themeRails(merged, results.slice(0, 6)) : []
  const rail = results.slice(0, 6).map((p, i) => ({ product: p, why: i < 2 ? whyTag(p, merged) : undefined }))
  return {
    filters: merged, kind: parsed.kind, mode, results, total: count(results),
    title: mode === 'zero' ? 'Closest picks' : unknown.length ? `Closest to ${unknown[0]}` : occasionTitle(typed, merged) ?? railTitle(merged, parsed.kind),
    note,
    more,
    also: mode === 'zero' || unknown.length || more.length ? null : mode === 'vague' ? alsoRail({ colors: [], occasions: [], needs: [] }, results) && { title: 'Or start here', products: alsoRail({ colors: [], occasions: [], needs: [] }, results)!.products } : alsoRail(merged, results),
    rail, suggestions: typed ? suggestions(typed, base, parsed.filters) : [],
    next: lost && noFilters ? STARTERS : nextChips(merged), complete, relax, chips: chipsFromFilters(merged),
  }
}
