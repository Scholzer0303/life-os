import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentQuarter } from '../../lib/utils'
import type { OnboardingData } from '../../types/onboarding'

interface Props {
  data: OnboardingData
  onFinish: (updates: Partial<OnboardingData>) => void
  onBack: () => void
  isSaving: boolean
}

// Sub-step progress bar
function SubProgress({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.5rem' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: '3px',
            borderRadius: '2px',
            background: i < current ? 'var(--accent)' : 'var(--border)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  )
}

export default function Step7QuartalZiel({ data, onFinish, onBack, isSaving }: Props) {
  const [subStep, setSubStep] = useState(1)
  const [threeYearTitle, setThreeYearTitle] = useState(data.threeYearGoalTitle)
  const [yearTitle, setYearTitle] = useState(data.yearGoalTitle)
  const [quarterTitle, setQuarterTitle] = useState(data.firstGoalTitle)
  const [quarterDescription, setQuarterDescription] = useState(data.firstGoalDescription)

  const quarter = getCurrentQuarter()
  const year = new Date().getFullYear()

  function goNext() {
    setSubStep((s) => s + 1)
  }

  function goBack() {
    if (subStep === 1) {
      onBack()
    } else {
      setSubStep((s) => s - 1)
    }
  }

  function handleFinish() {
    onFinish({
      threeYearGoalTitle: threeYearTitle.trim(),
      yearGoalTitle: yearTitle.trim(),
      firstGoalTitle: quarterTitle.trim(),
      firstGoalDescription: quarterDescription.trim(),
    })
  }

  const slideProps = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
    transition: { duration: 0.28 },
  }

  return (
    <div>
      <SubProgress current={subStep} total={3} />
      <AnimatePresence mode="wait">

        {/* ── Sub-Step 1: 3-Jahres-Ziel ── */}
        {subStep === 1 && (
          <motion.div key="sub1" {...slideProps}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 600, margin: '0 0 0.5rem' }}>
              In 3 Jahren…
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
              Wo stehst du {year + 3}? Beschreibe es konkret und messbar.
            </p>

            <label
              htmlFor="three-year-title"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Mein 3-Jahres-Ziel
            </label>
            <textarea
              id="three-year-title"
              value={threeYearTitle}
              onChange={(e) => setThreeYearTitle(e.target.value)}
              placeholder="In 3 Jahren habe ich… / Ich bin… / Ich lebe…"
              rows={3}
              autoFocus
              style={textareaStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={goBack} style={backBtnStyle}>←</button>
              <button
                onClick={goNext}
                disabled={threeYearTitle.trim().length < 5}
                style={{
                  flex: 1, padding: '0.85rem', border: 'none', borderRadius: '10px', fontSize: '1rem',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: threeYearTitle.trim().length >= 5 ? 'pointer' : 'not-allowed',
                  background: threeYearTitle.trim().length >= 5 ? 'var(--accent)' : 'var(--text-muted)', color: '#fff',
                }}
              >
                Weiter → (1/3)
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Sub-Step 2: Jahres-Ziel ── */}
        {subStep === 2 && (
          <motion.div key="sub2" {...slideProps}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 600, margin: '0 0 0.5rem' }}>
              Dieses Jahr
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
              Was muss in den nächsten 12 Monaten passieren, um dem 3-Jahres-Ziel näher zu kommen? <em style={{ color: 'var(--text-muted)' }}>(optional)</em>
            </p>

            {/* 3-Jahres-Kontext */}
            {threeYearTitle && (
              <div style={{ padding: '0.65rem 0.875rem', background: 'rgba(134,59,255,0.07)', borderRadius: '8px', borderLeft: '3px solid var(--accent)', marginBottom: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.2rem' }}>3-Jahres-Ziel</span>
                {threeYearTitle}
              </div>
            )}

            <label
              htmlFor="year-title"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Mein Jahresziel {year}
            </label>
            <textarea
              id="year-title"
              value={yearTitle}
              onChange={(e) => setYearTitle(e.target.value)}
              placeholder={`In ${year} werde ich…`}
              rows={3}
              autoFocus
              style={textareaStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={goBack} style={backBtnStyle}>←</button>
              <button
                onClick={goNext}
                style={{
                  flex: 1, padding: '0.85rem', border: 'none', borderRadius: '10px', fontSize: '1rem',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
                  background: 'var(--accent)', color: '#fff',
                }}
              >
                {yearTitle.trim() ? 'Weiter → (2/3)' : 'Überspringen →'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Sub-Step 3: Quartalsziel ── */}
        {subStep === 3 && (
          <motion.div key="sub3" {...slideProps}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 600, margin: '0 0 0.5rem' }}>
              Erstes Quartalsziel
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
              Was ist dein wichtigstes Ziel für Q{quarter} {year}? Direkt abgeleitet von deiner Vision.
            </p>

            {/* Kontext-Summary */}
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deine Vision</p>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 500, lineHeight: 1.4, fontSize: '0.9rem' }}>{data.northStar}</p>
              {data.selectedValues.length > 0 && (
                <>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deine Top-Werte</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{data.selectedValues.join(' · ')}</p>
                </>
              )}
            </div>

            <label htmlFor="goal-title" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ziel-Titel
            </label>
            <input
              id="goal-title"
              type="text"
              value={quarterTitle}
              onChange={(e) => setQuarterTitle(e.target.value)}
              placeholder={`Mein Q${quarter}-Ziel ist…`}
              autoFocus
              style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />

            <label htmlFor="goal-desc" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Beschreibung <span style={{ color: 'var(--text-muted)', textTransform: 'none' }}>(optional)</span>
            </label>
            <textarea
              id="goal-desc"
              value={quarterDescription}
              onChange={(e) => setQuarterDescription(e.target.value)}
              placeholder="Warum ist dieses Ziel wichtig? Wie sieht Erfolg aus?"
              rows={3}
              style={{ ...textareaStyle, marginBottom: '1.75rem' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={goBack} disabled={isSaving} style={backBtnStyle}>←</button>
              <button
                onClick={handleFinish}
                disabled={quarterTitle.trim().length < 5 || isSaving}
                style={{
                  flex: 1, padding: '0.85rem', border: 'none', borderRadius: '10px', fontSize: '1rem',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: (quarterTitle.trim().length >= 5 && !isSaving) ? 'pointer' : 'not-allowed',
                  background: (quarterTitle.trim().length >= 5 && !isSaving) ? 'var(--accent-green)' : 'var(--text-muted)', color: '#fff',
                }}
              >
                {isSaving ? 'Wird gespeichert…' : 'Life OS starten ✓'}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

const textareaStyle: React.CSSProperties = {
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
