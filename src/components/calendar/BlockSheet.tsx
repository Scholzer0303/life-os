import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import type { RecurringBlock, BlockFormData, RecurrenceType } from '../../types'

// ─── Konstanten ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#863bff', // Accent-Lila
  '#3b82f6', // Blau
  '#10b981', // Grün
  '#f59e0b', // Gelb/Orange
  '#ef4444', // Rot
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Türkis
]

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; hint: string }[] = [
  { value: 'none',     label: 'Einmalig',   hint: 'Nur dieses Datum' },
  { value: 'daily',    label: 'Täglich',    hint: 'Jeden Tag' },
  { value: 'weekdays', label: 'Mo–Fr',      hint: 'Werktage' },
  { value: 'weekly',   label: 'Wöchentlich', hint: 'Gleicher Wochentag' },
]

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: BlockFormData) => Promise<void>
  onDelete?: () => void
  editing?: RecurringBlock | null
  defaultDate?: string  // vorausgewähltes Datum beim Erstellen
  defaultStartTime?: string
}

// ─── Komponente ───────────────────────────────────────────────────────────────

export default function BlockSheet({
  open,
  onClose,
  onSave,
  onDelete,
  editing,
  defaultDate,
  defaultStartTime = '08:00',
}: Props) {
  const [title, setTitle]                   = useState('')
  const [startTime, setStartTime]           = useState('08:00')
  const [endTime, setEndTime]               = useState('09:00')
  const [color, setColor]                   = useState(PRESET_COLORS[0])
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceDay, setRecurrenceDay]   = useState<number>(1) // Mo
  const [startDate, setStartDate]           = useState(todayISO())
  const [endDate, setEndDate]               = useState('')
  const [isSaving, setIsSaving]             = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  // Formular befüllen wenn Edit-Modus oder neue Werte
  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setStartTime(editing.start_time.slice(0, 5))
      setEndTime(editing.end_time.slice(0, 5))
      setColor(editing.color)
      setRecurrenceType(editing.recurrence_type)
      setRecurrenceDay(editing.recurrence_day ?? 1)
      setStartDate(editing.start_date)
      setEndDate(editing.end_date ?? '')
    } else {
      setTitle('')
      setStartTime(defaultStartTime)
      // Endzeit = Start + 1h
      const [h, m] = defaultStartTime.split(':').map(Number)
      const endH = Math.min(h + 1, 22)
      setEndTime(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      setColor(PRESET_COLORS[0])
      setRecurrenceType('none')
      setRecurrenceDay(1)
      setStartDate(defaultDate ?? todayISO())
      setEndDate('')
    }
    setError(null)
  }, [open, editing, defaultDate, defaultStartTime])

  // Validierung
  function validate(): string | null {
    if (!title.trim()) return 'Bitte einen Titel eingeben.'
    if (startTime >= endTime) return 'Startzeit muss vor Endzeit liegen.'
    if (endDate && endDate < startDate) return 'Enddatum muss nach Startdatum liegen.'
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        start_time: startTime,
        end_time: endTime,
        color,
        recurrence_type: recurrenceType,
        recurrence_day: recurrenceType === 'weekly' ? recurrenceDay : null,
        start_date: startDate,
        end_date: endDate || '',
      })
      onClose()
    } catch (e) {
      console.error('Block speichern fehlgeschlagen:', e)
      setError('Speichern fehlgeschlagen. Bitte nochmal versuchen.')
    } finally {
      setIsSaving(false)
    }
  }

  const isEditing = !!editing

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              background: 'var(--bg-card)',
              borderRadius: '1.25rem 1.25rem 0 0',
              zIndex: 201,
              maxHeight: '92vh',
              overflowY: 'auto',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Griff */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem' }}>
              <div style={{ width: '2.5rem', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
            </div>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem 0.5rem',
            }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {isEditing ? 'Zeitblock bearbeiten' : 'Neuer Zeitblock'}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isEditing && onDelete && (
                  <button
                    onClick={onDelete}
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: 'none', borderRadius: '0.5rem',
                      padding: '0.4rem', cursor: 'pointer',
                      color: '#ef4444', display: 'flex', alignItems: 'center',
                    }}
                    aria-label="Block löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    background: 'var(--bg)', border: 'none', borderRadius: '0.5rem',
                    padding: '0.4rem', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                  }}
                  aria-label="Schließen"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: '0 1rem' }}>
              {/* Titel */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Titel
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. Deep Work, Sport, Meeting …"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '0.5rem', color: 'var(--text)',
                    fontSize: '0.95rem', outline: 'none',
                  }}
                />
              </div>

              {/* Zeit */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Von
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '0.65rem 0.75rem',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '0.5rem', color: 'var(--text)',
                      fontSize: '0.95rem', outline: 'none',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Bis
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '0.65rem 0.75rem',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '0.5rem', color: 'var(--text)',
                      fontSize: '0.95rem', outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Farbe */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Farbe
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: '2rem', height: '2rem',
                        borderRadius: '50%',
                        background: c,
                        border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      aria-label={`Farbe ${c}`}
                    />
                  ))}
                </div>
              </div>

              {/* Wiederholung */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Wiederholen
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRecurrenceType(opt.value)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: `1px solid ${recurrenceType === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                        background: recurrenceType === opt.value ? 'rgba(134,59,255,0.12)' : 'var(--bg)',
                        color: recurrenceType === opt.value ? 'var(--accent)' : 'var(--text)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        fontWeight: recurrenceType === opt.value ? 600 : 400,
                      }}
                    >
                      {opt.label}
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wochentag (nur bei weekly) */}
              {recurrenceType === 'weekly' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Wochentag
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {WEEKDAYS.map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => setRecurrenceDay(idx)}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0',
                          borderRadius: '0.4rem',
                          border: `1px solid ${recurrenceDay === idx ? 'var(--accent)' : 'var(--border)'}`,
                          background: recurrenceDay === idx ? 'var(--accent)' : 'var(--bg)',
                          color: recurrenceDay === idx ? '#fff' : 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Startdatum */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Startdatum
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '0.5rem', color: 'var(--text)',
                    fontSize: '0.95rem', outline: 'none',
                  }}
                />
              </div>

              {/* Enddatum (optional, nur bei Serien) */}
              {recurrenceType !== 'none' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Enddatum <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — leer = unbegrenzt)</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '0.65rem 0.75rem',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '0.5rem', color: 'var(--text)',
                      fontSize: '0.95rem', outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Fehler */}
              {error && (
                <div style={{
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '0.5rem',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}>
                  {error}
                </div>
              )}

              {/* Speichern */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  background: isSaving ? 'var(--text-muted)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  marginBottom: '0.5rem',
                }}
              >
                {isSaving ? 'Wird gespeichert …' : isEditing ? 'Änderungen speichern' : 'Zeitblock erstellen'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
