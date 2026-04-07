import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  initialValue: boolean | null
  onNext: (calendarPlanned: boolean | null) => void
  onBack: () => void
}

export default function MorningStep4CalendarCheck({ initialValue, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<boolean | null>(initialValue)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
        Ist dein Tag geplant?
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem', lineHeight: 1.5 }}>
        Hast du deinen Tag im Kalender geblockt?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setSelected(true)}
          style={{
            padding: '1.1rem 1.25rem',
            borderRadius: '12px',
            border: selected === true
              ? '2px solid var(--accent)'
              : '2px solid var(--border)',
            background: selected === true
              ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
              : 'var(--bg-card)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            textAlign: 'left',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>✅</span>
          <div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '1rem',
              fontWeight: 600,
              color: selected === true ? 'var(--accent)' : 'var(--text-primary)',
            }}>
              Ja, bin vorbereitet
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Ich weiß wann was passiert.
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelected(false)}
          style={{
            padding: '1.1rem 1.25rem',
            borderRadius: '12px',
            border: selected === false
              ? '2px solid var(--accent-warm)'
              : '2px solid var(--border)',
            background: selected === false
              ? 'color-mix(in srgb, var(--accent-warm) 10%, transparent)'
              : 'var(--bg-card)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            textAlign: 'left',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⏳</span>
          <div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '1rem',
              fontWeight: 600,
              color: selected === false ? 'var(--accent-warm)' : 'var(--text-primary)',
            }}>
              Mache ich gleich
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Noch nicht erledigt.
            </div>
          </div>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onBack} style={backBtnStyle}>←</button>
        <button
          onClick={() => onNext(selected)}
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
          {selected !== null ? 'Weiter →' : 'Überspringen →'}
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
