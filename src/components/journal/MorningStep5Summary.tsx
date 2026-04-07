import { motion } from 'framer-motion'
import { Target, AlertCircle, Clock, CheckSquare } from 'lucide-react'
import type { TimeBlock, DailyTask } from '../../types'

interface Props {
  feelingScore: number
  feelingText: string
  mainGoal: string
  blockers: string
  timeblocks: TimeBlock[]
  dailyTasks: DailyTask[]
  linkedGoalTitle?: string
  isSaving: boolean
  onSave: () => void
  onBack: () => void
}

const FEELING_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄']

function formatMinutes(min: number): string {
  if (min < 60) return `${min} Min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} Std` : `${h}:${String(m).padStart(2, '0')} Std`
}

export default function MorningStep5Summary({
  feelingScore,
  feelingText,
  mainGoal,
  blockers,
  timeblocks,
  dailyTasks,
  linkedGoalTitle,
  isSaving,
  onSave,
  onBack,
}: Props) {
  const totalMin = timeblocks.reduce(
    (acc, b, i) => acc + b.duration_min + (i < timeblocks.length - 1 ? b.buffer_min : 0),
    0
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.6rem', fontWeight: 600, margin: '0 0 0.4rem' }}>
        Dein Morgen auf einen Blick
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
        Alles korrekt? Dann starte in den Tag.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>

        {/* Feeling */}
        <SummaryCard icon={<span style={{ fontSize: '1.1rem' }}>{FEELING_EMOJI[feelingScore]}</span>} label="Gefühl">
          <p style={{ margin: 0, fontWeight: 500 }}>{['', 'Sehr schlecht', 'Nicht so gut', 'Okay', 'Gut', 'Sehr gut'][feelingScore]}</p>
          {feelingText && <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{feelingText}</p>}
        </SummaryCard>

        {/* Goal */}
        <SummaryCard icon={<Target size={16} color="var(--accent)" />} label="Heutiges Ziel">
          <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.4 }}>{mainGoal}</p>
          {linkedGoalTitle && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--accent)' }}>
              → {linkedGoalTitle}
            </p>
          )}
        </SummaryCard>

        {/* Tasks */}
        {dailyTasks.length > 0 && (
          <SummaryCard icon={<CheckSquare size={16} color="var(--accent)" />} label={`Aufgaben heute — ${dailyTasks.length}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {dailyTasks.map((task, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.05rem' }}>·</span>
                  <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{task.title}</span>
                </div>
              ))}
            </div>
          </SummaryCard>
        )}

        {/* Blockers */}
        {blockers && (
          <SummaryCard icon={<AlertCircle size={16} color="var(--accent-warm)" />} label="Mögliche Blocker">
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4, fontSize: '0.9rem' }}>{blockers}</p>
          </SummaryCard>
        )}

        {/* Timeblocks */}
        {timeblocks.length > 0 && (
          <SummaryCard
            icon={<Clock size={16} color="var(--accent-green)" />}
            label={`Tagesplan — ${formatMinutes(totalMin)} gesamt`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {timeblocks.map((block, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500 }}>{block.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>
                      {formatMinutes(block.duration_min)}
                    </span>
                  </div>
                  {i < timeblocks.length - 1 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '0.5rem', marginTop: '0.1rem' }}>
                      ↓ 15 Min Puffer
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SummaryCard>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={onBack}
          disabled={isSaving}
          style={{
            flex: '0 0 auto',
            padding: '0.9rem 1.25rem',
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
          }}
        >
          ←
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            flex: 1,
            padding: '0.9rem',
            background: isSaving ? 'var(--text-muted)' : 'var(--accent-green)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Wird gespeichert…' : 'Journal speichern ✓'}
        </button>
      </div>
    </motion.div>
  )
}

function SummaryCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
        {icon}
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}
