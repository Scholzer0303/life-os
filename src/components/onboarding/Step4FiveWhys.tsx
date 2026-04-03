import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { runFiveWhys } from '../../lib/claude'
import type { OnboardingData, FiveWhysEntry } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onNext: (updates: Partial<OnboardingData>) => void
  onBack: () => void
}

const START_QUESTION = 'Was willst du in deinem Leben wirklich verändern?'
const MAX_WHYS = 5

export default function Step4FiveWhys({ data, onNext, onBack }: Props) {
  const [entries, setEntries] = useState<FiveWhysEntry[]>(
    data.fiveWhys.length > 0
      ? data.fiveWhys
      : [{ question: START_QUESTION, answer: '' }]
  )
  const [currentAnswer, setCurrentAnswer] = useState(
    data.fiveWhys.length > 0 ? '' : ''
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentIndex = entries.findIndex((e) => e.answer === '')
  const currentEntry = currentIndex >= 0 ? entries[currentIndex] : null
  const isDone = entries.length >= MAX_WHYS && entries.every((e) => e.answer !== '')

  async function handleAnswer() {
    if (!currentAnswer.trim() || !currentEntry) return
    setError(null)

    const updatedEntries = entries.map((e, i) =>
      i === currentIndex ? { ...e, answer: currentAnswer.trim() } : e
    )

    if (updatedEntries.length >= MAX_WHYS) {
      setEntries(updatedEntries)
      setCurrentAnswer('')
      return
    }

    setIsLoading(true)
    try {
      const allAnswers = updatedEntries.flatMap((e) => [e.question, e.answer])
      const nextQuestion = await runFiveWhys(allAnswers)
      setEntries([...updatedEntries, { question: nextQuestion, answer: '' }])
      setCurrentAnswer('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der nächsten Frage.')
    } finally {
      setIsLoading(false)
    }
  }

  const completedEntries = entries.filter((e) => e.answer !== '')

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
        Die 5-Warum-Kette
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
        Wir graben tiefer als den Oberflächenwunsch. Antworte ehrlich — es gibt keine falsche Antwort.
      </p>

      {/* Completed Q&A pairs */}
      {completedEntries.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {completedEntries.map((entry, i) => (
            <div
              key={i}
              style={{
                marginBottom: '1rem',
                padding: '0.85rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                borderLeft: '3px solid var(--accent)',
              }}
            >
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  margin: '0 0 0.25rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Warum #{i + 1}
              </p>
              <p style={{ margin: '0 0 0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                {entry.question}
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {entry.answer}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Current question or done state */}
      <AnimatePresence mode="wait">
        {!isDone && currentEntry ? (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              style={{
                padding: '1rem',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--accent)',
                borderRadius: '12px',
                marginBottom: '1rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--accent)',
                  margin: '0 0 0.4rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {completedEntries.length === 0 ? 'Startfrage' : `Warum #${completedEntries.length + 1}`}
              </p>
              <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.5 }}>{currentEntry.question}</p>
            </div>

            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey && currentAnswer.trim()) handleAnswer()
              }}
              placeholder="Deine Antwort…"
              rows={3}
              disabled={isLoading}
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
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              autoFocus
            />
            {error && (
              <p style={{ color: 'var(--accent-warm)', fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
                {error}
              </p>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.4rem 0 1rem' }}>
              ⌘ + Enter zum Senden
            </p>
          </motion.div>
        ) : isDone ? (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '1rem',
              background: '#F0FBF5',
              border: '1px solid var(--accent-green)',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              color: 'var(--accent-green)',
              fontWeight: 500,
            }}
          >
            Alle 5 Ebenen erkundet. Du kannst jetzt weiter.
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={onBack}
          disabled={isLoading}
          style={{
            flex: '0 0 auto',
            padding: '0.85rem 1.25rem',
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
          }}
        >
          ←
        </button>

        {!isDone ? (
          <button
            onClick={handleAnswer}
            disabled={!currentAnswer.trim() || isLoading}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: currentAnswer.trim() && !isLoading ? 'var(--accent)' : 'var(--text-muted)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              cursor: currentAnswer.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? 'Nächste Frage wird geladen…' : 'Antworten →'}
          </button>
        ) : (
          <button
            onClick={() => onNext({ fiveWhys: entries.filter((e) => e.answer !== '') })}
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
        )}
      </div>
    </motion.div>
  )
}
