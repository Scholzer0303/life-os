import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { useStore } from '../../store/useStore'
import { getEntriesForMonth } from '../../lib/db'
import type { JournalEntryRow } from '../../types/database'

interface Props {
  month: number
  year: number
}

interface DataPoint {
  day: number
  value: number | null
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function average(points: DataPoint[]): number | null {
  const vals = points.map((p) => p.value).filter((v): v is number => v !== null)
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

function buildDataset(
  entries: JournalEntryRow[],
  type: 'morning' | 'evening',
  field: 'energy_level' | 'weight' | 'sleep_score',
  daysInMonth: number
): DataPoint[] {
  const map = new Map<number, number>()
  entries
    .filter((e) => e.type === type && e[field] !== null)
    .forEach((e) => {
      const day = parseInt(e.entry_date.split('-')[2], 10)
      map.set(day, e[field] as number)
    })
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    value: map.get(i + 1) ?? null,
  }))
}

// ─── Einzelner Chart ──────────────────────────────────────────────────────────

interface SingleChartProps {
  label: string
  unit: string
  data: DataPoint[]
  color: string
  domain: [number | 'auto', number | 'auto']
  avg: number | null
}

function SingleChart({ label, unit, data, color, domain, avg }: SingleChartProps) {
  const hasData = data.some((d) => d.value !== null)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
      {/* Kopfzeile */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        {avg !== null ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{avg}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unit}</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>–</span>
        )}
      </div>

      {!hasData ? (
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Noch keine Daten
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(data.length / 5)}
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              tickCount={3}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                padding: '0.4rem 0.7rem',
              }}
              formatter={(val) => [`${val} ${unit}`, label]}
              labelFormatter={(l) => `Tag ${l}`}
              cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
            />
            {avg !== null && (
              <ReferenceLine
                y={avg}
                stroke={color}
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function MetricChart({ month, year }: Props) {
  const { user } = useStore()
  const [entries, setEntries] = useState<JournalEntryRow[]>([])
  const [loading, setLoading] = useState(false)

  const daysInMonth = getDaysInMonth(month, year)

  const loadEntries = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getEntriesForMonth(user.id, month, year)
      setEntries(data)
    } catch (err) {
      console.error('MetricChart laden:', err)
    } finally {
      setLoading(false)
    }
  }, [user, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadEntries() }, [loadEntries])

  const energyData = buildDataset(entries, 'evening', 'energy_level', daysInMonth)
  const weightData = buildDataset(entries, 'morning', 'weight', daysInMonth)
  const sleepData  = buildDataset(entries, 'morning', 'sleep_score', daysInMonth)

  const avgEnergy = average(energyData)
  const avgWeight = average(weightData)
  const avgSleep  = average(sleepData)

  if (loading) {
    return <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade Metriken…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Metriken
      </div>
      <SingleChart
        label="Energielevel"
        unit="/10"
        data={energyData}
        color="#f97316"
        domain={[1, 10]}
        avg={avgEnergy}
      />
      <SingleChart
        label="Gewicht"
        unit="kg"
        data={weightData}
        color="#3b82f6"
        domain={['auto', 'auto']}
        avg={avgWeight}
      />
      <SingleChart
        label="Schlaf-Score"
        unit="/100"
        data={sleepData}
        color="#22c55e"
        domain={[0, 100]}
        avg={avgSleep}
      />
    </div>
  )
}
