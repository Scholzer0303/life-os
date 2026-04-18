import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getWeeklyGoals } from '../../lib/db'
import type { GoalRow } from '../../types/database'
import type { DailyTask } from '../../types'

interface Props {
  initialGoal: string
  initialLinkedGoalId: string | null
  initialIdentityAction?: string
  initialDailyTasks?: DailyTask[]
  identityStatement?: string | null
  prefilledFromEvening?: boolean
  onNext: (goal: string, linkedGoalId: string | null, identityAction: string, dailyTasks: DailyTask[]) => void
  onBack: () => void
}

export default function MorningStep2Goal({ initialGoal, initialLinkedGoalId, initialIdentityAction = '', initialDailyTasks = [], prefilledFromEvening = false, onNext, onBack }: Props) {
  const { user } = useStore()
  const [goal] = useState(initialGoal)
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(initialLinkedGoalId)
  const [identityAction] = useState(initialIdentityAction)
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(
    initialDailyTasks.length > 0 ? initialDailyTasks : [{ id: crypto.randomUUID(), title: '', completed: false, goal_id: null }]
  )
  const [weeklyGoals, setWeeklyGoals] = useState<GoalRow[]>([])

  function addTask() {
    if (dailyTasks.length >= 5) return
    setDailyTasks((prev) => [...prev, { id: crypto.randomUUID(), title: '', completed: false, goal_id: null }])
  }

  function removeTask(id: string) {
    setDailyTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function updateTaskTitle(id: string, title: string) {
    setDailyTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)))
  }

  function updateTaskGoal(id: string, goal_id: string | null) {
    setDailyTasks((prev) => prev.map((t) => (t.id === id ? { ...t, goal_id } : t)))
  }

  useEffect(() => {
    if (!user) return
    getWeeklyGoals(user.id).then(setWeeklyGoals).catch(console.error)
  }, [user])

  const canProceed = true

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
        Was ist dein Ziel für heute?
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
        Nur eines. Das Wichtigste, das heute passieren soll.
      </p>

      {/* Kontext-Banner — deaktiviert (Paket 9D) */}

      {/* "Mein Ziel für heute" Textarea — deaktiviert (Paket 9D) */}

      {/* Vorausgefüllte Tasks vom gestrigen Abend */}
      {prefilledFromEvening && (
        <div style={{
          padding: '0.5rem 0.875rem',
          background: 'color-mix(in srgb, var(--accent-green) 10%, var(--bg-card))',
          border: '1px solid color-mix(in srgb, var(--accent-green) 30%, var(--border))',
          borderRadius: '8px',
          marginBottom: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          🌙 Vorausgefüllt vom gestrigen Abend — änderbar.
        </div>
      )}

      {/* Tages-Tasks */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Wichtigste Aufgaben heute <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>(optional, max. 4)</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {dailyTasks.map((task, i) => (
            <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '1rem', textAlign: 'center' }}>{i + 1}</span>
                <input
                  value={task.title}
                  onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                  placeholder={`Aufgabe ${i + 1}…`}
                  style={{ flex: 1, padding: '0.65rem 0.9rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                {dailyTasks.length > 1 && (
                  <button onClick={() => removeTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem', display: 'flex' }}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {weeklyGoals.length > 0 && task.title.trim() && (
                <div style={{ paddingLeft: '1.6rem' }}>
                  <select
                    value={task.goal_id ?? ''}
                    onChange={(e) => updateTaskGoal(task.id, e.target.value || null)}
                    style={{ width: '100%', padding: '0.4rem 0.7rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: task.goal_id ? 'var(--text-primary)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">Mit Wochenziel verknüpfen (optional)</option>
                    {weeklyGoals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
        {dailyTasks.length < 4 && (
          <button onClick={addTask} style={{ marginTop: '0.5rem', background: 'none', border: '1px dashed var(--border)', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', width: '100%', justifyContent: 'center' }}>
            <Plus size={14} /> Aufgabe hinzufügen
          </button>
        )}
      </div>

      {/* "Welche Handlung beweist wer du bist?" — deaktiviert (Paket 9D) */}

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
          onClick={() => onNext(goal.trim(), linkedGoalId, identityAction.trim(), dailyTasks.filter((t) => t.title.trim()))}
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
