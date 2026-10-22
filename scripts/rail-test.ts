import { computeView } from '../src/engine/session'
import { emptyF } from '../src/engine/parse'
for (const q of ['black', 'bla', 'yellow', 'pink bags', 'tabby', 'brown tabby', 'bags for a wedding', 'bags under $200', 'fits 16 inch laptop', 'totes', 'gold hardware', 'green']) {
  const v = computeView(emptyF(), q, { refinementsWithoutTap: 0 })
  console.log(`\n"${q}" -> ${v.title} (${v.total})${v.note ? ' | ' + v.note : ''}\n   main: ${v.rail.map(r => r.product.name.split(' ')[0]).join(', ')}\n   also: ${v.also ? v.also.title + ' -> ' + v.also.products.map(p => p.name.split(' ')[0]).join(', ') : '(none)'}`)
}
