import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { createJournalEntry } from '../../lib/db'
import { todayISO } from '../../lib/utils'
import ProgressBar from '../onboarding/ProgressBar'
import AIFeedbackCard from './AIFeedbackCard'
import type { JournalEntryRow } from '../../types/database'

// ── Energy Scale ──────────────────────────────────────────────────────────────
function EnergyScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const levels = Array.from({ length: 10 }, (_, i) => i + 1)
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      {levels.map((n) => {
        const isSelected = value === n
        const color = n <= 3 ? 'var(--accent-warm)' : n <= 6 ? 'var(--streak)' : 'var(--accent-green)'
        return (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-label={`Energie-Level ${n}`}
            aria-pressed={isSelected}
            style={{
              width: '2.4rem',
              height: '2.4rem',
              background: isSelected ? color : 'var(--bg-card)',
              color: isSelected ? '#fff' : 'var(--text-secondary)',
              border: `2px solid ${isSelected ? color : 'var(--border)'}`,
              borderRadius: '8px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.12s',
              transform: isSelected ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {n}
          </button>
        )
      })}
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
}

export default function EveningJournal() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<EveningData>({ accomplished: '', whatBlocked: '', energyLevel: null, freeText: '' })
  const [savedEntry, setSavedEntry] = useState<JournalEntryRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function patch(updates: Partial<EveningData>) { setData((p) => ({ ...p, ...updates })) }
  function next() { setStep((s) => s + 1) }
  function back() { setStep((s) => Math.max(1, s - 1)) }

  async function handleSave() {
    if (!user || !data.energyLevel) return
    setIsSaving(true); setSaveError(null)
    try {
      const entry = await createJournalEntry({
        user_id: user.id, entry_date: todayISO(), type: 'evening',
        accomplished: data.accomplished || null,
        what_blocked: data.whatBlocked || null,
        energy_level: data.energyLevel,
        free_text: data.freeText || null,
      })
      setSavedEntry(entry)
      setStep(5) // feedback step
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abend-Journal</span>
      </div>
      {step < 5 && <ProgressBar current={step} total={4} />}

      {saveError && (
        <div style={{ padding: '0.75rem 1rem', background: '#FFF0EE', border: '1px solid var(--accent-warm)', borderRadius: '8px', color: 'var(--accent-warm)', fontSize: '0.875rem', marginBottom: '1rem' }}>{saveError}</div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepTextarea key="e1"
            heading="Was hast du heute geschafft?"
            hint="Groß oder klein — was hat stattgefunden?"
            placeholder="Heute habe ich…"
            value={data.accomplished}
            onChange={(v) => patch({ accomplished: v })}
            onNext={next} onBack={() => navigate(-1)}
          />
        )}

        {step === 2 && (
          <StepTextarea key="e2"
            heading="Was hat dich aufgehalten?"
            hint="Keine Schuld, nur Klarheit."
            placeholder="Mich hat gebremst…"
            value={data.whatBlocked}
            onChange={(v) => patch({ whatBlocked: v })}
            onNext={next} onBack={back} canSkip
          />
        )}

        {step === 3 && (
          <motion.div key="e3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
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

        {step === 4 && (
          <motion.div key="e4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>Was liegt dir noch auf der Seele?</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>Optional — schreib es raus.</p>
            <textarea
              value={data.freeText} onChange={(e) => patch({ freeText: e.target.value })}
              placeholder="Gedanken, Ideen, Gefühle…" rows={4}
              style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, marginBottom: '1.5rem' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={back} style={BACK_BTN}>←</button>
              <button onClick={handleSave} disabled={isSaving}
                style={{ flex: 1, padding: '0.9rem', background: isSaving ? 'var(--text-muted)' : 'var(--accent-green)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Wird gespeichert…' : 'Journal speichern ✓'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 5 && savedEntry && (
          <motion.div key="e5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌙</div>
              <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.35rem' }}>Abend-Journal gespeichert.</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Gut gemacht. Ruh dich aus.</p>
            </div>

            {/* Energie badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.4rem 1rem', background: 'var(--bg-secondary)', borderRadius: '999px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Energie heute: <strong style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{data.energyLevel}/10</strong>
              </div>
            </div>

            {/* AI Feedback */}
            <div style={{ marginBottom: '1.5rem' }}>
              <AIFeedbackCard entry={savedEntry} />
            </div>

            <button onClick={() => navigate('/', { replace: true })}
              style={{ width: '100%', padding: '0.9rem', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}>
              Zurück zum Dashboard
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
