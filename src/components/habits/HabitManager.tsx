import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getHabitsForMonth, createHabit, updateHabit, deleteHabit, getHabitLogs } from '../../lib/db'
import type { HabitRow, HabitLogRow } from '../../types/database'

interface Props {
  month: number
  year: number
}

const COLORS = [
  { value: '#3b82f6', label: 'Blau' },
  { value: '#22c55e', label: 'Grün' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#8b5cf6', label: 'Lila' },
  { value: '#ef4444', label: 'Rot' },
  { value: '#06b6d4', label: 'Cyan' },
]

interface HabitFormData {
  title: string
  description: string
  frequency_type: 'daily' | 'weekly'
  frequency_value: number
  color: string
}

const EMPTY_FORM: HabitFormData = {
  title: '',
  description: '',
  frequency_type: 'daily',
  frequency_value: 3,
  color: '#3b82f6',
}

// Monatsfortschritt berechnen
function getMonthProgress(habit: HabitRow, logs: HabitLogRow[], month: number, year: number): { actual: number; target: number } {
  const today = new Date()
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth
  const completedLogs = logs.filter((l) => l.habit_id === habit.id && l.completed)

  if (habit.frequency_type === 'daily') {
    return { actual: completedLogs.length, target: daysElapsed }
  } else {
    // weekly: Ziel = abgelaufene Wochen × frequency_value
    const weeksElapsed = Math.ceil(daysElapsed / 7)
    return { actual: completedLogs.length, target: weeksElapsed * habit.frequency_value }
  }
}

function progressColor(actual: number, target: number): string {
  if (target === 0) return 'var(--text-muted)'
  const ratio = actual / target
  if (ratio >= 0.8) return '#22c55e'
  if (ratio >= 0.5) return '#f59e0b'
  return '#ef4444'
}

export default function HabitManager({ month, year }: Props) {
  const { user } = useStore()
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [logs, setLogs] = useState<HabitLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitRow | null>(null)
  const [form, setForm] = useState<HabitFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Carry-over
  const [prevHabits, setPrevHabits] = useState<HabitRow[]>([])
  const [showCarryOver, setShowCarryOver] = useState(false)
  const [carryOverSelected, setCarryOverSelected] = useState<Set<string>>(new Set())
  const [carryOverSaving, setCarryOverSaving] = useState(false)

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getHabitsForMonth(user.id, month, year),
      getHabitLogs(user.id, month, year),
    ]).then(async ([current, monthLogs]) => {
        setLogs(monthLogs)
        setHabits(current)
        // Carry-over: nur zeigen wenn es der AKTUELLE Monat ist und noch keine Habits hat
        const todayCheck = new Date()
        const isCurrentMonthView = month === todayCheck.getMonth() + 1 && year === todayCheck.getFullYear()
        if (current.length === 0 && isCurrentMonthView) {
          const prev = await getHabitsForMonth(user.id, prevMonth, prevYear)
          if (prev.length > 0) {
            setPrevHabits(prev)
            setCarryOverSelected(new Set(prev.map((h) => h.id)))
            setShowCarryOver(true)
          }
        }
      })
      .catch((err) => console.error('HabitManager laden:', err))
      .finally(() => setLoading(false))
  }, [month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAddModal() {
    setEditingHabit(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEditModal(habit: HabitRow) {
    setEditingHabit(habit)
    setForm({
      title: habit.title,
      description: habit.description ?? '',
      frequency_type: habit.frequency_type,
      frequency_value: habit.frequency_value,
      color: habit.color,
    })
    setShowModal(true)
  }

  async function handleSaveHabit() {
    if (!user || !form.title.trim()) return
    setSaving(true)
    try {
      if (editingHabit) {
        const updated = await updateHabit(editingHabit.id, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          frequency_type: form.frequency_type,
          frequency_value: form.frequency_type === 'daily' ? 1 : form.frequency_value,
          color: form.color,
        } as Parameters<typeof updateHabit>[1])
        setHabits((prev) => prev.map((h) => h.id === editingHabit.id ? updated : h))
      } else {
        const created = await createHabit(user.id, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          frequency_type: form.frequency_type,
          frequency_value: form.frequency_type === 'daily' ? 1 : form.frequency_value,
          color: form.color,
          month,
          year,
          is_active: true,
        })
        setHabits((prev) => [...prev, created])
      }
      setShowModal(false)
    } catch (err) {
      console.error('Habit speichern:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteHabit(id: string) {
    if (!confirm('Habit wirklich löschen?')) return
    setDeleting(id)
    try {
      await deleteHabit(id)
      setHabits((prev) => prev.filter((h) => h.id !== id))
    } catch (err) {
      console.error('Habit löschen:', err)
    } finally {
      setDeleting(null)
    }
  }

  async function handleCarryOver() {
    if (!user) return
    setCarryOverSaving(true)
    try {
      const toCreate = prevHabits.filter((h) => carryOverSelected.has(h.id))
      const created: HabitRow[] = []
      for (const h of toCreate) {
        const newHabit = await createHabit(user.id, {
          title: h.title,
          description: h.description,
          frequency_type: h.frequency_type,
          frequency_value: h.frequency_value,
          color: h.color,
          month,
          year,
          is_active: true,
        })
        created.push(newHabit)
      }
      setHabits(created)
      setShowCarryOver(false)
    } catch (err) {
      console.error('Carry-over:', err)
    } finally {
      setCarryOverSaving(false)
    }
  }

  const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(year, month - 1, 1))
  const prevMonthName = new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(prevYear, prevMonth - 1, 1))

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Habits laden…</div>

  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        Habits · {monthName} {year}
      </div>

      {/* Carry-Over Dialog */}
      {showCarryOver && (
        <div style={{ background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))', borderRadius: '12px', padding: '1rem 1.1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
            Habits aus {prevMonthName} übernehmen?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
            {prevHabits.map((h) => (
              <button
                key={h.id}
                onClick={() => setCarryOverSelected((prev) => {
                  const next = new Set(prev)
                  next.has(h.id) ? next.delete(h.id) : next.add(h.id)
                  return next
                })}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0', textAlign: 'left' }}
              >
                <span style={{ width: '16px', height: '16px', border: `2px solid ${carryOverSelected.has(h.id) ? h.color : 'var(--border)'}`, borderRadius: '4px', background: carryOverSelected.has(h.id) ? h.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {carryOverSelected.has(h.id) && <Check size={10} color="#fff" />}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: h.color, flexShrink: 0 }} />
                  {h.title}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {h.frequency_type === 'daily' ? 'täglich' : `${h.frequency_value}×/Wo`}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowCarryOver(false)}
              style={{ flex: 1, padding: '0.6rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)' }}
            >
              Überspringen
            </button>
            <button
              onClick={handleCarryOver}
              disabled={carryOverSaving || carryOverSelected.size === 0}
              style={{ flex: 2, padding: '0.6rem', background: carryOverSelected.size > 0 ? 'var(--accent)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', cursor: carryOverSelected.size > 0 ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
            >
              {carryOverSaving ? 'Übernehme…' : `${carryOverSelected.size} übernehmen`}
            </button>
          </div>
        </div>
      )}

      {/* Habits Liste */}
      {habits.length === 0 && !showCarryOver && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', padding: '0.5rem 0' }}>
          Noch keine Habits. Tipp: 2–5 Habits pro Monat sind realistisch.
        </div>
      )}
      {habits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {habits.map((habit) => {
            const { actual, target } = getMonthProgress(habit, logs, month, year)
            const pColor = progressColor(actual, target)
            const pLabel = habit.frequency_type === 'daily' ? 'Tage' : '×'
            return (
              <div key={habit.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.85rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: habit.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {habit.frequency_type === 'daily' ? 'täglich' : `${habit.frequency_value}× pro Woche`}
                    {habit.description && ` · ${habit.description}`}
                  </div>
                </div>
                {/* Monatsfortschritt */}
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: pColor, background: `${pColor}18`, border: `1px solid ${pColor}40`, borderRadius: '6px', padding: '0.15rem 0.45rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {actual}/{target} {pLabel}
                </span>
                <button onClick={() => openEditModal(habit)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem', display: 'flex' }} aria-label="Bearbeiten">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDeleteHabit(habit.id)} disabled={deleting === habit.id} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem', display: 'flex' }} aria-label="Löschen">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Hinweistext */}
      {habits.length > 0 && habits.length < 2 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Tipp: 2–5 Habits pro Monat sind realistisch. Qualität vor Quantität.
        </div>
      )}

      {/* Hinzufügen-Button */}
      <button
        onClick={openAddModal}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 0.9rem', background: 'none', border: '1.5px dashed var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-muted)', width: '100%', justifyContent: 'center' }}
      >
        <Plus size={15} /> Habit hinzufügen
      </button>

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px 16px 0 0', padding: '1.5rem 1.25rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                {editingHabit ? 'Habit bearbeiten' : 'Habit hinzufügen'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Titel */}
              <div>
                <label style={LABEL_STYLE}>Titel *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Sport, Lesen, Meditation…"
                  autoFocus
                  style={INPUT_STYLE}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Beschreibung */}
              <div>
                <label style={LABEL_STYLE}>Beschreibung (optional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="30 Minuten, mindestens…"
                  style={INPUT_STYLE}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Frequenz */}
              <div>
                <label style={LABEL_STYLE}>Frequenz</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  {(['daily', 'weekly'] as const).map((ft) => (
                    <button
                      key={ft}
                      onClick={() => setForm((f) => ({ ...f, frequency_type: ft }))}
                      style={{ flex: 1, padding: '0.6rem', border: `2px solid ${form.frequency_type === ft ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', background: form.frequency_type === ft ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))' : 'var(--bg-card)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: form.frequency_type === ft ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: form.frequency_type === ft ? 600 : 400 }}
                    >
                      {ft === 'daily' ? 'Täglich' : 'X mal pro Woche'}
                    </button>
                  ))}
                </div>
                {form.frequency_type === 'weekly' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Wie oft pro Woche?</span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <button
                          key={n}
                          onClick={() => setForm((f) => ({ ...f, frequency_value: n }))}
                          style={{ width: '2rem', height: '2rem', border: `2px solid ${form.frequency_value === n ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '6px', background: form.frequency_value === n ? 'var(--accent)' : 'var(--bg-card)', color: form.frequency_value === n ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Farbe */}
              <div>
                <label style={LABEL_STYLE}>Farbe</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                      aria-label={c.label}
                      style={{ width: '2.2rem', height: '2.2rem', borderRadius: '50%', background: c.value, border: `3px solid ${form.color === c.value ? 'var(--text-primary)' : 'transparent'}`, cursor: 'pointer', transition: 'border-color 0.12s' }}
                    />
                  ))}
                </div>
              </div>

              {/* Speichern */}
              <button
                onClick={handleSaveHabit}
                disabled={!form.title.trim() || saving}
                style={{ padding: '0.9rem', background: form.title.trim() ? 'var(--accent)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: form.title.trim() ? 'pointer' : 'not-allowed', marginTop: '0.25rem' }}
              >
                {saving ? 'Wird gespeichert…' : editingHabit ? 'Änderungen speichern' : 'Habit hinzufügen'}
              </button>
            </div>
          </div>
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
  marginBottom: '0.4rem',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0.9rem',
  border: '1.5px solid var(--border)',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontFamily: 'DM Sans, sans-serif',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}
