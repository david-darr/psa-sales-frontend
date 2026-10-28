import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import EmployeeInvites from './components/EmployeeInvites'
import JoinLinks from './components/JoinLinks'
import MailCredentialMigration from './components/MailCredentialMigration'
import Icon from './components/Icon'
import { Panel, ErrorNotice } from './components/WorkspaceUI'
import { UI_PREVIEW } from './lib/previewMode'
import { useResource } from './lib/crm'
import api from './lib/api'

export default function Account() {
  const { user, login, logout, markMailConnected, updateProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''))
  const inviteToken = hashParams.get('invite') || ''
  const joinToken = inviteToken ? '' : hashParams.get('join') || ''
  const signupToken = inviteToken || joinToken
  const [register, setRegister] = useState(Boolean(signupToken))
  const [joinValid, setJoinValid] = useState(null)
  useEffect(() => {
    if (!joinToken) return
    api
      .post('/api/join-links/check', { token: joinToken }, { auth: false })
      .then((data) => setJoinValid(Boolean(data?.valid)))
      .catch(() => setJoinValid(null))
  }, [joinToken])
  const [form, setForm] = useState({
    name: user?.name || '',
    email: '',
    phone: user?.phone || '',
    password: '',
  })
  const [tab, setTab] = useState('profile')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const sync = useResource(user ? '/api/mail-sync-status' : null)
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }))
  const authenticate = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const data = await api.post(
        register ? '/api/register' : '/api/login',
        register
          ? { ...form, ...(inviteToken ? { invite_token: inviteToken } : { join_token: joinToken }) }
          : { email: form.email, password: form.password },
        { auth: false },
      )
      if (data.access_token) {
        login(data.access_token, data.user)
        navigate(location.state?.from?.pathname || '/', { replace: true })
      } else if (register) {
        // Sign straight in so a new rep lands on their setup checklist.
        const session = await api.post(
          '/api/login',
          { email: form.email, password: form.password },
          { auth: false },
        )
        login(session.access_token, session.user)
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const saveProfile = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const data = await api.patch('/api/crm/profile', {
        name: form.name,
        phone: form.phone,
      })
      updateProfile(data)
      setNotice('Your profile has been updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const saveMail = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api.post('/api/email-settings', {
        email_password: password.replace(/\s/g, ''),
      })
      markMailConnected()
      setPassword('')
      sync.reload()
      setNotice('Email connection saved. Check replies to verify it.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const checkMail = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const data = await api.post('/api/check-email-replies')
      sync.reload()
      setNotice(
        data.ready
          ? 'Connection verified. Your reply check is current.'
          : 'Connected. ' +
              data.pending_count +
              ' messages remain to be checked in Outreach.',
      )
    } catch (err) {
      setError(err.message)
      sync.reload()
    } finally {
      setBusy(false)
    }
  }
  if (!user)
    return (
      <div className="auth-screen">
        <section className="auth-brand">
          <div className="auth-logo">
            <img src="/PSA_logo.png" alt="Players Sports Academy" />
            <strong>PSA Sales</strong>
          </div>
          <div>
            <div className="workspace-kicker">BETTER TOGETHER</div>
            <h1>
              Build relationships.
              <br />
              Create opportunities.
            </h1>
            <p>
              A shared workspace for the people bringing PSA programs to more
              schools and communities.
            </p>
          </div>
          <small>THE PLAYERS SPORTS ACADEMY</small>
        </section>
        <main className="auth-main">
          <div className="auth-form">
            <span className="workspace-kicker">YOUR SALES WORKSPACE</span>
            <h2>
              {register ? 'Your next chapter starts here.' : 'Welcome back.'}
            </h2>
            <p className="workspace-subtle" style={{ margin: '10px 0 28px' }}>
              {!register
                ? 'Sign in to pick up where you left off.'
                : inviteToken
                  ? 'Use the email address your PSA administrator invited.'
                  : 'Create your account with your work email. Use at least 8 characters for your password.'}
            </p>
            <ErrorNotice error={error} />
            {register && joinValid === false && (
              <div className="ui-alert tone-danger" role="alert">
                This sign-up link has expired or was turned off. Ask your PSA
                administrator for a new one.
              </div>
            )}
            {notice && (
              <div className="ui-alert tone-success" role="status">
                {notice}
              </div>
            )}
            <form onSubmit={authenticate} className="workspace-form">
              {register && (
                <>
                  <label className="workspace-field">
                    Full name
                    <input
                      autoFocus
                      className="ui-input"
                      required
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => change('name', e.target.value)}
                    />
                  </label>
                  <label className="workspace-field">
                    Phone (optional)
                    <input
                      className="ui-input"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => change('phone', e.target.value)}
                    />
                  </label>
                </>
              )}
              <label className="workspace-field">
                Work email
                <input
                  autoFocus={!register}
                  className="ui-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => change('email', e.target.value)}
                  placeholder="you@company.com"
                />
              </label>
              <label className="workspace-field">
                Password
                <input
                  className="ui-input"
                  type="password"
                  required
                  autoComplete={register ? 'new-password' : 'current-password'}
                  minLength={register ? 8 : undefined}
                  value={form.password}
                  onChange={(e) => change('password', e.target.value)}
                />
              </label>
              <button className="modern-btn-primary is-large" disabled={busy}>
                {busy
                  ? 'Please wait...'
                  : register
                    ? 'Create account'
                    : 'Sign in'}
                <Icon name="arrow" size={15} />
              </button>
            </form>
            <p className="workspace-subtle" style={{ marginTop: 23 }}>
              {signupToken ? (
                <button
                  className="ui-link-button"
                  onClick={() => {
                    setRegister(!register)
                    setError('')
                  }}
                >
                  {register
                    ? 'Already have an account? Sign in'
                    : 'New here? Create your account'}
                </button>
              ) : (
                'New to the team? Ask your PSA administrator for the sign-up link.'
              )}
            </p>
          </div>
        </main>
      </div>
    )
  return (
    <AppLayout
      title="Settings"
      subtitle="Make your workspace work for you."
      actions={
        <button
          className="modern-btn-primary is-neutral"
          onClick={() => {
            logout()
            navigate('/account')
          }}
        >
          {UI_PREVIEW ? 'Exit demo' : 'Sign out'}
        </button>
      }
    >
      <ErrorNotice error={error} />
      {notice && (
        <div
          className="ui-alert tone-success"
          role="status"
          style={{ marginBottom: 18 }}
        >
          {notice}
        </div>
      )}
      <div className="workspace-tabs" aria-label="Settings views">
        {[
          ['profile', 'My profile'],
          ['mail', 'Email connection'],
          ...(user.admin ? [['admin', 'Administration']] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'is-active' : ''}
            onClick={() => {
              setTab(key)
              setError('')
              setNotice('')
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'profile' && (
        <div style={{ maxWidth: 760 }}>
          <Panel
            title="Your profile"
            description="Your teammates use these details to recognize and reach you."
          >
            <div className="workspace-inline" style={{ marginBottom: 25 }}>
              <span
                className="app-avatar"
                style={{ width: 44, height: 44, fontSize: '.85rem' }}
              >
                {user.name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div>
                <strong style={{ fontSize: '.88rem' }}>{user.name}</strong>
                <div className="workspace-subtle">
                  {user.admin ? 'Administrator' : 'Sales representative'}
                </div>
              </div>
            </div>
            <form onSubmit={saveProfile} className="workspace-form">
              <div className="workspace-form-grid">
                <label className="workspace-field">
                  Full name
                  <input
                    className="ui-input"
                    maxLength={120}
                    required
                    value={form.name}
                    onChange={(e) => change('name', e.target.value)}
                  />
                </label>
                <label className="workspace-field">
                  Phone
                  <input
                    className="ui-input"
                    type="tel"
                    maxLength={50}
                    value={form.phone}
                    onChange={(e) => change('phone', e.target.value)}
                  />
                </label>
              </div>
              <label className="workspace-field">
                Work email
                <input className="ui-input" value={user.email} readOnly />
                <span className="workspace-subtle">
                  Contact your administrator if your email address changes.
                </span>
              </label>
              <div>
                <button className="modern-btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}
      {tab === 'mail' && (
        <div className="workspace-grid equal">
          <Panel
            title="Your Gmail connection"
            description="Send school outreach from your own mailbox."
          >
            <div
              className="workspace-inline"
              style={{ justifyContent: 'space-between', marginBottom: 23 }}
            >
              <strong style={{ fontSize: '.8rem' }}>{user.email}</strong>
              <span
                className={
                  'stage-badge ' + (sync.data?.ready ? 'stage-partner' : '')
                }
              >
                {sync.data?.ready
                  ? 'Verified'
                  : user.mail_connected
                    ? 'Configured'
                    : 'Not connected'}
              </span>
            </div>
            <ErrorNotice error={sync.data?.error || sync.error} />
            <form className="workspace-form" onSubmit={saveMail}>
              <label className="workspace-field">
                {user.mail_connected
                  ? 'Replace Gmail app password'
                  : 'Gmail app password'}
                <input
                  className="ui-input"
                  type="password"
                  autoComplete="off"
                  disabled={UI_PREVIEW}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    UI_PREVIEW
                      ? 'Credential entry disabled in demo'
                      : 'Your 16-character app password'
                  }
                />
              </label>
              <p className="workspace-subtle">
                PSA stores this app password encrypted. Use a Google app
                password, separate from the password you use to sign in to
                Gmail.
              </p>
              <div className="workspace-actions">
                <button
                  className="modern-btn-primary"
                  disabled={UI_PREVIEW || busy || !password.trim()}
                >
                  {busy ? 'Please wait...' : 'Save connection'}
                </button>
                {user.mail_connected && (
                  <button
                    type="button"
                    className="modern-btn-primary is-neutral"
                    disabled={busy}
                    onClick={checkMail}
                  >
                    Check replies
                  </button>
                )}
              </div>
            </form>
          </Panel>
          <Panel title="Getting connected">
            <ol
              className="workspace-form"
              style={{ paddingLeft: 18, fontSize: '.8rem' }}
            >
              <li>
                Turn on 2-Step Verification for the Google account you use for
                PSA outreach.
              </li>
              <li>
                Open{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google App Passwords
                </a>{' '}
                and create a password for PSA Sales.
              </li>
              <li>
                Paste it in the connection field, save it, then check replies to
                verify the connection.
              </li>
            </ol>
            <p className="workspace-subtle" style={{ marginTop: 23 }}>
              If app passwords are unavailable on your account, ask your Google
              Workspace administrator for help. You can revoke access from
              Google at any time.
            </p>
          </Panel>
        </div>
      )}
      {tab === 'admin' && user.admin && (
        <div className="workspace-form">
          <JoinLinks />
          <EmployeeInvites />
          <MailCredentialMigration />
        </div>
      )}
    </AppLayout>
  )
}
