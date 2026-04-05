import { motion, AnimatePresence } from 'framer-motion'
import type { SeriesEditScope } from '../../types'

interface Props {
  open: boolean
  mode: 'edit' | 'delete'
  onSelect: (scope: SeriesEditScope) => void
  onCancel: () => void
}

const OPTIONS: { value: SeriesEditScope; label: string; hint: string }[] = [
  {
    value: 'only_this',
    label: 'Nur diesen Termin',
    hint: 'Nur dieser eine Tag wird geändert.',
  },
  {
    value: 'this_and_following',
    label: 'Diesen und alle folgenden',
    hint: 'Dieser und alle nachfolgenden Termine der Serie werden geändert.',
  },
  {
    value: 'all',
    label: 'Alle Termine der Serie',
    hint: 'Die gesamte Serie wird geändert.',
  },
]

export default function SeriesScopeDialog({ open, mode, onSelect, onCancel }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 300,
            }}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(22rem, calc(100vw - 2rem))',
              background: 'var(--bg-card)',
              borderRadius: '1.25rem',
              border: '1px solid var(--border)',
              zIndex: 301,
              padding: '1.25rem',
            }}
          >
            <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 700 }}>
              {mode === 'delete' ? 'Termin löschen' : 'Serie bearbeiten'}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Welche Termine sollen {mode === 'delete' ? 'gelöscht' : 'geändert'} werden?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onSelect(opt.value)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: mode === 'delete' && opt.value === 'all'
                      ? '#ef4444'
                      : 'var(--text)',
                  }}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {opt.hint}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={onCancel}
              style={{
                width: '100%',
                padding: '0.6rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Abbrechen
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
