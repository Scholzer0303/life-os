import { useState } from 'react'
import { motion } from 'framer-motion'
import type { OnboardingData } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onNext: (updates: Partial<OnboardingData>) => void
}

export default function Step1Welcome({ data, onNext }: Props) {
  const [name, setName] = useState(data.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      <h1
        style={{
          fontFamily: 'Lora, serif',
          fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
          fontWeight: 600,
          margin: '0 0 0.75rem',
          color: 'var(--text-primary)',
        }}
      >
        Willkommen bei Life OS
      </h1>

      <p
        style={{
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          margin: '0 0 0.75rem',
          fontSize: '1rem',
        }}
      >
        Life OS ist kein weiteres Produktivitäts-Tool.
      </p>
      <p
        style={{
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          margin: '0 0 0.75rem',
          fontSize: '1rem',
        }}
      >
        Es ist ein <strong style={{ color: 'var(--text-primary)' }}>ruhiger, ehrlicher Mentor</strong> —
        der dich kennt, deine Muster erkennt und dich durch Fragen zu dem führt, was dir wirklich wichtig ist.
      </p>
      <p
        style={{
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          margin: '0 0 2rem',
          fontSize: '1rem',
        }}
      >
        Heute richten wir es gemeinsam ein. Das dauert ca. 10 Minuten.
      </p>

      <label
        htmlFor="name"
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: '0.4rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Wie heißt du?
      </label>
      <input
        id="name"
        type="text"
        autoComplete="given-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onNext({ name: name.trim() })}
        placeholder="Dein Vorname"
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          fontSize: '1.1rem',
          fontFamily: 'DM Sans, sans-serif',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      <button
        onClick={() => onNext({ name: name.trim() })}
        disabled={!name.trim()}
        style={{
          marginTop: '1.5rem',
          width: '100%',
          padding: '0.9rem',
          background: name.trim() ? 'var(--accent)' : 'var(--text-muted)',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '1rem',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
          cursor: name.trim() ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s',
        }}
      >
        Los geht's →
      </button>
    </motion.div>
  )
}
