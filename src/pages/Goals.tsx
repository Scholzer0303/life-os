import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getGoals, createGoal, updateGoal, deleteGoal } from '../lib/db'
import { getCurrentQuarter, getCurrentWeek } from '../lib/utils'
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
  const [allGoals, setAllGoals] = useState<GoalRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<TabValue>('all')

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

  const periodLabel = `Q${curQuarter} ${curYear} · ${now.toLocaleString('de-DE', { month: 'long' })} · KW ${curWeek}`

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

      {/* Nordstern reminder */}
      {profile?.north_star && (
        <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--accent)', marginBottom: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.2rem' }}>Nordstern</span>
          {profile.north_star}
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
          {/* Tree view for "All" tab */}
          {tab === 'all' && (
            <div>
              {threeYearGoals.length === 0 && yearGoals.length === 0 && quarterly.length === 0 && monthly.length === 0 && weekly.length === 0 ? (
                <EmptyState type="three_year" onAdd={() => openCreate('three_year')} />
              ) : (
                <>
                  {threeYearGoals.length > 0 && (
                    <>
                      <SectionHeader type="three_year" count={threeYearGoals.length} max={3} onAdd={() => openCreate('three_year')} disabled={maxReached.three_year} />
                      {threeYearGoals.map((g) => (
                        <GoalDetailCard key={g.id} goal={g}
                          linkedEntryCount={0}
                          onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                          onAddChild={(pid) => openCreate('year', pid)}
                        />
                      ))}
                    </>
                  )}

                  {(yearGoals.length > 0 || threeYearGoals.length > 0) && (
                    <>
                      <SectionHeader type="year" count={yearGoals.length} max={3} onAdd={() => openCreate('year')} disabled={maxReached.year} />
                      {yearGoals.map((g) => (
                        <GoalDetailCard key={g.id} goal={g}
                          parentGoal={allGoals.find((p) => p.id === g.parent_id)}
                          linkedEntryCount={0}
                          onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                          onAddChild={(pid) => openCreate('quarterly', pid)}
                        />
                      ))}
                    </>
                  )}

                  <SectionHeader type="quarterly" count={quarterly.length} max={3} onAdd={() => openCreate('quarterly')} disabled={maxReached.quarterly} />
                  {quarterly.map((g) => (
                    <GoalDetailCard key={g.id} goal={g}
                      parentGoal={allGoals.find((p) => p.id === g.parent_id)}
                      linkedEntryCount={0}
                      onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                      onAddChild={(pid) => openCreate('monthly', pid)}
                    />
                  ))}

                  <SectionHeader type="monthly" count={monthly.length} max={3} onAdd={() => openCreate('monthly')} disabled={maxReached.monthly} />
                  {monthly.map((g) => (
                    <GoalDetailCard key={g.id} goal={g}
                      parentGoal={allGoals.find((p) => p.id === g.parent_id)}
                      linkedEntryCount={0}
                      onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                      onAddChild={(pid) => openCreate('weekly', pid)}
                    />
                  ))}

                  <SectionHeader type="weekly" count={weekly.length} max={3} onAdd={() => openCreate('weekly')} disabled={maxReached.weekly} />
                  {weekly.map((g) => (
                    <GoalDetailCard key={g.id} goal={g}
                      parentGoal={allGoals.find((p) => p.id === g.parent_id)}
                      linkedEntryCount={0}
                      onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                    />
                  ))}
                </>
              )}
            </div>
          )}

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
