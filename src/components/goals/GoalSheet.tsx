import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { getCurrentQuarter, getCurrentWeek } from '../../lib/utils'
import type { GoalRow, GoalInsert, GoalUpdate } from '../../types/database'
import type { GoalType } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: GoalInsert | GoalUpdate) => Promise<void>
  userId: string
  defaultType?: GoalType
  parentGoals: GoalRow[]          // available parents for the selected type
  editing?: GoalRow | null        // null = create mode
}

const TYPE_OPTIONS: { value: GoalType; label: string; hint: string }[] = [
  { value: 'three_year', label: '3-Jahres-Ziel', hint: '3 Jahre — große Vision' },
  { value: 'year',       label: 'Jahresziel',    hint: '12 Monate — wichtigster Schritt' },
  { value: 'quarterly',  label: 'Quartalsziel',  hint: '3 Monate — konkretes Vorhaben' },
  { value: 'monthly',    label: 'Monatsziel',    hint: 'Ein Monat — klarer Fokus' },
  { value: 'weekly',     label: 'Wochenziel',    hint: 'Diese Woche — klar und machbar' },
]

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'paused',    label: 'Pausiert' },
]

export default function GoalSheet({ open, onClose, onSave, userId, defaultType = 'weekly', parentGoals, editing }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<GoalType>(defaultType)
  const [parentId, setParentId] = useState<string | null>(null)
  const [status, setStatus] = useState<'active' | 'completed' | 'paused'>('active')
  const [progress, setProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setDescription(editing.description ?? '')
      setType(editing.type)
      setParentId(editing.parent_id)
      setStatus(editing.status)
      setProgress(editing.progress)
    } else {
      setTitle(''); setDescription(''); setType(defaultType)
      setParentId(null); setStatus('active'); setProgress(0)
    }
    setError(null)
  }, [editing, defaultType, open])

  async function handleSave() {
    if (!title.trim()) return
    setIsSaving(true); setError(null)

    const now = new Date()
    const year = now.getFullYear()
    const quarter = getCurrentQuarter()
    const month = now.getMonth() + 1
    const week = getCurrentWeek()

    const payload = editing
      ? ({ title: title.trim(), description: description.trim() || null, type, status, progress, parent_id: parentId } as GoalUpdate)
      : ({
          user_id: userId, title: title.trim(), description: description.trim() || null,
          type, status: 'active', progress: 0, parent_id: parentId,
          year,
          quarter: type === 'quarterly' ? quarter : null,
          month:   type === 'monthly'   ? month   : null,
          week:    type === 'weekly'     ? week    : null,
          // three_year and year have no sub-period fields
        } as GoalInsert)

    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
    } finally {
      setIsSaving(false)
    }
  }

  const validParents = parentGoals.filter((g) => {
    if (type === 'year')      return g.type === 'three_year'
    if (type === 'quarterly') return g.type === 'year' || g.type === 'quarterly'
    if (type === 'monthly')   return g.type === 'quarterly'
    if (type === 'weekly')    return g.type === 'monthly'
    return false
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--bg-primary)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '640px', maxHeight: '92svh', overflow: 'auto', padding: '1.5rem 1.25rem 2.5rem' }}
          >
            <div style={{ width: '36px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
                {editing ? 'Ziel bearbeiten' : 'Neues Ziel'}
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            {/* Type selector */}
            {!editing && (
              <div style={{ marginBottom: '1.25rem' }}>
                <Label>Typ</Label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {TYPE_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => { setType(opt.value); setParentId(null) }}
                      style={{ flex: 1, padding: '0.6rem 0.25rem', background: type === opt.value ? 'var(--accent)' : 'var(--bg-card)', color: type === opt.value ? '#fff' : 'var(--text-secondary)', border: `1.5px solid ${type === opt.value ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: type === opt.value ? 600 : 400, textAlign: 'center' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div style={{ marginBottom: '1rem' }}>
              <Label>Titel *</Label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                placeholder={
                  type === 'three_year' ? 'Wo stehst du in 3 Jahren?' :
                  type === 'year'       ? 'Was muss in 12 Monaten passieren?' :
                  type === 'quarterly'  ? 'Was willst du in diesem Quartal erreichen?' :
                  type === 'monthly'    ? 'Was ist der Fokus dieses Monats?' :
                  'Was erledigst du diese Woche?'
                }
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1rem' }}>
              <Label optional>Beschreibung</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                placeholder="Warum ist dieses Ziel wichtig?"
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Parent goal */}
            {validParents.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <Label optional>Übergeordnetes Ziel</Label>
                <select value={parentId ?? ''} onChange={(e) => setParentId(e.target.value || null)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Kein übergeordnetes Ziel</option>
                  {validParents.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status + Progress (edit mode only) */}
            {editing && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <Label>Status</Label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {STATUS_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => setStatus(opt.value as typeof status)}
                        style={{ flex: 1, padding: '0.55rem 0.25rem', background: status === opt.value ? 'var(--accent)' : 'var(--bg-card)', color: status === opt.value ? '#fff' : 'var(--text-secondary)', border: `1.5px solid ${status === opt.value ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: status === opt.value ? 600 : 400 }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <Label>Fortschritt</Label>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>{progress}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                </div>
              </>
            )}

            {error && <p style={{ color: 'var(--accent-warm)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{error}</p>}

            <button onClick={handleSave} disabled={!title.trim() || isSaving}
              style={{ width: '100%', padding: '0.9rem', background: title.trim() && !isSaving ? 'var(--accent)' : 'var(--text-muted)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: title.trim() && !isSaving ? 'pointer' : 'not-allowed' }}>
              {isSaving ? 'Wird gespeichert…' : editing ? 'Speichern' : 'Ziel erstellen'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem' }}>
      {children} {optional && <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>}
    </p>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px',
  fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
}
