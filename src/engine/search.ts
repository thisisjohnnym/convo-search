import { catalog } from '../data/catalog'
import { CATEGORY_LABEL, COLOR_MATCH, NEED_LABEL, OCCASION_LABEL, SIZE_MATCH } from './lexicon'
import type { Filters, Need, Product } from './types'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const hasNeed = (p: Product, n: Need, laptop?: number) => {
  if (n === 'laptop') return p.laptop >= (laptop ?? 13)
  if (n === 'lunch') return p.lunch
  if (n === 'comfy') return p.comfy
  if (n === 'organized') return p.organized
  return p.topHandle
}

const colorHit = (p: Product, c: string) => (COLOR_MATCH[c] ?? [c]).some((m) => p.colors.includes(m))

export function matches(p: Product, f: Filters): boolean {
  if (p.category === 'shoes' && f.category !== 'shoes') return false
  if (f.family && p.family !== f.family) return false
  if (f.category && p.category !== f.category) return false
  if (f.colors.length && !f.colors.some((c) => (COLOR_MATCH[c] ?? [c]).some((m) => p.colors.includes(m)))) return false
  if (f.occasions.length && !f.occasions.every((o) => p.occasions.includes(o))) return false
  if (f.maxPrice && p.price > f.maxPrice) return false
  if (f.minPrice && p.price < f.minPrice) return false
  if (f.size && !SIZE_MATCH[f.size].includes(p.size)) return false
  if (f.material && !p.material.includes(f.material)) return false
  if (f.sale && !p.was) return false
  if (f.notColors?.some((c) => colorHit(p, c))) return false
  if (f.hardware && p.hardware !== f.hardware) return false
  for (const n of f.needs) if (!hasNeed(p, n, f.laptop)) return false
  return true
}

export const count = (ps: Product[]) => ps.reduce((a, p) => a + p.skus, 0)

/** Ranked results (best first). Occasion fit and carrying needs lift a product. */
export function search(f: Filters): Product[] {
  const score = (p: Product) =>
    (f.family && p.family === f.family ? 3 : 0) +
    f.occasions.filter((o) => p.occasions.includes(o)).length * 2 +
    (p.laptop >= 15 ? 0.5 : 0) + p.skus * 0.01 - (f.maxPrice ? Math.abs(f.maxPrice - p.price) * 0.001 : 0)
  return catalog.filter((p) => matches(p, f)).sort((a, b) => score(b) - score(a))
}

export const isEmptyFilters = (f: Filters) =>
  !f.family && !f.category && !f.colors.length && !f.occasions.length && !f.maxPrice && !f.minPrice && !f.hardware && !f.needs.length && !f.size && !f.material && !f.sale && !f.notColors?.length

/** "red tabby shoulder bag with gold hardware under $200 for work" */
export function describe(f: Filters): string {
  const parts: string[] = []
  if (f.size) parts.push(f.size)
  parts.push(...f.colors)
  if (f.material) parts.push(f.material)
  if (f.family) parts.push(f.family)
  parts.push(f.category ? CATEGORY_LABEL[f.category] : 'bags')
  let s = parts.join(' ')
  if (f.notColors?.length) s += ` not ${f.notColors.join('/')}`
  if (f.sale) s += ' on sale'
  if (f.minPrice) s += ` from $${f.minPrice}`
  if (f.hardware) s += ` with ${f.hardware} hardware`
  if (f.maxPrice) s += ` under $${f.maxPrice}`
  if (f.occasions.length) s += ` for ${f.occasions.join(' + ')}`
  if (f.needs.length) s += ` · ${f.needs.map((n) => (n === 'laptop' ? `fits ${f.laptop ?? 13}in laptop` : NEED_LABEL[n].toLowerCase())).join(', ')}`
  return s
}

/** Which constraints can be dropped, and what each drop gives back (for rescue + relax pills). */
export type Relax = { key: string; label: string; filters: Filters; count: number }

type Drop = { key: string; label: (f: Filters) => string; active: (f: Filters) => boolean; apply: (g: Filters) => void }
const DROPS: Drop[] = [
  { key: 'hardware', label: (f) => `drop ${f.hardware} hardware`, active: (f) => !!f.hardware, apply: (g) => { g.hardware = undefined } },
  { key: 'price', label: () => 'any price', active: (f) => !!f.maxPrice, apply: (g) => { g.maxPrice = undefined } },
  { key: 'color', label: () => 'any color', active: (f) => f.colors.length > 0, apply: (g) => { g.colors = [] } },
  { key: 'family', label: (f) => `not just ${f.family}`, active: (f) => !!f.family, apply: (g) => { g.family = undefined } },
  { key: 'occasion', label: () => 'any occasion', active: (f) => f.occasions.length > 0, apply: (g) => { g.occasions = [] } },
  { key: 'category', label: () => 'any style', active: (f) => !!f.category, apply: (g) => { g.category = undefined } },
  { key: 'size', label: () => 'any size', active: (f) => !!f.size, apply: (g) => { g.size = undefined } },
  { key: 'material', label: () => 'any material', active: (f) => !!f.material, apply: (g) => { g.material = undefined } },
  { key: 'sale', label: () => 'not just sale', active: (f) => !!f.sale, apply: (g) => { g.sale = undefined } },
  { key: 'minPrice', label: () => 'any price', active: (f) => !!f.minPrice, apply: (g) => { g.minPrice = undefined } },
  { key: 'exclude', label: () => 'any color', active: (f) => !!f.notColors?.length, apply: (g) => { g.notColors = undefined } },
  { key: 'needs', label: () => 'skip the carrying needs', active: (f) => f.needs.length > 0, apply: (g) => { g.needs = []; g.laptop = undefined } },
]

export function relaxations(f: Filters): Relax[] {
  const out: Relax[] = []
  const seen = new Set<string>()
  const push = (key: string, label: string, g: Filters) => {
    const n = count(search(g))
    const sig = describe(g)
    if (n > 0 && !seen.has(sig)) { seen.add(sig); out.push({ key, label, filters: g, count: n }) }
  }
  const active = DROPS.filter((d) => d.active(f))
  // single drops first (a raised price cap reads better than "any price")
  for (const d of active) {
    const g: Filters = JSON.parse(JSON.stringify(f))
    d.apply(g)
    if (d.key === 'price') {
      const prices = search(g).map((p) => p.price).sort((a, b) => a - b)
      if (!prices.length) continue
      const tier = Math.ceil((prices[0] + 1) / 100) * 100
      g.maxPrice = tier
      push('price', `up to $${tier}`, g)
    } else push(d.key, d.label(f), g)
  }
  // then pairs, so dead ends always have a few realistic ways out
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const g: Filters = JSON.parse(JSON.stringify(f))
      active[i].apply(g); active[j].apply(g)
      push(`${active[i].key}+${active[j].key}`, `${active[i].label(f)}, ${active[j].label(f)}`, g)
    }
  }
  return out.sort((a, b) => a.key.split('+').length - b.key.split('+').length || b.count - a.count)
}

/** "Why this" tag for the top results. */
export function whyTag(p: Product, f: Filters): string | undefined {
  if (f.needs.includes('laptop') && hasNeed(p, 'laptop', f.laptop)) return `Fits a ${f.laptop ?? 13}in laptop`
  if (f.needs.includes('lunch') && p.lunch) return 'Room for lunch'
  if (f.needs.includes('organized') && p.organized) return 'Keeps things organized'
  if (f.occasions[0] && p.occasions[0] === f.occasions[0]) return `Great for ${OCCASION_LABEL[f.occasions[0]].replace(/^a /, '').toLowerCase()}`
  if (f.hardware) return `${cap(f.hardware)} hardware`
  if (f.maxPrice) return `Under $${f.maxPrice}`
  return p.note
}
