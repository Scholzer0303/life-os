import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, RefreshCw } from 'lucide-react'
import { getJournalFeedback } from '../../lib/claude'
import { updateJournalEntry } from '../../lib/db'
import { useStore } from '../../store/useStore'
import type { JournalEntryRow } from '../../types/database'

interface Props {
  entry: JournalEntryRow
  onFeedbackSaved?: (feedback: string) => void
}

export default function AIFeedbackCard({ entry, onFeedbackSaved }: Props) {
  const { profile, goals } = useStore()
  const [feedback, setFeedback] = useState<string | null>(entry.ai_feedback)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function requestFeedback() {
    if (!profile) return
    setIsLoading(true)
    setError(null)
    try {
      const text = await getJournalFeedback(
        entry as Parameters<typeof getJournalFeedback>[0],
        profile as Parameters<typeof getJournalFeedback>[1],
        goals as Parameters<typeof getJournalFeedback>[2]
      )
      setFeedback(text)
      // Persist to DB
      await updateJournalEntry(entry.id, {
        ai_feedback: text,
        ai_feedback_requested_at: new Date().toISOString(),
      })
      onFeedbackSaved?.(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Feedbacks.')
    } finally {
      setIsLoading(false)
    }
  }

  if (feedback) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '1rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          borderLeft: '3px solid var(--accent)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MessageCircle size={13} color="var(--accent)" />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Coach
            </span>
          </div>
          <button
            onClick={requestFeedback}
            disabled={isLoading}
            title="Neues Feedback anfordern"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem' }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
          {feedback}
        </p>
      </motion.div>
    )
  }

  return (
    <div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: 'var(--accent-warm)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <button
        onClick={requestFeedback}
        disabled={isLoading || !profile}
        style={{
          width: '100%',
          padding: '0.85rem',
          background: 'none',
          border: `1.5px solid ${isLoading ? 'var(--border)' : 'var(--accent)'}`,
          borderRadius: '10px',
          color: isLoading ? 'var(--text-muted)' : 'var(--accent)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
          fontSize: '0.9rem',
          cursor: isLoading || !profile ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.15s',
        }}
      >
        <MessageCircle size={16} />
        {isLoading ? 'Coach analysiert…' : 'Coach um Feedback bitten'}
      </button>
    </div>
  )
}
