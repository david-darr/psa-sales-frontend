import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem("jwt") || "")

  useEffect(() => {
    if (token) {
      fetch("https://psa-sales-backend.onrender.com/api/profile", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => setUser(data && !data.error ? data : null))
    } else {
      setUser(null)
    }
  }, [token])

  const login = (token, user) => {
    setToken(token)
    setUser(user)
    localStorage.setItem("jwt", token)
  }

  const logout = () => {
    setToken("")
    setUser(null)
    localStorage.removeItem("jwt")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}