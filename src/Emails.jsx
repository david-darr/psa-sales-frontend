import { useState, useEffect } from 'react'
import { useAuth } from "./AuthContext"
import { useNavigate } from "react-router-dom"

const buttons = [
  { label: "Home +", path: "/" },
  { label: "Schools List +", path: "/schools" },
  { label: "School Finder +", path: "/finder" },
  { label: "Team +", path: "/team" },
  { label: "Account +", path: "/account" }
]

export default function Emails() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const [sheetData, setSheetData] = useState({})
  const [selectedSheet, setSelectedSheet] = useState("")
  const [selectedRows, setSelectedRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")

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
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleSend(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    const subject = "Let's Connect! PSA Programs";
    let sentCount = 0;
    const rows = sheetData[selectedSheet] || [];
    for (const i of selectedRows) {
      const row = rows[i + 1]; 
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

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#f5f5f5", position: "relative" }}>
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
      <div style={{ margin: "40px auto", maxWidth: 900, background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <h2 style={{ color: "#c40c0c", marginBottom: 24 }}>Select Schools to Email (from Sheets)</h2>
        <label>
          Select Sheet:&nbsp;
          <select value={selectedSheet} onChange={handleSheetChange}>
            {Object.keys(sheetData).map(sheetName => (
              <option key={sheetName} value={sheetName}>{sheetName}</option>
            ))}
          </select>
        </label>
        {user ? (
          <form onSubmit={handleSend}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "white",
              color: "black",
              borderRadius: 12,
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              margin: "2rem 0",
              overflow: "hidden"
            }}>
              <thead>
                <tr>
                  <th></th>
                  {sheetData[selectedSheet] && sheetData[selectedSheet][0] && sheetData[selectedSheet][0].map((cell, idx) => (
                    <th key={idx}>{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheetData[selectedSheet] && sheetData[selectedSheet].slice(1).map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(i)}
                        onChange={() => handleRowSelect(i)}
                      />
                    </td>
                    {row.map((cell, idx) => (
                      <td key={idx}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
      </div>
    </div>
  )
}