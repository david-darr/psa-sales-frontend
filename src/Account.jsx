import { useState, useEffect } from "react"
import { useAuth } from "./AuthContext"
import { useNavigate } from "react-router-dom"
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'

const buttons = [
  { label: "Home +", path: "/" },
  { label: "Schools List +", path: "/schools" },
  { label: "Emails +", path: "/emails" },
  { label: "Team +", path: "/team" },
  { label: "Account +", path: "/account" }
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 770);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 770);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(window.innerWidth <= 1285);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 1285);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isNarrow;
}

export default function Account() {
  const { user, login, logout } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const isMobile = useIsMobile();
  const isNarrow = useIsNarrow();
  const [menuOpen, setMenuOpen] = useState(false);

  const images = [
    "/psa pics/bg1.jpg",
    "/psa pics/bg2.jpg",
    "/psa pics/bg3.jpg",
    "/psa pics/bg4.jpg",
    "/psa pics/bg5.jpg"
  ];
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(i => (i + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

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

  const handleGoogleSuccess = async (credentialResponse) => {
    const res = await fetch("https://psa-sales-backend.onrender.com/api/google-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: credentialResponse.credential })
    })
    const data = await res.json()
    if (data.access_token) {
      login(data.access_token, data.user)
      navigate("/schools")
    } else {
      setError(data.error || "Google login failed")
    }
  }

  // HEADER
  function Header() {
    if (isMobile) {
      return (
        <div className="mobile-header-container">
          <img src="/PSA_logo.png" alt="PSA logo" className="logo" />
          <div style={{ marginLeft: "auto" }}>
            <button
              className="home-btn"
              onClick={() => setMenuOpen(open => !open)}
              aria-label="Open menu"
            >
              <span style={{ display: "inline-block", verticalAlign: "middle" }}>
                <svg width="32" height="32" viewBox="0 0 32 32">
                  <rect y="7" width="32" height="4" rx="2" fill="white"/>
                  <rect y="14" width="32" height="4" rx="2" fill="white"/>
                  <rect y="21" width="32" height="4" rx="2" fill="white"/>
                </svg>
              </span>
            </button>
          </div>
          {isNarrow && menuOpen && (
            <div style={{
              position: "absolute",
              top: 80,
              right: "12%",
              background: "#c40c0c",
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              padding: "12px 0",
              minWidth: 180,
              maxHeight: "60vh",
              overflowY: "auto",
              zIndex: 300
            }}>
              {buttons.map(btn => (
                <button
                  key={btn.path}
                  className="home-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(btn.path);
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    // Desktop header
    return (
      <div className="header-container">
        <img src="/PSA_logo.png" alt="PSA logo" className="logo" />
        {buttons.map(btn => (
          <button
            key={btn.path}
            className="home-btn"
            onClick={() => navigate(btn.path)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    );
  }

  // CARD STYLE
  const cardStyle = {
    background: "#fff",
    color: "#232323",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    padding: "2.5rem 2rem",
    maxWidth: 400,
    margin: isMobile ? "110px auto 0 auto" : "140px auto 0 auto",
    textAlign: "center"
  }

  // BACKGROUND IMAGE
  const bgImgStyle = isMobile
    ? { width: "100vw", height: 210, objectFit: "cover", display: "block" }
    : { width: "100vw", height: 310, objectFit: "cover", display: "block" }

  // LOGGED IN VIEW
  if (user) {
    return (
      <div style={{ minHeight: "100vh", width: "100vw", background: "#f5f5f5", position: "relative" }}>
        <Header />
        <div style={{ width: "100vw", height: isMobile ? 210 : 310, overflow: "hidden", marginTop: isMobile ? 70 : 0 }}>
          <img src={images[bgIndex]} alt="" style={bgImgStyle} />
        </div>
        <div style={cardStyle}>
          <h2 style={{ color: "#c40c0c" }}>Welcome, {user.name}!</h2>
          <div style={{ margin: "1.5rem 0" }}>
            <div><b>Email:</b> {user.email}</div>
            <div><b>Phone:</b> {user.phone || "—"}</div>
          </div>
          <button className="home-btn" onClick={logout} style={{ width: "100%" }}>Logout</button>
        </div>
      </div>
    )
  }

  // LOGIN/REGISTER VIEW
  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#f5f5f5", position: "relative" }}>
      <Header />
      <div style={{ width: "100vw", height: isMobile ? 210 : 310, overflow: "hidden", marginTop: isMobile ? 70 : 0 }}>
        <img src={images[bgIndex]} alt="" style={bgImgStyle} />
      </div>
      <div style={cardStyle}>
        <h2 style={{ color: "#c40c0c", marginBottom: 24 }}>{isRegister ? "Register" : "Login"}</h2>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <input
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
                required
                style={{ marginBottom: 12, width: "100%" }}
              />
              <input
                name="phone"
                placeholder="Phone"
                value={form.phone}
                onChange={handleChange}
                style={{ marginBottom: 12, width: "100%" }}
              />
            </>
          )}
          <input
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            style={{ marginBottom: 12, width: "100%" }}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{ marginBottom: 18, width: "100%" }}
          />
          <button type="submit" className="home-btn" style={{ width: "100%", marginBottom: 12 }}>
            {isRegister ? "Register" : "Login"}
          </button>
        </form>
        <button
          type="button"
          className="home-btn"
          style={{ width: "100%", marginBottom: 18, background: "#e53935" }}
          onClick={() => setIsRegister(r => !r)}
        >
          {isRegister ? "Already have an account? Login" : "No account? Register"}
        </button>
        <div style={{ margin: "18px 0" }}>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google login failed")}
              width="100%"
            />
          </GoogleOAuthProvider>
        </div>
        {error && <div style={{ color: "#e53935", marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  )
}