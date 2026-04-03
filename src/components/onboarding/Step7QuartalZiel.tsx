import { useState } from 'react'
import { motion } from 'framer-motion'
import { getCurrentQuarter } from '../../lib/utils'
import type { OnboardingData } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onFinish: (updates: Partial<OnboardingData>) => void
  onBack: () => void
  isSaving: boolean
}

export default function Step7QuartalZiel({ data, onFinish, onBack, isSaving }: Props) {
  const [title, setTitle] = useState(data.firstGoalTitle)
  const [description, setDescription] = useState(data.firstGoalDescription)
  const quarter = getCurrentQuarter()
  const year = new Date().getFullYear()

  const canFinish = title.trim().length >= 5

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
        Erstes Quartalsziel
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
        Was ist dein wichtigstes Ziel für Q{quarter} {year}? Direkt abgeleitet von deinem Nordstern.
      </p>

      {/* North star + stop list summary */}
      <div
        style={{
          padding: '1rem',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          borderLeft: '3px solid var(--accent)',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            margin: '0 0 0.3rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Dein Nordstern
        </p>
        <p style={{ margin: '0 0 0.75rem', fontWeight: 500, lineHeight: 1.4, fontSize: '0.9rem' }}>
          {data.northStar}
        </p>
        {data.selectedValues.length > 0 && (
          <>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.3rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Deine Top-Werte
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {data.selectedValues.join(' · ')}
            </p>
          </>
        )}
      </div>

      <label
        htmlFor="goal-title"
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
        Ziel-Titel
      </label>
      <input
        id="goal-title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`Mein Q${quarter}-Ziel ist…`}
        autoFocus
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          fontSize: '1rem',
          fontFamily: 'DM Sans, sans-serif',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: '1rem',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      <label
        htmlFor="goal-desc"
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
        Beschreibung <span style={{ color: 'var(--text-muted)', textTransform: 'none' }}>(optional)</span>
      </label>
      <textarea
        id="goal-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Warum ist dieses Ziel wichtig? Wie sieht Erfolg aus?"
        rows={3}
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          fontSize: '0.9rem',
          fontFamily: 'DM Sans, sans-serif',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
          lineHeight: 1.5,
          marginBottom: '1.75rem',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={onBack}
          disabled={isSaving}
          style={{
            flex: '0 0 auto',
            padding: '0.85rem 1.25rem',
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
          }}
        >
          ←
        </button>
        <button
          onClick={() =>
            onFinish({ firstGoalTitle: title.trim(), firstGoalDescription: description.trim() })
          }
          disabled={!canFinish || isSaving}
          style={{
            flex: 1,
            padding: '0.85rem',
            background: canFinish && !isSaving ? 'var(--accent-green)' : 'var(--text-muted)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            cursor: canFinish && !isSaving ? 'pointer' : 'not-allowed',
          }}
        >
          {isSaving ? 'Wird gespeichert…' : 'Life OS starten ✓'}
        </button>
      </div>
    </motion.div>
  )
}
