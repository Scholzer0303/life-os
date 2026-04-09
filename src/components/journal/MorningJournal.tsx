import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { createJournalEntry, getTodayEntries, parseTimeblocks, createGoalTask, updateGoalTask, getTodayGoalTasks, getYesterdayOpenGoalTasks, deleteGoalTask } from '../../lib/db'
import { getMorningImpulse } from '../../lib/claude'
import { todayISO } from '../../lib/utils'
import ProgressBar from '../onboarding/ProgressBar'
import MorningStep1Feeling from './MorningStep1Feeling'
import MorningStep2Goal from './MorningStep2Goal'
import MorningStep3Blockers from './MorningStep3Blockers'
import MorningStep4CalendarCheck from './MorningStep4CalendarCheck'
import MorningStep5Summary from './MorningStep5Summary'
import type { TimeBlock, DailyTask } from '../../types'
import type { Json, GoalTaskRow } from '../../types/database'
import MorningCarryOverDialog from './MorningCarryOverDialog'

interface MorningData {
  feelingScore: number | null
  feelingText: string
  weight: number | null
  sleepScore: number | null
  mainGoal: string
  linkedGoalId: string | null
  identityAction: string
  blockers: string
  timeblocks: TimeBlock[]
  dailyTasks: DailyTask[]
  calendarPlanned: boolean | null
}

interface MorningDraft { data: MorningData; step: number; date: string }

function getMorningDraftKey(date: string): string {
  return `life_os_draft_morning_${date}`
}

function readMorningDraft(date: string): MorningDraft | null {
  try {
    const raw = localStorage.getItem(getMorningDraftKey(date))
    return raw ? (JSON.parse(raw) as MorningDraft) : null
  } catch { return null }
}

const MORNING_EMPTY: MorningData = {
  feelingScore: null, feelingText: '', weight: null, sleepScore: null,
  mainGoal: '', linkedGoalId: null, identityAction: '',
  blockers: '', timeblocks: [], dailyTasks: [], calendarPlanned: null,
}

export default function MorningJournal() {
  const { user, goals, profile } = useStore()
  const navigate = useNavigate()
  const metricsEnabled = localStorage.getItem('metrics_enabled') !== 'false'

  // Draft synchron aus localStorage lesen — überlebt Navigation + Seiten-Reload
  const todayStr = todayISO()
  const validDraft = readMorningDraft(todayStr)

  const [step, setStep] = useState(() => validDraft?.step ?? 1)
  const [data, setData] = useState<MorningData>(() => validDraft?.data ?? { ...MORNING_EMPTY })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [carryOverTasks, setCarryOverTasks] = useState<GoalTaskRow[]>([])
  const [showCompletion, setShowCompletion] = useState(false)
  const [impulse, setImpulse] = useState<string | null>(null)
  const [impulseLoading, setImpulseLoading] = useState(false)
  const [impulseError, setImpulseError] = useState<string | null>(null)

  // Heutigen Eintrag laden
  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    const today = todayISO()
    Promise.all([
      getTodayEntries(user.id),
      getTodayGoalTasks(user.id, today),
    ]).then(([entries, todayGoalTasks]) => {
      const existing = entries.find((e) => e.type === 'morning')
      if (existing) {
        // Bereits gespeicherter Eintrag → Draft verwerfen, Supabase-Daten laden
        localStorage.removeItem(getMorningDraftKey(todayStr))
        const unlinkedTasks: DailyTask[] = Array.isArray(existing.daily_tasks)
          ? existing.daily_tasks as unknown as DailyTask[]
          : []
        const linkedTasks: DailyTask[] = todayGoalTasks.map((gt) => ({
          id: gt.id,
          title: gt.title,
          completed: gt.completed,
          goal_id: gt.goal_id,
          goal_task_id: gt.id,
        }))
        setData({
          feelingScore: existing.feeling_score,
          feelingText: existing.free_text ?? '',
          weight: (existing as { weight?: number | null }).weight ?? null,
          sleepScore: (existing as { sleep_score?: number | null }).sleep_score ?? null,
          mainGoal: existing.main_goal_today ?? '',
          linkedGoalId: (existing.linked_goal_ids as string[] | null)?.[0] ?? null,
          identityAction: existing.identity_action ?? '',
          blockers: existing.potential_blockers ?? '',
          timeblocks: parseTimeblocks(existing),
          dailyTasks: [...unlinkedTasks, ...linkedTasks],
          calendarPlanned: (existing as { calendar_planned?: boolean | null }).calendar_planned ?? null,
        })
        setStep(1)
      } else if (!validDraft) {
        // Kein Draft, kein Supabase-Eintrag → Carry-over Dialog prüfen
        getYesterdayOpenGoalTasks(user.id)
          .then(setCarryOverTasks)
          .catch((err) => console.error('Carry-over Tasks laden:', err))
      }
      // Wenn validDraft: useState hat bereits korrekte Werte gesetzt — nichts zu tun
    })
      .catch((err) => console.error('Morgenjournal laden:', err))
      .finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCarryOverComplete(kept: GoalTaskRow[], deleted: GoalTaskRow[]) {
    const today = new Date().toISOString().split('T')[0]
    await Promise.all([
      ...kept.map((t) => updateGoalTask(t.id, { planned_date: today })),
      ...deleted.map((t) => deleteGoalTask(t.id)),
    ]).catch((err) => console.error('Carry-over Aktionen:', err))
    setCarryOverTasks([])
  }

  // Draft synchron im Event-Handler speichern — kein useEffect-Timing-Problem
  function saveDraft(newData: MorningData, newStep: number) {
    localStorage.setItem(getMorningDraftKey(todayStr), JSON.stringify({ data: newData, step: newStep, date: todayStr }))
  }

  function next(patch: Partial<MorningData>) {
    const newData = { ...data, ...patch }
    const newStep = step + 1
    saveDraft(newData, newStep)
    setData(newData)
    setStep(newStep)
  }

  function back() {
    const newStep = Math.max(1, step - 1)
    saveDraft(data, newStep)
    setStep(newStep)
  }

  async function handleSave() {
    if (!user || !data.feelingScore) return
    setIsSaving(true)
    setSaveError(null)
    try {
      // Verknüpfte Tasks (mit Wochenziel) → goal_tasks Tabelle
      // Unverknüpfte Tasks → daily_tasks JSON im Journal-Eintrag
      const linkedTasks = data.dailyTasks.filter((t) => t.goal_id)
      const unlinkedTasks = data.dailyTasks.filter((t) => !t.goal_id)

      await createJournalEntry({
        user_id: user.id,
        entry_date: todayISO(),
        type: 'morning',
        feeling_score: data.feelingScore,
        free_text: data.feelingText || null,
        main_goal_today: data.mainGoal,
        identity_action: data.identityAction || null,
        potential_blockers: data.blockers || null,
        timeblocks: data.timeblocks as unknown as Json,
        daily_tasks: unlinkedTasks as unknown as Json,
        linked_goal_ids: data.linkedGoalId ? [data.linkedGoalId] : [],
        calendar_planned: data.calendarPlanned,
        weight: data.weight,
        sleep_score: data.sleepScore,
      } as Parameters<typeof createJournalEntry>[0])

      // Verknüpfte Tasks als goal_tasks speichern
      for (const task of linkedTasks) {
        if (task.goal_task_id) {
          // Bereits vorhanden (Re-Save) — nur Titel aktualisieren
          await updateGoalTask(task.goal_task_id, { title: task.title })
        } else {
          // Neu → goal_task mit planned_date erstellen
          await createGoalTask({
            goal_id: task.goal_id!,
            user_id: user.id,
            title: task.title,
            completed: task.completed,
            planned_date: todayISO(),
          })
        }
      }

      localStorage.removeItem(getMorningDraftKey(todayStr))
      setShowCompletion(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
      setIsSaving(false)
    }
  }

  async function handleGetImpulse() {
    setImpulseLoading(true)
    setImpulseError(null)
    try {
      const taskTitles = data.dailyTasks.map((t) => t.title)
      const result = await getMorningImpulse(data.mainGoal, taskTitles, profile ?? null)
      setImpulse(result)
    } catch (err) {
      console.error('getMorningImpulse Fehler:', err)
      setImpulseError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setImpulseLoading(false)
    }
  }

  const linkedGoalTitle = data.linkedGoalId
    ? goals.find((g) => g.id === data.linkedGoalId)?.title
    : undefined

  if (isLoading) {
    return (
      <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Lade…
      </div>
    )
  }

  // Übertrag-Dialog: erscheint nur beim ersten Öffnen des Tages mit offenen gestrigen Tasks
  if (carryOverTasks.length > 0) {
    return (
      <div>
        <div style={{ marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Morgen-Journal
          </span>
        </div>
        <MorningCarryOverDialog
          tasks={carryOverTasks}
          onComplete={handleCarryOverComplete}
        />
      </div>
    )
  }

  // Abschluss-Seite nach erfolgreichem Speichern
  if (showCompletion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            Guter Start.
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Du weißt was heute zählt. Starte den Tag.
          </p>
        </div>

        {/* Mentor-Impuls */}
        <div style={{ margin: '1.5rem 0' }}>
          {!impulse && !impulseLoading && (
            <button
              onClick={handleGetImpulse}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              💡 Mentor-Impuls holen
            </button>
          )}
          {impulseLoading && (
            <div style={{
              padding: '1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}>
              Mentor denkt…
            </div>
          )}
          {impulseError && (
            <div style={{
              padding: '0.75rem 1rem',
              background: '#FFF0EE',
              border: '1px solid var(--accent-warm)',
              borderRadius: '10px',
              color: 'var(--accent-warm)',
              fontSize: '0.875rem',
            }}>
              {impulseError}
            </div>
          )}
          {impulse && (
            <div style={{
              padding: '1rem 1.1rem',
              background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))',
              borderRadius: '10px',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                Mentor
              </span>
              {impulse}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/', { replace: true })}
          style={{
            width: '100%',
            padding: '0.9rem',
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
          → Zum Dashboard
        </button>
      </motion.div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Morgen-Journal
        </span>
      </div>
      <ProgressBar current={step} total={5} />

      {saveError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#FFF0EE',
            border: '1px solid var(--accent-warm)',
            borderRadius: '8px',
            color: 'var(--accent-warm)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {saveError}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <MorningStep1Feeling
            key="ms1"
            initialScore={data.feelingScore}
            initialText={data.feelingText}
            initialWeight={data.weight}
            initialSleepScore={data.sleepScore}
            metricsEnabled={metricsEnabled}
            onNext={(score, text, weight, sleepScore) => next({ feelingScore: score, feelingText: text, weight, sleepScore })}
          />
        )}
        {step === 2 && (
          <MorningStep2Goal
            key="ms2"
            initialGoal={data.mainGoal}
            initialLinkedGoalId={data.linkedGoalId}
            initialIdentityAction={data.identityAction}
            initialDailyTasks={data.dailyTasks}
            identityStatement={profile?.identity_statement ?? null}
            onNext={(goal, linkedGoalId, identityAction, dailyTasks) => next({ mainGoal: goal, linkedGoalId, identityAction, dailyTasks })}
            onBack={back}
          />
        )}
        {step === 3 && (
          <MorningStep3Blockers
            key="ms3"
            initialBlockers={data.blockers}
            onNext={(blockers) => next({ blockers })}
            onBack={back}
          />
        )}
        {step === 4 && (
          <MorningStep4CalendarCheck
            key="ms4"
            initialValue={data.calendarPlanned}
            onNext={(calendarPlanned) => next({ calendarPlanned })}
            onBack={back}
          />
        )}
        {step === 5 && data.feelingScore && (
          <MorningStep5Summary
            key="ms5"
            feelingScore={data.feelingScore}
            feelingText={data.feelingText}
            mainGoal={data.mainGoal}
            blockers={data.blockers}
            timeblocks={data.timeblocks}
            dailyTasks={data.dailyTasks}
            linkedGoalTitle={linkedGoalTitle}
            isSaving={isSaving}
            onSave={handleSave}
            onBack={back}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
