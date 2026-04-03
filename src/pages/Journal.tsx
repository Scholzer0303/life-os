import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MorningJournal from '../components/journal/MorningJournal'

export default function Journal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const type = searchParams.get('type')

  // Wenn kein Typ → Journal-Übersicht (kommt in Schritt 7)
  if (!type) {
    return (
      <div style={{ paddingTop: '1rem' }}>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Journal</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Übersicht & Suche kommen in Schritt 7.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '0.875rem',
          padding: '0 0 1.25rem',
        }}
      >
        <ArrowLeft size={16} />
        Zurück
      </button>

      {type === 'morning' && <MorningJournal />}

      {type === 'evening' && (
        <div style={{ paddingTop: '1rem' }}>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Abend-Journal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Kommt in Schritt 7.</p>
        </div>
      )}

      {type === 'freeform' && (
        <div style={{ paddingTop: '1rem' }}>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Freeform</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Kommt in Schritt 7.</p>
        </div>
      )}
    </div>
  )
}
