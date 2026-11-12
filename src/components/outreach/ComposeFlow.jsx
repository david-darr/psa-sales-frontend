import { salesText, salesWorkspace } from '../../lib/salesWorkspace'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_TEMPLATES, KINDS, plural, toServerTemplate } from '../../emails/constants'
import { loadAllRecipients, outreachApi } from '../../emails/outreachApi'
import { usePreviews } from '../../emails/useOutreach'
import BatchProgress from './BatchProgress'
import MessageStep from './MessageStep'
import PreviewPane from './PreviewPane'
import RecipientPicker from './RecipientPicker'
import SelfTest from './SelfTest'
import CampaignCreate from './CampaignCreate'

const STEPS = [
  ['recipients', 'Recipients'],
  ['message', 'Message'],
  ['review', 'Review and send'],
]

const emptyMessage = (kind) => ({
  custom: salesWorkspace() === 'business' || kind === 'custom',
  subject: salesWorkspace() === 'business' ? 'Sponsorship opportunity for {business name}' : DEFAULT_TEMPLATES[kind]?.subject ?? '',
  body: salesWorkspace() === 'business' ? 'Hello {contact name},\n\nCould we arrange a short call to discuss a sponsorship opportunity with {business name}?\n\nBest,\n{my name}' : DEFAULT_TEMPLATES[kind]?.body ?? '',
  attachments: false,
  attachment_ids: [],
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
  const [audience, setAudience] = useState('all')
  const [campaignId, setCampaignId] = useState('standard')
  const [campaigns, setCampaigns] = useState([])
  const [contexts, setContexts] = useState({})

  useEffect(() => {
    outreachApi.campaigns().then((data) => setCampaigns(data.items)).catch((err) => setSendError(err.message))
  }, [])

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
            : `${plural(ready.length, salesText("of your schools"))} could be selected. The rest are missing an email, already contacted, or not assigned to you.`,
        )
      })
      .catch(() => alive && setNote(salesText("Could not preselect those schools.")))
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
    attachmentIds: message.attachment_ids,
    templateId: message.template_id, templateRevision: message.template_revision,
    audience: message.template_audience && message.template_audience !== 'general' ? message.template_audience : audience,
    campaignId, contexts,
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

  const remaining = limits.limits ? Math.min(limits.limits.remaining, preview.remaining ?? Infinity) : null
  const mailbox = limits.limits ? limits.limits.mailbox_connected : true
  const skipped = preview.previews.filter((item) => item.eligible === false).length
  const ready = preview.previews.length - skipped
  const overLimit = remaining !== null && ready > remaining
  const inboxBlocked = kind === 'followup' && !mailSync?.ready
  const blockers = []
  if (!mailbox) blockers.push('Connect your mailbox on the Account page to send.')
  if (inboxBlocked) blockers.push('Check your replies first so nobody who answered gets a follow-up.')
  if (needsText) blockers.push('Add a subject and a message.')
  if (overLimit) blockers.push(`You can send ${remaining} more today. Deselect ${ready - remaining} to continue.`)
  if (remaining === 0) blockers.push('You have reached today\'s sending limit.')
  if (!ready) blockers.push('Select at least one recipient who is ready.')
  if (preview.truncated || !preview.token) blockers.push(salesText("Review every contact. Select at most 100 schools and 100 contact mailboxes per batch."))
  if (preview.previews.some((row) => row.context_required)) blockers.push(salesText("Choose a school context for each shared mailbox."))
  const canSend = !blockers.length && !sending && !preview.loading && !preview.error

  const send = async () => {
    setSending(true)
    setSendError('')
    const payload = { kind, school_ids: ids, attachment_ids: message.attachment_ids || [], contact_mode: true,
      audience: message.template_audience && message.template_audience !== 'general' ? message.template_audience : audience,
      campaign_id: campaignId, contact_contexts: contexts }
    if (message.template_id) { payload.template_id = message.template_id; payload.template_revision = message.template_revision }
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
          Review mode: choose and approve each follow-up. PSA checks that your inbox is current and skips
          contacts who replied or asked to stop. Automatic campaigns will require separate authorization.
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

      <div className="ou-card ou-card-body" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="ou-compose">
          <label className="ou-field"><span className="ou-label">Campaign</span>
            <select className="ou-select" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
              <option value="standard">Standard outreach</option>
              {campaigns.filter((row) => row.id !== 'standard').map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label className="ou-field"><span className="ou-label">Contact audience</span>
            <select className="ou-select" value={message.template_audience && message.template_audience !== 'general' ? message.template_audience : audience}
              disabled={Boolean(message.template_audience && message.template_audience !== 'general')}
              onChange={(event) => setAudience(event.target.value)}>
              <option value="decision_maker">Business decision makers</option><option value="marketing">Business marketing</option><option value="community_relations">Community relations</option>
              <option value="all">{salesText("All school contacts, including unknown roles")}</option>
              <option value="principal_ap">Principals and assistant principals</option>
              <option value="pta_pto">PTA / PTO</option><option value="enrichment">Enrichment coordinators</option>
              <option value="trunk_or_treat">Trunk-or-Treat tagged contacts</option>
            </select>
          </label>
        </div>
        <p className="ou-muted">One email per matching mailbox. Shared mailboxes are deduplicated across reps in this campaign.
          Your daily allowance resets at midnight Eastern.</p>
        <CampaignCreate onCreated={(campaign) => { setCampaigns((rows) => [...rows, campaign]); setCampaignId(campaign.id) }} />
        <details><summary className="ou-muted">How sending pauses</summary><p className="ou-muted">{salesText("PSA checks your inbox between groups of five messages. Detected hard bounces, stop requests and complaints pause remaining outreach. Inbox checks must complete before continuing. Gmail complaints are not a connected feedback feed; record a phone request or reported complaint from the contact’s school page. A message already being sent may still finish.")}</p></details>
      </div>

      {note && (
        <div className="ou-callout tone-warning" role="status">
          {note}
        </div>
      )}
      {inboxBlocked && step === 'review' && (
        <div className="ou-callout tone-warning" role="status">
          <span>
            <strong>Check replies before following up.</strong>{salesText(" It takes a moment and keeps you from nudging schools that already answered. ")}</span>
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
            onContext={(id, school) => setContexts((value) => ({ ...value, [id]: school }))}
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
            onContext={(id, school) => setContexts((value) => ({ ...value, [id]: school }))}
          />
          {preview.unmatched?.length > 0 && <p className="ou-callout tone-warning" role="status">{preview.unmatched.length}{salesText(" selected schools have no contacts matching this audience. Add contacts on the school page or choose a different audience.")}</p>}
          {ids.length === 1 && <SelfTest kind={kind} schoolId={ids[0]} message={message} editing={editing} onChanged={limits.reload} />}
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
          <span className="ou-strong ou-mono">{plural(ids.length, salesText("school"))}</span>
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
