import { useRef } from 'react'
import { CoachLogo, OutletLogo } from './Logos'

/** Dark brand bar from the Paper file (tabs + bag + menu/search). */
export function Header({ onLongPress }: { onLongPress?: () => void }) {
  const timer = useRef<number | undefined>(undefined)
  const down = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => onLongPress?.(), 550) }
  const up = () => window.clearTimeout(timer.current)
  return (
    <header onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none', userSelect: 'none', background: 'var(--header)', padding: 'calc(16px + var(--safe-top)) 16px 8px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32 }}>
        {/* bottom-aligned and bled into the header's 8px padding so the active tab meets the search field with no seam */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 40, alignSelf: 'flex-end', marginBottom: -8 }}>
          <div
            style={{
              background: 'var(--grey-bg)', borderRadius: '6px 6px 0 0', height: 40, padding: 16,
              display: 'flex', alignItems: 'center', marginRight: 15,
            }}
          >
            <CoachLogo />
          </div>
          <div style={{ height: 40, padding: 16, display: 'flex', alignItems: 'center', marginRight: 15 }}>
            <OutletLogo />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--grey-bg)' }}>
          <span className="icon" style={{ fontSize: 20 }}>shopping_bag</span>
          <span className="icon" style={{ fontSize: 22 }}>manage_search</span>
        </div>
      </div>
    </header>
  )
}
