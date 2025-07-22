import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Team() {
  const navigate = useNavigate()
  const [sheetData, setSheetData] = useState({})

  useEffect(() => {
    fetch("https://psa-sales-backend.onrender.com/api/team-sheets")
      .then(res => res.json())
      .then(setSheetData);
  }, []);

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
        {Object.entries(sheetData).map(([sheetName, rows]) => (
          <div key={sheetName} style={{ marginBottom: "2rem" }}>
            <h3>{sheetName}</h3>
            <table border="1" cellPadding="4" style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}