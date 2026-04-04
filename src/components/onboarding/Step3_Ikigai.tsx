import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { generateIkigaiSynthesis } from '../../lib/claude'
import type { OnboardingData, IkigaiData } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onNext: (updates: Partial<OnboardingData>) => void
  onBack: () => void
  onDataChange?: (updates: Partial<OnboardingData>) => void
}

const SUBSTEP_KEY = 'onboarding_ikigai_substep'

const QUESTIONS = [
  {
    key: 'loves' as keyof IkigaiData,
    question: 'Was liebst du zu tun?',
    hint: '— auch wenn du nicht dafür bezahlt wirst',
    placeholder: 'Ich liebe es zu…',
  },
  {
    key: 'good_at' as keyof IkigaiData,
    question: 'Worin bist du gut?',
    hint: '— besser als die meisten',
    placeholder: 'Ich bin besonders gut in…',
  },
  {
    key: 'paid_for' as keyof IkigaiData,
    question: 'Wofür würden Menschen dir Geld zahlen?',
    hint: '— dein marktfähiger Wert',
    placeholder: 'Menschen zahlen mir für…',
  },
  {
    key: 'world_needs' as keyof IkigaiData,
    question: 'Was braucht die Welt?',
    hint: '— womit kannst du einen Unterschied machen?',
    placeholder: 'Die Welt braucht…',
  },
]

export default function Step3_Ikigai({ data, onNext, onBack, onDataChange }: Props) {
  const [subStep, setSubStep] = useState<number>(() => {
    const saved = localStorage.getItem(SUBSTEP_KEY)
    if (saved) {
      const n = parseInt(saved, 10)
      if (n >= 0 && n <= 4) return n
    }
    return 0
  })
  const [answers, setAnswers] = useState<IkigaiData>({
    loves: data.ikigai.loves,
    good_at: data.ikigai.good_at,
    paid_for: data.ikigai.paid_for,
    world_needs: data.ikigai.world_needs,
    synthesis: data.ikigai.synthesis,
  })
  const [synthesis, setSynthesis] = useState(data.ikigai.synthesis)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => { localStorage.setItem(SUBSTEP_KEY, String(subStep)) }, [subStep])

  // Zwischeneingaben sofort in Parent-Data speichern → localStorage-Persistenz greift
  useEffect(() => {
    onDataChange?.({ ikigai: { ...answers, synthesis } })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, synthesis])

  const current = QUESTIONS[subStep]
  const currentAnswer = subStep < 4 ? answers[current?.key] : ''

  function setAnswer(value: string) {
    if (!current) return
    setAnswers((prev) => ({ ...prev, [current.key]: value }))
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    setShowManual(false)
    try {
      const result = await generateIkigaiSynthesis(
        answers.loves,
        answers.good_at,
        answers.paid_for,
        answers.world_needs
      )
      setSynthesis(result)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Fehler beim Generieren.')
      setShowManual(true)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleFinishIkigai() {
    localStorage.removeItem(SUBSTEP_KEY)
    onNext({
      ikigai: {
        loves: answers.loves,
        good_at: answers.good_at,
        paid_for: answers.paid_for,
        world_needs: answers.world_needs,
        synthesis: synthesis.trim(),
      },
    })
  }

  const slideProps = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -14 },
    transition: { duration: 0.25 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{ marginBottom: '0.5rem' }}>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 600, margin: 0 }}>
          Dein Ikigai
        </h2>
      </div>
      {subStep === 0 && (
        <p style={{ color: 'var(--text-secondary)', margin: '0.3rem 0 1.5rem', lineHeight: 1.6, fontSize: '0.925rem' }}>
          Ikigai ist das japanische Konzept für deinen Lebensinn — der Schnittpunkt aus dem was du liebst, kannst, womit du Geld verdienst und was die Welt braucht.
        </p>
      )}

      {/* Sub-progress for questions */}
      {subStep < 4 && (
        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.5rem' }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= subStep ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s' }} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── Questions 0–3 ── */}
        {subStep < 4 && (
          <motion.div key={`q-${subStep}`} {...slideProps}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '1.3rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
              {current.question}
            </h3>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 1.25rem', fontSize: '0.875rem' }}>
              {current.hint}
            </p>
            <textarea
              key={current.key}
              value={currentAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={current.placeholder}
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
                marginBottom: '1.5rem',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => subStep === 0 ? onBack() : setSubStep((s) => s - 1)}
                style={backBtnStyle}
              >
                ←
              </button>
              <button
                onClick={() => setSubStep((s) => s + 1)}
                disabled={!currentAnswer.trim()}
                style={{
                  flex: 1, padding: '0.85rem', border: 'none', borderRadius: '10px', fontSize: '1rem',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                  cursor: currentAnswer.trim() ? 'pointer' : 'not-allowed',
                  background: currentAnswer.trim() ? 'var(--accent)' : 'var(--text-muted)', color: '#fff',
                }}
              >
                {subStep < 3 ? `Weiter → (${subStep + 1}/4)` : 'Ikigai-Kern finden →'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Synthesis ── */}
        {subStep === 4 && (
          <motion.div key="synthesis" {...slideProps}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '1.3rem', fontWeight: 600, margin: '0 0 1rem' }}>
              Dein Ikigai-Kern
            </h3>

            {/* Answers summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              {QUESTIONS.map((q) => (
                <div key={q.key} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: '52px', flexShrink: 0 }}>{q.question.split(' ')[0]} {q.question.split(' ')[1]}</span>
                  <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{answers[q.key]}</span>
                </div>
              ))}
            </div>

            {/* Generate button */}
            {!synthesis && !isGenerating && !showManual && (
              <button
                onClick={handleGenerate}
                style={{
                  width: '100%', padding: '0.9rem', border: 'none', borderRadius: '10px',
                  background: 'var(--accent)', color: '#fff', fontSize: '0.95rem',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <Sparkles size={16} />
                Meinen Ikigai-Kern finden
              </button>
            )}

            {isGenerating && (
              <div style={{ padding: '1rem', background: 'rgba(134,59,255,0.07)', borderRadius: '10px', textAlign: 'center', marginBottom: '1rem', color: 'var(--accent)', fontSize: '0.9rem' }}>
                KI analysiert deinen Ikigai…
              </div>
            )}

            {generateError && (
              <div style={{ padding: '0.6rem 0.875rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {generateError}
              </div>
            )}

            {/* Synthesis result */}
            {synthesis && (
              <div style={{ padding: '1rem', background: 'rgba(134,59,255,0.1)', border: '1.5px solid rgba(134,59,255,0.3)', borderRadius: '12px', marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dein Ikigai</p>
                <textarea
                  value={synthesis}
                  onChange={(e) => setSynthesis(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '0', border: 'none', background: 'transparent',
                    color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif',
                    resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
                  }}
                />
              </div>
            )}

            {/* Manual fallback or re-generate */}
            {(showManual || synthesis) && (
              <div style={{ marginBottom: '1rem' }}>
                {!synthesis && (
                  <textarea
                    value={synthesis}
                    onChange={(e) => setSynthesis(e.target.value)}
                    placeholder="Mein Ikigai ist…"
                    rows={3}
                    style={{
                      width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)',
                      borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif',
                      background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                      resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, marginBottom: '0.5rem',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                )}
                {synthesis && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}
                  >
                    <Sparkles size={12} /> Neu generieren
                  </button>
                )}
              </div>
            )}

            {!synthesis && !isGenerating && !showManual && (
              <button
                onClick={() => setShowManual(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '1rem', textDecoration: 'underline' }}
              >
                Manuell eingeben
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <button onClick={() => setSubStep(3)} style={backBtnStyle}>←</button>
              <button
                onClick={handleFinishIkigai}
                style={{
                  flex: 1, padding: '0.85rem', border: 'none', borderRadius: '10px', fontSize: '1rem',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
                  background: 'var(--accent)', color: '#fff',
                }}
              >
                Weiter →
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => { localStorage.removeItem(SUBSTEP_KEY); onNext({ ikigai: { loves: answers.loves, good_at: answers.good_at, paid_for: answers.paid_for, world_needs: answers.world_needs, synthesis: '' } }) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'underline' }}
              >
                Schritt überspringen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip entire step */}
      {subStep < 4 && (
        <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
          <button
            onClick={() => { localStorage.removeItem(SUBSTEP_KEY); onNext({ ikigai: { loves: '', good_at: '', paid_for: '', world_needs: '', synthesis: '' } }) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            Schritt überspringen
          </button>
        </div>
      )}
    </motion.div>
  )
}

const backBtnStyle: React.CSSProperties = {
  flex: '0 0 auto',
  padding: '0.85rem 1.25rem',
  background: 'none',
  border: '1.5px solid var(--border)',
  borderRadius: '10px',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  color: 'var(--text-secondary)',
  fontSize: '0.95rem',
}
