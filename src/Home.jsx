import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer } from 'react-leaflet'
import { useAuth } from './AuthContext'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import Badge from './components/Badge'
import EmptyState from './components/EmptyState'
import SchoolMarkers from './components/SchoolMarkers'
import MapLegend from './components/MapLegend'
import { MAP_CENTER, countLayers } from './lib/mapLayers'
import api from './lib/api'

const RECENT_EMAIL_COUNT = 4

/** Replies / follow-up / nothing-yet, as a tone plus a label. */
function emailStatus(email) {
  if (email.responded) return { tone: 'success', label: '✅ Replied' }
  if (email.followup_sent) return { tone: 'warning', label: '📧 Follow-up' }
  return { tone: 'neutral', label: '⏳ Pending' }
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function Home() {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()

  const [schools, setSchools] = useState([])
  const [emails, setEmails] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)

  const [team, setTeam] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)

  const [mapSchools, setMapSchools] = useState({})
  const [mapLoading, setMapLoading] = useState(true)

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  )

  /* ---------------- Data ---------------- */

  // One pair of requests for both the stats tiles and the recent-emails list.
  // Previously fetchUserStats and fetchRecentEmails each fetched /api/my-schools
  // and /api/sent-emails separately, so loading the dashboard made four
  // requests for two resources - and both ran again on every `user` change.
  const fetchOwnData = useCallback(async () => {
    if (!accessToken) {
      setStatsLoading(false)
      return
    }
    setStatsLoading(true)
    try {
      const [schoolsData, emailsData] = await Promise.all([
        api.get('/api/my-schools'),
        api.get('/api/sent-emails'),
      ])
      setSchools(Array.isArray(schoolsData) ? schoolsData : [])
      setEmails(Array.isArray(emailsData) ? emailsData : [])
    } catch {
      setSchools([])
      setEmails([])
    } finally {
      setStatsLoading(false)
    }
  }, [accessToken])

  const fetchTeam = useCallback(async () => {
    if (!accessToken) {
      setTeamLoading(false)
      return
    }
    setTeamLoading(true)
    try {
      const data = await api.get('/api/team-stats')
      setTeam(Array.isArray(data) ? data : [])
    } catch {
      setTeam([])
    } finally {
      setTeamLoading(false)
    }
  }, [accessToken])

  const fetchMapSchools = useCallback(async () => {
    setMapLoading(true)
    try {
      const data = await api.get('/api/map-schools')
      setMapSchools(data && typeof data === 'object' ? data : {})
    } catch {
      setMapSchools({})
    } finally {
      setMapLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOwnData()
  }, [fetchOwnData])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  useEffect(() => {
    fetchMapSchools()
  }, [fetchMapSchools])

  /* ---------------- Derived ---------------- */

  const stats = useMemo(
    () => ({
      totalSchools: schools.length,
      totalEmails: emails.length,
      pendingEmails: emails.filter((e) => !e.responded && !e.followup_sent).length,
      respondedEmails: emails.filter((e) => e.responded).length,
    }),
    [schools, emails],
  )

  // Contact names come from the schools list, matched on email address.
  const recentEmails = useMemo(() => {
    const byEmail = new Map(schools.map((s) => [s.email, s]))
    return [...emails]
      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
      .slice(0, RECENT_EMAIL_COUNT)
      .map((email) => {
        const school = byEmail.get(email.school_email)
        return {
          ...email,
          contact_name: school?.contact_name || 'Unknown',
          school_display_name: school?.school_name || email.school_name,
        }
      })
  }, [emails, schools])

  const topTeam = useMemo(
    () =>
      [...team]
        .sort((a, b) => b.totalSchools + b.totalEmails - (a.totalSchools + a.totalEmails))
        .slice(0, 4),
    [team],
  )

  const mapCount = useMemo(() => countLayers(mapSchools).total, [mapSchools])

  const loginPrompt = (label = '🔐 Login') => (
    <button className="modern-btn-primary ui-block" onClick={() => navigate('/account')}>
      {label}
    </button>
  )

  return (
    <AppLayout title="HOME" subtitle={currentDate}>
      <div className="ui-dashboard-grid">
        {/* ---------------- Welcome ---------------- */}
        <Card title={`Welcome${user ? `, ${user.name}!` : '!'}`} icon="👋">
          {user ? (
            <div className="ui-center" style={{ padding: 'var(--space-5) 0' }}>
              <div className="ui-profile-name">{user.name}</div>
              <Badge tone={user.admin ? 'warning' : 'info'}>
                {user.admin ? '👑 Administrator' : '📊 Sales Associate'}
              </Badge>
            </div>
          ) : (
            <div className="ui-center" style={{ padding: 'var(--space-4) 0' }}>
              <p style={{ marginBottom: 'var(--space-4)', color: '#94a3b8' }}>
                Welcome to PSA Sales Platform!
              </p>
              {loginPrompt('🔐 Login to Continue')}
            </div>
          )}
        </Card>

        {/* ---------------- Your statistics ---------------- */}
        <Card title="Your Statistics" icon="📊">
          {!user ? (
            <div className="ui-center" style={{ padding: 'var(--space-5) 0', color: '#94a3b8' }}>
              <p style={{ marginBottom: 'var(--space-4)' }}>Login to view your statistics</p>
              {loginPrompt()}
            </div>
          ) : statsLoading ? (
            <div className="ui-center" style={{ padding: 'var(--space-5) 0', color: '#94a3b8' }}>
              Loading your statistics...
            </div>
          ) : (
            <div className="ui-metric-row">
              <div className="ui-metric tone-primary">
                <div className="ui-metric-value">{stats.totalSchools}</div>
                <div className="ui-metric-label">Schools Added</div>
              </div>
              <div className="ui-metric tone-success">
                <div className="ui-metric-value">{stats.totalEmails}</div>
                <div className="ui-metric-label">Emails Sent</div>
              </div>
              <div className="ui-metric tone-warning">
                <div className="ui-metric-value">{stats.pendingEmails}</div>
                <div className="ui-metric-label">Pending</div>
              </div>
              <div className="ui-metric tone-info">
                <div className="ui-metric-value">{stats.respondedEmails}</div>
                <div className="ui-metric-label">Responded</div>
              </div>
            </div>
          )}
        </Card>

        {/* ---------------- Mini map ----------------
            One card for every screen size. There used to be two near-identical
            copies of this, gated on isMobile, and they had drifted: the mobile
            one plotted only three of the five layers and capped each at 10. */}
        <Card title="School Locations" icon="🗺️" tone="success">
          {mapLoading ? (
            <div
              className="ui-center"
              style={{ height: '200px', display: 'grid', placeItems: 'center', color: '#94a3b8' }}
            >
              Loading map...
            </div>
          ) : mapCount === 0 ? (
            <EmptyState
              icon="🗺️"
              title="No school locations available"
              message="Open the map to refresh school locations."
            />
          ) : (
            <>
              <div className="ui-map-canvas is-mini">
                <MapContainer
                  center={MAP_CENTER}
                  zoom={9}
                  style={{ width: '100%', height: '100%' }}
                  scrollWheelZoom={false}
                  doubleClickZoom={false}
                  dragging={false}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  <SchoolMarkers schools={mapSchools} small withPopups={false} />
                </MapContainer>
              </div>
              <MapLegend schools={mapSchools} compact />
            </>
          )}
          <button
            className="modern-btn-primary is-success ui-block"
            onClick={() => navigate('/map')}
          >
            View Full Map →
          </button>
        </Card>
      </div>

      <div className="ui-two-col">
        {/* ---------------- Recent emails ---------------- */}
        <Card title="Recent Emails" icon="📧">
          {!user ? (
            <div className="ui-center" style={{ padding: 'var(--space-5) 0', color: '#94a3b8' }}>
              <p style={{ marginBottom: 'var(--space-4)' }}>Login to view your emails</p>
              {loginPrompt()}
            </div>
          ) : statsLoading ? (
            <div className="ui-center" style={{ padding: 'var(--space-5) 0', color: '#94a3b8' }}>
              Loading recent emails...
            </div>
          ) : recentEmails.length === 0 ? (
            <EmptyState
              icon="📧"
              title="No emails sent yet"
              action={
                <button
                  className="modern-btn-primary ui-block"
                  onClick={() => navigate('/emails')}
                >
                  Send Your First Email →
                </button>
              }
            />
          ) : (
            <>
              <div className="ui-field-label">Last {recentEmails.length} emails sent:</div>
              {recentEmails.map((email) => {
                const status = emailStatus(email)
                return (
                  <div key={email.id} className="ui-feed-item">
                    <div className="ui-selectable-title">{email.school_display_name}</div>
                    <div className="ui-selectable-meta">📧 {email.school_email}</div>
                    <div className="ui-selectable-meta">👤 {email.contact_name}</div>
                    <div className="ui-feed-footer">
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        📅 {new Date(email.sent_at).toLocaleDateString()}
                      </span>
                      <Badge tone={status.tone} compact>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
              <div className="ui-center" style={{ marginTop: 'var(--space-4)' }}>
                <button className="ui-link-button" onClick={() => navigate('/emails')}>
                  View all emails
                </button>
              </div>
            </>
          )}
        </Card>

        {/* ---------------- Team ----------------
            Real figures from /api/team-stats. This card previously rendered a
            hardcoded array of four invented people ("John Smith", "Sarah
            Johnson", "Mike Davis", "Emily Chen") with invented school and
            email counts, shown to actual staff as if it were live data. */}
        <Card title="Team" icon="👥" tone="warning">
          {!user ? (
            <div className="ui-center" style={{ padding: 'var(--space-5) 0', color: '#94a3b8' }}>
              <p style={{ marginBottom: 'var(--space-4)' }}>Login to view your team</p>
              {loginPrompt()}
            </div>
          ) : teamLoading ? (
            <div className="ui-center" style={{ padding: 'var(--space-5) 0', color: '#94a3b8' }}>
              Loading team...
            </div>
          ) : topTeam.length === 0 ? (
            <EmptyState icon="👥" title="No team data available" />
          ) : (
            <>
              <div className="ui-feed-grid">
                {topTeam.map((member) => (
                  <div key={member.email || member.name} className="ui-feed-item">
                    <div className="ui-feed-header">
                      <div>
                        <div className="ui-selectable-title">{member.name}</div>
                        <div className="ui-selectable-meta">{member.role}</div>
                      </div>
                      <div className="ui-feed-avatar" aria-hidden="true">
                        {initials(member.name)}
                      </div>
                    </div>
                    <div className="ui-feed-footer">
                      <span>
                        Schools:{' '}
                        <strong style={{ color: 'var(--color-primary)' }}>
                          {member.totalSchools}
                        </strong>
                      </span>
                      <span>
                        Emails:{' '}
                        <strong style={{ color: 'var(--color-success)' }}>
                          {member.totalEmails}
                        </strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="modern-btn-primary is-warning ui-block"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => navigate('/team')}
              >
                View Team Analytics →
              </button>
            </>
          )}
        </Card>
      </div>

      {!user && (
        <Card title="Getting Started" icon="🚀">
          <p style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)' }}>
            Welcome to the PSA Sales Management Platform! This tool helps you:
          </p>
          <ul
            style={{
              marginBottom: 'var(--space-5)',
              paddingLeft: 'var(--space-5)',
              color: '#94a3b8',
              listStyle: 'disc',
            }}
          >
            <li>Manage your school database and contacts</li>
            <li>Send and track email campaigns</li>
            <li>Discover new schools in your area</li>
            <li>Monitor your sales performance</li>
            <li>Visualize school locations on interactive maps</li>
          </ul>
          <button className="modern-btn-primary" onClick={() => navigate('/account')}>
            Create Account or Login →
          </button>
        </Card>
      )}
    </AppLayout>
  )
}
