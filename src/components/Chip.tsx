import type { ReactNode } from 'react'

type Props = { label: string; onClick?: () => void; onRemove?: () => void; icon?: ReactNode; dark?: boolean; dashed?: boolean; size?: 'md' | 'sm' }

/** Square outlined pill from the Paper file. `onRemove` shows the ×. */
export function Chip({ label, onClick, onRemove, dark, dashed, size = 'md', icon }: Props) {
  const fs = size === 'sm' ? 13 : 16
  return (
    <span
      data-press
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={size === 'sm' ? 'label' : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: size === 'sm' ? '6px 8px' : 8, fontSize: fs, lineHeight: 1, whiteSpace: 'nowrap',
        background: dark ? '#000' : '#fff', color: dark ? '#fff' : '#000', cursor: 'pointer',
        outline: dashed ? '1px dashed #000' : `1px solid ${dark ? '#000' : 'var(--outline)'}`,
        fontFamily: size === 'md' ? 'var(--font-body)' : undefined,
      }}
    >
      {icon}
      {label}
      {onRemove ? (
        <span className="icon" aria-label={`Remove ${label}`} onClick={(e) => { e.stopPropagation(); onRemove() }} style={{ fontSize: 16, padding: 2, margin: -2 }}>close</span>
      ) : null}
    </span>
  )
}
