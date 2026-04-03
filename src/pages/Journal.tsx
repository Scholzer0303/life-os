import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MorningJournal from '../components/journal/MorningJournal'
import EveningJournal from '../components/journal/EveningJournal'
import FreeformJournal from '../components/journal/FreeformJournal'
import JournalOverview from '../components/journal/JournalOverview'

export default function Journal() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const type = searchParams.get('type')

  if (!type) {
    return <JournalOverview />
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', padding: '0 0 1.25rem' }}
      >
        <ArrowLeft size={16} />
        Zurück
      </button>

      {type === 'morning' && <MorningJournal />}
      {type === 'evening' && <EveningJournal />}
      {type === 'freeform' && <FreeformJournal />}
    </div>
  )
}
