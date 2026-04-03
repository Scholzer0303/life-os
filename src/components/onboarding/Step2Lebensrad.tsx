import { useState } from 'react'
import { motion } from 'framer-motion'
import SpiderWeb from './SpiderWeb'
import { LEBENSRAD_AREAS } from '../../types/onboarding'
import type { OnboardingData, LebensradScores } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onNext: (updates: Partial<OnboardingData>) => void
  onBack: () => void
}

export default function Step2Lebensrad({ data, onNext, onBack }: Props) {
  const [scores, setScores] = useState<LebensradScores>({ ...data.lebensrad })

  function setScore(area: keyof LebensradScores, value: number) {
    setScores((prev) => ({ ...prev, [area]: value }))
  }

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
        Dein Lebensrad
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
        Wo stehst du gerade? Bewerte jeden Bereich ehrlich — nicht wie er sein sollte, sondern wie er ist.
      </p>

      {/* Spider Web — centered */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
        <SpiderWeb scores={scores} size={240} />
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '2rem' }}>
        {LEBENSRAD_AREAS.map((area) => (
          <div key={area}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.25rem',
                fontSize: '0.875rem',
              }}
            >
              <span style={{ fontWeight: 500 }}>{area}</span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  minWidth: '1.5rem',
                  textAlign: 'right',
                }}
              >
                {scores[area]}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={scores[area]}
              onChange={(e) => setScore(area, Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
              aria-label={`${area}: ${scores[area]} von 10`}
            />
          </div>
        ))}
      </div>

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
          onClick={() => onNext({ lebensrad: scores })}
          style={{
            flex: 1,
            padding: '0.85rem',
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
          Weiter →
        </button>
      </div>
    </motion.div>
  )
}
