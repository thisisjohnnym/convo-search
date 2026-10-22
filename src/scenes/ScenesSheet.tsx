import { useState, useSyncExternalStore } from 'react'
import { Presence } from '../motion/Presence'
import { telemetry } from '../telemetry'
import { scenes } from './scenes'

/** Tester log controls: new tester, a free-text note, and getting the log off the phone. */
function LogPanel() {
  const n = useSyncExternalStore(telemetry.subscribe, telemetry.count)
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState('')
  const flash = (t: string) => { setStatus(t); window.setTimeout(() => setStatus(''), 2200) }
  const share = async () => {
    const text = telemetry.json()
    try {
      const file = new File([text], `coach-log-${telemetry.sid()}.json`, { type: 'application/json' })
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Coach test log' }); return }
      if (navigator.share) { await navigator.share({ title: 'Coach test log', text }); return }
      await navigator.clipboard.writeText(text); flash('Copied to clipboard')
    } catch { try { await navigator.clipboard.writeText(text); flash('Copied to clipboard') } catch { flash('Could not share. Use Download.') } }
  }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([telemetry.json()], { type: 'application/json' }))
    a.download = `coach-log-${telemetry.sid()}.json`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'var(--grey-bg)', fontSize: 13 } as const
  return (
    <div data-enter style={{ borderTop: '1px solid var(--divider)', marginTop: 8, paddingTop: 16 }}>
      <div style={{ fontSize: 16 }}>Tester log</div>
      <div className="label" style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 12px' }}>{n} events on this phone · session {telemetry.sid()}. Stays here until you export it.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Note or tester name" style={{ flex: 1, fontSize: 16, background: 'var(--grey-bg)', padding: '10px 12px' }} />
        <button data-press className="label" style={btn} onClick={() => { if (label.trim()) { telemetry.note(label.trim()); setLabel(''); flash('Note saved') } }}>Add note</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button data-press className="label" style={btn} onClick={() => { telemetry.newSession(label.trim() || undefined); setLabel(''); flash('New tester started') }}><span className="icon" style={{ fontSize: 18 }}>person_add</span>New tester</button>
        <button data-press className="label" style={btn} onClick={share}><span className="icon" style={{ fontSize: 18 }}>ios_share</span>Share log</button>
        <button data-press className="label" style={btn} onClick={download}><span className="icon" style={{ fontSize: 18 }}>download</span>Download</button>
        <button data-press className="label" style={btn} onClick={() => { if (window.confirm('Delete all logged events on this phone?')) { telemetry.clear(); flash('Cleared') } }}><span className="icon" style={{ fontSize: 18 }}>delete</span>Clear</button>
      </div>
      <div className="label" style={{ fontSize: 12, color: 'var(--muted)', minHeight: 16, marginTop: 10 }}>{status}</div>
    </div>
  )
}

/** Presenter sheet: pick a scene and it plays itself, then hands over to you. */
export function ScenesSheet({ open, onClose, onPlay, onReset }: { open: boolean; onClose: () => void; onPlay: (id: string) => void; onReset: () => void }) {
  return (
    <Presence show={open} size="base" mode="children" style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: open ? 'auto' : 'none' }}>
      <div data-enter onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)' }} />
      <div data-enter style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', padding: '20px 16px calc(16px + var(--safe-bottom))', maxHeight: '82%', overflowY: 'auto' }}>
        <div data-enter style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, lineHeight: 1.1 }}>Demo scenes</div>
            <div className="label" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Each one plays itself, then hands over to you.</div>
          </div>
          <button data-press onClick={onClose} aria-label="Close"><span className="icon" style={{ fontSize: 22 }}>close</span></button>
        </div>
        {scenes.map((s, i) => (
          <button key={s.id} data-enter data-press onClick={() => onPlay(s.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', padding: '14px 0', borderTop: '1px solid var(--divider)' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 16 }}>{i + 1}. {s.title}</span>
              <span className="label" style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.3 }}>{s.blurb}</span>
            </span>
            <span className="icon" style={{ fontSize: 22 }}>play_arrow</span>
          </button>
        ))}
        <button data-enter data-press className="label" onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 4px', borderTop: '1px solid var(--divider)', width: '100%', fontSize: 13 }}>
          <span className="icon" style={{ fontSize: 18 }}>restart_alt</span>Reset to the start
        </button>
        <LogPanel />
      </div>
    </Presence>
  )
}
