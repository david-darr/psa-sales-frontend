import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "./AuthContext"

export default function Team() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const [mySchools, setMySchools] = useState([])
  const [emailStats, setEmailStats] = useState({})
  const [loading, setLoading] = useState(false)

  const fetchData = () => {
    if (!accessToken) return
    
    setLoading(true)
    
    // Fetch user's schools
    fetch("https://psa-sales-backend.onrender.com/api/my-schools", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(setMySchools)
    
    // Fetch email statistics
    fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(emails => {
        const stats = {
          total: emails.length,
          responded: emails.filter(e => e.responded).length,
          followups: emails.filter(e => e.followup_sent).length,
          pending: emails.filter(e => !e.responded && !e.followup_sent).length
        }
        setEmailStats(stats)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [accessToken])

  if (!user) {
    return (
      <div>
        <div className="section-header">
          <button className="back-btn-global" onClick={() => navigate('/')}>
            ← Home
          </button>
          <h2 className="section-title">Team</h2>
        </div>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          Please log in to view your sales data.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <button className="back-btn-global" onClick={() => navigate('/')}>
          ← Home
        </button>
        <h2 className="section-title">Team Dashboard</h2>
      </div>
      
      <div style={{ padding: "2rem" }}>
        <h3>Welcome, {user.name}!</h3>
        
        {/* Email Statistics */}
        <div style={{ marginBottom: "2rem" }}>
          <h4>Email Statistics</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div style={{ background: "#f0f0f0", padding: "1rem", borderRadius: "8px" }}>
              <strong>Total Emails Sent:</strong> {emailStats.total || 0}
            </div>
            <div style={{ background: "#e8f5e8", padding: "1rem", borderRadius: "8px" }}>
              <strong>Responded:</strong> {emailStats.responded || 0}
            </div>
            <div style={{ background: "#fff3cd", padding: "1rem", borderRadius: "8px" }}>
              <strong>Follow-ups Sent:</strong> {emailStats.followups || 0}
            </div>
            <div style={{ background: "#f8d7da", padding: "1rem", borderRadius: "8px" }}>
              <strong>Pending:</strong> {emailStats.pending || 0}
            </div>
          </div>
        </div>

        {/* Schools Management */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4>My Schools ({mySchools.length})</h4>
            <button onClick={fetchData} disabled={loading} style={{ padding: "0.5rem 1rem" }}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          
          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th>School Name</th>
                <th>Contact</th>
                <th>Email</th>
                {user.admin && <th>Added By</th>}
                <th>Status</th>
                <th>Added Date</th>
              </tr>
            </thead>
            <tbody>
              {mySchools.map(school => (
                <tr key={school.id}>
                  <td>{school.school_name}</td>
                  <td>{school.contact_name || "—"}</td>
                  <td>{school.email}</td>
                  {user.admin && <td>{school.user_name || "Unknown"}</td>}
                  <td>
                    <span style={{
                      background: school.status === 'contacted' ? '#e8f5e8' : '#f0f0f0',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {school.status}
                    </span>
                  </td>
                  <td>{new Date(school.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {mySchools.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
              No schools added yet. Go to the Emails page to add some schools!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}