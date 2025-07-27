import { useState } from "react"
import { useAuth } from "./AuthContext"
import { useNavigate } from "react-router-dom"

export default function Account() {
  const { user, login, logout } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError("")
    const url = isRegister
      ? "https://psa-sales-backend.onrender.com/api/register"
      : "https://psa-sales-backend.onrender.com/api/login"
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (data.access_token) {
      login(data.access_token, data.user)
      navigate("/schools")
    } else if (data.message && isRegister) {
      setIsRegister(false)
      setForm({ name: "", email: "", phone: "", password: "" })
    } else {
      setError(data.error || "Unknown error")
    }
  }

  if (user) {
    return (
      <div>
        <div className="section-header">
          <button className="back-btn-global" onClick={() => navigate("/")}>← Home</button>
          <h2 className="section-title">Account</h2>
        </div>
        <div>
          <h2>Welcome, {user.name}!</h2>
          <p>Email: {user.email}</p>
          <p>Phone: {user.phone}</p>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <button className="back-btn-global" onClick={() => navigate("/")}>← Home</button>
        <h2 className="section-title">{isRegister ? "Register" : "Login"}</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "2rem auto" }}>
        {isRegister && (
          <>
            <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
            <br />
            <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
            <br />
          </>
        )}
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <br />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <br />
        <button type="submit">{isRegister ? "Register" : "Login"}</button>
        <br />
        <button type="button" onClick={() => setIsRegister(r => !r)}>
          {isRegister ? "Already have an account? Login" : "No account? Register"}
        </button>
        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>
    </div>
  )
}