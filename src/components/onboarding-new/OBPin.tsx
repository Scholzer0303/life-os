import { useState } from 'react'
import { savePin, getPinHash } from '../../lib/pin'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function OBPin({ onNext, onBack }: Props) {
  const alreadySet = Boolean(getPinHash())
  const [phase, setPhase] = useState<'enter' | 'confirm'>(alreadySet ? 'done' as 'enter' : 'enter')
  const [firstPin, setFirstPin] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [done, setDone] = useState(alreadySet)

  function triggerShake(msg: string) {
    setError(msg)
    setShake(true)
    setPin('')
    setTimeout(() => setShake(false), 500)
  }

  async function handleDigit(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError('')

    if (next.length === 4) {
      if (phase === 'enter') {
        setFirstPin(next)
        setPin('')
        setPhase('confirm')
      } else {
        if (next === firstPin) {
          await savePin(next)
          setDone(true)
        } else {
          triggerShake('PINs stimmen nicht überein. Nochmal versuchen.')
          setPhase('enter')
          setFirstPin('')
        }
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  if (done) {
    return (
      <div style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Schritt 2 von 2
        </div>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          PIN gespeichert
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          Du kannst dich ab jetzt mit deinem 4-stelligen PIN einloggen.
        </p>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '0.875rem',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Weiter →
        </button>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '2.5rem' }}>
      <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Schritt 2 von 2
      </div>
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', textAlign: 'center' }}>
        {phase === 'enter' ? 'PIN festlegen' : 'PIN bestätigen'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6, textAlign: 'center' }}>
        {phase === 'enter'
          ? '4-stelliger PIN für den schnellen Zugang.'
          : 'Gib deinen PIN zur Bestätigung nochmals ein.'}
      </p>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem', animation: shake ? 'pin-shake 0.45s ease' : 'none' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: i < pin.length ? 'var(--accent)' : 'var(--border)', transition: 'background 0.15s' }} />
        ))}
      </div>

      <div style={{ height: '1.25rem', fontSize: '0.8rem', color: '#ef4444', marginBottom: '1.75rem', textAlign: 'center' }}>
        {error}
      </div>

      <Numpad onDigit={handleDigit} onDelete={handleDelete} />

      <button
        onClick={onBack}
        style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}
      >
        ← Zurück
      </button>

      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}

function Numpad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', width: '100%', maxWidth: '280px', margin: '0 auto' }}>
      {keys.map((k, i) => {
        if (k === '') return <div key={i} />
        const isDelete = k === '⌫'
        return (
          <button
            key={k}
            onClick={() => isDelete ? onDelete() : onDigit(k)}
            style={{ aspectRatio: '1', border: '1px solid var(--border)', borderRadius: '50%', background: isDelete ? 'transparent' : 'var(--bg-card)', color: isDelete ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: isDelete ? '1.3rem' : '1.4rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isDelete ? 'none' : 'var(--shadow-card)', transition: 'background 0.1s' }}
          >
            {k}
          </button>
        )
      })}
    </div>
  )
}
