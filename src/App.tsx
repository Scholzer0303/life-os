import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'
import AuthGuard from './components/AuthGuard'
import Login from './pages/Login'

// Placeholder pages — werden in späteren Schritten gebaut
function Dashboard() {
  const { profile, session } = useStore()
  const { signOut } = useAuthActions()
  return (
    <div style={{ padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      <h1 style={{ fontFamily: 'Lora, serif' }}>Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Eingeloggt als: <strong>{session?.user.email}</strong>
      </p>
      {profile && (
        <p style={{ color: 'var(--text-secondary)' }}>
          Profil geladen: {profile.onboarding_completed ? '✅ Onboarding abgeschlossen' : '⏳ Onboarding ausstehend'}
        </p>
      )}
      <button
        onClick={signOut}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          background: 'var(--accent-warm)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        Ausloggen
      </button>
    </div>
  )
}

function useAuthActions() {
  const { reset } = useStore()
  return {
    signOut: async () => {
      await supabase.auth.signOut()
      reset()
    },
  }
}

export default function App() {
  const { setUser, setSession, setLoading, setProfile } = useStore()

  useEffect(() => {
    // Initial session check
    setLoading(true)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        loadProfile(data.session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes (magic link callback, logout, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile(userId: string) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Profile load error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
