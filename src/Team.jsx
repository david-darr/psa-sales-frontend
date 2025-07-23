import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Team() {
  const navigate = useNavigate()
  const [sheetData, setSheetData] = useState({})
  const [selectedSheet, setSelectedSheet] = useState("")

  useEffect(() => {
    fetch("https://psa-sales-backend.onrender.com/api/team-sheets")
      .then(res => res.json())
      .then(data => {
        setSheetData(data)
        const firstSheet = Object.keys(data)[0] || ""
        setSelectedSheet(firstSheet)
      })
  }, [])

  const handleSheetChange = (e) => {
    setSelectedSheet(e.target.value)
  }

  return (
    <div>
      <div className="section-header">
        <button
          className="back-btn-global"
          onClick={() => navigate('/')}
        >
          ← Home
        </button>
        <h2 className="section-title">Team</h2>
      </div>
      <div>
        <label>
          Select Sheet:&nbsp;
          <select value={selectedSheet} onChange={handleSheetChange}>
            {Object.keys(sheetData).map(sheetName => (
              <option key={sheetName} value={sheetName}>{sheetName}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ marginTop: "2rem" }}>
        {selectedSheet && sheetData[selectedSheet] && (
          <div>
            <h3 style={{ color: "black" }}>{selectedSheet}</h3>
            <table
              border="1"
              cellPadding="4"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "black", // <-- Ensures table text is black
                background: "white" // Optional: ensures background is white
              }}
            >
              <tbody>
                {sheetData[selectedSheet].map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}