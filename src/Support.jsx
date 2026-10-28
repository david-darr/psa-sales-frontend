import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import { Empty, ErrorNotice, Panel, Segmented } from './components/WorkspaceUI'
import { dateLabel, useResource } from './lib/crm'
import api from './lib/api'
import { SUPPORT_EMAIL } from './lib/support'

const KINDS = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'question', label: 'Question' },
  { value: 'idea', label: 'Idea' },
]

function mailtoLink(subject, body) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function RecentReports() {
  const { data, error, loading } = useResource('/api/support')
  if (error) return <ErrorNotice error={error} />
  if (!loading && !data?.length) return <Empty title="No reports yet" icon="check" />
  return (
    <div className="ui-tile-stack">
      {(data || []).map((report) => (
        <div className="ui-info-tile tone-primary" key={report.id}>
          <div className="ui-info-title">
            {report.subject}
          </div>
          <div className="ui-info-body">
            {report.reporter || 'Former user'} · {report.kind} · {dateLabel(report.created_at)}
            {report.page ? ` · ${report.page}` : ''}
            {report.delivered ? '' : ' · email not delivered'}
          </div>
          <div className="ui-info-body" style={{ whiteSpace: 'pre-wrap' }}>
            {report.message}
            {report.error ? `\n\nError: ${report.error}` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Support() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const reportedError = params.get('error') || ''
  const fromPage = params.get('from') || ''
  const [kind, setKind] = useState('bug')
  const [subject, setSubject] = useState(reportedError ? 'Error: ' + reportedError.slice(0, 100) : '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const details = [
    message,
    reportedError ? `\nError shown in the app: ${reportedError}` : '',
    fromPage ? `\nPage: ${fromPage}` : '',
    `\nFrom: ${user?.name || ''} <${user?.email || ''}>`,
  ].join('')

  const send = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api.post('/api/support', {
        kind: reportedError ? 'error' : kind,
        subject,
        message,
        error: reportedError || undefined,
        page: fromPage || undefined,
        browser: navigator.userAgent.slice(0, 300),
      })
      setResult(data)
      setMessage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout title="Support" subtitle="Report a problem, ask a question or suggest an improvement.">
      <div className="workspace-form" style={{ maxWidth: 720 }}>
        <Panel
          title={reportedError ? 'Report this problem' : 'Contact support'}
          description={`Your message goes to ${SUPPORT_EMAIL}. Replies come back to your email.`}
        >
          {result ? (
            <div className={`ui-alert tone-${result.delivered ? 'success' : 'warning'}`} role="status">
              {result.delivered ? (
                'Thanks. Your report was sent, and you will get a reply by email.'
              ) : (
                <>
                  Your report was saved, but the email could not be sent automatically.{' '}
                  <a href={mailtoLink(subject || 'PSA Sales support', details)}>Email it to {SUPPORT_EMAIL}</a>{' '}
                  instead.
                </>
              )}
            </div>
          ) : (
            <form className="workspace-form" onSubmit={send}>
              <ErrorNotice error={error} report={false} />
              {!reportedError && (
                <Segmented label="Report type" value={kind} onChange={setKind} options={KINDS} />
              )}
              {reportedError && (
                <div className="ui-alert tone-danger">
                  <strong>Error:</strong> {reportedError}
                  {fromPage && <div className="workspace-subtle">Page: {fromPage}</div>}
                </div>
              )}
              <label className="workspace-field">
                Subject
                <input
                  className="ui-input"
                  maxLength={160}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="A short summary"
                />
              </label>
              <label className="workspace-field">
                {reportedError ? 'What were you doing when this happened?' : 'Details'}
                <textarea
                  className="ui-input"
                  rows={6}
                  maxLength={5000}
                  required={!reportedError}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <div className="workspace-actions">
                <button className="modern-btn-primary" disabled={busy}>
                  {busy ? 'Sending...' : 'Send report'}
                </button>
                <a className="ui-link-button" href={mailtoLink(subject || 'PSA Sales support', details)}>
                  Or email {SUPPORT_EMAIL}
                </a>
              </div>
            </form>
          )}
        </Panel>
        {user?.admin && (
          <Panel title="Recent reports" description="Every report is saved here, even if its email failed.">
            <RecentReports key={result?.id || 'reports'} />
          </Panel>
        )}
      </div>
    </AppLayout>
  )
}
