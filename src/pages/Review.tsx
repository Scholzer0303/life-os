import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, CheckCircle2, Circle, Plus, Trash2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { getWeeklyGoals, updateGoal, createGoal, createCoachSession } from '../lib/db'
import { generateWeeklySummary, generateWeeklyFeedback } from '../lib/claude'
import { getCurrentWeek, getCurrentQuarter } from '../lib/utils'
import type { GoalRow } from '../types/database'
import type { CoachMessage } from '../types'

const STEPS = [
  'KI-Zusammenfassung',
  'Was lief gut?',
  'Was ändern?',
  'Wochenziele',
  'Nächste Woche',
  'KI-Feedback',
]

export default function Review() {
  const { user, profile, goals, recentEntries } = useStore()
  const [step, setStep] = useState(0)

  // Step 1 — AI summary
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // Step 2 & 3
  const [wentWell, setWentWell] = useState('')
  const [wouldChange, setWouldChange] = useState('')

  // Step 4 — current week goals
  const [weekGoals, setWeekGoals] = useState<GoalRow[]>([])
  const [weekGoalsLoading, setWeekGoalsLoading] = useState(false)

  // Step 5 — next week goals
  const [newGoalTitles, setNewGoalTitles] = useState<string[]>([''])

  // Step 6 — AI feedback
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const monthlyGoals = goals.filter((g) => g.type === 'monthly' && g.status === 'active')
  const parentMonthlyId = monthlyGoals[0]?.id ?? null

  const loadWeekGoals = useCallback(async () => {
    if (!user) return
    setWeekGoalsLoading(true)
    try {
      const data = await getWeeklyGoals(user.id)
      setWeekGoals(data)
    } catch (err) {
      console.error(err)
    } finally {
      setWeekGoalsLoading(false)
    }
  }, [user])

  // Load summary on mount
  useEffect(() => {
    if (!profile) return
    setSummaryLoading(true)
    setSummaryError(null)
    generateWeeklySummary(recentEntries, goals.filter((g) => g.type === 'weekly'), profile)
      .then(setSummary)
      .catch((e) => setSummaryError(e instanceof Error ? e.message : 'Fehler'))
      .finally(() => setSummaryLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load week goals when reaching step 4
  useEffect(() => {
    if (step === 3) loadWeekGoals()
  }, [step, loadWeekGoals])

  async function handleProgressUpdate(goalId: string, progress: number) {
    setWeekGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, progress } : g)))
    try {
      await updateGoal(goalId, {
        progress,
        status: progress === 100 ? 'completed' : 'active',
      })
    } catch (err) {
      console.error(err)
    }
  }

  function handleToggleComplete(goal: GoalRow) {
    const newProgress = goal.progress === 100 ? 0 : 100
    handleProgressUpdate(goal.id, newProgress)
  }

  function addNewGoalField() {
    if (newGoalTitles.length < 3) setNewGoalTitles((prev) => [...prev, ''])
  }

  function removeNewGoalField(i: number) {
    setNewGoalTitles((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateNewGoalTitle(i: number, val: string) {
    setNewGoalTitles((prev) => prev.map((t, idx) => (idx === i ? val : t)))
  }

  async function handleSaveNewGoals() {
    if (!user) return
    const nextWeek = getCurrentWeek() + 1
    const year = new Date().getFullYear()
    const quarter = getCurrentQuarter()

    const titlesToSave = newGoalTitles.filter((t) => t.trim())
    await Promise.all(
      titlesToSave.map((title) =>
        createGoal({
          user_id: user.id,
          title: title.trim(),
          type: 'weekly',
          status: 'active',
          week: nextWeek,
          year,
          quarter,
          progress: 0,
          parent_id: parentMonthlyId,
        })
      )
    )
  }

  async function handleGenerateFeedback() {
    if (!profile) return
    setFeedbackLoading(true)
    setFeedbackError(null)
    try {
      const text = await generateWeeklyFeedback(
        wentWell,
        wouldChange,
        recentEntries,
        weekGoals,
        profile
      )
      setFeedback(text)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setFeedbackLoading(false)
    }
  }

  async function handleFinish() {
    if (!user || saved) return
    try {
      await handleSaveNewGoals()
      const messages: CoachMessage[] = [
        { role: 'user', content: `Was lief gut: ${wentWell}\nWas ändern: ${wouldChange}`, timestamp: new Date().toISOString() },
        { role: 'assistant', content: feedback, timestamp: new Date().toISOString() },
      ]
      await createCoachSession({
        user_id: user.id,
        trigger: 'weekly_review',
        messages: messages as unknown as import('../types/database').Json,
        summary: feedback.slice(0, 200),
      })
      setSaved(true)
    } catch (err) {
      console.error(err)
    }
  }

  function nextStep() {
    if (step === 4 && !feedback) {
      handleGenerateFeedback()
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const canProceed = () => {
    if (step === 0) return !summaryLoading
    if (step === 1) return wentWell.trim().length > 0
    if (step === 2) return wouldChange.trim().length > 0
    return true
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem' }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 4,
              background: i <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        {step + 1} / {STEPS.length}
      </p>
      <h2
        style={{
          fontFamily: 'Lora, serif',
          color: 'var(--text-primary)',
          fontSize: '1.4rem',
          marginBottom: '1.25rem',
        }}
      >
        {STEPS[step]}
      </h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── Step 0: AI Summary ── */}
          {step === 0 && (
            <div>
              {summaryLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.9rem' }}>Coach analysiert deine Woche…</span>
                </div>
              )}
              {summaryError && (
                <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{summaryError}</p>
              )}
              {summary && !summaryLoading && (
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '1rem 1.25rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {summary}
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: Was lief gut? ── */}
          {step === 1 && (
            <textarea
              autoFocus
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="Was lief diese Woche richtig gut? Große und kleine Dinge zählen…"
              rows={6}
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '0.85rem',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* ── Step 2: Was ändern? ── */}
          {step === 2 && (
            <textarea
              autoFocus
              value={wouldChange}
              onChange={(e) => setWouldChange(e.target.value)}
              placeholder="Was würdest du nächste Woche anders machen? Was hat dich ausgebremst?"
              rows={6}
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '0.85rem',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* ── Step 3: Wochenziele abhaken ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {weekGoalsLoading && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade Ziele…</p>
              )}
              {!weekGoalsLoading && weekGoals.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Keine Wochenziele für diese Woche gefunden.
                </p>
              )}
              {weekGoals.map((goal) => (
                <div
                  key={goal.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '0.85rem 1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <button
                      onClick={() => handleToggleComplete(goal)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: goal.progress === 100 ? 'var(--accent)' : 'var(--text-muted)', display: 'flex' }}
                    >
                      {goal.progress === 100
                        ? <CheckCircle2 size={20} />
                        : <Circle size={20} />}
                    </button>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        textDecoration: goal.progress === 100 ? 'line-through' : 'none',
                        flex: 1,
                      }}
                    >
                      {goal.title}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {goal.progress}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={goal.progress}
                    onChange={(e) => handleProgressUpdate(goal.id, Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Step 4: Neue Wochenziele ── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {monthlyGoals[0] && (
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '0.65rem 0.9rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.25rem',
                  }}
                >
                  Monatsziel: <strong style={{ color: 'var(--text-primary)' }}>{monthlyGoals[0].title}</strong>
                </div>
              )}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Woche {getCurrentWeek() + 1} — max. 3 Ziele
              </p>
              {newGoalTitles.map((title, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    autoFocus={i === 0}
                    value={title}
                    onChange={(e) => updateNewGoalTitle(i, e.target.value)}
                    placeholder={`Ziel ${i + 1}…`}
                    style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  {newGoalTitles.length > 1 && (
                    <button
                      onClick={() => removeNewGoalField(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.4rem', display: 'flex' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {newGoalTitles.length < 3 && (
                <button
                  onClick={addNewGoalField}
                  style={{
                    background: 'none',
                    border: '1px dashed var(--border)',
                    borderRadius: 10,
                    padding: '0.65rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <Plus size={16} /> Weiteres Ziel
                </button>
              )}
            </div>
          )}

          {/* ── Step 5: KI-Feedback ── */}
          {step === 5 && (
            <div>
              {feedbackLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.9rem' }}>Coach schreibt Feedback…</span>
                </div>
              )}
              {feedbackError && (
                <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{feedbackError}</p>
              )}
              {feedback && !feedbackLoading && (
                <>
                  <div
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      marginBottom: '1.25rem',
                    }}
                  >
                    {feedback}
                  </div>
                  <button
                    onClick={handleFinish}
                    disabled={saved}
                    style={{
                      width: '100%',
                      background: saved ? 'var(--surface)' : 'var(--accent)',
                      border: saved ? '1px solid var(--border)' : 'none',
                      borderRadius: 12,
                      padding: '0.9rem',
                      color: saved ? 'var(--text-muted)' : '#fff',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: saved ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {saved ? '✓ Gespeichert' : 'Wochen-Review abschließen'}
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step < STEPS.length - 1 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            style={{
              background: canProceed() ? 'var(--accent)' : 'var(--surface)',
              border: canProceed() ? 'none' : '1px solid var(--border)',
              borderRadius: 12,
              padding: '0.75rem 1.5rem',
              color: canProceed() ? '#fff' : 'var(--text-muted)',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontFamily: 'inherit',
            }}
          >
            Weiter <ChevronRight size={16} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
