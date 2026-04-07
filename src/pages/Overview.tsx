import { useState, useCallback } from 'react'
import OverviewCalendar from '../components/overview/OverviewCalendar'
import HabitGrid from '../components/overview/HabitGrid'
import MetricChart from '../components/overview/MetricChart'

function getMonthAtOffset(offset: number): { month: number; year: number } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

export default function Overview() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [habitMonthRate, setHabitMonthRate] = useState<number | null>(null)

  const { month, year } = getMonthAtOffset(monthOffset)
  const isCurrentMonth = monthOffset === 0

  const handleHabitRate = useCallback((rate: number | null) => {
    setHabitMonthRate(rate)
  }, [])

  return (
    <div style={{ paddingTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <OverviewCalendar
        month={month}
        year={year}
        isCurrentMonth={isCurrentMonth}
        onPrev={() => setMonthOffset((m) => m - 1)}
        onNext={() => setMonthOffset((m) => m + 1)}
        onGoToToday={() => setMonthOffset(0)}
        habitMonthRate={habitMonthRate}
      />

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <HabitGrid
          month={month}
          year={year}
          onRateComputed={handleHabitRate}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <MetricChart month={month} year={year} />
      </div>
    </div>
  )
}
