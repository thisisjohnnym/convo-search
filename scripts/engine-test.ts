import { computeView } from '../src/engine/session'
import { emptyF, parseQuery } from '../src/engine/parse'
import { applyChip, chipsFromFilters } from '../src/engine/suggest'

const show = (label: string, v: ReturnType<typeof computeView>) =>
  console.log(`\n# ${label}\n mode=${v.mode} kind=${v.kind} total=${v.total} title="${v.title}"\n chips=[${v.chips.map(c=>c.label)}]\n rail=${v.rail.map(r=>r.product.name+(r.why?` (${r.why})`:'')).join(' | ')}\n sug=${v.suggestions.map(s=>s.text+':'+s.count).join(' | ')}\n next=[${v.next.map(c=>c.label)}] relax=[${v.relax.map(r=>r.label+':'+r.count)}]`)

show('1 typing "ta"', computeView(emptyF(), 'ta', { refinementsWithoutTap: 0 }))
show('1b "tabby bags in br"', computeView(emptyF(), 'tabby bags in br', { refinementsWithoutTap: 0 }))
show('2 "bags for a wedding"', computeView(emptyF(), 'bags for a wedding', { refinementsWithoutTap: 0 }))
show('3 red tabby gold hardware under $200', computeView(emptyF(), 'red tabby gold hardware under $200', { refinementsWithoutTap: 0 }))
show("4 something for my sister's wedding", computeView(emptyF(), "something for my sister's wedding", { refinementsWithoutTap: 0 }))
let f = emptyF(); f = parseQuery('tabby').filters
show('5a tabby chip', computeView(f, '', { refinementsWithoutTap: 0 }))
f = parseQuery('tabby brown for work').filters
show('5b tabby+brown+work stalled', computeView(f, '', { refinementsWithoutTap: 2 }))
const lap = chipsFromFilters(parseQuery('fits 16 inch laptop').filters)[0]
show('5c + laptop 16', computeView(applyChip(f, lap), '', { refinementsWithoutTap: 0 }))
console.log(parseQuery('what fits a 16 inch laptop?'))
