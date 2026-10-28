import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Icon from './components/Icon'
import Modal from './components/Modal'
import EmployeeInvites from './components/EmployeeInvites'
import JoinLinks from './components/JoinLinks'
import { Empty, ErrorNotice } from './components/WorkspaceUI'
import { useResource } from './lib/crm'
import api from './lib/api'
import './styles/portfolio.css'

export default function Team() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useResource('/api/crm/team')
  const [search, setSearch] = useState('')
  const [invites, setInvites] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [roleError, setRoleError] = useState('')
  const [overrides, setOverrides] = useState({})
  const team = (data || []).map((member) =>
    overrides[member.id] ? { ...member, ...overrides[member.id] } : member,
  )
  const toggleAdmin = async (member) => {
    const next = !member.admin
    const verb = next ? 'give admin access to' : 'remove admin access from'
    if (!window.confirm(`Are you sure you want to ${verb} ${member.name}?`)) return
    setSavingId(member.id)
    setRoleError('')
    try {
      const updated = await api.patch(`/api/crm/team/${member.id}`, { admin: next })
      setOverrides((current) => ({
        ...current,
        [member.id]: { admin: updated.admin, role: updated.role },
      }))
    } catch (err) {
      setRoleError(err.message || 'Could not change that role.')
    } finally {
      setSavingId(null)
    }
  }
  const rows = team.filter((member) =>
    (member.name + ' ' + member.email)
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  const totalSchools = team.reduce((sum, member) => sum + member.schools, 0)
  const totalEmails = team.reduce((sum, member) => sum + member.sent, 0)
  const totalReplies = team.reduce((sum, member) => sum + member.responses, 0)
  return (
    <AppLayout
      title="Team"
      subtitle="Shared visibility. Clear ownership. Better relationships."
      actions={
        <>
          <button
            className="modern-btn-primary is-neutral"
            disabled={loading}
            onClick={reload}
          >
            <Icon name="refresh" size={14} />
            Refresh
          </button>
          {user.admin && (
            <button
              className="modern-btn-primary"
              onClick={() => setInvites(true)}
            >
              <Icon name="plus" size={14} />
              Invite teammate
            </button>
          )}
        </>
      }
    >
      <ErrorNotice error={error || roleError} />
      <div className="workspace-metrics">
        {[
          [
            'Team members',
            team.length,
            'team',
            'People building PSA relationships',
          ],
          ['Assigned schools', totalSchools, 'school', 'One owner per school'],
          ['Emails sent', totalEmails, 'mail', 'Tracked team outreach'],
          [
            'Response rate',
            (totalEmails ? Math.round((totalReplies / totalEmails) * 100) : 0) +
              '%',
            'chart',
            totalReplies + ' conversations with a response',
          ],
        ].map(([label, value, icon, hint]) => (
          <div className="workspace-metric" key={label}>
            <div className="workspace-metric-head">
              {label}
              <Icon name={icon} size={16} />
            </div>
            <div className="workspace-metric-value">
              {loading && !data ? '—' : value}
            </div>
            <div className="workspace-metric-foot">{hint}</div>
          </div>
        ))}
      </div>
      <section className="workspace-panel">
        <div className="workspace-toolbar">
          <label className="workspace-toolbar-search">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a teammate..."
              aria-label="Search team"
            />
          </label>
          <span className="workspace-toolbar-tail">{rows.length} members</span>
        </div>
        {rows.length ? (
          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Team member</th>
                  <th>Role</th>
                  <th>Schools</th>
                  <th>Sent</th>
                  <th>Responses</th>
                  <th>Overdue tasks</th>
                  <th>Mail connection</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((member) => (
                  <tr key={member.id}>
                    <td></td>
                    <td>
                      <div className="workspace-inline">
                        <span className="app-avatar">
                          {member.name
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <div style={{ fontWeight: 550 }}>
                          {member.name}
                          {member.id === user.id && (
                            <span
                              style={{
                                color: 'var(--color-text-muted)',
                                fontSize: '.62rem',
                                marginLeft: 6,
                              }}
                            >
                              You
                            </span>
                          )}
                          <small>{member.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="workspace-subtle">{member.role}</span>
                      {user.admin && member.id !== user.id && (
                        <button
                          type="button"
                          className="team-role-btn"
                          disabled={savingId === member.id}
                          onClick={() => toggleAdmin(member)}
                        >
                          {member.admin ? 'Remove admin' : 'Make admin'}
                        </button>
                      )}
                    </td>
                    <td>
                      {user.admin ? (
                        <Link to={'/schools?owner=' + member.id}>
                          {member.schools}
                        </Link>
                      ) : (
                        member.schools
                      )}
                    </td>
                    <td>{member.sent}</td>
                    <td>{member.responses}</td>
                    <td>
                      <span
                        className={
                          member.overdue
                            ? 'workspace-date is-overdue'
                            : 'workspace-subtle'
                        }
                      >
                        {member.overdue || '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          'stage-badge ' +
                          (member.mail_connected ? 'stage-partner' : '')
                        }
                      >
                        {member.mail_connected ? 'Configured' : 'Setup needed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={loading ? 'Loading your team...' : 'No matching teammates'}
            text="Try another name or email address."
            icon="team"
          />
        )}
      </section>
      {invites && (
        <Modal
          title="Invite and manage teammates"
          size="lg"
          onClose={() => setInvites(false)}
        >
          <JoinLinks />
          <EmployeeInvites />
        </Modal>
      )}
    </AppLayout>
  )
}
