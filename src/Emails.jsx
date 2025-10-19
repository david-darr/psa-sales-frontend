import { useState, useEffect } from 'react'
import { useAuth } from "./AuthContext"
import { useNavigate } from "react-router-dom"

const buttons = [
  { label: "Home +", path: "/" },
  { label: "Map +", path: "/map" },
  { label: "Schools List +", path: "/schools" },
  { label: "School Finder +", path: "/finder" },
  { label: "Team +", path: "/team" },
  { label: "Account +", path: "/account" }
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 770)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 770)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(window.innerWidth <= 1285)
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 1285)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isNarrow
}

export default function Emails() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const [mySchools, setMySchools] = useState([])
  const [selectedSchools, setSelectedSchools] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [emailStatuses, setEmailStatuses] = useState([])
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [newSchool, setNewSchool] = useState({
    school_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: ""
  })
  const isMobile = useIsMobile()
  const isNarrow = useIsNarrow()
  const [menuOpen, setMenuOpen] = useState(false)

  const images = [
    "/psa pics/bg1.jpg",
    "/psa pics/bg2.jpg",
    "/psa pics/bg3.jpg",
    "/psa pics/bg4.jpg",
    "/psa pics/bg5.jpg"
  ]
  const [bgIndex, setBgIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(i => (i + 1) % images.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [images.length])

  // Load user's schools
  useEffect(() => {
    if (accessToken) {
      fetch("https://psa-sales-backend.onrender.com/api/my-schools", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(setMySchools)
    }
  }, [accessToken])

  // Load sent emails
  useEffect(() => {
    if (accessToken) {
      fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(setEmailStatuses)
    }
  }, [accessToken])

  // Dropdown menu overlay (like SchoolFinder)
  const DropdownMenu = () => (
    <div style={{
      position: isMobile ? "absolute" : "fixed",
      top: isMobile ? 80 : 110,
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
            setMenuOpen(false)
            navigate(btn.path)
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )

  // Card style
  const cardStyle = {
    background: "#fff",
    color: "#232323",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    padding: "2.5rem 2rem",
    maxWidth: 1100,
    margin: isMobile ? "110px auto 0 auto" : "140px auto 0 auto",
    textAlign: "center"
  }

  const bgImgStyle = isMobile
    ? { width: "100vw", height: 210, objectFit: "cover", display: "block" }
    : { width: "100vw", height: 310, objectFit: "cover", display: "block" }

  const handleSchoolSelect = (schoolId) => {
    setSelectedSchools(schools =>
      schools.includes(schoolId) 
        ? schools.filter(id => id !== schoolId) 
        : [...schools, schoolId]
    )
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
      // Refresh schools list
      fetch("https://psa-sales-backend.onrender.com/api/my-schools", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(setMySchools)
      
      setNewSchool({ school_name: "", contact_name: "", email: "", phone: "", address: "" })
      setShowAddSchool(false)
      setStatus("School added successfully!")
    } else {
      setStatus(data.error || "Failed to add school")
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
      
      // Refresh email statuses
      fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(setEmailStatuses)
    } else {
      setStatus(data.error || "Failed to send emails")
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#f5f5f5", position: "relative" }}>
      {/* Header */}
      <div className={isMobile ? "mobile-header-container" : "header-container"}>
        <img src="/PSA_logo.png" alt="PSA logo" className="logo" />
        {!isNarrow ? (
          buttons.map(btn => (
            <button
              key={btn.path}
              className="home-btn"
              onClick={() => navigate(btn.path)}
            >
              {btn.label}
            </button>
          ))
        ) : (
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
        )}
      </div>
      {(menuOpen && (isMobile || isNarrow)) && <DropdownMenu />}
      {/* Background image */}
      <div style={{ width: "100vw", height: isMobile ? 210 : 310, overflow: "hidden", marginTop: isMobile ? 70 : 0 }}>
        <img src={images[bgIndex]} alt="" style={bgImgStyle} />
      </div>
      {/* Section header */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: isMobile ? 130 : 140,
          transform: "translateX(-50%)",
          zIndex: 210,
          fontWeight: 900,
          fontSize: isMobile ? "7vw" : "3vw",
          color: "#fff",
          letterSpacing: 1,
          textShadow: "2px 4px 8px rgba(0,0,0,1)",
          maxWidth: "90vw",
          minWidth: "200px",
          wordBreak: "break-word",
          lineHeight: 1.1,
          textAlign: "center",
          pointerEvents: "none"
        }}
      >
        EMAIL SCHOOLS
      </div>
      {/* Main card */}
      <div style={cardStyle}>
        <h2 style={{ color: "#c40c0c", marginBottom: 24 }}>Email Schools</h2>
        
        {user ? (
          <>
            {/* Add School Section */}
            <div style={{ marginBottom: 32 }}>
              <button
                className="home-btn"
                onClick={() => setShowAddSchool(!showAddSchool)}
                style={{ marginBottom: 16 }}
              >
                {showAddSchool ? "Cancel" : "Add New School"}
              </button>
              
              {showAddSchool && (
                <form onSubmit={handleAddSchool} style={{ marginBottom: 24 }}>
                  <input
                    placeholder="School Name *"
                    value={newSchool.school_name}
                    onChange={(e) => setNewSchool({...newSchool, school_name: e.target.value})}
                    required
                    style={{ marginBottom: 12, width: "100%" }}
                  />
                  <input
                    placeholder="Contact Name"
                    value={newSchool.contact_name}
                    onChange={(e) => setNewSchool({...newSchool, contact_name: e.target.value})}
                    style={{ marginBottom: 12, width: "100%" }}
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={newSchool.email}
                    onChange={(e) => setNewSchool({...newSchool, email: e.target.value})}
                    required
                    style={{ marginBottom: 12, width: "100%" }}
                  />
                  <input
                    placeholder="Phone"
                    value={newSchool.phone}
                    onChange={(e) => setNewSchool({...newSchool, phone: e.target.value})}
                    style={{ marginBottom: 12, width: "100%" }}
                  />
                  <input
                    placeholder="Address"
                    value={newSchool.address}
                    onChange={(e) => setNewSchool({...newSchool, address: e.target.value})}
                    style={{ marginBottom: 12, width: "100%" }}
                  />
                  <button type="submit" className="home-btn">Add School</button>
                </form>
              )}
            </div>

            {/* School Selection */}
            <h3>Select Schools to Email:</h3>
            <div className="schools-table-scroll-container" style={{ maxHeight: 300, marginBottom: 24 }}>
              <table className="schools-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>School Name</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mySchools.map(school => (
                    <tr key={school.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedSchools.includes(school.id)}
                          onChange={() => handleSchoolSelect(school.id)}
                        />
                      </td>
                      <td>{school.school_name}</td>
                      <td>{school.contact_name || "—"}</td>
                      <td>{school.email}</td>
                      <td>{school.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleSendEmails}
              className="home-btn"
              style={{ width: "100%", marginBottom: 16 }}
              disabled={selectedSchools.length === 0 || loading}
            >
              {loading ? "Sending..." : `Send Email to ${selectedSchools.length} School${selectedSchools.length === 1 ? "" : "s"}`}
            </button>

            {status && <div style={{ marginBottom: 24, color: status.includes("success") || status.includes("sent") ? "green" : "#e53935" }}>{status}</div>}

            {/* Email Status Table - keep your existing table with follow-up buttons */}
            <div style={{ marginTop: 40 }}>
              <h2>Email Statuses</h2>
              <div className="schools-table-scroll-container" style={{ maxHeight: 500 }}>
                <table className="schools-table">
                  <thead>
                    <tr>
                      <th>School Name</th>
                      <th>Email</th>
                      <th>Sent Date</th>
                      {user.admin && <th>User</th>}
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailStatuses.map(email => (
                      <tr key={email.id}>
                        <td>{email.school_name}</td>
                        <td>{email.school_email}</td>
                        <td>{new Date(email.sent_at).toLocaleDateString()}</td>
                        {user.admin && <td>{email.user_name || "Unknown"}</td>}
                        <td>
                          {email.responded
                            ? "Responded"
                            : email.followup_sent
                            ? "Follow-Up Sent"
                            : "Pending"}
                        </td>
                        <td>
                          {!email.responded && !email.followup_sent && (
                            <button
                              className="home-btn"
                              style={{ padding: "4px 8px", fontSize: "0.8rem", marginRight: "8px" }}
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
                                  fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
                                    headers: { Authorization: `Bearer ${accessToken}` }
                                  }).then(res => res.json()).then(setEmailStatuses)
                                } else {
                                  alert(data.error || "Failed to send follow-up")
                                }
                              }}
                            >
                              Send Follow-Up
                            </button>
                          )}
                          {!email.responded && (
                            <button
                              className="home-btn"
                              style={{ padding: "4px 8px", fontSize: "0.8rem", background: "#4caf50" }}
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
                                  fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
                                    headers: { Authorization: `Bearer ${accessToken}` }
                                  }).then(res => res.json()).then(setEmailStatuses)
                                }
                              }}
                            >
                              Mark Responded
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div>Please log in to send emails.</div>
        )}
      </div>
    </div>
  )
}