interface Props {
  onNext: () => void
}

export default function OBWelcome({ onNext }: Props) {
  return (
    <div style={{ paddingTop: '4rem', textAlign: 'center' }}>
      <div
        style={{
          fontFamily: 'Lora, serif',
          fontSize: '2.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '1rem',
          letterSpacing: '-0.5px',
        }}
      >
        Life OS
      </div>
      <p
        style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          marginBottom: '3rem',
          lineHeight: 1.6,
          maxWidth: '320px',
          margin: '0 auto 3rem',
        }}
      >
        Dein persönlicher KI-Mentor. Starten wir.
      </p>
      <button
        onClick={onNext}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '0.875rem 2.5rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        Einrichten →
      </button>
    </div>
  )
}
