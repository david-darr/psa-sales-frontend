import { useCallback, useEffect, useState } from 'react'
import Card from './Card'
import api from '../lib/api'

/** Admin-only, count-only migration control. No credential values reach the browser. */
export default function MailCredentialMigration() {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const refresh = useCallback(async () => {
    const data = await api.get('/api/mail-credential-migration')
    setStatus(data)
  }, [])

  useEffect(() => {
    refresh().catch((err) => setNotice({ tone: 'danger', text: err.message || 'Could not load credential status.' }))
  }, [refresh])

  const migrate = async () => {
    if (!status?.legacy || busy) return
    if (!window.confirm(`Encrypt ${status.legacy} stored Gmail credential${status.legacy === 1 ? '' : 's'}?`)) return
    setBusy(true)
    setNotice(null)
    try {
      const result = await api.post('/api/mail-credential-migration', {
        confirm: 'ENCRYPT_EXISTING_MAIL_PASSWORDS',
      })
      setStatus(result)
      setNotice({ tone: 'success', text: `Encrypted ${result.migrated} credential${result.migrated === 1 ? '' : 's'}.` })
    } catch (err) {
      setNotice({ tone: 'danger', text: err.message || 'Credential migration failed.' })
      await refresh().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Email credential protection" icon="lock" tone="warning" style={{ marginTop: 'var(--space-6)' }}>
      {notice && (
        <div className={`ui-alert tone-${notice.tone}`} role={notice.tone === 'danger' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}
      {!status ? (
        <button type="button" className="modern-btn-primary is-neutral" onClick={() => refresh().catch((err) => setNotice({ tone: 'danger', text: err.message }))}>
          Check credential status
        </button>
      ) : (
        <>
          <div className="ui-tile-stack">
            <div className="ui-info-tile tone-primary">
              <div className="ui-info-title">Stored Gmail credentials</div>
              <div className="ui-info-body">
                {status.encrypted} encrypted, {status.legacy} awaiting migration, {status.invalid} unreadable, {status.configured} total
              </div>
            </div>
          </div>
          {status.invalid > 0 && (
            <div className="ui-alert tone-danger" role="alert" style={{ marginTop: 'var(--space-4)' }}>
              {status.invalid} encrypted credential{status.invalid === 1 ? '' : 's'} cannot be read with the current Render key. Restore the correct key before sending email.
            </div>
          )}
          {status.legacy > 0 && (
            <button type="button" className="modern-btn-primary" onClick={migrate} disabled={busy} style={{ marginTop: 'var(--space-4)' }}>
              {busy ? 'Encrypting...' : `Encrypt ${status.legacy} existing credential${status.legacy === 1 ? '' : 's'}`}
            </button>
          )}
          {status.legacy === 0 && status.invalid === 0 && status.legacy_reads_enabled && (
            <p className="ui-info-body" style={{ marginTop: 'var(--space-4)' }}>
              Migration is complete. The administrator can now set MAIL_CREDENTIAL_ALLOW_LEGACY to false in Render and redeploy.
            </p>
          )}
          {status.legacy === 0 && status.invalid === 0 && !status.legacy_reads_enabled && (
            <p className="ui-info-body" style={{ marginTop: 'var(--space-4)' }}>
              Stored credentials are encrypted and plaintext reads are disabled.
            </p>
          )}
        </>
      )}
    </Card>
  )
}
