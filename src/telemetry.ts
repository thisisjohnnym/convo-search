/**
 * Tester log. Everything stays on the phone (localStorage) until the presenter exports it from the
 * hidden sheet (press and hold the Coach logo). Nothing is sent anywhere unless VITE_LOG_ENDPOINT is set at build time.
 */
export type LogEvent = { t: number; sid: string; type: string; d?: Record<string, unknown> }

const KEY = 'coach-log-v1'
const MAX = 3000
const endpoint = import.meta.env.VITE_LOG_ENDPOINT as string | undefined

const rid = () => Math.random().toString(36).slice(2, 8)
let sid = rid()
let events: LogEvent[] = []
let muted = false // scripted demo scenes type for the presenter; those taps are not the tester's
let pending: LogEvent[] = []
const subs = new Set<() => void>()

try { events = JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { events = [] }

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX))) } catch { /* private mode or full */ } }
const emit = () => subs.forEach((f) => f())

export const telemetry = {
  sid: () => sid,
  count: () => events.length,
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
  mute(on: boolean) { muted = on },
  log(type: string, d?: Record<string, unknown>) {
    if (muted) return
    const e: LogEvent = { t: Date.now(), sid, type, d }
    events.push(e)
    if (events.length > MAX) events = events.slice(-MAX)
    save(); emit()
    if (endpoint) pending.push(e)
  },
  /** A new person is about to try it: same device, new session id. */
  newSession(label?: string) {
    sid = rid()
    this.log('session_start', { label, ...device() })
  },
  note(text: string) { this.log('note', { text }) },
  clear() { events = []; save(); emit() },
  json() { return JSON.stringify({ exportedAt: new Date().toISOString(), device: device(), summary: summarize(events), events }, null, 2) },
}

function device() {
  return { ua: navigator.userAgent, vw: window.innerWidth, vh: window.innerHeight, dpr: window.devicePixelRatio, lang: navigator.language }
}

/** Per-session counts that answer "did it work?" at a glance. */
function summarize(list: LogEvent[]) {
  const out: Record<string, Record<string, number>> = {}
  for (const e of list) {
    const s = (out[e.sid] ??= {})
    s[e.type] = (s[e.type] ?? 0) + 1
    if (e.type === 'query' && e.d) {
      if (e.d.lost) s.queries_not_understood = (s.queries_not_understood ?? 0) + 1
      if (e.d.mode === 'zero') s.queries_zero_results = (s.queries_zero_results ?? 0) + 1
    }
    if (e.type === 'coach_say' && e.d?.outcome === 'miss') s.coach_misses = (s.coach_misses ?? 0) + 1
  }
  return out
}

if (endpoint) {
  const flush = () => {
    if (!pending.length) return
    const body = JSON.stringify(pending)
    pending = []
    try { navigator.sendBeacon(endpoint, body) } catch { /* ignore */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  window.addEventListener('pagehide', flush)
}

telemetry.log('session_start', { ...device(), first: true })
