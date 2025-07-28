import { useAuth } from "./AuthContext"
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null // or a spinner/loading indicator
  if (!user) {
    return <Navigate to="/account" replace />
  }
  return children
}