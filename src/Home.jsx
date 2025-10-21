import { useState, useEffect } from 'react'
import { useAuth } from "./AuthContext"
import NavigationCard from './NavigationCard'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function Home() {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  // Get current date for welcome message
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Sample data for the cards
  const updates = [
    "New schools added to database",
    "Email campaign performance improved", 
    "Route optimization updates",
    "User interface enhancements"
  ]

  const emailStats = {
    sent: 156,
    contactEmails: 89,
    sentThisWeek: 23,
    responseRate: "34%",
    status: "Active"
  }

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

  return (
    <div className="dashboard-container">
      <NavigationCard />
      
      <main className="modern-main-content">
        {/* Header Section */}
        <div className="modern-page-header">
          <h1 className="modern-page-title">
            HOME
          </h1>
          <p className="modern-page-subtitle">
            {currentDate} |
          </p>
        </div>

        {/* Custom Grid Layout - Row 1: Welcome + Updates + Map */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", 
          gap: "1.5rem",
          marginBottom: "2rem"
        }}>
          
          {/* Welcome Card */}
          <div className="modern-dashboard-card">
            <div className="modern-card-header">
              <div className="modern-card-title">Welcome{user ? `, ${user.name}!` : '!'}</div>
              <div className="modern-card-icon">👋</div>
            </div>
            <div className="modern-card-content">
              {user ? (
                <>
                  <div style={{ display: "grid", gap: "0.8rem", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Name:</span>
                      <span style={{ fontWeight: "600", color: "#3b82f6" }}>{user.name}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Email:</span>
                      <span style={{ fontWeight: "600", color: "#10b981" }}>{user.email}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Role:</span>
                      <span style={{ 
                        fontWeight: "600", 
                        color: user.admin ? "#f59e0b" : "#8b5cf6",
                        background: user.admin ? "rgba(245, 158, 11, 0.1)" : "rgba(139, 92, 246, 0.1)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.8rem"
                      }}>
                        {user.admin ? '👑 Administrator' : '📊 Sales Associate'}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Today:</span>
                      <span style={{ fontWeight: "600", color: "#64748b" }}>{currentDate}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <p style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#94a3b8" }}>
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
              
              {user && (
                <div>
                  <h4 style={{ color: "#f1f5f9", marginBottom: "0.5rem", borderTop: "1px solid #334155", paddingTop: "1rem" }}>
                    Recent Updates:
                  </h4>
                  <ul style={{ paddingLeft: "1.2rem", color: "#94a3b8", lineHeight: "1.6" }}>
                    {updates.map((update, index) => (
                      <li key={index}>{update}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Updates Card */}
          <div className="modern-dashboard-card">
            <div className="modern-card-header">
              <div className="modern-card-title">Updates</div>
              <div className="modern-card-icon">📋</div>
            </div>
            <div className="modern-card-content">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", color: "#3b82f6", fontWeight: "800" }}>
                    60+
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    SCHOOLS
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", color: "#10b981", fontWeight: "800" }}>
                    156
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    EMAILS SENT
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", color: "#f59e0b", fontWeight: "800" }}>
                    4
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    PROGRAMS
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", color: "#8b5cf6", fontWeight: "800" }}>
                    3
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    AREAS
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Card */}
          <div className="modern-dashboard-card">
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

        {/* Custom Grid Layout - Row 2: Email Status + Team (EQUAL WIDTH) */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", // Changed from "1fr 2fr" to "1fr 1fr"
          gap: "1.5rem",
          marginBottom: "2rem"
        }}>
          
          {/* Email Status Card - Now takes equal space */}
          <div className="modern-dashboard-card">
            <div className="modern-card-header">
              <div className="modern-card-title">Email Status</div>
              <div className="modern-card-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
                📧
              </div>
            </div>
            <div className="modern-card-content">
              <div style={{ display: "grid", gap: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Sent & Emails:</span>
                  <span style={{ color: "#3b82f6", fontWeight: "600" }}>{emailStats.sent}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Contact Emails:</span>
                  <span style={{ color: "#10b981", fontWeight: "600" }}>{emailStats.contactEmails}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Sent This Week:</span>
                  <span style={{ color: "#f59e0b", fontWeight: "600" }}>{emailStats.sentThisWeek}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Response Rate:</span>
                  <span style={{ color: "#8b5cf6", fontWeight: "600" }}>{emailStats.responseRate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Status:</span>
                  <span style={{ 
                    color: "#10b981", 
                    fontWeight: "600",
                    background: "rgba(16, 185, 129, 0.2)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.8rem"
                  }}>
                    {emailStats.status}
                  </span>
                </div>
              </div>
              <button 
                className="modern-btn-primary"
                onClick={() => window.location.href = '/emails'}
                style={{ width: "100%", marginTop: "1rem" }}
              >
                Manage Emails →
              </button>
            </div>
          </div>

          {/* Team Card - Now takes equal space (changed from 2 columns to 1 column) */}
          <div className="modern-dashboard-card">
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