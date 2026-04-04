import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { getActiveGoals, getRecentEntries } from './lib/db'
import { useStore } from './store/useStore'
import AuthGuard from './components/AuthGuard'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Journal from './pages/Journal'
import Goals from './pages/Goals'
import Coach from './pages/Coach'
import Review from './pages/Review'
import PatternInterrupt from './pages/PatternInterrupt'
import Settings from './pages/Settings'


function AppRoutes() {
  const { profile } = useStore()

  if (profile !== null && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/review" element={<Review />} />
        <Route path="/pattern-interrupt" element={<PatternInterrupt />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  const { setUser, setSession, setLoading, setProfile, setGoals, setRecentEntries } = useStore()

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
      const [profileData, goalsData, recentData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        getActiveGoals(userId),
        getRecentEntries(userId, 7),
      ])

      let profile = profileData.data
      if (!profile) {
        // Kein Profil vorhanden — minimal anlegen damit Foreign Keys funktionieren
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert({ id: userId }, { onConflict: 'id' })
          .select()
          .single()
        if (createError) {
          console.error('Profil anlegen fehlgeschlagen:', createError)
        } else {
          profile = created
        }
      }

      setProfile(profile)
      setGoals(goalsData)
      setRecentEntries(recentData)
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
