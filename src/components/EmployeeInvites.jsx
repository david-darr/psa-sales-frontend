import { useCallback, useEffect, useState } from 'react'
import Card from './Card'
import api from '../lib/api'

export default function EmployeeInvites() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState([])
  const [inviteLink, setInviteLink] = useState('')
  const [createdId, setCreatedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const refresh = useCallback(async () => {
    const invitations = await api.get('/api/invitations')
    setPending(Array.isArray(invitations) ? invitations : [])
  }, [])

  useEffect(() => {
    refresh().catch((err) => setNotice({ tone: 'danger', text: err.message }))
  }, [refresh])

  async function createInvite(event) {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      const invitation = await api.post('/api/invitations', { email })
      const url = new URL('/account', window.location.origin)
      // A fragment stays out of server logs and HTTP referrer headers.
      url.hash = new URLSearchParams({ invite: invitation.token }).toString()
      setInviteLink(url.toString())
      setCreatedId(invitation.id)
      setEmail('')
      await refresh()
      setNotice({ tone: 'success', text: 'Invitation created. Share this link privately.' })
    } catch (err) {
      setNotice({ tone: 'danger', text: err.message || 'Could not create invitation.' })
    } finally {
      setBusy(false)
    }
  }

  async function revokeInvite(id) {
    setNotice(null)
    try {
      await api.del(`/api/invitations/${id}`)
      if (createdId === id) {
        setInviteLink('')
        setCreatedId(null)
      }
      await refresh()
      setNotice({ tone: 'success', text: 'Invitation revoked.' })
    } catch (err) {
      setNotice({ tone: 'danger', text: err.message || 'Could not revoke invitation.' })
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setNotice({ tone: 'success', text: 'Invitation link copied.' })
    } catch {
      setNotice({ tone: 'danger', text: 'Select and copy the link below.' })
    }
  }

  return (
    <Card title="Invite Employees" icon="✉️" tone="info" style={{ marginTop: 'var(--space-6)' }}>
      <p className="ui-info-body">
        Create a link for one employee email. It expires after seven days and works once.
      </p>
      {notice && (
        <div className={`ui-alert tone-${notice.tone}`} role={notice.tone === 'danger' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}
      <form onSubmit={createInvite} className="ui-form-stack">
        <input
          type="email"
          className="ui-input"
          placeholder="Employee email address"
          aria-label="Employee email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className="modern-btn-primary" type="submit" disabled={busy}>
          {busy ? 'Creating...' : 'Create invitation'}
        </button>
      </form>
      {inviteLink && (
        <div className="ui-info-tile tone-primary" style={{ marginTop: 'var(--space-4)' }}>
          <div className="ui-info-title">New invitation link</div>
          <input
            className="ui-input"
            aria-label="New invitation link"
            value={inviteLink}
            readOnly
            onFocus={(event) => event.target.select()}
          />
          <button className="modern-btn-primary is-neutral" type="button" onClick={copyLink}>
            Copy link
          </button>
        </div>
      )}
      <div className="ui-tile-stack" style={{ marginTop: 'var(--space-5)' }}>
        <div className="ui-info-title">Pending invitations</div>
        {pending.length === 0 && <p className="ui-info-body">No pending invitations.</p>}
        {pending.map((invitation) => (
          <div className="ui-info-tile tone-primary" key={invitation.id}>
            <div className="ui-info-title">{invitation.email}</div>
            <div className="ui-info-body">
              Expires {new Date(invitation.expires_at).toLocaleString()}
            </div>
            <button
              className="modern-btn-primary is-danger"
              type="button"
              onClick={() => revokeInvite(invitation.id)}
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}
