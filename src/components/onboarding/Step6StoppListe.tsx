import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OnboardingData } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onNext: (updates: Partial<OnboardingData>) => void
  onBack: () => void
}

export default function Step6StoppListe({ data, onNext, onBack }: Props) {
  const [items, setItems] = useState<string[]>(
    data.stopList.length > 0 ? data.stopList : ['', '', '']
  )
  const [newItem, setNewItem] = useState('')

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function addItem() {
    const trimmed = newItem.trim()
    if (!trimmed) return
    setItems((prev) => [...prev, trimmed])
    setNewItem('')
  }

  const filledItems = items.filter((item) => item.trim() !== '')
  const canProceed = filledItems.length >= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      <h2
        style={{
          fontFamily: 'Lora, serif',
          fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
          fontWeight: 600,
          margin: '0 0 0.5rem',
        }}
      >
        Deine Stopp-Liste
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
        Was hörst du ab heute auf zu tun, um deinen Nordstern zu erreichen? Mindestens 3 Einträge.
      </p>

      {/* North star reminder */}
      {data.northStar && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            borderLeft: '3px solid var(--accent)',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '0.2rem' }}>
            Dein Nordstern
          </span>
          {data.northStar}
        </div>
      )}

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  width: '1.2rem',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {i + 1}.
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder={`Ich höre auf mit…`}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
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
              {items.length > 3 && (
                <button
                  onClick={() => removeItem(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '1.1rem',
                    padding: '0.25rem',
                    lineHeight: 1,
                  }}
                  aria-label="Entfernen"
                >
                  ×
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add item */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem' }}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Weiteren Eintrag hinzufügen…"
          style={{
            flex: 1,
            padding: '0.65rem 0.85rem',
            border: '1.5px dashed var(--border)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontFamily: 'DM Sans, sans-serif',
            background: 'transparent',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          style={{
            padding: '0.65rem 1rem',
            background: newItem.trim() ? 'var(--accent)' : 'var(--border)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: newItem.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
          }}
        >
          +
        </button>
      </div>

      <p
        style={{
          fontSize: '0.8rem',
          color: canProceed ? 'var(--accent-green)' : 'var(--text-muted)',
          marginBottom: '1.25rem',
          fontWeight: 500,
        }}
      >
        {filledItems.length}/3 Mindest-Einträge {canProceed ? '✓' : ''}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={onBack}
          style={{
            flex: '0 0 auto',
            padding: '0.85rem 1.25rem',
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
          }}
        >
          ←
        </button>
        <button
          onClick={() => onNext({ stopList: filledItems })}
          disabled={!canProceed}
          style={{
            flex: 1,
            padding: '0.85rem',
            background: canProceed ? 'var(--accent)' : 'var(--text-muted)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          Weiter →
        </button>
      </div>
    </motion.div>
  )
}
