import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getGoals, createGoal, updateGoal, deleteGoal } from '../lib/db'
import { getCurrentQuarter, getCurrentWeek, getCurrentWeekLabel, getCurrentMonthLabel, getCurrentQuarterLabel, getCurrentYearLabel } from '../lib/utils'
import GoalSheet from '../components/goals/GoalSheet'
import GoalDetailCard from '../components/goals/GoalDetailCard'
import type { GoalRow, GoalInsert, GoalUpdate } from '../types/database'
import type { GoalType } from '../types'

type TabValue = 'all' | GoalType

const TABS: { value: TabValue; label: string }[] = [
  { value: 'three_year', label: '3 Jahre' },
  { value: 'year',       label: 'Jahr' },
  { value: 'quarterly',  label: 'Quartal' },
  { value: 'monthly',    label: 'Monat' },
  { value: 'weekly',     label: 'Woche' },
  { value: 'all',        label: 'Alle' },
]

export default function Goals() {
  const { user, profile } = useStore()
  const navigate = useNavigate()
  const [allGoals, setAllGoals] = useState<GoalRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<TabValue>('all')
  const [weekBannerDismissed, setWeekBannerDismissed] = useState(false)
  const [monthBannerDismissed, setMonthBannerDismissed] = useState(false)

  // Periodenübergang-Modal
  type PeriodModalData = {
    type: 'weekly' | 'monthly' | 'quarterly'
    goals: GoalRow[]
    label: string
    lsKey: string        // localStorage-Key für "bereits bestätigt"
    planType: GoalType   // welcher Ziel-Typ wird neu angelegt
    reviewTrigger: string // für den Review-Link
  }
  const [periodModal, setPeriodModal] = useState<PeriodModalData | null>(null)
  const checkedTransitions = useRef(false)

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetDefaultType, setSheetDefaultType] = useState<GoalType>('weekly')
  const [_sheetDefaultParentId, setSheetDefaultParentId] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null)

  const loadGoals = useCallback(async () => {
    if (!user) return
    try {
      const data = await getGoals(user.id)
      setAllGoals(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { loadGoals() }, [loadGoals])

  // Periodenübergang prüfen — läuft einmalig nach dem ersten Laden
  useEffect(() => {
    if (isLoading || checkedTransitions.current) return
    checkedTransitions.current = true

    const now = new Date()
    const yr  = now.getFullYear()
    const mo  = now.getMonth() + 1
    const wk  = getCurrentWeek()
    const qt  = getCurrentQuarter()

    // Monat (höchste Priorität)
    const prevMo  = mo > 1 ? mo - 1 : 12
    const prevMoYr = mo > 1 ? yr : yr - 1
    const moKey   = `life_os_transition_monthly_${yr}_${mo}`
    const prevMonthGoals = allGoals.filter(
      (g) => g.type === 'monthly' && g.month === prevMo && g.year === prevMoYr
    )
    if (prevMonthGoals.length > 0 && !localStorage.getItem(moKey)) {
      const label = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
        .format(new Date(prevMoYr, prevMo - 1))
      setPeriodModal({ type: 'monthly', goals: prevMonthGoals, label, lsKey: moKey, planType: 'monthly', reviewTrigger: 'monthly_review' })
      return
    }

    // Quartal
    const prevQt   = qt > 1 ? qt - 1 : 4
    const prevQtYr = qt > 1 ? yr : yr - 1
    const qtKey    = `life_os_transition_quarterly_${yr}_${qt}`
    const prevQtGoals = allGoals.filter(
      (g) => g.type === 'quarterly' && g.quarter === prevQt && g.year === prevQtYr
    )
    if (prevQtGoals.length > 0 && !localStorage.getItem(qtKey)) {
      setPeriodModal({ type: 'quarterly', goals: prevQtGoals, label: `Q${prevQt} ${prevQtYr}`, lsKey: qtKey, planType: 'quarterly', reviewTrigger: 'quarterly_review' })
      return
    }

    // Woche
    const prevWk   = wk > 1 ? wk - 1 : 52
    const prevWkYr = wk > 1 ? yr : yr - 1
    const wkKey    = `life_os_transition_weekly_${yr}_${wk}`
    const prevWeekGoals = allGoals.filter(
      (g) => g.type === 'weekly' && g.week === prevWk && g.year === prevWkYr
    )
    if (prevWeekGoals.length > 0 && !localStorage.getItem(wkKey)) {
      setPeriodModal({ type: 'weekly', goals: prevWeekGoals, label: `KW ${prevWk}`, lsKey: wkKey, planType: 'weekly', reviewTrigger: 'weekly_review' })
    }
  }, [isLoading, allGoals])

  function handlePeriodAction(action: 'ja' | 'teilweise' | 'nein' | 'review' | 'plan') {
    if (!periodModal) return
    localStorage.setItem(periodModal.lsKey, '1')
    if (action === 'ja') {
      periodModal.goals.forEach((g) => handleProgressUpdate(g.id, 100))
    } else if (action === 'teilweise') {
      periodModal.goals.forEach((g) => { if (g.progress < 50) handleProgressUpdate(g.id, 50) })
    }
    // 'nein' → Fortschritt unverändertr lassen
    setPeriodModal(null)
    if (action === 'review') navigate('/review')
    if (action === 'plan')   openCreate(periodModal.planType)
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  async function handleSave(payload: GoalInsert | GoalUpdate) {
    if (editingGoal) {
      const updated = await updateGoal(editingGoal.id, payload as GoalUpdate)
      setAllGoals((prev) => prev.map((g) => g.id === editingGoal.id ? updated : g))
    } else {
      const created = await createGoal(payload as GoalInsert)
      setAllGoals((prev) => [...prev, created])
    }
    setEditingGoal(null)
  }

  async function handleDelete(id: string) {
    await deleteGoal(id)
    setAllGoals((prev) => prev.filter((g) => g.id !== id))
  }

  async function handleProgressUpdate(id: string, progress: number) {
    const updated = await updateGoal(id, { progress })
    setAllGoals((prev) => prev.map((g) => g.id === id ? updated : g))
  }

  function openCreate(type: GoalType, parentId?: string) {
    setEditingGoal(null)
    setSheetDefaultType(type)
    setSheetDefaultParentId(parentId ?? null)
    setSheetOpen(true)
  }

  function openEdit(goal: GoalRow) {
    setEditingGoal(goal)
    setSheetDefaultType(goal.type)
    setSheetOpen(true)
  }

  // ── Goal sets by type ──────────────────────────────────────────────────────

  const now = new Date()
  const curYear    = now.getFullYear()
  const curQuarter = getCurrentQuarter()
  const curMonth   = now.getMonth() + 1
  const curWeek    = getCurrentWeek()

  const threeYearGoals = allGoals.filter((g) => g.type === 'three_year')
  const yearGoals      = allGoals.filter((g) => g.type === 'year')
  const quarterly      = allGoals.filter((g) => g.type === 'quarterly' && g.year === curYear && g.quarter === curQuarter)
  const monthly        = allGoals.filter((g) => g.type === 'monthly'   && g.year === curYear && g.month === curMonth)
  const weekly         = allGoals.filter((g) => g.type === 'weekly'    && g.year === curYear && g.week  === curWeek)

  const maxReached: Record<string, boolean> = {
    three_year: threeYearGoals.length >= 3,
    year:       yearGoals.length >= 3,
    quarterly:  quarterly.length >= 3,
    monthly:    monthly.length >= 3,
    weekly:     weekly.length >= 3,
  }

  // Displayed goals depending on tab
  const displayGoals: GoalRow[] =
    tab === 'all'        ? [...threeYearGoals, ...yearGoals, ...quarterly, ...monthly, ...weekly] :
    tab === 'three_year' ? threeYearGoals :
    tab === 'year'       ? yearGoals :
    tab === 'quarterly'  ? quarterly :
    tab === 'monthly'    ? monthly :
    weekly

  // Dynamisches Perioden-Label je nach aktivem Tab
  const periodLabel =
    tab === 'weekly'    ? getCurrentWeekLabel() :
    tab === 'monthly'   ? getCurrentMonthLabel() :
    tab === 'quarterly' ? getCurrentQuarterLabel() :
    tab === 'year'      ? getCurrentYearLabel() :
    tab === 'three_year'? '3-Jahres-Horizont' :
    `${getCurrentWeekLabel()} · ${getCurrentMonthLabel()}`

  // Banner-Bedingungen
  const isMonday = now.getDay() === 1
  const lastDayOfMonth = new Date(curYear, now.getMonth() + 1, 0).getDate()
  const isLastDaysOfMonth = now.getDate() >= lastDayOfMonth - 2

  const showWeekBanner  = isMonday && weekly.length === 0 && !weekBannerDismissed
  const showMonthBanner = isLastDaysOfMonth && monthly.length === 0 && !monthBannerDismissed

  function getDefaultCreateType(): GoalType {
    if (tab === 'all') return 'weekly'
    return tab
  }

  function getChildType(parentType: GoalType): GoalType | null {
    const map: Partial<Record<GoalType, GoalType>> = {
      three_year: 'year',
      year: 'quarterly',
      quarterly: 'monthly',
      monthly: 'weekly',
    }
    return map[parentType] ?? null
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Ziele</h2>
        <button onClick={() => openCreate(getDefaultCreateType())}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.85rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '0.875rem' }}>
          <Plus size={15} /> Neu
        </button>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>{periodLabel}</p>

      {/* Vision reminder */}
      {profile?.north_star && (
        <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--accent)', marginBottom: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.2rem' }}>Vision</span>
          {profile.north_star}
        </div>
      )}

      {/* Wochenwechsel-Banner */}
      {showWeekBanner && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#1a2e1a', border: '1px solid #2d5a2d', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.825rem' }}>
          <span style={{ color: '#7dc97d' }}>
            Neue Woche —&nbsp;<strong>{getCurrentWeekLabel()}</strong>&nbsp;startet.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => { setTab('weekly'); setWeekBannerDismissed(true) }}
              style={{ background: '#2d5a2d', border: 'none', borderRadius: '6px', color: '#7dc97d', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: 600, padding: '0.3rem 0.65rem' }}>
              Wochenziel setzen →
            </button>
            <button onClick={() => setWeekBannerDismissed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7dc97d', padding: '0.2rem', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Monatswechsel-Banner */}
      {showMonthBanner && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#1e1a2e', border: '1px solid #4a3d7a', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.825rem' }}>
          <span style={{ color: '#a78bfa' }}>
            <strong>{getCurrentMonthLabel()}</strong>&nbsp;endet bald — Monatsreview ausstehend.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => { navigate('/review'); setMonthBannerDismissed(true) }}
              style={{ background: '#4a3d7a', border: 'none', borderRadius: '6px', color: '#a78bfa', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: 600, padding: '0.3rem 0.65rem' }}>
              Zum Review →
            </button>
            <button onClick={() => setMonthBannerDismissed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', padding: '0.2rem', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            style={{ padding: '0.4rem 0.75rem', background: tab === t.value ? 'var(--accent)' : 'var(--bg-card)', color: tab === t.value ? '#fff' : 'var(--text-secondary)', border: `1.5px solid ${tab === t.value ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '999px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: tab === t.value ? 600 : 400, transition: 'all 0.12s', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Wird geladen…</p>
      ) : (
        <>
          {/* Baumstruktur für "Alle"-Tab */}
          {tab === 'all' && (() => {
            const relevantGoals = [...threeYearGoals, ...yearGoals, ...quarterly, ...monthly, ...weekly]
            const isEmpty = relevantGoals.length === 0

            if (isEmpty) return <EmptyState type="three_year" onAdd={() => openCreate('three_year')} />

            const threeYearIds  = new Set(threeYearGoals.map((g) => g.id))
            const yearIds       = new Set(yearGoals.map((g) => g.id))
            const quarterlyIds  = new Set(quarterly.map((g) => g.id))
            const monthlyIds    = new Set(monthly.map((g) => g.id))

            // Waisen = Ziele ohne sichtbaren Elternteil
            const orphanYears     = yearGoals.filter((g) => !g.parent_id || !threeYearIds.has(g.parent_id))
            const orphanQuarterly = quarterly.filter((g) => !g.parent_id || !yearIds.has(g.parent_id))
            const orphanMonthly   = monthly.filter((g) => !g.parent_id || !quarterlyIds.has(g.parent_id))
            const orphanWeekly    = weekly.filter((g) => !g.parent_id || !monthlyIds.has(g.parent_id))

            const treeProps = (childType?: GoalType) => ({
              treeGoals: relevantGoals,
              linkedEntryCount: 0,
              onEdit: openEdit,
              onDelete: handleDelete,
              onUpdateProgress: handleProgressUpdate,
              onAddChild: childType ? (pid: string) => openCreate(childType, pid) : undefined,
            })

            return (
              <div>
                {/* 3-Jahres-Ziele als Wurzel */}
                {threeYearGoals.length > 0 && (
                  <>
                    <SectionHeader type="three_year" count={threeYearGoals.length} max={3} onAdd={() => openCreate('three_year')} disabled={maxReached.three_year} />
                    {threeYearGoals.map((g) => <GoalDetailCard key={g.id} goal={g} {...treeProps('year')} />)}
                  </>
                )}

                {/* Waisen-Jahresziele */}
                {orphanYears.length > 0 && (
                  <>
                    <SectionHeader type="year" count={orphanYears.length} max={3} onAdd={() => openCreate('year')} disabled={maxReached.year} />
                    {orphanYears.map((g) => <GoalDetailCard key={g.id} goal={g} {...treeProps('quarterly')} />)}
                  </>
                )}

                {/* Waisen-Quartalsziele */}
                {orphanQuarterly.length > 0 && (
                  <>
                    <SectionHeader type="quarterly" count={orphanQuarterly.length} max={3} onAdd={() => openCreate('quarterly')} disabled={maxReached.quarterly} />
                    {orphanQuarterly.map((g) => <GoalDetailCard key={g.id} goal={g} {...treeProps('monthly')} />)}
                  </>
                )}

                {/* Waisen-Monatsziele */}
                {orphanMonthly.length > 0 && (
                  <>
                    <SectionHeader type="monthly" count={orphanMonthly.length} max={3} onAdd={() => openCreate('monthly')} disabled={maxReached.monthly} />
                    {orphanMonthly.map((g) => <GoalDetailCard key={g.id} goal={g} {...treeProps('weekly')} />)}
                  </>
                )}

                {/* Waisen-Wochenziele */}
                {orphanWeekly.length > 0 && (
                  <>
                    <SectionHeader type="weekly" count={orphanWeekly.length} max={3} onAdd={() => openCreate('weekly')} disabled={maxReached.weekly} />
                    {orphanWeekly.map((g) => <GoalDetailCard key={g.id} goal={g} {...treeProps()} />)}
                  </>
                )}
              </div>
            )
          })()}

          {/* Single-type tabs */}
          {tab !== 'all' && (
            <div>
              {displayGoals.length === 0 ? (
                <EmptyState type={tab} onAdd={() => openCreate(tab)} />
              ) : (
                <>
                  {displayGoals.map((goal) => {
                    const childType = getChildType(goal.type)
                    return (
                      <GoalDetailCard key={goal.id} goal={goal}
                        parentGoal={allGoals.find((g) => g.id === goal.parent_id)}
                        linkedEntryCount={0}
                        onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                        onAddChild={childType ? (pid) => openCreate(childType, pid) : undefined}
                      />
                    )
                  })}
                  {!maxReached[tab] && (
                    <button onClick={() => openCreate(tab)}
                      style={{ width: '100%', padding: '0.75rem', background: 'none', border: '1.5px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <Plus size={14} /> Ziel hinzufügen
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Sheet */}
      <GoalSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingGoal(null) }}
        onSave={handleSave}
        userId={user?.id ?? ''}
        defaultType={sheetDefaultType}
        parentGoals={allGoals}
        editing={editingGoal}
      />

      {/* Periodenübergang-Modal */}
      {periodModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
            {/* Titel */}
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
              Periodenabschluss
            </div>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem', color: 'var(--text-primary)' }}>
              📅 {periodModal.label} ist vorbei.
            </h3>

            {/* Ziele */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {periodModal.type === 'weekly' ? 'Wochenziel' : periodModal.type === 'monthly' ? 'Monatsziel' : 'Quartalsziel'}{periodModal.goals.length > 1 ? 'e' : ''} war{periodModal.goals.length > 1 ? 'en' : ''}:
              </div>
              {periodModal.goals.map((g) => (
                <div key={g.id} style={{ padding: '0.6rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '0.4rem', fontSize: '0.9rem', color: 'var(--text-primary)', borderLeft: '3px solid var(--accent)' }}>
                  "{g.title}"
                </div>
              ))}
            </div>

            {/* Entscheidung */}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Erreicht?</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button onClick={() => handlePeriodAction('ja')}
                style={{ flex: 1, padding: '0.65rem', background: '#1a2e1a', border: '1.5px solid #2d5a2d', borderRadius: '10px', color: '#7dc97d', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 600 }}>
                Ja ✓
              </button>
              <button onClick={() => handlePeriodAction('teilweise')}
                style={{ flex: 1, padding: '0.65rem', background: '#2a2210', border: '1.5px solid #5a4a10', borderRadius: '10px', color: '#d4a843', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 600 }}>
                Teilweise ~
              </button>
              <button onClick={() => handlePeriodAction('nein')}
                style={{ flex: 1, padding: '0.65rem', background: '#2e1a1a', border: '1.5px solid #5a2d2d', borderRadius: '10px', color: '#e07070', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 600 }}>
                Nein ✗
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1rem' }} />

            {/* Navigation-Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handlePeriodAction('review')}
                style={{ flex: 1, padding: '0.6rem', background: 'none', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500 }}>
                → Zum Review
              </button>
              <button onClick={() => handlePeriodAction('plan')}
                style={{ flex: 1, padding: '0.6rem', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600 }}>
                → Neue Periode planen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TYPE_LABELS: Record<GoalType, string> = {
  three_year: '3-Jahres-Ziele',
  year:       'Jahresziele',
  quarterly:  'Quartalsziele',
  monthly:    'Monatsziele',
  weekly:     'Wochenziele',
}

function SectionHeader({ type, count, max, onAdd, disabled }: { type: GoalType; count: number; max: number; onAdd: () => void; disabled: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.6rem' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {TYPE_LABELS[type]} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({count}/{max})</span>
      </span>
      {!disabled && (
        <button onClick={onAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem', padding: 0 }}>
          <Plus size={12} /> Neu
        </button>
      )}
    </div>
  )
}

const EMPTY_MSGS: Record<GoalType, string> = {
  three_year: 'Noch kein 3-Jahres-Ziel. Wo stehst du in 3 Jahren?',
  year:       'Noch kein Jahresziel. Was muss in 12 Monaten passieren?',
  quarterly:  'Noch kein Quartalsziel. Was willst du in den nächsten 3 Monaten erreichen?',
  monthly:    'Noch kein Monatsziel. Was ist dein Fokus diesen Monat?',
  weekly:     'Noch kein Wochenziel. Was erledigst du diese Woche?',
}

function EmptyState({ type, onAdd }: { type: GoalType; onAdd: () => void }) {
  return (
    <div style={{ padding: '1.75rem', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 0.85rem', fontSize: '0.9rem', lineHeight: 1.5 }}>{EMPTY_MSGS[type]}</p>
      <button onClick={onAdd} style={{ padding: '0.55rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 500 }}>
        Ziel erstellen →
      </button>
    </div>
  )
}
