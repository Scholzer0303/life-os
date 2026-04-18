import { useState, useCallback } from 'react'
import OverviewCalendar from '../components/overview/OverviewCalendar'
import HabitGrid from '../components/overview/HabitGrid'
import MetricChart from '../components/overview/MetricChart'
import DayArchive from '../components/overview/DayArchive'

function getMonthAtOffset(offset: number): { month: number; year: number } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

export default function Overview() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [habitMonthRate, setHabitMonthRate] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { month, year } = getMonthAtOffset(monthOffset)
  const isCurrentMonth = monthOffset === 0

  const handleHabitRate = useCallback((rate: number | null) => {
    setHabitMonthRate(rate)
  }, [])

  return (
    <div className="overview-grid">

      {/* Linke Spalte: Kalender */}
      <div style={cardStyle}>
        <OverviewCalendar
          month={month}
          year={year}
          isCurrentMonth={isCurrentMonth}
          onPrev={() => setMonthOffset((m) => m - 1)}
          onNext={() => setMonthOffset((m) => m + 1)}
          onGoToToday={() => setMonthOffset(0)}
          habitMonthRate={habitMonthRate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {/* Rechte Spalte: Habit-Grid + Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <HabitGrid
            month={month}
            year={year}
            onRateComputed={handleHabitRate}
          />
        </div>
        <div style={cardStyle}>
          <MetricChart month={month} year={year} />
        </div>
      </div>

      {selectedDate && (
        <div style={{ gridColumn: '1 / -1' }}>
          <DayArchive date={selectedDate} onClose={() => setSelectedDate(null)} />
        </div>
      )}

    </div>
  )
}
