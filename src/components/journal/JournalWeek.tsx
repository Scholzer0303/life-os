import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getJournalPeriod, upsertJournalPeriod, getWeeklyGoalsByWeekYear, getMonthlyGoals, createGoal, updateGoal, deleteGoal } from '../../lib/db'
import { generatePeriodSummary } from '../../lib/claude'
import type { GoalRow } from '../../types/database'

// ─── Typen ───────────────────────────────────────────────────────────────────

interface WeekPlanningData {
  identity_statement?: string
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

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function JournalWeek() {
  const { user, profile } = useStore()
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeSubTab, setActiveSubTab] = useState<'planung' | 'reflexion'>('planung')

  const [planning, setPlanning] = useState<WeekPlanningData>({ identity_statement: '' })
  const [reflection, setReflection] = useState<WeekReflectionData>({})
  const [aiSummary, setAiSummary] = useState<string | null>(null)

  // Wochenziele aus goals-Tabelle
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalParentId, setNewGoalParentId] = useState('')
  const [parentGoals, setParentGoals] = useState<GoalRow[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const monday = getMondayAtOffset(weekOffset)
  const periodKey = getWeekPeriodKey(monday)
  const weekLabel = getWeekLabel(monday)
  const isCurrentWeek = weekOffset === 0
  const { week, year } = getISOWeekYear(monday)
  const weekMonth = monday.getMonth() + 1
  const weekMonthYear = monday.getFullYear()

  const hasNoPlanning = isCurrentWeek && !planning.identity_statement?.trim() && goals.length === 0

  // Periode + Ziele laden wenn sich die Woche ändert
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setGoalsLoading(true)
    try {
      const [p, g, pg] = await Promise.all([
        getJournalPeriod(user.id, 'week', periodKey),
        getWeeklyGoalsByWeekYear(user.id, week, year),
        getMonthlyGoals(user.id, weekMonth, weekMonthYear),
      ])
      if (p) {
        setPlanning((p.planning_data as WeekPlanningData) ?? { identity_statement: '' })
        setReflection((p.reflection_data as WeekReflectionData) ?? {})
        setAiSummary(p.ai_summary ?? null)
      } else {
        setPlanning({ identity_statement: '' })
        setReflection({})
        setAiSummary(null)
      }
      setGoals(g)
      setParentGoals(pg)
      setNewGoalParentId('')
    } catch (err) {
      console.error('JournalWeek laden:', err)
    } finally {
      setLoading(false)
      setGoalsLoading(false)
    }
  }, [user, periodKey, week, year, weekMonth, weekMonthYear]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  // Planung speichern (nur identity_statement — Ziele direkt in goals-Tabelle)
  async function savePlanning() {
    if (!user) return
    setSaving(true); setSaveSuccess(false)
    try {
      await upsertJournalPeriod(user.id, 'week', periodKey, { planning_data: planning as Record<string, unknown> })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Planung speichern:', err)
    } finally {
      setSaving(false)
    }
  }

  // Reflexion speichern
  async function saveReflection() {
    if (!user) return
    setSaving(true); setSaveSuccess(false)
    try {
      await upsertJournalPeriod(user.id, 'week', periodKey, {
        reflection_data: reflection as Record<string, unknown>,
      })
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
      const planData = {
        ...planning,
        goals: goals.map((g) => `${g.title} (${g.status})`),
      }
      const summary = await generatePeriodSummary(
        'week', weekLabel,
        planData as Record<string, unknown>,
        reflection as Record<string, unknown>,
        profile ?? null
      )
      setAiSummary(summary)
      await upsertJournalPeriod(user.id, 'week', periodKey, { ai_summary: summary })
    } catch (err) {
      console.error('generatePeriodSummary (Woche) Fehler:', err)
      setAiError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setAiLoading(false)
    }
  }

  // Ziel-Aktionen (direkt in goals-Tabelle)
  async function addGoal() {
    if (!user || !newGoalTitle.trim()) return
    try {
      const goal = await createGoal({
        user_id: user.id,
        title: newGoalTitle.trim(),
        type: 'weekly',
        week,
        year,
        status: 'active',
        progress: 0,
        parent_id: newGoalParentId || null,
      })
      setGoals((prev) => [...prev, goal])
      setNewGoalTitle('')
      // newGoalParentId bleibt — so können mehrere Ziele unter demselben Monatsziel erstellt werden
    } catch (err) {
      console.error('Ziel erstellen:', err)
    }
  }

  async function updateGoalParent(goalId: string, parentId: string | null) {
    try {
      const updated = await updateGoal(goalId, { parent_id: parentId })
      setGoals((prev) => prev.map((g) => g.id === goalId ? updated : g))
    } catch (err) {
      console.error('Parent update:', err)
    }
  }

  async function removeGoal(id: string) {
    try {
      await deleteGoal(id)
      setGoals((prev) => prev.filter((g) => g.id !== id))
    } catch (err) {
      console.error('Ziel löschen:', err)
    }
  }

  async function toggleGoalStatus(goal: GoalRow) {
    const nextStatus = goal.status === 'completed' ? 'active' : 'completed'
    try {
      const updated = await updateGoal(goal.id, { status: nextStatus })
      setGoals((prev) => prev.map((g) => g.id === goal.id ? updated : g))
    } catch (err) {
      console.error('Ziel-Status:', err)
    }
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
            KW {week} startet — Planung ausstehend
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
            {goalsLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Lade…</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {goals.map((goal) => (
                    <div key={goal.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{goal.title}</span>
                        <button
                          onClick={() => removeGoal(goal.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                          aria-label="Ziel entfernen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {parentGoals.length > 0 && (
                        <select
                          value={goal.parent_id ?? ''}
                          onChange={(e) => updateGoalParent(goal.id, e.target.value || null)}
                          style={{ marginTop: '0.35rem', width: '100%', padding: '0.3rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: goal.parent_id ? 'var(--accent)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">Teil von Monatsziel… (optional)</option>
                          {parentGoals.map((pg) => (
                            <option key={pg.id} value={pg.id}>{pg.title}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                {parentGoals.length > 0 && (
                  <select
                    value={newGoalParentId}
                    onChange={(e) => setNewGoalParentId(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: newGoalParentId ? 'var(--text-primary)' : 'var(--text-muted)', outline: 'none', marginBottom: '0.5rem', cursor: 'pointer' }}
                  >
                    <option value="">Neues Ziel — Monatsziel zuordnen… (optional)</option>
                    {parentGoals.map((pg) => (
                      <option key={pg.id} value={pg.id}>{pg.title}</option>
                    ))}
                  </select>
                )}
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
              </>
            )}
          </div>

          {/* Speichern (nur Identitätssatz — Ziele direkt gespeichert) */}
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
          {goals.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                Wochenziele
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {goals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoalStatus(goal)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: goal.status === 'completed' ? '#22c55e14' : 'var(--bg-card)', border: `1px solid ${goal.status === 'completed' ? '#22c55e40' : 'var(--border)'}`, borderRadius: '8px', padding: '0.65rem 0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                  >
                    <span style={{ fontSize: '1rem', color: goal.status === 'completed' ? '#22c55e' : 'var(--border)', flexShrink: 0 }}>
                      {goal.status === 'completed' ? '✓' : '○'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: goal.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: goal.status === 'completed' ? 'line-through' : 'none' }}>
                      {goal.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {goals.length === 0 && (
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
