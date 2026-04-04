import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { upsertProfile } from '../lib/db'
import { createGoal } from '../lib/db'
import { getCurrentQuarter } from '../lib/utils'
import ProgressBar from '../components/onboarding/ProgressBar'
import Step1Welcome from '../components/onboarding/Step1Welcome'
import Step2Lebensrad from '../components/onboarding/Step2Lebensrad'
import Step3_Ikigai from '../components/onboarding/Step3_Ikigai'
import Step3Werte from '../components/onboarding/Step3Werte'
import Step4FiveWhys from '../components/onboarding/Step4FiveWhys'
import Step5Nordstern from '../components/onboarding/Step5Nordstern'
import Step6_Identity from '../components/onboarding/Step6_Identity'
import Step6StoppListe from '../components/onboarding/Step6StoppListe'
import Step7QuartalZiel from '../components/onboarding/Step7QuartalZiel'
import type { OnboardingData } from '../types/onboarding'
import { DEFAULT_ONBOARDING_DATA } from '../types/onboarding'

const TOTAL_STEPS = 9
const STEP_KEY = 'life-os-onboarding-step'
const DATA_KEY = 'life-os-onboarding-data'

export default function Onboarding() {
  const { user, setProfile } = useStore()
  const navigate = useNavigate()

  const [step, setStep] = useState<number>(() => {
    const saved = localStorage.getItem(STEP_KEY)
    if (saved) {
      const n = parseInt(saved, 10)
      if (n >= 1 && n <= TOTAL_STEPS) return n
    }
    return 1
  })

  const [data, setData] = useState<OnboardingData>(() => {
    const saved = localStorage.getItem(DATA_KEY)
    if (saved) {
      try { return { ...DEFAULT_ONBOARDING_DATA, ...JSON.parse(saved) } } catch { /* ignore */ }
    }
    return { ...DEFAULT_ONBOARDING_DATA }
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => { localStorage.setItem(STEP_KEY, String(step)) }, [step])
  useEffect(() => { localStorage.setItem(DATA_KEY, JSON.stringify(data)) }, [data])

  function handleDataChange(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }))
  }

  function handleNext(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }))
    setStep((s) => s + 1)
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleFinish(updates: Partial<OnboardingData>) {
    if (!user) return
    const final: OnboardingData = { ...data, ...updates }
    setData(final)
    setIsSaving(true)
    setSaveError(null)

    try {
      // Save profile
      const profile = await upsertProfile(user.id, {
        name: final.name,
        north_star: final.northStar,
        values: final.selectedValues,
        ikigai: final.ikigai as unknown as import('../types/database').Json,
        stop_list: final.stopList,
        identity_statement: final.identityStatement || null,
        energy_pattern: {
          five_whys: final.fiveWhys,
        } as unknown as import('../types/database').Json,
        onboarding_completed: true,
      })

      // Save goal hierarchy from onboarding
      const year = new Date().getFullYear()
      const quarter = getCurrentQuarter()

      let threeYearGoalId: string | null = null
      let yearGoalId: string | null = null

      if (final.threeYearGoalTitle) {
        const g = await createGoal({
          user_id: user.id,
          title: final.threeYearGoalTitle,
          type: 'three_year',
          year,
          status: 'active',
          progress: 0,
        })
        threeYearGoalId = g.id
      }

      if (final.yearGoalTitle) {
        const g = await createGoal({
          user_id: user.id,
          title: final.yearGoalTitle,
          type: 'year',
          year,
          parent_id: threeYearGoalId,
          status: 'active',
          progress: 0,
        })
        yearGoalId = g.id
      }

      if (final.firstGoalTitle) {
        await createGoal({
          user_id: user.id,
          title: final.firstGoalTitle,
          description: final.firstGoalDescription || null,
          type: 'quarterly',
          quarter,
          year,
          parent_id: yearGoalId,
          status: 'active',
          progress: 0,
        })
      }

      localStorage.removeItem(STEP_KEY)
      localStorage.removeItem(DATA_KEY)
      setProfile(profile)
      navigate('/', { replace: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
      setIsSaving(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg-primary)',
        display: 'flex',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ marginBottom: '0.5rem' }}>
          <span
            style={{
              fontFamily: 'Lora, serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Life OS
          </span>
        </div>

        <ProgressBar current={step} total={TOTAL_STEPS} />

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
            <Step1Welcome key="step1" data={data} onNext={handleNext} />
          )}
          {step === 2 && (
            <Step2Lebensrad key="step2" data={data} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 3 && (
            <Step3_Ikigai key="step3ikigai" data={data} onNext={handleNext} onBack={handleBack} onDataChange={handleDataChange} />
          )}
          {step === 4 && (
            <Step3Werte key="step3" data={data} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 5 && (
            <Step4FiveWhys key="step4" data={data} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 6 && (
            <Step5Nordstern key="step5" data={data} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 7 && (
            <Step6_Identity key="step6identity" data={data} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 8 && (
            <Step6StoppListe key="step6" data={data} onNext={handleNext} onBack={handleBack} />
          )}
          {step === 9 && (
            <Step7QuartalZiel
              key="step7"
              data={data}
              onFinish={handleFinish}
              onBack={handleBack}
              isSaving={isSaving}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
