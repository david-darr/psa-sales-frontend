import { lazy, Suspense } from 'react'
import AppLayout from './components/AppLayout'
import './App.css'
import { AuthProvider } from './AuthContext'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
const Home = lazy(() => import('./Home'))
const SchoolsList = lazy(() => import('./SchoolsList'))
const SchoolWorkspace = lazy(() => import('./SchoolWorkspace'))
const SchoolFinder = lazy(() => import('./SchoolFinder'))
const Emails = lazy(() => import('./Emails'))
const Team = lazy(() => import('./Team'))
const Account = lazy(() => import('./Account'))
import ProtectedRoute from './ProtectedRoute'
const PSAMap = lazy(() => import('./Map'))
const Tasks = lazy(() => import('./Tasks'))
const Pipeline = lazy(() => import('./Pipeline'))
const Portfolio = lazy(() => import('./Portfolio'))
const SalesAdmin = lazy(() => import('./SalesAdmin'))

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense
          fallback={
            <AppLayout title="Loading workspace">
              <div className="workspace-empty" role="status">
                Loading your workspace...
              </div>
            </AppLayout>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipeline"
              element={
                <ProtectedRoute>
                  <Pipeline />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <Portfolio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <PSAMap />
                </ProtectedRoute>
              }
            />
            <Route path="/account" element={<Account />} />
            <Route
              path="/finder"
              element={
                <ProtectedRoute>
                  <SchoolFinder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schools"
              element={
                <ProtectedRoute>
                  <SchoolsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schools/:id"
              element={
                <ProtectedRoute>
                  <SchoolWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emails"
              element={
                <ProtectedRoute>
                  <Emails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <SalesAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <Team />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}

export default App
