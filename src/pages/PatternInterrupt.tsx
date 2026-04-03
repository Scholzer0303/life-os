import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowRight, Home, CheckCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { handlePatternInterrupt } from '../lib/claude'
import { logPatternEvent } from '../lib/db'

type FlowStep = 'question' | 'response' | 'done'

export default function PatternInterrupt() {
  const navigate = useNavigate()
  const { user, profile, goals, recentEntries } = useStore()
  const [flowStep, setFlowStep] = useState<FlowStep>('question')
  const [userText, setUserText] = useState('')
  const [coachReply, setCoachReply] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!userText.trim() || !profile || !user) return
    setIsLoading(true)
    setError(null)

    try {
      const reply = await handlePatternInterrupt(userText.trim(), profile, recentEntries, goals)
      setCoachReply(reply)

      // Log pattern event
      await logPatternEvent({
        user_id: user.id,
        event_type: 'pattern_interrupt',
        context: {
          triggered_from: 'pattern_interrupt_page',
          user_message: userText.trim().slice(0, 200),
        } as unknown as import('../types/database').Json,
      })

      setFlowStep('response')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">
        {/* ── Step 1: Initial question ── */}
        {flowStep === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👋</p>
              <h2
                style={{
                  fontFamily: 'Lora, serif',
                  color: 'var(--text-primary)',
                  fontSize: '1.4rem',
                  marginBottom: '0.5rem',
                  lineHeight: 1.3,
                }}
              >
                Hey — Leben passiert.
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Kein Vorwurf, kein Druck. Was ist gerade los?
              </p>
            </div>

            {/* Input */}
            <textarea
              autoFocus
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Schreib einfach raus, was gerade passiert…"
              rows={7}
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '1rem',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                marginBottom: '1rem',
              }}
              disabled={isLoading}
            />

            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!userText.trim() || isLoading}
              style={{
                background: userText.trim() && !isLoading ? 'var(--accent)' : 'var(--surface)',
                border: userText.trim() && !isLoading ? 'none' : '1px solid var(--border)',
                borderRadius: 12,
                padding: '0.9rem',
                color: userText.trim() && !isLoading ? '#fff' : 'var(--text-muted)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: userText.trim() && !isLoading ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Coach analysiert…
                </>
              ) : (
                <>
                  Absenden <ArrowRight size={18} />
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Coach response + reset ritual ── */}
        {flowStep === 'response' && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* User bubble */}
            <div
              style={{
                alignSelf: 'flex-end',
                maxWidth: '85%',
                background: 'var(--accent)',
                borderRadius: '12px 12px 2px 12px',
                padding: '0.75rem 1rem',
                color: '#fff',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {userText}
            </div>

            {/* Coach bubble */}
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '90%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px 12px 12px 2px',
                padding: '0.75rem 1rem',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {coachReply}
            </div>

            {/* Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => setFlowStep('done')}
                style={{
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '0.9rem',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle size={18} /> Reset-Ritual starten
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '0.75rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Zum Dashboard
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Reset ritual ── */}
        {flowStep === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem' }}
          >
            <p style={{ fontSize: '3rem' }}>🌱</p>
            <h2
              style={{
                fontFamily: 'Lora, serif',
                color: 'var(--text-primary)',
                fontSize: '1.4rem',
                lineHeight: 1.3,
              }}
            >
              Bereit für einen neuen Start.
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: 320 }}>
              Nicht das ganze System neu aufsetzen. Nur eine Sache: Schreib heute einen kurzen Eintrag — egal wie kurz.
            </p>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 320 }}>
              <button
                onClick={() => navigate('/journal?type=morning')}
                style={{
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '0.9rem',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Morgen-Journal starten
              </button>
              <button
                onClick={() => navigate('/journal?type=freeform')}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '0.75rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Freeform schreiben
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.5rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <Home size={14} /> Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
