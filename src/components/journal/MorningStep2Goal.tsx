import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Link, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { getWeeklyGoals, getActiveGoalHierarchy } from '../../lib/db'
import type { GoalRow } from '../../types/database'
import type { ActiveGoalHierarchy } from '../../lib/db'
import type { DailyTask } from '../../types'

interface Props {
  initialGoal: string
  initialLinkedGoalId: string | null
  initialIdentityAction?: string
  initialDailyTasks?: DailyTask[]
  identityStatement?: string | null
  onNext: (goal: string, linkedGoalId: string | null, identityAction: string, dailyTasks: DailyTask[]) => void
  onBack: () => void
}

export default function MorningStep2Goal({ initialGoal, initialLinkedGoalId, initialIdentityAction = '', initialDailyTasks = [], identityStatement, onNext, onBack }: Props) {
  const { user } = useStore()
  const navigate = useNavigate()
  const [goal, setGoal] = useState(initialGoal)
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(initialLinkedGoalId)
  const [identityAction, setIdentityAction] = useState(initialIdentityAction)
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(
    initialDailyTasks.length > 0 ? initialDailyTasks : [{ id: crypto.randomUUID(), title: '', completed: false, goal_id: null }]
  )
  const [weeklyGoals, setWeeklyGoals] = useState<GoalRow[]>([])
  const [hierarchy, setHierarchy] = useState<ActiveGoalHierarchy | null>(null)
  const [hierarchyOpen, setHierarchyOpen] = useState(true)

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
    getActiveGoalHierarchy(user.id).then(setHierarchy).catch(console.error)
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
        Was ist dein Ziel für heute?
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
        Nur eines. Das Wichtigste, das heute passieren soll.
      </p>

      {/* Kontext-Banner */}
      {hierarchy && (hierarchy.week || hierarchy.month || hierarchy.quarter) ? (
        <div
          style={{
            background: 'rgba(134,59,255,0.07)',
            border: '1px solid rgba(134,59,255,0.2)',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setHierarchyOpen((o) => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.875rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent)',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Link size={12} />
              Dein Ziel-Kontext
            </span>
            {hierarchyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <AnimatePresence>
            {hierarchyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 0.875rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {hierarchy.quarter && (
                    <HierarchyRow label="Quartal" title={hierarchy.quarter.title} />
                  )}
                  {hierarchy.month && (
                    <HierarchyRow label="Monat" title={hierarchy.month.title} />
                  )}
                  {hierarchy.week ? (
                    <HierarchyRow label="Woche" title={hierarchy.week.title} highlight />
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Noch kein Wochenziel —{' '}
                      <button
                        onClick={() => navigate('/goals')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}
                      >
                        Jetzt setzen
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : hierarchy && !hierarchy.week && !hierarchy.month && !hierarchy.quarter ? (
        <div style={{ padding: '0.6rem 0.875rem', background: 'rgba(134,59,255,0.05)', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Noch kein Wochenziel gesetzt —{' '}
          <button
            onClick={() => navigate('/goals')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}
          >
            Jetzt setzen →
          </button>
        </div>
      ) : null}

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

      {/* Identitäts-Anker */}
      {identityStatement && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="identity-action"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Welche Handlung heute beweist wer du bist?{' '}
            <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="identity-action"
            type="text"
            value={identityAction}
            onChange={(e) => setIdentityAction(e.target.value)}
            placeholder="Ich werde heute … tun, weil ich jemand bin der …"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1.5px solid var(--border)',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontFamily: 'DM Sans, sans-serif',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      )}

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

function HierarchyRow({ label, title, highlight = false }: { label: string; title: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: highlight ? 'var(--accent)' : 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          minWidth: '52px',
          paddingTop: '0.1rem',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '0.82rem', color: highlight ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
        {title}
      </span>
    </div>
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
