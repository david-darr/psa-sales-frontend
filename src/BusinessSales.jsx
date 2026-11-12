import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Modal from './components/Modal'
import AssignmentDialog from './components/AssignmentDialog'
import SchoolContacts from './components/SchoolContacts'
import { ErrorNotice, Pagination } from './components/WorkspaceUI'
import { useResource, useDebounced } from './lib/crm'
import { useAuth } from './hooks/useAuth'
import api from './lib/api'
import './styles/business.css'

const STAGES = [
  ['pending', 'New prospect'], ['contacted', 'Contacted'], ['replied', 'In conversation'],
  ['meeting', 'Sponsorship discussion'], ['partner', 'Active sponsor'],
  ['former', 'Former sponsor'], ['not_interested', 'Closed'],
]
const label = (value) => STAGES.find(([id]) => id === value)?.[1] || value
const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0))

function BusinessEditor({ record, onClose, onSaved }) {
  const { user } = useAuth()
  const { data: team } = useResource(user.admin ? '/api/crm/team' : null)
  const [draft, setDraft] = useState(() => ({ school_name: record?.school_name || '', email: record?.email || '', contact_name: record?.contact_name || '', phone: record?.phone || '', address: record?.address || '', county: record?.county || '', website: record?.website || '', industry: record?.industry || '', status: record?.status || 'pending', notes: record?.notes || '', next_action: record?.next_action || '', next_action_at: record?.next_action_at?.slice(0, 10) || '', sponsorship_value: record?.sponsorship_value ?? '', user_id: record?.user_id ?? user.id }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const field = (key, value) => setDraft((old) => ({ ...old, [key]: value }))
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const body = { ...draft, next_action_at: draft.next_action_at ? `${draft.next_action_at}T12:00:00` : null }
      if (!user.admin) delete body.user_id
      if (record) await api.patch(`/api/sales-schools/${record.id}`, body)
      else await api.post('/api/add-school', { ...body, school_type: 'business' })
      onSaved(); onClose()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <Modal title={record ? 'Edit business' : 'Add business'} onClose={onClose} footer={<><button className="modern-btn-primary is-neutral" onClick={onClose} disabled={busy}>Cancel</button><button className="modern-btn-primary" form="business-form" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save business'}</button></>}>
    <form id="business-form" className="workspace-form" onSubmit={save}>
      <ErrorNotice error={error} />
      <p className="workspace-subtle">This record stays in Business Sales. Saving never sends email.</p>
      <div className="workspace-form-grid">{[['school_name', 'Business name', 'text'], ['email', 'Primary email', 'email'], ['contact_name', 'Contact name', 'text'], ['industry', 'Industry', 'text'], ['phone', 'Phone', 'tel'], ['website', 'Website', 'url'], ['address', 'Address', 'text'], ['county', 'County', 'text']].map(([key, name, type]) => <label className="workspace-field" key={key}>{name}<input autoFocus={key === 'school_name'} className="ui-input" type={type} required={key === 'school_name'} maxLength={key === 'industry' ? 100 : key === 'county' ? 80 : 240} value={draft[key]} onChange={(e) => field(key, e.target.value)} /></label>)}</div>
      <div className="workspace-form-grid"><label className="workspace-field">Stage<select className="ui-select" value={draft.status} onChange={(e) => field('status', e.target.value)}>{STAGES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="workspace-field">Sponsorship value (USD)<input className="ui-input" type="number" min="0" step="0.01" max="9999999999.99" value={draft.sponsorship_value} onChange={(e) => field('sponsorship_value', e.target.value)} /></label></div>
      {user.admin && <label className="workspace-field">Owner<select className="ui-select" value={draft.user_id ?? ''} onChange={(e) => field('user_id', e.target.value ? Number(e.target.value) : null)}><option value="">Unassigned</option>{(team || []).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
      <label className="workspace-field">Next action<input className="ui-input" maxLength={500} value={draft.next_action} onChange={(e) => field('next_action', e.target.value)} placeholder="Send sponsor proposal, arrange a call…" /></label>
      <label className="workspace-field">Action date<input className="ui-input" type="date" value={draft.next_action_at} onChange={(e) => field('next_action_at', e.target.value)} /></label>
      <label className="workspace-field">Notes<textarea className="ui-input" rows={4} maxLength={20000} value={draft.notes} onChange={(e) => field('notes', e.target.value)} /></label>
    </form>
  </Modal>
}

function BusinessDetail({ id }) {
  const { data, loading, error, reload } = useResource(`/api/sales-schools/${id}`)
  const [editing, setEditing] = useState(false)
  const row = data?.school
  return <AppLayout title={row?.school_name || 'Business'} subtitle="Sponsorship relationship, contacts and next steps" actions={row && <button className="modern-btn-primary" onClick={() => setEditing(true)}>Edit business</button>}>
    <Link to="/businesses/records">← All businesses</Link><ErrorNotice error={error} />
    {loading && !row && <p role="status">Loading business…</p>}
    {row && <><div className="business-detail-grid"><section className="workspace-panel business-panel"><h2>{label(row.status)}</h2><p>{row.industry || 'Industry not added'}</p><dl><dt>Owner</dt><dd>{row.owner_name || 'Unassigned'}</dd><dt>Sponsorship value</dt><dd>{row.sponsorship_value == null ? 'Not set' : money(row.sponsorship_value)}</dd><dt>Address</dt><dd>{row.address || 'Not added'}</dd><dt>Website</dt><dd>{row.website || 'Not added'}</dd><dt>Next action</dt><dd>{row.next_action || 'Choose a next action'}{row.next_action_at && ` · ${row.next_action_at.slice(0, 10)}`}</dd></dl><p className="business-notes">{row.notes || 'No notes yet.'}</p><Link className="modern-btn-primary" to={`/businesses/outreach?tab=compose&school_ids=${row.id}`}>Prepare sponsorship outreach</Link></section><section className="workspace-panel business-panel"><h2>Relationship history</h2>{data.timeline.length ? data.timeline.map((item, i) => <div className="business-activity" key={i}><strong>{item.kind}</strong><p>{item.detail}</p><small>{item.at?.slice(0, 10)}</small></div>) : <p>No activity recorded yet.</p>}</section></div><SchoolContacts schoolId={row.id} onChanged={reload} /></>}
    {editing && <BusinessEditor record={row} onClose={() => setEditing(false)} onSaved={reload} />}
  </AppLayout>
}

export default function BusinessSales() {
  const { id } = useParams()
  const view = useLocation().pathname.split('/')[2]
  return id ? <BusinessDetail key={id} id={id} /> : <BusinessList key={view || 'overview'} view={view || 'overview'} />
}

function BusinessList({ view }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const { data: team } = useResource(user.admin ? '/api/crm/team' : null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const q = useDebounced(params.get('q') || '')
  const page = Number(params.get('page')) || 1
  const filters = new URLSearchParams({ q, page, limit: 100, scope: params.get('scope') || (user.admin ? 'team' : 'mine') })
  if (user.admin && params.get('owner')) filters.set('owner', params.get('owner'))
  if (view === 'sponsors') filters.set('stage', 'partner,former')
  else if (params.get('stage')) filters.set('stage', params.get('stage'))
  const { data, loading, error: loadError, reload } = useResource(`/api/crm/schools?${filters}`)
  const { data: overview, reload: refreshOverview } = useResource('/api/crm/overview')
  const rows = data?.items || []
  const change = (key, value) => { const next = new URLSearchParams(params); next.delete('page'); value ? next.set(key, value) : next.delete(key); setParams(next) }
  const saved = () => { reload(); refreshOverview() }
  const move = async (row, status) => {
    setBusy(true); setError('')
    try { await api.patch(`/api/sales-schools/${row.id}`, { status }); saved() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const claim = async (row) => {
    setBusy(true); setError('')
    try { await api.post(`/api/crm/schools/${row.id}/claim`, {}); saved() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <AppLayout title={view === 'pipeline' ? 'Sponsorship pipeline' : view === 'sponsors' ? 'Sponsors' : view === 'records' ? 'Businesses' : 'Business Sales'} subtitle="Build local business relationships and sponsorships. Your school work stays separate." actions={<button className="modern-btn-primary" onClick={() => setEditing('new')}>Add business</button>}>
    <ErrorNotice error={loadError || error} />
    {view === 'overview' && <div className="business-metrics">{[['Businesses', overview?.schools || 0], ['Active sponsors', overview?.pipeline?.partner || 0], ['Conversations', overview?.pipeline?.replied || 0], ['Open tasks', overview?.tasks_open || 0]].map(([name, value]) => <div className="workspace-panel business-panel" key={name}><span>{name}</span><strong>{value}</strong></div>)}</div>}
    <div className="workspace-panel business-panel">
      <div className="business-toolbar"><label className="workspace-field">Find a business<input className="ui-input" type="search" value={params.get('q') || ''} onChange={(e) => change('q', e.target.value)} placeholder="Business, contact or address" /></label><label className="workspace-field">Ownership<select className="ui-select" value={params.get('scope') || (user.admin ? 'team' : 'mine')} onChange={(e) => change('scope', e.target.value)}>{user.admin && <option value="team">All businesses</option>}<option value="mine">My businesses</option><option value="unassigned">Unassigned pool</option></select></label><label className="workspace-field">Stage<select className="ui-select" disabled={view === 'sponsors'} value={params.get('stage') || ''} onChange={(e) => change('stage', e.target.value)}><option value="">All stages</option>{STAGES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></div>
      {user.admin && <div className="business-toolbar"><label className="workspace-field">Sales rep<select className="ui-select" value={params.get('owner') || ''} onChange={(e) => change('owner', e.target.value)}><option value="">All reps</option>{(team || []).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><button className="modern-btn-primary is-neutral" disabled={loading || !data?.total} onClick={() => setAssigning(true)}>Assign all matching businesses</button></div>}
      {loading && <p role="status">Loading businesses…</p>}
      {!loading && !rows.length && <div className="business-empty"><h2>No businesses here yet</h2><p>Add a business or change your filters to get started. No schools are moved into this workspace.</p></div>}
      {view === 'pipeline' ? <div className="business-pipeline">{STAGES.map(([status, name]) => <section key={status}><h2>{name}</h2>{rows.filter((row) => row.status === status).map((row) => <article className="workspace-panel business-panel" key={row.id}><Link to={`/businesses/${row.id}`}>{row.school_name}</Link><p>{row.owner_name || 'Unassigned'}</p><label className="workspace-field">Move to<select className="ui-select" disabled={busy || (!user.admin && row.user_id !== user.id)} value={row.status} onChange={(e) => move(row, e.target.value)}>{STAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></article>)}</section>)}</div> : <ul className="business-records">{rows.map((row) => <li key={row.id}><button className="business-record-open" onClick={() => navigate(`/businesses/${row.id}`)}><strong>{row.school_name}</strong><span>{row.industry || row.contact_name || 'Add contact details'}</span></button><span>{label(row.status)}</span><span>{row.owner_name || 'Unassigned'}</span>{row.user_id == null ? <button className="modern-btn-primary is-small" disabled={busy} onClick={() => claim(row)}>Claim business</button> : <button className="modern-btn-primary is-neutral is-small" onClick={() => setEditing(row)}>Edit</button>}</li>)}</ul>}
      <Pagination page={page} limit={100} total={data?.total || 0} onPage={(value) => { const next = new URLSearchParams(params); next.set('page', value); setParams(next) }} />
      {view === 'pipeline' && <p className="workspace-subtle">The board shows this page of up to 100 matching businesses. Use search, ownership and page controls for larger pipelines.</p>}
    </div>
    {assigning && <AssignmentDialog filters={Object.fromEntries([...filters].filter(([key]) => !['page','limit','sort'].includes(key)))} team={team || []} onClose={() => setAssigning(false)} onSaved={() => { setAssigning(false); saved() }} />}
    {editing && <BusinessEditor record={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={saved} />}
  </AppLayout>
}
