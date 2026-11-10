import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import { useSharedTemplates } from '../../emails/useSharedTemplates'

const audiences = { all: 'All contacts', principal_ap: 'Principal / AP', pta_pto: 'PTA / PTO', enrichment: 'Enrichment', trunk_or_treat: 'Trunk-or-Treat' }
const date = (value) => new Date(value).toLocaleString([], { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET'
const day = (offset = 0) => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

function Editor({ sequences, onSaved }) {
  const { user } = useAuth()
  const templates = useSharedTemplates()
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user?.admin) return null
  const blank = () => ({ name: '', audience: 'principal_ap', start_hour: 9, end_hour: 17, steps: [4, 10, 17].map((day) => ({ day, template_id: '', template_revision: null })) })
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (draft.id) await api.put(`/api/outreach/sequences/${draft.id}`, draft)
      else await api.post('/api/outreach/sequences', draft)
      setDraft(null); onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <details className="ou-card ou-card-body"><summary>Manage team follow-up schedules</summary>
    <p className="ou-muted">Defaults are 4, 10 and 17 calendar days from the intro. Weekends shift to the next weekday. Saving a new version pauses existing approvals; it does not change scheduled copy silently.</p>
    <button type="button" className="ou-btn ou-btn-ghost" onClick={() => { setDraft(blank()); setError('') }}>Create follow-up schedule</button>
    {sequences.map((sequence) => <button type="button" className="ou-btn ou-btn-ghost" key={sequence.id} onClick={() => setDraft({ ...sequence, steps: sequence.steps.map((step) => ({ day: step.day, template_id: step.template.id, template_revision: step.template.revision })) })}>Edit {sequence.name} · v{sequence.revision}</button>)}
    {draft && <form onSubmit={save}>
      <label className="ou-field"><span className="ou-label">Name</span><input className="ou-input" required maxLength={150} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
      <label className="ou-field"><span className="ou-label">Audience</span><select className="ou-select" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value, steps: draft.steps.map((step) => ({ ...step, template_id: '', template_revision: null })) })}>{Object.entries(audiences).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <div className="ou-compose">{['start_hour', 'end_hour'].map((field) => <label className="ou-field" key={field}><span className="ou-label">{field === 'start_hour' ? 'Start sending at' : 'Stop sending at'} (Eastern)</span><select className="ou-select" required value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: Number(e.target.value) })}>{Array.from({ length: 15 }, (_, i) => i + 6).map((hour) => <option key={hour} value={hour}>{hour % 12 || 12}:00 {hour < 12 ? 'AM' : 'PM'}</option>)}</select></label>)}</div>
      <label className="ou-field"><span className="ou-label">Follow-up count</span><select className="ou-select" value={draft.steps.length} onChange={(e) => setDraft({ ...draft, steps: Array.from({ length: Number(e.target.value) }, (_, i) => draft.steps[i] || { day: [4, 10, 17][i], template_id: '', template_revision: null }) })}>{[1, 2, 3].map((n) => <option key={n}>{n}</option>)}</select></label>
      {draft.steps.map((step, index) => <fieldset className="ou-card ou-card-body" key={index}><legend>Follow-up {index + 1}</legend>
        <label className="ou-field"><span className="ou-label">Days after intro</span><input className="ou-input" type="number" min={1} max={90} required value={step.day} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((s, i) => i === index ? { ...s, day: Number(e.target.value) } : s) })} /></label>
        <label className="ou-field"><span className="ou-label">Template and its saved PDFs</span><select className="ou-select" required value={step.template_id} onChange={(e) => {
          const selected = templates.items.find((t) => t.id === Number(e.target.value))
          setDraft({ ...draft, steps: draft.steps.map((s, i) => i === index ? { ...s, template_id: selected?.id || '', template_revision: selected?.revision } : s) })
        }}><option value="">Choose follow-up {index + 1} template</option>{templates.items.filter((t) => t.kind === 'followup' && t.step === index + 1 && [draft.audience, 'general'].includes(t.audience)).map((t) => <option key={t.id} value={t.id}>{t.name} · v{t.revision} · {t.attachments?.length || 0} PDFs</option>)}</select></label>
      </fieldset>)}
      {draft.id && <label className="ou-field"><input type="checkbox" checked={Boolean(draft.archived)} onChange={(e) => setDraft({ ...draft, archived: e.target.checked })} /> Archive this sequence</label>}
      {error && <p className="ou-error" role="alert">{error}</p>}
      <button className="ou-btn ou-btn-solid" disabled={busy}>{busy ? 'Saving...' : 'Save schedule'}</button>{' '}
      <button type="button" className="ou-btn ou-btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
    </form>}
  </details>
}

export default function SequencesPanel() {
  const [state, setState] = useState({ sequences: [], originals: [], total: 0, enrollments: [], enrollmentTotal: 0, worker: null })
  const [enrollmentPage, setEnrollmentPage] = useState(1)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState({ q: '', page: 1 })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState({ sequence_id: '', original_ids: [], mode: 'review', start_date: day(), end_date: day(45), replace_existing: false })
  const [review, setReview] = useState(null)
  const [ack, setAck] = useState(false)
  const [stepReview, setStepReview] = useState(null)
  const [note, setNote] = useState('')
  const load = useCallback(async () => {
    try {
      const [sequences, originals, enrollments, worker] = await Promise.all([api.get('/api/outreach/sequences'), api.get(`/api/outreach/sequence-originals?${new URLSearchParams({ ...filter, per_page: 50 })}`), api.get(`/api/outreach/sequence-enrollments?page=${enrollmentPage}&per_page=50`), api.get('/api/outreach/worker')])
      setState({ sequences: sequences.items, originals: originals.items, total: originals.total || originals.items.length, enrollments: enrollments.items, enrollmentTotal: enrollments.total || 0, worker }); setError('')
    } catch (err) { setError(err.message) }
  }, [filter, enrollmentPage])
  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer) }, [load])
  const sequence = state.sequences.find((s) => s.id === Number(settings.sequence_id))
  const payload = { ...settings, sequence_id: Number(settings.sequence_id), revision: sequence?.revision }
  const key = JSON.stringify(payload)
  const current = review?.key === key ? review : null
  const act = async (work) => {
    setBusy(true); setError(''); setNote('')
    try { await work(); await load() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="ou-page">
    <div className={`ou-callout tone-${state.worker?.online ? 'neutral' : 'warning'}`} role="status">
      <span>{state.worker?.status === 'demo' ? 'Demo scheduling only. No messages will be sent.' : state.worker?.online ? 'Email sending service is available' : 'Sending service is unavailable. Your saved emails will wait until it is available.'}{state.worker?.last_seen_at && ` · Last seen ${date(state.worker.last_seen_at)}`}</span>
      <button className="ou-btn ou-btn-ghost ou-btn-sm" onClick={load}>Refresh</button>
    </div>
    {state.worker?.mode === 'web' && <p className="ou-callout tone-neutral">Sending uses the existing site. Scheduled reminders can be delayed by host startup or service limits.</p>}
    {error && <p className="ou-callout tone-danger" role="alert">{error}</p>}
    {note && <p role="status" className="ou-callout tone-neutral">{note}</p>}
    <Editor sequences={state.sequences} onSaved={load} />
    <section className="ou-card ou-card-body"><h3 className="ou-card-title">Set reminders for emails you already sent</h3>
      <p className="ou-muted">Choose unanswered introduction emails from the last 90 days. Review the messages and dates before saving a plan. Previous reminders will not repeat, and overdue reminders are never sent together in a burst.</p>
      <label className="ou-field"><span className="ou-label">Follow-up schedule</span><select className="ou-select" value={settings.sequence_id} onChange={(e) => setSettings({ ...settings, sequence_id: Number(e.target.value) })}><option value="">Choose a follow-up schedule</option>{state.sequences.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name} · v{s.revision} · {s.steps.map((step) => step.day).join('/')} days</option>)}</select></label>
      <div className="ou-compose">{['start_date', 'end_date'].map((field) => <label key={field} className="ou-field"><span className="ou-label">{field === 'start_date' ? 'Start date' : 'Stop sending after'} (Eastern)</span><input className="ou-input" type="date" value={settings[field]} onChange={(e) => setSettings({ ...settings, [field]: e.target.value })} /></label>)}</div>
      <label className="ou-field"><span className="ou-label">Sending mode</span><select className="ou-select" value={settings.mode} onChange={(e) => setSettings({ ...settings, mode: e.target.value })}><option value="review">Review each due step before sending</option><option value="automatic">Automatically send the approved steps until the end date</option></select></label>
      <label className="ou-field"><input type="checkbox" checked={settings.replace_existing} onChange={(e) => setSettings({ ...settings, replace_existing: e.target.checked })} /> Replace an existing follow-up plan with the plan I review here. Previously sent reminders will not repeat.</label>
      <form className="ou-toolbar" onSubmit={(event) => { event.preventDefault(); setFilter({ q: query, page: 1 }) }}><input className="ou-input" type="search" aria-label="Search introductions" placeholder="Search school or mailbox" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="ou-btn ou-btn-ghost">Search</button></form>
      <div className="ou-table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}><table className="ou-table"><thead><tr><th>Select</th><th>Conversation</th><th>Intro sent</th></tr></thead><tbody>{state.originals.map((original) => <tr key={original.id}><td><input type="checkbox" aria-label={`Enroll ${original.school_name} ${original.email}`} checked={settings.original_ids.includes(original.id)} onChange={(e) => setSettings({ ...settings, original_ids: e.target.checked ? [...settings.original_ids, original.id] : settings.original_ids.filter((id) => id !== original.id) })} /></td><td><strong>{original.school_name}</strong><span className="ou-sub">{original.email}</span>{original.already_managed && <span className="ou-sub">Already has a follow-up plan. Review a replacement to change it.</span>}</td><td>{date(original.sent_at)}<span className="ou-sub">{original.legacy_followups} earlier follow-ups</span></td></tr>)}</tbody></table></div>
      {!state.originals.length && <p className="ou-muted">No recent introductions available. Send an intro first; it will not enroll itself.</p>}
      <div className="ou-toolbar"><span>{state.total} matching conversations · {settings.original_ids.length} selected</span><button className="ou-btn ou-btn-ghost" disabled={filter.page===1} onClick={() => setFilter({ ...filter, page: filter.page-1 })}>Previous</button><button className="ou-btn ou-btn-ghost" disabled={filter.page*50>=state.total} onClick={() => setFilter({ ...filter, page: filter.page+1 })}>Next</button></div>
      <button className="ou-btn ou-btn-ghost" disabled={busy || !sequence || !settings.original_ids.length || settings.original_ids.length > 100} onClick={() => act(async () => { const result = await api.post('/api/outreach/sequence-enrollments/preview', payload); setReview({ ...result, key }); setAck(false) })}>Review reminders and dates</button>
      {current && <div>
        <p className="ou-callout tone-warning">{current.rows.length} contacts · {settings.mode === 'automatic' ? 'Automatic sends authorized only for this frozen message set and date range' : 'Each due message will need your approval'} · {date(current.starts_at)} to {date(current.ends_at)}</p>
        {current.rows.map((row) => <details key={row.original_id} className="ou-card ou-card-body"><summary>{row.school_name} · {row.email}</summary>{row.steps.map((step) => <div key={step.number} className="ou-mail"><div className="ou-mail-head"><span>Follow-up {step.number} · day {step.day} · {step.already_sent ? 'Already sent; will not repeat' : date(step.due_at)}</span><strong>{step.subject}</strong></div><div className="ou-mail-body" style={{ whiteSpace: 'pre-wrap' }}>{step.body}</div><p className="ou-muted">{step.attachments.join(', ') || 'No PDFs'}</p></div>)}</details>)}
        {settings.mode === 'automatic' && <label className="ou-field"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I authorize these specific messages to these contacts from my mailbox, within the displayed dates, business window and existing sending limits.</label>}
        <button className="ou-btn ou-btn-solid" disabled={busy || (settings.mode === 'automatic' && !ack)} onClick={() => act(async () => { await api.post('/api/outreach/sequence-enrollments/commit', { review_id: current.review_id, settings: payload, ...(settings.mode === 'automatic' ? { confirm: 'AUTHORIZE_AUTOMATIC_SEQUENCE' } : {}) }); setReview(null); setSettings({ ...settings, original_ids: [] }); setNote('Follow-up plan saved. Only approved reminders to eligible contacts can be sent.') })}>{settings.mode === 'automatic' ? 'Approve automatic reminders' : 'Save plan; approve each reminder'}</button>
      </div>}
    </section>
    <section className="ou-card ou-card-body"><h3 className="ou-card-title">My enrollments</h3>
      <div className="ou-toolbar"><span>{state.enrollmentTotal} enrollments</span><button className="ou-btn ou-btn-ghost" disabled={enrollmentPage === 1} onClick={() => setEnrollmentPage(enrollmentPage - 1)}>Previous enrollments</button><button className="ou-btn ou-btn-ghost" disabled={enrollmentPage * 50 >= state.enrollmentTotal} onClick={() => setEnrollmentPage(enrollmentPage + 1)}>Next enrollments</button></div>
      {!state.enrollments.length && <p className="ou-muted">No contacts enrolled yet.</p>}
      {state.enrollments.map((enrollment) => <details className="ou-card ou-card-body" key={enrollment.id}><summary>{enrollment.school_name} · {enrollment.mode} · {enrollment.status}</summary>
        <p>{enrollment.email} · {enrollment.sequence_name} v{enrollment.revision}</p>
        {enrollment.reason && <p className="ou-callout tone-warning">{enrollment.reason}</p>}
        {enrollment.steps.map((step) => <div key={step.id} className="ou-toolbar"><span>Step {step.number} · {step.status} · {date(step.due_at)}{step.approved_until ? ` · Approved until ${date(step.approved_until)}` : ''}</span>
          {enrollment.status === 'active' && enrollment.mode === 'review' && step.status === 'waiting' && <button className="ou-btn ou-btn-ghost ou-btn-sm" disabled={busy} onClick={() => act(async () => setStepReview({ ...(await api.post(`/api/outreach/sequence-steps/${step.id}/preview`, {})), id: step.id }))}>Review step</button>}
        </div>)}
        {enrollment.status === 'active' && <button className="ou-btn ou-btn-danger" disabled={busy} onClick={() => act(() => api.post(`/api/outreach/sequence-enrollments/${enrollment.id}/cancel`, {}))}>Revoke remaining sends</button>}
      </details>)}
    </section>
    {stepReview && <section className="ou-card ou-card-body"><h3 className="ou-card-title">Approve one due step</h3><p>To {stepReview.email}</p><strong>{stepReview.subject}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{stepReview.body}</p><p>{stepReview.attachments.join(', ') || 'No PDFs'}</p>
      <p className="ou-muted">Approval lasts 15 minutes and sends only within the sequence business window. Review again if it expires.</p>
      <button className="ou-btn ou-btn-solid" disabled={busy} onClick={() => act(async () => { await api.post(`/api/outreach/sequence-steps/${stepReview.id}/approve`, { preview_token: stepReview.preview_token }); setStepReview(null) })}>Approve this due message</button>{' '}<button className="ou-btn ou-btn-ghost" onClick={() => setStepReview(null)}>Close</button>
    </section>}
  </div>
}
