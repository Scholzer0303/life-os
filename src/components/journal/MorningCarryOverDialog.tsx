import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import type { GoalTaskRow } from '../../types/database'

interface Props {
  tasks: GoalTaskRow[]
  onComplete: (kept: GoalTaskRow[], deleted: GoalTaskRow[]) => void
}

export default function MorningCarryOverDialog({ tasks, onComplete }: Props) {
  const { goals } = useStore()
  const [decisions, setDecisions] = useState<Record<string, 'keep' | 'delete'>>({})

  const decidedCount = Object.keys(decisions).length
  const allDecided = decidedCount === tasks.length

  function decide(taskId: string, decision: 'keep' | 'delete') {
    setDecisions((prev) => ({ ...prev, [taskId]: decision }))
  }

  function handleComplete() {
    onComplete(
      tasks.filter((t) => decisions[t.id] === 'keep'),
      tasks.filter((t) => decisions[t.id] === 'delete')
    )
  }

  function getGoalTitle(goalId: string): string | null {
    return goals.find((g) => g.id === goalId)?.title ?? null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
        Offene Aufgaben von gestern
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
        Entscheide bewusst für jede Aufgabe — erst dann geht es weiter.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
        {tasks.map((task) => {
          const decision = decisions[task.id]
          const goalTitle = getGoalTitle(task.goal_id)
          const isKept = decision === 'keep'
          const isDeleted = decision === 'delete'

          return (
            <div
              key={task.id}
              style={{
                background: 'var(--bg-card)',
                border: `1.5px solid ${isKept ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                opacity: isDeleted ? 0.45 : 1,
                transition: 'all 0.15s',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.2rem',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: isDeleted ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: isDeleted ? 'line-through' : 'none',
                  lineHeight: 1.4,
                }}
              >
                {task.title}
              </p>
              {goalTitle && (
                <p style={{ margin: '0 0 0.7rem', fontSize: '0.75rem', color: 'var(--accent)', opacity: 0.8 }}>
                  ↳ {goalTitle}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: goalTitle ? 0 : '0.7rem' }}>
                <button
                  onClick={() => decide(task.id, 'keep')}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.4rem',
                    background: isKept ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: isKept ? '#fff' : 'var(--text-secondary)',
                    border: `1.5px solid ${isKept ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Übernehmen →
                </button>
                <button
                  onClick={() => decide(task.id, 'delete')}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.4rem',
                    background: isDeleted ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                    color: isDeleted ? 'var(--text-muted)' : 'var(--text-secondary)',
                    border: `1.5px solid ${isDeleted ? 'var(--text-muted)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Nicht mehr relevant ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleComplete}
        disabled={!allDecided}
        style={{
          width: '100%',
          padding: '0.9rem',
          background: allDecided ? 'var(--accent)' : 'var(--text-muted)',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '1rem',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
          cursor: allDecided ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s',
        }}
      >
        {allDecided
          ? 'Weiter zum Morgenjournal →'
          : `Noch ${tasks.length - decidedCount} Aufgabe${tasks.length - decidedCount !== 1 ? 'n' : ''} offen`}
      </button>
    </motion.div>
  )
}
