import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useNavigate } from "react-router-dom"

const buttons = [
  { label: "Home +", path: "/" },
  { label: "Schools List +", path: "/schools" },
  { label: "School Finder +", path: "/finder" },
  { label: "Emails +", path: "/emails" },
  { label: "Team +", path: "/team" },
  { label: "Account +", path: "/account" }
]

const markerIcons = {
  happyfeet: new L.Icon({ iconUrl: "/map/marker-red.png", iconSize: [32, 32] }),
  psa: new L.Icon({ iconUrl: "/map/marker-blue.png", iconSize: [32, 32] }),
  sheet: new L.Icon({ iconUrl: "/map/marker-yellow.png", iconSize: [32, 32] }),
  rec: new L.Icon({ iconUrl: "/map/marker-green.png", iconSize: [32, 32] })
}

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

export default function PSAMap() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isNarrow = useIsNarrow()
  const [menuOpen, setMenuOpen] = useState(false)
  const [schools, setSchools] = useState({
    happyfeet: [],
    psa: [],
    reached_out: []
  })

  // Rotating background images
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
    fetch("https://psa-sales-backend.onrender.com/api/map-schools")
      .then(res => res.json())
      .then(setSchools)
  }, [])

  // Example center (Northern Virginia)
  const mapCenter = [38.9, -77.25]
  const mapZoom = 10

  // Card style for consistency
  const cardStyle = {
    background: "#fff",
    color: "#232323",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    padding: "1.5rem 1rem",
    maxWidth: 1200,
    margin: isMobile ? "90px auto 40px auto" : "120px auto 60px auto", // changed
    textAlign: "center"
  }

  // Background image style
  const bgImgStyle = isMobile
    ? { width: "100vw", height: 210, objectFit: "cover", display: "block" }
    : { width: "100vw", height: 310, objectFit: "cover", display: "block" }

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
            setMenuOpen(false)
            navigate(btn.path)
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )

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
      )
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
    )
  }

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#f5f5f5", position: "relative" }}>
      <Header />
      {(menuOpen && (isMobile || isNarrow)) && <DropdownMenu />}
      {/* Rotating background image */}
      <div style={{ width: "100vw", height: isMobile ? 210 : 310, overflow: "hidden", marginTop: isMobile ? 70 : 0 }}>
        <img src={images[bgIndex]} alt="" style={bgImgStyle} />
      </div>
      {/* Big Title */}
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
        MAP
      </div>
      {/* Map Card */}
      <div style={cardStyle}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "70vh", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {Array.isArray(schools.happyfeet) && schools.happyfeet.map((s, i) => (
            s.lat && s.lng &&
            <Marker key={`hf-${i}`} position={[s.lat, s.lng]} icon={markerIcons.happyfeet}>
              <Popup>
                <b>{s.name}</b><br />Already In (HappyFeet)
              </Popup>
            </Marker>
          ))}
          {Array.isArray(schools.psa) && schools.psa.map((s, i) => (
            s.lat && s.lng &&
            <Marker key={`psa-${i}`} position={[s.lat, s.lng]} icon={markerIcons.psa}>
              <Popup>
                <b>{s.name}</b><br />Already In (PSA)
              </Popup>
            </Marker>
          ))}
          {Array.isArray(schools.reached_out) && schools.reached_out.map((s, i) => (
            s.lat && s.lng &&
            <Marker key={`sheet-${i}`} position={[s.lat, s.lng]} icon={markerIcons.sheet}>
              <Popup>
                <b>{s.name}</b><br />Reached Out
              </Popup>
            </Marker>
          ))}
          {Array.isArray(schools.rec) && schools.rec.map((s, i) => (
            s.lat && s.lng &&
            <Marker key={`rec-${i}`} position={[s.lat, s.lng]} icon={markerIcons.rec}>
              <Popup>
                <b>{s.name}</b><br />Rec Site
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div style={{ marginTop: 24, color: "#232323", fontWeight: 700 }}>
          <span style={{ color: "#c40c0c" }}>Red:</span> HappyFeet School &nbsp;
          <span style={{ color: "#1976d2" }}>Blue:</span> PSA School &nbsp;
          <span style={{ color: "#0f4404ff" }}>Green:</span> Rec &nbsp;
          <span style={{ color: "#fbc02d" }}>Yellow:</span> Reached Out (Sales)

        </div>
        <div style={{ marginBottom: 16 }}>
          <button
            className="home-btn"
            style={{ padding: "8px 24px", fontWeight: 700 }}
            onClick={async () => {
              await fetch("https://psa-sales-backend.onrender.com/api/refresh-map-schools", { method: "POST" });
              fetch("https://psa-sales-backend.onrender.com/api/map-schools")
                .then(res => res.json())
                .then(setSchools);
            }}
          >
            Refresh Map
          </button>
        </div>
      </div>
    </div>
  )
}