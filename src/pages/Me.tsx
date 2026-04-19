import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Sparkles, Loader } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useStore } from '../store/useStore'
import { getLifeAreaSnapshot, getYearlyGoals, updateLifeAreas, updateProfile } from '../lib/db'
import { generateVisionProposal, generateIdentityAffirmations } from '../lib/claude'
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

  // localStorage-Helpers (müssen vor allen States stehen die sie nutzen)
  const ME_STORAGE_KEY = 'life_os_me_ui'
  function loadMeState(): Record<string, unknown> {
    try { return JSON.parse(localStorage.getItem(ME_STORAGE_KEY) ?? '{}') } catch { return {} }
  }
  function saveMeState(patch: Record<string, unknown>) {
    try {
      const current = loadMeState()
      localStorage.setItem(ME_STORAGE_KEY, JSON.stringify({ ...current, ...patch }))
    } catch { /* ignore */ }
  }
  const _init = loadMeState()

  // Vision texts per area
  const [visions, setVisions] = useState<Record<string, string>>({})
  const [editingArea, setEditingArea] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingVision, setSavingVision] = useState(false)

  // Identity
  const [identity, setIdentity] = useState(profile?.identity_statement ?? '')
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [identitySaved, setIdentitySaved] = useState(false)

  // Affirmations KI-Flow
  const [affirmationsLoading, setAffirmationsLoading] = useState(false)
  const [affirmationsError, setAffirmationsError] = useState<string | null>(null)
  const [affirmationsProposal, setAffirmationsProposal] = useState<string[] | null>(
    Array.isArray(_init.affirmationsProposal) ? (_init.affirmationsProposal as string[]) : null
  )
  const [affirmationsSelected, setAffirmationsSelected] = useState<boolean[]>(
    Array.isArray(_init.affirmationsSelected) ? (_init.affirmationsSelected as boolean[]) : []
  )

  // Expanded areas
  const [openArea, setOpenArea] = useState<string | null>((_init.openArea as string) ?? null)

  // KI-Vision-Flow
  const [kiArea, setKiArea] = useState<string | null>((_init.kiArea as string) ?? null)
  const [kiInput, setKiInput] = useState<string>((_init.kiInput as string) ?? '')
  const [kiProposal, setKiProposal] = useState<string | null>((_init.kiProposal as string) ?? null)
  const [kiEditText, setKiEditText] = useState<string>((_init.kiEditText as string) ?? '')
  const [kiEditing, setKiEditing] = useState<boolean>((_init.kiEditing as boolean) ?? false)
  const [kiLoading, setKiLoading] = useState(false)
  const [kiError, setKiError] = useState<string | null>(null)

  function startKiFlow(key: string) {
    setKiArea(key); setKiInput(''); setKiProposal(null)
    setKiEditText(''); setKiEditing(false); setKiError(null)
    if (openArea !== key) setOpenArea(key)
    saveMeState({ kiArea: key, kiInput: '', kiProposal: null, kiEditText: '', kiEditing: false, openArea: key })
  }

  function stopKiFlow() {
    setKiArea(null); setKiInput(''); setKiProposal(null)
    setKiEditText(''); setKiEditing(false); setKiError(null)
    saveMeState({ kiArea: null, kiInput: '', kiProposal: null, kiEditText: '', kiEditing: false })
  }

  async function runKiProposal(key: string) {
    if (!kiInput.trim()) return
    setKiLoading(true); setKiError(null); setKiProposal(null)
    try {
      const label = LIFE_AREAS[key as keyof typeof LIFE_AREAS].label
      const text = await generateVisionProposal(label, kiInput, profile)
      setKiProposal(text); setKiEditText(text)
      saveMeState({ kiProposal: text, kiEditText: text })
    } catch (err) {
      setKiError(err instanceof Error ? err.message : 'KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setKiLoading(false)
    }
  }

  async function acceptKiProposal(key: string, text: string) {
    if (!user) return
    setSavingVision(true)
    try {
      const updated = { ...visions, [key]: text.trim() }
      await updateLifeAreas(user.id, updated)
      setVisions(updated)
      setProfile({ ...profile!, life_areas: updated as unknown as import('../types/database').Json })
      stopKiFlow()
    } catch (err) {
      console.error('Vision speichern:', err)
    } finally {
      setSavingVision(false)
    }
  }

  async function handleGenerateAffirmations() {
    setAffirmationsLoading(true); setAffirmationsError(null)
    try {
      const items = await generateIdentityAffirmations(visions, profile)
      const selected = items.map(() => true)
      setAffirmationsProposal(items)
      setAffirmationsSelected(selected)
      saveMeState({ affirmationsProposal: items, affirmationsSelected: selected })
    } catch (err) {
      setAffirmationsError(err instanceof Error ? err.message : 'KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setAffirmationsLoading(false)
    }
  }

  function acceptAffirmations() {
    if (!affirmationsProposal) return
    const chosen = affirmationsProposal.filter((_, i) => affirmationsSelected[i])
    const text = chosen.join('\n')
    setIdentity(text)
    setAffirmationsProposal(null)
    setAffirmationsSelected([])
    saveMeState({ affirmationsProposal: null, affirmationsSelected: [] })
  }

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
    <div style={{ padding: '1.25rem' }}>

      {/* Header */}
      <div style={{ paddingTop: '0.5rem', marginBottom: '1.25rem' }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Ich</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Dein Lebensrad, deine Vision und Identität.</p>
      </div>

      <div className="me-grid">

      {/* Linke Spalte: Lebensrad + Identität */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

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

      {/* Identität */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={LABEL}>Meine Identität & Affirmationen</div>
          {!affirmationsProposal && (
            <button
              onClick={handleGenerateAffirmations}
              disabled={affirmationsLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: affirmationsLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
            >
              {affirmationsLoading
                ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Generiere…</>
                : <><Sparkles size={11} /> Mit KI generieren</>}
            </button>
          )}
        </div>

        {/* KI-Affirmationen Vorschlag */}
        {affirmationsProposal && (
          <div style={{ background: 'var(--bg-primary)', border: '1.5px solid color-mix(in srgb, var(--accent) 30%, var(--border))', borderRadius: '10px', padding: '0.9rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Sparkles size={11} /> KI-Vorschläge — wähle die passenden aus
            </div>
            {affirmationsProposal.map((item, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem', color: affirmationsSelected[i] ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={affirmationsSelected[i] ?? false}
                  onChange={(e) => {
                    const next = [...affirmationsSelected]
                    next[i] = e.target.checked
                    setAffirmationsSelected(next)
                    saveMeState({ affirmationsSelected: next })
                  }}
                  style={{ marginTop: '0.2rem', accentColor: 'var(--accent)', flexShrink: 0 }}
                />
                {item}
              </label>
            ))}
            {affirmationsError && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--accent-warm, #f59e0b)' }}>{affirmationsError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => { setAffirmationsProposal(null); setAffirmationsSelected([]); saveMeState({ affirmationsProposal: null, affirmationsSelected: [] }) }}
                style={{ flex: 1, padding: '0.55rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
              >
                Abbrechen
              </button>
              <button
                onClick={acceptAffirmations}
                disabled={!affirmationsSelected.some(Boolean)}
                style={{ flex: 2, padding: '0.55rem', background: affirmationsSelected.some(Boolean) ? 'var(--accent)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', cursor: affirmationsSelected.some(Boolean) ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
              >
                ✓ Ausgewählte übernehmen
              </button>
            </div>
          </div>
        )}

        {affirmationsError && !affirmationsProposal && (
          <p style={{ fontSize: '0.8rem', color: 'var(--accent-warm, #f59e0b)', margin: '0 0 0.5rem' }}>{affirmationsError}</p>
        )}

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

      </div>{/* Ende linke Spalte */}

      {/* Rechte Spalte: Lebensbereiche */}
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
                  onClick={() => { const next = isOpen ? null : key; setOpenArea(next); saveMeState({ openArea: next }) }}
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div style={LABEL}>Meine 10/10-Vision</div>
                        {!isEditing && kiArea !== key && (
                          <button
                            onClick={() => startKiFlow(key)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: def.color, background: def.bgAlpha, border: `1px solid ${def.borderAlpha}`, borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                          >
                            <Sparkles size={11} /> Mit KI erarbeiten
                          </button>
                        )}
                      </div>

                      {/* KI-Flow */}
                      {kiArea === key && (
                        <div style={{ background: 'var(--bg-primary)', border: `1.5px solid ${def.color}40`, borderRadius: '10px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 600, color: def.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <Sparkles size={11} /> KI-Assistent
                          </div>

                          {/* Schritt 1: Frage + Eingabe */}
                          {!kiProposal && !kiLoading && (
                            <>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                                Stell dir vor, du lebst in <strong style={{ color: def.color }}>{def.label}</strong> dein perfektes Leben. Was siehst du? Was tust du täglich? Wie fühlst du dich? Beschreibe es in deinen eigenen Worten.
                              </p>
                              <textarea
                                value={kiInput}
                                onChange={(e) => { setKiInput(e.target.value); setKiError(null); saveMeState({ kiInput: e.target.value }) }}
                                placeholder="Meine Rohgedanken…"
                                rows={3}
                                autoFocus
                                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                                onFocus={(e) => (e.target.style.borderColor = def.color)}
                                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                              />
                              {kiError && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--accent-warm, #f59e0b)' }}>{kiError}</p>}
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={stopKiFlow} style={{ flex: 1, padding: '0.55rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                                  Abbrechen
                                </button>
                                <button
                                  onClick={() => runKiProposal(key)}
                                  disabled={!kiInput.trim()}
                                  style={{ flex: 2, padding: '0.55rem', background: kiInput.trim() ? def.color : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', cursor: kiInput.trim() ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                >
                                  <Sparkles size={13} /> Vision erstellen
                                </button>
                              </div>
                            </>
                          )}

                          {/* Laden */}
                          {kiLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mentor formuliert Vision…
                            </div>
                          )}

                          {/* Schritt 2: KI-Vorschlag */}
                          {kiProposal && !kiLoading && (
                            <>
                              {kiEditing ? (
                                <>
                                  <textarea
                                    value={kiEditText}
                                    onChange={(e) => { setKiEditText(e.target.value); saveMeState({ kiEditText: e.target.value }) }}
                                    rows={4}
                                    autoFocus
                                    style={{ width: '100%', padding: '0.7rem 0.9rem', border: `1.5px solid ${def.color}`, borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.55 }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => { setKiEditing(false); saveMeState({ kiEditing: false }) }} style={{ flex: 1, padding: '0.55rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                                      Zurück
                                    </button>
                                    <button onClick={() => acceptKiProposal(key, kiEditText)} disabled={savingVision || !kiEditText.trim()} style={{ flex: 2, padding: '0.55rem', background: def.color, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                                      {savingVision ? 'Speichert…' : 'Speichern'}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ padding: '0.75rem 0.9rem', background: 'var(--bg-card)', border: `1px solid ${def.color}30`, borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                                    <ReactMarkdown>{kiProposal}</ReactMarkdown>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <button onClick={() => acceptKiProposal(key, kiProposal)} disabled={savingVision} style={{ flex: 1, padding: '0.55rem 0.5rem', background: def.color, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, minWidth: '80px' }}>
                                      {savingVision ? 'Speichert…' : '✓ Übernehmen'}
                                    </button>
                                    <button onClick={() => { setKiEditing(true); saveMeState({ kiEditing: true }) }} style={{ flex: 1, padding: '0.55rem 0.5rem', background: 'none', border: `1px solid ${def.color}`, borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', color: def.color, fontFamily: 'DM Sans, sans-serif', minWidth: '80px' }}>
                                      Anpassen
                                    </button>
                                    <button onClick={() => { setKiProposal(null); setKiEditing(false); saveMeState({ kiProposal: null, kiEditing: false }) }} style={{ flex: 1, padding: '0.55rem 0.5rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', minWidth: '80px' }}>
                                      ↻ Neu
                                    </button>
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Manuelles Bearbeiten */}
                      {kiArea !== key && (
                        isEditing ? (
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
                              {vision ? 'Bearbeiten →' : 'Manuell eintragen →'}
                            </button>
                          </div>
                        )
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
      </div>{/* Ende Lebensbereiche CARD / rechte Spalte */}

      </div>{/* Ende me-grid */}

    </div>
  )
}
