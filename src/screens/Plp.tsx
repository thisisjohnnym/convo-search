import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { enter } from '../motion/animate'
import { catalog } from '../data/catalog'

const plpOrder = ['p19', 'p20', 'p21', 'p18', 'p16', 'p13', 'p14', 'p15', 'p17', 'p01', 'p02', 'p03', 'p04', 'p06', 'p07', 'p08', 'p09', 'p10', 'p11', 'p12']
const home = plpOrder.map((id) => catalog.find((p) => p.id === id)!)

export function Plp({ onOpenSearch }: { onOpenSearch: (source: HTMLElement) => void }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      // Choreography: search row -> title -> tabs -> filter row -> tiles (top to bottom)
      const tl = gsap.timeline()
      tl.add(enter('[data-enter="chrome"]'))
      tl.add(enter('[data-enter="tile"]', { stagger: 0.07 }), '<0.12')
    },
    { scope: root },
  )

  return (
    <div ref={root} className="scroll" style={{ flex: 1, background: 'var(--grey-bg)' }}>
      <button
        id="plp-search" data-enter="chrome" onClick={(e) => onOpenSearch(e.currentTarget)}
        style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: '#fff', padding: '16px 16px', fontSize: 16 }}
      >
        <span data-morph-icon className="icon" style={{ fontSize: 22 }}>search</span>
        <span data-morph-text className="label">Search anything</span>
      </button>

      <div data-enter="chrome" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '28px 12px 12px' }}>
        <h1 className="label" style={{ fontSize: 16, fontWeight: 500 }}>Handbags for Women</h1>
        <span className="label" style={{ fontSize: 14 }}>178 Products</span>
      </div>

      <div data-enter="chrome" className="label" style={{ display: 'flex', gap: 18, padding: '12px', fontSize: 12, borderBottom: '1px solid rgba(0,0,0,.1)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {['New', 'Shoulder Bags', 'Totes', 'Crossbody Bags', 'Top Handles & Carryalls'].map((t) => <span key={t}>{t}</span>)}
      </div>

      <div data-enter="chrome" style={{ padding: '16px 12px' }}>
        <span data-press className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 130, padding: '10px 16px', fontSize: 13 }}>
          <span className="icon" style={{ fontSize: 18 }}>tune</span>Filter / Sort
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {home.map((p) => (
          <div key={p.id} data-enter="tile" data-press style={{ paddingBottom: 24, textAlign: 'center' }}>
            <img src={`/products/${p.img}`} alt={p.name} loading="lazy" style={{ width: '100%', aspectRatio: '220/275', objectFit: 'cover', background: '#efefef', display: 'block' }} />
            <div style={{ padding: '16px 12px 4px', fontSize: 16 }}>{p.name}</div>
            <div className="label" style={{ fontSize: 12 }}>${p.price}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
