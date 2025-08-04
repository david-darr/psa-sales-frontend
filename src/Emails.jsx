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
  const [sheetData, setSheetData] = useState({})
  const [selectedSheet, setSelectedSheet] = useState("")
  const [selectedRows, setSelectedRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [emailStatuses, setEmailStatuses] = useState([]);
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

  useEffect(() => {
    setLoading(true)
    fetch("https://psa-sales-backend.onrender.com/api/team-sheets")
      .then(res => res.json())
      .then(data => {
        setSheetData(data)
        const firstSheet = Object.keys(data)[0] || ""
        setSelectedSheet(firstSheet)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(setEmailStatuses);
  }, [accessToken]);

  const handleSheetChange = (e) => {
    setSelectedSheet(e.target.value)
    setSelectedRows([])
  }

  const handleRowSelect = (i) => {
    setSelectedRows(rows =>
      rows.includes(i) ? rows.filter(idx => idx !== i) : [...rows, i]
    )
  }

  function isValidEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  async function handleSend(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    const subject = "Let's Connect! PSA Programs";
    let sentCount = 0;
    const rows = sheetData[selectedSheet] || [];
    for (const i of selectedRows) {
      const row = rows[i + 1]; // +1 to skip header
      const schoolName = row[0];
      const schoolEmail = row.find(cell => isValidEmail(cell));
      if (!schoolEmail) continue;
      const res = await fetch("https://psa-sales-backend.onrender.com/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          recipient: schoolEmail,
          subject,
          school_name: schoolName
        })
      });
      const data = await res.json();
      if (data.status === "sent") sentCount++;
    }
    setStatus(`${sentCount} email${sentCount === 1 ? "" : "s"} sent!`);
    setLoading(false);
    setSelectedRows([]);
  }

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
        <h2 style={{ color: "#c40c0c", marginBottom: 24 }}>Select Schools to Email (from Sheets)</h2>
        <label>
          Select Sheet:&nbsp;
          <select value={selectedSheet} onChange={handleSheetChange} style={{ marginBottom: 24 }}>
            {Object.keys(sheetData).map(sheetName => (
              <option key={sheetName} value={sheetName}>{sheetName}</option>
            ))}
          </select>
        </label>
        {user ? (
          <form onSubmit={handleSend}>
            <div
              className="schools-table-scroll-container"
              style={{
                maxHeight: 500,
                overflowY: "auto",
                overflowX: "auto", // allow horizontal scroll if needed
                width: "100%",
                margin: "0 auto"
              }}
            >
              <table
                className="schools-table"
                style={{
                  width: "100%",
                  tableLayout: "auto",
                  minWidth: 0,
                  wordBreak: "break-word"
                }}
              >
                <thead>
                  <tr>
                    <th></th>
                    {sheetData[selectedSheet] &&
                      sheetData[selectedSheet][0] &&
                      sheetData[selectedSheet][0].map((cell, idx) => (
                        <th
                          key={idx}
                          style={{
                            whiteSpace: "nowrap",
                            fontSize: isMobile ? "0.8rem" : "1.1rem",
                            padding: isMobile ? "4px 6px" : "8px 12px",
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {cell}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData[selectedSheet] &&
                    sheetData[selectedSheet].slice(1).map((row, i) => (
                      <tr key={i}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(i)}
                            onChange={() => handleRowSelect(i)}
                          />
                        </td>
                        {row.map((cell, idx) => (
                          <td
                            key={idx}
                            style={{
                              whiteSpace: "nowrap", // Prevent word breaks
                              fontSize: isMobile ? "0.75rem" : "1rem", // Responsive font size
                              padding: isMobile ? "4px 6px" : "8px 12px",
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <button
              type="submit"
              className="home-btn"
              style={{ width: "100%", marginTop: 24 }}
              disabled={selectedRows.length === 0 || loading}
            >
              {loading ? "Sending..." : "Send Email"}
            </button>
            {status && <div style={{ marginTop: 10, color: "green" }}>{status}</div>}
          </form>
        ) : (
          <div>Please log in to send emails.</div>
        )}
        {/* Email Statuses Table */}
        <div style={{ marginTop: 40 }}>
          <h2>Email Statuses</h2>
          <div
            className="schools-table-scroll-container"
            style={{
              maxHeight: 500,
              overflowY: "auto",
              overflowX: "auto", // allow horizontal scroll if needed
              width: "100%",
              margin: "0 auto"
            }}
          >
            <table
              className="schools-table"
              style={{
                width: "100%",
                tableLayout: "auto",
                minWidth: 0,
                wordBreak: "break-word"
              }}
            >
              <thead>
                <tr>
                  <th>School Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {emailStatuses.map(email => (
                  <tr key={email.id}>
                    <td>{email.school_name}</td>
                    <td>{email.school_email}</td>
                    <td>
                      {email.responded
                        ? "Responded"
                        : email.followup_sent
                        ? "Follow-Up Sent"
                        : "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}