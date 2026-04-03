import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'
import AuthGuard from './components/AuthGuard'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'

// Placeholder — wird in Schritt 5 gebaut
function Dashboard() {
  const { profile, session } = useStore()
  const { doSignOut } = useAuthActions()
  return (
    <div style={{ padding: '2rem', fontFamily: 'DM Sans, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Lora, serif' }}>Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Eingeloggt als: <strong>{session?.user.email}</strong>
      </p>
      {profile?.north_star && (
        <div
          style={{
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '10px',
            borderLeft: '3px solid var(--accent)',
            margin: '1rem 0',
          }}
        >
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.3rem' }}>NORDSTERN</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{profile.north_star}</p>
        </div>
      )}
      <button
        onClick={doSignOut}
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
    doSignOut: async () => {
      await supabase.auth.signOut()
      reset()
    },
  }
}

// Routes that require onboarding to be completed
function AppRoutes() {
  const { profile } = useStore()

  // If onboarding not done, always redirect to /onboarding
  if (profile !== null && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }
  // If profile is null but auth is valid, wait (loading state handled in AuthGuard)
  // If profile exists and onboarding done, show normal app
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const { setUser, setSession, setLoading, setProfile } = useStore()

  useEffect(() => {
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      setProfile(data)
    } catch (err) {
      console.error('Profile load error:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/onboarding"
          element={
            <AuthGuard>
              <Onboarding />
            </AuthGuard>
          }
        />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AppRoutes />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
