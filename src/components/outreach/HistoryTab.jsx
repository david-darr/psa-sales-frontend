import { useState } from 'react'
import Modal from '../Modal'
import { BATCH_STATUS, KINDS, relativeTime } from '../../emails/constants'
import { useBatchList } from '../../emails/useOutreach'
import BatchProgress from './BatchProgress'
import { Chip, Dot } from './bits'

/** Past send jobs, plus the most recent individual emails. */
export default function HistoryTab({ emails, rev }) {
  const list = useBatchList(30, rev)
  const [openId, setOpenId] = useState(null)
  const recent = [...emails].sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at))).slice(0, 25)

  return (
    <div className="ou-page">
      <div className="ou-card">
        <div className="ou-card-head">
          <h3 className="ou-card-title">Send jobs</h3>
        </div>
        {list.error && <div className="ou-error">{list.error}</div>}
        {!list.loading && !list.items.length && !list.error && (
          <div className="ou-empty">
            <strong>Nothing sent yet.</strong>
            Every outreach batch you send is listed here with its results.
          </div>
        )}
        {list.items.length > 0 && (
          <div className="ou-table-wrap">
            <table className="ou-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Failed</th>
                  <th className="ou-hide-sm">Skipped</th>
                  <th>When</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((batch) => {
                  const status = BATCH_STATUS[batch.status] || BATCH_STATUS.queued
                  return (
                    <tr key={batch.id}>
                      <td className="ou-strong">{KINDS[batch.kind]?.label || batch.kind}</td>
                      <td>
                        <Chip tone={status.tone === 'neutral' ? undefined : status.tone}>
                          <Dot tone={status.tone} />
                          {status.label}
                        </Chip>
                      </td>
                      <td className="ou-mono">
                        {batch.sent} / {batch.total}
                      </td>
                      <td className="ou-mono">{batch.failed}</td>
                      <td className="ou-mono ou-hide-sm">{batch.skipped}</td>
                      <td className="ou-mono">{relativeTime(batch.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="ou-btn ou-btn-ghost ou-btn-sm"
                          onClick={() => setOpenId(batch.id)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ou-card">
        <div className="ou-card-head">
          <h3 className="ou-card-title">Recent emails</h3>
        </div>
        {!recent.length && <div className="ou-empty">No emails sent yet.</div>}
        {recent.length > 0 && (
          <div className="ou-table-wrap">
            <table className="ou-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Status</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((email) => (
                  <tr key={email.id}>
                    <td>
                      <span className="ou-strong">{email.school_name}</span>
                      <span className="ou-sub">{email.school_email}</span>
                    </td>
                    <td>
                      {email.responded ? (
                        <Chip tone="ok">Replied</Chip>
                      ) : email.followup_sent ? (
                        <Chip>Followed up</Chip>
                      ) : (
                        <Chip>Awaiting reply</Chip>
                      )}
                    </td>
                    <td className="ou-mono">{relativeTime(email.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openId && (
        <Modal title="Send job details" size="lg" onClose={() => setOpenId(null)}>
          <BatchProgress batchId={openId} />
        </Modal>
      )}
    </div>
  )
}
