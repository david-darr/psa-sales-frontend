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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 770);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 770);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(window.innerWidth <= 1285);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 1285);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isNarrow;
}

export default function Emails() {
  const navigate = useNavigate()
  const isMobile = useIsMobile();
  const isNarrow = useIsNarrow();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, accessToken } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");

  const images = [
    "/psa pics/bg1.jpg",
    "/psa pics/bg2.jpg",
    "/psa pics/bg3.jpg",
    "/psa pics/bg4.jpg",
    "/psa pics/bg5.jpg"
  ];
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(i => (i + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  async function handleSend(e) {
    e.preventDefault();
    setStatus("");
    const res = await fetch("https://psa-sales-backend.onrender.com/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({ recipient })
    });
    const data = await res.json();
    if (data.status === "sent") {
      setStatus("Email sent!");
      setRecipient("");
    } else {
      setStatus(data.error || "Failed to send email.");
    }
  }

  // HEADER
  function Header() {
    if (isMobile) {
      return (
        <div className="mobile-header-container">
          <img src="/PSA_logo.png" alt="PSA logo" className="logo" />
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
        </div>
      );
    }
    // Desktop header
    return (
      <div className="header-container">
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
    );
  }

  // Dropdown menu overlay
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
            setMenuOpen(false);
            navigate(btn.path);
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );

  // Card style
  const cardStyle = {
    background: "#fff",
    color: "#232323",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    padding: "2.5rem 2rem",
    maxWidth: 500,
    margin: isMobile ? "110px auto 0 auto" : "140px auto 0 auto",
    textAlign: "center"
  }

  const bgImgStyle = isMobile
    ? { width: "100vw", height: 210, objectFit: "cover", display: "block" }
    : { width: "100vw", height: 310, objectFit: "cover", display: "block" }

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#f5f5f5", position: "relative" }}>
      <Header />
      {(menuOpen && (isMobile || isNarrow)) && <DropdownMenu />}
      <div style={{ width: "100vw", height: isMobile ? 210 : 310, overflow: "hidden", marginTop: isMobile ? 70 : 0 }}>
        <img src={images[bgIndex]} alt="" style={bgImgStyle} />
      </div>
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
        EMAILS
      </div>
      <div style={cardStyle}>
        <h2 style={{ color: "#c40c0c", marginBottom: 24 }}>Send Email</h2>
        {user ? (
          <form onSubmit={handleSend}>
            <input
              type="email"
              placeholder="School's Email"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              required
              style={{ marginBottom: 12, width: "100%" }}
            />
            <button type="submit" className="home-btn" style={{ width: "100%" }}>
              Send Email
            </button>
            {status && <div style={{ marginTop: 10, color: status === "Email sent!" ? "green" : "#e53935" }}>{status}</div>}
          </form>
        ) : (
          <div>Please log in to send emails.</div>
        )}
      </div>
    </div>
  )
}