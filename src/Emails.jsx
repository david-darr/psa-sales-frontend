import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from "./AuthContext"

const buttons = [
  { label: "Home +", path: "/" },
  { label: "Schools List +", path: "/schools" },
  { label: "School Finder +", path: "/finder" },
  { label: "Team +", path: "/team" },
  { label: "Account +", path: "/account" }
]

export default function Emails() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth();
  const [schools, setSchools] = useState([]);
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch schools from backend (same as Team tab)
    fetch("https://psa-sales-backend.onrender.com/api/schools")
      .then(res => res.json())
      .then(setSchools)
  }, []);

  const handleSelect = (id) => {
    setSelected(sel =>
      sel.includes(id) ? sel.filter(sid => sid !== id) : [...sel, id]
    );
  };

  async function handleSend(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    const subject = "Let's Connect! PSA Programs";
    let sentCount = 0;
    for (const school of schools.filter(s => selected.includes(s.id))) {
      const res = await fetch("https://psa-sales-backend.onrender.com/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ recipient: school.email, subject })
      });
      const data = await res.json();
      if (data.status === "sent") sentCount++;
    }
    setStatus(`${sentCount} email${sentCount === 1 ? "" : "s"} sent!`);
    setLoading(false);
    setSelected([]);
  }

  // Table style copied from Team tab
  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
    color: "black",
    borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    margin: "0 auto",
    overflow: "hidden"
  };

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
        <h2 style={{ color: "#c40c0c", marginBottom: 24 }}>Select Schools to Email</h2>
        {user ? (
          <>
            <form onSubmit={handleSend}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th>Contact</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map(s => (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(s.id)}
                          onChange={() => handleSelect(s.id)}
                        />
                      </td>
                      <td>{s.name}</td>
                      <td>{s.address}</td>
                      <td>{s.phone}</td>
                      <td>{s.contact}</td>
                      <td>{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="submit"
                className="home-btn"
                style={{ width: "100%", marginTop: 24 }}
                disabled={selected.length === 0 || loading}
              >
                {loading ? "Sending..." : "Send Email"}
              </button>
              {status && <div style={{ marginTop: 10, color: "green" }}>{status}</div>}
            </form>
          </>
        ) : (
          <div>Please log in to send emails.</div>
        )}
      </div>
    </div>
  );
}