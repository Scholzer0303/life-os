import { useMemo } from 'react'
import { formatDateShort } from '../../lib/utils'

interface HeatmapDay {
  date: string
  hasMorning: boolean
  hasEvening: boolean
}

interface Props {
  data: { entry_date: string; type: string }[]
  days?: number
}

function getDayColor(day: HeatmapDay | undefined): string {
  if (!day) return 'var(--border)'
  if (day.hasMorning && day.hasEvening) return '#6B4FBB'  // both — purple
  if (day.hasMorning) return 'var(--accent)'               // morning — blue
  if (day.hasEvening) return 'var(--accent-green)'         // evening — green
  return 'var(--border)'
}

function getDayLabel(day: HeatmapDay | undefined): string {
  if (!day) return 'Kein Eintrag'
  const parts: string[] = []
  if (day.hasMorning) parts.push('Morgen')
  if (day.hasEvening) parts.push('Abend')
  return parts.join(' + ') || 'Eintrag'
}

export default function HeatmapGrid({ data, days = 60 }: Props) {
  const { grid, weeks } = useMemo(() => {
    // Build a lookup by date
    const byDate: Record<string, HeatmapDay> = {}
    for (const entry of data) {
      if (!byDate[entry.entry_date]) {
        byDate[entry.entry_date] = { date: entry.entry_date, hasMorning: false, hasEvening: false }
      }
      if (entry.type === 'morning') byDate[entry.entry_date].hasMorning = true
      if (entry.type === 'evening') byDate[entry.entry_date].hasEvening = true
    }

    // Build array of last `days` days, padded to full weeks
    const today = new Date()
    const allDays: (string | null)[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      allDays.push(d.toISOString().split('T')[0])
    }

    // Pad front to start on Monday
    const firstDate = allDays[0] ? new Date(allDays[0]) : new Date()
    const dayOfWeek = (firstDate.getDay() + 6) % 7 // 0=Mon
    for (let i = 0; i < dayOfWeek; i++) allDays.unshift(null)

    // Group into weeks (columns of 7)
    const weeks: (string | null)[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7))
    }

    return { grid: byDate, weeks }
  }, [data, days])

  const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div>
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
        }}
      >
        {[
          { color: 'var(--accent)', label: 'Morgen' },
          { color: 'var(--accent-green)', label: 'Abend' },
          { color: '#6B4FBB', label: 'Beide' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-start' }}>
        {/* Day labels */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            paddingTop: '0px',
            marginRight: '2px',
          }}
        >
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              style={{
                height: '11px',
                fontSize: '0.6rem',
                color: 'var(--text-muted)',
                lineHeight: '11px',
                width: '14px',
                textAlign: 'right',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {week.map((date, di) => {
                const dayData = date ? grid[date] : undefined
                const color = date ? getDayColor(dayData) : 'transparent'
                const label = date
                  ? `${formatDateShort(date)}: ${getDayLabel(dayData)}`
                  : ''
                return (
                  <div
                    key={di}
                    title={label}
                    style={{
                      width: '11px',
                      height: '11px',
                      borderRadius: '2px',
                      background: color,
                      cursor: date ? 'default' : 'default',
                      flexShrink: 0,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
