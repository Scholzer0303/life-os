import { motion } from 'framer-motion'

interface Props {
  streak: number
  bestStreak?: number
}

function getMilestone(streak: number): { label: string; color: string } | null {
  if (streak >= 100) return { label: '💯', color: '#7c3aed' }
  if (streak >= 60)  return { label: '🏆', color: '#d97706' }
  if (streak >= 30)  return { label: '⭐', color: '#d97706' }
  if (streak >= 14)  return { label: '🔥', color: '#ea580c' }
  if (streak >= 7)   return { label: '🔥', color: '#f59e0b' }
  return null
}

export default function StreakBadge({ streak, bestStreak }: Props) {
  if (streak === 0) {
    return (
      <div
        style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}
      >
        <span>🌱</span> Starte heute deinen Streak
      </div>
    )
  }

  const milestone = getMilestone(streak)
  const isMilestone = milestone !== null
  const icon = milestone?.label ?? '🔥'
  const borderColor = milestone?.color ?? '#f59e0b'
  const bgColor = isMilestone ? `${borderColor}18` : '#FFF8E8'
  const textColor = milestone?.color ?? '#B87A00'

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.75rem',
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: textColor,
        }}
      >
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        {streak} {streak === 1 ? 'Tag' : 'Tage'} in Folge
        {isMilestone && (
          <span
            style={{
              fontSize: '0.65rem',
              background: borderColor,
              color: '#fff',
              borderRadius: '999px',
              padding: '0.1rem 0.4rem',
              marginLeft: '0.1rem',
              fontWeight: 700,
            }}
          >
            Meilenstein!
          </span>
        )}
      </div>
      {bestStreak !== undefined && bestStreak > streak && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          Beste: {bestStreak} Tage
        </div>
      )}
    </motion.div>
  )
}
