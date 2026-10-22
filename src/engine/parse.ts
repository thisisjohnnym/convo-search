import { catalog } from '../data/catalog'
import { CATEGORY_WORDS, CHEAP_CAP, CHEAP_WORDS, COLOR_WORDS, LUXURY_FLOOR, LUXURY_WORDS, MATERIAL_WORDS, OCCASION_WORDS, QUESTION_TRIGGERS, SALE_WORDS, SIZE_WORDS, STOP, VAGUE_TRIGGERS } from './lexicon'
import type { Filters, Need, QueryKind } from './types'

// 'tote' and 'hobo' are shapes, not product families: they resolve as categories
const FAMILIES = Array.from(new Set(catalog.map((p) => p.family))).filter((f) => f !== 'tote' && f !== 'hobo')
const emptyFilters = (): Filters => ({ colors: [], occasions: [], needs: [] })

export type Parsed = { filters: Filters; kind: QueryKind; leftover: string[]; words: string[]; /** typos we repaired: [typed, meant] */ fixes: [string, string][] }

/** Optimal-string-alignment distance: a swapped or missing letter counts as one edit. */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

const isKnown = (w: string) =>
  !!(COLOR_WORDS[w] || OCCASION_WORDS[w] || CATEGORY_WORDS[w] || SIZE_WORDS[w] || MATERIAL_WORDS[w] || FAMILIES.includes(w) || FAMILIES.includes(w.replace(/s$/, '')) || CHEAP_WORDS.has(w) || LUXURY_WORDS.has(w) || SALE_WORDS.has(w))

const VOCAB = Array.from(new Set([
  ...Object.keys(COLOR_WORDS), ...Object.keys(OCCASION_WORDS), ...Object.keys(CATEGORY_WORDS), ...Object.keys(SIZE_WORDS), ...Object.keys(MATERIAL_WORDS), ...FAMILIES,
])).filter((w) => w.length >= 4 && !STOP.has(w))

/** "tabbi" -> "tabby": the one known word within a typo's reach, or undefined when nothing (or two things) fits. */
function fuzzy(w: string): string | undefined {
  if (w.length < 4 || w.length > 14 || /[^a-z]/.test(w) || STOP.has(w) || isKnown(w)) return undefined
  const max = w.length >= 6 ? 2 : 1
  let best: string | undefined
  let bestD = 99
  let tie = false
  for (const v of VOCAB) {
    if (v[0] !== w[0] || Math.abs(v.length - w.length) > max) continue
    if (w.length === 4 && v.length < 5) continue // short words are too easy to mistake for each other
    const dist = distance(w, v)
    if (dist > max) continue
    if (dist < bestD) { best = v; bestD = dist; tie = false }
    else if (dist === bestD && best !== v) tie = true
  }
  return tie ? undefined : best
}

/** Overlay what a person just typed (or tapped) on the filters they already have. */
export function mergeFilters(base: Filters, p: Filters): Filters {
  const colors = Array.from(new Set([...base.colors, ...p.colors]))
  const notColors = Array.from(new Set([...(base.notColors ?? []), ...(p.notColors ?? [])]))
  const g: Filters = {
    ...base,
    family: p.family ?? base.family,
    category: p.category ?? base.category,
    colors: colors.filter((c) => !notColors.includes(c)),
    occasions: Array.from(new Set([...base.occasions, ...p.occasions])),
    maxPrice: p.maxPrice ?? base.maxPrice,
    minPrice: p.minPrice ?? base.minPrice,
    hardware: p.hardware ?? base.hardware,
    needs: Array.from(new Set([...base.needs, ...p.needs])),
    laptop: p.laptop ?? base.laptop,
    size: p.size ?? base.size,
    material: p.material ?? base.material,
    sale: p.sale || base.sale || undefined,
    notColors: notColors.length ? notColors : undefined,
  }
  return g
}

export function parseQuery(raw: string): Parsed {
  const filters = emptyFilters()
  const fixes: [string, string][] = []
  let q = raw.toLowerCase().replace(/[’']/g, "'").trim()
  if (!q) return { filters, kind: 'empty', leftover: [], words: [], fixes }

  // negation: "not black", "without gold", "i hate brown". Gold/silver are the only finishes, so ruling one out picks the other.
  const notColors: string[] = []
  q = q.replace(/\b(?:not|no|without|except|hate|hates|dislike|avoid|skip|other than|anything but|but not|nothing)\s+(?:the\s+|any\s+|a\s+)?([a-z]+)(\s+hardware)?/g, (m, w: string) => {
    if (COLOR_WORDS[w]) { if (!notColors.includes(COLOR_WORDS[w])) notColors.push(COLOR_WORDS[w]); return ' ' }
    if (w === 'gold' || w === 'silver') { filters.hardware = w === 'gold' ? 'silver' : 'gold'; return ' ' }
    return m
  })
  if (notColors.length) filters.notColors = notColors

  // price: "under $200", "below 300", "less than 250", "$200 or less"
  const price = q.match(/(?:under|below|less than|up to|max|<)\s*\$?\s*(\d{2,4})/) || q.match(/\$?\s*(\d{2,4})\s*(?:or less|and under)/)
  if (price) {
    filters.maxPrice = Number(price[1])
    q = q.replace(price[0], ' ')
  }
  // laptop size: "16 inch", "16in", "16\"", "fits my laptop"
  const lap = q.match(/\b(13|14|15|16)\s*(?:-?\s*inch(?:es)?|in\b|")/)
  if (lap) {
    const n = Number(lap[1])
    filters.laptop = n >= 16 ? 16 : n >= 15 ? 15 : 13
    if (!filters.needs.includes('laptop')) filters.needs.push('laptop')
    q = q.replace(lap[0], ' ')
  }
  if (/\blaptop\b/.test(q)) {
    if (!filters.needs.includes('laptop')) filters.needs.push('laptop')
    filters.laptop = filters.laptop ?? 13
    q = q.replace(/\blaptop\b/, ' ')
  }
  const needMap: [RegExp, Need][] = [
    [/\b(lunch|room for)\b/, 'lunch'],
    [/\b(comfortable|comfy|carry|lightweight|light)\b/, 'comfy'],
    [/\b(organi[sz]ed|organi[sz]er|pockets?|compartments?)\b/, 'organized'],
    [/\btop[- ]?handle\b/, 'topHandle'],
  ]
  for (const [re, need] of needMap) if (re.test(q)) { if (!filters.needs.includes(need)) filters.needs.push(need); q = q.replace(re, ' ') }

  if (/\bgold\b/.test(q)) { filters.hardware = 'gold'; q = q.replace(/\bgold( hardware)?\b/, ' ') }
  else if (/\bsilver\b/.test(q)) { filters.hardware = 'silver'; q = q.replace(/\bsilver( hardware)?\b/, ' ') }

  const words = q.split(/[^a-z$0-9']+/).filter(Boolean)
  // while typing, resolve the unfinished last word ("bla" -> black, "tab" -> tabby, "wed" -> wedding)
  const last = words[words.length - 1]
  if (last && last.length >= 3 && /[a-z]$/.test(raw.trimEnd()) && !raw.endsWith(' ')) {
    const known = [...Object.keys(COLOR_WORDS), ...Object.keys(OCCASION_WORDS), ...FAMILIES, ...Object.keys(CATEGORY_WORDS), ...Object.keys(SIZE_WORDS), ...Object.keys(MATERIAL_WORDS)]
    if (!known.includes(last)) {
      const hit = known.filter((k) => k.startsWith(last))
      const canon = new Set(hit.map((k) => (COLOR_WORDS[k] ? 'c:' + COLOR_WORDS[k] : OCCASION_WORDS[k] ? 'o:' + OCCASION_WORDS[k] : FAMILIES.includes(k) ? 'f:' + k : SIZE_WORDS[k] ? 's:' + SIZE_WORDS[k] : MATERIAL_WORDS[k] ? 'm:' + MATERIAL_WORDS[k] : 'k:' + (CATEGORY_WORDS[k] as string))))
      if (hit.length && canon.size === 1) words[words.length - 1] = hit[0]
    }
  }
  const leftover: string[] = []
  for (const w of words) {
    let wn = w.replace(/'s$/, '')
    const fixed = fuzzy(wn)
    if (fixed) { fixes.push([wn, fixed]); wn = fixed }
    if (COLOR_WORDS[wn]) { if (!filters.colors.includes(COLOR_WORDS[wn])) filters.colors.push(COLOR_WORDS[wn]) }
    else if (OCCASION_WORDS[wn]) { if (!filters.occasions.includes(OCCASION_WORDS[wn])) filters.occasions.push(OCCASION_WORDS[wn]) }
    else if (FAMILIES.includes(wn) || FAMILIES.includes(wn.replace(/s$/, ''))) filters.family = FAMILIES.includes(wn) ? wn : wn.replace(/s$/, '')
    else if (CATEGORY_WORDS[wn]) { const c = CATEGORY_WORDS[wn]; if (c !== 'any') filters.category = c }
    else if (SIZE_WORDS[wn]) filters.size = SIZE_WORDS[wn]
    else if (MATERIAL_WORDS[wn]) filters.material = filters.material ?? MATERIAL_WORDS[wn]
    else if (CHEAP_WORDS.has(wn)) filters.maxPrice = filters.maxPrice ?? CHEAP_CAP
    else if (LUXURY_WORDS.has(wn)) filters.minPrice = LUXURY_FLOOR
    else if (SALE_WORDS.has(wn)) filters.sale = true
    else if (!STOP.has(w) && !/^\d+$/.test(w) && w !== 'family') leftover.push(w)
  }
  if (filters.notColors) filters.colors = filters.colors.filter((c) => !filters.notColors!.includes(c))

  const raws = raw.toLowerCase()
  const structured = !!(filters.family || filters.category || filters.colors.length || filters.maxPrice || filters.minPrice || filters.hardware || filters.needs.length || filters.size || filters.material || filters.sale || filters.notColors)
  let kind: QueryKind
  if (QUESTION_TRIGGERS.test(raws.trim())) kind = 'question'
  else if (VAGUE_TRIGGERS.test(raws) && !(filters.family || filters.category)) kind = 'vague'
  else if (filters.family || filters.category) kind = 'product'
  else if (filters.occasions.length && !structured) kind = 'occasion'
  else if (structured || filters.occasions.length) kind = 'attribute'
  else kind = leftover.length >= 2 ? 'vague' : 'attribute'
  return { filters, kind, leftover, words: raw.trim().split(/\s+/), fixes }
}

export const emptyF = emptyFilters
