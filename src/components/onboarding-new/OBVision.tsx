import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { generateVisionProposal } from '../../lib/claude'
import { updateProfile } from '../../lib/db'
import { LIFE_AREA_ORDER, LIFE_AREAS } from '../../lib/lifeAreas'
import type { OBData } from '../../pages/OnboardingNew'

interface Props {
  data: OBData
  onChange: (updates: Partial<OBData>) => void
  onNext: () => void
  onBack: () => void
}

type AreaState = {
  open: boolean
  input: string
  proposal: string | null
  editing: boolean
  editText: string
  loading: boolean
  error: string | null
}

export default function OBVision({ data, onChange, onNext, onBack }: Props) {
  const { user, profile, setProfile } = useStore()

  const [areas, setAreas] = useState<Record<string, AreaState>>(() =>
    Object.fromEntries(
      LIFE_AREA_ORDER.map((key) => [
        key,
        { open: false, input: '', proposal: null, editing: false, editText: '', loading: false, error: null },
      ])
    )
  )
  const [saving, setSaving] = useState<string | null>(null)

  function patchArea(key: string, updates: Partial<AreaState>) {
    setAreas((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }))
  }

  function toggleOpen(key: string) {
    patchArea(key, { open: !areas[key].open })
  }

  async function runKi(key: string) {
    const input = areas[key].input.trim()
    if (!input) return
    patchArea(key, { loading: true, error: null, proposal: null })
    try {
      const label = LIFE_AREAS[key as keyof typeof LIFE_AREAS].label
      const text = await generateVisionProposal(label, input, profile)
      patchArea(key, { proposal: text, editText: text, loading: false })
    } catch (err) {
      patchArea(key, {
        loading: false,
        error: err instanceof Error ? err.message : 'KI momentan nicht verfügbar — bitte erneut versuchen.',
      })
    }
  }

  async function acceptVision(key: string, text: string) {
    if (!user) return
    setSaving(key)
    try {
      const updated = { ...data.visionAreas, [key]: text.trim() }
      const savedProfile = await updateProfile(user.id, {
        life_areas: updated as unknown as import('../../types/database').Json,
      })
      onChange({ visionAreas: updated })
      setProfile(savedProfile)
      patchArea(key, { proposal: null, editing: false, open: false })
    } catch (err) {
      console.error('Vision speichern:', err)
      patchArea(key, { error: 'Speichern fehlgeschlagen — bitte erneut versuchen.' })
    } finally {
      setSaving(null)
    }
  }

  function clearVision(key: string) {
    const updated = { ...data.visionAreas }
    delete updated[key]
    onChange({ visionAreas: updated })
    patchArea(key, { input: '', proposal: null, editing: false, editText: '' })
  }

  const filledCount = LIFE_AREA_ORDER.filter((k) => data.visionAreas[k]?.trim()).length

  return (
    <div style={{ paddingTop: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Optional — {filledCount}/6 Bereiche
      </div>
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Deine Vision
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
        Was wäre in jedem Lebensbereich perfekt? Du kannst das jetzt einrichten oder später im „Ich"-Tab nachholen.
      </p>

      {/* Life area cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.75rem' }}>
        {LIFE_AREA_ORDER.map((key) => {
          const area = LIFE_AREAS[key]
          const state = areas[key]
          const savedText = data.visionAreas[key]
          const isDone = Boolean(savedText?.trim())

          return (
            <div
              key={key}
              style={{
                borderRadius: '12px',
                border: `1.5px solid ${isDone ? area.borderAlpha : 'var(--border)'}`,
                background: isDone ? area.bgAlpha : 'var(--bg-card)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Card header (always visible) */}
              <button
                onClick={() => toggleOpen(key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: area.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {area.label}
                </span>
                {isDone && (
                  <span style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 600 }}>✓</span>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: state.open ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </span>
              </button>

              {/* Expanded content */}
              {state.open && (
                <div style={{ padding: '0 1rem 1rem' }}>
                  {isDone && !state.proposal ? (
                    /* Saved vision display */
                    <div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '0.75rem', fontStyle: 'italic' }}>
                        „{savedText}"
                      </p>
                      <button
                        onClick={() => clearVision(key)}
                        style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Ändern
                      </button>
                    </div>
                  ) : state.proposal && !state.editing ? (
                    /* KI proposal */
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        KI-Vorschlag
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '0.875rem', fontStyle: 'italic' }}>
                        „{state.proposal}"
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => acceptVision(key, state.proposal!)}
                          disabled={saving === key}
                          style={{ flex: 1, padding: '0.625rem 0.75rem', borderRadius: '8px', border: 'none', background: area.color, color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', minWidth: '80px' }}
                        >
                          {saving === key ? '…' : 'Übernehmen'}
                        </button>
                        <button
                          onClick={() => patchArea(key, { editing: true, editText: state.proposal! })}
                          style={{ flex: 1, padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer', minWidth: '80px' }}
                        >
                          Anpassen
                        </button>
                        <button
                          onClick={() => patchArea(key, { proposal: null, editing: false })}
                          style={{ flex: 1, padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', minWidth: '80px' }}
                        >
                          Neu
                        </button>
                      </div>
                    </div>
                  ) : state.editing ? (
                    /* Edit mode */
                    <div>
                      <textarea
                        value={state.editText}
                        onChange={(e) => patchArea(key, { editText: e.target.value })}
                        rows={4}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.6, resize: 'vertical', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => acceptVision(key, state.editText)}
                          disabled={!state.editText.trim() || saving === key}
                          style={{ flex: 1, padding: '0.625rem', borderRadius: '8px', border: 'none', background: area.color, color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {saving === key ? '…' : 'Speichern'}
                        </button>
                        <button
                          onClick={() => patchArea(key, { editing: false })}
                          style={{ flex: 1, padding: '0.625rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Input + KI flow */
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                        Deine Rohgedanken (was fällt dir spontan ein?)
                      </label>
                      <textarea
                        value={state.input}
                        onChange={(e) => patchArea(key, { input: e.target.value })}
                        placeholder={`Was wäre für dich in ${area.label} perfekt? Schreib alles raus — die KI formuliert es dann.`}
                        rows={3}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.6, resize: 'vertical', marginBottom: '0.625rem', boxSizing: 'border-box' }}
                      />
                      {state.error && (
                        <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.625rem' }}>{state.error}</div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => runKi(key)}
                          disabled={!state.input.trim() || state.loading}
                          style={{ flex: 1, padding: '0.625rem 0.75rem', borderRadius: '8px', border: 'none', background: state.input.trim() ? area.color : 'var(--border)', color: state.input.trim() ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: state.input.trim() ? 'pointer' : 'not-allowed' }}
                        >
                          {state.loading ? 'KI denkt…' : 'Mit KI formulieren'}
                        </button>
                        <button
                          onClick={() => patchArea(key, { editing: true, editText: state.input })}
                          style={{ padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          Selbst schreiben
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <button
          onClick={onNext}
          style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {filledCount > 0 ? `Weiter (${filledCount}/6 ausgefüllt) →` : 'Überspringen →'}
        </button>
        <button
          onClick={onBack}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          ← Zurück
        </button>
      </div>
    </div>
  )
}
