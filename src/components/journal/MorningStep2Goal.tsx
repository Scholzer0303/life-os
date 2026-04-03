import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { getWeeklyGoals } from '../../lib/db'
import type { GoalRow } from '../../types/database'

interface Props {
  initialGoal: string
  initialLinkedGoalId: string | null
  onNext: (goal: string, linkedGoalId: string | null) => void
  onBack: () => void
}

export default function MorningStep2Goal({ initialGoal, initialLinkedGoalId, onNext, onBack }: Props) {
  const { user } = useStore()
  const [goal, setGoal] = useState(initialGoal)
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(initialLinkedGoalId)
  const [weeklyGoals, setWeeklyGoals] = useState<GoalRow[]>([])

  useEffect(() => {
    if (!user) return
    getWeeklyGoals(user.id).then(setWeeklyGoals).catch(console.error)
  }, [user])

  const canProceed = goal.trim().length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
        Was ist dein <em>einen</em> Ziel für heute?
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
        Nur eines. Das Wichtigste, das heute passieren soll.
      </p>

      <label
        htmlFor="main-goal"
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
        Mein Ziel für heute
      </label>
      <textarea
        id="main-goal"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Heute ist der Tag ein Erfolg, wenn…"
        rows={3}
        autoFocus
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
          resize: 'none',
          boxSizing: 'border-box',
          lineHeight: 1.5,
          marginBottom: '1.25rem',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      {/* Weekly goal link */}
      {weeklyGoals.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p
            style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Mit Wochenziel verknüpfen <span style={{ color: 'var(--text-muted)', textTransform: 'none' }}>(optional)</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {weeklyGoals.map((g) => {
              const isLinked = linkedGoalId === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => setLinkedGoalId(isLinked ? null : g.id)}
                  style={{
                    padding: '0.65rem 1rem',
                    background: isLinked ? 'var(--accent)' : 'var(--bg-card)',
                    color: isLinked ? '#fff' : 'var(--text-secondary)',
                    border: `1.5px solid ${isLinked ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.875rem',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {isLinked ? '✓ ' : ''}{g.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onBack} style={backBtnStyle}>←</button>
        <button
          onClick={() => onNext(goal.trim(), linkedGoalId)}
          disabled={!canProceed}
          style={{
            flex: 1,
            padding: '0.9rem',
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
