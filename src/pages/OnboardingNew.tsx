import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { updateProfile } from '../lib/db'

// Phase 1: Pflichtschritte
import OBWelcome from '../components/onboarding-new/OBWelcome'
import OBName from '../components/onboarding-new/OBName'
import OBPin from '../components/onboarding-new/OBPin'

// Phase 2: Optionale Schritte
import OBVision from '../components/onboarding-new/OBVision'
import OBIdentity from '../components/onboarding-new/OBIdentity'
import OBYearStart from '../components/onboarding-new/OBYearStart'

// Abschluss
import OBFinish from '../components/onboarding-new/OBFinish'

export type OBData = {
  name: string
  visionAreas: Record<string, string>
  identityStatement: string
  yearScores: Record<string, number>
  yearNotes: Record<string, string>
  focusAreas: string[]
  yearGoals: Record<string, string>
}

const INITIAL_DATA: OBData = {
  name: '',
  visionAreas: {},
  identityStatement: '',
  yearScores: {},
  yearNotes: {},
  focusAreas: [],
  yearGoals: {},
}

// Step IDs
type Step = 'welcome' | 'name' | 'pin' | 'vision' | 'identity' | 'yearstart' | 'finish'
const STEPS: Step[] = ['welcome', 'name', 'pin', 'vision', 'identity', 'yearstart', 'finish']

export default function OnboardingNew() {
  const { user, setProfile } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const [data, setData] = useState<OBData>(INITIAL_DATA)

  function patch(updates: Partial<OBData>) {
    setData((prev) => ({ ...prev, ...updates }))
  }

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  function back() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  async function finish() {
    if (!user) return
    try {
      const updated = await updateProfile(user.id, { onboarding_completed: true })
      setProfile(updated)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Onboarding abschließen fehlgeschlagen:', err)
    }
  }

  const progress = ((STEPS.indexOf(step)) / (STEPS.length - 1)) * 100

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Progress bar */}
      <div style={{ width: '100%', height: '3px', background: 'var(--bg-secondary)' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--accent)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div style={{ width: '100%', maxWidth: '540px', padding: '2rem 1.25rem', flex: 1 }}>
        {step === 'welcome' && <OBWelcome onNext={next} />}
        {step === 'name' && <OBName data={data} onChange={patch} onNext={next} onBack={back} />}
        {step === 'pin' && <OBPin onNext={next} onBack={back} />}
        {step === 'vision' && <OBVision data={data} onChange={patch} onNext={next} onBack={back} />}
        {step === 'identity' && <OBIdentity data={data} onChange={patch} onNext={next} onBack={back} />}
        {step === 'yearstart' && <OBYearStart data={data} onChange={patch} onNext={next} onBack={back} />}
        {step === 'finish' && <OBFinish data={data} onFinish={finish} onBack={back} />}
      </div>
    </div>
  )
}
