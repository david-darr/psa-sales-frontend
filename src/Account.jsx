import { useState, useEffect } from "react"
import { useAuth } from "./AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import NavigationCard from './NavigationCard'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024 && window.innerWidth > 768)
  useEffect(() => {
    const onResize = () => setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isTablet
}

export default function Account() {
  const { user, login, logout, accessToken } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })
  const [error, setError] = useState("")
  const [emailSettings, setEmailSettings] = useState({ email_password: "" })
  const [emailStatus, setEmailStatus] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Ensure full viewport coverage
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    
    return () => {
      if (!document.querySelector('.dashboard-container')) {
        document.body.style.display = 'flex';
        document.body.style.alignItems = 'center';
        document.body.style.justifyContent = 'center';
        document.body.style.background = '#f5f5f5';
      }
    };
  }, []);

  // Close mobile nav when clicking outside or on resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile && mobileNavOpen) {
        setMobileNavOpen(false)
      }
    }

    const handleClickOutside = (event) => {
      if (mobileNavOpen && !event.target.closest('.mobile-nav-sidebar') && !event.target.closest('.mobile-nav-toggle')) {
        setMobileNavOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    document.addEventListener('click', handleClickOutside)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobile, mobileNavOpen])

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
      // Redirect to intended page or default to home
      const redirectTo = location.state?.from?.pathname || "/"
      navigate(redirectTo, { replace: true })
    } else if (data.message && isRegister) {
      setIsRegister(false)
      setForm({ name: "", email: "", phone: "", password: "" })
      setError("Registration successful! Please log in.")
      setTimeout(() => setError(""), 3000)
    } else {
      setError(data.error || "Unknown error")
    }
  }

  const handleEmailSettings = async (e) => {
    e.preventDefault()
    setEmailStatus("")
    const res = await fetch("https://psa-sales-backend.onrender.com/api/email-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(emailSettings)
    })
    const data = await res.json()
    if (data.message) {
      setEmailStatus("Email settings saved successfully!")
      setEmailSettings({ email_password: "" })
    } else {
      setEmailStatus(data.error || "Failed to save settings")
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Navigation Toggle Button */}
      {isMobile && (
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 1001,
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            border: '1px solid #475569',
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              width: '20px',
              height: '16px'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '2px',
                background: '#f1f5f9',
                borderRadius: '1px',
                transition: 'all 0.3s ease',
                transform: mobileNavOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'
              }}
            />
            <div
              style={{
                width: '100%',
                height: '2px',
                background: '#f1f5f9',
                borderRadius: '1px',
                transition: 'all 0.3s ease',
                opacity: mobileNavOpen ? 0 : 1
              }}
            />
            <div
              style={{
                width: '100%',
                height: '2px',
                background: '#f1f5f9',
                borderRadius: '1px',
                transition: 'all 0.3s ease',
                transform: mobileNavOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none'
              }}
            />
          </div>
        </button>
      )}

      {/* Mobile Navigation Overlay */}
      {isMobile && mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Mobile Navigation Sidebar - Only visible on mobile when open */}
      {isMobile && (
        <div
          className="mobile-nav-sidebar"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '280px',
            height: '100vh',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderRight: '1px solid #334155',
            padding: '2rem',
            transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
            zIndex: 1000,
            overflowY: 'auto'
          }}
        >
          <NavigationCard />
        </div>
      )}

      {/* Desktop Navigation Sidebar - Only visible on desktop */}
      {!isMobile && (
        <div
          className="nav-sidebar"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '280px',
            height: '100vh',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderRight: '1px solid #334155',
            padding: '2rem',
            zIndex: 1000,
            overflowY: 'auto'
          }}
        >
          <NavigationCard />
        </div>
      )}
      
      <main className="modern-main-content" style={{ 
        marginLeft: isMobile ? 0 : 280,
        paddingTop: isMobile ? "4rem" : "2rem",
        paddingLeft: isMobile ? "1rem" : "2rem",
        paddingRight: isMobile ? "1rem" : "2rem",
        paddingBottom: "2rem",
        width: isMobile ? "100vw" : "calc(100vw - 280px)"
      }}>
        {/* Header Section */}
        <div className="modern-page-header" style={{ 
          marginBottom: isMobile ? "1rem" : "2rem",
          textAlign: "left"
        }}>
          <h1 className="modern-page-title" style={{
            fontSize: isMobile ? "2rem" : "3rem",
            marginBottom: isMobile ? "0.25rem" : "0.5rem",
            textAlign: "left"
          }}>
            ACCOUNT SETTINGS
          </h1>
          <p className="modern-page-subtitle" style={{
            textAlign: "left"
          }}>
            {user ? `Welcome back, ${user.name}!` : 'Login to Your Account'}
          </p>
        </div>

        {user ? (
          /* LOGGED IN VIEW */
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "1fr 1fr",
            gap: isMobile ? "1rem" : "2rem"
          }}>
            {/* User Profile Card */}
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">Profile Information</div>
                <div className="modern-card-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
                  👤
                </div>
              </div>
              <div className="modern-card-content">
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "1rem",
                  marginBottom: "2rem"
                }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "700",
                    fontSize: "2rem",
                    flexShrink: 0
                  }}>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: "1.5rem", 
                      fontWeight: "700", 
                      color: "#f1f5f9", 
                      marginBottom: "0.5rem" 
                    }}>
                      {user.name}
                    </div>
                    <div style={{ 
                      fontSize: "1rem", 
                      fontWeight: "600",
                      color: user.admin ? "#f59e0b" : "#8b5cf6",
                      background: user.admin ? "rgba(245, 158, 11, 0.1)" : "rgba(139, 92, 246, 0.1)",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      display: "inline-block"
                    }}>
                      {user.admin ? '👑 Administrator' : '📊 Sales Associate'}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "2rem" }}>
                  <div style={{ 
                    display: "grid", 
                    gap: "1rem",
                    marginBottom: "1.5rem"
                  }}>
                    <div style={{
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "8px",
                      padding: "1rem"
                    }}>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.25rem" }}>
                        EMAIL ADDRESS
                      </div>
                      <div style={{ color: "#f1f5f9", fontWeight: "500" }}>
                        📧 {user.email}
                      </div>
                    </div>
                    
                    <div style={{
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "8px",
                      padding: "1rem"
                    }}>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.25rem" }}>
                        PHONE NUMBER
                      </div>
                      <div style={{ color: "#f1f5f9", fontWeight: "500" }}>
                        📞 {user.phone || "Not provided"}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  className="modern-btn-primary" 
                  onClick={handleLogout} 
                  style={{ 
                    width: "100%",
                    background: "#ef4444",
                    fontSize: "1rem",
                    padding: "1rem"
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>

            {/* Email Configuration Card */}
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">Email Configuration</div>
                <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                  ⚙️
                </div>
              </div>
              <div className="modern-card-content">
                {emailStatus && (
                  <div style={{
                    marginBottom: "1.5rem",
                    padding: "1rem",
                    borderRadius: "8px",
                    background: emailStatus.includes("success") ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    border: emailStatus.includes("success") ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                    color: emailStatus.includes("success") ? "#10b981" : "#ef4444",
                    fontWeight: "600",
                    textAlign: "center"
                  }}>
                    {emailStatus}
                  </div>
                )}

                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ 
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1rem"
                  }}>
                    <div style={{ 
                      color: "#f59e0b", 
                      fontWeight: "600", 
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem"
                    }}>
                      ⚠️ Gmail App Password Required
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: "1.5" }}>
                      To send emails from your account, you need to configure a Gmail App Password. 
                      This is different from your regular Gmail password and provides secure access for applications.
                    </div>
                  </div>

                  <div style={{ 
                    color: "#e2e8f0", 
                    fontSize: "0.9rem", 
                    marginBottom: "1rem",
                    lineHeight: "1.6"
                  }}>
                    <strong>How to get your Gmail App Password:</strong>
                    <ol style={{ paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
                      <li>Go to your Google Account settings</li>
                      <li>Enable 2-Step Verification if not already enabled</li>
                      <li>Go to Security → App passwords</li>
                      <li>Generate a new app password for "Mail"</li>
                      <li>Copy and paste that password below</li>
                    </ol>
                  </div>
                </div>

                <form onSubmit={handleEmailSettings}>
                  <div style={{ marginBottom: "1rem" }}>
                    <input
                      type="password"
                      placeholder="Gmail App Password (16 characters)"
                      value={emailSettings.email_password}
                      onChange={(e) => setEmailSettings({ email_password: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                        background: "#334155",
                        color: "#f1f5f9",
                        fontSize: "1rem",
                        fontFamily: "monospace"
                      }}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="modern-btn-primary"
                    style={{ 
                      width: "100%", 
                      background: "#10b981",
                      fontSize: "1rem",
                      padding: "1rem"
                    }}
                  >
                    💾 Save Email Settings
                  </button>
                </form>

                <div style={{ 
                  marginTop: "1.5rem",
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "8px",
                  padding: "1rem"
                }}>
                  <div style={{ 
                    color: "#3b82f6", 
                    fontWeight: "600", 
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem"
                  }}>
                    🔒 Security Note
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: "1.5" }}>
                    Your app password is stored securely and only used to send emails on your behalf. 
                    You can revoke this access anytime from your Google Account settings.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* LOGIN/REGISTER VIEW */
          <div style={{
            maxWidth: "500px",
            margin: "0 auto"
          }}>
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">
                  {isRegister ? "Create Account" : "Login"}
                </div>
                <div className="modern-card-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
                  {isRegister ? "✨" : "🔐"}
                </div>
              </div>
              <div className="modern-card-content">
                {error && (
                  <div style={{
                    marginBottom: "1.5rem",
                    padding: "1rem",
                    borderRadius: "8px",
                    background: error.includes("successful") ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    border: error.includes("successful") ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                    color: error.includes("successful") ? "#10b981" : "#ef4444",
                    fontWeight: "600",
                    textAlign: "center"
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {isRegister && (
                    <div style={{ marginBottom: "1rem" }}>
                      <input
                        name="name"
                        placeholder="Full Name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem",
                          marginBottom: "1rem"
                        }}
                      />
                      <input
                        name="phone"
                        placeholder="Phone Number (optional)"
                        value={form.phone}
                        onChange={handleChange}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ marginBottom: "1rem" }}>
                    <input
                      name="email"
                      type="email"
                      placeholder="Email Address"
                      value={form.email}
                      onChange={handleChange}
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                        background: "#334155",
                        color: "#f1f5f9",
                        fontSize: "1rem",
                        marginBottom: "1rem"
                      }}
                    />
                    <input
                      name="password"
                      type="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                        background: "#334155",
                        color: "#f1f5f9",
                        fontSize: "1rem"
                      }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="modern-btn-primary" 
                    style={{ 
                      width: "100%", 
                      marginBottom: "1rem",
                      fontSize: "1rem",
                      padding: "1rem"
                    }}
                  >
                    {isRegister ? "✨ Create Account" : "🔐 Login"}
                  </button>
                </form>

                <button
                  type="button"
                  className="modern-btn-primary"
                  style={{ 
                    width: "100%", 
                    background: "#64748b",
                    fontSize: "1rem",
                    padding: "1rem"
                  }}
                  onClick={() => {
                    setIsRegister(r => !r)
                    setError("")
                    setForm({ name: "", email: "", phone: "", password: "" })
                  }}
                >
                  {isRegister ? "Already have an account? Login" : "Need an account? Register"}
                </button>

                {!isRegister && (
                  <div style={{ 
                    marginTop: "2rem",
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    textAlign: "center"
                  }}>
                    <div style={{ 
                      color: "#3b82f6", 
                      fontWeight: "600", 
                      marginBottom: "1rem",
                      fontSize: "1.1rem"
                    }}>
                      🚀 Welcome to PSA Sales Platform
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.6" }}>
                      Your comprehensive tool for managing school relationships, 
                      sending email campaigns, and tracking your sales performance.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features Overview Card - Only show for non-logged in users */}
            {!user && (
              <div className="modern-dashboard-card" style={{ marginTop: isMobile ? "1rem" : "2rem" }}>
                <div className="modern-card-header">
                  <div className="modern-card-title">Platform Features</div>
                  <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                    🎯
                  </div>
                </div>
                <div className="modern-card-content">
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "1rem"
                  }}>
                    <div style={{
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "8px",
                      padding: "1rem"
                    }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🏫</div>
                      <div style={{ color: "#f1f5f9", fontWeight: "600", marginBottom: "0.5rem" }}>
                        School Database
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        Manage your school contacts and track interactions
                      </div>
                    </div>

                    <div style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "8px",
                      padding: "1rem"
                    }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📧</div>
                      <div style={{ color: "#f1f5f9", fontWeight: "600", marginBottom: "0.5rem" }}>
                        Email Campaigns
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        Send and track email communications
                      </div>
                    </div>

                    <div style={{
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      borderRadius: "8px",
                      padding: "1rem"
                    }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🗺️</div>
                      <div style={{ color: "#f1f5f9", fontWeight: "600", marginBottom: "0.5rem" }}>
                        School Mapping
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        Visualize school locations and plan routes
                      </div>
                    </div>

                    <div style={{
                      background: "rgba(139, 92, 246, 0.1)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                      borderRadius: "8px",
                      padding: "1rem"
                    }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📊</div>
                      <div style={{ color: "#f1f5f9", fontWeight: "600", marginBottom: "0.5rem" }}>
                        Analytics
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        Track your performance and team metrics
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}