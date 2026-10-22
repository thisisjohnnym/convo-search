import { useCallback, useEffect, useRef, useState } from 'react'
import { morph } from '../motion/morph'
import type { App } from '../state/useApp'
import { telemetry } from '../telemetry'
import { scenes, type Ctx } from './scenes'

/** Runs scenes against the real app, with a hand-off caption at the end. */
export function useScenes(app: App) {
  const appRef = useRef(app)
  appRef.current = app
  const run = useRef(0)
  const [sheet, setSheet] = useState(false)
  const [caption, setCaption] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  const stop = useCallback(() => { telemetry.mute(false); run.current++; timers.current.forEach(clearTimeout); timers.current = [] }, [])
  useEffect(() => stop, [stop])

  const play = useCallback(async (id: string) => {
    const scene = scenes.find((s) => s.id === id)
    if (!scene) return
    stop()
    telemetry.mute(true) // scripted typing is the presenter's, not the tester's
    const my = run.current
    const cancelled = () => run.current !== my
    setSheet(false)
    setCaption(null)
    const wait = (ms: number) => new Promise<void>((r) => timers.current.push(window.setTimeout(r, ms)))
    const ctx: Ctx = {
      app: () => appRef.current,
      cancelled,
      wait,
      say: (t) => setCaption(t),
      openSearch: async () => {
        appRef.current.reset()
        await wait(450)
        if (cancelled()) return
        const el = document.getElementById('plp-search')
        morph.source = el
        appRef.current.openSearch(el ?? undefined)
        await wait(900)
      },
      type: async (text, o) => {
        if (o?.clear) { appRef.current.setTyped(''); await wait(350) }
        for (let i = 1; i <= text.length && !cancelled(); i++) {
          appRef.current.setTyped(text.slice(0, i))
          await wait(70 + Math.random() * 60)
        }
        await wait(450)
      },
      tapSuggestion: async (index) => {
        const s = appRef.current.view.suggestions[index]
        if (s && !cancelled()) appRef.current.tapSuggestion(s)
        await wait(500)
      },
    }
    await scene.play(ctx)
    if (!cancelled()) {
      setCaption(scene.handoff)
      timers.current.push(window.setTimeout(() => setCaption(null), 7000))
    }
  }, [stop])

  // any real touch hands control back: stop the scene and clear the caption
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('[data-scene-ui]')) return
      stop(); setCaption(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [stop])

  return { sheet, setSheet, caption, play, stop, reset: () => { stop(); setCaption(null); setSheet(false); appRef.current.reset() } }
}
