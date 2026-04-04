import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Trash2, ChevronDown, ChevronRight, MessageCircle, Plus, CheckSquare, Square, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react'
import { checkGoalAlignment } from '../../lib/claude'
import { useStore } from '../../store/useStore'
import { getGoalTasks, createGoalTask, updateGoalTask, deleteGoalTask } from '../../lib/db'
import type { GoalRow, GoalTaskRow } from '../../types/database'

// ── Eigenständige Komponente damit lokaler State nicht das Parent neu rendert ──
function NewTaskInput({ onAdd, typeColor }: { onAdd: (title: string) => void; typeColor: string }) {
  const [value, setValue] = useState('')

  function submit() {
    if (!value.trim()) return
    onAdd(value.trim())
    setValue('')
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="Neuer Task…"
        style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: '7px', padding: '0.35rem 0.6rem', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        style={{ background: value.trim() ? typeColor : 'var(--bg-secondary)', border: 'none', borderRadius: '7px', padding: '0.35rem 0.6rem', cursor: value.trim() ? 'pointer' : 'default', color: value.trim() ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  goal: GoalRow
  parentGoal?: GoalRow
  children?: GoalRow[]
  linkedEntryCount?: number
  onEdit: (goal: GoalRow) => void
  onDelete: (id: string) => void
  onUpdateProgress: (id: string, progress: number) => void
  onAddChild?: (parentId: string) => void
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
  const user = useStore((s) => s.user)

  const [expanded, setExpanded] = useState(indentLevel < 1)
  const [aiCheck, setAiCheck] = useState<string | null>(null)
  const [isCheckLoading, setIsCheckLoading] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Tasks
  const [tasks, setTasks] = useState<GoalTaskRow[]>([])
  const [tasksLoaded, setTasksLoaded] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState('')

  // Tasks beim Mount laden — brauchen wir um "Als erledigt"-Toggle korrekt anzuzeigen
  useEffect(() => {
    getGoalTasks(goal.id)
      .then((data) => { setTasks(data); setTasksLoaded(true) })
      .catch((err) => console.error('Fehler beim Laden der Tasks:', err))
  }, [goal.id])

  function calcProgressFromTasks(taskList: GoalTaskRow[]): number {
    if (taskList.length === 0) return 0
    return Math.round((taskList.filter((t) => t.completed).length / taskList.length) * 100)
  }

  async function handleToggleTask(task: GoalTaskRow) {
    const updated = { ...task, completed: !task.completed }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    try {
      await updateGoalTask(task.id, { completed: updated.completed })
      const newProgress = calcProgressFromTasks(tasks.map((t) => (t.id === task.id ? updated : t)))
      onUpdateProgress(goal.id, newProgress)
    } catch (err) {
      console.error('Task-Toggle fehlgeschlagen:', err)
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    }
  }

  async function handleAddTask(title: string) {
    if (!user) return
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sort_order)) : -1
    try {
      const created = await createGoalTask({
        goal_id: goal.id,
        user_id: user.id,
        title,
        sort_order: maxOrder + 1,
      })
      const newTasks = [...tasks, created]
      setTasks(newTasks)
      onUpdateProgress(goal.id, calcProgressFromTasks(newTasks))
    } catch (err) {
      console.error('Task-Erstellung fehlgeschlagen:', err)
    }
  }

  async function handleDeleteTask(id: string) {
    const prev = tasks
    const newTasks = tasks.filter((t) => t.id !== id)
    setTasks(newTasks)
    try {
      await deleteGoalTask(id)
      onUpdateProgress(goal.id, calcProgressFromTasks(newTasks))
    } catch (err) {
      console.error('Task-Löschen fehlgeschlagen:', err)
      setTasks(prev)
    }
  }

  async function handleRenameTask(task: GoalTaskRow) {
    if (!editingTaskTitle.trim() || editingTaskTitle === task.title) {
      setEditingTaskId(null)
      return
    }
    const newTitle = editingTaskTitle.trim()
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: newTitle } : t)))
    setEditingTaskId(null)
    try {
      await updateGoalTask(task.id, { title: newTitle })
    } catch (err) {
      console.error('Task-Umbenennen fehlgeschlagen:', err)
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    }
  }

  async function handleMoveTask(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= tasks.length) return
    const newTasks = [...tasks]
    ;[newTasks[index], newTasks[swapIndex]] = [newTasks[swapIndex], newTasks[index]]
    const reordered = newTasks.map((t, i) => ({ ...t, sort_order: i }))
    setTasks(reordered)
    try {
      await Promise.all(reordered.map((t) => updateGoalTask(t.id, { sort_order: t.sort_order })))
    } catch (err) {
      console.error('Task-Sortierung fehlgeschlagen:', err)
      setTasks(tasks)
    }
  }

  async function handleMarkComplete() {
    const newProgress = goal.progress >= 100 ? 0 : 100
    onUpdateProgress(goal.id, newProgress)
  }

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
      {indentLevel > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.85rem', flexShrink: 0 }}>
            <div style={{ width: '1px', height: '100%', minHeight: '16px', background: 'var(--border)' }} />
          </div>
          <CardBody />
        </div>
      )}
      {indentLevel === 0 && <CardBody />}

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

        {parentGoal && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.4rem' }}>↑ {parentGoal.title}</p>
        )}
        {goal.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem', lineHeight: 1.4 }}>{goal.description}</p>
        )}

        {/* Fortschrittsbalken — kein Slider */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Fortschritt</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: goal.progress >= 100 ? 'var(--accent-green)' : typeColor }}>
              {goal.progress}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${goal.progress}%`, background: goal.progress >= 100 ? 'var(--accent-green)' : typeColor, borderRadius: '2px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Tasks */}
        <div style={{ marginBottom: '0.5rem' }}>
          <button
            onClick={() => setShowTasks((v) => !v)}
            style={{ fontSize: '0.75rem', color: showTasks ? typeColor : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
          >
            <CheckSquare size={13} />
            Tasks {tasksLoaded ? `(${tasks.length})` : ''}
            {showTasks ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          <AnimatePresence>
            {showTasks && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {tasks.map((task, i) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '7px' }}>
                      <button onClick={() => handleToggleTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: task.completed ? typeColor : 'var(--text-muted)', padding: 0, flexShrink: 0, display: 'flex' }}>
                        {task.completed ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>

                      {editingTaskId === task.id ? (
                        <input
                          autoFocus
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          onBlur={() => handleRenameTask(task)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameTask(task); if (e.key === 'Escape') setEditingTaskId(null) }}
                          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.82rem', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
                        />
                      ) : (
                        <span
                          onClick={() => { setEditingTaskId(task.id); setEditingTaskTitle(task.title) }}
                          style={{ flex: 1, fontSize: '0.82rem', color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', cursor: 'text', lineHeight: 1.4 }}
                        >
                          {task.title}
                        </span>
                      )}

                      <div style={{ display: 'flex', gap: '0.1rem', flexShrink: 0 }}>
                        <button onClick={() => handleMoveTask(i, 'up')} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'transparent' : 'var(--text-muted)', padding: '0.1rem', display: 'flex' }}>
                          <ArrowUp size={11} />
                        </button>
                        <button onClick={() => handleMoveTask(i, 'down')} disabled={i === tasks.length - 1} style={{ background: 'none', border: 'none', cursor: i === tasks.length - 1 ? 'default' : 'pointer', color: i === tasks.length - 1 ? 'transparent' : 'var(--text-muted)', padding: '0.1rem', display: 'flex' }}>
                          <ArrowDown size={11} />
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <NewTaskInput onAdd={handleAddTask} typeColor={typeColor} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* "Als erledigt markieren" — nur wenn keine Tasks vorhanden */}
        {tasksLoaded && tasks.length === 0 && (
          <button
            onClick={handleMarkComplete}
            style={{ fontSize: '0.78rem', color: goal.progress >= 100 ? 'var(--accent-green)' : 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.3rem 0.65rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}
          >
            <CheckCircle2 size={13} />
            {goal.progress >= 100 ? 'Als offen markieren' : 'Als erledigt markieren'}
          </button>
        )}

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
