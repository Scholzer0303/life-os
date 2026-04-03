import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithMagicLink } from '../lib/auth'

type Step = 'input' | 'sent' | 'error'

export default function Login() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setErrorMsg('')
    try {
      await signInWithMagicLink(email.trim())
      setStep('sent')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.')
      setStep('error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <AnimatePresence mode="wait">
        {step === 'input' || step === 'error' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%', maxWidth: '400px' }}
          >
            {/* Logo / Heading */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h1
                style={{
                  fontFamily: 'Lora, serif',
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 0.5rem',
                }}
              >
                Life OS
              </h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                Dein persönlicher KI-Mentor
              </p>
            </div>

            {/* Card */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '2rem',
              }}
            >
              <h2
                style={{
                  fontFamily: 'Lora, serif',
                  fontSize: '1.25rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  margin: '0 0 0.5rem',
                }}
              >
                Einloggen
              </h2>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  margin: '0 0 1.5rem',
                  lineHeight: '1.5',
                }}
              >
                Gib deine E-Mail-Adresse ein. Wir schicken dir einen Magic Link — kein Passwort nötig.
              </p>

              <form onSubmit={handleSubmit}>
                <label
                  htmlFor="email"
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
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="du@beispiel.de"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontFamily: 'DM Sans, sans-serif',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />

                {step === 'error' && (
                  <p
                    style={{
                      color: 'var(--accent-warm)',
                      fontSize: '0.85rem',
                      margin: '0.5rem 0 0',
                    }}
                  >
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  style={{
                    marginTop: '1.25rem',
                    width: '100%',
                    padding: '0.85rem',
                    background: isLoading || !email.trim() ? 'var(--text-muted)' : 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    cursor: isLoading || !email.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s, opacity 0.15s',
                  }}
                >
                  {isLoading ? 'Wird gesendet…' : 'Magic Link senden'}
                </button>
              </form>
            </div>

            <p
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                marginTop: '1.5rem',
              }}
            >
              Deine Daten bleiben privat — nur du hast Zugriff.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>✉️</div>
            <h2
              style={{
                fontFamily: 'Lora, serif',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 0.75rem',
              }}
            >
              Schau in dein Postfach
            </h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                margin: '0 0 2rem',
              }}
            >
              Wir haben einen Magic Link an <strong>{email}</strong> geschickt.
              Klick auf den Link im E-Mail — du wirst automatisch eingeloggt.
            </p>
            <button
              onClick={() => setStep('input')}
              style={{
                background: 'none',
                border: '1.5px solid var(--border)',
                borderRadius: '10px',
                padding: '0.65rem 1.5rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.9rem',
              }}
            >
              Andere E-Mail verwenden
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
