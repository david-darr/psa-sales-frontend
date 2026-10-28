import { useCallback, useEffect, useState } from 'react'
import { Panel, ErrorNotice } from './WorkspaceUI'
import api from '../lib/api'

const EXPIRY = [7, 30, 90]

function when(value) {
  return value ? new Date(value).toLocaleDateString() : 'Never'
}

/* Personal API keys for AI assistants (backend: api/agent_api.py). The full
   key is returned once by the create call and only kept in component state
   until the person dismisses it. */
export default function AgentKeys({ admin }) {
  const [keys, setKeys] = useState([])
  const [baseUrl, setBaseUrl] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ name: '', scope: 'read', expires_in_days: 30 })
  const [created, setCreated] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const data = await api.get('/api/agent-keys')
    setKeys(Array.isArray(data?.items) ? data.items : [])
    setBaseUrl(data?.base_url || '')
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh().catch((err) => {
      setError(err.message || 'Could not load your keys.')
      setLoaded(true)
    })
  }, [refresh])

  async function createKey(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const data = await api.post('/api/agent-keys', {
        ...form,
        name: form.name.trim(),
      })
      setCreated({ key: data.key, name: data.name, scope: data.scope })
      setForm((old) => ({ ...old, name: '' }))
      await refresh()
    } catch (err) {
      setError(err.message || 'Could not create the key.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(key) {
    if (!window.confirm(`Revoke "${key.name}"? Assistants using it stop working immediately.`)) return
    setError('')
    setNotice('')
    try {
      await api.del(`/api/agent-keys/${key.id}`)
      await refresh()
      setNotice('Key revoked.')
    } catch (err) {
      setError(err.message || 'Could not revoke the key.')
    }
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text)
      setNotice(`${label} copied.`)
    } catch {
      setNotice('Select the text and copy it.')
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <Panel
        title="API keys for AI assistants"
        description={
          admin
            ? 'Let Kairos or another assistant work in PSA Sales as you. Your key sees the whole team because you are an administrator.'
            : 'Let Kairos or another assistant work in PSA Sales as you. A key sees only your own schools and tasks.'
        }
      >
        <ErrorNotice error={error} />
        {notice && (
          <div className="ui-alert tone-success" role="status" style={{ marginBottom: 14 }}>
            {notice}
          </div>
        )}
        {created && (
          <div className="ui-info-tile tone-primary" style={{ marginBottom: 18 }}>
            <div className="ui-info-title">Copy your new key now</div>
            <p className="ui-info-body">
              This is the only time it is shown. Store it in your assistant's private
              connection settings, never in chat or a shared file.
            </p>
            <input
              className="ui-input"
              aria-label={`New key ${created.name}`}
              value={created.key}
              readOnly
              onFocus={(event) => event.target.select()}
            />
            <div className="workspace-actions">
              <button className="modern-btn-primary" type="button" onClick={() => copy(created.key, 'Key')}>
                Copy key
              </button>
              <button className="modern-btn-primary is-neutral" type="button" onClick={() => setCreated(null)}>
                I saved it
              </button>
            </div>
          </div>
        )}
        <form className="workspace-form" onSubmit={createKey}>
          <label className="workspace-field">
            Key name
            <input
              className="ui-input"
              placeholder="Kairos on my laptop"
              maxLength={80}
              value={form.name}
              onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
              required
            />
          </label>
          <div className="workspace-form-grid">
            <label className="workspace-field">
              Access
              <select
                className="ui-select"
                value={form.scope}
                onChange={(event) => setForm((old) => ({ ...old, scope: event.target.value }))}
              >
                <option value="read">Read only</option>
                <option value="write">Read and update (tasks, stages, activity)</option>
              </select>
            </label>
            <label className="workspace-field">
              Expires after
              <select
                className="ui-select"
                value={form.expires_in_days}
                onChange={(event) =>
                  setForm((old) => ({ ...old, expires_in_days: Number(event.target.value) }))
                }
              >
                {EXPIRY.map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="workspace-actions">
            <button className="modern-btn-primary" disabled={busy || !form.name.trim()}>
              {busy ? 'Creating...' : 'Create key'}
            </button>
          </div>
        </form>
      </Panel>
      <Panel title="Your keys" description="Revoke a key you no longer use, or if it may have been exposed.">
        {!loaded && <p className="workspace-subtle">Loading keys...</p>}
        {loaded && !error && keys.length === 0 && (
          <p className="workspace-subtle">No keys yet. Start with a read-only key to test your assistant.</p>
        )}
        {keys.length > 0 && (
          <div className="workspace-list">
            {keys.map((key) => (
              <div className="workspace-list-item" key={key.id}>
                <div className="grow">
                  <strong>{key.name}</strong>
                  <small>
                    {key.hint} · {key.scope === 'write' ? 'Read and update' : 'Read only'} ·{' '}
                    {key.expired ? 'Expired' : `Expires ${when(key.expires_at)}`} · Last used{' '}
                    {when(key.last_used_at)}
                  </small>
                </div>
                <button className="modern-btn-primary is-danger is-small" type="button" onClick={() => revoke(key)}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="Connecting an assistant">
        <ol className="workspace-form" style={{ paddingLeft: 18, fontSize: '.8rem' }}>
          <li>Create a read-only key first and check that your assistant can see your pipeline.</li>
          <li>
            Give the assistant this API address and your key through its private connection
            settings:
            {baseUrl && (
              <div className="workspace-inline" style={{ marginTop: 8 }}>
                <code style={{ wordBreak: 'break-all' }}>{baseUrl}</code>
                <button className="modern-btn-primary is-neutral is-small" type="button" onClick={() => copy(baseUrl, 'Address')}>
                  Copy
                </button>
              </div>
            )}
          </li>
          <li>In Kairos, open the PSA Command tab and paste both under Connections.</li>
          <li>Switch to a read and update key only when you want the assistant to make changes.</li>
        </ol>
        <p className="workspace-subtle" style={{ marginTop: 18 }}>
          Assistants never send email through this connection. Each request is logged with the
          key and time, without its contents.
        </p>
      </Panel>
    </div>
  )
}
