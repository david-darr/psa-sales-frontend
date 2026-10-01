import { createContext, useCallback, useContext, useEffect, useState } from "react"
import api, { onSessionExpired } from "./lib/api"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("jwt") || "")
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setAccessToken("")
    setUser(null)
    localStorage.removeItem("jwt")
  }, [])

  // Register once so any 401 from anywhere in the app clears the session.
  // Previously each component checked `res.status === 401` itself, and a
  // component that forgot left the user clicking a dead button.
  useEffect(() => onSessionExpired(logout), [logout])

  useEffect(() => {
    if (!accessToken) {
      setUser(null)
      setLoading(false)
      return
    }

    // Guard against a stale response from a previous token overwriting the
    // result for the current one.
    let active = true
    setLoading(true)

    api
      .get("/api/profile", { token: accessToken })
      .then((data) => {
        if (active) setUser(data && !data.error ? data : null)
      })
      .catch(() => {
        // A 401 has already triggered logout via the handler above; anything
        // else (network, 5xx) just means we could not confirm the profile.
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken])

  const login = (token, userData) => {
    localStorage.setItem("jwt", token)
    setAccessToken(token)
    setUser({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      admin: userData.admin || false,
    })
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
