import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronLeft, ChevronRight, Plus, Trash2, Sparkles } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getJournalPeriod, upsertJournalPeriod, getMonthlyGoals, getQuarterlyGoalsByQuarterYear, createGoal, updateGoal, deleteGoal } from '../../lib/db'
import { generatePeriodSummary, getGoalFeedback, getGoalFeedbackFollowup } from '../../lib/claude'
import FeedbackPanel from './FeedbackPanel'
import HabitManager from '../habits/HabitManager'
import type { GoalRow } from '../../types/database'

// ─── Typen ───────────────────────────────────────────────────────────────────

interface MonthPlanningData {
  theme?: string
}

interface MonthReflectionData {
  what_went_well?: string
  what_went_badly?: string
  learnings?: string
}

// ─── Datum-Hilfsfunktionen ────────────────────────────────────────────────────

function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

function getMonthAtOffset(offset: number): { month: number; year: number } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

function getMonthPeriodKey(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function getMonthLabel(month: number, year: number): string {
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

const goalFeedbackCache = new Map<string, string>()
const followupHistoryCache = new Map<string, Array<{ question: string; answer: string }>>()
let openGoalId: string | null = null

export default function JournalMonth() {
  const { user, profile } = useStore()
  const current = getCurrentMonthYear()
  const [monthOffset, setMonthOffset] = useState(0)
  const [activeSubTab, setActiveSubTab] = useState<'planung' | 'reflexion'>('planung')

  const { month, year } = getMonthAtOffset(monthOffset)
  const periodKey = getMonthPeriodKey(month, year)
  const monthLabel = getMonthLabel(month, year)
  const isCurrentMonth = monthOffset === 0

  // Journal Period
  const [planning, setPlanning] = useState<MonthPlanningData>({})
  const [reflection, setReflection] = useState<MonthReflectionData>({})
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // KI-Ziel-Feedback — initialisiert aus Modul-level Cache
  const [aiFeedbackGoalId, setAiFeedbackGoalId] = useState<string | null>(() => openGoalId)
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false)
  const [aiFeedbackText, setAiFeedbackText] = useState<string | null>(() => openGoalId ? (goalFeedbackCache.get(openGoalId) ?? null) : null)
  const [aiFeedbackError, setAiFeedbackError] = useState<string | null>(null)
  const [followupInput, setFollowupInput] = useState('')
  const [followupHistory, setFollowupHistory] = useState<Array<{ question: string; answer: string }>>(() => openGoalId ? (followupHistoryCache.get(openGoalId) ?? []) : [])
  const [followupLoading, setFollowupLoading] = useState(false)
  const [showFollowup, setShowFollowup] = useState(false)

  // Monatsziele (goals table)
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalParentId, setNewGoalParentId] = useState('')
  const [parentGoals, setParentGoals] = useState<GoalRow[]>([])

  // Laden
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setGoalsLoading(true)
    try {
      const quarter = Math.ceil(month / 3)
      const [p, g, pg] = await Promise.all([
        getJournalPeriod(user.id, 'month', periodKey),
        getMonthlyGoals(user.id, month, year),
        getQuarterlyGoalsByQuarterYear(user.id, quarter, year),
      ])
      const supabasePlanning: MonthPlanningData = p ? ((p.planning_data as MonthPlanningData) ?? {}) : {}
      const supabaseReflection: MonthReflectionData = p ? ((p.reflection_data as MonthReflectionData) ?? {}) : {}
      setAiSummary(p?.ai_summary ?? null)

      const draftRaw = localStorage.getItem(`life_os_draft_month_${periodKey}`)
      if (draftRaw) {
        try {
          const draft = JSON.parse(draftRaw)
          setPlanning({ ...supabasePlanning, ...(draft.planning ?? {}) })
          setReflection({ ...supabaseReflection, ...(draft.reflection ?? {}) })
        } catch {
          setPlanning(supabasePlanning)
          setReflection(supabaseReflection)
        }
      } else {
        setPlanning(supabasePlanning)
        setReflection(supabaseReflection)
      }

      setGoals(g)
      setParentGoals(pg)
      setNewGoalParentId('')
    } catch (err) {
      console.error('JournalMonth laden:', err)
    } finally {
      setLoading(false)
      setGoalsLoading(false)
    }
  }, [user, periodKey, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  // Draft sofort bei jeder Eingabe speichern (synchron, keine Race Condition)
  function saveDraft(newPlanning: MonthPlanningData, newReflection: MonthReflectionData) {
    localStorage.setItem(`life_os_draft_month_${periodKey}`, JSON.stringify({ planning: newPlanning, reflection: newReflection }))
  }

  // Planung speichern
  async function savePlanning() {
    if (!user) return
    setSaving(true); setSaveSuccess(false)
    try {
      await upsertJournalPeriod(user.id, 'month', periodKey, { planning_data: planning as Record<string, unknown> })
      localStorage.removeItem(`life_os_draft_month_${periodKey}`)
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
      await upsertJournalPeriod(user.id, 'month', periodKey, {
        reflection_data: reflection as Record<string, unknown>,
      })
      localStorage.removeItem(`life_os_draft_month_${periodKey}`)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Reflexion speichern:', err)
    } finally {
      setSaving(false)
    }
  }

  // KI-Zusammenfassung
  async function handleGenerateSummary() {
    if (!user) return
    setAiLoading(true); setAiError(null)
    try {
      const planData = {
        ...planning,
        goals: goals.map((g) => `${g.title} (${g.status})`),
      }
      const summary = await generatePeriodSummary('month', monthLabel, planData, reflection as Record<string, unknown>, profile ?? null)
      setAiSummary(summary)
      await upsertJournalPeriod(user.id, 'month', periodKey, { ai_summary: summary })
    } catch (err) {
      console.error('generatePeriodSummary (Monat) Fehler:', err)
      setAiError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setAiLoading(false)
    }
  }

  // Monatsziele
  async function addGoal() {
    if (!user || !newGoalTitle.trim()) return
    try {
      const goal = await createGoal({
        user_id: user.id,
        title: newGoalTitle.trim(),
        type: 'monthly',
        month,
        year,
        status: 'active',
        parent_id: newGoalParentId || null,
        progress: 0,
      })
      setGoals((prev) => [...prev, goal])
      setNewGoalTitle('')
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

  async function toggleGoalStatus(goal: GoalRow) {
    const nextStatus = goal.status === 'completed' ? 'active' : 'completed'
    try {
      const updated = await updateGoal(goal.id, { status: nextStatus })
      setGoals((prev) => prev.map((g) => g.id === goal.id ? updated : g))
    } catch (err) {
      console.error('Ziel-Status:', err)
    }
  }

  function resetFollowup() {
    setFollowupInput('')
    setFollowupHistory([])
    setFollowupLoading(false); setShowFollowup(false)
  }

  async function handleGetFeedback(goal: GoalRow, force = false) {
    if (aiFeedbackGoalId === goal.id && !force && !aiFeedbackLoading) {
      openGoalId = null
      setAiFeedbackGoalId(null); setAiFeedbackText(null); setAiFeedbackError(null); resetFollowup(); return
    }
    if (aiFeedbackGoalId !== goal.id || force) resetFollowup()
    openGoalId = goal.id
    setAiFeedbackGoalId(goal.id); setAiFeedbackError(null)
    if (!force && goalFeedbackCache.has(goal.id)) {
      setAiFeedbackText(goalFeedbackCache.get(goal.id)!)
      setFollowupHistory(followupHistoryCache.get(goal.id) ?? [])
      return
    }
    followupHistoryCache.delete(goal.id)
    setAiFeedbackLoading(true); setAiFeedbackText(null)
    try {
      const parentGoal = parentGoals.find((g) => g.id === goal.parent_id) ?? null
      const text = await getGoalFeedback(goal, parentGoal, profile ?? null)
      goalFeedbackCache.set(goal.id, text); setAiFeedbackText(text)
    } catch {
      setAiFeedbackError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setAiFeedbackLoading(false)
    }
  }

  async function handleFollowup(goal: GoalRow) {
    if (!followupInput.trim() || !aiFeedbackText) return
    const question = followupInput.trim()
    const currentHistory = followupHistoryCache.get(goal.id) ?? []
    setFollowupLoading(true)
    try {
      const result = await getGoalFeedbackFollowup(goal, aiFeedbackText, question, profile ?? null, currentHistory)
      const newEntry = { question, answer: result }
      const updatedHistory = [...currentHistory, newEntry]
      followupHistoryCache.set(goal.id, updatedHistory)
      setFollowupHistory(updatedHistory)
      setFollowupInput('')
    } catch {
      const errorEntry = { question, answer: 'KI momentan nicht verfügbar — bitte erneut versuchen.' }
      const updatedHistory = [...currentHistory, errorEntry]
      followupHistoryCache.set(goal.id, updatedHistory)
      setFollowupHistory(updatedHistory)
      setFollowupInput('')
    } finally {
      setFollowupLoading(false)
    }
  }

  async function removeGoal(id: string) {
    if (!confirm('Ziel wirklich löschen?')) return
    try {
      await deleteGoal(id)
      setGoals((prev) => prev.filter((g) => g.id !== id))
    } catch (err) {
      console.error('Ziel löschen:', err)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Monats-Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.5rem' }}>
        <button
          onClick={() => setMonthOffset((m) => m - 1)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{monthLabel}</div>
          {isCurrentMonth && (
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Aktueller Monat
            </div>
          )}
        </div>

        <button
          onClick={() => setMonthOffset((m) => m + 1)}
          disabled={month === current.month && year === current.year}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: isCurrentMonth ? 'default' : 'pointer', color: isCurrentMonth ? 'var(--border)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Nächster Monat"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
        {(['planung', 'reflexion'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.55rem 1.1rem', fontSize: '0.875rem', fontWeight: activeSubTab === tab ? 600 : 400, color: activeSubTab === tab ? 'var(--accent)' : 'var(--text-muted)', borderBottom: activeSubTab === tab ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-1px', fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize', transition: 'color 0.15s' }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade…</div>}

      {/* ── PLANUNG ── */}
      {!loading && activeSubTab === 'planung' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Monatsthema */}
          <div>
            <label style={LABEL_STYLE}>Wofür steht dieser Monat?</label>
            <textarea
              value={planning.theme ?? ''}
              onChange={(e) => { const u = { ...planning, theme: e.target.value }; setPlanning(u); saveDraft(u, reflection) }}
              placeholder="Mein Monatsthema ist…"
              rows={2}
              style={TEXTAREA_STYLE}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Monatsziele */}
          <div>
            <div style={LABEL_STYLE}>Monatsziele</div>
            {goalsLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Lade…</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {goals.map((goal) => (
                    <div key={goal.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{goal.title}</span>
                        <button onClick={() => handleGetFeedback(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: aiFeedbackGoalId === goal.id ? 'var(--accent)' : 'var(--text-muted)', padding: '0.1rem', display: 'flex', flexShrink: 0 }} aria-label="KI-Bewertung" title="KI-Bewertung">
                          <Sparkles size={14} />
                        </button>
                        <button onClick={() => removeGoal(goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', flexShrink: 0 }} aria-label="Entfernen">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {aiFeedbackGoalId === goal.id && (
                        <FeedbackPanel
                          loading={aiFeedbackLoading} error={aiFeedbackError} text={aiFeedbackText}
                          showFollowup={showFollowup} followupInput={followupInput} followupHistory={followupHistory} followupLoading={followupLoading}
                          onNewFeedback={() => handleGetFeedback(goal, true)}
                          onToggleFollowup={() => setShowFollowup((v) => !v)}
                          onFollowupChange={setFollowupInput}
                          onFollowupSubmit={() => handleFollowup(goal)}
                        />
                      )}
                      {parentGoals.length > 0 && (
                        <select
                          value={goal.parent_id ?? ''}
                          onChange={(e) => updateGoalParent(goal.id, e.target.value || null)}
                          style={{ marginTop: '0.35rem', width: '100%', padding: '0.3rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: goal.parent_id ? 'var(--accent)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">Teil von Quartalsziel… (optional)</option>
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
                    <option value="">Gehört zu Quartalsziel… (optional)</option>
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
                    aria-label="Hinzufügen"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Habits */}
          <div>
            <HabitManager month={month} year={year} />
          </div>

          {/* Speichern (nur Monatsthema — Ziele und Habits speichern direkt) */}
          <button
            onClick={savePlanning}
            disabled={saving}
            style={{ padding: '0.9rem', background: saving ? 'var(--text-muted)' : saveSuccess ? '#22c55e' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
          >
            {saving ? 'Wird gespeichert…' : saveSuccess ? '✓ Monatsthema gespeichert' : 'Monatsthema speichern'}
          </button>
        </div>
      )}

      {/* ── REFLEXION ── */}
      {!loading && activeSubTab === 'reflexion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Hinweis: Monat noch aktiv */}
          {isCurrentMonth && (() => {
            const today = new Date()
            const lastDay = new Date(year, month, 0).getDate()
            const isLastDay = today.getDate() === lastDay
            if (isLastDay) return null
            const lastDayLabel = `${lastDay}. ${new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(year, month - 1, 1))}`
            return (
              <div style={{ padding: '0.7rem 0.9rem', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))', border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border))', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Monat läuft noch bis {lastDayLabel} — Reflexion kann schon jetzt vorbereitet werden.
              </div>
            )
          })()}
          {/* Monatsziele Status */}
          {goals.length > 0 ? (
            <div>
              <div style={LABEL_STYLE}>Monatsziele</div>
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
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Keine Monatsziele geplant.</div>
          )}

          {/* Reflexionsfelder */}
          {[
            { key: 'what_went_well' as const, label: 'Was lief gut?', placeholder: 'Was hat besonders funktioniert diesen Monat…' },
            { key: 'what_went_badly' as const, label: 'Was lief nicht gut?', placeholder: 'Was hat mich ausgebremst…' },
            { key: 'learnings' as const, label: 'Learnings', placeholder: 'Was nehme ich mit in den nächsten Monat…' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={LABEL_STYLE}>{label}</label>
              <textarea
                value={reflection[key] ?? ''}
                onChange={(e) => { const u = { ...reflection, [key]: e.target.value }; setReflection(u); saveDraft(planning, u) }}
                placeholder={placeholder}
                rows={3}
                style={TEXTAREA_STYLE}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          ))}

          {/* KI-Zusammenfassung */}
          <div>
            {!aiSummary && !aiLoading && (
              <button onClick={handleGenerateSummary} style={{ width: '100%', padding: '0.85rem', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                💡 KI-Zusammenfassung generieren
              </button>
            )}
            {aiLoading && (
              <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                Mentor denkt…
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
                    Mentor · {monthLabel}
                  </span>
                  <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
                <button onClick={() => { setAiSummary(null); handleGenerateSummary() }} style={{ marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
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

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '0.5rem',
}

const TEXTAREA_STYLE: React.CSSProperties = {
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
}
