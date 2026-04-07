import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getJournalPeriod, upsertJournalPeriod } from '../../lib/db'
import { generatePeriodSummary } from '../../lib/claude'
import type { JournalPeriod } from '../../types'

// ─── Typen ───────────────────────────────────────────────────────────────────

interface WeekGoal {
  id: string
  title: string
  completed: boolean
}

interface WeekPlanningData {
  identity_statement?: string
  goals?: WeekGoal[]
}

interface WeekReflectionData {
  what_went_well?: string
  what_went_badly?: string
  insight?: string
  memorable_moments?: string
}

// ─── Datum-Hilfsfunktionen ────────────────────────────────────────────────────

function getMondayOfCurrentWeek(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getMondayAtOffset(offset: number): Date {
  const monday = getMondayOfCurrentWeek()
  monday.setDate(monday.getDate() + offset * 7)
  return monday
}

function getISOWeekYear(d: Date): { week: number; year: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { week, year: date.getUTCFullYear() }
}

function getWeekPeriodKey(monday: Date): string {
  const { week, year } = getISOWeekYear(monday)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function getWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const { week, year } = getISOWeekYear(monday)

  if (monday.getMonth() === sunday.getMonth()) {
    const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(monday)
    return `KW ${week} · ${monday.getDate()}.–${sunday.getDate()}. ${monthName} ${year}`
  } else {
    const monStr = `${monday.getDate()}. ${new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(monday)}`
    const sunStr = `${sunday.getDate()}. ${new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(sunday)} ${year}`
    return `KW ${week} · ${monStr}–${sunStr}`
  }
}

function newGoalId() {
  return Math.random().toString(36).slice(2)
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function JournalWeek() {
  const { user, profile } = useStore()
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeSubTab, setActiveSubTab] = useState<'planung' | 'reflexion'>('planung')

  const [_period, setPeriod] = useState<JournalPeriod | null>(null)
  const [planning, setPlanning] = useState<WeekPlanningData>({ identity_statement: '', goals: [] })
  const [reflection, setReflection] = useState<WeekReflectionData>({})
  const [aiSummary, setAiSummary] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [newGoalTitle, setNewGoalTitle] = useState('')

  const monday = getMondayAtOffset(weekOffset)
  const periodKey = getWeekPeriodKey(monday)
  const weekLabel = getWeekLabel(monday)
  const isCurrentWeek = weekOffset === 0

  const hasNoPlanning = isCurrentWeek && (!planning.identity_statement?.trim()) && (!planning.goals?.length)

  // Periode laden wenn sich die Woche ändert
  const loadPeriod = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const p = await getJournalPeriod(user.id, 'week', periodKey)
      setPeriod(p)
      if (p) {
        setPlanning((p.planning_data as WeekPlanningData) ?? { identity_statement: '', goals: [] })
        setReflection((p.reflection_data as WeekReflectionData) ?? {})
        setAiSummary(p.ai_summary ?? null)
      } else {
        setPlanning({ identity_statement: '', goals: [] })
        setReflection({})
        setAiSummary(null)
      }
    } catch (err) {
      console.error('JournalWeek laden:', err)
    } finally {
      setLoading(false)
    }
  }, [user, periodKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPeriod() }, [loadPeriod])

  // Planung speichern
  async function savePlanning() {
    if (!user) return
    setSaving(true); setSaveSuccess(false)
    try {
      const p = await upsertJournalPeriod(user.id, 'week', periodKey, { planning_data: planning as Record<string, unknown> })
      setPeriod(p)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Planung speichern:', err)
    } finally {
      setSaving(false)
    }
  }

  // Reflexion speichern (inkl. aktualisierter Goal-Status aus Planung)
  async function saveReflection() {
    if (!user) return
    setSaving(true); setSaveSuccess(false)
    try {
      const p = await upsertJournalPeriod(user.id, 'week', periodKey, {
        planning_data: planning as Record<string, unknown>,
        reflection_data: reflection as Record<string, unknown>,
      })
      setPeriod(p)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Reflexion speichern:', err)
    } finally {
      setSaving(false)
    }
  }

  // KI-Zusammenfassung generieren
  async function handleGenerateSummary() {
    if (!user) return
    setAiLoading(true); setAiError(null)
    try {
      const summary = await generatePeriodSummary(
        'week', weekLabel,
        planning as Record<string, unknown>,
        reflection as Record<string, unknown>,
        profile ?? null
      )
      setAiSummary(summary)
      await upsertJournalPeriod(user.id, 'week', periodKey, { ai_summary: summary })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Fehler beim Generieren.')
    } finally {
      setAiLoading(false)
    }
  }

  // Goal-Aktionen
  function addGoal() {
    const title = newGoalTitle.trim()
    if (!title) return
    setPlanning((prev) => ({ ...prev, goals: [...(prev.goals ?? []), { id: newGoalId(), title, completed: false }] }))
    setNewGoalTitle('')
  }

  function removeGoal(id: string) {
    setPlanning((prev) => ({ ...prev, goals: (prev.goals ?? []).filter((g) => g.id !== id) }))
  }

  function toggleGoalCompleted(id: string) {
    setPlanning((prev) => ({
      ...prev,
      goals: (prev.goals ?? []).map((g) => g.id === id ? { ...g, completed: !g.completed } : g),
    }))
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Wochen-Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.5rem' }}>
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Vorherige Woche"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{weekLabel}</div>
          {isCurrentWeek && (
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Aktuelle Woche
            </div>
          )}
        </div>

        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={isCurrentWeek}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: isCurrentWeek ? 'default' : 'pointer', color: isCurrentWeek ? 'var(--border)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Nächste Woche"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Banner: Planung fehlt für aktuelle Woche */}
      {hasNoPlanning && !loading && (
        <div
          onClick={() => setActiveSubTab('planung')}
          style={{
            background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 500 }}>
            {getISOWeekYear(monday).week > 1 ? `KW ${getISOWeekYear(monday).week}` : 'Diese Woche'} startet — Planung ausstehend
          </span>
          <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>→</span>
        </div>
      )}

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
        {(['planung', 'reflexion'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.55rem 1.1rem', fontSize: '0.875rem',
              fontWeight: activeSubTab === tab ? 600 : 400,
              color: activeSubTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeSubTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px', fontFamily: 'DM Sans, sans-serif',
              textTransform: 'capitalize', transition: 'color 0.15s',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade…</div>
      )}

      {/* ── PLANUNG ── */}
      {!loading && activeSubTab === 'planung' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Identitätssatz */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Diese Woche bin ich der Lukas, der…
            </label>
            <textarea
              value={planning.identity_statement ?? ''}
              onChange={(e) => setPlanning((p) => ({ ...p, identity_statement: e.target.value }))}
              placeholder="…konsequent seine Ziele verfolgt und jeden Tag das Wichtigste tut."
              rows={3}
              style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Wochenziele */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              Wochenziele
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {(planning.goals ?? []).map((goal) => (
                <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                  <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{goal.title}</span>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', alignItems: 'center' }}
                    aria-label="Ziel entfernen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            {/* Neues Ziel hinzufügen */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal() } }}
                placeholder="Neues Ziel…"
                style={{ flex: 1, padding: '0.7rem 0.9rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={addGoal}
                disabled={!newGoalTitle.trim()}
                style={{ padding: '0.7rem 0.9rem', background: newGoalTitle.trim() ? 'var(--accent)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', cursor: newGoalTitle.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }}
                aria-label="Ziel hinzufügen"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Speichern */}
          <button
            onClick={savePlanning}
            disabled={saving}
            style={{ padding: '0.9rem', background: saving ? 'var(--text-muted)' : saveSuccess ? '#22c55e' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
          >
            {saving ? 'Wird gespeichert…' : saveSuccess ? '✓ Gespeichert' : 'Planung speichern'}
          </button>
        </div>
      )}

      {/* ── REFLEXION ── */}
      {!loading && activeSubTab === 'reflexion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Wochenziele-Status */}
          {(planning.goals ?? []).length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                Wochenziele
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(planning.goals ?? []).map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoalCompleted(goal.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: goal.completed ? '#22c55e14' : 'var(--bg-card)', border: `1px solid ${goal.completed ? '#22c55e40' : 'var(--border)'}`, borderRadius: '8px', padding: '0.65rem 0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                  >
                    <span style={{ fontSize: '1rem', color: goal.completed ? '#22c55e' : 'var(--border)', flexShrink: 0 }}>
                      {goal.completed ? '✓' : '○'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: goal.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: goal.completed ? 'line-through' : 'none' }}>
                      {goal.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {(planning.goals ?? []).length === 0 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
              Keine Wochenziele geplant. Ziele in der Planung definieren.
            </div>
          )}

          {/* Reflexionsfragen */}
          {[
            { key: 'what_went_well' as const, label: 'Was lief gut?', placeholder: 'Was hat besonders funktioniert…' },
            { key: 'what_went_badly' as const, label: 'Was lief nicht gut?', placeholder: 'Was hat mich ausgebremst…' },
            { key: 'insight' as const, label: 'Eine Erkenntnis — Was ändere ich konkret?', placeholder: 'Nächste Woche mache ich stattdessen…' },
            { key: 'memorable_moments' as const, label: 'Memorable Moments (optional)', placeholder: 'Momente die bleiben…' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                {label}
              </label>
              <textarea
                value={reflection[key] ?? ''}
                onChange={(e) => setReflection((r) => ({ ...r, [key]: e.target.value }))}
                placeholder={placeholder}
                rows={3}
                style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          ))}

          {/* KI-Zusammenfassung */}
          <div>
            {!aiSummary && !aiLoading && (
              <button
                onClick={handleGenerateSummary}
                style={{ width: '100%', padding: '0.85rem', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                💡 KI-Zusammenfassung generieren
              </button>
            )}
            {aiLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mentor denkt…
              </div>
            )}
            {aiError && (
              <div style={{ padding: '0.75rem 1rem', background: '#FFF0EE', border: '1px solid var(--accent-warm)', borderRadius: '10px', color: 'var(--accent-warm)', fontSize: '0.875rem' }}>
                {aiError}
              </div>
            )}
            {aiSummary && (
              <div>
                <div style={{ padding: '1rem 1.1rem', background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))', borderRadius: '10px', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                    Mentor · {weekLabel}
                  </span>
                  {aiSummary}
                </div>
                <button
                  onClick={() => { setAiSummary(null); handleGenerateSummary() }}
                  style={{ marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  ↻ Neu generieren
                </button>
              </div>
            )}
          </div>

          {/* Speichern */}
          <button
            onClick={saveReflection}
            disabled={saving}
            style={{ padding: '0.9rem', background: saving ? 'var(--text-muted)' : saveSuccess ? '#22c55e' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
          >
            {saving ? 'Wird gespeichert…' : saveSuccess ? '✓ Gespeichert' : 'Reflexion speichern'}
          </button>
        </div>
      )}
    </div>
  )
}
