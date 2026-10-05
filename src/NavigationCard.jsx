import { NavLink } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Icon from './components/Icon'

const groups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', path: '/', icon: 'home' },
      { label: 'School Finder', path: '/finder', icon: 'search' },
      { label: 'School Map', path: '/map', icon: 'map' },
      { label: 'Schools', path: '/schools', icon: 'school' },
      { label: 'Email Center', path: '/emails', icon: 'mail' },
    ],
  },
  {
    label: 'People & settings',
    items: [
      { label: 'Team', path: '/team', icon: 'team' },
      { label: 'Account', path: '/account', icon: 'settings' },
    ],
  },
]

export default function NavigationCard({ collapsed = false, onToggle }) {
  const { user } = useAuth()

  return (
    <div className="nav-sidebar">
      <div className="nav-sidebar-logo">
        <img src="/PSA_logo.png" alt="PSA" />
        {!collapsed && <div className="nav-brand-copy"><div className="nav-sidebar-title">PSA Sales</div><div className="nav-sidebar-subtitle">Sales workspace</div></div>}
      </div>

      <nav aria-label="Main navigation" className="nav-groups">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            {!collapsed && <div className="nav-group-label">{group.label}</div>}
            <ul className="nav-menu">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => `nav-menu-link${isActive ? ' active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon name={item.icon} size={19} className="nav-menu-icon" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="nav-user-section">
        <NavLink to="/account" className="nav-user-info" title={collapsed ? (user?.name || 'Sign in') : undefined}>
          <span className="nav-user-avatar" aria-hidden="true">{user ? user.name.charAt(0).toUpperCase() : <Icon name="user" size={18} />}</span>
          {!collapsed && <span className="nav-user-details"><strong>{user?.name || 'Sign in'}</strong><span>{user ? (user.admin ? 'Administrator' : 'Sales associate') : 'PSA Sales'}</span></span>}
        </NavLink>
        <button type="button" className="nav-collapse" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  )
}
