import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import StatCard from './components/StatCard'
import Badge from './components/Badge'
import EmptyState from './components/EmptyState'
import api from './lib/api'

const EMPTY_STATS = {
  totalSchools: 0,
  totalEmails: 0,
  pendingEmails: 0,
  respondedEmails: 0,
}

/** Activity tier shown as a badge on each member card. */
function performanceTier(totalEmails) {
  if (totalEmails > 20) return { tone: 'success', label: 'High Performer' }
  if (totalEmails > 10) return { tone: 'warning', label: 'Active' }
  if (totalEmails > 0) return { tone: 'primary', label: 'Getting Started' }
  return { tone: 'neutral', label: 'Inactive' }
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function Team() {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()

  const [teamData, setTeamData] = useState([])
  const [myStats, setMyStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [teamError, setTeamError] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setTeamError('')

    // Personal stats and team stats are independent; a failure in one should
    // not blank the other, so they settle separately.
    const [mine, team] = await Promise.allSettled([
      Promise.all([api.get('/api/my-schools'), api.get('/api/sent-emails')]),
      api.get('/api/team-stats'),
    ])

    if (mine.status === 'fulfilled') {
      const [schools, emails] = mine.value
      if (Array.isArray(schools) && Array.isArray(emails)) {
        setMyStats({
          totalSchools: schools.length,
          totalEmails: emails.length,
          pendingEmails: emails.filter((e) => !e.responded && !e.followup_sent).length,
          respondedEmails: emails.filter((e) => e.responded).length,
        })
      }
    }

    if (team.status === 'fulfilled' && Array.isArray(team.value)) {
      const sorted = team.value
        .map((member) => ({ ...member, isCurrentUser: member.name === user.name }))
        .sort((a, b) => {
          if (a.isCurrentUser) return -1
          if (b.isCurrentUser) return 1
          return b.totalSchools + b.totalEmails - (a.totalSchools + a.totalEmails)
        })
      setTeamData(sorted)
    } else {
      // Fall back to showing just the signed-in user rather than an empty
      // directory. The previous fallback rebuilt the whole team's stats in the
      // browser by downloading /api/all-schools and /api/all-emails in full -
      // over 1,100 rows - to work around /api/team-stats not existing yet.
      // That endpoint ships now, so the fallback is an error path, not a
      // second implementation.
      setTeamError(
        team.status === 'rejected'
          ? team.reason?.message || 'Could not load team statistics.'
          : 'Could not load team statistics.',
      )
      setTeamData([
        {
          name: user.name,
          email: user.email,
          phone: user.phone || 'Not provided',
          role: user.admin ? 'Administrator' : 'Sales Associate',
          totalSchools: myStats.totalSchools,
          totalEmails: myStats.totalEmails,
          isCurrentUser: true,
        },
      ])
    }

    setLoading(false)
    // myStats is intentionally omitted: it is only read inside the fallback
    // branch, and including it would refetch every time the stats change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (accessToken && user) fetchData()
  }, [accessToken, user, fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const teamTotals = useMemo(
    () =>
      teamData.reduce(
        (totals, member) => ({
          totalSchools: totals.totalSchools + (member.totalSchools || 0),
          totalEmails: totals.totalEmails + (member.totalEmails || 0),
        }),
        { totalSchools: 0, totalEmails: 0 },
      ),
    [teamData],
  )

  if (!user) {
    return (
      <AppLayout title="Team">
        <Card>
          <EmptyState
            icon="🔐"
            title="Authentication Required"
            message="Please log in to access the Team Directory and view team member information."
            action={
              <button className="modern-btn-primary" onClick={() => navigate('/account')}>
                 Login to Continue
              </button>
            }
          />
        </Card>
      </AppLayout>
    )
  }

  const refreshButton = (
    <button className="modern-btn-primary" onClick={handleRefresh} disabled={refreshing}>
      {refreshing ? 'Refreshing...' : 'Refresh Data'}
    </button>
  )

  return (
    <AppLayout
      title="Team"
      subtitle="Contact information and performance across the team"
      actions={refreshButton}
    >
      <div className="ui-stat-grid">
        <StatCard
          label="Your Schools"
          icon="🏫"
          value={myStats.totalSchools}
          caption="Schools Added"
        />
        <StatCard
          label="Your Emails"
          icon="📧"
          tone="success"
          value={myStats.totalEmails}
          caption="Emails Sent"
        />
        <StatCard
          label="Pending"
          icon="⏳"
          tone="warning"
          value={myStats.pendingEmails}
          caption="Pending"
        />
        <StatCard
          label="Responses"
          icon="✅"
          tone="info"
          value={myStats.respondedEmails}
          caption="Responded"
        />
      </div>

      <Card title={`Team Directory (${teamData.length} members)`} icon="👥" tone="warning">
        {teamError && (
          <div className="ui-alert tone-warning" role="status">
            {teamError} Showing your own record only.
          </div>
        )}

        {loading ? (
          <EmptyState
            icon="⏳"
            title="Loading Team Data..."
            message="Fetching the latest team information and statistics."
          />
        ) : teamData.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No Team Data Available"
            message="Unable to load team information at this time."
            action={refreshButton}
          />
        ) : (
          <>
            {teamData.length > 1 && (
              <div className="ui-summary-panel">
                <h4 className="ui-summary-title">Team Performance Summary</h4>
                <div className="ui-metric-row">
                  <div className="ui-metric tone-primary">
                    <div className="ui-metric-value">{teamTotals.totalSchools}</div>
                    <div className="ui-metric-label">Total Schools</div>
                  </div>
                  <div className="ui-metric tone-success">
                    <div className="ui-metric-value">{teamTotals.totalEmails}</div>
                    <div className="ui-metric-label">Total Emails</div>
                  </div>
                  <div className="ui-metric tone-warning">
                    <div className="ui-metric-value">{teamData.length}</div>
                    <div className="ui-metric-label">Team Members</div>
                  </div>
                  <div className="ui-metric tone-info">
                    <div className="ui-metric-value">
                      {teamTotals.totalSchools > 0
                        ? Math.round((teamTotals.totalEmails / teamTotals.totalSchools) * 100) / 100
                        : 0}
                    </div>
                    <div className="ui-metric-label">Emails per School</div>
                  </div>
                </div>
              </div>
            )}

            <div className="ui-toolbar-row">
              <div className="ui-toolbar-hint">
                Complete team directory with contact information and performance data
              </div>
            </div>

            <div className="ui-person-grid">
              {teamData.map((member) => {
                const isAdmin =
                  member.role === 'Administrator' ||
                  (member.name === user.name && user.admin)
                const tier = performanceTier(member.totalEmails || 0)

                return (
                  <div
                    key={member.email || member.name}
                    className={`ui-person-card${member.isCurrentUser ? ' is-current-user' : ''}`}
                  >
                    <div className="ui-person-head">
                      <div className="ui-person-avatar" aria-hidden="true">
                        {initials(member.name)}
                      </div>
                      <div className="ui-person-identity">
                        <div className="ui-person-name">
                          {member.name}
                          {member.isCurrentUser && (
                            <Badge compact>YOU</Badge>
                          )}
                        </div>
                        <div className={`ui-person-role${isAdmin ? ' is-admin' : ''}`}>
                          {isAdmin ? 'Administrator' : 'Sales Associate'}
                        </div>
                      </div>
                    </div>

                    <div className="ui-person-contact">
                      <div>{member.email}</div>
                      <div>{member.phone}</div>
                    </div>

                    <div className="ui-metric-row">
                      <div className="ui-metric tone-primary">
                        <div className="ui-metric-value">{member.totalSchools}</div>
                        <div className="ui-metric-label">Schools</div>
                      </div>
                      <div className="ui-metric tone-success">
                        <div className="ui-metric-value">{member.totalEmails}</div>
                        <div className="ui-metric-label">Emails</div>
                      </div>
                    </div>

                    <div className="ui-person-footer">
                      <Badge tone={tier.tone}>{tier.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>
    </AppLayout>
  )
}
