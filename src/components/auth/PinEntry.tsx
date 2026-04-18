import { useState } from 'react'
import { verifyPin, clearPin } from '../../lib/pin'
import { supabase } from '../../lib/supabase'

interface Props {
  onUnlock: () => void
}

export default function PinEntry({ onUnlock }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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
      const ok = await verifyPin(next)
      if (ok) {
        onUnlock()
      } else {
        triggerShake('Falscher PIN. Bitte nochmal versuchen.')
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  async function handleReset() {
    clearPin()
    await supabase.auth.signOut()
    window.location.href = '/login'
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
        Life OS
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
        PIN eingeben
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

      {/* PIN vergessen */}
      <button
        onClick={() => setShowResetConfirm(true)}
        style={{ marginTop: '2rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
      >
        PIN vergessen?
      </button>

      {/* Reset-Bestätigung */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px',
            padding: '1.5rem', maxWidth: '320px', width: '100%',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>PIN zurücksetzen</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
              Dein PIN wird gelöscht und du wirst abgemeldet. Nach dem Anmelden per Magic Link kannst du einen neuen PIN festlegen.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{ flex: 1, padding: '0.75rem', background: 'none', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif' }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleReset}
                style={{ flex: 1, padding: '0.75rem', background: 'var(--accent)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#fff', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}

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
