import type { OBData } from '../../pages/OnboardingNew'

interface Props {
  data: OBData
  onChange: (updates: Partial<OBData>) => void
  onNext: () => void
  onBack: () => void
}

export default function OBName({ data, onChange, onNext, onBack }: Props) {
  const canContinue = data.name.trim().length > 0

  return (
    <div style={{ paddingTop: '2.5rem' }}>
      <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Schritt 1 von 2
      </div>
      <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        Wie soll ich dich nennen?
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
        Dein Name wird in der App verwendet.
      </p>

      <input
        type="text"
        value={data.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Dein Name"
        autoFocus
        style={{
          width: '100%',
          padding: '0.875rem 1rem',
          borderRadius: '10px',
          border: '1.5px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          fontSize: '1.05rem',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: '2rem',
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' && canContinue) onNext() }}
      />

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: '0.875rem',
            borderRadius: '10px',
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          ← Zurück
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          style={{
            flex: 2,
            padding: '0.875rem',
            borderRadius: '10px',
            border: 'none',
            background: canContinue ? 'var(--accent)' : 'var(--border)',
            color: canContinue ? '#fff' : 'var(--text-muted)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          Weiter →
        </button>
      </div>
    </div>
  )
}
