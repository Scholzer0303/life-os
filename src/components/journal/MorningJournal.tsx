import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { createJournalEntry, getTodayEntries, parseTimeblocks, getRecurringBlocks, getExceptionsForBlocks, upsertBlockException } from '../../lib/db'
import { todayISO } from '../../lib/utils'
import ProgressBar from '../onboarding/ProgressBar'
import MorningStep1Feeling from './MorningStep1Feeling'
import MorningStep2Goal from './MorningStep2Goal'
import MorningStep3Blockers from './MorningStep3Blockers'
import MorningStep4Timeboxing from './MorningStep4Timeboxing'
import MorningStep5Summary from './MorningStep5Summary'
import type { TimeBlock, DailyTask, DayBlock, RecurringBlock, BlockException } from '../../types'
import type { Json } from '../../types/database'

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function blockOccursOnDate(block: RecurringBlock, dateStr: string): boolean {
  if (dateStr < block.start_date) return false
  if (block.end_date && dateStr > block.end_date) return false
  const dow = new Date(dateStr + 'T12:00:00').getDay()
  switch (block.recurrence_type) {
    case 'none': return dateStr === block.start_date
    case 'daily': return true
    case 'weekdays': return dow >= 1 && dow <= 5
    case 'weekly': return block.recurrence_day === dow
    default: return false
  }
}

function resolveBlocksForDate(blocks: RecurringBlock[], exceptions: BlockException[], dateStr: string): DayBlock[] {
  const exMap = new Map<string, BlockException>()
  for (const ex of exceptions) {
    if (ex.exception_date === dateStr) exMap.set(ex.block_id, ex)
  }
  const result: DayBlock[] = []
  for (const block of blocks) {
    if (!blockOccursOnDate(block, dateStr)) continue
    const ex = exMap.get(block.id)
    if (ex?.is_deleted) continue
    result.push({
      id: block.id,
      exception_id: ex?.id,
      date: dateStr,
      title: ex?.modified_title ?? block.title,
      start_time: ex?.modified_start_time ?? block.start_time,
      end_time: ex?.modified_end_time ?? block.end_time,
      color: ex?.modified_color ?? block.color,
      recurrence_type: block.recurrence_type,
      is_modified: !!ex,
    })
  }
  return result.sort((a, b) => a.start_time.localeCompare(b.start_time))
}

interface MorningData {
  feelingScore: number | null
  feelingText: string
  mainGoal: string
  linkedGoalId: string | null
  identityAction: string
  blockers: string
  timeblocks: TimeBlock[]
  dailyTasks: DailyTask[]
}

export default function MorningJournal() {
  const { user, goals, profile } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<MorningData>({
    feelingScore: null,
    feelingText: '',
    mainGoal: '',
    linkedGoalId: null,
    identityAction: '',
    blockers: '',
    timeblocks: [],
    dailyTasks: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [todayCalBlocks, setTodayCalBlocks] = useState<DayBlock[]>([])

  // Heutigen Eintrag + Kalender-Blöcke laden
  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    const today = toDateString(new Date())
    Promise.all([
      getTodayEntries(user.id),
      getRecurringBlocks(user.id),
    ]).then(async ([entries, blocks]) => {
      const existing = entries.find((e) => e.type === 'morning')
      if (existing) {
        setData({
          feelingScore: existing.feeling_score,
          feelingText: existing.free_text ?? '',
          mainGoal: existing.main_goal_today ?? '',
          linkedGoalId: (existing.linked_goal_ids as string[] | null)?.[0] ?? null,
          identityAction: existing.identity_action ?? '',
          blockers: existing.potential_blockers ?? '',
          timeblocks: parseTimeblocks(existing),
          dailyTasks: Array.isArray(existing.daily_tasks) ? existing.daily_tasks as unknown as DailyTask[] : [],
        })
      }
      const blockIds = blocks.map(b => b.id)
      const exceptions = await getExceptionsForBlocks(blockIds)
      const dayBlocks = resolveBlocksForDate(blocks as RecurringBlock[], exceptions as BlockException[], today)
      setTodayCalBlocks(dayBlocks)
    })
      .catch((err) => console.error('Morgenjournal laden:', err))
      .finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function next(patch: Partial<MorningData>) {
    setData((prev) => ({ ...prev, ...patch }))
    setStep((s) => s + 1)
  }

  function back() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSave() {
    if (!user || !data.feelingScore) return
    setIsSaving(true)
    setSaveError(null)
    try {
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
        daily_tasks: data.dailyTasks as unknown as Json,
        linked_goal_ids: data.linkedGoalId ? [data.linkedGoalId] : [],
      })
      navigate('/', { replace: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
      setIsSaving(false)
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
            onNext={(score, text) => next({ feelingScore: score, feelingText: text })}
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
          <MorningStep4Timeboxing
            key="ms4"
            initialBlocks={data.timeblocks}
            calendarBlocks={todayCalBlocks}
            onSaveExceptions={async (exceptions) => {
              for (const ex of exceptions) {
                await upsertBlockException(ex)
              }
            }}
            onNext={(timeblocks) => next({ timeblocks })}
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
