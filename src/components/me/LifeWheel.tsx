import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { LIFE_AREAS, LIFE_AREA_ORDER } from '../../lib/lifeAreas'

interface Props {
  scores: Record<string, number>
}

const SHORT: Record<string, string> = {
  body_mind: 'Körper',
  social: 'Soziales',
  love: 'Liebe',
  finance: 'Finanzen',
  career: 'Karriere',
  meaning: 'Sinn',
}

export default function LifeWheel({ scores }: Props) {
  const data = LIFE_AREA_ORDER.map((key) => ({
    area: SHORT[key] ?? LIFE_AREAS[key].label,
    value: scores[key] ?? 0,
    fullMark: 10,
  }))

  const hasData = LIFE_AREA_ORDER.some((k) => (scores[k] ?? 0) > 0)

  if (!hasData) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
        Noch keine Ist-Stand-Werte eingetragen.<br />
        Im Journal → Jahr → Planung kannst du deinen aktuellen Stand setzen.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="area"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
        />
        <Radar
          dataKey="value"
          stroke="var(--accent)"
          fill="var(--accent)"
          fillOpacity={0.18}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
