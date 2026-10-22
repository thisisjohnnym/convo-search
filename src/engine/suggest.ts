import { catalog } from '../data/catalog'
import { ADJACENT, CATEGORY_LABEL, COLOR_MATCH, COLOR_WORDS, MATERIAL_LABEL, NEED_LABEL, OCCASION_LABEL, OCCASION_REL, SHADE_LABEL, SIZE_LABEL } from './lexicon'
import { mergeFilters, parseQuery } from './parse'
import { count, describe, hasNeed, search } from './search'
import type { Chip, Filters, Product } from './types'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

export const countOf = (f: Filters) => count(search(f))

/** Build the chip list that represents a Filters object (chips are the source of truth in the UI). */
export function chipsFromFilters(f: Filters): Chip[] {
  const out: Chip[] = []
  if (f.family) out.push({ id: `family:${f.family}`, kind: 'family', label: `${f.family} family`, apply: { family: f.family } })
  if (f.category) out.push({ id: `cat:${f.category}`, kind: 'category', label: CATEGORY_LABEL[f.category], apply: { category: f.category } })
  for (const c of f.colors) out.push({ id: `color:${c}`, kind: 'color', label: c, apply: { colors: [c] } })
  for (const o of f.occasions) out.push({ id: `occ:${o}`, kind: 'occasion', label: o === 'wedding' ? 'for a wedding' : `for ${o}`, apply: { occasions: [o] } })
  if (f.hardware) out.push({ id: `hw:${f.hardware}`, kind: 'hardware', label: `${f.hardware} hardware`, apply: { hardware: f.hardware } })
  if (f.maxPrice) out.push({ id: `price:${f.maxPrice}`, kind: 'price', label: `under $${f.maxPrice}`, apply: { maxPrice: f.maxPrice } })
  if (f.minPrice) out.push({ id: `minprice:${f.minPrice}`, kind: 'price', label: `$${f.minPrice}+`, apply: { minPrice: f.minPrice } })
  if (f.size) out.push({ id: `size:${f.size}`, kind: 'size', label: SIZE_LABEL[f.size], apply: { size: f.size } })
  if (f.material) out.push({ id: `mat:${f.material}`, kind: 'material', label: MATERIAL_LABEL[f.material], apply: { material: f.material } })
  if (f.sale) out.push({ id: 'sale', kind: 'sale', label: 'on sale', apply: { sale: true } })
  for (const c of f.notColors ?? []) out.push({ id: `not:${c}`, kind: 'exclude', label: `not ${c}`, apply: { notColors: [c] } })
  for (const n of f.needs) {
    out.push({
      id: `need:${n}`, kind: n === 'laptop' ? 'laptop' : 'need',
      label: n === 'laptop' ? `fits ${f.laptop ?? 13}in laptop` : NEED_LABEL[n].toLowerCase(),
      apply: n === 'laptop' ? { needs: ['laptop'], laptop: f.laptop ?? 13 } : { needs: [n] },
    })
  }
  return out
}

/** Merge a chip's effect into filters. */
export function applyChip(f: Filters, chip: Chip): Filters {
  return mergeFilters(clone(f), { colors: [], occasions: [], needs: [], ...chip.apply })
}

export function removeChip(f: Filters, chip: Chip): Filters {
  const g = clone(f)
  const a = chip.apply
  if (a.family) g.family = undefined
  if (a.category) g.category = undefined
  if (a.colors) g.colors = g.colors.filter((c) => !a.colors!.includes(c))
  if (a.occasions) g.occasions = g.occasions.filter((o) => !a.occasions!.includes(o))
  if (a.hardware) g.hardware = undefined
  if (a.maxPrice) g.maxPrice = undefined
  if (a.minPrice) g.minPrice = undefined
  if (a.size) g.size = undefined
  if (a.material) g.material = undefined
  if (a.sale) g.sale = undefined
  if (a.notColors) { g.notColors = (g.notColors ?? []).filter((c) => !a.notColors!.includes(c)); if (!g.notColors.length) g.notColors = undefined }
  if (a.needs) { g.needs = g.needs.filter((n) => !a.needs!.includes(n)); if (a.needs.includes('laptop')) g.laptop = undefined }
  return g
}

/**
 * Next-step chips: only attributes that still exist in the current results and actually split them
 * (a chip that keeps everything, or nothing, is useless). Best splits first, one per kind.
 */
export function nextChips(f: Filters, limit = 3): Chip[] {
  const results = search(f)
  if (results.length < 2) return []
  const total = results.length
  const cands: { chip: Chip; kept: number }[] = []
  const add = (chip: Chip, test: (p: Product) => boolean) => {
    const kept = results.filter(test).length
    if (kept > 0 && kept < total) cands.push({ chip, kept })
  }
  if (!f.needs.includes('laptop')) {
    for (const size of [13, 15, 16] as const) {
      const kept = results.filter((p) => hasNeed(p, 'laptop', size)).length
      if (kept > 0 && kept < total) { add({ id: 'need:laptop', kind: 'laptop', label: 'fits laptop', apply: { needs: ['laptop'], laptop: size } }, (p) => hasNeed(p, 'laptop', size)); break }
    }
  }
  if (!f.needs.includes('topHandle')) add({ id: 'need:topHandle', kind: 'need', label: 'top handle', apply: { needs: ['topHandle'] } }, (p) => p.topHandle)
  if (!f.needs.includes('lunch')) add({ id: 'need:lunch', kind: 'need', label: 'room for lunch', apply: { needs: ['lunch'] } }, (p) => p.lunch)
  if (!f.hardware) {
    add({ id: 'hw:gold', kind: 'hardware', label: 'gold hardware', apply: { hardware: 'gold' } }, (p) => p.hardware === 'gold')
  }
  if (!f.maxPrice) {
    const prices = results.map((p) => p.price).sort((a, b) => a - b)
    const mid = prices[Math.floor(prices.length / 2)]
    const tier = Math.ceil((mid + 1) / 100) * 100
    add({ id: `price:${tier}`, kind: 'price', label: `under $${tier}`, apply: { maxPrice: tier } }, (p) => p.price <= tier)
  }
  if (!f.colors.length) {
    const seen = new Set<string>()
    for (const p of results) for (const c of p.colors) if (!seen.has(c) && ['black', 'brown', 'tan', 'white', 'green', 'red', 'blue'].includes(c)) seen.add(c)
    for (const c of seen) add({ id: `color:${c}`, kind: 'color', label: `in ${c}`, apply: { colors: [c] } }, (p) => p.colors.includes(c))
  }
  if (!f.occasions.length) add({ id: 'occ:work', kind: 'occasion', label: 'for work', apply: { occasions: ['work'] } }, (p) => p.occasions.includes('work'))
  if (!f.category && new Set(results.map((p) => p.category)).size > 1) {
    const cats = Array.from(new Set(results.map((p) => p.category)))
    for (const c of cats) add({ id: `cat:${c}`, kind: 'category', label: `${CATEGORY_LABEL[c]}s`, apply: { category: c } }, (p) => p.category === c)
  }
  // closest to a 50/50 split first, distinct kinds
  cands.sort((a, b) => Math.abs(a.kept / total - 0.5) - Math.abs(b.kept / total - 0.5))
  const used = new Set<string>()
  const out: Chip[] = []
  for (const c of cands) {
    if (used.has(c.chip.kind)) continue
    used.add(c.chip.kind)
    out.push(c.chip)
    if (out.length >= limit) break
  }
  return out
}

export type Suggestion = { text: string; filters: Filters; count: number }

/** "Are you looking for" rows: completions of what is typed, each with a real count. */
export function suggestions(typed: string, base: Filters, parsed: Filters, limit = 3): Suggestion[] {
  const t = typed.toLowerCase().trim()
  if (!t) return []
  const pool: { text: string; filters: Filters }[] = []
  const empty = (): Filters => ({ colors: [], occasions: [], needs: [] })
  const families = Array.from(new Set(catalog.filter((p) => p.category !== 'shoes').map((p) => p.family)))
  const cats = Array.from(new Set(catalog.filter((p) => p.category !== 'shoes').map((p) => p.category)))
  for (const fam of families) {
    pool.push({ text: `${fam} shoulder bag`, filters: { ...empty(), family: fam } })
    pool.push({ text: `${fam} bags`, filters: { ...empty(), family: fam } })
    for (const c of ['brown', 'black', 'tan', 'red', 'beige']) pool.push({ text: `${fam} bags in ${c}`, filters: { ...empty(), family: fam, colors: [c] } })
  }
  for (const c of cats) pool.push({ text: `${CATEGORY_LABEL[c]}s`, filters: { ...empty(), category: c } })
  for (const [o, label] of Object.entries(OCCASION_LABEL)) {
    const word = o === 'wedding' ? 'wedding' : o
    pool.push({ text: `bags for ${word}${o === 'wedding' ? 's' : ''}`, filters: { ...empty(), occasions: [o] } })
    pool.push({ text: `${word} guest bags`.replace('work guest', 'work').replace('wedding guest', 'wedding guest'), filters: { ...empty(), occasions: [o] } })
    void label
  }
  for (const c of ['black', 'brown', 'tan', 'white', 'green']) pool.push({ text: `${c} bags`, filters: { ...empty(), colors: [c] } })
  for (const w of ['birthday', 'anniversary', 'graduation', 'holiday']) pool.push({ text: `${w} gift bags`, filters: { ...empty(), occasions: ['gift'] } })
  pool.push({ text: 'night out bags', filters: { ...empty(), occasions: ['evening'] } }, { text: 'date night bags', filters: { ...empty(), occasions: ['evening'] } }, { text: 'school bags', filters: { ...empty(), occasions: ['work'] } }, { text: 'honeymoon bags', filters: { ...empty(), occasions: ['travel'] } })
  pool.push({ text: 'bags under $200', filters: { ...empty(), maxPrice: 200 } }, { text: 'bags that fit a 16in laptop', filters: { ...empty(), needs: ['laptop'], laptop: 16 } })

  const merged = (f: Filters): Filters => mergeFilters(clone(base), f)
  void parsed
  const seen = new Set<string>()
  const out: Suggestion[] = []
  const starts = pool.filter((s) => s.text.startsWith(t))
  const contains = pool.filter((s) => !s.text.startsWith(t) && s.text.split(' ').some((w) => w.startsWith(t.split(' ').pop() ?? '')))
  for (const s of [...starts, ...contains]) {
    if (seen.has(s.text)) continue
    const n = countOf(merged(s.filters))
    if (n === 0) continue
    seen.add(s.text)
    out.push({ text: s.text, filters: merged(s.filters), count: n })
    if (out.length >= limit) break
  }
  return out
}

export type Completion = { id: string; label: string; /** text the unfinished last word is replaced with */ text: string; count: number }

const TERMS: string[] = (() => {
  const fams = Array.from(new Set(catalog.filter((p) => p.category !== 'shoes' && p.family !== 'tote' && p.family !== 'hobo').map((p) => p.family)))
  const colors = Object.keys(COLOR_WORDS).filter((w) => COLOR_WORDS[w] === w && (COLOR_MATCH[w]?.length ?? 1) > 0)
  return [
    ...fams, ...colors,
    'birthday', 'anniversary', 'graduation', 'holiday', 'night out', 'date night', 'honeymoon', 'school', 'for work', 'for a wedding', 'for evening', 'for the weekend', 'for travel', 'for a gift', 'for everyday',
    'tote', 'crossbody', 'hobo', 'shoulder bag', 'bucket bag', 'sandals',
    'small', 'mini', 'large', 'leather', 'canvas', 'on sale', 'luxury',
    'fits laptop', 'room for lunch', 'top handle', 'organized', 'comfortable',
    'gold hardware', 'silver hardware', 'under $200', 'under $300', 'under $400',
  ]
})()

/**
 * Live autocomplete for the pills above the input: while the last word is unfinished
 * ("bl", "tab", "wor"), offer the words/phrases it could become, ranked by prefix then by
 * how many bags they leave. Returns [] when the last word is complete or nothing fits, so the
 * caller can fall back to next-step chips.
 */
export function completions(typed: string, base: Filters, limit = 4): Completion[] {
  if (!typed || /\s$/.test(typed)) return []
  const m = typed.match(/^(.*?)([^\s]+)$/)
  if (!m) return []
  const head = m[1]
  const tok = m[2].toLowerCase()
  if (TERMS.includes(tok)) return []
  const headF = applyChip(base, { id: 'head', kind: 'need', label: '', apply: parseQuery(head).filters })
  const before = JSON.stringify(headF)
  const scored: (Completion & { rank: number })[] = []
  for (const term of TERMS) {
    const words = term.split(' ')
    const idx = words.findIndex((w) => w.startsWith(tok))
    if (idx < 0) continue
    const f = applyChip(headF, { id: term, kind: 'need', label: '', apply: parseQuery(term).filters })
    if (JSON.stringify(f) === before) continue
    const n = countOf(f)
    if (n === 0) continue
    scored.push({ id: term, label: term, text: term, count: n, rank: idx })
  }
  scored.sort((a, b) => a.rank - b.rank || b.count - a.count)
  return scored.slice(0, limit).map(({ rank, ...c }) => (void rank, c))
}

type Theme = { title: string; pick: (p: Product) => boolean; sort?: (a: Product, b: Product) => number }
const NEUTRAL = ['black', 'brown', 'tan', 'beige']
const bold = (p: Product) => p.colors.some((c) => !NEUTRAL.includes(c))
const neutral = (p: Product) => p.colors.some((c) => NEUTRAL.includes(c))
const cheap = (n: number) => (p: Product) => p.price <= n
const bySkus = (a: Product, b: Product) => b.skus - a.skus

/** Distinct angles on one occasion, so a single query shows different kinds of answers. */
const THEMES: Record<string, Theme[]> = {
  gift: [
    { title: 'Little treats under $250', pick: (p) => p.price <= 250 && p.size !== 'large', sort: (a, b) => a.price - b.price },
    { title: 'Statement colors that stand out', pick: bold },
    { title: 'Classics that never miss', pick: (p) => neutral(p) && p.material.includes('leather'), sort: bySkus },
    { title: 'Go all out', pick: (p) => p.price >= 289 || p.hardware === 'gold', sort: (a, b) => b.price - a.price },
  ],
  wedding: [
    { title: 'Light and elegant', pick: (p) => p.colors.some((c) => ['white', 'cream', 'mint', 'floral', 'beige'].includes(c)) },
    { title: 'Small enough for the dance floor', pick: (p) => p.size === 'mini' || p.size === 'small', sort: (a, b) => a.price - b.price },
    { title: 'Guest-list friendly, under $250', pick: cheap(250) },
  ],
  work: [
    { title: 'Fits the laptop', pick: (p) => p.laptop > 0, sort: (a, b) => b.laptop - a.laptop },
    { title: 'Polished and professional', pick: (p) => neutral(p) && p.size !== 'large' && p.material.includes('leather') },
    { title: 'Organized for the commute', pick: (p) => p.organized && p.comfy },
  ],
  evening: [
    { title: 'Small and dressy', pick: (p) => p.size === 'mini' || p.size === 'small' },
    { title: 'Black and gold after dark', pick: (p) => p.colors.includes('black') && p.hardware === 'gold' },
    { title: 'Statement colors', pick: bold },
  ],
  weekend: [
    { title: 'Easy and casual', pick: (p) => p.comfy && p.size !== 'mini', sort: bySkus },
    { title: 'Fresh colors', pick: bold },
    { title: 'Under $250', pick: cheap(250) },
  ],
  travel: [
    { title: 'Room for everything', pick: (p) => p.size === 'large' || p.lunch },
    { title: 'Hands-free', pick: (p) => p.category === 'crossbody' || p.size === 'mini' || p.comfy, sort: (a, b) => a.price - b.price },
    { title: 'Lighter picks under $300', pick: (p) => p.comfy && p.price < 300 },
  ],
  everyday: [
    { title: 'Neutrals that go with everything', pick: neutral, sort: bySkus },
    { title: 'Easy under $250', pick: cheap(250) },
    { title: 'Roomy carryalls', pick: (p) => p.size === 'large' || p.size === 'medium' },
  ],
}

/** Up to `limit` themed rails for an occasion query; items are spread across rails so each shows something new. */
export function themeRails(f: Filters, shown: Product[], limit = 3): { title: string; products: Product[] }[] {
  const occ = f.occasions[0]
  const themes = occ && !f.family ? THEMES[occ] : undefined
  if (!themes) return []
  const pool = search({ ...f, occasions: [] }).filter((p) => p.category !== 'shoes')
  const seen = new Set(shown.map((p) => p.id))
  const out: { title: string; products: Product[] }[] = []
  for (const t of themes) {
    const hits = pool.filter(t.pick)
    const fresh = hits.filter((p) => !seen.has(p.id))
    const list = (fresh.length >= 2 ? fresh : hits).slice().sort(t.sort ?? (() => 0)).slice(0, 6)
    if (list.length < 2) continue
    list.forEach((p) => seen.add(p.id))
    out.push({ title: t.title, products: list })
    if (out.length >= limit) break
  }
  return out
}

/** Rail title + order for a given state. */
export function railTitle(f: Filters, kind: string): string {
  if (f.needs.includes('laptop') && f.laptop) return `Bags that fit a ${f.laptop}in laptop`
  if (f.occasions.length === 1 && !f.family) return `Perfect for ${OCCASION_LABEL[f.occasions[0]]}`
  if (f.family && f.colors.length) return `${cap(f.colors[0])} ${cap(f.family)}s${f.occasions.length ? ` for ${f.occasions[0]}` : ''}`
  if (f.family) return `The ${cap(f.family)} Family`
  if (f.colors.length) return `${cap(f.colors[0])} bags`
  if (f.category) return `${cap(CATEGORY_LABEL[f.category])}s`
  if (f.maxPrice) return `Bags under $${f.maxPrice}`
  if (f.sale) return 'On sale'
  if (f.size) return `${cap(SIZE_LABEL[f.size])} bags`
  if (f.material) return `${cap(MATERIAL_LABEL[f.material])} bags`
  if (f.minPrice) return 'Worth the splurge'
  if (f.notColors?.length) return `Anything but ${f.notColors[0]}`
  if (f.hardware) return `${cap(f.hardware)} hardware`
  if (f.needs.includes('lunch')) return 'Room for lunch'
  if (f.needs.includes('organized')) return 'Keeps things organized'
  if (f.needs.includes('comfy')) return 'Comfortable to carry'
  if (kind === 'vague') return 'Our picks to start with'
  return 'Top picks'
}
export const describeFilters = describe

const colorHit = (p: Product, c: string) => (COLOR_MATCH[c] ?? [c]).some((m) => p.colors.includes(m))

/**
 * Usage-intent queries (laptop, lunch, comfort...) get a second rail about the same
 * part of the day, built from bags the first rail does not already show.
 */
function usageRail(f: Filters, pool: Product[]): { title: string; list: Product[] } {
  const byFit = (a: Product, b: Product) => Number(b.organized) - Number(a.organized) + (Number(b.comfy) - Number(a.comfy)) * 0.5
  const need = f.needs[0]
  if (need === 'laptop') return { title: 'Lighter picks for the workday', list: pool.filter((p) => p.occasions.includes('work')).sort(byFit) }
  if (need === 'lunch') return { title: 'Easy to carry all day', list: pool.filter((p) => p.comfy && p.size !== 'mini').sort((a, b) => Number(b.size === 'large') - Number(a.size === 'large')) }
  if (need === 'organized') return { title: 'Great for the commute', list: pool.filter((p) => p.occasions.includes('work') || p.occasions.includes('travel')).sort(byFit) }
  if (need === 'topHandle') return { title: 'Carry it by hand or on your shoulder', list: pool.filter((p) => p.comfy && p.size !== 'mini') }
  return { title: 'Roomy enough for a full day', list: pool.filter((p) => p.lunch || p.size === 'large') }
}

/**
 * The second rail. Its title and content always follow what was searched:
 * color -> nearby shades, family -> similar styles, occasion -> a related occasion,
 * price -> just above budget, laptop -> smaller bags, hardware -> the other finish.
 */
export function alsoRail(f: Filters, results: Product[]): { title: string; products: Product[] } | null {
  const ids = new Set(results.map((p) => p.id))
  const pool = catalog.filter((p) => p.category !== 'shoes' && !ids.has(p.id))
  const known = f.colors.filter((c) => (COLOR_MATCH[c]?.length ?? 1) > 0)
  let title = ''
  let list: Product[] = []

  if (f.family && known.length) {
    title = `More in ${known[0]}`
    list = pool.filter((p) => known.some((c) => colorHit(p, c)))
  } else if (f.family) {
    const anchor = results[0]
    title = `Similar to the ${cap(f.family)}`
    list = pool.filter((p) => !anchor || p.category === anchor.category).sort((a, b) => Math.abs(a.price - (anchor?.price ?? 0)) - Math.abs(b.price - (anchor?.price ?? 0)))
  } else if (known.length) {
    const adj = Array.from(new Set(known.flatMap((c) => ADJACENT[c] ?? [])))
    const label = adj.slice(0, 2).map((c) => SHADE_LABEL[c] ?? c)
    title = `Also in ${label.join(' and ')}`
    list = pool.filter((p) => adj.some((c) => colorHit(p, c)))
  } else if (f.occasions.length) {
    const rel = OCCASION_REL[f.occasions[0]]
    if (rel) { title = `Also great for ${OCCASION_LABEL[rel]}`; list = pool.filter((p) => p.occasions.includes(rel)) }
  } else if (f.maxPrice) {
    title = `A little more, up to $${f.maxPrice + 100}`
    list = pool.filter((p) => p.price > f.maxPrice! && p.price <= f.maxPrice! + 100)
  } else if (f.needs.length) {
    const u = usageRail(f, pool)
    title = u.title
    list = u.list
  } else if (f.category) {
    title = `Not a ${CATEGORY_LABEL[f.category]}? Try these`
    list = pool.filter((p) => p.category !== f.category)
  } else if (f.hardware) {
    const other = f.hardware === 'gold' ? 'silver' : 'gold'
    title = `Also in ${other} hardware`
    list = pool.filter((p) => p.hardware === other)
  } else {
    title = 'You may also like'
    list = pool
  }
  const products = list.slice(0, 6)
  return products.length ? { title, products } : null
}
