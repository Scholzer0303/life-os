import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { createJournalEntry, getTodayEntries, updateJournalEntry, updateGoalTask, getTodayGoalTasks } from '../../lib/db'
import { getEveningImpulse } from '../../lib/claude'
import type { DailyTask } from '../../types'
import { todayISO } from '../../lib/utils'
import HabitChecklist from '../habits/HabitChecklist'
import ProgressBar from '../onboarding/ProgressBar'
import type { JournalEntryRow } from '../../types/database'

// ── Energy Scale ──────────────────────────────────────────────────────────────
function energyColor(n: number): string {
  if (n <= 4) return 'var(--accent-warm)'
  if (n <= 7) return 'var(--streak)'
  return 'var(--accent-green)'
}

function energyLabel(n: number): string {
  if (n <= 2) return 'Sehr niedrig'
  if (n <= 4) return 'Niedrig'
  if (n <= 6) return 'Mittel'
  if (n <= 8) return 'Hoch'
  return 'Sehr hoch'
}

function EnergyScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const levels = Array.from({ length: 10 }, (_, i) => i + 1)
  const display = hovered ?? value
  return (
    <div>
      {/* Label-Anzeige */}
      <div style={{ height: '1.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {display !== null ? (
          <>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', fontWeight: 700, color: energyColor(display), lineHeight: 1 }}>
              {display}
            </span>
            <span style={{ fontSize: '0.875rem', color: energyColor(display), fontWeight: 500 }}>
              — {energyLabel(display)}
            </span>
          </>
        ) : (
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Wie war deine Energie heute?</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        {levels.map((n) => {
          const isSelected = value === n
          const isHovered = hovered === n
          const color = energyColor(n)
          const active = isSelected || isHovered
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`Energie-Level ${n}`}
              aria-pressed={isSelected}
              style={{
                flex: 1,
                height: '2.6rem',
                background: active ? color : 'var(--bg-secondary)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: `2px solid ${active ? color : 'transparent'}`,
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.12s',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                boxShadow: isSelected ? `0 3px 8px ${color}40` : 'none',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Step components ───────────────────────────────────────────────────────────
function StepTextarea({
  heading, hint, placeholder, value, onChange, onNext, onBack,
  canSkip = false,
}: {
  heading: string; hint?: string; placeholder: string
  value: string; onChange: (v: string) => void
  onNext: () => void; onBack: () => void; canSkip?: boolean
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>{heading}</h2>
      {hint && <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>{hint}</p>}
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        rows={4} autoFocus
        style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, marginBottom: '1.5rem' }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onBack} style={BACK_BTN}>←</button>
        <button onClick={onNext} style={{ flex: 1, padding: '0.9rem', background: (!value.trim() && !canSkip) ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: (!value.trim() && !canSkip) ? 'not-allowed' : 'pointer' }} disabled={!value.trim() && !canSkip}>
          {!value.trim() && canSkip ? 'Überspringen →' : 'Weiter →'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface EveningData {
  accomplished: string
  whatBlocked: string
  energyLevel: number | null
  freeText: string
  gratitude: string
  nextDayTasks: string[]
}

interface EveningDraft { data: EveningData; step: number; date: string }

function getEveningDraftKey(date: string): string {
  return `life_os_draft_evening_${date}`
}

function readEveningDraft(date: string): EveningDraft | null {
  try {
    const raw = localStorage.getItem(getEveningDraftKey(date))
    return raw ? (JSON.parse(raw) as EveningDraft) : null
  } catch { return null }
}

export default function EveningJournal() {
  const { user, profile } = useStore()
  const navigate = useNavigate()

  // Draft synchron aus localStorage lesen — überlebt Navigation + Seiten-Reload
  const todayStr = todayISO()
  const validDraft = readEveningDraft(todayStr)

  const [step, setStep] = useState(() => validDraft?.step ?? 1)
  const [data, setData] = useState<EveningData>(() => {
    const draft = validDraft?.data
    if (draft) {
      return {
        ...draft,
        nextDayTasks: Array.isArray(draft.nextDayTasks) ? draft.nextDayTasks : [''],
      }
    }
    return { accomplished: '', whatBlocked: '', energyLevel: null, freeText: '', gratitude: '', nextDayTasks: [''] }
  })
  const [savedEntry, setSavedEntry] = useState<JournalEntryRow | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [eveningImpulse, setEveningImpulse] = useState<string | null>(null)
  const [impulseLoading, setImpulseLoading] = useState(false)
  const [impulseError, setImpulseError] = useState<string | null>(null)
  const [morningGoal, setMorningGoal] = useState<string | null>(null)
  const [morningEntryId, setMorningEntryId] = useState<string | null>(null)
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])

  useEffect(() => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      getTodayEntries(user.id),
      getTodayGoalTasks(user.id, today),
    ]).then(([entries, todayGoalTasks]) => {
      const morning = entries.find((e) => e.type === 'morning')
      const evening = entries.find((e) => e.type === 'evening')

      if (morning) {
        setMorningGoal(morning.main_goal_today ?? null)
        setMorningEntryId(morning.id)
        const unlinkedTasks: DailyTask[] = Array.isArray(morning.daily_tasks)
          ? morning.daily_tasks as unknown as DailyTask[]
          : []
        const linkedTasks: DailyTask[] = todayGoalTasks.map((gt) => ({
          id: gt.id,
          title: gt.title,
          completed: gt.completed,
          goal_id: gt.goal_id,
          goal_task_id: gt.id,
        }))
        const allTasks = [...unlinkedTasks, ...linkedTasks]
        setDailyTasks(allTasks)
        // accomplished mit erledigten Tasks vorausfüllen — nur wenn noch kein Draft und kein Abend-Eintrag
        if (!validDraft && !evening) {
          const done = allTasks.filter((t) => t.completed).map((t) => `- ${t.title}`)
          if (done.length > 0) {
            patchData({ accomplished: done.join('\n') })
          }
        }
      }

      // Bereits gespeicherter Abend-Eintrag → Daten laden, Draft verwerfen, Abschluss-Screen zeigen
      if (evening) {
        localStorage.removeItem(getEveningDraftKey(todayStr))
        const loadedTasks = Array.isArray((evening as { next_day_tasks?: unknown }).next_day_tasks)
          ? ((evening as { next_day_tasks: string[] }).next_day_tasks)
          : ['']
        setData({
          accomplished: (evening as { accomplished?: string | null }).accomplished ?? '',
          whatBlocked: (evening as { what_blocked?: string | null }).what_blocked ?? '',
          energyLevel: (evening as { energy_level?: number | null }).energy_level ?? null,
          freeText: evening.free_text ?? '',
          gratitude: (evening as { gratitude?: string | null }).gratitude ?? '',
          nextDayTasks: loadedTasks,
        })
        setSavedEntry(evening)
        setStep(7)
      }
    }).catch(() => {})
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleDailyTask(task: DailyTask) {
    const updatedList = dailyTasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    setDailyTasks(updatedList)
    // accomplished-Feld bei jeder Änderung aktualisieren
    const done = updatedList.filter((t) => t.completed).map((t) => `- ${t.title}`)
    patch({ accomplished: done.join('\n') })

    if (task.goal_task_id) {
      // Verknüpfter Task → goal_task updaten
      updateGoalTask(task.goal_task_id, { completed: !task.completed })
        .catch((err) => console.error('goal_task update:', err))
    } else {
      // Unverknüpfter Task → daily_tasks JSON aktualisieren
      if (morningEntryId) {
        const unlinkedOnly = updatedList.filter((t) => !t.goal_task_id)
        updateJournalEntry(morningEntryId, { daily_tasks: unlinkedOnly as unknown as import('../../types/database').Json })
          .catch((err) => console.error('daily_tasks update:', err))
      }
    }
  }

  // Draft synchron im Event-Handler speichern — kein useEffect-Timing-Problem
  function saveDraft(newData: EveningData, newStep: number) {
    if (savedEntry) return
    localStorage.setItem(getEveningDraftKey(todayStr), JSON.stringify({ data: newData, step: newStep, date: todayStr }))
  }

  function patchData(updates: Partial<EveningData>) {
    const newData = { ...data, ...updates }
    setData(newData)
    saveDraft(newData, step)
  }

  // patch bleibt als Alias für interne Aufrufe (handleToggleDailyTask)
  function patch(updates: Partial<EveningData>) { patchData(updates) }

  function next() {
    const newStep = step + 1
    setStep(newStep)
    saveDraft(data, newStep)
  }

  function back() {
    const newStep = Math.max(1, step - 1)
    setStep(newStep)
    saveDraft(data, newStep)
  }

  async function handleSave() {
    if (!user || !data.energyLevel) return
    setIsSaving(true); setSaveError(null)
    try {
      const filledTasks = data.nextDayTasks.filter((t) => t.trim())
      const payload = {
        accomplished: data.accomplished || null,
        what_blocked: data.whatBlocked || null,
        energy_level: data.energyLevel,
        free_text: data.freeText || null,
        gratitude: data.gratitude || null,
        next_day_tasks: filledTasks.length > 0 ? filledTasks : null,
      }
      const entry = editingEntryId
        ? await updateJournalEntry(editingEntryId, payload)
        : await createJournalEntry({ user_id: user.id, entry_date: todayISO(), type: 'evening', ...payload })
      localStorage.removeItem(getEveningDraftKey(todayStr))
      setEditingEntryId(null)
      setSavedEntry(entry)
      setStep(7)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
      setIsSaving(false)
    }
  }

  function handleEdit() {
    if (!savedEntry) return
    setEditingEntryId(savedEntry.id)
    setSavedEntry(null)
    setStep(1)
  }

  async function handleGetEveningImpulse() {
    if (!data.energyLevel) return
    setImpulseLoading(true)
    setImpulseError(null)
    try {
      const result = await getEveningImpulse(data.accomplished, data.energyLevel, profile ?? null)
      setEveningImpulse(result)
    } catch (err) {
      console.error('getEveningImpulse Fehler:', err)
      setImpulseError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setImpulseLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abend-Journal</span>
      </div>
      {step < 7 && <ProgressBar current={step} total={6} />}

      {/* Morgen-Ziel-Referenz */}
      {morningGoal && step < 7 && (
        <div
          style={{
            padding: '0.55rem 0.875rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}
        >
          Dein heutiges Ziel war:{' '}
          <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>„{morningGoal}"</span>
        </div>
      )}

      {saveError && (
        <div style={{ padding: '0.75rem 1rem', background: '#FFF0EE', border: '1px solid var(--accent-warm)', borderRadius: '8px', color: 'var(--accent-warm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{saveError}</div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="e1" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>Was hast du heute geschafft?</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>Groß oder klein — was hat stattgefunden?</p>

            {/* Tages-Tasks mit Checkboxen */}
            {dailyTasks.length > 0 && (
              <div style={{ marginBottom: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.6rem' }}>
                  Deine Aufgaben heute
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {dailyTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleToggleDailyTask(task)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0', textAlign: 'left' }}
                    >
                      <span style={{ color: task.completed ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0, fontSize: '1.1rem' }}>
                        {task.completed ? '☑' : '☐'}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', lineHeight: 1.4 }}>
                        {task.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={data.accomplished}
              onChange={(e) => patch({ accomplished: e.target.value })}
              placeholder="Heute habe ich…"
              rows={4} autoFocus
              style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, marginBottom: '1.5rem' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => navigate(-1)} style={BACK_BTN}>←</button>
              <button onClick={next} style={{ flex: 1, padding: '0.9rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}>
                Weiter →
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="e2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>Habits für heute</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>Hake ab, was du heute geschafft hast.</p>
            <HabitChecklist date={todayISO()} />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={back} style={BACK_BTN}>←</button>
              <button onClick={next} style={{ flex: 1, padding: '0.9rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}>
                Weiter →
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <StepTextarea key="e3"
            heading="Was hat dich aufgehalten?"
            hint="Keine Schuld, nur Klarheit."
            placeholder="Mich hat gebremst…"
            value={data.whatBlocked}
            onChange={(v) => patch({ whatBlocked: v })}
            onNext={next} onBack={back} canSkip
          />
        )}

        {step === 4 && (
          <motion.div key="e4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>Wie ist dein Energie-Level?</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.5 }}>1 = leer, 10 = top.</p>
            <EnergyScale value={data.energyLevel} onChange={(v) => patch({ energyLevel: v })} />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button onClick={back} style={BACK_BTN}>←</button>
              <button onClick={next} disabled={!data.energyLevel}
                style={{ flex: 1, padding: '0.9rem', background: data.energyLevel ? 'var(--accent)' : 'var(--text-muted)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: data.energyLevel ? 'pointer' : 'not-allowed' }}>
                Weiter →
              </button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="e5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>Was liegt dir noch auf der Seele?</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>Optional — schreib es raus.</p>
            <textarea
              value={data.freeText} onChange={(e) => patch({ freeText: e.target.value })}
              placeholder="Gedanken, Ideen, Gefühle…" rows={4}
              style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, marginBottom: '1.25rem' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />

            {/* Dankbarkeit */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
                🙏 Wofür bin ich heute dankbar? (optional)
              </p>
              <textarea
                value={data.gratitude} onChange={(e) => patch({ gratitude: e.target.value })}
                placeholder="Mindestens eine Sache…" rows={2}
                style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={back} style={BACK_BTN}>←</button>
              <button onClick={next} style={{ flex: 1, padding: '0.9rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}>
                Weiter →
              </button>
            </div>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div key="e6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>Was planst du für morgen?</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Optional — max. 4 Aufgaben. Erscheinen morgen früh vorausgefüllt.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {data.nextDayTasks.map((task, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '1.2rem' }}>{idx + 1}.</span>
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => {
                      const updated = [...data.nextDayTasks]
                      updated[idx] = e.target.value
                      patchData({ nextDayTasks: updated })
                    }}
                    placeholder={`Aufgabe ${idx + 1}…`}
                    style={{
                      flex: 1, padding: '0.7rem 0.9rem',
                      border: '1.5px solid var(--border)', borderRadius: '10px',
                      fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif',
                      background: 'var(--bg-primary)', color: 'var(--text-primary)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                  {data.nextDayTasks.length > 1 && (
                    <button
                      onClick={() => {
                        const updated = data.nextDayTasks.filter((_, i) => i !== idx)
                        patchData({ nextDayTasks: updated })
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0 0.25rem', flexShrink: 0 }}
                      aria-label="Aufgabe entfernen"
                    >×</button>
                  )}
                </div>
              ))}
              {data.nextDayTasks.length < 4 && (
                <button
                  onClick={() => patchData({ nextDayTasks: [...data.nextDayTasks, ''] })}
                  style={{
                    padding: '0.6rem 1rem', background: 'none',
                    border: '1.5px dashed var(--border)', borderRadius: '10px',
                    fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif',
                    color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                >
                  + Aufgabe hinzufügen
                </button>
              )}
            </div>

            {saveError && (
              <div style={{ padding: '0.75rem 1rem', background: '#FFF0EE', border: '1px solid var(--accent-warm)', borderRadius: '8px', color: 'var(--accent-warm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{saveError}</div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={back} style={BACK_BTN}>←</button>
              <button onClick={handleSave} disabled={isSaving}
                style={{ flex: 1, padding: '0.9rem', background: isSaving ? 'var(--text-muted)' : 'var(--accent-green)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Wird gespeichert…' : 'Journal speichern ✓'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 7 && !savedEntry && (
          <motion.div key="e7-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Wird geladen…</div>
          </motion.div>
        )}

        {step === 7 && savedEntry && (
          <motion.div key="e7" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {/* Header */}
            <div style={{ textAlign: 'center', padding: '1rem 0 1.25rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌙</div>
              <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
                Tag abgeschlossen.
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Kopf ist frei.
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {/* Energie */}
              <div style={{
                flex: 1, padding: '0.85rem', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Energie heute
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.5rem',
                  color: data.energyLevel
                    ? (data.energyLevel <= 4 ? 'var(--accent-warm)' : data.energyLevel <= 7 ? 'var(--streak)' : 'var(--accent-green)')
                    : 'var(--text-primary)',
                }}>
                  {data.energyLevel}/10
                </div>
              </div>
              {/* Tasks */}
              {dailyTasks.length > 0 && (
                <div style={{
                  flex: 1, padding: '0.85rem', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                    Aufgaben
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                    {dailyTasks.filter((t) => t.completed).length}/{dailyTasks.length}
                  </div>
                </div>
              )}
            </div>

            {/* Mentor-Feedback */}
            <div style={{ marginBottom: '1.5rem' }}>
              {!eveningImpulse && !impulseLoading && (
                <button
                  onClick={handleGetEveningImpulse}
                  style={{
                    width: '100%', padding: '0.85rem',
                    background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                    borderRadius: '10px', fontSize: '0.95rem',
                    fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  💡 Mentor-Feedback holen
                </button>
              )}
              {impulseLoading && (
                <div style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                  Mentor denkt…
                </div>
              )}
              {impulseError && (
                <div style={{ padding: '0.75rem 1rem', background: '#FFF0EE', border: '1px solid var(--accent-warm)', borderRadius: '10px', color: 'var(--accent-warm)', fontSize: '0.875rem' }}>
                  {impulseError}
                </div>
              )}
              {eveningImpulse && (
                <div style={{
                  padding: '1rem 1.1rem',
                  background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))',
                  border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))',
                  borderRadius: '10px', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)',
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                    Mentor
                  </span>
                  <ReactMarkdown>{eveningImpulse}</ReactMarkdown>
                </div>
              )}
            </div>

            <button onClick={handleEdit}
              style={{ width: '100%', padding: '0.75rem', background: 'none', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '0.75rem' }}>
              Eintrag bearbeiten
            </button>
            <button onClick={() => navigate('/', { replace: true })}
              style={{ width: '100%', padding: '0.9rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}>
              → Zum Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const BACK_BTN: React.CSSProperties = {
  flex: '0 0 auto', padding: '0.9rem 1.25rem', background: 'none',
  border: '1.5px solid var(--border)', borderRadius: '10px', cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', fontSize: '0.95rem',
}
