import { useCallback, useEffect, useState } from 'react'
import Card from './Card'
import api from '../lib/api'

const DAYS = [1, 7, 14, 30]

export default function JoinLinks() {
  const [links, setLinks] = useState([])
  const [days, setDays] = useState(7)
  const [maxUses, setMaxUses] = useState(25)
  const [label, setLabel] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const refresh = useCallback(async () => {
    const data = await api.get('/api/join-links')
    setLinks(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    refresh().catch((err) => setNotice({ tone: 'danger', text: err.message }))
  }, [refresh])

  async function createLink(event) {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      const created = await api.post('/api/join-links', {
        days,
        max_uses: maxUses ? Number(maxUses) : null,
        label: label.trim() || null,
      })
      const url = new URL('/account', window.location.origin)
      // A fragment stays out of server logs and HTTP referrer headers.
      url.hash = new URLSearchParams({ join: created.token }).toString()
      setShareLink(url.toString())
      setLabel('')
      await refresh()
      setNotice({
        tone: 'success',
        text: 'Sign-up link created. Copy it now: it is shown only once.',
      })
    } catch (err) {
      setNotice({ tone: 'danger', text: err.message || 'Could not create the link.' })
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id) {
    setNotice(null)
    try {
      await api.del(`/api/join-links/${id}`)
      await refresh()
      setNotice({ tone: 'success', text: 'Link turned off. Nobody new can join with it.' })
    } catch (err) {
      setNotice({ tone: 'danger', text: err.message || 'Could not turn off the link.' })
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setNotice({ tone: 'success', text: 'Link copied. Paste it in your team chat or email.' })
    } catch {
      setNotice({ tone: 'danger', text: 'Select and copy the link below.' })
    }
  }

  return (
    <Card title="Team sign-up link" icon="🔗" tone="info">
      <p className="ui-info-body">
        One link for the whole team. Anyone with it can create a sales associate
        account until it expires, reaches its limit, or you turn it off. New
        accounts never get administrator access.
      </p>
      {notice && (
        <div className={`ui-alert tone-${notice.tone}`} role={notice.tone === 'danger' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}
      <form onSubmit={createLink} className="ui-form-stack">
        <input
          className="ui-input"
          placeholder="Label, for example Fall 2026 reps (optional)"
          aria-label="Link label"
          maxLength={80}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <label className="workspace-field" style={{ flex: 1, minWidth: 140 }}>
            Expires after
            <select className="ui-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {DAYS.map((value) => (
                <option key={value} value={value}>
                  {value === 1 ? '1 day' : `${value} days`}
                </option>
              ))}
            </select>
          </label>
          <label className="workspace-field" style={{ flex: 1, minWidth: 140 }}>
            Maximum sign-ups
            <input
              className="ui-input"
              type="number"
              min={1}
              max={200}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </label>
        </div>
        <button className="modern-btn-primary" type="submit" disabled={busy}>
          {busy ? 'Creating...' : 'Create sign-up link'}
        </button>
      </form>
      {shareLink && (
        <div className="ui-info-tile tone-primary" style={{ marginTop: 'var(--space-4)' }}>
          <div className="ui-info-title">Share this link with new reps</div>
          <input
            className="ui-input"
            aria-label="Sign-up link"
            value={shareLink}
            readOnly
            onFocus={(event) => event.target.select()}
          />
          <button className="modern-btn-primary is-neutral" type="button" onClick={copy}>
            Copy link
          </button>
        </div>
      )}
      <div className="ui-tile-stack" style={{ marginTop: 'var(--space-5)' }}>
        <div className="ui-info-title">Recent links</div>
        {links.length === 0 && <p className="ui-info-body">No sign-up links yet.</p>}
        {links.map((link) => (
          <div className="ui-info-tile tone-primary" key={link.id}>
            <div className="ui-info-title">{link.label || 'Team sign-up link'}</div>
            <div className="ui-info-body">
              {link.state === 'active' ? 'Active' : link.state.charAt(0).toUpperCase() + link.state.slice(1)}
              {' · '}
              {link.use_count} joined{link.max_uses ? ` of ${link.max_uses}` : ''}
              {' · '}
              Expires {new Date(link.expires_at).toLocaleDateString()}
            </div>
            {link.state === 'active' && (
              <button className="modern-btn-primary is-danger" type="button" onClick={() => revoke(link.id)}>
                Turn off
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
