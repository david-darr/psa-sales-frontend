import { useState, useEffect } from 'react'
import { useAuth } from "./AuthContext"
import NavigationCard from './NavigationCard'  // ADD THIS LINE

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

// Add a tablet breakpoint to prevent cards from getting too small
function useIsTablet() {
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024 && window.innerWidth > 768);
  useEffect(() => {
    const onResize = () => setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isTablet;
}

export default function Home() {
  const { user, accessToken } = useAuth()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  // Mobile navigation state
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // State for user statistics
  const [userStats, setUserStats] = useState({
    totalSchools: 0,
    totalEmails: 0,
    pendingEmails: 0,
    respondedEmails: 0,
    loading: true
  })

  // State for recent emails
  const [recentEmails, setRecentEmails] = useState([])
  const [emailsLoading, setEmailsLoading] = useState(true)

  // Get current date for welcome message
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const teamData = [
    { name: "John Smith", role: "Sales Lead", schools: 45, emails: 67 },
    { name: "Sarah Johnson", role: "Sales Associate", schools: 32, emails: 54 },
    { name: "Mike Davis", role: "Sales Associate", schools: 28, emails: 43 },
    { name: "Emily Chen", role: "Sales Associate", schools: 39, emails: 71 }
  ]

  const mapLocations = [
    { area: "Northern VA", schools: 45 },
    { area: "Washington DC", schools: 23 },
    { area: "Maryland", schools: 18 },
    { area: "Fairfax County", schools: 34 }
  ]

  // Fetch user statistics
  const fetchUserStats = async () => {
    if (!accessToken) {
      setUserStats(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      setUserStats(prev => ({ ...prev, loading: true }))

      // Fetch user's schools
      const schoolsResponse = await fetch("https://psa-sales-backend.onrender.com/api/my-schools", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const schoolsData = await schoolsResponse.json()

      // Fetch user's sent emails
      const emailsResponse = await fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const emailsData = await emailsResponse.json()

      // Calculate statistics
      const totalSchools = Array.isArray(schoolsData) ? schoolsData.length : 0
      const totalEmails = Array.isArray(emailsData) ? emailsData.length : 0
      const respondedEmails = Array.isArray(emailsData) ? emailsData.filter(email => email.responded).length : 0
      const pendingEmails = Array.isArray(emailsData) ? emailsData.filter(email => !email.responded && !email.followup_sent).length : 0

      setUserStats({
        totalSchools,
        totalEmails,
        pendingEmails,
        respondedEmails,
        loading: false
      })

    } catch (error) {
      console.error('Error fetching user stats:', error)
      setUserStats(prev => ({ ...prev, loading: false }))
    }
  }

  // Fetch recent emails with school contact info
  const fetchRecentEmails = async () => {
    if (!accessToken) {
      setEmailsLoading(false)
      return
    }

    try {
      setEmailsLoading(true)

      // Fetch sent emails
      const emailsResponse = await fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const emailsData = await emailsResponse.json()

      // Fetch schools to get contact info
      const schoolsResponse = await fetch("https://psa-sales-backend.onrender.com/api/my-schools", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const schoolsData = await schoolsResponse.json()

      // Create a map of school emails to contact info
      const schoolsMap = {}
      if (Array.isArray(schoolsData)) {
        schoolsData.forEach(school => {
          schoolsMap[school.email] = {
            contact_name: school.contact_name,
            school_name: school.school_name
          }
        })
      }

      // Process and enrich email data, then get last 4
      if (Array.isArray(emailsData)) {
        const enrichedEmails = emailsData.map(email => {
          const schoolInfo = schoolsMap[email.school_email] || {}
          return {
            ...email,
            contact_name: schoolInfo.contact_name || 'Unknown',
            school_display_name: schoolInfo.school_name || email.school_name
          }
        })

        // Sort by sent date (newest first) and take last 4
        const sortedEmails = enrichedEmails.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
        setRecentEmails(sortedEmails.slice(0, 4))
      } else {
        setRecentEmails([])
      }

    } catch (error) {
      console.error('Error fetching recent emails:', error)
      setRecentEmails([])
    } finally {
      setEmailsLoading(false)
    }
  }

  // Load user stats when component mounts or user changes
  useEffect(() => {
    fetchUserStats()
  }, [accessToken, user])

  // Load recent emails when component mounts or user changes
  useEffect(() => {
    fetchRecentEmails()
  }, [accessToken, user])

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

  // Determine grid layout based on screen size
  const getGridColumns = () => {
    if (isMobile) return "1fr"
    if (isTablet) return "1fr 1fr" // 2 columns on tablet to prevent cards from getting too small
    return "1fr 1fr 1fr" // 3 columns on desktop
  }

  const getSecondRowColumns = () => {
    if (isMobile) return "1fr"
    return "1fr 1fr" // Always equal width on non-mobile
  }

  // Navigation handler for mobile
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
        // Fixed mobile layout with no sidebar
        marginLeft: isMobile ? 0 : 280,
        paddingTop: isMobile ? "4rem" : "2rem", // Reduced from 5rem to 4rem
        paddingLeft: isMobile ? "1rem" : "2rem",
        paddingRight: isMobile ? "1rem" : "2rem",
        paddingBottom: "2rem",
        width: isMobile ? "100vw" : "calc(100vw - 280px)"
      }}>
        {/* Header Section */}
        <div className="modern-page-header" style={{ 
          marginBottom: isMobile ? "1rem" : "2rem"
        }}>
          <h1 className="modern-page-title" style={{
            fontSize: isMobile ? "2rem" : "3rem",
            marginBottom: isMobile ? "0.25rem" : "0.5rem",
            textAlign: "left"
          }}>
            HOME
          </h1>
          <p className="modern-page-subtitle">
            {currentDate} |
          </p>
        </div>

        {/* First Row - Responsive Grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: getGridColumns(),
          gap: isMobile ? "1rem" : "1.5rem",
          marginBottom: isMobile ? "1rem" : "2rem"
        }}>
          
          {/* Welcome Card - Simplified */}
          <div className="modern-dashboard-card" style={{
            minHeight: isMobile ? "200px" : "250px" // Prevent cards from getting too small
          }}>
            <div className="modern-card-header">
              <div className="modern-card-title">Welcome{user ? `, ${user.name}!` : '!'}</div>
              <div className="modern-card-icon">👋</div>
            </div>
            <div className="modern-card-content">
              {user ? (
                <div style={{ textAlign: "center", padding: isMobile ? "1rem 0" : "2rem 0" }}>
                  <div style={{ 
                    fontSize: isMobile ? "1.2rem" : "1.5rem", 
                    fontWeight: "700", 
                    color: "#f1f5f9", 
                    marginBottom: "1rem" 
                  }}>
                    {user.name}
                  </div>
                  <div style={{ 
                    fontSize: isMobile ? "0.9rem" : "1rem", 
                    fontWeight: "600",
                    color: user.admin ? "#f59e0b" : "#8b5cf6",
                    background: user.admin ? "rgba(245, 158, 11, 0.1)" : "rgba(139, 92, 246, 0.1)",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    display: "inline-block"
                  }}>
                    {user.admin ? '👑 Administrator' : '📊 Sales Associate'}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: isMobile ? "1rem 0" : "2rem 0" }}>
                  <p style={{ fontSize: isMobile ? "1rem" : "1.1rem", marginBottom: "1rem", color: "#94a3b8" }}>
                    Welcome to PSA Sales Platform!
                  </p>
                  <button 
                    className="modern-btn-primary"
                    onClick={() => window.location.href = '/account'}
                    style={{ width: "100%" }}
                  >
                    🔐 Login to Continue
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Updates Card - Real User Statistics */}
          <div className="modern-dashboard-card" style={{
            minHeight: isMobile ? "200px" : "250px"
          }}>
            <div className="modern-card-header">
              <div className="modern-card-title">Your Statistics</div>
              <div className="modern-card-icon">📊</div>
            </div>
            <div className="modern-card-content">
              {user ? (
                userStats.loading ? (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8" }}>
                    Loading your statistics...
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", color: "#3b82f6", fontWeight: "800" }}>
                        {userStats.totalSchools}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        SCHOOLS ADDED
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", color: "#10b981", fontWeight: "800" }}>
                        {userStats.totalEmails}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        EMAILS SENT
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", color: "#f59e0b", fontWeight: "800" }}>
                        {userStats.pendingEmails}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        PENDING
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", color: "#8b5cf6", fontWeight: "800" }}>
                        {userStats.respondedEmails}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        RESPONDED
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8" }}>
                  <p style={{ marginBottom: "1rem" }}>Login to view your statistics</p>
                  <button 
                    className="modern-btn-primary"
                    onClick={() => window.location.href = '/account'}
                    style={{ width: "100%" }}
                  >
                    🔐 Login
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Map Card - Only show on desktop/tablet, hidden on mobile */}
          {!isMobile && (
            <div className="modern-dashboard-card" style={{
              minHeight: "250px"
            }}>
              <div className="modern-card-header">
                <div className="modern-card-title">Map</div>
                <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                  🗺️
                </div>
              </div>
              <div className="modern-card-content">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.8rem" }}>
                  {mapLocations.map((location, index) => (
                    <div key={index} style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      padding: "0.8rem",
                      borderRadius: "8px",
                      textAlign: "center"
                    }}>
                      <div style={{ fontWeight: "600", color: "#f1f5f9", fontSize: "0.9rem" }}>
                        {location.area}
                      </div>
                      <div style={{ color: "#10b981", fontWeight: "700", fontSize: "1.2rem" }}>
                        {location.schools}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                        schools
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  className="modern-btn-primary"
                  onClick={() => window.location.href = '/map'}
                  style={{ width: "100%", marginTop: "1rem", background: "#10b981" }}
                >
                  View Full Map →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Map Card - Show only on mobile after first row */}
        {isMobile && (
          <div style={{ marginBottom: "1rem" }}>
            <div className="modern-dashboard-card" style={{ minHeight: "200px" }}>
              <div className="modern-card-header">
                <div className="modern-card-title">Map</div>
                <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                  🗺️
                </div>
              </div>
              <div className="modern-card-content">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.8rem" }}>
                  {mapLocations.map((location, index) => (
                    <div key={index} style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      padding: "0.8rem",
                      borderRadius: "8px",
                      textAlign: "center"
                    }}>
                      <div style={{ fontWeight: "600", color: "#f1f5f9", fontSize: "0.9rem" }}>
                        {location.area}
                      </div>
                      <div style={{ color: "#10b981", fontWeight: "700", fontSize: "1.2rem" }}>
                        {location.schools}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                        schools
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  className="modern-btn-primary"
                  onClick={() => window.location.href = '/map'}
                  style={{ width: "100%", marginTop: "1rem", background: "#10b981" }}
                >
                  View Full Map →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Second Row - Email Status + Team (Equal Width) */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: getSecondRowColumns(),
          gap: isMobile ? "1rem" : "1.5rem",
          marginBottom: isMobile ? "1rem" : "2rem"
        }}>
          
          {/* Email Status Card - Recent Emails List */}
          <div className="modern-dashboard-card" style={{
            minHeight: isMobile ? "250px" : "300px"
          }}>
            <div className="modern-card-header">
              <div className="modern-card-title">Recent Emails</div>
              <div className="modern-card-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
                📧
              </div>
            </div>
            <div className="modern-card-content">
              {user ? (
                emailsLoading ? (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8" }}>
                    Loading recent emails...
                  </div>
                ) : recentEmails.length > 0 ? (
                  <>
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.5rem" }}>
                        Last {recentEmails.length} emails sent:
                      </div>
                      {recentEmails.map((email, index) => (
                        <div 
                          key={email.id} 
                          style={{ 
                            background: "rgba(59, 130, 246, 0.05)",
                            padding: "0.75rem",
                            borderRadius: "8px",
                            marginBottom: index < recentEmails.length - 1 ? "0.5rem" : "0",
                            border: "1px solid rgba(59, 130, 246, 0.1)"
                          }}
                        >
                          <div style={{ 
                            fontWeight: "600", 
                            color: "#f1f5f9", 
                            fontSize: "0.9rem",
                            marginBottom: "0.25rem"
                          }}>
                            {email.school_display_name}
                          </div>
                          <div style={{ 
                            fontSize: "0.8rem", 
                            color: "#94a3b8",
                            marginBottom: "0.25rem"
                          }}>
                            📧 {email.school_email}
                          </div>
                          <div style={{ 
                            fontSize: "0.8rem", 
                            color: "#94a3b8",
                            marginBottom: "0.25rem"
                          }}>
                            👤 {email.contact_name}
                          </div>
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            fontSize: "0.75rem"
                          }}>
                            <span style={{ color: "#64748b" }}>
                              📅 {new Date(email.sent_at).toLocaleDateString()}
                            </span>
                            <span style={{ 
                              color: email.responded ? "#10b981" : email.followup_sent ? "#f59e0b" : "#64748b",
                              fontWeight: "600",
                              background: email.responded 
                                ? "rgba(16, 185, 129, 0.2)" 
                                : email.followup_sent 
                                ? "rgba(245, 158, 11, 0.2)" 
                                : "rgba(100, 116, 139, 0.2)",
                              padding: "2px 6px",
                              borderRadius: "4px"
                            }}>
                              {email.responded 
                                ? "✅ Replied" 
                                : email.followup_sent 
                                ? "📧 Follow-up" 
                                : "⏳ Pending"
                              }
                            </span>
                          </div>
                        </div>
                      ))}

                      <div style={{ 
                        textAlign: "center", 
                        marginTop: "1rem", 
                        fontSize: "0.9rem", 
                        color: "#94a3b8" 
                      }}>
                        Showing last {recentEmails.length} emails. 
                        <span 
                          onClick={() => window.location.href = '/emails'} 
                          style={{ 
                            color: "#3b82f6", 
                            cursor: "pointer", 
                            textDecoration: "underline" 
                          }}
                        >
                          View all emails
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
                    <p style={{ marginBottom: "1rem" }}>No emails sent yet</p>
                    <button 
                      className="modern-btn-primary"
                      onClick={() => window.location.href = '/emails'}
                      style={{ width: "100%" }}
                    >
                      Send Your First Email →
                    </button>
                  </div>
                )
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8" }}>
                  <p style={{ marginBottom: "1rem" }}>Login to view your statistics</p>
                  <button 
                    className="modern-btn-primary"
                    onClick={() => window.location.href = '/account'}
                    style={{ width: "100%" }}
                  >
                    🔐 Login
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Team Card */}
          <div className="modern-dashboard-card" style={{
            minHeight: isMobile ? "250px" : "300px"
          }}>
            <div className="modern-card-header">
              <div className="modern-card-title">Team</div>
              <div className="modern-card-icon" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                👥
              </div>
            </div>
            <div className="modern-card-content">
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", 
                gap: "1rem" 
              }}>
                {teamData.map((member, index) => (
                  <div key={index} style={{
                    background: "rgba(59, 130, 246, 0.05)",
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(59, 130, 246, 0.1)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: "600", color: "#f1f5f9" }}>{member.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{member.role}</div>
                      </div>
                      <div style={{
                        width: "40px",
                        height: "40px",
                        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "700"
                      }}>
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                      <span>Schools: <strong style={{ color: "#3b82f6" }}>{member.schools}</strong></span>
                      <span>Emails: <strong style={{ color: "#10b981" }}>{member.emails}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                className="modern-btn-primary"
                onClick={() => window.location.href = '/team'}
                style={{ width: "100%", marginTop: "1rem", background: "#f59e0b" }}
              >
                View Team Analytics →
              </button>
            </div>
          </div>
        </div>

        {/* Welcome Message for New Users - Full Width */}
        {!user && (
          <div className="modern-dashboard-card">
            <div className="modern-card-header">
              <div className="modern-card-title">Getting Started</div>
              <div className="modern-card-icon">🚀</div>
            </div>
            <div className="modern-card-content">
              <p style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
                Welcome to the PSA Sales Management Platform! This powerful tool helps you:
              </p>
              <ul style={{ marginBottom: "1.5rem", paddingLeft: "1.5rem", color: "#94a3b8" }}>
                <li>Manage your school database and contacts</li>
                <li>Send and track email campaigns</li>
                <li>Discover new schools in your area</li>
                <li>Monitor your sales performance</li>
                <li>Visualize school locations on interactive maps</li>
              </ul>
              <button 
                className="modern-btn-primary"
                onClick={() => window.location.href = '/account'}
              >
                Create Account or Login →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}