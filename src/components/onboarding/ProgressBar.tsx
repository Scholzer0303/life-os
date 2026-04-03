interface ProgressBarProps {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100)

  return (
    <div style={{ width: '100%', marginBottom: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>Schritt {current} von {total}</span>
        <span>{pct}%</span>
      </div>
      <div
        style={{
          height: '4px',
          background: 'var(--border)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--accent)',
            borderRadius: '2px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  )
}
