import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { generateIdentityAffirmations } from '../../lib/claude'
import { updateProfile } from '../../lib/db'
import type { OBData } from '../../pages/OnboardingNew'

interface Props {
  data: OBData
  onChange: (updates: Partial<OBData>) => void
  onNext: () => void
  onBack: () => void
}

export default function OBIdentity({ data, onChange, onNext, onBack }: Props) {
  const { user, profile, setProfile } = useStore()

  const [mode, setMode] = useState<'choose' | 'write' | 'ki'>('choose')
  const [text, setText] = useState(data.identityStatement)
  const [kiLoading, setKiLoading] = useState(false)
  const [kiError, setKiError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<string[]>([])
  const [selected, setSelected] = useState<boolean[]>([])
  const [saving, setSaving] = useState(false)

  const hasVision = Object.values(data.visionAreas).some((v) => v.trim().length > 0)
  const hasText = text.trim().length > 0

  async function runKi() {
    setKiLoading(true)
    setKiError(null)
    try {
      const items = await generateIdentityAffirmations(data.visionAreas, profile)
      setProposals(items)
      setSelected(items.map(() => true))
    } catch (err) {
      setKiError(err instanceof Error ? err.message : 'KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setKiLoading(false)
    }
  }

  function applySelected() {
    const chosen = proposals.filter((_, i) => selected[i])
    setText(chosen.join('\n'))
    setProposals([])
    setMode('write')
  }

  async function save() {
    if (!user || !text.trim()) return
    setSaving(true)
    try {
      const updated = await updateProfile(user.id, { identity_statement: text.trim() })
      setProfile(updated)
      onChange({ identityStatement: text.trim() })
      onNext()
    } catch (err) {
      console.error('Identität speichern:', err)
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
        Deine Identität
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
        Wer bist du? Affirmationen helfen dir, die Person zu werden die du sein willst.
      </p>

      {mode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => { setMode('ki'); runKi() }}
            disabled={!hasVision || kiLoading}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '12px',
              border: `1.5px solid ${hasVision ? 'var(--accent)' : 'var(--border)'}`,
              background: hasVision ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg-secondary)',
              color: hasVision ? 'var(--accent)' : 'var(--text-muted)',
              cursor: hasVision ? 'pointer' : 'not-allowed',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
              Aus meiner Vision ableiten lassen
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              {hasVision
                ? 'KI generiert Affirmationen basierend auf deiner Vision'
                : 'Fülle zuerst mindestens einen Lebensbereich aus'}
            </div>
          </button>

          <button
            onClick={() => setMode('write')}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '12px',
              border: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
              Selbst schreiben
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Formuliere deine Affirmationen direkt
            </div>
          </button>

          <button
            onClick={onNext}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.25rem' }}
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
      )}

      {mode === 'ki' && (
        <div>
          {kiLoading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              KI analysiert deine Vision…
            </div>
          )}
          {kiError && (
            <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '10px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {kiError}
            </div>
          )}
          {proposals.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                KI-Vorschläge — wähle was passt
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {proposals.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected((prev) => prev.map((v, j) => j === i ? !v : v))}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${selected[i] ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected[i] ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${selected[i] ? 'var(--accent)' : 'var(--border)'}`, background: selected[i] ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
                      {selected[i] && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{p}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <button
                  onClick={applySelected}
                  disabled={!selected.some(Boolean)}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: 'none', background: selected.some(Boolean) ? 'var(--accent)' : 'var(--border)', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: selected.some(Boolean) ? 'pointer' : 'not-allowed' }}
                >
                  Ausgewählte übernehmen
                </button>
                <button
                  onClick={() => { setProposals([]); runKi() }}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Neu generieren
                </button>
              </div>
            </div>
          )}
          {!kiLoading && !kiError && proposals.length === 0 && (
            <button
              onClick={() => setMode('choose')}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              ← Zurück
            </button>
          )}
          {(kiError || (!kiLoading && proposals.length === 0)) && (
            <button
              onClick={() => setMode('choose')}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', marginTop: '0.5rem' }}
            >
              ← Zurück
            </button>
          )}
        </div>
      )}

      {mode === 'write' && (
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
            Deine Affirmationen (eine pro Zeile)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Ich bin jemand, der täglich an sich arbeitet.\nIch bin diszipliniert und fokussiert.\nIch lebe bewusst und nach meinen Werten.'}
            rows={6}
            autoFocus
            style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.6, resize: 'vertical', marginBottom: '1rem', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <button
              onClick={save}
              disabled={!hasText || saving}
              style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: 'none', background: hasText ? 'var(--accent)' : 'var(--border)', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: hasText ? 'pointer' : 'not-allowed' }}
            >
              {saving ? 'Wird gespeichert…' : 'Speichern & Weiter →'}
            </button>
            <button
              onClick={onNext}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Überspringen →
            </button>
            <button
              onClick={() => setMode('choose')}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              ← Zurück
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
