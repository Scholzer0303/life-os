import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { generateYearStartAnalysis } from '../../lib/claude'
import { upsertLifeAreaSnapshot, createGoal } from '../../lib/db'
import { LIFE_AREA_ORDER, LIFE_AREAS } from '../../lib/lifeAreas'
import type { OBData } from '../../pages/OnboardingNew'

interface Props {
  data: OBData
  onChange: (updates: Partial<OBData>) => void
  onNext: () => void
  onBack: () => void
}

const YEAR = new Date().getFullYear()

export default function OBYearStart({ data, onChange, onNext, onBack }: Props) {
  const { user, profile } = useStore()

  const [scores, setScores] = useState<Record<string, number>>(data.yearScores)
  const [notes, setNotes] = useState<Record<string, string>>(data.yearNotes)
  const [focusAreas, setFocusAreas] = useState<string[]>(data.focusAreas)
  const [yearGoals, setYearGoals] = useState<Record<string, string>>(data.yearGoals)

  const [kiLoading, setKiLoading] = useState(false)
  const [kiError, setKiError] = useState<string | null>(null)
  const [kiProposal, setKiProposal] = useState<import('../../lib/claude').YearStartAnalysis | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const hasVision = Object.values(data.visionAreas).some((v) => v.trim().length > 0)
  const hasScores = Object.keys(scores).length > 0

  async function runKi() {
    setKiLoading(true)
    setKiError(null)
    setKiProposal(null)
    try {
      const result = await generateYearStartAnalysis(data.visionAreas, profile, YEAR)
      setKiProposal(result)
    } catch (err) {
      setKiError(err instanceof Error ? err.message : 'KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setKiLoading(false)
    }
  }

  function applyKiScores() {
    if (!kiProposal) return
    const newScores: Record<string, number> = {}
    for (const [k, v] of Object.entries(kiProposal.scores)) {
      newScores[k] = v.score
    }
    setScores(newScores)
    setFocusAreas(kiProposal.focusAreas)
    const newGoals: Record<string, string> = {}
    for (const [k, v] of Object.entries(kiProposal.goals)) {
      newGoals[k] = v
    }
    setYearGoals(newGoals)
    setKiProposal(null)
  }

  function toggleFocus(key: string) {
    setFocusAreas((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= 3) return prev
      return [...prev, key]
    })
  }

  async function save() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    try {
      await upsertLifeAreaSnapshot(user.id, YEAR, 'start', scores, notes)

      for (const key of focusAreas) {
        const title = yearGoals[key]?.trim()
        if (title) {
          await createGoal({
            user_id: user.id,
            title,
            type: 'year',
            year: YEAR,
            status: 'active',
            progress: 0,
            life_area: key as import('../../types/database').GoalInsert['life_area'],
          })
        }
      }

      onChange({ yearScores: scores, yearNotes: notes, focusAreas, yearGoals })
      onNext()
    } catch (err) {
      console.error('Jahresstart speichern:', err)
      setSaveError('Speichern fehlgeschlagen — bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ paddingTop: '2rem' }}>
      <div style={{ marginBottom: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Optional
      </div>
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Dein Jahr {YEAR}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
        Wo stehst du gerade? Das ist dein Ausgangspunkt für das Jahr.
      </p>

      {/* KI-Analyse Button */}
      {hasVision && !kiProposal && (
        <button
          onClick={runKi}
          disabled={kiLoading}
          style={{
            width: '100%',
            padding: '0.875rem',
            borderRadius: '10px',
            border: '1.5px solid var(--accent)',
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            color: 'var(--accent)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: kiLoading ? 'not-allowed' : 'pointer',
            marginBottom: '1.25rem',
          }}
        >
          {kiLoading ? 'KI analysiert…' : '✦ KI-Einschätzung holen'}
        </button>
      )}

      {/* KI-Vorschlag */}
      {kiProposal && (
        <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1.5px solid var(--accent)', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            KI-Einschätzung
          </div>
          {LIFE_AREA_ORDER.map((key) => {
            const area = LIFE_AREAS[key]
            const item = kiProposal.scores[key]
            if (!item) return null
            return (
              <div key={key} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color, flexShrink: 0, marginTop: '5px' }} />
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{area.label}: {item.score}/10</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{item.reason}</span>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
            <button
              onClick={applyKiScores}
              style={{ flex: 1, padding: '0.625rem', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Übernehmen
            </button>
            <button
              onClick={() => setKiProposal(null)}
              style={{ flex: 1, padding: '0.625rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}

      {kiError && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {kiError}
        </div>
      )}

      {/* Ist-Stand Slider pro Bereich */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
        {LIFE_AREA_ORDER.map((key) => {
          const area = LIFE_AREAS[key]
          const score = scores[key] ?? 5
          return (
            <div key={key} style={{ padding: '0.875rem 1rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{area.label}</span>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: area.color }}>{score}/10</span>
              </div>

              {/* Slider */}
              <div style={{ position: 'relative', marginBottom: '0.625rem', overflow: 'visible', paddingTop: '6px' }}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={score}
                  onChange={(e) => setScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    height: '4px',
                    appearance: 'none',
                    background: `linear-gradient(to right, ${area.color} ${(score - 1) / 9 * 100}%, var(--border) ${(score - 1) / 9 * 100}%)`,
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                />
              </div>

              <input
                type="text"
                value={notes[key] ?? ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="Kurze Notiz (optional)"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', boxSizing: 'border-box' }}
              />
            </div>
          )
        })}
      </div>

      {/* Schwerpunkte */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
          Schwerpunktbereiche wählen
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          2–3 Bereiche auf die du dich dieses Jahr fokussierst
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {LIFE_AREA_ORDER.map((key) => {
            const area = LIFE_AREAS[key]
            const active = focusAreas.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleFocus(key)}
                style={{
                  padding: '0.625rem 0.75rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${active ? area.color : 'var(--border)'}`,
                  background: active ? area.bgAlpha : 'var(--bg-card)',
                  color: active ? area.color : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color, flexShrink: 0 }} />
                {area.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Jahresziele für Schwerpunktbereiche */}
      {focusAreas.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
            Jahresziele (optional)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Ein konkretes Ziel pro Schwerpunktbereich
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {focusAreas.map((key) => {
              const area = LIFE_AREAS[key as keyof typeof LIFE_AREAS]
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color, flexShrink: 0 }} />
                  <input
                    type="text"
                    value={yearGoals[key] ?? ''}
                    onChange={(e) => setYearGoals((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`${area.label}: Ziel für ${YEAR}`}
                    style={{ flex: 1, padding: '0.625rem 0.875rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {saveError && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {saveError}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Wird gespeichert…' : hasScores ? 'Speichern & Weiter →' : 'Speichern & Weiter →'}
        </button>
        <button
          onClick={onNext}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          Überspringen →
        </button>
        <button
          onClick={onBack}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          ← Zurück
        </button>
      </div>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          margin-top: -6px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
