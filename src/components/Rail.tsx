import type { Product } from '../engine/types'
import { AnimatedList } from '../motion/AnimatedList'
import { Roll, SwapText } from './Text'

export type RailItem = { product: Product; why?: string }

export function Card({ item, onTap }: { item: RailItem; onTap?: () => void }) {
  const { product: p, why } = item
  return (
    <button data-press onClick={onTap} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 117, textAlign: 'left' }}>
      <img src={`/products/${p.img}`} alt={p.name} draggable={false} style={{ width: 117, height: 165, objectFit: 'cover', background: '#efefef', display: 'block' }} />
      <span style={{ fontSize: 14, lineHeight: 1.1 }}>{p.name}</span>
      <span style={{ fontSize: 14, lineHeight: 1 }}>
        {p.was ? <s style={{ color: 'var(--muted)', marginRight: 6 }}>${p.was}</s> : null}${p.price}
      </span>
      {why ? <span className="label" style={{ fontSize: 12, lineHeight: 1.2, color: 'var(--muted)' }}>{why}</span> : null}
    </button>
  )
}

/** Muted section title + optional live count, then a horizontally scrolling row of cards. */
export function Rail({ title, note, count, items, onTap, dataEnter = true }: { title: string; note?: string; count?: number; items: RailItem[]; onTap?: (p: Product) => void; dataEnter?: boolean }) {
  return (
    <section style={{ padding: '24px 8px 0' }}>
      <div data-enter={dataEnter ? '' : undefined} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <SwapText text={title} className="label" style={{ fontSize: 14, color: 'var(--muted)' }} />
        {count !== undefined ? <Roll value={count} suffix=" results" className="label" style={{ fontSize: 14 }} /> : null}
      </div>
      {note ? <SwapText text={note} className="label" style={{ display: 'block', fontSize: 13, lineHeight: 1.35, color: '#444', margin: '-4px 0 12px' }} /> : null}
      <AnimatedList
        items={items.map((it) => ({ key: it.product.id, node: <Card item={it} onTap={() => onTap?.(it.product)} /> }))}
        style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 } as React.CSSProperties}
        itemStyle={{ flexShrink: 0 }}
        size="base"
        animateInitial
        delay={0.1}
      />
    </section>
  )
}
