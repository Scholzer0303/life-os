import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { GoalRow } from '../../types/database'
import { LIFE_AREAS, LIFE_AREA_ORDER, type LifeArea } from '../../lib/lifeAreas'

const QUARTER_MONTHS: Record<number, string> = { 1: 'Jan–Mär', 2: 'Apr–Jun', 3: 'Jul–Sep', 4: 'Okt–Dez' }
const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const INDENT_PX = 16

function getPeriodLabel(goal: GoalRow): string {
  if (goal.type === 'quarterly' && goal.quarter) return `Q${goal.quarter} · ${QUARTER_MONTHS[goal.quarter] ?? ''}`
  if (goal.type === 'monthly' && goal.month) return MONTH_SHORT[(goal.month ?? 1) - 1] ?? ''
  if (goal.type === 'weekly' && goal.week) return `KW ${goal.week}`
  return ''
}

// ─── GoalNode ─────────────────────────────────────────────────────────────────

function GoalNode({ goal, color, indent, label, orphan = false }: {
  goal: GoalRow; color: string; indent: number; label: string; orphan?: boolean
}) {
  const done = goal.status === 'completed'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      paddingLeft: '0.5rem',
      paddingTop: '0.3rem',
      paddingBottom: '0.3rem',
      marginLeft: `${indent * INDENT_PX}px`,
      borderLeft: `2px solid ${color}${indent === 0 ? '70' : '35'}`,
    }}>
      <span style={{ fontSize: '0.75rem', color: done ? '#22c55e' : color, flexShrink: 0, marginTop: '2px', lineHeight: 1 }}>
        {done ? '✓' : '○'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '0.85rem', color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>
          {goal.title}
        </span>
        {label && (
          <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: done ? 'var(--text-muted)' : color, fontWeight: 500, opacity: orphan ? 0.55 : 0.85 }}>
            {label}{orphan ? ' · ohne Verknüpfung' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyNode({ color, indent, text }: { color: string; indent: number; text: string }) {
  return (
    <div style={{ paddingLeft: '0.5rem', paddingTop: '0.2rem', paddingBottom: '0.2rem', marginLeft: `${indent * INDENT_PX}px`, borderLeft: `2px dashed ${color}20` }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{text}</span>
    </div>
  )
}

// ─── GoalCascade ──────────────────────────────────────────────────────────────

interface Props {
  allGoals: GoalRow[]
  year: number
}

export default function GoalCascade({ allGoals, year }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }))

  if (allGoals.length === 0) {
    return (
      <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Noch keine Ziele für {year}. Jahresziele oben erstellen — Quartal/Monat/Woche im jeweiligen Journal-Tab.
      </div>
    )
  }

  const byType = {
    year: allGoals.filter((g) => g.type === 'year'),
    quarterly: allGoals.filter((g) => g.type === 'quarterly'),
    monthly: allGoals.filter((g) => g.type === 'monthly'),
    weekly: allGoals.filter((g) => g.type === 'weekly'),
  }

  const ungrouped = allGoals.filter((g) => !g.life_area)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {(LIFE_AREA_ORDER as LifeArea[]).map((areaKey) => {
        const area = LIFE_AREAS[areaKey]
        const yGoals = byType.year.filter((g) => g.life_area === areaKey)
        const qGoals = byType.quarterly.filter((g) => g.life_area === areaKey)
        const mGoals = byType.monthly.filter((g) => g.life_area === areaKey)
        const wGoals = byType.weekly.filter((g) => g.life_area === areaKey)
        const total = yGoals.length + qGoals.length + mGoals.length + wGoals.length
        if (total === 0) return null

        const isCollapsed = collapsed[areaKey] ?? false

        return (
          <div key={areaKey} style={{ border: `1px solid ${area.color}30`, borderRadius: '10px', overflow: 'hidden' }}>
            <button
              onClick={() => toggle(areaKey)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.9rem', background: area.bgAlpha, border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: area.color, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Sans, sans-serif' }}>
                {area.label}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {total} Ziel{total !== 1 ? 'e' : ''}
              </span>
              {isCollapsed ? <ChevronRight size={14} color={area.color} /> : <ChevronDown size={14} color={area.color} />}
            </button>

            {!isCollapsed && (
              <div style={{ padding: '0.5rem 0.75rem 0.75rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                {yGoals.length === 0 ? (
                  <EmptyNode color={area.color} indent={0} text={`Kein Jahresziel für ${area.label}`} />
                ) : (
                  yGoals.map((yGoal) => {
                    const qChildren = qGoals.filter((q) => q.parent_id === yGoal.id)
                    return (
                      <div key={yGoal.id}>
                        <GoalNode goal={yGoal} color={area.color} indent={0} label="" />
                        {qChildren.length === 0
                          ? <EmptyNode color={area.color} indent={1} text="Kein Quartalsziel" />
                          : qChildren.map((qGoal) => {
                              const mChildren = mGoals.filter((m) => m.parent_id === qGoal.id)
                              return (
                                <div key={qGoal.id}>
                                  <GoalNode goal={qGoal} color={area.color} indent={1} label={getPeriodLabel(qGoal)} />
                                  {mChildren.length === 0
                                    ? <EmptyNode color={area.color} indent={2} text="Kein Monatsziel" />
                                    : mChildren.map((mGoal) => {
                                        const wChildren = wGoals.filter((w) => w.parent_id === mGoal.id)
                                        return (
                                          <div key={mGoal.id}>
                                            <GoalNode goal={mGoal} color={area.color} indent={2} label={getPeriodLabel(mGoal)} />
                                            {wChildren.map((wGoal) => (
                                              <GoalNode key={wGoal.id} goal={wGoal} color={area.color} indent={3} label={getPeriodLabel(wGoal)} />
                                            ))}
                                          </div>
                                        )
                                      })}
                                </div>
                              )
                            })}
                      </div>
                    )
                  })
                )}

                {/* Orphaned sub-goals (have life_area but no valid parent chain) */}
                {(() => {
                  const validQIds = new Set(yGoals.map((y) => y.id))
                  const orphanQ = qGoals.filter((q) => !q.parent_id || !validQIds.has(q.parent_id ?? ''))
                  const validMIds = new Set(qGoals.map((q) => q.id))
                  const orphanM = mGoals.filter((m) => !m.parent_id || !validMIds.has(m.parent_id ?? ''))
                  const validWIds = new Set(mGoals.map((m) => m.id))
                  const orphanW = wGoals.filter((w) => !w.parent_id || !validWIds.has(w.parent_id ?? ''))
                  const orphans = [...orphanQ, ...orphanM, ...orphanW]
                  if (orphans.length === 0) return null
                  return (
                    <div style={{ marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: `1px dashed ${area.color}20` }}>
                      {orphans.map((g) => (
                        <GoalNode key={g.id} goal={g} color={area.color} indent={1} label={getPeriodLabel(g)} orphan />
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )
      })}

      {ungrouped.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '0.65rem 0.9rem', background: 'var(--bg-card)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Ohne Bereich ({ungrouped.length})
          </div>
          <div style={{ padding: '0.5rem 0.75rem 0.75rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            {ungrouped.map((g) => (
              <GoalNode key={g.id} goal={g} color="var(--text-muted)" indent={0} label={`${g.type} · ${getPeriodLabel(g)}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
