import { useState, useEffect } from 'react'
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

export default function Emails() {
  const { user, accessToken } = useAuth()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Component state
  const [mySchools, setMySchools] = useState([])
  const [selectedSchools, setSelectedSchools] = useState([])
  const [selectedEmailsToDelete, setSelectedEmailsToDelete] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [emailStatuses, setEmailStatuses] = useState([])
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [newSchool, setNewSchool] = useState({
    school_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    school_type: "preschool"
  })

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

  // Load user's schools
  useEffect(() => {
    if (accessToken) {
      fetchMySchools()
    }
  }, [accessToken])

  // Load sent emails
  useEffect(() => {
    if (accessToken) {
      fetchEmailStatuses()
    }
  }, [accessToken])

  const fetchMySchools = () => {
    fetch("https://psa-sales-backend.onrender.com/api/my-schools", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(setMySchools)
  }

  const fetchEmailStatuses = () => {
    fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(setEmailStatuses)
  }

  const handleSchoolSelect = (schoolId) => {
    setSelectedSchools(schools =>
      schools.includes(schoolId) 
        ? schools.filter(id => id !== schoolId) 
        : [...schools, schoolId]
    )
  }

  const handleEmailSelectToDelete = (emailId) => {
    setSelectedEmailsToDelete(emails =>
      emails.includes(emailId)
        ? emails.filter(id => id !== emailId)
        : [...emails, emailId]
    )
  }

  const handleSelectAllSchools = () => {
    if (selectedSchools.length === mySchools.length) {
      setSelectedSchools([])
    } else {
      setSelectedSchools(mySchools.map(school => school.id))
    }
  }

  const handleSelectAllEmails = () => {
    if (selectedEmailsToDelete.length === emailStatuses.length) {
      setSelectedEmailsToDelete([])
    } else {
      setSelectedEmailsToDelete(emailStatuses.map(email => email.id))
    }
  }

  const handleAddSchool = async (e) => {
    e.preventDefault()
    const res = await fetch("https://psa-sales-backend.onrender.com/api/add-school", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(newSchool)
    })
    const data = await res.json()
    if (data.message) {
      fetchMySchools()
      setNewSchool({ 
        school_name: "", 
        contact_name: "", 
        email: "", 
        phone: "", 
        address: "",
        school_type: "preschool"
      })
      setShowAddSchool(false)
      setStatus("School added successfully!")
      setTimeout(() => setStatus(""), 3000)
    } else {
      setStatus(data.error || "Failed to add school")
      setTimeout(() => setStatus(""), 3000)
    }
  }

  const handleSendEmails = async (e) => {
    e.preventDefault()
    setStatus("")
    setLoading(true)
    
    const res = await fetch("https://psa-sales-backend.onrender.com/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        school_ids: selectedSchools,
        subject: "Let's Connect! PSA Programs"
      })
    })
    const data = await res.json()
    
    if (data.sent_count > 0) {
      setStatus(`${data.sent_count} email${data.sent_count === 1 ? "" : "s"} sent!`)
      setSelectedSchools([])
      fetchEmailStatuses()
      fetchMySchools()
    } else {
      setStatus(data.error || "Failed to send emails")
    }
    setLoading(false)
    setTimeout(() => setStatus(""), 5000)
  }

  const handleDeleteSelectedEmails = async () => {
    if (selectedEmailsToDelete.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedEmailsToDelete.length} email record${selectedEmailsToDelete.length === 1 ? '' : 's'}?`)) {
      return
    }

    setLoading(true)
    let deletedCount = 0
    let errors = []

    for (const emailId of selectedEmailsToDelete) {
      try {
        const res = await fetch("https://psa-sales-backend.onrender.com/api/delete-sent-email", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({ email_id: emailId })
        })

        if (res.ok) {
          deletedCount++
        } else {
          const data = await res.json()
          errors.push(data.error || "Failed to delete")
        }
      } catch (error) {
        errors.push("Network error")
      }
    }

    setSelectedEmailsToDelete([])
    fetchEmailStatuses()
    
    if (deletedCount > 0) {
      setStatus(`${deletedCount} email record${deletedCount === 1 ? '' : 's'} deleted successfully!`)
    }
    if (errors.length > 0) {
      setStatus(prev => prev + ` ${errors.length} failed to delete.`)
    }
    
    setLoading(false)
    setTimeout(() => setStatus(""), 5000)
  }

  const handleCheckEmailReplies = async () => {
    setLoading(true)
    setStatus("Checking for email replies...")
    
    try {
      const res = await fetch("https://psa-sales-backend.onrender.com/api/check-email-replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        }
      })
      
      const data = await res.json()
      
      if (data.status) {
        setStatus("Email reply check completed! Refreshing email statuses...")
        fetchEmailStatuses()
      } else {
        setStatus(data.error || "Failed to check email replies")
      }
    } catch (error) {
      setStatus("Error checking email replies")
    }
    
    setLoading(false)
    setTimeout(() => setStatus(""), 5000)
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
            EMAIL CENTER
          </h1>
          <p className="modern-page-subtitle" style={{
            textAlign: "left"
          }}>
            Manage School Communications & Email Campaigns
          </p>
        </div>

        {user ? (
          <>
            {/* Status Message */}
            {status && (
              <div className="modern-dashboard-card" style={{ 
                marginBottom: isMobile ? "1rem" : "2rem",
                borderLeft: status.includes("success") || status.includes("sent") || status.includes("deleted") ? "4px solid #10b981" : "4px solid #ef4444"
              }}>
                <div className="modern-card-content" style={{ 
                  color: status.includes("success") || status.includes("sent") || status.includes("deleted") ? "#10b981" : "#ef4444",
                  fontWeight: "600",
                  textAlign: "center"
                }}>
                  {status}
                </div>
              </div>
            )}

            {/* Add School Card */}
            <div className="modern-dashboard-card" style={{ marginBottom: isMobile ? "1rem" : "2rem" }}>
              <div className="modern-card-header">
                <div className="modern-card-title">Add New School</div>
                <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                  🏫
                </div>
              </div>
              <div className="modern-card-content">
                <button
                  className="modern-btn-primary"
                  onClick={() => setShowAddSchool(!showAddSchool)}
                  style={{ 
                    width: "100%",
                    marginBottom: showAddSchool ? "1.5rem" : "0",
                    background: showAddSchool ? "#ef4444" : "#10b981"
                  }}
                >
                  {showAddSchool ? "❌ Cancel" : "➕ Add New School"}
                </button>
                
                {showAddSchool && (
                  <form onSubmit={handleAddSchool}>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <input
                        placeholder="School Name *"
                        value={newSchool.school_name}
                        onChange={(e) => setNewSchool({...newSchool, school_name: e.target.value})}
                        required
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                      <input
                        placeholder="Contact Name"
                        value={newSchool.contact_name}
                        onChange={(e) => setNewSchool({...newSchool, contact_name: e.target.value})}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                      <input
                        type="email"
                        placeholder="Email *"
                        value={newSchool.email}
                        onChange={(e) => setNewSchool({...newSchool, email: e.target.value})}
                        required
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                      <input
                        placeholder="Phone"
                        value={newSchool.phone}
                        onChange={(e) => setNewSchool({...newSchool, phone: e.target.value})}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                    </div>
                    
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <input
                        placeholder="Address"
                        value={newSchool.address}
                        onChange={(e) => setNewSchool({...newSchool, address: e.target.value})}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                      <select
                        value={newSchool.school_type}
                        onChange={(e) => setNewSchool({...newSchool, school_type: e.target.value})}
                        style={{ 
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      >
                        <option value="preschool">🧸 Preschool</option>
                        <option value="elementary">🎒 Elementary School</option>
                      </select>
                    </div>
                    
                    <button 
                      type="submit" 
                      className="modern-btn-primary"
                      style={{ width: "100%", background: "#10b981" }}
                    >
                      ✅ Add School
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Schools Selection Card */}
            <div className="modern-dashboard-card" style={{ marginBottom: isMobile ? "1rem" : "2rem" }}>
              <div className="modern-card-header">
                <div className="modern-card-title">Select Schools to Email ({selectedSchools.length} selected)</div>
                <div className="modern-card-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
                  📧
                </div>
              </div>
              <div className="modern-card-content">
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: "1rem" 
                }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                    {mySchools.length} schools available
                  </div>
                  <button
                    className="modern-btn-primary"
                    onClick={handleSelectAllSchools}
                    style={{ 
                      padding: "0.5rem 1rem", 
                      fontSize: "0.85rem",
                      background: selectedSchools.length === mySchools.length ? "#ef4444" : "#3b82f6"
                    }}
                  >
                    {selectedSchools.length === mySchools.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                
                <div style={{ 
                  maxHeight: "400px", 
                  overflowY: "auto",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                  marginBottom: "1rem"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#475569", position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", width: "50px" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Select</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>School</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Type</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Contact</span>
                        </th>
                        {!isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Email</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Status</span>
                        </th>
                        {user.admin && !isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Added By</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {mySchools.map((school, index) => (
                        <tr 
                          key={school.id}
                          style={{ 
                            background: index % 2 === 0 ? "rgba(51, 65, 85, 0.3)" : "rgba(30, 41, 59, 0.3)",
                            borderBottom: "1px solid #475569"
                          }}
                        >
                          <td style={{ padding: "0.75rem" }}>
                            <input
                              type="checkbox"
                              checked={selectedSchools.includes(school.id)}
                              onChange={() => handleSchoolSelect(school.id)}
                              style={{ accentColor: "#3b82f6" }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ color: "#f1f5f9", fontWeight: "500", fontSize: "0.9rem" }}>
                              {school.school_name}
                            </div>
                            {isMobile && (
                              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                📧 {school.email}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <span style={{
                              background: school.school_type === 'preschool' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                              color: school.school_type === 'preschool' ? '#3b82f6' : '#8b5cf6',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}>
                              {school.school_type === 'preschool' ? 
                                '🧸 Preschool (3 PDFs: Flyers + Recommendation)' : 
                                '🎒 Elementary (2 PDFs: Program Info + Recommendation)'
                              }
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem", color: "#e2e8f0", fontSize: "0.9rem" }}>
                            {school.contact_name || "—"}
                          </td>
                          {!isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {school.email}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem" }}>
                            <span style={{
                              background: school.status === 'contacted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                              color: school.status === 'contacted' ? '#10b981' : '#64748b',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}>
                              {school.status === 'contacted' ? '✅ Contacted' : '⏳ Pending'}
                            </span>
                          </td>
                          {user.admin && !isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {school.user_name || "Unknown"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {mySchools.length === 0 && (
                    <div style={{ 
                      textAlign: "center", 
                      padding: "2rem", 
                      color: "#64748b",
                      fontSize: "0.9rem"
                    }}>
                      No schools added yet. Add some schools to get started!
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSendEmails}
                  className="modern-btn-primary"
                  style={{ 
                    width: "100%",
                    opacity: selectedSchools.length === 0 || loading ? 0.6 : 1,
                    cursor: selectedSchools.length === 0 || loading ? "not-allowed" : "pointer",
                    background: "#3b82f6"
                  }}
                  disabled={selectedSchools.length === 0 || loading}
                >
                  {loading ? 
                    "📧 Sending..." : 
                    `📧 Send Email to ${selectedSchools.length} School${selectedSchools.length === 1 ? "" : "s"}`
                  }
                </button>
              </div>
            </div>

            {/* Email History Card */}
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">Email History ({emailStatuses.length} emails sent)</div>
                <div className="modern-card-icon" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                  📋
                </div>
              </div>
              <div className="modern-card-content">
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.5rem"
                }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                    Manage your sent emails and track responses
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      className="modern-btn-primary"
                      onClick={handleSelectAllEmails}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        fontSize: "0.85rem",
                        background: selectedEmailsToDelete.length === emailStatuses.length ? "#ef4444" : "#64748b"
                      }}
                    >
                      {selectedEmailsToDelete.length === emailStatuses.length ? "Deselect All" : "Select All"}
                    </button>
                    <button
                      className="modern-btn-primary"
                      onClick={handleCheckEmailReplies}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        fontSize: "0.85rem",
                        background: "#3b82f6"
                      }}
                      disabled={loading}
                    >
                      {loading ? "🔄 Checking..." : "🔄 Check Replies"}
                    </button>
                    {selectedEmailsToDelete.length > 0 && (
                      <button
                        className="modern-btn-primary"
                        onClick={handleDeleteSelectedEmails}
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.85rem",
                          background: "#ef4444"
                        }}
                        disabled={loading}
                      >
                        {loading ? "🗑️ Deleting..." : `🗑️ Delete ${selectedEmailsToDelete.length}`}
                      </button>
                    )}
                  </div>
                </div>
                
                <div style={{ 
                  maxHeight: "500px", 
                  overflowY: "auto",
                  border: "1px solid #475569",
                  borderRadius: "8px"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#475569", position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", width: "50px" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Select</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>School</span>
                        </th>
                        {!isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Email</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Date</span>
                        </th>
                        {user.admin && !isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>User</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Status</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailStatuses.map((email, index) => (
                        <tr 
                          key={email.id}
                          style={{ 
                            background: index % 2 === 0 ? "rgba(51, 65, 85, 0.3)" : "rgba(30, 41, 59, 0.3)",
                            borderBottom: "1px solid #475569"
                          }}
                        >
                          <td style={{ padding: "0.75rem" }}>
                            <input
                              type="checkbox"
                              checked={selectedEmailsToDelete.includes(email.id)}
                              onChange={() => handleEmailSelectToDelete(email.id)}
                              style={{ accentColor: "#ef4444" }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ color: "#f1f5f9", fontWeight: "500", fontSize: "0.9rem" }}>
                              {email.school_name}
                            </div>
                            {isMobile && (
                              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                📧 {email.school_email}
                              </div>
                            )}
                          </td>
                          {!isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {email.school_email}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem", color: "#e2e8f0", fontSize: "0.85rem" }}>
                            {new Date(email.sent_at).toLocaleDateString()}
                          </td>
                          {user.admin && !isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {email.user_name || "Unknown"}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem" }}>
                            <span style={{
                              background: email.responded ? 'rgba(16, 185, 129, 0.2)' : email.followup_sent ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                              color: email.responded ? '#10b981' : email.followup_sent ? '#f59e0b' : '#64748b',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}>
                              {email.responded
                                ? "✅ Responded"
                                : email.followup_sent
                                ? "📧 Follow-Up Sent"
                                : "⏳ Pending"}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              {!email.responded && !email.followup_sent && (
                                <button
                                  className="modern-btn-primary"
                                  style={{ 
                                    padding: "0.35rem 0.75rem", 
                                    fontSize: "0.8rem",
                                    background: "#f59e0b"
                                  }}
                                  onClick={async () => {
                                    const res = await fetch("https://psa-sales-backend.onrender.com/api/send-followup", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${accessToken}`
                                      },
                                      body: JSON.stringify({ email_id: email.id })
                                    })
                                    const data = await res.json()
                                    if (data.status === "follow-up sent") {
                                      fetchEmailStatuses()
                                    } else {
                                      alert(data.error || "Failed to send follow-up")
                                    }
                                  }}
                                >
                                  Follow-Up
                                </button>
                              )}
                              {!email.responded && (
                                <button
                                  className="modern-btn-primary"
                                  style={{ 
                                    padding: "0.35rem 0.75rem", 
                                    fontSize: "0.8rem",
                                    background: "#10b981"
                                  }}
                                  onClick={async () => {
                                    const res = await fetch("https://psa-sales-backend.onrender.com/api/mark-responded", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${accessToken}`
                                      },
                                      body: JSON.stringify({ email_id: email.id, responded: true })
                                    })
                                    if (res.ok) {
                                      fetchEmailStatuses()
                                    }
                                  }}
                                >
                                  Mark Replied
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {emailStatuses.length === 0 && (
                    <div style={{ 
                      textAlign: "center", 
                      padding: "3rem 2rem",
                      color: "#64748b"
                    }}>
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
                      <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem", fontSize: "1.2rem" }}>No Emails Sent Yet</h3>
                      <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                        Start by adding schools and sending your first email campaign!
                      </p>
                      <button 
                        className="modern-btn-primary"
                        onClick={() => setShowAddSchool(true)}
                        style={{ background: "#10b981" }}
                      >
                        🏫 Add Your First School
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="modern-dashboard-card">
            <div className="modern-card-content" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔐</div>
              <h2 style={{ color: "#f1f5f9", marginBottom: "1rem" }}>Authentication Required</h2>
              <p style={{ color: "#94a3b8", marginBottom: "2rem", fontSize: "1.1rem" }}>
                Please log in to access the Email Center and manage your school communications.
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