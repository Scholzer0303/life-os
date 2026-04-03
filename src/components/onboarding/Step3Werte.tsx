import { useState } from 'react'
import { motion } from 'framer-motion'
import { ALL_VALUES } from '../../types/onboarding'
import type { OnboardingData, Value } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onNext: (updates: Partial<OnboardingData>) => void
  onBack: () => void
}

// Known value conflicts — shown when both are selected
const VALUE_CONFLICTS: [Value, Value, string][] = [
  ['Freiheit', 'Sicherheit', 'Freiheit und Sicherheit ziehen oft in verschiedene Richtungen — wie gehst du damit um?'],
  ['Freiheit', 'Familie', 'Freiheit und Familienverantwortung können sich reiben — was hat wann Vorrang?'],
  ['Wohlstand', 'Gerechtigkeit', 'Wohlstand und Gerechtigkeit geraten manchmal in Konflikt — wo ziehst du die Linie?'],
  ['Einfluss', 'Verbindung', 'Einfluss kann echte Verbindung erschweren — wann akzeptierst du diesen Preis?'],
  ['Abenteuer', 'Sicherheit', 'Abenteuer und Sicherheit schließen sich nicht aus, aber sie fordern eine Entscheidung.'],
  ['Wachstum', 'Familie', 'Persönliches Wachstum braucht Zeit — die manchmal der Familie fehlt.'],
]

export default function Step3Werte({ data, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Value[]>(data.selectedValues)

  function toggle(value: Value) {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : prev.length < 5
        ? [...prev, value]
        : prev
    )
  }

  const conflicts = VALUE_CONFLICTS.filter(
    ([a, b]) => selected.includes(a) && selected.includes(b)
  )

  const canProceed = selected.length === 5

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
        Deine Werte
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.35rem', lineHeight: 1.6 }}>
        Was ist dir im Leben wirklich wichtig? Wähle genau <strong>5 Werte</strong>.
      </p>
      <p
        style={{
          fontSize: '0.85rem',
          color: selected.length === 5 ? 'var(--accent-green)' : 'var(--text-muted)',
          margin: '0 0 1.25rem',
          fontWeight: 500,
        }}
      >
        {selected.length}/5 gewählt
      </p>

      {/* Value Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.6rem',
          marginBottom: '1.25rem',
        }}
      >
        {ALL_VALUES.map((value) => {
          const isSelected = selected.includes(value)
          const isDisabled = !isSelected && selected.length >= 5
          return (
            <button
              key={value}
              onClick={() => !isDisabled && toggle(value)}
              disabled={isDisabled}
              style={{
                padding: '0.65rem 0.5rem',
                background: isSelected ? 'var(--accent)' : 'var(--bg-card)',
                color: isSelected ? '#fff' : isDisabled ? 'var(--text-muted)' : 'var(--text-primary)',
                border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: isSelected ? 600 : 400,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                textAlign: 'center',
              }}
            >
              {value}
            </button>
          )
        })}
      </div>

      {/* Conflict notices */}
      {conflicts.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          {conflicts.map(([a, b, msg]) => (
            <div
              key={`${a}-${b}`}
              style={{
                padding: '0.75rem 1rem',
                background: '#FFF8F0',
                border: '1px solid var(--streak)',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                marginBottom: '0.5rem',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--accent-warm)' }}>⚡ {a} + {b}:</span>{' '}
              {msg}
            </div>
          ))}
        </div>
      )}

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
          onClick={() => onNext({ selectedValues: selected })}
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
