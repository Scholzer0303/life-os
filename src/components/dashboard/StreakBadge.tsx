interface Props {
  streak: number
}

export default function StreakBadge({ streak }: Props) {
  if (streak === 0) return null

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.3rem 0.75rem',
        background: '#FFF8E8',
        border: '1px solid var(--streak)',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#B87A00',
      }}
    >
      <span style={{ fontSize: '1rem' }}>🔥</span>
      {streak} {streak === 1 ? 'Tag' : 'Tage'} in Folge
    </div>
  )
}
