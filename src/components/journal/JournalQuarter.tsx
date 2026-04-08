import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getJournalPeriod, upsertJournalPeriod, getQuarterlyGoalsByQuarterYear, getYearlyGoals, createGoal, updateGoal, deleteGoal } from '../../lib/db'
import { generatePeriodSummary } from '../../lib/claude'
import type { GoalRow } from '../../types/database'

// ─── Typen ───────────────────────────────────────────────────────────────────

interface QuarterPlanningData {
  focus?: string
}

interface QuarterReflectionData {
  what_went_well?: string
  what_went_badly?: string
  learnings?: string
}

// ─── Datum-Hilfsfunktionen ────────────────────────────────────────────────────

const QUARTER_LABELS: Record<number, { short: string; months: string }> = {
  1: { short: 'Q1', months: 'Jan–Mär' },
  2: { short: 'Q2', months: 'Apr–Jun' },
  3: { short: 'Q3', months: 'Jul–Sep' },
  4: { short: 'Q4', months: 'Okt–Dez' },
}

function getCurrentQuarterYear(): { quarter: number; year: number } {
  const now = new Date()
  return {
    quarter: Math.ceil((now.getMonth() + 1) / 3),
    year: now.getFullYear(),
  }
}

function getQuarterAtOffset(offset: number): { quarter: number; year: number } {
  const { quarter, year } = getCurrentQuarterYear()
  const totalQuarters = (year * 4 + quarter - 1) + offset
  return {
    quarter: ((totalQuarters % 4) + 4) % 4 + 1,
    year: Math.floor(totalQuarters / 4),
  }
}

function getQuarterPeriodKey(quarter: number, year: number): string {
  return `${year}-Q${quarter}`
}

function getQuarterLabel(quarter: number, year: number): string {
  const { short, months } = QUARTER_LABELS[quarter]
  return `${short} ${year} · ${months}`
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function JournalQuarter() {
  const { user, profile } = useStore()
  const current = getCurrentQuarterYear()
  const [quarterOffset, setQuarterOffset] = useState(0)
  const [activeSubTab, setActiveSubTab] = useState<'planung' | 'reflexion'>('planung')

  const { quarter, year } = getQuarterAtOffset(quarterOffset)
  const periodKey = getQuarterPeriodKey(quarter, year)
  const quarterLabel = getQuarterLabel(quarter, year)
  const isCurrentQuarter = quarter === current.quarter && year === current.year

  // Journal Period
  const [planning, setPlanning] = useState<QuarterPlanningData>({})
  const [reflection, setReflection] = useState<QuarterReflectionData>({})
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Quartalsziele (goals table)
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
      const [p, g, pg] = await Promise.all([
        getJournalPeriod(user.id, 'quarter', periodKey),
        getQuarterlyGoalsByQuarterYear(user.id, quarter, year),
        getYearlyGoals(user.id, year),
      ])
      if (p) {
        setPlanning((p.planning_data as QuarterPlanningData) ?? {})
        setReflection((p.reflection_data as QuarterReflectionData) ?? {})
        setAiSummary(p.ai_summary ?? null)
      } else {
        setPlanning({})
        setReflection({})
        setAiSummary(null)
      }
      setGoals(g)
      setParentGoals(pg)
      setNewGoalParentId('')
    } catch (err) {
      console.error('JournalQuarter laden:', err)
    } finally {
      setLoading(false)
      setGoalsLoading(false)
    }
  }, [user, periodKey, quarter, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  // Planung speichern
  async function savePlanning() {
    if (!user) return
    setSaving(true); setSaveSuccess(false)
    try {
      await upsertJournalPeriod(user.id, 'quarter', periodKey, { planning_data: planning as Record<string, unknown> })
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
      await upsertJournalPeriod(user.id, 'quarter', periodKey, {
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

  // KI-Zusammenfassung
  async function handleGenerateSummary() {
    if (!user) return
    setAiLoading(true); setAiError(null)
    try {
      const planData = {
        ...planning,
        goals: goals.map((g) => `${g.title} (${g.status})`),
      }
      const summary = await generatePeriodSummary('quarter', quarterLabel, planData, reflection as Record<string, unknown>, profile ?? null)
      setAiSummary(summary)
      await upsertJournalPeriod(user.id, 'quarter', periodKey, { ai_summary: summary })
    } catch (err) {
      console.error('generatePeriodSummary (Quartal) Fehler:', err)
      setAiError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setAiLoading(false)
    }
  }

  // Ziel-Aktionen
  async function addGoal() {
    if (!user || !newGoalTitle.trim()) return
    try {
      const goal = await createGoal({
        user_id: user.id,
        title: newGoalTitle.trim(),
        type: 'quarterly',
        quarter,
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

  async function removeGoal(id: string) {
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
      {/* Quartals-Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.5rem' }}>
        <button
          onClick={() => setQuarterOffset((q) => q - 1)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Vorheriges Quartal"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{quarterLabel}</div>
          {isCurrentQuarter && (
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Aktuelles Quartal
            </div>
          )}
        </div>

        <button
          onClick={() => setQuarterOffset((q) => q + 1)}
          disabled={isCurrentQuarter}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: isCurrentQuarter ? 'default' : 'pointer', color: isCurrentQuarter ? 'var(--border)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Nächstes Quartal"
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
          {/* Fokus-Thema */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Wofür steht dieses Quartal?
            </label>
            <textarea
              value={planning.focus ?? ''}
              onChange={(e) => setPlanning((p) => ({ ...p, focus: e.target.value }))}
              placeholder="Das übergeordnete Thema oder der Fokus des Quartals…"
              rows={3}
              style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Quartalsziele */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quartalsziele
              </div>
              {goals.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {goals.filter((g) => g.status === 'completed').length} / {goals.length} erledigt
                </div>
              )}
            </div>

            {goalsLoading && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.4rem 0' }}>Lade Ziele…</div>
            )}

            {!goalsLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {goals.map((goal, idx) => (
                  <div key={goal.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {idx === 0 && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', background: 'color-mix(in srgb, var(--accent) 12%, var(--bg-card))', borderRadius: '4px', padding: '0.15rem 0.4rem', flexShrink: 0 }}>
                          Hauptziel
                        </span>
                      )}
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
                        <option value="">Teil von Jahresziel… (optional)</option>
                        {parentGoals.map((pg) => (
                          <option key={pg.id} value={pg.id}>{pg.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Neues Ziel */}
            {parentGoals.length > 0 && (
              <select
                value={newGoalParentId}
                onChange={(e) => setNewGoalParentId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: newGoalParentId ? 'var(--text-primary)' : 'var(--text-muted)', outline: 'none', marginBottom: '0.5rem', cursor: 'pointer' }}
              >
                <option value="">Gehört zu Jahresziel… (optional)</option>
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
                placeholder={goals.length === 0 ? 'Hauptziel dieses Quartals…' : 'Weiteres Ziel (optional)…'}
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
          {/* Quartalsziele-Status */}
          {goals.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                Quartalsziele — Status
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
              Keine Quartalsziele geplant. Ziele in der Planung definieren.
            </div>
          )}

          {/* Reflexionsfragen */}
          {[
            { key: 'what_went_well' as const, label: 'Was lief gut?', placeholder: 'Was hat besonders funktioniert dieses Quartal…' },
            { key: 'what_went_badly' as const, label: 'Was lief nicht gut?', placeholder: 'Was hat mich ausgebremst oder war schwieriger als erwartet…' },
            { key: 'learnings' as const, label: 'Learnings — Was nehme ich mit?', placeholder: 'Erkenntnisse die ich im nächsten Quartal anwende…' },
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
                    Mentor · {quarterLabel}
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
