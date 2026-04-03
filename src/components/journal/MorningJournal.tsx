import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { createJournalEntry } from '../../lib/db'
import { todayISO } from '../../lib/utils'
import ProgressBar from '../onboarding/ProgressBar'
import MorningStep1Feeling from './MorningStep1Feeling'
import MorningStep2Goal from './MorningStep2Goal'
import MorningStep3Blockers from './MorningStep3Blockers'
import MorningStep4Timeboxing from './MorningStep4Timeboxing'
import MorningStep5Summary from './MorningStep5Summary'
import type { TimeBlock } from '../../types'
import type { Json } from '../../types/database'

interface MorningData {
  feelingScore: number | null
  feelingText: string
  mainGoal: string
  linkedGoalId: string | null
  identityAction: string
  blockers: string
  timeblocks: TimeBlock[]
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
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
            identityStatement={profile?.identity_statement ?? null}
            onNext={(goal, linkedGoalId, identityAction) => next({ mainGoal: goal, linkedGoalId, identityAction })}
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
