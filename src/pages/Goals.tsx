import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getGoals, createGoal, updateGoal, deleteGoal } from '../lib/db'
import { getCurrentQuarter, getCurrentWeek } from '../lib/utils'
import GoalSheet from '../components/goals/GoalSheet'
import GoalDetailCard from '../components/goals/GoalDetailCard'
import type { GoalRow, GoalInsert, GoalUpdate } from '../types/database'
import type { GoalType } from '../types'

const TABS: { value: 'all' | GoalType; label: string }[] = [
  { value: 'all',       label: 'Alle' },
  { value: 'quarterly', label: 'Quartal' },
  { value: 'monthly',   label: 'Monat' },
  { value: 'weekly',    label: 'Woche' },
]

export default function Goals() {
  const { user, profile } = useStore()
  const [allGoals, setAllGoals] = useState<GoalRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<'all' | GoalType>('all')

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

  // ── Build tree structure ───────────────────────────────────────────────────

  const now = new Date()
  const curYear    = now.getFullYear()
  const curQuarter = getCurrentQuarter()
  const curMonth   = now.getMonth() + 1
  const curWeek    = getCurrentWeek()

  // Filter to current period goals + parent links
  const quarterly = allGoals.filter((g) => g.type === 'quarterly' && g.year === curYear && g.quarter === curQuarter)
  const monthly   = allGoals.filter((g) => g.type === 'monthly'   && g.year === curYear && g.month === curMonth)
  const weekly    = allGoals.filter((g) => g.type === 'weekly'    && g.year === curYear && g.week  === curWeek)

  function getChildren(parentId: string, type: 'monthly' | 'weekly'): GoalRow[] {
    return (type === 'monthly' ? monthly : weekly).filter((g) => g.parent_id === parentId)
  }

  function getLinkedEntryCount(_goalId: string): number {
    return 0 // will be populated in a later iteration with DB query
  }

  // Displayed goals depending on tab
  const displayGoals: GoalRow[] =
    tab === 'all'       ? [...quarterly, ...monthly, ...weekly] :
    tab === 'quarterly' ? quarterly :
    tab === 'monthly'   ? monthly :
    weekly

  const maxReached: Record<string, boolean> = {
    quarterly: quarterly.length >= 3,
    monthly:   monthly.length >= 3,
    weekly:    weekly.length >= 3,
  }

  const periodLabel = `Q${curQuarter} ${curYear} · ${now.toLocaleString('de-DE', { month: 'long' })} · KW ${curWeek}`

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Ziele</h2>
        <button onClick={() => openCreate(tab === 'all' ? 'weekly' : tab)}
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
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            style={{ padding: '0.4rem 0.85rem', background: tab === t.value ? 'var(--accent)' : 'var(--bg-card)', color: tab === t.value ? '#fff' : 'var(--text-secondary)', border: `1.5px solid ${tab === t.value ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '999px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: tab === t.value ? 600 : 400, transition: 'all 0.12s' }}>
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
              {quarterly.length === 0 && monthly.length === 0 && weekly.length === 0 ? (
                <EmptyState type="quarterly" onAdd={() => openCreate('quarterly')} />
              ) : (
                <>
                  <SectionHeader type="quarterly" count={quarterly.length} max={3} onAdd={() => openCreate('quarterly')} disabled={maxReached.quarterly} />
                  {quarterly.map((qGoal) => (
                    <GoalDetailCard key={qGoal.id} goal={qGoal}
                      children={getChildren(qGoal.id, 'monthly').map((mGoal) => ({
                        ...mGoal,
                        // attach weekly children inline handled by recursive card
                      }))}
                      linkedEntryCount={getLinkedEntryCount(qGoal.id)}
                      onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                      onAddChild={(parentId) => openCreate('monthly', parentId)}
                    />
                  ))}

                  <SectionHeader type="monthly" count={monthly.length} max={3} onAdd={() => openCreate('monthly')} disabled={maxReached.monthly} />
                  {monthly.map((mGoal) => (
                    <GoalDetailCard key={mGoal.id} goal={mGoal}
                      parentGoal={allGoals.find((g) => g.id === mGoal.parent_id)}
                      children={getChildren(mGoal.id, 'weekly')}
                      linkedEntryCount={getLinkedEntryCount(mGoal.id)}
                      onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                      onAddChild={(parentId) => openCreate('weekly', parentId)}
                    />
                  ))}

                  <SectionHeader type="weekly" count={weekly.length} max={3} onAdd={() => openCreate('weekly')} disabled={maxReached.weekly} />
                  {weekly.map((wGoal) => (
                    <GoalDetailCard key={wGoal.id} goal={wGoal}
                      parentGoal={allGoals.find((g) => g.id === wGoal.parent_id)}
                      linkedEntryCount={getLinkedEntryCount(wGoal.id)}
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
                  {displayGoals.map((goal) => (
                    <GoalDetailCard key={goal.id} goal={goal}
                      parentGoal={allGoals.find((g) => g.id === goal.parent_id)}
                      linkedEntryCount={getLinkedEntryCount(goal.id)}
                      onEdit={openEdit} onDelete={handleDelete} onUpdateProgress={handleProgressUpdate}
                      onAddChild={goal.type !== 'weekly' ? (parentId) => openCreate(goal.type === 'quarterly' ? 'monthly' : 'weekly', parentId) : undefined}
                    />
                  ))}
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

function SectionHeader({ type, count, max, onAdd, disabled }: { type: GoalType; count: number; max: number; onAdd: () => void; disabled: boolean }) {
  const labels: Record<GoalType, string> = { quarterly: 'Quartalsziele', monthly: 'Monatsziele', weekly: 'Wochenziele' }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.6rem' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {labels[type]} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({count}/{max})</span>
      </span>
      {!disabled && (
        <button onClick={onAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem', padding: 0 }}>
          <Plus size={12} /> Neu
        </button>
      )}
    </div>
  )
}

function EmptyState({ type, onAdd }: { type: GoalType; onAdd: () => void }) {
  const msgs: Record<GoalType, string> = {
    quarterly: 'Noch kein Quartalsziel. Was willst du in den nächsten 3 Monaten erreichen?',
    monthly:   'Noch kein Monatsziel. Was ist dein Fokus diesen Monat?',
    weekly:    'Noch kein Wochenziel. Was erledigst du diese Woche?',
  }
  return (
    <div style={{ padding: '1.75rem', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 0.85rem', fontSize: '0.9rem', lineHeight: 1.5 }}>{msgs[type]}</p>
      <button onClick={onAdd} style={{ padding: '0.55rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 500 }}>
        Ziel erstellen →
      </button>
    </div>
  )
}
