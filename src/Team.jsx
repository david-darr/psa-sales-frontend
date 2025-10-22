import { useEffect, useState } from 'react'
import { useAuth } from "./AuthContext"
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

export default function Team() {
  const { user, accessToken } = useAuth()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Component state
  const [teamData, setTeamData] = useState([])
  const [myStats, setMyStats] = useState({
    totalSchools: 0,
    totalEmails: 0,
    pendingEmails: 0,
    respondedEmails: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

  // Load data when component mounts
  useEffect(() => {
    if (accessToken) {
      fetchData()
    }
  }, [accessToken])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch user's own statistics first
      const [schoolsResponse, emailsResponse] = await Promise.all([
        fetch("https://psa-sales-backend.onrender.com/api/my-schools", {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ])

      const schoolsData = await schoolsResponse.json()
      const emailsData = await emailsResponse.json()

      // Calculate user's statistics
      if (Array.isArray(schoolsData) && Array.isArray(emailsData)) {
        setMyStats({
          totalSchools: schoolsData.length,
          totalEmails: emailsData.length,
          pendingEmails: emailsData.filter(email => !email.responded && !email.followup_sent).length,
          respondedEmails: emailsData.filter(email => email.responded).length
        })
      }

      // Fetch all team data (regardless of admin status)
      try {
        const teamResponse = await fetch("https://psa-sales-backend.onrender.com/api/team-stats", {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        
        if (teamResponse.ok) {
          const teamStatsData = await teamResponse.json()
          if (Array.isArray(teamStatsData)) {
            // Mark current user and sort to put them first
            const sortedTeamData = teamStatsData
              .map(member => ({
                ...member,
                isCurrentUser: member.name === user.name
              }))
              .sort((a, b) => {
                // Current user first, then by total activity (schools + emails)
                if (a.isCurrentUser) return -1
                if (b.isCurrentUser) return 1
                return (b.totalSchools + b.totalEmails) - (a.totalSchools + a.totalEmails)
              })
            
            setTeamData(sortedTeamData)
          }
        } else {
          // Fallback to old method if new endpoint doesn't exist yet
          console.log('Team stats endpoint not available, using fallback method')
          
          // Get all schools and emails to build team stats
          const [allSchoolsResponse, allEmailsResponse] = await Promise.all([
            fetch("https://psa-sales-backend.onrender.com/api/all-schools", {
              headers: { Authorization: `Bearer ${accessToken}` }
            }),
            fetch("https://psa-sales-backend.onrender.com/api/all-emails", {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
          ])

          if (allSchoolsResponse.ok && allEmailsResponse.ok) {
            const allSchools = await allSchoolsResponse.json()
            const allEmails = await allEmailsResponse.json()
            
            // Build team stats from all data
            const userStats = {}
            
            // Count schools per user
            if (Array.isArray(allSchools)) {
              allSchools.forEach(school => {
                if (school.user_name) {
                  if (!userStats[school.user_name]) {
                    userStats[school.user_name] = {
                      name: school.user_name,
                      email: school.user_email || 'Not available',
                      phone: school.user_phone || 'Not available',
                      totalSchools: 0,
                      totalEmails: 0
                    }
                  }
                  userStats[school.user_name].totalSchools++
                }
              })
            }
            
            // Count emails per user
            if (Array.isArray(allEmails)) {
              allEmails.forEach(email => {
                if (email.user_name) {
                  if (!userStats[email.user_name]) {
                    userStats[email.user_name] = {
                      name: email.user_name,
                      email: email.user_email || 'Not available',
                      phone: email.user_phone || 'Not available',
                      totalSchools: 0,
                      totalEmails: 0
                    }
                  }
                  userStats[email.user_name].totalEmails++
                }
              })
            }
            
            // Convert to array and add role information
            const teamArray = Object.values(userStats).map(member => ({
              ...member,
              role: member.name === user.name && user.admin ? 'Administrator' : 'Sales Associate',
              isCurrentUser: member.name === user.name
            })).sort((a, b) => {
              if (a.isCurrentUser) return -1
              if (b.isCurrentUser) return 1
              return (b.totalSchools + b.totalEmails) - (a.totalSchools + a.totalEmails)
            })
            
            setTeamData(teamArray)
          } else {
            // Final fallback - show only current user
            setTeamData([{
              name: user.name,
              email: user.email,
              phone: user.phone || 'Not provided',
              role: user.admin ? 'Administrator' : 'Sales Associate',
              totalSchools: myStats.totalSchools,
              totalEmails: myStats.totalEmails,
              isCurrentUser: true
            }])
          }
        }
      } catch (teamError) {
        console.error('Error fetching team data:', teamError)
        // Show only current user if team data fails
        setTeamData([{
          name: user.name,
          email: user.email,
          phone: user.phone || 'Not provided',
          role: user.admin ? 'Administrator' : 'Sales Associate',
          totalSchools: myStats.totalSchools,
          totalEmails: myStats.totalEmails,
          isCurrentUser: true
        }])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // Calculate team totals
  const teamTotals = teamData.reduce(
    (totals, member) => ({
      totalSchools: totals.totalSchools + member.totalSchools,
      totalEmails: totals.totalEmails + member.totalEmails
    }),
    { totalSchools: 0, totalEmails: 0 }
  )

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
            TEAM DIRECTORY
          </h1>
          <p className="modern-page-subtitle" style={{
            textAlign: "left"
          }}>
            {user ? `Welcome, ${user.name}! ` : ''}
            Team Member Contact Information & Performance Statistics
          </p>
        </div>

        {user ? (
          <>
            {/* Statistics Row - Your Performance */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "1fr 1fr 1fr" : "repeat(4, 1fr)",
              gap: isMobile ? "0.75rem" : "1rem",
              marginBottom: isMobile ? "1rem" : "2rem"
            }}>
              {/* Your Schools */}
              <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
                <div className="modern-card-header">
                  <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Your Schools</div>
                  <div className="modern-card-icon" style={{ 
                    background: "rgba(59, 130, 246, 0.2)", 
                    color: "#3b82f6",
                    width: "30px",
                    height: "30px",
                    fontSize: "1rem"
                  }}>
                    🏫
                  </div>
                </div>
                <div className="modern-card-content" style={{ textAlign: "center" }}>
                  <div style={{ 
                    fontSize: isMobile ? "1.5rem" : "2rem", 
                    fontWeight: "800", 
                    color: "#3b82f6",
                    marginBottom: "0.25rem"
                  }}>
                    {myStats.totalSchools}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                    Schools Added
                  </div>
                </div>
              </div>

              {/* Your Emails */}
              <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
                <div className="modern-card-header">
                  <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Your Emails</div>
                  <div className="modern-card-icon" style={{ 
                    background: "rgba(16, 185, 129, 0.2)", 
                    color: "#10b981",
                    width: "30px",
                    height: "30px",
                    fontSize: "1rem"
                  }}>
                    📧
                  </div>
                </div>
                <div className="modern-card-content" style={{ textAlign: "center" }}>
                  <div style={{ 
                    fontSize: isMobile ? "1.5rem" : "2rem", 
                    fontWeight: "800", 
                    color: "#10b981",
                    marginBottom: "0.25rem"
                  }}>
                    {myStats.totalEmails}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                    Emails Sent
                  </div>
                </div>
              </div>

              {/* Pending Responses */}
              <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
                <div className="modern-card-header">
                  <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Pending</div>
                  <div className="modern-card-icon" style={{ 
                    background: "rgba(245, 158, 11, 0.2)", 
                    color: "#f59e0b",
                    width: "30px",
                    height: "30px",
                    fontSize: "1rem"
                  }}>
                    ⏳
                  </div>
                </div>
                <div className="modern-card-content" style={{ textAlign: "center" }}>
                  <div style={{ 
                    fontSize: isMobile ? "1.5rem" : "2rem", 
                    fontWeight: "800", 
                    color: "#f59e0b",
                    marginBottom: "0.25rem"
                  }}>
                    {myStats.pendingEmails}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                    Pending
                  </div>
                </div>
              </div>

              {/* Responses Received */}
              <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
                <div className="modern-card-header">
                  <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Responses</div>
                  <div className="modern-card-icon" style={{ 
                    background: "rgba(139, 92, 246, 0.2)", 
                    color: "#8b5cf6",
                    width: "30px",
                    height: "30px",
                    fontSize: "1rem"
                  }}>
                    ✅
                  </div>
                </div>
                <div className="modern-card-content" style={{ textAlign: "center" }}>
                  <div style={{ 
                    fontSize: isMobile ? "1.5rem" : "2rem", 
                    fontWeight: "800", 
                    color: "#8b5cf6",
                    marginBottom: "0.25rem"
                  }}>
                    {myStats.respondedEmails}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                    Responded
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members Card */}
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">
                  Team Directory ({teamData.length} members)
                </div>
                <div className="modern-card-icon" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                  👥
                </div>
              </div>
              <div className="modern-card-content">
                {loading ? (
                  <div style={{ 
                    textAlign: "center", 
                    padding: "3rem 2rem",
                    color: "#94a3b8"
                  }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
                    <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem" }}>Loading Team Data...</h3>
                    <p>Fetching the latest team information and statistics.</p>
                  </div>
                ) : teamData.length === 0 ? (
                  <div style={{ 
                    textAlign: "center", 
                    padding: "3rem 2rem",
                    color: "#94a3b8"
                  }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥</div>
                    <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem" }}>No Team Data Available</h3>
                    <p style={{ marginBottom: "1.5rem" }}>
                      Unable to load team information at this time.
                    </p>
                    <button 
                      className="modern-btn-primary"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Data"}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Team Summary */}
                    {teamData.length > 1 && (
                      <div style={{ 
                        marginBottom: "2rem",
                        padding: "1.5rem",
                        background: "rgba(59, 130, 246, 0.1)",
                        borderRadius: "12px",
                        border: "1px solid rgba(59, 130, 246, 0.2)"
                      }}>
                        <h4 style={{ 
                          color: "#3b82f6", 
                          marginBottom: "1rem",
                          fontSize: "1.1rem",
                          fontWeight: "600"
                        }}>
                          📊 Team Performance Summary
                        </h4>
                        <div style={{ 
                          display: "grid", 
                          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
                          gap: "1rem"
                        }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ 
                              fontSize: isMobile ? "1.5rem" : "2rem", 
                              fontWeight: "800", 
                              color: "#3b82f6",
                              marginBottom: "0.25rem"
                            }}>
                              {teamTotals.totalSchools}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase" }}>
                              Total Schools
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ 
                              fontSize: isMobile ? "1.5rem" : "2rem", 
                              fontWeight: "800", 
                              color: "#10b981",
                              marginBottom: "0.25rem"
                            }}>
                              {teamTotals.totalEmails}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase" }}>
                              Total Emails
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ 
                              fontSize: isMobile ? "1.5rem" : "2rem", 
                              fontWeight: "800", 
                              color: "#f59e0b",
                              marginBottom: "0.25rem"
                            }}>
                              {teamData.length}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase" }}>
                              Team Members
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ 
                              fontSize: isMobile ? "1.5rem" : "2rem", 
                              fontWeight: "800", 
                              color: "#8b5cf6",
                              marginBottom: "0.25rem"
                            }}>
                              {teamTotals.totalSchools > 0 ? Math.round((teamTotals.totalEmails / teamTotals.totalSchools) * 100) / 100 : 0}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase" }}>
                              Emails per School
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Refresh Button */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      marginBottom: "1.5rem" 
                    }}>
                      <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                        Complete team directory with contact information and performance data
                      </div>
                      <button
                        className="modern-btn-primary"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.85rem",
                          background: "#f59e0b",
                          opacity: refreshing ? 0.6 : 1,
                          cursor: refreshing ? "not-allowed" : "pointer"
                        }}
                      >
                        {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Data"}
                      </button>
                    </div>

                    {/* Team Members Grid */}
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(2, 1fr)",
                      gap: "1rem"
                    }}>
                      {teamData.map((member, index) => (
                        <div 
                          key={index} 
                          style={{
                            background: member.isCurrentUser 
                              ? "rgba(59, 130, 246, 0.1)" 
                              : "rgba(51, 65, 85, 0.3)",
                            border: member.isCurrentUser 
                              ? "1px solid rgba(59, 130, 246, 0.3)" 
                              : "1px solid rgba(71, 85, 105, 0.3)",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div style={{ 
                            display: "flex", 
                            alignItems: "flex-start", 
                            gap: "1rem",
                            marginBottom: "1rem"
                          }}>
                            <div style={{
                              width: "50px",
                              height: "50px",
                              background: member.isCurrentUser 
                                ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                                : "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                              borderRadius: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontWeight: "700",
                              fontSize: "1.2rem",
                              flexShrink: 0
                            }}>
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontWeight: "700", 
                                color: "#f1f5f9", 
                                fontSize: "1.1rem",
                                marginBottom: "0.25rem"
                              }}>
                                {member.name}
                                {member.isCurrentUser && (
                                  <span style={{
                                    marginLeft: "0.5rem",
                                    fontSize: "0.75rem",
                                    background: "rgba(59, 130, 246, 0.2)",
                                    color: "#3b82f6",
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "4px",
                                    fontWeight: "600"
                                  }}>
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div style={{ 
                                fontSize: "0.85rem", 
                                color: (member.role === 'Administrator' || member.name === user.name && user.admin) ? "#f59e0b" : "#64748b",
                                fontWeight: "600",
                                marginBottom: "0.5rem"
                              }}>
                                {(member.role === 'Administrator' || member.name === user.name && user.admin) ? '👑 ' : '📊 '}{member.role || (member.name === user.name && user.admin ? 'Administrator' : 'Sales Associate')}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginBottom: "1rem" }}>
                            <div style={{ 
                              fontSize: "0.85rem", 
                              color: "#94a3b8",
                              marginBottom: "0.25rem"
                            }}>
                              📧 {member.email}
                            </div>
                            <div style={{ 
                              fontSize: "0.85rem", 
                              color: "#94a3b8"
                            }}>
                              📞 {member.phone}
                            </div>
                          </div>

                          <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "1fr 1fr", 
                            gap: "1rem",
                            marginTop: "1rem"
                          }}>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ 
                                fontSize: "1.5rem", 
                                fontWeight: "800", 
                                color: "#3b82f6",
                                marginBottom: "0.25rem"
                              }}>
                                {member.totalSchools}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>
                                Schools
                              </div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ 
                                fontSize: "1.5rem", 
                                fontWeight: "800", 
                                color: "#10b981",
                                marginBottom: "0.25rem"
                              }}>
                                {member.totalEmails}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>
                                Emails
                              </div>
                            </div>
                          </div>

                          {/* Performance Badge */}
                          <div style={{ 
                            marginTop: "1rem",
                            textAlign: "center"
                          }}>
                            <span style={{
                              background: member.totalEmails > 20 
                                ? "rgba(16, 185, 129, 0.2)" 
                                : member.totalEmails > 10 
                                ? "rgba(245, 158, 11, 0.2)" 
                                : "rgba(100, 116, 139, 0.2)",
                              color: member.totalEmails > 20 
                                ? "#10b981" 
                                : member.totalEmails > 10 
                                ? "#f59e0b" 
                                : "#64748b",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              fontWeight: "600"
                            }}>
                              {member.totalEmails > 20 
                                ? "🌟 High Performer" 
                                : member.totalEmails > 10 
                                ? "🚀 Active" 
                                : member.totalEmails > 0 
                                ? "📈 Getting Started" 
                                : "💤 Inactive"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="modern-dashboard-card">
            <div className="modern-card-content" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔐</div>
              <h2 style={{ color: "#f1f5f9", marginBottom: "1rem" }}>Authentication Required</h2>
              <p style={{ color: "#94a3b8", marginBottom: "2rem", fontSize: "1.1rem" }}>
                Please log in to access the Team Directory and view team member information.
              </p>
              <button 
                className="modern-btn-primary"
                onClick={() => window.location.href = '/account'}
                style={{ fontSize: "1rem", padding: "1rem 2rem" }}
              >
                🔐 Login to Continue
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}