import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  initialBlockers: string
  onNext: (blockers: string) => void
  onBack: () => void
}

export default function MorningStep3Blockers({ initialBlockers, onNext, onBack }: Props) {
  const [blockers, setBlockers] = useState(initialBlockers)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
        Was könnte dich heute aufhalten?
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
        Benenne es — was du kennst, kannst du umgehen oder akzeptieren.
      </p>

      <textarea
        value={blockers}
        onChange={(e) => setBlockers(e.target.value)}
        placeholder="Mögliche Ablenkungen, Meetings, innere Widerstände…"
        rows={4}
        autoFocus
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
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

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onBack} style={backBtnStyle}>←</button>
        <button
          onClick={() => onNext(blockers)}
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
          {blockers.trim() ? 'Weiter →' : 'Überspringen →'}
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
