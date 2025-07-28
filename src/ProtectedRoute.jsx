import { useAuth } from "./AuthContext"
import { Navigate, useLocation } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null // or a spinner/loading indicator
  if (!user) {
    return <Navigate to="/account" replace state={{ from: location }} />
  }
  return children
}