import { useState } from 'react'
import { CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import type { GoalRow, GoalTaskRow } from '../../types/database'

interface Props {
  goal: GoalRow
  tasks?: GoalTaskRow[]
  onToggleTask?: (task: GoalTaskRow) => void
}

const TYPE_LABEL: Record<string, string> = {
  quarterly: 'Quartal',
  monthly: 'Monat',
  weekly: 'Woche',
}

export default function GoalCard({ goal, tasks = [], onToggleTask }: Props) {
  const [showAll, setShowAll] = useState(false)

  const visibleTasks = showAll ? tasks : tasks.slice(0, 3)
  const hasTasks = tasks.length > 0

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
          marginBottom: hasTasks ? '0.75rem' : 0,
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

      {/* Tasks inline */}
      {hasTasks && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
          {visibleTasks.map((task) => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => onToggleTask?.(task)}
                style={{ background: 'none', border: 'none', cursor: onToggleTask ? 'pointer' : 'default', color: task.completed ? 'var(--accent)' : 'var(--text-muted)', padding: 0, flexShrink: 0, display: 'flex' }}
              >
                {task.completed ? <CheckSquare size={15} /> : <Square size={15} />}
              </button>
              <span style={{ fontSize: '0.82rem', color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', lineHeight: 1.4, flex: 1 }}>
                {task.title}
              </span>
            </div>
          ))}

          {tasks.length > 3 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0', marginTop: '0.1rem' }}
            >
              {showAll ? <><ChevronUp size={12} /> Weniger anzeigen</> : <><ChevronDown size={12} /> {tasks.length - 3} weitere anzeigen</>}
            </button>
          )}
        </div>
      )}

    </div>
  )
}
