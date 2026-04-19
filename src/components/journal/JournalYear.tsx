import React, { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader, Sparkles } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getJournalPeriod, upsertJournalPeriod, getYearlyGoals, getAllGoalsForYear, createGoal, updateGoal, deleteGoal, updateProfile, getLifeAreaSnapshot, upsertLifeAreaSnapshot, insertFocusAreaChange } from '../../lib/db'
import type { LifeAreaSnapshotRow } from '../../lib/db'
import { generatePeriodSummary, getGoalFeedback, getGoalFeedbackFollowup, generateYearStartAnalysis, type YearStartAnalysis } from '../../lib/claude'
import FeedbackPanel from './FeedbackPanel'
import GoalCascade from './GoalCascade'
import type { GoalRow } from '../../types/database'
import { LIFE_AREAS, LIFE_AREA_ORDER, type LifeArea } from '../../lib/lifeAreas'

// ─── Typen ───────────────────────────────────────────────────────────────────

interface YearPlanningData {
  achievements?: string
}

interface YearReflectionData {
  most_defining?: string
  what_changes?: string
  learnings?: string
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

const goalFeedbackCache = new Map<string, string>()
const followupHistoryCache = new Map<string, Array<{ question: string; answer: string }>>()
let openGoalId: string | null = null

function sliderGradientStyle(value: number, color: string): React.CSSProperties {
  const pct = ((value - 1) / 9) * 100
  return {
    width: '100%',
    cursor: 'pointer',
    background: `linear-gradient(to right, ${color} ${pct}%, var(--border) ${pct}%)`,
  }
}

export default function JournalYear() {
  const { user, profile, setProfile } = useStore()
  const currentYear = new Date().getFullYear()
  const [yearOffset, setYearOffset] = useState(0)
  const [activeSubTab, setActiveSubTab] = useState<'planung' | 'reflexion'>('planung')

  const year = currentYear + yearOffset
  const periodKey = String(year)
  const isCurrentYear = yearOffset === 0

  // Journal Period
  const [planning, setPlanning] = useState<YearPlanningData>({})
  const [reflection, setReflection] = useState<YearReflectionData>({})
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

  // Ist-Stand (life_area_snapshots)
  const [startSnapshot, setStartSnapshot] = useState<LifeAreaSnapshotRow | null>(null)
  const [endSnapshot, setEndSnapshot] = useState<LifeAreaSnapshotRow | null>(null)
  const [startScores, setStartScores] = useState<Record<string, number>>({})
  const [startNotes, setStartNotes] = useState<Record<string, string>>({})
  const [endScores, setEndScores] = useState<Record<string, number>>({})
  const [endNotes, setEndNotes] = useState<Record<string, string>>({})
  const [savingSnapshot, setSavingSnapshot] = useState(false)
  const [snapshotSaved, setSnapshotSaved] = useState(false)

  // Schwerpunktbereiche (aus profiles.ai_profile.focus_areas)
  const [focusAreas, setFocusAreas] = useState<LifeArea[]>(() => {
    try {
      const ap = profile?.ai_profile as Record<string, unknown> | null
      return Array.isArray(ap?.focus_areas) ? (ap!.focus_areas as LifeArea[]) : []
    } catch { return [] }
  })
  const [, setSavingFocus] = useState(false)

  // Schwerpunktwechsel-Dialog
  const [showFocusChangeDialog, setShowFocusChangeDialog] = useState(false)
  const [focusChangeDraft, setFocusChangeDraft] = useState<LifeArea[]>([])
  const [focusChangeReason, setFocusChangeReason] = useState('')
  const [savingFocusChange, setSavingFocusChange] = useState(false)
  const [focusChangeError, setFocusChangeError] = useState<string | null>(null)

  // Jahresstart-Analyse
  const [yearStartLoading, setYearStartLoading] = useState(false)
  const [yearStartAnalysis, setYearStartAnalysis] = useState<YearStartAnalysis | null>(null)
  const [yearStartError, setYearStartError] = useState<string | null>(null)

  async function handleYearStartAnalysis() {
    if (!user) return
    setYearStartLoading(true); setYearStartError(null); setYearStartAnalysis(null)
    try {
      const visions = (profile as Record<string, unknown> | null)?.life_areas as Record<string, string> | null ?? {}
      const analysis = await generateYearStartAnalysis(visions, profile, year)
      setYearStartAnalysis(analysis)
    } catch (err) {
      setYearStartError(err instanceof Error ? err.message : 'KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setYearStartLoading(false)
    }
  }

  function applyAnalysisScores() {
    if (!yearStartAnalysis) return
    const newScores: Record<string, number> = {}
    Object.entries(yearStartAnalysis.scores).forEach(([k, v]) => { newScores[k] = v.score })
    setStartScores(newScores)
  }

  function applyAnalysisFocusAreas() {
    if (!yearStartAnalysis) return
    saveFocusAreas(yearStartAnalysis.focusAreas as LifeArea[])
  }

  async function applyAnalysisGoal(areaKey: string, title: string) {
    if (!user) return
    const count = goals.filter((g) => g.life_area === areaKey && g.status !== 'completed').length
    if (count >= 1) return
    try {
      const goal = await createGoal({ user_id: user.id, title, type: 'year', year, status: 'active', progress: 0, life_area: areaKey as LifeArea })
      setGoals((prev) => [...prev, goal])
    } catch (err) { console.error('Ziel aus Analyse hinzufügen:', err) }
  }

  // Vision inline edit
  const [editingVision, setEditingVision] = useState(false)
  const [visionDraft, setVisionDraft] = useState('')
  const [visionSaving, setVisionSaving] = useState(false)

  async function saveVision() {
    if (!user) return
    setVisionSaving(true)
    try {
      const updated = await updateProfile(user.id, { north_star: visionDraft.trim() || null })
      setProfile({ ...profile!, north_star: updated.north_star })
      setEditingVision(false)
    } catch (err) {
      console.error('Vision speichern:', err)
    } finally {
      setVisionSaving(false)
    }
  }

  // Jahresziele (goals table)
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [allGoals, setAllGoals] = useState<GoalRow[]>([])
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalLifeArea, setNewGoalLifeArea] = useState<LifeArea | null>(null)
  const [goalLimitError, setGoalLimitError] = useState<string | null>(null)

  // Laden
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setGoalsLoading(true)
    try {
      const [p, g, all, snap0, snap1] = await Promise.all([
        getJournalPeriod(user.id, 'year', periodKey),
        getYearlyGoals(user.id, year),
        getAllGoalsForYear(user.id, year),
        getLifeAreaSnapshot(user.id, year, 'start'),
        getLifeAreaSnapshot(user.id, year, 'end'),
      ])
      setStartSnapshot(snap0)
      setEndSnapshot(snap1)
      setStartScores(snap0?.scores ?? {})
      setStartNotes((snap0?.notes as Record<string, string>) ?? {})
      setEndScores(snap1?.scores ?? {})
      setEndNotes((snap1?.notes as Record<string, string>) ?? {})
      const supabasePlanning: YearPlanningData = p ? ((p.planning_data as YearPlanningData) ?? {}) : {}
      const supabaseReflection: YearReflectionData = p ? ((p.reflection_data as YearReflectionData) ?? {}) : {}
      setAiSummary(p?.ai_summary ?? null)

      const draftRaw = localStorage.getItem(`life_os_draft_year_${periodKey}`)
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
      setAllGoals(all)
    } catch (err) {
      console.error('JournalYear laden:', err)
    } finally {
      setLoading(false)
      setGoalsLoading(false)
    }
  }, [user, periodKey, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  // Draft sofort bei jeder Eingabe speichern (synchron, keine Race Condition)
  function saveDraft(newPlanning: YearPlanningData, newReflection: YearReflectionData) {
    localStorage.setItem(`life_os_draft_year_${periodKey}`, JSON.stringify({ planning: newPlanning, reflection: newReflection }))
  }

  // Planung speichern
  async function savePlanning() {
    if (!user) return
    setSaving(true); setSaveSuccess(false)
    try {
      await upsertJournalPeriod(user.id, 'year', periodKey, { planning_data: planning as Record<string, unknown> })
      localStorage.removeItem(`life_os_draft_year_${periodKey}`)
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
      await upsertJournalPeriod(user.id, 'year', periodKey, {
        reflection_data: reflection as Record<string, unknown>,
      })
      localStorage.removeItem(`life_os_draft_year_${periodKey}`)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Reflexion speichern:', err)
    } finally {
      setSaving(false)
    }
  }

  async function saveStartSnapshot() {
    if (!user) return
    setSavingSnapshot(true); setSnapshotSaved(false)
    try {
      const saved = await upsertLifeAreaSnapshot(user.id, year, 'start', startScores, startNotes)
      setStartSnapshot(saved)
      setSnapshotSaved(true)
      setTimeout(() => setSnapshotSaved(false), 2000)
    } catch (err) { console.error('Ist-Stand speichern:', err) }
    finally { setSavingSnapshot(false) }
  }

  async function saveEndSnapshot() {
    if (!user) return
    setSavingSnapshot(true); setSnapshotSaved(false)
    try {
      const saved = await upsertLifeAreaSnapshot(user.id, year, 'end', endScores, endNotes)
      setEndSnapshot(saved)
      setSnapshotSaved(true)
      setTimeout(() => setSnapshotSaved(false), 2000)
    } catch (err) { console.error('Jahresende-Stand speichern:', err) }
    finally { setSavingSnapshot(false) }
  }

  async function saveFocusAreas(areas: LifeArea[]) {
    if (!user) return
    setSavingFocus(true)
    try {
      const currentAp = (profile?.ai_profile as Record<string, unknown> | null) ?? {}
      await updateProfile(user.id, { ai_profile: { ...currentAp, focus_areas: areas } as unknown as import('../../types/database').Json })
      setFocusAreas(areas)
    } catch (err) { console.error('Schwerpunkte speichern:', err) }
    finally { setSavingFocus(false) }
  }

  async function handleFocusAreaChange() {
    if (!user) return
    if (!focusChangeReason.trim()) {
      setFocusChangeError('Bitte erkläre kurz warum du den Schwerpunkt änderst.')
      return
    }
    if (focusChangeDraft.length < 2 || focusChangeDraft.length > 3) {
      setFocusChangeError('Bitte wähle 2–3 Schwerpunktbereiche.')
      return
    }
    setSavingFocusChange(true)
    setFocusChangeError(null)
    try {
      await insertFocusAreaChange(user.id, focusAreas, focusChangeDraft, focusChangeReason.trim())
      await saveFocusAreas(focusChangeDraft)
      setShowFocusChangeDialog(false)
      setFocusChangeReason('')
      setFocusChangeDraft([])
    } catch (err) {
      console.error('Schwerpunktwechsel speichern:', err)
      setFocusChangeError('Fehler beim Speichern — bitte erneut versuchen.')
    } finally {
      setSavingFocusChange(false)
    }
  }

  // KI-Zusammenfassung
  async function handleGenerateSummary() {
    if (!user) return
    setAiLoading(true); setAiError(null)
    try {
      const planData = {
        ...planning,
        north_star: profile?.north_star ?? null,
        goals: goals.map((g) => `${g.title} (${g.status})`),
      }
      const summary = await generatePeriodSummary('year', String(year), planData, reflection as Record<string, unknown>, profile ?? null)
      setAiSummary(summary)
      await upsertJournalPeriod(user.id, 'year', periodKey, { ai_summary: summary })
    } catch (err) {
      console.error('generatePeriodSummary (Jahr) Fehler:', err)
      setAiError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setAiLoading(false)
    }
  }

  // Ziel-Aktionen
  async function addGoal() {
    if (!user || !newGoalTitle.trim()) return
    if (newGoalLifeArea) {
      const count = goals.filter((g) => g.life_area === newGoalLifeArea && g.status !== 'completed').length
      if (count >= 1) {
        setGoalLimitError(`Limit: max. 1 Jahresziel pro Lebensbereich (${LIFE_AREAS[newGoalLifeArea].label}).`)
        return
      }
    }
    setGoalLimitError(null)
    try {
      const goal = await createGoal({
        user_id: user.id,
        title: newGoalTitle.trim(),
        type: 'year',
        year,
        status: 'active',
        progress: 0,
        life_area: newGoalLifeArea,
      })
      setGoals((prev) => [...prev, goal])
      setNewGoalTitle('')
      setNewGoalLifeArea(null)
    } catch (err) {
      console.error('Ziel erstellen:', err)
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
      const text = await getGoalFeedback(goal, null, profile ?? null)
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
      {/* Jahres-Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.5rem' }}>
        <button
          onClick={() => setYearOffset((y) => y - 1)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Vorheriges Jahr"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{year}</div>
          {isCurrentYear && (
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Aktuelles Jahr
            </div>
          )}
        </div>

        <button
          onClick={() => setYearOffset((y) => y + 1)}
          disabled={isCurrentYear}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: isCurrentYear ? 'default' : 'pointer', color: isCurrentYear ? 'var(--border)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Nächstes Jahr"
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

          {/* Jahresstart-Analyse */}
          <div style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))', border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border))', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: yearStartAnalysis ? '1rem' : 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Jahresstart-Analyse {year}
              </div>
              {!yearStartAnalysis && (
                <button
                  onClick={handleYearStartAnalysis}
                  disabled={yearStartLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', background: yearStartLoading ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '7px', cursor: yearStartLoading ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                >
                  {yearStartLoading
                    ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Analysiere…</>
                    : <><Sparkles size={13} /> Mit KI analysieren</>}
                </button>
              )}
              {yearStartAnalysis && (
                <button onClick={() => setYearStartAnalysis(null)} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Schließen ×
                </button>
              )}
            </div>
            {!yearStartAnalysis && !yearStartLoading && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                KI analysiert deine Lebens-Visionen und schlägt Ist-Stand-Werte, Schwerpunktbereiche und Jahresziele vor.
              </p>
            )}
            {yearStartError && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--accent-warm, #f59e0b)' }}>{yearStartError}</p>
            )}

            {yearStartAnalysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Empfohlene Ist-Stand-Scores */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Empfohlene Ist-Stände</span>
                    <button onClick={applyAnalysisScores} style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                      Übernehmen →
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {LIFE_AREA_ORDER.map((key) => {
                      const def = LIFE_AREAS[key]
                      const s = yearStartAnalysis.scores[key]
                      if (!s) return null
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: def.color, minWidth: '22px', paddingTop: '0.1rem' }}>{s.score}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: def.color }}>{def.label}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>— {s.reason}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Empfohlene Schwerpunktbereiche */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Empfohlene Schwerpunkte</span>
                    <button onClick={applyAnalysisFocusAreas} style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                      Übernehmen →
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {yearStartAnalysis.focusAreas.map((key) => {
                      const def = LIFE_AREAS[key as LifeArea]
                      if (!def) return null
                      return (
                        <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: def.bgAlpha, border: `1.5px solid ${def.color}`, color: def.color }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: def.color }} />
                          {def.label}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Empfohlene Jahresziele */}
                {Object.keys(yearStartAnalysis.goals).length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Empfohlene Jahresziele</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {Object.entries(yearStartAnalysis.goals).map(([key, title]) => {
                        const def = LIFE_AREAS[key as LifeArea]
                        if (!def) return null
                        const alreadyExists = goals.some((g) => g.life_area === key && g.status !== 'completed')
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: `1px solid ${def.color}20` }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{title}</span>
                            <button
                              onClick={() => applyAnalysisGoal(key, title)}
                              disabled={alreadyExists}
                              style={{ fontSize: '0.72rem', fontWeight: 600, color: alreadyExists ? 'var(--text-muted)' : def.color, background: 'none', border: `1px solid ${alreadyExists ? 'var(--border)' : def.color}`, borderRadius: '5px', padding: '0.2rem 0.5rem', cursor: alreadyExists ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}
                            >
                              {alreadyExists ? '✓' : '+ Hinzufügen'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ist-Stand Jahresbeginn */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
              Ist-Stand Jahresbeginn {year}
              {startSnapshot && <span style={{ marginLeft: '0.5rem', fontWeight: 400, textTransform: 'none', color: 'var(--accent)' }}>✓ gespeichert</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {LIFE_AREA_ORDER.map((key) => {
                const def = LIFE_AREAS[key]
                const val = startScores[key] ?? 5
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: def.color }}>{def.label}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: def.color }}>{val}/10</span>
                    </div>
                    <div style={{ overflow: 'visible' }}>
                      <input
                        type="range" min={1} max={10} value={val}
                        onChange={(e) => setStartScores((s) => ({ ...s, [key]: Number(e.target.value) }))}
                        style={sliderGradientStyle(val, def.color)}
                      />
                    </div>
                    <input
                      value={startNotes[key] ?? ''}
                      onChange={(e) => setStartNotes((n) => ({ ...n, [key]: e.target.value }))}
                      placeholder="Kurze Notiz (optional)…"
                      style={{ marginTop: 'calc(6px + 0.3rem)', width: '100%', padding: '0.4rem 0.7rem', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-secondary)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )
              })}
            </div>
            <button
              onClick={saveStartSnapshot}
              disabled={savingSnapshot}
              style={{ marginTop: '1rem', width: '100%', padding: '0.7rem', background: snapshotSaved ? '#22c55e' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: savingSnapshot ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
            >
              {savingSnapshot ? 'Speichert…' : snapshotSaved ? '✓ Gespeichert' : 'Ist-Stand speichern'}
            </button>
          </div>

          {/* Schwerpunktbereiche */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Schwerpunktbereiche {year}
              </div>
              {!showFocusChangeDialog && (
                <button
                  onClick={() => { setFocusChangeDraft([...focusAreas]); setFocusChangeReason(''); setFocusChangeError(null); setShowFocusChangeDialog(true) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                >
                  {focusAreas.length === 0 ? 'Schwerpunkte wählen →' : 'Ändern →'}
                </button>
              )}
            </div>

            {/* Aktuelle Schwerpunkte — Anzeige */}
            {!showFocusChangeDialog && (
              focusAreas.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {focusAreas.map((key) => {
                    const def = LIFE_AREAS[key]
                    return (
                      <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: def.bgAlpha, border: `1.5px solid ${def.color}`, color: def.color }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: def.color }} />
                        {def.label}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Noch keine Schwerpunkte gewählt.</p>
              )
            )}

            {/* Änderungs-Dialog */}
            {showFocusChangeDialog && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Wähle 2–3 neue Schwerpunktbereiche:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  {LIFE_AREA_ORDER.map((key) => {
                    const def = LIFE_AREAS[key]
                    const active = focusChangeDraft.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setFocusChangeDraft((prev) =>
                            active ? prev.filter((a) => a !== key) : prev.length < 3 ? [...prev, key] : prev
                          )
                          setFocusChangeError(null)
                        }}
                        style={{ padding: '0.5rem 0.3rem', borderRadius: '7px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.3rem', background: active ? def.bgAlpha : 'var(--bg-primary)', border: `1.5px solid ${active ? def.color : 'var(--border)'}`, color: active ? def.color : 'var(--text-secondary)', transition: 'all 0.12s' }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                        {def.label}
                      </button>
                    )
                  })}
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                    Warum änderst du den Schwerpunkt? <span style={{ color: 'var(--accent-warm, #f59e0b)' }}>*</span>
                  </label>
                  <textarea
                    value={focusChangeReason}
                    onChange={(e) => { setFocusChangeReason(e.target.value); setFocusChangeError(null) }}
                    placeholder="z.B. Ich habe meinen Karriere-Bereich vernachlässigt und möchte ihn jetzt priorisieren…"
                    rows={3}
                    style={{ width: '100%', padding: '0.7rem 0.9rem', border: `1.5px solid ${focusChangeError && !focusChangeReason.trim() ? 'var(--accent-warm, #f59e0b)' : 'var(--border)'}`, borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                {focusChangeError && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--accent-warm, #f59e0b)' }}>{focusChangeError}</p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => { setShowFocusChangeDialog(false); setFocusChangeReason(''); setFocusChangeDraft([]); setFocusChangeError(null) }}
                    style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)' }}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleFocusAreaChange}
                    disabled={savingFocusChange}
                    style={{ flex: 1, padding: '0.6rem 1rem', background: savingFocusChange ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: savingFocusChange ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                  >
                    {savingFocusChange ? 'Wird gespeichert…' : 'Schwerpunkte speichern'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vision */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Meine Vision
              </div>
              {!editingVision && (
                <button
                  onClick={() => { setVisionDraft(profile?.north_star ?? ''); setEditingVision(true) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                >
                  Bearbeiten →
                </button>
              )}
            </div>
            {editingVision ? (
              <div>
                <textarea
                  value={visionDraft}
                  onChange={(e) => setVisionDraft(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="Meine Vision ist…"
                  style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--accent)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, marginBottom: '0.75rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setEditingVision(false)}
                    style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)' }}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={saveVision}
                    disabled={visionSaving}
                    style={{ flex: 1, padding: '0.6rem 1rem', background: visionSaving ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: visionSaving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                  >
                    {visionSaving ? 'Wird gespeichert…' : 'Speichern'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '0.85rem 1rem',
                background: profile?.north_star
                  ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))'
                  : 'var(--bg-card)',
                border: `1px solid ${profile?.north_star ? 'color-mix(in srgb, var(--accent) 20%, var(--border))' : 'var(--border)'}`,
                borderRadius: '10px',
                fontSize: '0.95rem',
                color: profile?.north_star ? 'var(--text-primary)' : 'var(--text-muted)',
                lineHeight: 1.5,
                fontStyle: profile?.north_star ? 'normal' : 'italic',
              }}>
                {profile?.north_star ?? 'Noch keine Vision definiert. Klick auf "Bearbeiten →" um sie festzulegen.'}
              </div>
            )}
          </div>

          {/* Jahresziele */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Jahresziele {year}
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
                {goals.map((goal) => (
                  <div key={goal.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{goal.title}</span>
                        {goal.life_area && LIFE_AREAS[goal.life_area as LifeArea] && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', fontWeight: 600, color: LIFE_AREAS[goal.life_area as LifeArea].color, background: LIFE_AREAS[goal.life_area as LifeArea].bgAlpha, border: `1px solid ${LIFE_AREAS[goal.life_area as LifeArea].color}50`, borderRadius: '4px', padding: '0.1rem 0.35rem', flexShrink: 0 }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: LIFE_AREAS[goal.life_area as LifeArea].color, flexShrink: 0 }} />
                            {LIFE_AREAS[goal.life_area as LifeArea].label}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleGetFeedback(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: aiFeedbackGoalId === goal.id ? 'var(--accent)' : 'var(--text-muted)', padding: '0.1rem', display: 'flex', alignItems: 'center', flexShrink: 0 }} aria-label="KI-Bewertung" title="KI-Bewertung">
                        <Sparkles size={14} />
                      </button>
                      <button
                        onClick={() => removeGoal(goal.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', alignItems: 'center' }}
                        aria-label="Ziel entfernen"
                      >
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
                  </div>
                ))}
              </div>
            )}

            <input
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal() } }}
              placeholder="Was will ich dieses Jahr erreicht haben?"
              style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', marginBottom: '0.5rem' }}>
              {LIFE_AREA_ORDER.map((key) => {
                const area = LIFE_AREAS[key]
                const active = newGoalLifeArea === key
                return (
                  <button key={key} onClick={() => { setNewGoalLifeArea(active ? null : key); setGoalLimitError(null) }}
                    style={{ padding: '0.35rem 0.3rem', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.3rem', background: active ? area.bgAlpha : 'var(--bg-card)', border: `1.5px solid ${active ? area.color : 'var(--border)'}`, color: active ? area.color : 'var(--text-secondary)' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: area.color, flexShrink: 0 }} />
                    {area.label}
                  </button>
                )
              })}
            </div>
            {goalLimitError && <p style={{ color: 'var(--accent-warm)', fontSize: '0.8rem', margin: '0 0 0.4rem' }}>{goalLimitError}</p>}
            <button
              onClick={addGoal}
              disabled={!newGoalTitle.trim()}
              style={{ width: '100%', padding: '0.7rem', background: newGoalTitle.trim() ? 'var(--accent)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', cursor: newGoalTitle.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', fontWeight: 500 }}
            >
              <Plus size={16} /> Ziel hinzufügen
            </button>
          </div>

          {/* Zielkaskade */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              Zielkaskade {year}
            </div>
            {goalsLoading ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lade…</div>
            ) : (
              <GoalCascade allGoals={allGoals} year={year} />
            )}
          </div>

          {/* "Was will ich {year} erreicht haben?" — deaktiviert (Paket 9D) */}

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
          {/* Jahresziele-Status */}
          {goals.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                Jahresziele — Status
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
              Keine Jahresziele geplant. Ziele in der Planung definieren.
            </div>
          )}

          {/* Reflexionsfragen */}
          {[
            { key: 'most_defining' as const, label: `Was war das Prägendste ${year}?`, placeholder: 'Die Momente, Entscheidungen oder Erfahrungen die dieses Jahr geprägt haben…' },
            { key: 'what_changes' as const, label: 'Was ändere ich?', placeholder: 'Was mache ich nächstes Jahr anders oder besser…' },
            { key: 'learnings' as const, label: 'Learnings — Was nehme ich mit?', placeholder: 'Die wichtigsten Erkenntnisse des Jahres…' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                {label}
              </label>
              <textarea
                value={reflection[key] ?? ''}
                onChange={(e) => { const u = { ...reflection, [key]: e.target.value }; setReflection(u); saveDraft(planning, u) }}
                placeholder={placeholder}
                rows={3}
                style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          ))}

          {/* Ist-Stand Jahresende */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
              Ist-Stand Jahresende {year}
              {endSnapshot && <span style={{ marginLeft: '0.5rem', fontWeight: 400, textTransform: 'none', color: 'var(--accent)' }}>✓ gespeichert</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {LIFE_AREA_ORDER.map((key) => {
                const def = LIFE_AREAS[key]
                const val = endScores[key] ?? 5
                const startVal = startSnapshot?.scores?.[key]
                const diff = startVal != null ? val - startVal : null
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: def.color }}>{def.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {diff != null && (
                          <span style={{ fontSize: '0.75rem', color: diff > 0 ? '#22c55e' : diff < 0 ? 'var(--accent-warm, #f59e0b)' : 'var(--text-muted)' }}>
                            {diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff}
                          </span>
                        )}
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: def.color }}>{val}/10</span>
                      </div>
                    </div>
                    <div style={{ overflow: 'visible' }}>
                      <input
                        type="range" min={1} max={10} value={val}
                        onChange={(e) => setEndScores((s) => ({ ...s, [key]: Number(e.target.value) }))}
                        style={sliderGradientStyle(val, def.color)}
                      />
                    </div>
                    <input
                      value={endNotes[key] ?? ''}
                      onChange={(e) => setEndNotes((n) => ({ ...n, [key]: e.target.value }))}
                      placeholder="Kurze Notiz (optional)…"
                      style={{ marginTop: 'calc(6px + 0.3rem)', width: '100%', padding: '0.4rem 0.7rem', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-secondary)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                )
              })}
            </div>
            <button
              onClick={saveEndSnapshot}
              disabled={savingSnapshot}
              style={{ marginTop: '1rem', width: '100%', padding: '0.7rem', background: snapshotSaved ? '#22c55e' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: savingSnapshot ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
            >
              {savingSnapshot ? 'Speichert…' : snapshotSaved ? '✓ Gespeichert' : 'Jahresende-Stand speichern'}
            </button>
          </div>

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
                    Mentor · {year}
                  </span>
                  <ReactMarkdown>{aiSummary}</ReactMarkdown>
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
