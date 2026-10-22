import { AnimatedList } from '../motion/AnimatedList'
import { byId } from '../data/catalog'
import { Roll } from './Text'
import type { Carousel } from '../engine/coach'

/** The candidates, shown in the chat itself: what Coach just did, as pictures, not a sentence. */
export function MsgCarousel({ c, onSee }: { c: Carousel; onSee?: () => void }) {
  const picks = c.ids.map((id) => byId[id]).filter(Boolean)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span className="label" style={{ fontSize: 13 }}><Roll value={c.count} /> {c.count === 1 ? 'style fits' : 'styles fit'}</span>
        {c.before && c.before !== c.count ? <span className="label" style={{ fontSize: 12, color: 'var(--muted)' }}>(was {c.before})</span> : null}
        {onSee ? <button data-press className="label" onClick={onSee} style={{ marginLeft: 'auto', fontSize: 13, textDecoration: 'underline' }}>See all {c.count}</button> : null}
      </div>
      {c.added.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          {c.added.map((a) => <span key={a} className="label" style={{ fontSize: 12, padding: '3px 8px', background: '#000', color: '#fff' }}>{a}</span>)}
        </div>
      ) : null}
      <AnimatedList
        items={picks.map((p) => ({
          key: p.id,
          node: (
            <div style={{ width: 84, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <img src={`/products/${p.img}`} alt={p.name} draggable={false} style={{ width: 84, height: 105, objectFit: 'cover', background: '#efefef', display: 'block' }} />
              <span style={{ fontSize: 12, lineHeight: 1.15 }}>{p.name.replace(/ (Shoulder )?Bag.*/, '')}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>${p.price}</span>
            </div>
          ),
        }))}
        style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 0 2px' } as React.CSSProperties}
        itemStyle={{ flexShrink: 0 }}
        size="small"
        animateInitial
        delay={0.15}
      />
    </div>
  )
}
