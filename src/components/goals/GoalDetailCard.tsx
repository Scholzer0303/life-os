import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Trash2, ChevronDown, ChevronRight, MessageCircle, Plus, CheckSquare, Square, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react'
import { checkGoalAlignment } from '../../lib/claude'
import { useStore } from '../../store/useStore'
import {
  getGoalTasks, createGoalTask, updateGoalTask, deleteGoalTask,
  getHabitsForMonth, createHabit, updateHabit, deleteHabit,
} from '../../lib/db'
import type { GoalRow, GoalTaskRow, HabitRow } from '../../types/database'

const HABIT_COLORS = ['#863bff', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899']

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
  treeGoals?: GoalRow[]
  linkedEntryCount?: number
  onEdit: (goal: GoalRow) => void
  onDelete: (id: string) => void
  onUpdateProgress: (id: string, progress: number) => void
  onAddChild?: (parentId: string) => void
  indentLevel?: number
}

const TYPE_COLOR: Record<string, string> = {
  three_year: 'var(--text-muted)',
  year:       '#a855f7',
  quarterly:  'var(--accent)',
  monthly:    'var(--accent-green)',
  weekly:     'var(--streak)',
}
const TYPE_LABEL: Record<string, string> = {
  three_year: '3J',
  year:       'J',
  quarterly:  'Q',
  monthly:    'M',
  weekly:     'W',
}
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  active:    { background: '#EDF2FF', color: 'var(--accent)' },
  completed: { background: '#ECFDF5', color: 'var(--accent-green)' },
  paused:    { background: 'var(--bg-secondary)', color: 'var(--text-muted)' },
}
const STATUS_LABEL: Record<string, string> = { active: 'Aktiv', completed: 'Abgeschlossen', paused: 'Pausiert' }

export default function GoalDetailCard({ goal, parentGoal, treeGoals, linkedEntryCount = 0, onEdit, onDelete, onUpdateProgress, onAddChild, indentLevel = 0 }: Props) {
  const { profile, recentEntries, goals } = useStore()
  const user = useStore((s) => s.user)

  const children = treeGoals ? treeGoals.filter((g) => g.parent_id === goal.id) : []
  const resolvedParentGoal = parentGoal ?? treeGoals?.find((g) => g.id === goal.parent_id)
  const computedProgress = children.length > 0
    ? Math.round(children.reduce((sum, c) => sum + c.progress, 0) / children.length)
    : goal.progress

  const [expanded, setExpanded] = useState(indentLevel < 2)
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

  // Habits
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [habitsLoaded, setHabitsLoaded] = useState(false)
  const [showHabits, setShowHabits] = useState(false)
  const [habitModalOpen, setHabitModalOpen] = useState(false)
  const [habitEditing, setHabitEditing] = useState<HabitRow | null>(null)
  const [habitForm, setHabitForm] = useState({ title: '', description: '', color: '#863bff' })
  const [carryOverHabits, setCarryOverHabits] = useState<HabitRow[]>([])
  const [carryOverSelected, setCarryOverSelected] = useState<Set<string>>(new Set())
  const [showCarryOver, setShowCarryOver] = useState(false)
  const carryOverCheckedRef = useRef(false)

  // Tasks laden
  useEffect(() => {
    getGoalTasks(goal.id)
      .then((data) => { setTasks(data); setTasksLoaded(true) })
      .catch((err) => console.error('Fehler beim Laden der Tasks:', err))
  }, [goal.id])

  // Habits laden — nur für Monatsziele
  useEffect(() => {
    if (goal.type !== 'monthly' || !user) return
    const month = goal.month ?? new Date().getMonth() + 1
    const year = goal.year
    getHabitsForMonth(user.id, month, year)
      .then(async (data) => {
        setHabits(data)
        setHabitsLoaded(true)
        // Carry-Over: nur einmal prüfen, wenn aktuell keine Habits vorhanden
        if (data.length === 0 && !carryOverCheckedRef.current) {
          carryOverCheckedRef.current = true
          const prevMonth = month === 1 ? 12 : month - 1
          const prevYear = month === 1 ? year - 1 : year
          try {
            const prev = await getHabitsForMonth(user.id, prevMonth, prevYear)
            if (prev.length > 0) {
              setCarryOverHabits(prev)
              setCarryOverSelected(new Set(prev.map((h) => h.id)))
              setShowCarryOver(true)
            }
          } catch (err) {
            console.error('Fehler beim Laden der Vormonats-Habits:', err)
          }
        }
      })
      .catch((err) => console.error('Fehler beim Laden der Habits:', err))
  }, [goal.id, goal.type, user?.id])

  // ── Task-Handler ──────────────────────────────────────────────────────────

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
      const created = await createGoalTask({ goal_id: goal.id, user_id: user.id, title, sort_order: maxOrder + 1 })
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
    if (!editingTaskTitle.trim() || editingTaskTitle === task.title) { setEditingTaskId(null); return }
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
    onUpdateProgress(goal.id, goal.progress >= 100 ? 0 : 100)
  }

  // ── Habit-Handler ─────────────────────────────────────────────────────────

  function openNewHabit() {
    setHabitEditing(null)
    setHabitForm({ title: '', description: '', color: '#863bff' })
    setHabitModalOpen(true)
  }

  function openEditHabit(habit: HabitRow) {
    setHabitEditing(habit)
    setHabitForm({ title: habit.title, description: habit.description ?? '', color: habit.color })
    setHabitModalOpen(true)
  }

  async function handleSaveHabit() {
    if (!user || !habitForm.title.trim()) return
    const month = goal.month ?? new Date().getMonth() + 1
    const year = goal.year
    try {
      if (habitEditing) {
        const updated = await updateHabit(habitEditing.id, {
          title: habitForm.title.trim(),
          description: habitForm.description.trim() || null,
          color: habitForm.color,
        })
        setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)))
      } else {
        const created = await createHabit(user.id, {
          goal_id: goal.id,
          title: habitForm.title.trim(),
          description: habitForm.description.trim() || null,
          color: habitForm.color,
          month,
          year,
        })
        setHabits((prev) => [...prev, created])
      }
      setHabitModalOpen(false)
    } catch (err) {
      console.error('Fehler beim Speichern des Habits:', err)
    }
  }

  async function handleDeleteHabit(id: string) {
    const prev = habits
    setHabits(habits.filter((h) => h.id !== id))
    try {
      await deleteHabit(id)
    } catch (err) {
      console.error('Fehler beim Löschen des Habits:', err)
      setHabits(prev)
    }
  }

  async function handleCarryOver() {
    if (!user) return
    const month = goal.month ?? new Date().getMonth() + 1
    const year = goal.year
    const toCarry = carryOverHabits.filter((h) => carryOverSelected.has(h.id))
    try {
      const created = await Promise.all(
        toCarry.map((h) =>
          createHabit(user.id, {
            goal_id: goal.id,
            title: h.title,
            description: h.description,
            color: h.color,
            month,
            year,
          })
        )
      )
      setHabits(created)
    } catch (err) {
      console.error('Fehler beim Übernehmen der Habits:', err)
    }
    setShowCarryOver(false)
  }

  // ─────────────────────────────────────────────────────────────────────────

  const typeColor = TYPE_COLOR[goal.type] ?? 'var(--text-muted)'
  const canHaveChildren = goal.type === 'three_year' || goal.type === 'year' || goal.type === 'quarterly' || goal.type === 'monthly'

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
                treeGoals={treeGoals}
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
        {/* Header */}
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

        {resolvedParentGoal && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.4rem' }}>↑ {resolvedParentGoal.title}</p>
        )}
        {goal.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem', lineHeight: 1.4 }}>{goal.description}</p>
        )}

        {/* Fortschrittsbalken */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Fortschritt{children.length > 0 ? <span style={{ fontSize: '0.65rem', marginLeft: '0.3rem', opacity: 0.6 }}>⌀ Unterziele</span> : null}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: computedProgress >= 100 ? 'var(--accent-green)' : typeColor }}>
              {computedProgress}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${computedProgress}%`, background: computedProgress >= 100 ? 'var(--accent-green)' : typeColor, borderRadius: '2px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Tasks — nur bei Monat und Woche */}
        {(goal.type === 'monthly' || goal.type === 'weekly') && <div style={{ marginBottom: '0.5rem' }}>
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
        </div>}

        {/* Habits — nur bei monthly */}
        {goal.type === 'monthly' && (
          <div style={{ marginBottom: '0.5rem' }}>
            <button
              onClick={() => setShowHabits((v) => !v)}
              style={{ fontSize: '0.75rem', color: showHabits ? typeColor : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
            >
              <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>●</span>
              Habits {habitsLoaded ? `(${habits.length})` : ''}
              {showHabits ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>

            <AnimatePresence>
              {showHabits && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {habits.map((habit) => (
                      <div key={habit.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '7px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: habit.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{habit.title}</span>
                        {habit.description && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{habit.description}</span>
                        )}
                        <button onClick={() => openEditHabit(habit)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex' }}>
                          <Edit2 size={11} />
                        </button>
                        <button onClick={() => handleDeleteHabit(habit.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={openNewHabit}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: typeColor, background: 'none', border: `1px dashed ${typeColor}50`, borderRadius: '7px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginTop: '0.1rem' }}
                    >
                      <Plus size={12} /> Habit hinzufügen
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* "Als erledigt markieren" — nur bei Monat/Woche, nur ohne Tasks */}
        {(goal.type === 'monthly' || goal.type === 'weekly') && tasksLoaded && tasks.length === 0 && (
          <button
            onClick={handleMarkComplete}
            style={{ fontSize: '0.78rem', color: goal.progress >= 100 ? 'var(--accent-green)' : 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.3rem 0.65rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}
          >
            <CheckCircle2 size={13} />
            {goal.progress >= 100 ? 'Als offen markieren' : 'Als erledigt markieren'}
          </button>
        )}

        {/* Footer */}
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
              <Plus size={12} /> {
                goal.type === 'three_year' ? 'Jahresziel' :
                goal.type === 'year' ? 'Quartalsziel' :
                goal.type === 'quarterly' ? 'Monatsziel' : 'Wochenziel'
              }
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

        {/* Habit Modal (Erstellen / Bearbeiten) */}
        <AnimatePresence>
          {habitModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
              onClick={() => setHabitModalOpen(false)}
            >
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '1.25rem', width: '100%', maxWidth: '380px', border: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 1rem', color: 'var(--text-primary)' }}>
                  {habitEditing ? 'Habit bearbeiten' : 'Neuer Habit'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.3rem' }}>Titel *</label>
                    <input
                      autoFocus
                      value={habitForm.title}
                      onChange={(e) => setHabitForm((f) => ({ ...f, title: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveHabit() }}
                      placeholder="z.B. Sport"
                      style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.3rem' }}>Beschreibung (optional)</label>
                    <input
                      value={habitForm.description}
                      onChange={(e) => setHabitForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="z.B. 3x pro Woche"
                      style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Farbe</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {HABIT_COLORS.map((color) => (
                        <button key={color} onClick={() => setHabitForm((f) => ({ ...f, color }))}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, border: habitForm.color === color ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', outline: 'none', transition: 'border 0.15s', flexShrink: 0 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setHabitModalOpen(false)}
                    style={{ padding: '0.45rem 0.9rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                    Abbrechen
                  </button>
                  <button onClick={handleSaveHabit} disabled={!habitForm.title.trim()}
                    style={{ padding: '0.45rem 0.9rem', background: habitForm.title.trim() ? typeColor : 'var(--bg-secondary)', color: habitForm.title.trim() ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: habitForm.title.trim() ? 'pointer' : 'default', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                    Speichern
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carry-Over Modal */}
        <AnimatePresence>
          {showCarryOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            >
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '1.25rem', width: '100%', maxWidth: '380px', border: '1px solid var(--border)' }}
              >
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>Habits übernehmen?</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>Aus dem Vormonat — wähle was weiterläuft:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                  {carryOverHabits.map((habit) => (
                    <label key={habit.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={carryOverSelected.has(habit.id)}
                        onChange={(e) => {
                          const next = new Set(carryOverSelected)
                          if (e.target.checked) next.add(habit.id)
                          else next.delete(habit.id)
                          setCarryOverSelected(next)
                        }}
                        style={{ accentColor: habit.color }}
                      />
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: habit.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{habit.title}</span>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCarryOver(false)}
                    style={{ padding: '0.45rem 0.9rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                    Überspringen
                  </button>
                  <button onClick={handleCarryOver} disabled={carryOverSelected.size === 0}
                    style={{ padding: '0.45rem 0.9rem', background: carryOverSelected.size > 0 ? typeColor : 'var(--bg-secondary)', color: carryOverSelected.size > 0 ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: carryOverSelected.size > 0 ? 'pointer' : 'default', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                    Ausgewählte übernehmen
                  </button>
                </div>
              </motion.div>
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
