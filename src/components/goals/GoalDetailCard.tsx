import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Trash2, ChevronDown, ChevronRight, MessageCircle, Plus } from 'lucide-react'
import { checkGoalAlignment } from '../../lib/claude'
import { useStore } from '../../store/useStore'
import type { GoalRow } from '../../types/database'

interface Props {
  goal: GoalRow
  parentGoal?: GoalRow
  children?: GoalRow[]         // sub-goals
  linkedEntryCount?: number
  onEdit: (goal: GoalRow) => void
  onDelete: (id: string) => void
  onUpdateProgress: (id: string, progress: number) => void
  onAddChild?: (parentId: string) => void  // trigger add child goal
  indentLevel?: number
}

const TYPE_COLOR: Record<string, string> = {
  quarterly: 'var(--accent)',
  monthly:   'var(--accent-green)',
  weekly:    'var(--streak)',
}
const TYPE_LABEL: Record<string, string> = {
  quarterly: 'Q',
  monthly:   'M',
  weekly:    'W',
}
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  active:    { background: '#EDF2FF', color: 'var(--accent)' },
  completed: { background: '#ECFDF5', color: 'var(--accent-green)' },
  paused:    { background: 'var(--bg-secondary)', color: 'var(--text-muted)' },
}
const STATUS_LABEL: Record<string, string> = { active: 'Aktiv', completed: 'Abgeschlossen', paused: 'Pausiert' }

export default function GoalDetailCard({ goal, parentGoal, children = [], linkedEntryCount = 0, onEdit, onDelete, onUpdateProgress, onAddChild, indentLevel = 0 }: Props) {
  const { profile, recentEntries, goals } = useStore()
  const [expanded, setExpanded] = useState(indentLevel < 1)
  const [aiCheck, setAiCheck] = useState<string | null>(null)
  const [isCheckLoading, setIsCheckLoading] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const typeColor = TYPE_COLOR[goal.type] ?? 'var(--text-muted)'
  const canHaveChildren = goal.type === 'quarterly' || goal.type === 'monthly'

  async function handleKICheck() {
    if (!profile) return
    setIsCheckLoading(true); setCheckError(null)
    try {
      const result = await checkGoalAlignment(
        goal as Parameters<typeof checkGoalAlignment>[0],
        (parentGoal ?? null) as Parameters<typeof checkGoalAlignment>[1],
        profile as Parameters<typeof checkGoalAlignment>[2],
        recentEntries as Parameters<typeof checkGoalAlignment>[3],
        goals as Parameters<typeof checkGoalAlignment>[4]
      )
      setAiCheck(result)
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Fehler.')
    } finally {
      setIsCheckLoading(false)
    }
  }

  return (
    <div style={{ marginLeft: indentLevel > 0 ? '1rem' : 0 }}>
      {/* Connector line for children */}
      {indentLevel > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.85rem', flexShrink: 0 }}>
            <div style={{ width: '1px', height: '100%', minHeight: '16px', background: 'var(--border)' }} />
          </div>
          <CardBody />
        </div>
      )}
      {indentLevel === 0 && <CardBody />}

      {/* Children */}
      <AnimatePresence>
        {expanded && children.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            {children.map((child) => (
              <GoalDetailCard
                key={child.id}
                goal={child}
                parentGoal={goal}
                indentLevel={indentLevel + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdateProgress={onUpdateProgress}
                onAddChild={onAddChild}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  function CardBody() {
    return (
      <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.9rem 1rem', marginBottom: '0.6rem', borderLeft: `3px solid ${typeColor}` }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
            {/* Expand toggle for parents */}
            {canHaveChildren && (
              <button onClick={() => setExpanded((e) => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', flexShrink: 0 }}>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: typeColor, background: `${typeColor}18`, padding: '0.15rem 0.45rem', borderRadius: '4px', flexShrink: 0, letterSpacing: '0.04em' }}>
              {TYPE_LABEL[goal.type]}
            </span>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.3, minWidth: 0 }}>{goal.title}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, marginLeft: '0.5rem' }}>
            <button onClick={() => onEdit(goal)} style={iconBtn} title="Bearbeiten"><Edit2 size={13} /></button>
            <button onClick={() => setShowDeleteConfirm(true)} style={{ ...iconBtn, color: 'var(--accent-warm)' }} title="Löschen"><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Parent breadcrumb */}
        {parentGoal && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.4rem' }}>↑ {parentGoal.title}</p>
        )}

        {/* Description */}
        {goal.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem', lineHeight: 1.4 }}>{goal.description}</p>
        )}

        {/* Progress */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Fortschritt</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: goal.progress >= 100 ? 'var(--accent-green)' : typeColor }}>
              {goal.progress}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.3rem' }}>
            <div style={{ height: '100%', width: `${goal.progress}%`, background: goal.progress >= 100 ? 'var(--accent-green)' : typeColor, borderRadius: '2px', transition: 'width 0.3s ease' }} />
          </div>
          <input type="range" min={0} max={100} step={5} value={goal.progress} onChange={(e) => onUpdateProgress(goal.id, Number(e.target.value))}
            style={{ width: '100%', accentColor: typeColor, cursor: 'pointer', height: '14px' }} aria-label={`Fortschritt ${goal.title}`} />
        </div>

        {/* Footer: status + linked entries + add child */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '999px', ...STATUS_STYLE[goal.status] }}>
            {STATUS_LABEL[goal.status]}
          </span>
          {linkedEntryCount > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              📝 {linkedEntryCount} {linkedEntryCount === 1 ? 'Eintrag' : 'Einträge'}
            </span>
          )}
          {canHaveChildren && onAddChild && (
            <button onClick={() => onAddChild(goal.id)} style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Plus size={12} /> {goal.type === 'quarterly' ? 'Monatsziel' : 'Wochenziel'}
            </button>
          )}
        </div>

        {/* KI-Check */}
        <div style={{ marginTop: '0.75rem' }}>
          {!aiCheck && !isCheckLoading && (
            <button onClick={handleKICheck} disabled={!profile}
              style={{ fontSize: '0.78rem', color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.3rem 0.65rem', cursor: profile ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MessageCircle size={12} /> KI-Check
            </button>
          )}
          {isCheckLoading && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Coach analysiert…</p>}
          {checkError && <p style={{ fontSize: '0.78rem', color: 'var(--accent-warm)', margin: 0 }}>{checkError}</p>}
          {aiCheck && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--accent)', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                <MessageCircle size={11} color="var(--accent)" />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Coach</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{aiCheck}</p>
            </motion.div>
          )}
        </div>

        {/* Delete confirm */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#FFF0EE', border: '1px solid var(--accent-warm)', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 0.5rem', fontWeight: 500 }}>Ziel wirklich löschen?</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { onDelete(goal.id); setShowDeleteConfirm(false) }}
                  style={{ padding: '0.4rem 0.85rem', background: 'var(--accent-warm)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: 500 }}>
                  Löschen
                </button>
                <button onClick={() => setShowDeleteConfirm(false)}
                  style={{ padding: '0.4rem 0.85rem', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Abbrechen
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
  padding: '0.2rem', display: 'flex', alignItems: 'center', borderRadius: '4px',
}
