import type { OBData } from '../../pages/OnboardingNew'
import { getPinHash } from '../../lib/pin'

interface Props {
  data: OBData
  onFinish: () => void
  onBack: () => void
}

export default function OBFinish({ data, onFinish, onBack }: Props) {
  const name = data.name.trim() || 'du'
  const visionCount = Object.values(data.visionAreas).filter((v) => v.trim()).length
  const hasIdentity = data.identityStatement.trim().length > 0
  const hasYearStart = Object.keys(data.yearScores).length > 0
  const hasPin = Boolean(getPinHash())

  const checks: { label: string; done: boolean; hint?: string }[] = [
    { label: 'Name gesetzt', done: data.name.trim().length > 0 },
    { label: 'PIN gesetzt', done: hasPin },
    {
      label: `Vision (${visionCount}/6 Bereiche ausgefüllt)`,
      done: visionCount > 0,
      hint: visionCount === 0 ? 'Später im „Ich"-Tab nachholen' : undefined,
    },
    {
      label: 'Identität definiert',
      done: hasIdentity,
      hint: !hasIdentity ? 'Später im „Ich"-Tab nachholen' : undefined,
    },
    {
      label: 'Jahresstart erfasst',
      done: hasYearStart,
      hint: !hasYearStart ? 'Später in Journal → Jahr → Planung nachholen' : undefined,
    },
  ]

  const anySkipped = !hasIdentity || visionCount === 0 || !hasYearStart

  return (
    <div style={{ paddingTop: '2.5rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎉</div>
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Alles bereit, {name}!
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
        {anySkipped
          ? 'Du kannst jederzeit zurück und fehlende Schritte im „Ich"-Tab nachholen.'
          : 'Dein persönlicher Mentor ist eingerichtet. Los geht\'s.'}
      </p>

      {/* Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {checks.map((c) => (
          <div
            key={c.label}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'var(--bg-card)',
              border: `1px solid ${c.done ? 'color-mix(in srgb, #22c55e 25%, transparent)' : 'var(--border)'}`,
            }}
          >
            <span
              style={{
                fontSize: '1rem',
                color: c.done ? '#22c55e' : 'var(--text-muted)',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              {c.done ? '✓' : '○'}
            </span>
            <div>
              <div style={{ fontSize: '0.875rem', color: c.done ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.4 }}>
                {c.label}
              </div>
              {c.hint && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {c.hint}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <button
          onClick={onFinish}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Life OS starten →
        </button>
        <button
          onClick={onBack}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '10px',
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          ← Zurück
        </button>
      </div>
    </div>
  )
}
