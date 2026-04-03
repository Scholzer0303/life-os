import { useMemo } from 'react'
import { formatDateShort } from '../../lib/utils'

interface HeatmapDay {
  date: string
  hasMorning: boolean
  hasEvening: boolean
  hasFreeform: boolean
}

interface Props {
  data: { entry_date: string; type: string }[]
  days?: number
}

const CELL = 13
const GAP = 3
const TODAY = new Date().toISOString().split('T')[0]

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function getDayColor(day: HeatmapDay | undefined): string {
  if (!day) return 'var(--border)'
  if (day.hasMorning && day.hasEvening) return '#7c3aed'   // both → deep purple
  if (day.hasMorning) return 'var(--accent)'               // morning → blue
  if (day.hasEvening) return '#16a34a'                     // evening → green
  if (day.hasFreeform) return '#ca8a04'                    // freeform only → amber
  return 'var(--border)'
}

function getDayLabel(day: HeatmapDay | undefined, date: string): string {
  const parts: string[] = [formatDateShort(date)]
  if (!day) return `${parts[0]}: Kein Eintrag`
  if (day.hasMorning) parts.push('Morgen')
  if (day.hasEvening) parts.push('Abend')
  if (day.hasFreeform) parts.push('Freeform')
  return parts.join(' · ')
}

export default function HeatmapGrid({ data, days = 60 }: Props) {
  const { grid, weeks } = useMemo(() => {
    const byDate: Record<string, HeatmapDay> = {}
    for (const entry of data) {
      if (!byDate[entry.entry_date]) {
        byDate[entry.entry_date] = {
          date: entry.entry_date,
          hasMorning: false,
          hasEvening: false,
          hasFreeform: false,
        }
      }
      if (entry.type === 'morning')  byDate[entry.entry_date].hasMorning = true
      if (entry.type === 'evening')  byDate[entry.entry_date].hasEvening = true
      if (entry.type === 'freeform') byDate[entry.entry_date].hasFreeform = true
    }

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

    const weeks: (string | null)[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7))
    }

    return { grid: byDate, weeks }
  }, [data, days])

  // Build month labels: for each week-column, check if the first non-null date starts a new month
  const monthLabels: (string | null)[] = useMemo(() => {
    let lastMonth = -1
    return weeks.map((week) => {
      const firstDay = week.find((d) => d !== null)
      if (!firstDay) return null
      const m = new Date(firstDay).getMonth()
      if (m !== lastMonth) {
        lastMonth = m
        return MONTHS[m]
      }
      return null
    })
  }, [weeks])

  const DAY_LABELS = ['Mo', '', 'Mi', '', 'Fr', '', 'So']

  return (
    <div>
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '0.6rem',
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
        }}
      >
        {[
          { color: 'var(--accent)', label: 'Morgen' },
          { color: '#16a34a',       label: 'Abend' },
          { color: '#7c3aed',       label: 'Beide' },
          { color: '#ca8a04',       label: 'Freeform' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: `${GAP}px`, alignItems: 'flex-start' }}>
        {/* Day-of-week labels */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: `${GAP}px`,
            paddingTop: `${CELL + GAP}px`, // offset for month row
            marginRight: '2px',
            flexShrink: 0,
          }}
        >
          {DAY_LABELS.map((d, i) => (
            <div
              key={i}
              style={{
                height: `${CELL}px`,
                fontSize: '0.58rem',
                color: 'var(--text-muted)',
                lineHeight: `${CELL}px`,
                width: '13px',
                textAlign: 'right',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div style={{ display: 'flex', gap: `${GAP}px`, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
              {/* Month label row */}
              <div
                style={{
                  height: `${CELL}px`,
                  fontSize: '0.58rem',
                  color: monthLabels[wi] ? 'var(--text-secondary)' : 'transparent',
                  lineHeight: `${CELL}px`,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {monthLabels[wi] ?? '.'}
              </div>

              {/* Day cells */}
              {week.map((date, di) => {
                const dayData = date ? grid[date] : undefined
                const isToday = date === TODAY
                const color = date ? getDayColor(dayData) : 'transparent'
                const label = date ? getDayLabel(dayData, date) : ''

                return (
                  <div
                    key={di}
                    title={label}
                    style={{
                      width: `${CELL}px`,
                      height: `${CELL}px`,
                      borderRadius: '3px',
                      background: color,
                      flexShrink: 0,
                      boxSizing: 'border-box',
                      outline: isToday ? '2px solid var(--accent)' : 'none',
                      outlineOffset: '1px',
                      cursor: date ? 'default' : 'default',
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
