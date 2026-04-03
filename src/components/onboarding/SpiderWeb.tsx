import { LEBENSRAD_AREAS } from '../../types/onboarding'
import type { LebensradScores } from '../../types/onboarding'

interface Props {
  scores: LebensradScores
  size?: number
}

export default function SpiderWeb({ scores, size = 260 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * 0.78
  const n = LEBENSRAD_AREAS.length
  const rings = [2, 4, 6, 8, 10]

  function point(i: number, value: number): [number, number] {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const dist = (value / 10) * r
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)]
  }

  function ringPoints(v: number): string {
    return Array.from({ length: n }, (_, i) => point(i, v).join(',')).join(' ')
  }

  const dataPoints = LEBENSRAD_AREAS.map((area, i) => point(i, scores[area]))
  const dataPolygon = dataPoints.map((p) => p.join(',')).join(' ')

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ overflow: 'visible', maxWidth: '100%' }}
      aria-label="Lebensrad Visualisierung"
    >
      {/* Grid rings */}
      {rings.map((v) => (
        <polygon
          key={v}
          points={ringPoints(v)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={v === 10 ? 1.5 : 1}
        />
      ))}

      {/* Axes */}
      {LEBENSRAD_AREAS.map((_, i) => {
        const [x, y] = point(i, 10)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth={1}
          />
        )
      })}

      {/* Data polygon */}
      <polygon
        points={dataPolygon}
        fill="var(--accent)"
        fillOpacity={0.18}
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ transition: 'all 0.3s ease' }}
      />

      {/* Data points */}
      {dataPoints.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={4}
          fill="var(--accent)"
          style={{ transition: 'all 0.3s ease' }}
        />
      ))}

      {/* Labels */}
      {LEBENSRAD_AREAS.map((area, i) => {
        const [x, y] = point(i, 11.5)
        const anchor =
          x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle'
        return (
          <text
            key={area}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={10}
            fontFamily="DM Sans, sans-serif"
            fill="var(--text-secondary)"
          >
            {area}
          </text>
        )
      })}
    </svg>
  )
}
