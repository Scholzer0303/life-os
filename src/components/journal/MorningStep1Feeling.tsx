import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  initialScore: number | null
  initialText: string
  onNext: (score: number, text: string) => void
}

const FEELINGS = [
  { score: 1, emoji: '😞', label: 'Sehr schlecht' },
  { score: 2, emoji: '😕', label: 'Nicht so gut' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Gut' },
  { score: 5, emoji: '😄', label: 'Sehr gut' },
]

export default function MorningStep1Feeling({ initialScore, initialText, onNext }: Props) {
  const [score, setScore] = useState<number | null>(initialScore)
  const [text, setText] = useState(initialText)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
        Wie fühlst du dich gerade?
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem', lineHeight: 1.5 }}>
        Ehrlich — kein richtiges oder falsches Gefühl.
      </p>

      {/* Emoji Scale */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {FEELINGS.map((f) => {
          const isSelected = score === f.score
          return (
            <button
              key={f.score}
              onClick={() => setScore(f.score)}
              title={f.label}
              aria-label={f.label}
              aria-pressed={isSelected}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.75rem 0.25rem',
                background: isSelected ? 'var(--bg-secondary)' : 'var(--bg-card)',
                border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                transform: isSelected ? 'scale(1.07)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{f.emoji}</span>
              <span style={{ fontSize: '0.6rem', color: isSelected ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>
                {f.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Optional text */}
      <label
        htmlFor="feeling-text"
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
        Möchtest du etwas dazu sagen? <span style={{ color: 'var(--text-muted)', textTransform: 'none' }}>(optional)</span>
      </label>
      <textarea
        id="feeling-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Was bewegt dich gerade?"
        rows={2}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontFamily: 'DM Sans, sans-serif',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          outline: 'none',
          resize: 'none',
          boxSizing: 'border-box',
          lineHeight: 1.5,
          marginBottom: '1.5rem',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      <button
        onClick={() => score && onNext(score, text)}
        disabled={!score}
        style={{
          width: '100%',
          padding: '0.9rem',
          background: score ? 'var(--accent)' : 'var(--text-muted)',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '1rem',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
          cursor: score ? 'pointer' : 'not-allowed',
        }}
      >
        Weiter →
      </button>
    </motion.div>
  )
}
