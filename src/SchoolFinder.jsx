import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import SchoolMap from './SchoolMap'
import NavigationCard from './NavigationCard'

const ALL_KEYWORDS = [
  "elementary school",
  "day care",
  "preschool",
  "kindercare",
  "montessori",
  "church school"
]

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

export default function SchoolFinder() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  
  // Search state
  const [address, setAddress] = useState('')
  const [schools, setSchools] = useState([])
  const [coords, setCoords] = useState(null)
  const [selectedKeywords, setSelectedKeywords] = useState([...ALL_KEYWORDS])
  const [loading, setLoading] = useState(false)
  
  // Route planning state
  const [selectedRouteSchools, setSelectedRouteSchools] = useState([])
  const [routeOrder, setRouteOrder] = useState(null)
  const [startAddress, setStartAddress] = useState("")
  const [routeLoading, setRouteLoading] = useState(false)

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

  function handleKeywordChange(kw) {
    setSelectedKeywords(selectedKeywords =>
      selectedKeywords.includes(kw)
        ? selectedKeywords.filter(k => k !== kw)
        : [...selectedKeywords, kw]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`https://psa-sales-backend.onrender.com/api/find-schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, keywords: selectedKeywords })
      });
      const data = await res.json();
      setSchools(data.schools);
      setCoords(data.location);
      setSelectedRouteSchools([]); // Reset selected schools for route
      setRouteOrder(null);         // Reset previous route order
    } catch (error) {
      console.error('Error finding schools:', error);
    } finally {
      setLoading(false);
    }
  }

  // Handle school selection for route
  function toggleRouteSchool(place_id) {
    setSelectedRouteSchools(selected =>
      selected.includes(place_id)
        ? selected.filter(id => id !== place_id)
        : [...selected, place_id]
    );
  }

  // Send selected schools and starting address to API for route planning
  async function handleCreateRoute() {
    const schoolsToRoute = schools.filter(s => selectedRouteSchools.includes(s.place_id));
    if (schoolsToRoute.length < 2) {
      alert("Select at least two schools for route planning.");
      return;
    }
    if (!startAddress) {
      alert("Please enter a starting address.");
      return;
    }
    
    setRouteLoading(true);
    try {
      const res = await fetch(`https://psa-sales-backend.onrender.com/api/route-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schools: schoolsToRoute, start_address: startAddress })
      });
      const data = await res.json();
      setRouteOrder(data.route); // route is an array of place_ids in order
    } catch (error) {
      console.error('Error creating route:', error);
    } finally {
      setRouteLoading(false);
    }
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
            SCHOOL FINDER
          </h1>
          <p className="modern-page-subtitle" style={{
            textAlign: "left"
          }}>
            Discover New Schools in Your Area
          </p>
        </div>

        {/* Search Card */}
        <div className="modern-dashboard-card" style={{ marginBottom: isMobile ? "1rem" : "2rem" }}>
          <div className="modern-card-header">
            <div className="modern-card-title">Search for Schools</div>
            <div className="modern-card-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
              🔍
            </div>
          </div>
          <div className="modern-card-content">
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter address or location (e.g., 22101, Fairfax VA)"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                    background: "#334155",
                    color: "#f1f5f9",
                    fontSize: "1rem"
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ 
                  fontSize: "0.9rem", 
                  color: "#94a3b8", 
                  marginBottom: "0.75rem",
                  fontWeight: "600"
                }}>
                  School Types to Search:
                </div>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
                  gap: "0.75rem"
                }}>
                  {ALL_KEYWORDS.map(kw => (
                    <label 
                      key={kw} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.5rem",
                        cursor: "pointer",
                        color: "#e2e8f0",
                        fontSize: "0.9rem"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedKeywords.includes(kw)}
                        onChange={() => handleKeywordChange(kw)}
                        style={{ accentColor: "#3b82f6" }}
                      />
                      {kw}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="modern-btn-primary"
                disabled={loading || !address.trim()}
                style={{ 
                  width: "100%",
                  opacity: loading || !address.trim() ? 0.6 : 1,
                  cursor: loading || !address.trim() ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "🔍 Searching..." : "🔍 Find Schools"}
              </button>
            </form>
          </div>
        </div>

        {/* Results Section */}
        {schools.length > 0 && (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? "1rem" : "2rem",
            marginBottom: "2rem"
          }}>
            {/* Schools List Card */}
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">Found Schools ({schools.length})</div>
                <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                  🏫
                </div>
              </div>
              <div className="modern-card-content">
                <div style={{ 
                  maxHeight: "400px", 
                  overflowY: "auto",
                  marginBottom: "1rem"
                }}>
                  {schools.map(school => (
                    <div 
                      key={school.place_id} 
                      style={{
                        background: selectedRouteSchools.includes(school.place_id) 
                          ? "rgba(59, 130, 246, 0.1)" 
                          : "rgba(51, 65, 85, 0.3)",
                        border: selectedRouteSchools.includes(school.place_id) 
                          ? "1px solid rgba(59, 130, 246, 0.3)" 
                          : "1px solid rgba(71, 85, 105, 0.3)",
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "0.75rem",
                        transition: "all 0.2s ease",
                        cursor: "pointer"
                      }}
                      onClick={() => toggleRouteSchool(school.place_id)}
                    >
                      <div style={{ 
                        display: "flex", 
                        alignItems: "flex-start", 
                        gap: "0.75rem" 
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedRouteSchools.includes(school.place_id)}
                          onChange={() => toggleRouteSchool(school.place_id)}
                          style={{ marginTop: "0.25rem", accentColor: "#3b82f6" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: "600", 
                            color: "#f1f5f9", 
                            marginBottom: "0.25rem",
                            fontSize: "0.95rem"
                          }}>
                            {school.name}
                          </div>
                          <div style={{ 
                            color: "#94a3b8", 
                            fontSize: "0.85rem",
                            lineHeight: "1.4"
                          }}>
                            📍 {school.address}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ 
                  fontSize: "0.85rem", 
                  color: "#64748b", 
                  textAlign: "center",
                  fontStyle: "italic"
                }}>
                  Click schools to select them for route planning
                </div>
              </div>
            </div>

            {/* Map Card */}
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">School Locations</div>
                <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                  🗺️
                </div>
              </div>
              <div className="modern-card-content">
                <div style={{ 
                  height: "400px", 
                  borderRadius: "8px", 
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {coords ? (
                    <SchoolMap coords={coords} schools={schools} />
                  ) : (
                    <div style={{ color: "#64748b", textAlign: "center" }}>
                      Search for schools to see them on the map
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Route Planning Card */}
        {schools.length > 0 && (
          <div className="modern-dashboard-card">
            <div className="modern-card-header">
              <div className="modern-card-title">Route Planning</div>
              <div className="modern-card-icon" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                🛣️
              </div>
            </div>
            <div className="modern-card-content">
              <div style={{ marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  value={startAddress}
                  onChange={e => setStartAddress(e.target.value)}
                  placeholder="Enter starting address for route planning"
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                    background: "#334155",
                    color: "#f1f5f9",
                    fontSize: "1rem",
                    marginBottom: "1rem"
                  }}
                />
                
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "1rem",
                  marginBottom: "1rem"
                }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                    Selected schools: <strong style={{ color: "#3b82f6" }}>{selectedRouteSchools.length}</strong>
                  </div>
                  {selectedRouteSchools.length < 2 && (
                    <div style={{ color: "#f59e0b", fontSize: "0.85rem" }}>
                      Select at least 2 schools for routing
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateRoute}
                  className="modern-btn-primary"
                  disabled={selectedRouteSchools.length < 2 || !startAddress || routeLoading}
                  style={{ 
                    width: "100%",
                    background: "#f59e0b",
                    opacity: selectedRouteSchools.length < 2 || !startAddress || routeLoading ? 0.6 : 1,
                    cursor: selectedRouteSchools.length < 2 || !startAddress || routeLoading ? "not-allowed" : "pointer"
                  }}
                >
                  {routeLoading ? "🛣️ Creating Route..." : "🛣️ Create Optimal Route"}
                </button>
              </div>

              {routeOrder && (
                <div style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "8px",
                  padding: "1.5rem"
                }}>
                  <h4 style={{ 
                    color: "#10b981", 
                    marginBottom: "1rem",
                    fontSize: "1.1rem",
                    fontWeight: "600"
                  }}>
                    🏁 Optimal Route Order:
                  </h4>
                  <div style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
                    Starting from: <strong style={{ color: "#f1f5f9" }}>{startAddress}</strong>
                  </div>
                  <ol style={{ paddingLeft: "1.5rem", color: "#e2e8f0" }}>
                    {routeOrder.map((pid, index) => {
                      const school = schools.find(s => s.place_id === pid);
                      return (
                        <li key={pid} style={{ marginBottom: "0.75rem" }}>
                          <div style={{ fontWeight: "600", color: "#f1f5f9" }}>
                            {school?.name}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                            📍 {school?.address}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!loading && schools.length === 0 && coords && (
          <div className="modern-dashboard-card">
            <div className="modern-card-content" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
              <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem" }}>No Schools Found</h3>
              <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
                Try adjusting your search location or selecting different school types.
              </p>
              <button 
                className="modern-btn-primary"
                onClick={() => {
                  setAddress('');
                  setSchools([]);
                  setCoords(null);
                  setSelectedRouteSchools([]);
                  setRouteOrder(null);
                }}
              >
                🔄 Start New Search
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}