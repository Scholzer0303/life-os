import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  initialScore: number | null
  initialText: string
  initialWeight: number | null
  initialSleepScore: number | null
  metricsEnabled: boolean
  onNext: (score: number, text: string, weight: number | null, sleepScore: number | null) => void
}

const FEELINGS = [
  { score: 1, emoji: '😞', label: 'Sehr schlecht' },
  { score: 2, emoji: '😕', label: 'Nicht so gut' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Gut' },
  { score: 5, emoji: '😄', label: 'Sehr gut' },
]

export default function MorningStep1Feeling({ initialScore, initialText, initialWeight, initialSleepScore, metricsEnabled, onNext }: Props) {
  const [score, setScore] = useState<number | null>(initialScore)
  const [text, setText] = useState(initialText)
  const [weight, setWeight] = useState<string>(initialWeight !== null ? String(initialWeight) : '')
  const [sleepScore, setSleepScore] = useState<string>(initialSleepScore !== null ? String(initialSleepScore) : '')

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

      {/* Metriken — optional, nur wenn aktiviert */}
      {metricsEnabled && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 1rem' }}>
            Heutige Metriken <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </p>

          {/* Gewicht */}
          <div style={{ marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Gewicht (kg)
              </label>
              {weight !== '' && (
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {weight} kg
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.1"
              min="30"
              max="300"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="z.B. 82.5"
              style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Schlafscore — Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Schlafscore
              </label>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: sleepScore === '' ? 'var(--text-muted)' : Number(sleepScore) >= 70 ? 'var(--accent-green)' : Number(sleepScore) >= 40 ? 'var(--streak)' : 'var(--accent-warm)' }}>
                {sleepScore === '' ? '—' : `${sleepScore}/100`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={sleepScore === '' ? 0 : Number(sleepScore)}
              onChange={(e) => setSleepScore(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent)', height: '6px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Schlecht</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Perfekt</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          if (!score) return
          const w = weight !== '' ? parseFloat(weight) : null
          const s = sleepScore !== '' ? parseInt(sleepScore) : null
          onNext(score, text, w, s)
        }}
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
