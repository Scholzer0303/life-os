import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { summarizeNorthStar } from '../../lib/claude'
import type { OnboardingData } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onNext: (updates: Partial<OnboardingData>) => void
  onBack: () => void
}

export default function Step5Nordstern({ data, onNext, onBack }: Props) {
  const [northStar, setNorthStar] = useState(data.northStar)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)

  // Auto-load AI suggestion on mount if we have 5-Whys data and no existing northStar
  useEffect(() => {
    if (data.fiveWhys.length > 0 && !data.northStar && !suggestion) {
      loadSuggestion()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSuggestion() {
    setIsLoadingSuggestion(true)
    setSuggestionError(null)
    try {
      const allAnswers = data.fiveWhys.flatMap((e) => [e.question, e.answer])
      const result = await summarizeNorthStar(allAnswers)
      setSuggestion(result)
    } catch (err) {
      setSuggestionError(err instanceof Error ? err.message : 'Fehler beim Laden des Vorschlags.')
    } finally {
      setIsLoadingSuggestion(false)
    }
  }

  function useSuggestion() {
    if (suggestion) setNorthStar(suggestion)
  }

  const canProceed = northStar.trim().length >= 10

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
        Dein Nordstern
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
        Formuliere deine Richtung in einem Satz:
      </p>
      <p
        style={{
          padding: '0.75rem 1rem',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          fontStyle: 'italic',
          color: 'var(--text-secondary)',
          margin: '0 0 1.5rem',
          fontSize: '0.9rem',
          lineHeight: 1.5,
        }}
      >
        "In 3 Jahren bin ich [X], erkennbar daran, dass [Y]"
      </p>

      {/* AI Suggestion */}
      {(isLoadingSuggestion || suggestion || suggestionError) && (
        <div
          style={{
            padding: '1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            marginBottom: '1.25rem',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              margin: '0 0 0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Coach-Vorschlag
          </p>
          {isLoadingSuggestion ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, fontStyle: 'italic' }}>
              Analysiere deine Antworten…
            </p>
          ) : suggestionError ? (
            <div>
              <p style={{ color: 'var(--accent-warm)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                {suggestionError}
              </p>
              <button
                onClick={loadSuggestion}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Erneut versuchen
              </button>
            </div>
          ) : suggestion ? (
            <div>
              <div style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                <ReactMarkdown>{suggestion}</ReactMarkdown>
              </div>
              <button
                onClick={useSuggestion}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                }}
              >
                Diesen Vorschlag übernehmen →
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Input */}
      <label
        htmlFor="northstar"
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
        Dein Nordstern-Satz
      </label>
      <textarea
        id="northstar"
        value={northStar}
        onChange={(e) => setNorthStar(e.target.value)}
        placeholder="In 3 Jahren bin ich…"
        rows={4}
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
          resize: 'vertical',
          boxSizing: 'border-box',
          lineHeight: 1.5,
          marginBottom: '1.5rem',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

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
          onClick={() => onNext({ northStar: northStar.trim() })}
          disabled={!canProceed}
          style={{
            flex: 1,
            padding: '0.85rem',
            background: canProceed ? 'var(--accent)' : 'var(--text-muted)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          Weiter →
        </button>
      </div>
    </motion.div>
  )
}
