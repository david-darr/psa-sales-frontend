import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("jwt") || "")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accessToken) {
      setLoading(true)
      fetch("https://psa-sales-backend.onrender.com/api/profile", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => {
          if (res.status === 401) {
            logout()
            return null
          }
          return res.ok ? res.json() : null
        })
        .then(data => {
          setUser(data && !data.error ? data : null)
        })
        .finally(() => setLoading(false))
    } else {
      setUser(null)
      setLoading(false)
    }
  }, [accessToken])

  const login = (token, user) => {
    setAccessToken(token)
    setUser(user)
    localStorage.setItem("jwt", token)
  }

  const logout = () => {
    setAccessToken("");
    setUser(null);
    localStorage.removeItem("jwt");
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}