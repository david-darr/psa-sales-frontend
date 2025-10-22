import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import NavigationCard from './NavigationCard'

// Configure Leaflet icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/map/marker-icon-2x.png',
  iconUrl: '/map/marker-icon.png',
  shadowUrl: '/map/marker-shadow.png',
});

const markerIcons = {
  happyfeet: new L.Icon({ iconUrl: "/map/marker-red.png", iconSize: [32, 32] }),
  psa: new L.Icon({ iconUrl: "/map/marker-blue.png", iconSize: [32, 32] }),
  sheet: new L.Icon({ iconUrl: "/map/marker-yellow.png", iconSize: [32, 32] }),
  rec: new L.Icon({ iconUrl: "/map/marker-green.png", iconSize: [32, 32] })
}

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

export default function PSAMap() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [schools, setSchools] = useState({
    happyfeet: [],
    psa: [],
    reached_out: [],
    rec: []
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Example center (Northern Virginia)
  const mapCenter = [38.9, -77.25]
  const mapZoom = isMobile ? 9 : 10

  // Load schools data
  useEffect(() => {
    fetchSchools()
  }, [])

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

  const fetchSchools = async () => {
    try {
      setLoading(true)
      const response = await fetch("https://psa-sales-backend.onrender.com/api/map-schools")
      const data = await response.json()
      setSchools(data)
    } catch (error) {
      console.error('Error fetching schools:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshMap = async () => {
    try {
      setRefreshing(true)
      await fetch("https://psa-sales-backend.onrender.com/api/refresh-map-schools", { method: "POST" })
      await fetchSchools()
    } catch (error) {
      console.error('Error refreshing map:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Calculate statistics
  const mapStats = {
    happyfeet: schools.happyfeet?.length || 0,
    psa: schools.psa?.length || 0,
    reached_out: schools.reached_out?.length || 0,
    rec: schools.rec?.length || 0,
    total: (schools.happyfeet?.length || 0) + (schools.psa?.length || 0) + (schools.reached_out?.length || 0) + (schools.rec?.length || 0)
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
            MAP
          </h1>
          <p className="modern-page-subtitle" style={{
            textAlign: "left"
          }}>
            School Locations & Distribution
          </p>
        </div>

        {/* Statistics Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "1fr 1fr 1fr 1fr" : "repeat(5, 1fr)",
          gap: isMobile ? "0.75rem" : "1rem",
          marginBottom: isMobile ? "1rem" : "2rem"
        }}>
          {/* Total Schools */}
          <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
            <div className="modern-card-header">
              <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Total</div>
              <div className="modern-card-icon" style={{ 
                background: "rgba(59, 130, 246, 0.2)", 
                color: "#3b82f6",
                width: "30px",
                height: "30px",
                fontSize: "1rem"
              }}>
                🏫
              </div>
            </div>
            <div className="modern-card-content" style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "1.5rem" : "2rem", 
                fontWeight: "800", 
                color: "#3b82f6",
                marginBottom: "0.25rem"
              }}>
                {mapStats.total}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                Schools
              </div>
            </div>
          </div>

          {/* HappyFeet Schools */}
          <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
            <div className="modern-card-header">
              <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>HappyFeet</div>
              <div className="modern-card-icon" style={{ 
                background: "rgba(239, 68, 68, 0.2)", 
                color: "#ef4444",
                width: "30px",
                height: "30px",
                fontSize: "1rem"
              }}>
                🔴
              </div>
            </div>
            <div className="modern-card-content" style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "1.5rem" : "2rem", 
                fontWeight: "800", 
                color: "#ef4444",
                marginBottom: "0.25rem"
              }}>
                {mapStats.happyfeet}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                Schools
              </div>
            </div>
          </div>

          {/* PSA Schools */}
          <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
            <div className="modern-card-header">
              <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>PSA</div>
              <div className="modern-card-icon" style={{ 
                background: "rgba(59, 130, 246, 0.2)", 
                color: "#3b82f6",
                width: "30px",
                height: "30px",
                fontSize: "1rem"
              }}>
                🔵
              </div>
            </div>
            <div className="modern-card-content" style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "1.5rem" : "2rem", 
                fontWeight: "800", 
                color: "#3b82f6",
                marginBottom: "0.25rem"
              }}>
                {mapStats.psa}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                Schools
              </div>
            </div>
          </div>

          {/* Contacted Schools */}
          <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
            <div className="modern-card-header">
              <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Contacted</div>
              <div className="modern-card-icon" style={{ 
                background: "rgba(234, 179, 8, 0.2)", 
                color: "#eab308",
                width: "30px",
                height: "30px",
                fontSize: "1rem"
              }}>
                🟡
              </div>
            </div>
            <div className="modern-card-content" style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "1.5rem" : "2rem", 
                fontWeight: "800", 
                color: "#eab308",
                marginBottom: "0.25rem"
              }}>
                {mapStats.reached_out}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                Schools
              </div>
            </div>
          </div>

          {/* Recreation Sites */}
          <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
            <div className="modern-card-header">
              <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Rec Sites</div>
              <div className="modern-card-icon" style={{ 
                background: "rgba(16, 185, 129, 0.2)", 
                color: "#10b981",
                width: "30px",
                height: "30px",
                fontSize: "1rem"
              }}>
                🟢
              </div>
            </div>
            <div className="modern-card-content" style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "1.5rem" : "2rem", 
                fontWeight: "800", 
                color: "#10b981",
                marginBottom: "0.25rem"
              }}>
                {mapStats.rec}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                Sites
              </div>
            </div>
          </div>
        </div>

        {/* Main Map Card */}
        <div className="modern-dashboard-card" style={{ minHeight: isMobile ? "60vh" : "70vh" }}>
          <div className="modern-card-header">
            <div className="modern-card-title">School Distribution Map</div>
            <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
              🗺️
            </div>
          </div>
          <div className="modern-card-content">
            {loading ? (
              <div style={{ 
                height: isMobile ? "50vh" : "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                fontSize: "1.1rem"
              }}>
                Loading map data...
              </div>
            ) : (
              <>
                <div style={{ 
                  height: isMobile ? "50vh" : "60vh", 
                  borderRadius: "12px", 
                  overflow: "hidden",
                  marginBottom: "1rem"
                }}>
                  <MapContainer 
                    center={mapCenter} 
                    zoom={mapZoom} 
                    style={{ width: '100%', height: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                    
                    {/* HappyFeet Schools - Red markers */}
                    {Array.isArray(schools.happyfeet) && schools.happyfeet.map((s, i) => (
                      s.lat && s.lng && (
                        <Marker key={`hf-${i}`} position={[s.lat, s.lng]} icon={markerIcons.happyfeet}>
                          <Popup>
                            <b>{s.name}</b><br />
                            HappyFeet School<br />
                            {s.address}
                          </Popup>
                        </Marker>
                      )
                    ))}
                    
                    {/* PSA Schools - Blue markers */}
                    {Array.isArray(schools.psa) && schools.psa.map((s, i) => (
                      s.lat && s.lng && (
                        <Marker key={`psa-${i}`} position={[s.lat, s.lng]} icon={markerIcons.psa}>
                          <Popup>
                            <b>{s.name}</b><br />
                            PSA School<br />
                            {s.address}
                          </Popup>
                        </Marker>
                      )
                    ))}
                    
                    {/* Contacted Schools - Yellow markers */}
                    {Array.isArray(schools.reached_out) && schools.reached_out.map((s, i) => (
                      s.lat && s.lng && (
                        <Marker key={`sheet-${i}`} position={[s.lat, s.lng]} icon={markerIcons.sheet}>
                          <Popup>
                            <b>{s.name}</b><br />
                            Contacted School<br />
                            {s.address}
                          </Popup>
                        </Marker>
                      )
                    ))}
                    
                    {/* Recreation Sites - Green markers */}
                    {Array.isArray(schools.rec) && schools.rec.map((s, i) => (
                      s.lat && s.lng && (
                        <Marker key={`rec-${i}`} position={[s.lat, s.lng]} icon={markerIcons.rec}>
                          <Popup>
                            <b>{s.name}</b><br />
                            Recreation Site<br />
                            {s.address}
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </MapContainer>
                </div>

                {/* Legend */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
                  gap: "1rem",
                  marginBottom: "1rem",
                  padding: "1rem",
                  background: "rgba(59, 130, 246, 0.05)",
                  borderRadius: "8px",
                  border: "1px solid rgba(59, 130, 246, 0.1)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ 
                      width: "16px", 
                      height: "16px", 
                      background: "#ef4444", 
                      borderRadius: "50%",
                      flexShrink: 0
                    }}></div>
                    <span style={{ color: "#f1f5f9", fontSize: "0.85rem", fontWeight: "500" }}>
                      HappyFeet Schools
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ 
                      width: "16px", 
                      height: "16px", 
                      background: "#3b82f6", 
                      borderRadius: "50%",
                      flexShrink: 0
                    }}></div>
                    <span style={{ color: "#f1f5f9", fontSize: "0.85rem", fontWeight: "500" }}>
                      PSA Schools
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ 
                      width: "16px", 
                      height: "16px", 
                      background: "#eab308", 
                      borderRadius: "50%",
                      flexShrink: 0
                    }}></div>
                    <span style={{ color: "#f1f5f9", fontSize: "0.85rem", fontWeight: "500" }}>
                      Contacted
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ 
                      width: "16px", 
                      height: "16px", 
                      background: "#10b981", 
                      borderRadius: "50%",
                      flexShrink: 0
                    }}></div>
                    <span style={{ color: "#f1f5f9", fontSize: "0.85rem", fontWeight: "500" }}>
                      Recreation Sites
                    </span>
                  </div>
                </div>

                {/* Refresh Button */}
                <div style={{ textAlign: "center" }}>
                  <button 
                    className="modern-btn-primary"
                    onClick={handleRefreshMap}
                    disabled={refreshing}
                    style={{ 
                      padding: "0.75rem 2rem",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      opacity: refreshing ? 0.7 : 1,
                      cursor: refreshing ? "not-allowed" : "pointer"
                    }}
                  >
                    {refreshing ? "🔄 Refreshing..." : "Refresh Map Data"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}