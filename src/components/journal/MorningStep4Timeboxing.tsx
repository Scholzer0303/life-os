import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, GripVertical } from 'lucide-react'
import type { TimeBlock } from '../../types'

interface Props {
  initialBlocks: TimeBlock[]
  onNext: (blocks: TimeBlock[]) => void
  onBack: () => void
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 Min' },
  { value: 45, label: '45 Min' },
  { value: 60, label: '1 Std' },
  { value: 90, label: '1:30 Std' },
  { value: 120, label: '2 Std' },
  { value: 180, label: '3 Std' },
]

const BUFFER_MIN = 15
const MAX_BLOCKS = 6

function formatMinutes(min: number): string {
  if (min < 60) return `${min} Min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} Std` : `${h}:${String(m).padStart(2, '0')} Std`
}

export default function MorningStep4Timeboxing({ initialBlocks, onNext, onBack }: Props) {
  const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks)
  const [newTitle, setNewTitle] = useState('')
  const [newDuration, setNewDuration] = useState(60)

  const totalMin = blocks.reduce(
    (acc, b, i) => acc + b.duration_min + (i < blocks.length - 1 ? b.buffer_min : 0),
    0
  )

  function addBlock() {
    if (!newTitle.trim() || blocks.length >= MAX_BLOCKS) return
    setBlocks((prev) => [
      ...prev,
      { title: newTitle.trim(), duration_min: newDuration, buffer_min: BUFFER_MIN, completed: false },
    ])
    setNewTitle('')
    setNewDuration(60)
  }

  function removeBlock(i: number) {
    setBlocks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateBlock(i: number, patch: Partial<TimeBlock>) {
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
        Wie sieht dein Tag aus?
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
        Füge Themen-Blöcke hinzu — keine starren Zeiten, nur Schwerpunkte. Zwischen Blöcken: 15 Min Puffer.
      </p>

      {/* Block list */}
      {blocks.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <AnimatePresence>
            {blocks.map((block, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Block row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    marginBottom: '0.4rem',
                  }}
                >
                  <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      value={block.title}
                      onChange={(e) => updateBlock(i, { title: e.target.value })}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        outline: 'none',
                        padding: 0,
                      }}
                    />
                  </div>
                  <select
                    value={block.duration_min}
                    onChange={(e) => updateBlock(i, { duration_min: Number(e.target.value) })}
                    style={{
                      border: 'none',
                      background: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      fontFamily: 'DM Sans, sans-serif',
                      cursor: 'pointer',
                      outline: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeBlock(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '0.1rem',
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    aria-label="Block entfernen"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Buffer indicator between blocks */}
                {i < blocks.length - 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.1rem 0.75rem 0.25rem 2rem',
                      marginBottom: '0.15rem',
                    }}
                  >
                    <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      15 Min Puffer
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Total time */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '0.5rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              Gesamt:{' '}
              <strong style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatMinutes(totalMin)}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Add block form */}
      {blocks.length < MAX_BLOCKS ? (
        <div
          style={{
            padding: '0.85rem',
            background: 'var(--bg-card)',
            border: '1.5px dashed var(--border)',
            borderRadius: '12px',
            marginBottom: '1.5rem',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              margin: '0 0 0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Block hinzufügen ({blocks.length}/{MAX_BLOCKS})
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBlock()}
              placeholder="Thema oder Aufgabe…"
              style={{
                flex: 1,
                padding: '0.6rem 0.85rem',
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontFamily: 'DM Sans, sans-serif',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <select
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
              style={{
                padding: '0.6rem 0.5rem',
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontFamily: 'DM Sans, sans-serif',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                outline: 'none',
                flexShrink: 0,
              }}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={addBlock}
              disabled={!newTitle.trim()}
              style={{
                padding: '0.6rem 0.75rem',
                background: newTitle.trim() ? 'var(--accent)' : 'var(--border)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
              aria-label="Block hinzufügen"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '0.65rem 1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          Maximum von {MAX_BLOCKS} Blöcken erreicht.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onBack} style={backBtnStyle}>←</button>
        <button
          onClick={() => onNext(blocks)}
          style={{
            flex: 1,
            padding: '0.9rem',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {blocks.length > 0 ? 'Weiter →' : 'Überspringen →'}
        </button>
      </div>
    </motion.div>
  )
}

const backBtnStyle: React.CSSProperties = {
  flex: '0 0 auto',
  padding: '0.9rem 1.25rem',
  background: 'none',
  border: '1.5px solid var(--border)',
  borderRadius: '10px',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--text-secondary)',
  fontSize: '0.95rem',
}
