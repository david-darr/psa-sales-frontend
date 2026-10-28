import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_TEMPLATES, KINDS, plural, toServerTemplate } from '../../emails/constants'
import { loadAllRecipients, outreachApi } from '../../emails/outreachApi'
import { usePreviews } from '../../emails/useOutreach'
import BatchProgress from './BatchProgress'
import MessageStep from './MessageStep'
import PreviewPane from './PreviewPane'
import RecipientPicker from './RecipientPicker'

const STEPS = [
  ['recipients', 'Recipients'],
  ['message', 'Message'],
  ['review', 'Review and send'],
]

const emptyMessage = (kind) => ({
  custom: kind === 'custom',
  subject: DEFAULT_TEMPLATES[kind]?.subject ?? '',
  body: DEFAULT_TEMPLATES[kind]?.body ?? '',
  attachments: false,
})

export default function ComposeFlow({
  kind,
  limits,
  mailSync,
  syncing,
  onCheckReplies,
  batchId,
  onBatch,
  onChanged,
  preselect,
}) {
  const [step, setStep] = useState('recipients')
  const [selected, setSelected] = useState(() => new Map())
  const [message, setMessage] = useState(() => emptyMessage(kind))
  const [rev, setRev] = useState(0)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [note, setNote] = useState('')

  const ids = useMemo(() => [...selected.keys()], [selected])
  const editing = kind === 'custom' || message.custom
  const needsText = editing && (!message.subject.trim() || !message.body.trim())

  useEffect(() => {
    if (!preselect?.length) return
    let alive = true
    loadAllRecipients({ kind, scope: 'mine' }, { cap: 1000 })
      .then(({ items }) => {
        if (!alive) return
        const wanted = new Set(preselect)
        const hits = items.filter((row) => wanted.has(row.school_id))
        const ready = hits.filter((row) => row.eligible)
        setSelected(new Map(ready.map((row) => [row.school_id, row])))
        setNote(
          ready.length === preselect.length
            ? ''
            : `${plural(ready.length, 'of your schools')} could be selected. The rest are missing an email, already contacted, or not assigned to you.`,
        )
      })
      .catch(() => alive && setNote('Could not preselect those schools.'))
    return () => {
      alive = false
    }
  }, [preselect, kind])

  const preview = usePreviews({
    ids,
    kind,
    custom: editing,
    subject: message.subject,
    body: message.body,
    attachments: message.attachments,
    enabled: step !== 'recipients' && ids.length > 0,
  })

  if (batchId) {
    return (
      <BatchProgress
        batchId={batchId}
        onSettled={onChanged}
        onDone={() => {
          onBatch(null)
          setSelected(new Map())
          setStep('recipients')
          setRev((n) => n + 1)
        }}
        doneLabel="Start another"
      />
    )
  }

  const remaining = limits.limits?.remaining ?? null
  const mailbox = limits.limits ? limits.limits.mailbox_connected : true
  const skipped = preview.previews.filter((item) => item.eligible === false).length
  const ready = ids.length - skipped
  const overLimit = remaining !== null && ready > remaining
  const inboxBlocked = kind === 'followup' && !mailSync?.ready
  const blockers = []
  if (!mailbox) blockers.push('Connect your mailbox on the Account page to send.')
  if (inboxBlocked) blockers.push('Check your replies first so nobody who answered gets a follow-up.')
  if (needsText) blockers.push('Add a subject and a message.')
  if (overLimit) blockers.push(`You can send ${remaining} more today. Deselect ${ready - remaining} to continue.`)
  if (remaining === 0) blockers.push('You have reached today\'s sending limit.')
  if (!ready) blockers.push('Select at least one recipient who is ready.')
  const canSend = !blockers.length && !sending && !preview.loading && !preview.error

  const send = async () => {
    setSending(true)
    setSendError('')
    const payload = { kind, school_ids: ids }
    if (editing) {
      payload.subject = toServerTemplate(message.subject)
      payload.body = toServerTemplate(message.body)
    }
    if (message.attachments) payload.attachments = true
    if (preview.token && !preview.truncated) payload.preview_token = preview.token
    try {
      const result = await outreachApi.createBatch(payload)
      onBatch(result.batch_id)
      limits.reload()
      onChanged?.()
    } catch (err) {
      setSendError(err.message || 'The batch could not be started.')
    } finally {
      setSending(false)
    }
  }

  const goto = (target) => setStep(target)
  const stepIndex = STEPS.findIndex(([id]) => id === step)

  return (
    <div className="ou-page">
      {kind === 'followup' && (
        <p className="workspace-subtle" style={{ margin: '0 0 12px' }}>
          Follow-ups also go out automatically, 3 and 7 days after your first email, on weekdays
          between 9am and 5pm Eastern. PSA checks your inbox first and skips anyone who replied.
          Use this tab to send one sooner or change the message.
        </p>
      )}
      <div className="ou-steps" role="list" aria-label="Outreach steps">
        {STEPS.map(([id, label], index) => (
          <button
            key={id}
            type="button"
            role="listitem"
            className={`ou-step${step === id ? ' is-active' : ''}${index < stepIndex ? ' is-done' : ''}`}
            disabled={index > 0 && !ids.length}
            aria-current={step === id ? 'step' : undefined}
            onClick={() => goto(id)}
          >
            <span className="ou-step-num">{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {note && (
        <div className="ou-callout tone-warning" role="status">
          {note}
        </div>
      )}
      {inboxBlocked && step === 'review' && (
        <div className="ou-callout tone-warning" role="status">
          <span>
            <strong>Check replies before following up.</strong> It takes a moment and keeps you from nudging schools
            that already answered.
          </span>
          <button type="button" className="ou-btn ou-btn-ghost ou-btn-sm" onClick={onCheckReplies} disabled={syncing}>
            {syncing ? 'Checking...' : 'Check replies'}
          </button>
        </div>
      )}

      {step === 'recipients' && (
        <RecipientPicker kind={kind} selected={selected} onSelect={setSelected} rev={rev} />
      )}

      {step === 'message' && (
        <div className="ou-compose">
          <MessageStep kind={kind} message={message} onChange={setMessage} />
          <PreviewPane
            previews={preview.previews}
            loading={preview.loading}
            error={preview.error}
            truncated={preview.truncated}
            onRetry={preview.reload}
          />
        </div>
      )}

      {step === 'review' && (
        <>
          <div className="ou-summary">
            <div className="ou-stat">
              <span className="ou-label">Will send</span>
              <span className="ou-stat-num ou-mono">{ready}</span>
            </div>
            <div className="ou-stat">
              <span className="ou-label">Skipped</span>
              <span className="ou-stat-num ou-mono">{skipped}</span>
            </div>
            <div className="ou-stat">
              <span className="ou-label">Left today</span>
              <span className="ou-stat-num ou-mono">{remaining ?? '...'}</span>
            </div>
            <div className="ou-stat">
              <span className="ou-label">Type</span>
              <span className="ou-stat-num" style={{ fontSize: 'var(--text-base)' }}>
                {KINDS[kind]?.label}
              </span>
            </div>
          </div>
          <PreviewPane
            previews={preview.previews}
            loading={preview.loading}
            error={preview.error}
            truncated={preview.truncated}
            onRetry={preview.reload}
          />
          {blockers.length > 0 && (
            <div className="ou-callout tone-danger" role="alert">
              <span>{blockers[0]}</span>
            </div>
          )}
          {sendError && (
            <div className="ou-callout tone-danger" role="alert">
              <span>{sendError}</span>
            </div>
          )}
        </>
      )}

      <div className="ou-actionbar">
        <div className="ou-actionbar-info">
          <span className="ou-strong ou-mono">{plural(ids.length, 'school')}</span>
          <span className="ou-muted">selected</span>
        </div>
        <div className="ou-actionbar-buttons">
          {step !== 'recipients' && (
            <button
              type="button"
              className="ou-btn ou-btn-ghost"
              onClick={() => goto(step === 'review' ? 'message' : 'recipients')}
              disabled={sending}
            >
              Back
            </button>
          )}
          {step === 'recipients' && (
            <button type="button" className="ou-btn ou-btn-solid" disabled={!ids.length} onClick={() => goto('message')}>
              Write message
            </button>
          )}
          {step === 'message' && (
            <button type="button" className="ou-btn ou-btn-solid" disabled={needsText} onClick={() => goto('review')}>
              Review
            </button>
          )}
          {step === 'review' && (
            <button type="button" className="ou-btn ou-btn-solid" disabled={!canSend} onClick={send}>
              {sending ? 'Starting...' : `Send ${plural(ready, 'email')}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
