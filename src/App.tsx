import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LocationProvider } from './context/LocationContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ProfilePage } from './pages/ProfilePage'
import { FriendsPage } from './pages/FriendsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { OrbitMapDashboard } from './components/OrbitMapDashboard'

// Handles OAuth redirects: after Google sign-in Supabase returns to /?code=...
// We listen for the auth state change and redirect to /app
function OAuthRedirectHandler() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      const currentPath = window.location.pathname
      // If we're on a public page but now authenticated, redirect to app
      if (currentPath === '/' || currentPath === '/login' || currentPath === '/signup') {
        navigate('/app', { replace: true })
      }
    }
  }, [user, loading, navigate])

  return null
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <LocationProvider userId={user?.id ?? null}>
      <OAuthRedirectHandler />
      <Routes>
        {/* Public Landing & Marketing */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Application Workspace */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout>
                <OrbitMapDashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <AppLayout>
                <FriendsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/privacy"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PrivacyPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LocationProvider>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
