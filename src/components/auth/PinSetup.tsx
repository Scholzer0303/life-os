import { useState } from 'react'
import { savePin } from '../../lib/pin'

interface Props {
  onDone: () => void
}

export default function PinSetup({ onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter')
  const [firstPin, setFirstPin] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

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
          onDone()
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

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '2rem 1.5rem',
    }}>
      <div style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        {phase === 'enter' ? 'PIN festlegen' : 'PIN bestätigen'}
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>
        {phase === 'enter'
          ? 'Wähle einen 4-stelligen PIN für den schnellen Zugang zur App.'
          : 'Gib deinen PIN zur Bestätigung nochmals ein.'}
      </div>

      {/* Dots */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '0.75rem',
        animation: shake ? 'pin-shake 0.45s ease' : 'none',
      }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: i < pin.length ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.15s',
            }}
          />
        ))}
      </div>

      {/* Error */}
      <div style={{ height: '1.25rem', fontSize: '0.8rem', color: 'var(--accent-warm, #f59e0b)', marginBottom: '1.75rem', textAlign: 'center' }}>
        {error}
      </div>

      {/* Numpad */}
      <Numpad onDigit={handleDigit} onDelete={handleDelete} />

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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', width: '100%', maxWidth: '280px' }}>
      {keys.map((k, i) => {
        if (k === '') return <div key={i} />
        const isDelete = k === '⌫'
        return (
          <button
            key={k}
            onClick={() => isDelete ? onDelete() : onDigit(k)}
            style={{
              aspectRatio: '1',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              background: isDelete ? 'transparent' : 'var(--bg-card)',
              color: isDelete ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: isDelete ? '1.3rem' : '1.4rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDelete ? 'none' : 'var(--shadow-card)',
              transition: 'background 0.1s',
            }}
          >
            {k}
          </button>
        )
      })}
    </div>
  )
}
