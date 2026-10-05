import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import Badge from './components/Badge'
import EmployeeInvites from './components/EmployeeInvites'
import MailCredentialMigration from './components/MailCredentialMigration'
import Icon from './components/Icon'
import api from './lib/api'
import { UI_PREVIEW } from './lib/previewMode'

const EMPTY_FORM = { name: '', email: '', phone: '', password: '' }

const FEATURES = [
  {
    icon: 'school',
    tone: 'primary',
    title: 'School Database',
    body: 'Manage your school contacts and track interactions',
  },
  {
    icon: 'mail',
    tone: 'success',
    title: 'Email Campaigns',
    body: 'Send and track email communications',
  },
  {
    icon: 'map',
    tone: 'warning',
    title: 'School Mapping',
    body: 'Visualize school locations and plan routes',
  },
  {
    icon: 'chart',
    tone: 'info',
    title: 'Analytics',
    body: 'Track your performance and team metrics',
  },
]

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function Account() {
  const { user, login, logout, markMailConnected } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const inviteToken = new URLSearchParams(location.hash.replace(/^#/, '')).get('invite') || ''

  const [isRegister, setIsRegister] = useState(Boolean(inviteToken))
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [appPassword, setAppPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Notices carry their own tone. The previous code inferred it by calling
  // `.includes("successful")` / `.includes("success")` on the message text,
  // so any backend error containing that substring rendered as a success.
  const [authNotice, setAuthNotice] = useState(null)
  const [emailNotice, setEmailNotice] = useState(null)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAuthNotice(null)
    setSubmitting(true)
    try {
      const body = isRegister ? { ...form, invite_token: inviteToken } : form
      const data = await api.post(isRegister ? '/api/register' : '/api/login', body, {
        auth: false,
      })

      if (data?.access_token) {
        login(data.access_token, data.user)
        navigate(location.state?.from?.pathname || '/', { replace: true })
        return
      }

      if (isRegister) {
        setIsRegister(false)
        setForm(EMPTY_FORM)
        setAuthNotice({ tone: 'success', text: 'Registration successful. Please log in.' })
        navigate('/account', { replace: true })
      }
    } catch (err) {
      setAuthNotice({ tone: 'danger', text: err.message || 'Unknown error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEmailSettings = async (e) => {
    e.preventDefault()
    setEmailNotice(null)
    setSavingPassword(true)
    try {
      await api.post('/api/email-settings', { email_password: appPassword })
      markMailConnected()
      setEmailNotice({ tone: 'success', text: 'Email settings saved successfully.' })
      setAppPassword('')
    } catch (err) {
      setEmailNotice({ tone: 'danger', text: err.message || 'Failed to save settings' })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  /* ---------------- Signed in ---------------- */

  if (user) {
    return (
      <AppLayout title="Account" subtitle="Your profile and email settings">
        <div className="ui-two-col">
          <Card title="Profile Information" icon="👤">
            <div className="ui-profile-head">
              <div className="ui-profile-avatar" aria-hidden="true">
                {initials(user.name)}
              </div>
              <div>
                <div className="ui-profile-name">{user.name}</div>
                <Badge tone={user.admin ? 'warning' : 'info'}>
                  {user.admin ? 'Administrator' : 'Sales Associate'}
                </Badge>
              </div>
            </div>

            <div className="ui-tile-stack">
              <div className="ui-info-tile tone-primary">
                <div className="ui-info-label">Email Address</div>
                <div className="ui-info-value">{user.email}</div>
              </div>
              <div className="ui-info-tile tone-primary">
                <div className="ui-info-label">Phone Number</div>
                <div className="ui-info-value">{user.phone || 'Not provided'}</div>
              </div>
            </div>

            <button
              className="modern-btn-primary is-danger is-large ui-block"
              onClick={handleLogout}
            >
              {UI_PREVIEW ? 'Exit preview' : 'Logout'}
            </button>
          </Card>

          <Card title="Email Configuration" icon="⚙️" tone="success">
            {emailNotice && (
              <div
                className={`ui-alert is-centered tone-${emailNotice.tone}`}
                role={emailNotice.tone === 'danger' ? 'alert' : 'status'}
              >
                {emailNotice.text}
              </div>
            )}

            <div className="ui-info-tile tone-warning" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="ui-info-title">Gmail App Password Required</div>
              <div className="ui-info-body">
                To send emails from your account, you need to configure a Gmail App Password.
                This is different from your regular Gmail password. You can revoke it in your
                Google Account settings.
              </div>
            </div>

            <div
              style={{
                color: 'var(--color-text-body)',
                fontSize: '0.9rem',
                marginBottom: 'var(--space-4)',
                lineHeight: 1.6,
              }}
            >
              <strong>How to get your Gmail App Password:</strong>
              <ol style={{ paddingLeft: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
                <li>Go to your Google Account settings</li>
                <li>Enable 2-Step Verification if not already enabled</li>
                <li>Go to Security → App passwords</li>
                <li>Generate a new app password for &quot;Mail&quot;</li>
                <li>Copy and paste that password below</li>
              </ol>
            </div>

            <form onSubmit={handleEmailSettings}>
              <input
                type="password"
                className="ui-input"
                style={{ fontFamily: 'ui-monospace, monospace', marginBottom: 'var(--space-4)' }}
                placeholder="Gmail App Password (16 characters)"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                autoComplete="off"
                required
                aria-label="Gmail app password"
              />
              <button
                type="submit"
                className="modern-btn-primary is-large ui-block"
                disabled={savingPassword || !appPassword.trim()}
              >
                {savingPassword ? 'Saving...' : 'Save Email Settings'}
              </button>
            </form>

            <div className="ui-info-tile tone-primary" style={{ marginTop: 'var(--space-5)' }}>
              <div className="ui-info-title">How this is used</div>
              <div className="ui-info-body">
                PSA saves an encrypted copy of this app password to send email and check for replies on your behalf.
                You can revoke it at any time from your Google Account settings.
              </div>
            </div>
          </Card>
        </div>
        {user.admin && <MailCredentialMigration />}
        {user.admin && <EmployeeInvites />}
      </AppLayout>
    )
  }

  /* ---------------- Signed out ---------------- */

  return (
    <AppLayout title="Account" subtitle="Sign in to your PSA workspace">
      <div className="ui-narrow">
        <Card title={isRegister ? 'Create Account' : 'Login'} icon={isRegister ? '✨' : '🔐'}>
          {authNotice && (
            <div
              className={`ui-alert is-centered tone-${authNotice.tone}`}
              role={authNotice.tone === 'danger' ? 'alert' : 'status'}
            >
              {authNotice.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="ui-form-stack">
            {isRegister && (
              <>
                <div className="ui-info-tile tone-primary">
                  <div className="ui-info-body">
                    Use the email address your PSA administrator invited.
                  </div>
                </div>
                <input
                  name="name"
                  className="ui-input"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                  aria-label="Full name"
                />
                <input
                  name="phone"
                  className="ui-input"
                  placeholder="Phone Number (optional)"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  aria-label="Phone number"
                />
              </>
            )}

            <input
              name="email"
              type="email"
              className="ui-input"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
              aria-label="Email address"
            />
            <input
              name="password"
              type="password"
              className="ui-input"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              aria-label="Password"
            />

            <button
              type="submit"
              className="modern-btn-primary is-large ui-block"
              disabled={submitting}
            >
              {submitting
                ? 'Please wait...'
                : isRegister
                  ? 'Create Account'
                  : 'Login'}
            </button>
          </form>

          {inviteToken ? (
            <button
              type="button"
              className="modern-btn-primary is-neutral is-large ui-block"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={() => {
                setIsRegister((r) => !r)
                setAuthNotice(null)
                setForm(EMPTY_FORM)
              }}
            >
              {isRegister ? 'Already have an account? Login' : 'Use your invitation to register'}
            </button>
          ) : (
            <p className="ui-info-body" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
              Need an account? Ask your PSA administrator for an invitation link.
            </p>
          )}

          {!isRegister && (
            <div
              className="ui-info-tile tone-primary"
              style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}
            >
              <div className="ui-info-title" style={{ fontSize: 'var(--text-lg)' }}>
                 Welcome to PSA Sales Platform
              </div>
              <div className="ui-info-body">
                Your tool for managing school relationships, sending email campaigns, and
                tracking your sales performance.
              </div>
            </div>
          )}
        </Card>

        <Card
          title="Platform Features"
          icon="🎯"
          tone="success"
          style={{ marginTop: 'var(--space-6)' }}
        >
          <div className="ui-feature-grid">
            {FEATURES.map((feature) => (
              <div key={feature.title} className={`ui-info-tile tone-${feature.tone}`}>
                <div className="ui-feature-icon" aria-hidden="true">
                  <Icon name={feature.icon} size={22} />
                </div>
                <div className="ui-feature-title">{feature.title}</div>
                <div className="ui-info-body">{feature.body}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
