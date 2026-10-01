import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './styles/ui.css'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // The profile check can take several seconds against a cold Render
  // instance. This used to render `null`, so the whole app was a blank white
  // page for that whole window with no indication anything was happening.
  if (loading) {
    return (
      <div className="ui-route-loading" role="status" aria-live="polite">
        <div className="ui-empty-icon" aria-hidden="true">
          ⏳
        </div>
        <p>Checking your session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/account" replace state={{ from: location }} />
  }

  return children
}
