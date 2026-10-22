import { useEffect, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Plp } from './screens/Plp'
import { SearchOverlay } from './screens/SearchOverlay'
import { Results } from './screens/Results'
import { ScenesSheet } from './scenes/ScenesSheet'
import { useScenes } from './scenes/useScenes'
import { Presence } from './motion/Presence'
import { installPressFeedback } from './motion/press'
import { useApp } from './state/useApp'

function Pill({ show, text }: { show: boolean; text: string }) {
  const last = useRef(text)
  if (text) last.current = text
  return (
    <Presence show={show} size="small" mode="self" style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(96px + var(--safe-bottom))', zIndex: 30, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="label" style={{ background: '#000', color: '#fff', padding: '12px 16px', fontSize: 13, lineHeight: 1.35, textAlign: 'center', maxWidth: 340 }}>{last.current}</div>
    </Presence>
  )
}

export default function App() {
  const app = useApp()
  const scenes = useScenes(app)
  const [hint, setHint] = useState(false)
  useEffect(() => installPressFeedback(), [])

  // one-time nudge so testers can find the demo scenes
  useEffect(() => {
    let seen = false
    try { seen = localStorage.getItem('coach-scenes-hint') === '1' } catch { /* private mode */ }
    if (seen) return
    const a = window.setTimeout(() => setHint(true), 2600)
    const b = window.setTimeout(() => setHint(false), 8200)
    try { localStorage.setItem('coach-scenes-hint', '1') } catch { /* ignore */ }
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])

  // iOS: keep the layout above the on-screen keyboard (dvh does not shrink for it)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const set = () => document.documentElement.style.setProperty('--app-h', `${vv.height}px`)
    set()
    vv.addEventListener('resize', set)
    vv.addEventListener('scroll', set)
    return () => { vv.removeEventListener('resize', set); vv.removeEventListener('scroll', set) }
  }, [])

  return (
    <div className="stage">
      <div className="phone">
        <Header onLongPress={() => { setHint(false); scenes.setSheet(true) }} />
        {app.screen === 'plp' ? <Plp onOpenSearch={app.openSearch} /> : null}
        <Results app={app} show={app.screen === 'results'} />
        <SearchOverlay app={app} />
        <div data-scene-ui style={{ display: 'contents' }}>
          <ScenesSheet open={scenes.sheet} onClose={() => scenes.setSheet(false)} onPlay={scenes.play} onReset={scenes.reset} />
          <Pill show={!!scenes.caption} text={scenes.caption ?? ''} />
          <Pill show={hint && !scenes.caption && !scenes.sheet} text="Presenting? Press and hold the Coach logo for demo scenes." />
        </div>
      </div>
    </div>
  )
}
