import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from "./AuthContext"

export default function NavigationCard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const navigationItems = [
    {
      label: "Home",
      path: "/",
      icon: "🏠",
      protected: false
    },
    {
      label: "Map",
      path: "/map",
      icon: "🗺️",
      protected: false
    },
    {
      label: "School Finder",
      path: "/finder",
      icon: "🔍", 
      protected: false
    },
    {
      label: "Email Center",
      path: "/emails",
      icon: "📧",
      protected: true,
      badge: user ? "New" : null
    },
    {
      label: "Schools Database",
      path: "/schools", 
      icon: "🏫",
      protected: true
    },
    {
      label: "Team Analytics", 
      path: "/team",
      icon: "📊",
      protected: true
    },
    {
      label: "Account Settings",
      path: "/account",
      icon: "⚙️",
      protected: false
    }
  ]

  const handleNavigation = (item) => {
    if (item.protected && !user) {
      navigate("/account")
    } else {
      navigate(item.path)
    }
  }

  return (
    <div className="nav-sidebar">
      <div className="nav-sidebar-logo">
        <img src="/PSA_logo.png" alt="PSA Logo" />
        <div>
          <div className="nav-sidebar-title">PSA SALES</div>
          <div className="nav-sidebar-subtitle">Management Platform</div>
        </div>
      </div>
      
      <ul className="nav-menu">
        {navigationItems.map((item, index) => (
          <li 
            key={index} 
            className={`nav-menu-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <button
              className="nav-menu-link"
              onClick={() => handleNavigation(item)}
            >
              <span className="nav-menu-icon">{item.icon}</span>
              {item.label}
              {item.protected && !user && (
                <span className="nav-menu-badge">🔒</span>
              )}
              {item.badge && user && (
                <span className="nav-menu-badge">{item.badge}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      
      {user && (
        <div className="nav-user-section">
          <div className="nav-user-info">
            <div className="nav-user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="nav-user-details">
              <h4>{user.name}</h4>
              <p>{user.admin ? 'Administrator' : 'Sales Associate'}</p>
            </div>
          </div>
        </div>
      )}
      
      {!user && (
        <div className="nav-user-section">
          <button 
            className="modern-btn-primary"
            onClick={() => navigate("/account")}
            style={{ width: '100%' }}
          >
            🔐 Login to Continue
          </button>
        </div>
      )}
    </div>
  )
}