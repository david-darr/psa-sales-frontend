import { createContext, useCallback, useContext, useEffect, useState } from "react"
import api, { onSessionExpired } from "./lib/api"
import { UI_PREVIEW, NEW_EMPLOYEE_PREVIEW, ADMIN_PREVIEW, exitUiPreview } from './lib/previewMode'
import { DEMO_USER, NEW_EMPLOYEE_USER, DEMO_ADMIN_USER } from './lib/previewFixtures'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(UI_PREVIEW ? (
    ADMIN_PREVIEW ? DEMO_ADMIN_USER : NEW_EMPLOYEE_PREVIEW ? NEW_EMPLOYEE_USER : DEMO_USER
  ) : null)
  const [accessToken, setAccessToken] = useState(() => UI_PREVIEW ? 'preview-session' : localStorage.getItem("jwt") || "")
  const [loading, setLoading] = useState(!UI_PREVIEW)

  const logout = useCallback(() => {
    if (UI_PREVIEW) {
      exitUiPreview()
      return
    }
    setAccessToken("")
    setUser(null)
    localStorage.removeItem("jwt")
  }, [])

  // Register once so any 401 from anywhere in the app clears the session.
  // Previously each component checked `res.status === 401` itself, and a
  // component that forgot left the user clicking a dead button.
  useEffect(() => onSessionExpired(logout), [logout])

  useEffect(() => {
    if (UI_PREVIEW) return
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
    if (UI_PREVIEW) return
    localStorage.setItem("jwt", token)
    setAccessToken(token)
    setUser({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      admin: userData.admin || false,
      mail_connected: userData.mail_connected === true,
    })
  }

  const markMailConnected = () => {
    setUser((current) => current ? { ...current, mail_connected: true } : current)
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading, markMailConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
