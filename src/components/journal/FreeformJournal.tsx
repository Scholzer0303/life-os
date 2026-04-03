import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { getWeeklyGoals, createJournalEntry } from '../../lib/db'
import { todayISO } from '../../lib/utils'
import AIFeedbackCard from './AIFeedbackCard'
import type { GoalRow, JournalEntryRow } from '../../types/database'

export default function FreeformJournal() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null)
  const [weeklyGoals, setWeeklyGoals] = useState<GoalRow[]>([])
  const [showGoalPicker, setShowGoalPicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedEntry, setSavedEntry] = useState<JournalEntryRow | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getWeeklyGoals(user.id).then(setWeeklyGoals).catch(console.error)
  }, [user])

  async function handleSave() {
    if (!user || !text.trim()) return
    setIsSaving(true); setSaveError(null)
    try {
      const entry = await createJournalEntry({
        user_id: user.id, entry_date: todayISO(), type: 'freeform',
        free_text: text.trim(),
        linked_goal_ids: linkedGoalId ? [linkedGoalId] : [],
      })
      setSavedEntry(entry)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
      setIsSaving(false)
    }
  }

  const linkedGoal = weeklyGoals.find((g) => g.id === linkedGoalId)

  if (savedEntry) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.25rem' }}>Gespeichert.</h2>
          {linkedGoal && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>→ {linkedGoal.title}</p>
          )}
        </div>

        <div
          style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxHeight: '120px', overflow: 'hidden', position: 'relative' }}
        >
          {text}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2rem', background: 'linear-gradient(transparent, var(--bg-secondary))' }} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <AIFeedbackCard entry={savedEntry} />
        </div>

        <button onClick={() => navigate('/', { replace: true })}
          style={{ width: '100%', padding: '0.85rem', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}>
          Zurück zum Dashboard
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>Freeform</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>Schreib was du willst — kein Format, keine Regeln.</p>

      <textarea
        value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Was beschäftigt dich gerade?"
        rows={10} autoFocus
        style={{ width: '100%', padding: '1rem', border: '1.5px solid var(--border)', borderRadius: '12px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.7, marginBottom: '1rem' }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      {/* Goal link */}
      {weeklyGoals.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setShowGoalPicker((p) => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: linkedGoal ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}
          >
            {linkedGoal ? `→ ${linkedGoal.title}` : '+ Mit Wochenziel verknüpfen'}
          </button>
          <AnimatePresence>
            {showGoalPicker && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {weeklyGoals.map((g) => (
                    <button key={g.id} onClick={() => { setLinkedGoalId(linkedGoalId === g.id ? null : g.id); setShowGoalPicker(false) }}
                      style={{ padding: '0.6rem 0.85rem', background: linkedGoalId === g.id ? 'var(--accent)' : 'var(--bg-card)', color: linkedGoalId === g.id ? '#fff' : 'var(--text-secondary)', border: `1.5px solid ${linkedGoalId === g.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', textAlign: 'left' }}>
                      {g.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {saveError && <p style={{ color: 'var(--accent-warm)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{saveError}</p>}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={() => navigate(-1)} style={{ flex: '0 0 auto', padding: '0.9rem 1.25rem', background: 'none', border: '1.5px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>←</button>
        <button onClick={handleSave} disabled={!text.trim() || isSaving}
          style={{ flex: 1, padding: '0.9rem', background: text.trim() && !isSaving ? 'var(--accent)' : 'var(--text-muted)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: text.trim() && !isSaving ? 'pointer' : 'not-allowed' }}>
          {isSaving ? 'Wird gespeichert…' : 'Speichern'}
        </button>
      </div>
    </motion.div>
  )
}
