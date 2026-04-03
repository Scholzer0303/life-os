import type { GoalRow } from '../../types/database'

interface Props {
  goal: GoalRow
  onUpdateProgress?: (id: string, progress: number) => void
}

const TYPE_LABEL: Record<string, string> = {
  quarterly: 'Quartal',
  monthly: 'Monat',
  weekly: 'Woche',
}

export default function GoalCard({ goal, onUpdateProgress }: Props) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {TYPE_LABEL[goal.type] ?? goal.type}
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: goal.progress >= 100 ? 'var(--accent-green)' : 'var(--text-secondary)',
          }}
        >
          {goal.progress}%
        </span>
      </div>

      <p
        style={{
          margin: '0 0 0.75rem',
          fontWeight: 500,
          lineHeight: 1.4,
          fontSize: '0.95rem',
          color: 'var(--text-primary)',
        }}
      >
        {goal.title}
      </p>

      {/* Progress bar */}
      <div
        style={{
          height: '5px',
          background: 'var(--bg-secondary)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: onUpdateProgress ? '0.75rem' : 0,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${goal.progress}%`,
            background:
              goal.progress >= 100
                ? 'var(--accent-green)'
                : goal.progress >= 50
                ? 'var(--accent)'
                : 'var(--streak)',
            borderRadius: '3px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Progress input */}
      {onUpdateProgress && (
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={goal.progress}
          onChange={(e) => onUpdateProgress(goal.id, Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
          aria-label={`Fortschritt für ${goal.title}`}
        />
      )}
    </div>
  )
}
