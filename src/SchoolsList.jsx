import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import NavigationCard from './NavigationCard'

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

export default function SchoolsList() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [schools, setSchools] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const rowRefs = useRef({})

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

  // Load schools data
  useEffect(() => {
    fetchSchools()
  }, [])

  const fetchSchools = async () => {
    try {
      setLoading(true)
      const response = await fetch(`https://psa-sales-backend.onrender.com/api/schools`)
      const data = await response.json()
      setSchools(data)
    } catch (error) {
      console.error('Error fetching schools:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') {
      const match = schools.find(
        s => s.name.toLowerCase() === search.trim().toLowerCase()
      )
      if (match && rowRefs.current[match.id]) {
        rowRefs.current[match.id].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  // Filter schools based on search
  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(search.toLowerCase()) ||
    school.address.toLowerCase().includes(search.toLowerCase()) ||
    school.contact.toLowerCase().includes(search.toLowerCase()) ||
    school.email.toLowerCase().includes(search.toLowerCase())
  )

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
            SCHOOLS DATABASE
          </h1>
          <p className="modern-page-subtitle" style={{
            textAlign: "left"
          }}>
            Complete Directory of Schools & Contact Information
          </p>
        </div>

        {/* Statistics Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "1fr 1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? "0.75rem" : "1rem",
          marginBottom: isMobile ? "1rem" : "2rem"
        }}>
          {/* Total Schools */}
          <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
            <div className="modern-card-header">
              <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Total Schools</div>
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
                {schools.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                Schools
              </div>
            </div>
          </div>

          {/* Search Results */}
          <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
            <div className="modern-card-header">
              <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Search Results</div>
              <div className="modern-card-icon" style={{ 
                background: "rgba(16, 185, 129, 0.2)", 
                color: "#10b981",
                width: "30px",
                height: "30px",
                fontSize: "1rem"
              }}>
                🔍
              </div>
            </div>
            <div className="modern-card-content" style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "1.5rem" : "2rem", 
                fontWeight: "800", 
                color: "#10b981",
                marginBottom: "0.25rem"
              }}>
                {filteredSchools.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                Found
              </div>
            </div>
          </div>

          {/* Loading Status */}
          <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
            <div className="modern-card-header">
              <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Database</div>
              <div className="modern-card-icon" style={{ 
                background: loading ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)", 
                color: loading ? "#f59e0b" : "#10b981",
                width: "30px",
                height: "30px",
                fontSize: "1rem"
              }}>
                {loading ? "⏳" : "✅"}
              </div>
            </div>
            <div className="modern-card-content" style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "1rem" : "1.2rem", 
                fontWeight: "600", 
                color: loading ? "#f59e0b" : "#10b981",
                marginBottom: "0.25rem"
              }}>
                {loading ? "Loading..." : "Connected"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
                Status
              </div>
            </div>
          </div>

          {/* Refresh Button Card */}
          {!isMobile && (
            <div className="modern-dashboard-card" style={{ minHeight: "120px" }}>
              <div className="modern-card-header">
                <div className="modern-card-title" style={{ fontSize: "0.9rem" }}>Actions</div>
                <div className="modern-card-icon" style={{ 
                  background: "rgba(139, 92, 246, 0.2)", 
                  color: "#8b5cf6",
                  width: "30px",
                  height: "30px",
                  fontSize: "1rem"
                }}>
                  🔄
                </div>
              </div>
              <div className="modern-card-content" style={{ textAlign: "center" }}>
                <button
                  className="modern-btn-primary"
                  onClick={fetchSchools}
                  disabled={loading}
                  style={{ 
                    width: "100%",
                    background: "#8b5cf6",
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    padding: "0.5rem"
                  }}
                >
                  {loading ? "🔄 Loading..." : "🔄 Refresh"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search & Schools List Card */}
        <div className="modern-dashboard-card">
          <div className="modern-card-header">
            <div className="modern-card-title">Schools Directory</div>
            <div className="modern-card-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
              📋
            </div>
          </div>
          <div className="modern-card-content">
            {/* Search Bar */}
            <div style={{ marginBottom: "1.5rem" }}>
              <input
                type="text"
                placeholder="Search schools by name, address, contact, or email... Press Enter to find exact match"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                  background: "#334155",
                  color: "#f1f5f9",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#475569"}
              />
              <div style={{ 
                fontSize: "0.85rem", 
                color: "#64748b", 
                marginTop: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>
                  {search ? `Showing ${filteredSchools.length} of ${schools.length} schools` : `${schools.length} schools total`}
                </span>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#3b82f6",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      textDecoration: "underline"
                    }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>

            {/* Schools Table */}
            {loading ? (
              <div style={{ 
                textAlign: "center", 
                padding: "3rem 2rem",
                color: "#94a3b8"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
                <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem" }}>Loading Schools...</h3>
                <p>Fetching the latest school directory data.</p>
              </div>
            ) : filteredSchools.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "3rem 2rem",
                color: "#94a3b8"
              }}>
                {search ? (
                  <>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
                    <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem" }}>No Schools Found</h3>
                    <p style={{ marginBottom: "1.5rem" }}>
                      No schools match your search for "{search}".
                    </p>
                    <button 
                      className="modern-btn-primary"
                      onClick={() => setSearch('')}
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📚</div>
                    <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem" }}>No Schools Available</h3>
                    <p style={{ marginBottom: "1.5rem" }}>
                      The school database appears to be empty.
                    </p>
                    <button 
                      className="modern-btn-primary"
                      onClick={fetchSchools}
                    >
                      🔄 Refresh Database
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ 
                border: "1px solid #475569",
                borderRadius: "8px",
                overflow: "hidden"
              }}>
                {/* Mobile Actions Row */}
                {isMobile && (
                  <div style={{ 
                    padding: "1rem",
                    background: "#475569",
                    borderBottom: "1px solid #475569"
                  }}>
                    <button
                      className="modern-btn-primary"
                      onClick={fetchSchools}
                      disabled={loading}
                      style={{ 
                        width: "100%",
                        background: "#8b5cf6",
                        opacity: loading ? 0.6 : 1,
                        cursor: loading ? "not-allowed" : "pointer"
                      }}
                    >
                      {loading ? "🔄 Loading..." : "🔄 Refresh Database"}
                    </button>
                  </div>
                )}

                {/* Table Container */}
                <div style={{ 
                  maxHeight: "600px", 
                  overflowY: "auto",
                  overflowX: "auto"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? "600px" : "auto" }}>
                    <thead>
                      <tr style={{ background: "#475569", position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ 
                          padding: "1rem 0.75rem", 
                          textAlign: "left",
                          borderRight: "1px solid #334155"
                        }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>
                            School Name
                          </span>
                        </th>
                        <th style={{ 
                          padding: "1rem 0.75rem", 
                          textAlign: "left",
                          borderRight: "1px solid #334155"
                        }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>
                            Address
                          </span>
                        </th>
                        <th style={{ 
                          padding: "1rem 0.75rem", 
                          textAlign: "left",
                          borderRight: "1px solid #334155"
                        }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>
                            Phone
                          </span>
                        </th>
                        <th style={{ 
                          padding: "1rem 0.75rem", 
                          textAlign: "left",
                          borderRight: "1px solid #334155"
                        }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>
                            Contact
                          </span>
                        </th>
                        <th style={{ 
                          padding: "1rem 0.75rem", 
                          textAlign: "left"
                        }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>
                            Email
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchools.map((school, index) => (
                        <tr 
                          key={school.id}
                          ref={el => (rowRefs.current[school.id] = el)}
                          style={{ 
                            background: index % 2 === 0 ? "rgba(51, 65, 85, 0.3)" : "rgba(30, 41, 59, 0.3)",
                            borderBottom: "1px solid #475569",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseEnter={(e) => e.target.closest('tr').style.background = "rgba(59, 130, 246, 0.1)"}
                          onMouseLeave={(e) => e.target.closest('tr').style.background = index % 2 === 0 ? "rgba(51, 65, 85, 0.3)" : "rgba(30, 41, 59, 0.3)"}
                        >
                          <td style={{ 
                            padding: "1rem 0.75rem", 
                            borderRight: "1px solid #475569",
                            verticalAlign: "top"
                          }}>
                            <div style={{ 
                              color: "#f1f5f9", 
                              fontWeight: "500", 
                              fontSize: "0.9rem",
                              lineHeight: "1.4"
                            }}>
                              {school.name}
                            </div>
                          </td>
                          <td style={{ 
                            padding: "1rem 0.75rem", 
                            borderRight: "1px solid #475569",
                            verticalAlign: "top"
                          }}>
                            <div style={{ 
                              color: "#e2e8f0", 
                              fontSize: "0.85rem",
                              lineHeight: "1.4"
                            }}>
                              {school.address}
                            </div>
                          </td>
                          <td style={{ 
                            padding: "1rem 0.75rem", 
                            borderRight: "1px solid #475569",
                            verticalAlign: "top"
                          }}>
                            <div style={{ 
                              color: "#94a3b8", 
                              fontSize: "0.85rem",
                              fontFamily: "monospace"
                            }}>
                              {school.phone}
                            </div>
                          </td>
                          <td style={{ 
                            padding: "1rem 0.75rem", 
                            borderRight: "1px solid #475569",
                            verticalAlign: "top"
                          }}>
                            <div style={{ 
                              color: "#e2e8f0", 
                              fontSize: "0.85rem",
                              lineHeight: "1.4"
                            }}>
                              {school.contact}
                            </div>
                          </td>
                          <td style={{ 
                            padding: "1rem 0.75rem",
                            verticalAlign: "top"
                          }}>
                            <a 
                              href={`mailto:${school.email}`}
                              style={{ 
                                color: "#3b82f6", 
                                fontSize: "0.85rem",
                                textDecoration: "none",
                                fontFamily: "monospace",
                                wordBreak: "break-all"
                              }}
                              onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                              onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                            >
                              {school.email}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}