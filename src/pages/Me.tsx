import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getLifeAreaSnapshot, getYearlyGoals, updateLifeAreas, updateProfile } from '../lib/db'
import { LIFE_AREAS, LIFE_AREA_ORDER } from '../lib/lifeAreas'
import type { GoalRow } from '../types/database'
import type { LifeAreaSnapshotRow } from '../lib/db'
import LifeWheel from '../components/me/LifeWheel'

const YEAR = new Date().getFullYear()

const CARD: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)',
  padding: '1.25rem',
  boxShadow: 'var(--shadow-card)',
}

const LABEL: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.4rem',
}

export default function Me() {
  const { user, profile, setProfile } = useStore()

  const [snapshot, setSnapshot] = useState<LifeAreaSnapshotRow | null>(null)
  const [yearGoals, setYearGoals] = useState<GoalRow[]>([])
  const [loading, setLoading] = useState(true)

  // Vision texts per area
  const [visions, setVisions] = useState<Record<string, string>>({})
  const [editingArea, setEditingArea] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingVision, setSavingVision] = useState(false)

  // Identity
  const [identity, setIdentity] = useState(profile?.identity_statement ?? '')
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [identitySaved, setIdentitySaved] = useState(false)

  // Expanded areas
  const [openArea, setOpenArea] = useState<string | null>(null)

  // Focus areas from ai_profile
  const focusAreas: string[] = (() => {
    try {
      const ap = profile?.ai_profile as Record<string, unknown> | null
      return Array.isArray(ap?.focus_areas) ? (ap!.focus_areas as string[]) : []
    } catch { return [] }
  })()

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getLifeAreaSnapshot(user.id, YEAR, 'start'),
      getYearlyGoals(user.id, YEAR),
    ])
      .then(([snap, goals]) => {
        setSnapshot(snap)
        setYearGoals(goals)
      })
      .catch((err) => console.error('Me laden:', err))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    const la = (profile as Record<string, unknown> | null)?.life_areas as Record<string, string> | null
    setVisions(la ?? {})
  }, [profile])

  useEffect(() => {
    setIdentity(profile?.identity_statement ?? '')
  }, [profile])

  const scores: Record<string, number> = snapshot?.scores ?? {}

  function startEdit(key: string) {
    setEditingArea(key)
    setEditText(visions[key] ?? '')
  }

  async function saveVision(key: string) {
    if (!user) return
    setSavingVision(true)
    try {
      const updated = { ...visions, [key]: editText.trim() }
      await updateLifeAreas(user.id, updated)
      setVisions(updated)
      setProfile({ ...profile!, life_areas: updated as unknown as import('../types/database').Json })
      setEditingArea(null)
    } catch (err) {
      console.error('Vision speichern:', err)
    } finally {
      setSavingVision(false)
    }
  }

  async function saveIdentity() {
    if (!user) return
    setSavingIdentity(true)
    try {
      await updateProfile(user.id, { identity_statement: identity.trim() || null })
      setProfile({ ...profile!, identity_statement: identity.trim() || null })
      setIdentitySaved(true)
      setTimeout(() => setIdentitySaved(false), 2000)
    } catch (err) {
      console.error('Identität speichern:', err)
    } finally {
      setSavingIdentity(false)
    }
  }

  return (
    <div style={{ padding: '1.25rem', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ paddingTop: '0.5rem' }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Ich</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Dein Lebensrad, deine Vision und Identität.</p>
      </div>

      {/* Lebensrad */}
      <div style={CARD}>
        <div style={{ ...LABEL, marginBottom: '0.75rem' }}>Lebensrad {YEAR}</div>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem 0' }}>Lade…</div>
        ) : (
          <LifeWheel scores={scores} />
        )}
        {!loading && snapshot && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.75rem' }}>
            {LIFE_AREA_ORDER.map((key) => {
              const def = LIFE_AREAS[key]
              const val = scores[key] ?? 0
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.label}</span>
                  <span style={{ color: def.color, fontWeight: 600, marginLeft: 'auto' }}>{val}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lebensbereiche */}
      <div style={CARD}>
        <div style={{ ...LABEL, marginBottom: '0.75rem' }}>Lebensbereiche</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {LIFE_AREA_ORDER.map((key) => {
            const def = LIFE_AREAS[key]
            const isOpen = openArea === key
            const val = scores[key] ?? null
            const vision = visions[key] ?? ''
            const goalForArea = yearGoals.find((g) => g.life_area === key)
            const isFocus = focusAreas.includes(key)
            const isEditing = editingArea === key

            return (
              <div
                key={key}
                style={{
                  border: `1px solid ${isOpen ? def.color : 'var(--border)'}`,
                  borderLeft: `3px solid ${def.color}`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Area header */}
                <button
                  onClick={() => setOpenArea(isOpen ? null : key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{def.label}</span>
                  {isFocus && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: def.color, background: def.bgAlpha, border: `1px solid ${def.borderAlpha}`, borderRadius: '6px', padding: '0.15rem 0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Schwerpunkt
                    </span>
                  )}
                  {val !== null && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: def.color }}>{val}/10</span>
                  )}
                  {isOpen ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)' }}>

                    {/* Vision */}
                    <div style={{ paddingTop: '0.75rem' }}>
                      <div style={LABEL}>Meine 10/10-Vision</div>
                      {isEditing ? (
                        <div>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Was wäre in diesem Bereich ein perfektes Leben?"
                            rows={4}
                            autoFocus
                            style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${def.color}`, borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.55 }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              onClick={() => setEditingArea(null)}
                              style={{ flex: 1, padding: '0.6rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
                            >
                              Abbrechen
                            </button>
                            <button
                              onClick={() => saveVision(key)}
                              disabled={savingVision}
                              style={{ flex: 1, padding: '0.6rem', background: def.color, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                            >
                              {savingVision ? 'Speichert…' : 'Speichern'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {vision ? (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 0.5rem', whiteSpace: 'pre-wrap' }}>{vision}</p>
                          ) : (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 0.5rem' }}>Noch keine Vision eingetragen.</p>
                          )}
                          <button
                            onClick={() => startEdit(key)}
                            style={{ fontSize: '0.8rem', color: def.color, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
                          >
                            {vision ? 'Bearbeiten →' : 'Vision eintragen →'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Jahresziel */}
                    <div>
                      <div style={LABEL}>Jahresziel {YEAR}</div>
                      {goalForArea ? (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: goalForArea.status === 'completed' ? '#22c55e' : def.color }}>{goalForArea.status === 'completed' ? '✓' : '◎'}</span>
                          {goalForArea.title}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Kein Jahresziel für diesen Bereich.</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Identität */}
      <div style={CARD}>
        <div style={{ ...LABEL, marginBottom: '0.5rem' }}>Meine Identität & Affirmationen</div>
        <textarea
          value={identity}
          onChange={(e) => { setIdentity(e.target.value); setIdentitySaved(false) }}
          placeholder="Ich bin jemand, der/die…"
          rows={5}
          style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6, marginBottom: '0.75rem' }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          onClick={saveIdentity}
          disabled={savingIdentity}
          style={{ width: '100%', padding: '0.8rem', background: identitySaved ? '#22c55e' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: savingIdentity ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
        >
          {savingIdentity ? 'Wird gespeichert…' : identitySaved ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </div>

    </div>
  )
}
