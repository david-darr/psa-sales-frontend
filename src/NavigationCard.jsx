import { NavLink } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Icon from './components/Icon'

const groups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', path: '/', icon: 'grid' },
      { label: 'My tasks', path: '/tasks', icon: 'check' },
      { label: 'Schools', path: '/schools', icon: 'school' },
      { label: 'Pipeline', path: '/pipeline', icon: 'pipeline' },
      { label: 'Accounts', path: '/accounts', icon: 'team' },
      { label: 'Outreach', path: '/emails', icon: 'mail' },
    ],
  },
  {
    label: 'Grow your reach',
    items: [
      { label: 'Discover schools', path: '/finder', icon: 'search' },
      { label: 'Territory map', path: '/map', icon: 'map' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Team', path: '/team', icon: 'team' },
      { label: 'Sales admin', path: '/admin', icon: 'shield', admin: true },
      { label: 'Settings', path: '/account', icon: 'settings' },
    ],
  },
]

export default function NavigationCard({ collapsed = false, onToggle }) {
  const { user } = useAuth()

  return (
    <div className="nav-sidebar">
      <div className="nav-sidebar-logo">
        <img src="/PSA_logo.png" alt="PSA" />
        {!collapsed && (
          <div className="nav-brand-copy">
            <div className="nav-sidebar-title">PSA Sales</div>
            <div className="nav-sidebar-subtitle">Sales workspace</div>
          </div>
        )}
      </div>

      <nav aria-label="Main navigation" className="nav-groups">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            {!collapsed && <div className="nav-group-label">{group.label}</div>}
            <ul className="nav-menu">
              {group.items.filter((item) => !item.admin || user?.admin).map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `nav-menu-link${isActive ? ' active' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      name={item.icon}
                      size={19}
                      className="nav-menu-icon"
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="nav-user-section">
        {!collapsed && (
          <div className="nav-workspace-note">
            <strong>Every connection counts.</strong>Find the right school.
            Build the next partnership.
            <NavLink to="/finder">
              Discover opportunities <Icon name="arrow" size={13} />
            </NavLink>
          </div>
        )}
        <NavLink
          to="/account"
          className="nav-user-info"
          title={collapsed ? user?.name || 'Sign in' : undefined}
        >
          <span className="nav-user-avatar" aria-hidden="true">
            {user ? (
              user.name.charAt(0).toUpperCase()
            ) : (
              <Icon name="user" size={18} />
            )}
          </span>
          {!collapsed && (
            <span className="nav-user-details">
              <strong>{user?.name || 'Sign in'}</strong>
              <span>
                {user
                  ? user.admin
                    ? 'Administrator'
                    : 'Sales associate'
                  : 'PSA Sales'}
              </span>
            </span>
          )}
        </NavLink>
        <button
          type="button"
          className="nav-collapse"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name="sidebar" size={14} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  )
}
