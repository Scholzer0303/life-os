import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { reformulateIdentity } from '../../lib/claude'
import type { OnboardingData } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onNext: (updates: Partial<OnboardingData>) => void
  onBack: () => void
}

export default function Step6_Identity({ data, onNext, onBack }: Props) {
  const [text, setText] = useState(data.identityStatement)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)

  const year3 = new Date().getFullYear() + 3

  async function handleRefine() {
    if (!text.trim()) return
    setIsRefining(true)
    setRefineError(null)
    try {
      const result = await reformulateIdentity(text)
      setText(result)
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Fehler beim Verfeinern.')
    } finally {
      setIsRefining(false)
    }
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
        Dein zukünftiges Ich
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
        Stell dir vor, es ist {year3}. Du hast alles erreicht. Wer bist du jetzt?
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ich bin ein Unternehmer der ortsunabhängig arbeitet..."
        rows={5}
        autoFocus
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '0.85rem 1rem',
          border: '1.5px solid var(--border)',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontFamily: 'DM Sans, sans-serif',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
          lineHeight: 1.5,
          marginBottom: '0.75rem',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      {/* KI-Hilfe Button */}
      <button
        onClick={handleRefine}
        disabled={!text.trim() || isRefining}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.55rem 1rem',
          background: 'rgba(134,59,255,0.1)',
          border: '1px solid rgba(134,59,255,0.3)',
          borderRadius: '8px',
          color: 'var(--accent)',
          fontSize: '0.85rem',
          fontFamily: 'DM Sans, sans-serif',
          cursor: (!text.trim() || isRefining) ? 'not-allowed' : 'pointer',
          opacity: (!text.trim() || isRefining) ? 0.6 : 1,
          marginBottom: '1.25rem',
          transition: 'opacity 0.15s',
        }}
      >
        <Sparkles size={14} />
        {isRefining ? 'KI formuliert…' : 'KI hilft mir formulieren'}
      </button>

      {refineError && (
        <div style={{ padding: '0.6rem 0.875rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {refineError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <button
          onClick={onBack}
          style={backBtnStyle}
        >
          ←
        </button>
        <button
          onClick={() => onNext({ identityStatement: text.trim() })}
          disabled={!text.trim()}
          style={{
            flex: 1,
            padding: '0.85rem',
            background: text.trim() ? 'var(--accent)' : 'var(--text-muted)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            cursor: text.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Weiter →
        </button>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => onNext({ identityStatement: '' })}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            fontFamily: 'DM Sans, sans-serif',
            textDecoration: 'underline',
          }}
        >
          Überspringen
        </button>
      </div>
    </motion.div>
  )
}

const backBtnStyle: React.CSSProperties = {
  flex: '0 0 auto',
  padding: '0.85rem 1.25rem',
  background: 'none',
  border: '1.5px solid var(--border)',
  borderRadius: '10px',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--text-secondary)',
  fontSize: '0.95rem',
}
