import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from './lib/api'
import { useDebounced, useResource } from './lib/crm'
import { estimateProgram } from './lib/programCommissions'
import DataTable from './components/DataTable'
import Modal from './components/Modal'
import StatCard from './components/StatCard'
import { Empty, ErrorNotice } from './components/WorkspaceUI'
import './styles/program-commissions.css'

const usd = (value) => value == null ? 'Not allocated' : Number(value).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
const label = (key) => ({ gross: 'Gross', leagueapps_fee: 'LeagueApps fee', cash_expenses: 'Cash expenses',
  commission_base: 'Commission base', pool: 'Commission pool', rep_payout: 'Rep payout', director_remainder: 'Sales Director remainder' })[key]

function ProgramDialog({ record, reps, seasons, onClose, onSaved }) {
  const [school, setSchool] = useState(record ? { id: record.sales_school_id, school_name: record.school_name } : null)
  const [query, setQuery] = useState('')
  const search = useDebounced(query.trim())
  const results = useResource(!record && !school && search.length >= 2 ? `/api/crm/schools?q=${encodeURIComponent(search)}&limit=8` : null)
  const [form, setForm] = useState({ season: record?.season || '', program: record?.program || '',
    rep_id: record?.rep_id || '', sale_type: record?.sale_type || 'new', gross: record?.gross ?? '',
    leagueapps: record?.leagueapps ?? false, cash_expenses: record?.cash_expenses ?? 0,
    rep_payout: record?.rep_payout ?? '', notes: record?.notes || '', voided: record?.voided || false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const values = estimateProgram(form)
  const invalid = values.commission_base < 0 || (values.rep_payout != null && (values.rep_payout > values.pool || values.rep_payout < 0))
  const field = (key, value) => setForm((old) => ({ ...old, [key]: value }))
  async function save(event) {
    event.preventDefault()
    if (!school || invalid) return
    setBusy(true)
    setError('')
    const body = { ...form, sales_school_id: school.id, rep_id: Number(form.rep_id),
      gross: form.gross, cash_expenses: form.cash_expenses, rep_payout: form.rep_payout === '' ? null : form.rep_payout }
    if (record) body.revision = record.revision
    try {
      if (record) await api.put(`/api/admin/program-commissions/${record.id}`, body)
      else await api.post('/api/admin/program-commissions', body)
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <Modal title={record ? 'Edit seasonal program' : 'Add seasonal program'} onClose={onClose} size="lg"
    footer={<><button className="modern-btn-primary is-neutral" onClick={onClose}>Cancel</button>
      <button className="modern-btn-primary" form="program-commission-form" type="submit" disabled={busy || !school || invalid}>{busy ? 'Saving...' : 'Save program'}</button></>}>
    <form id="program-commission-form" className="workspace-form" onSubmit={save}>
      <ErrorNotice error={error || (invalid ? 'Expenses must fit within net revenue, and the rep payout must fit within the pool.' : '')} />
      <div className="workspace-field">School
        {school ? <div className="workspace-actions"><strong>{school.school_name}</strong>{!record && <button type="button" className="ui-link-button" onClick={() => setSchool(null)}>Change</button>}</div>
          : <><input className="ui-input" aria-label="Find school" placeholder="Search existing schools" value={query} onChange={(e) => setQuery(e.target.value)} />
            <ErrorNotice error={results.error} />
            {results.loading && <span className="workspace-subtle">Searching...</span>}
            {!results.loading && search.length >= 2 && results.data && !results.data.items?.length && <span className="workspace-subtle">No matching schools. Add the school in Schools first.</span>}
            {(results.data?.items || []).map((row) => <button type="button" className="ui-link-button" key={row.id} onClick={() => { setSchool(row); field('rep_id', row.user_id) }}>{row.school_name}</button>)}</>}
      </div>
      <div className="commission-form-grid">
        <label className="workspace-field">Season<input className="ui-input" required maxLength={80} list="commission-seasons" placeholder="Winter 2026/27" value={form.season} onChange={(e) => field('season', e.target.value)} /></label>
        <datalist id="commission-seasons">{seasons.map((season) => <option key={season} value={season} />)}</datalist>
        <label className="workspace-field">Program<input className="ui-input" required maxLength={120} placeholder="After-school soccer" value={form.program} onChange={(e) => field('program', e.target.value)} /></label>
        <label className="workspace-field">Sales rep<select className="ui-input" required value={form.rep_id} onChange={(e) => field('rep_id', e.target.value)}><option value="">Choose rep</option>{reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
        <label className="workspace-field">Sale type<select className="ui-input" value={form.sale_type} onChange={(e) => field('sale_type', e.target.value)}><option value="new">New sale: 15% pool</option><option value="renewal">Renewal: 7.5% pool</option></select></label>
        <label className="workspace-field">Gross revenue (USD)<input className="ui-input" type="number" min="0" max="9999999999.99" step="0.01" required value={form.gross} onChange={(e) => field('gross', e.target.value)} /></label>
        <label className="workspace-field">Cash expenses (USD)<input className="ui-input" type="number" min="0" max="9999999999.99" step="0.01" required value={form.cash_expenses} onChange={(e) => field('cash_expenses', e.target.value)} /></label>
      </div>
      <label className="commission-checkbox"><input type="checkbox" checked={form.leagueapps} onChange={(e) => field('leagueapps', e.target.checked)} />Registered through LeagueApps (3.5% of Gross)</label>
      <div className="commission-breakdown" aria-live="polite">{['gross', 'leagueapps_fee', 'cash_expenses', 'commission_base', 'pool'].map((key) => <div key={key}><span>{label(key)}{key === 'pool' ? ` (${values.pool_rate}%)` : ''}</span><strong>{usd(values[key])}</strong></div>)}</div>
      <label className="workspace-field">Rep payout from this pool (USD)
        <input className="ui-input" type="number" min="0" max={Math.max(0, values.pool)} step="0.01" placeholder="Leave blank until agreed" value={form.rep_payout} onChange={(e) => field('rep_payout', e.target.value)} />
      </label>
      <button type="button" className="ui-link-button" disabled={values.pool < 0} onClick={() => field('rep_payout', values.pool)}>Allocate the full pool to this rep</button>
      <p className="workspace-subtle">Rep payout is an agreed dollar amount, not an assumed default rate. Leave it blank to mark the program for review. Enter 0 only when the full pool belongs to the Sales Director.</p>
      <div className="commission-breakdown"><div><span>Sales Director remainder</span><strong>{usd(values.director_remainder)}</strong></div></div>
      <label className="workspace-field">Notes<textarea className="ui-input" rows={3} maxLength={4000} value={form.notes} onChange={(e) => field('notes', e.target.value)} /></label>
      {record && <label className="commission-checkbox"><input type="checkbox" checked={form.voided} onChange={(e) => field('voided', e.target.checked)} />Void this program (keep its history; exclude it from totals)</label>}
      <p className="workspace-subtle">Saving does not change the school's pipeline stage or owner. Calculations are allocations, not proof of payment.</p>
    </form>
  </Modal>
}

function HistoryDialog({ record, onClose }) {
  const { data, error, loading } = useResource(`/api/admin/program-commissions/${record.id}/history`)
  return <Modal title={`Commission history: ${record.school_name}`} onClose={onClose} size="lg">
    <ErrorNotice error={error} />{loading && <p>Loading history...</p>}
    {(data || []).map((event) => <div className="commission-history" key={event.id}>
      <strong>{event.before ? 'Updated' : 'Created'} · {new Date(event.created_at).toLocaleString()}</strong>
      <p className="workspace-subtle">Administrator ID: {event.actor_id ?? 'Former administrator'} · Revision {event.after.revision}</p>
      <p>{event.after.season} · {event.after.program} · {event.after.rep_name} · {event.after.sale_type}{event.after.voided ? ' · Voided' : ''}</p>
      {['gross', 'leagueapps_fee', 'cash_expenses', 'pool', 'rep_payout', 'director_remainder'].map((key) => <div key={key}>{label(key)}: {event.before ? `${usd(event.before[key])} → ` : ''}{usd(event.after[key])}</div>)}
      {event.after.notes && <p>{event.after.notes}</p>}
    </div>)}
  </Modal>
}

export default function ProgramCommissions() {
  const [season, setSeason] = useState('')
  const [rep, setRep] = useState('')
  const [editing, setEditing] = useState(null)
  const [history, setHistory] = useState(null)
  const [exportError, setExportError] = useState('')
  const query = new URLSearchParams({ ...(season && { season }), ...(rep && { rep_id: rep }) }).toString()
  const path = `/api/admin/program-commissions${query ? `?${query}` : ''}`
  const { data, error, loading, reload } = useResource(path)
  const summary = data?.summary
  async function download() {
    try {
      setExportError('')
      const result = await api.get(`${path}${query ? '&' : '?'}format=csv`)
      const url = URL.createObjectURL(new Blob([result.raw], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url; link.download = 'psa-seasonal-commissions.csv'; link.click()
      URL.revokeObjectURL(url)
    } catch (err) { setExportError(err.message) }
  }
  const columns = [
    { key: 'school', header: 'School / program', render: (row) => <><strong>{row.sales_school_id ? <Link to={`/schools/${row.sales_school_id}`}>{row.school_name}</Link> : row.school_name}</strong><br /><span className="workspace-subtle">{row.program} · {row.season}</span></> },
    { key: 'rep_name', header: 'Rep' },
    { key: 'sale_type', header: 'Sale', render: (row) => `${row.sale_type === 'new' ? 'New' : 'Renewal'} (${row.pool_rate}%)` },
    ...['gross', 'commission_base', 'pool', 'rep_payout', 'director_remainder'].map((key) => ({ key, header: label(key), render: (row) => usd(row[key]) })),
    { key: 'actions', header: 'Review', render: (row) => <div className="workspace-actions">{row.voided ? <span>Voided</span> : row.needs_review && <span>Needs payout</span>}<button className="ui-link-button" onClick={() => setEditing(row)}>Edit</button><button className="ui-link-button" onClick={() => setHistory(row)}>History</button></div> },
  ]
  return <>
    <p className="workspace-subtle">Per school, program and season: Gross minus the optional 3.5% LeagueApps fee and cash expenses. New sales allocate 15%; renewals allocate 7.5%. The Sales Director receives the pool minus the agreed rep payout. Amounts are rounded to cents at each step.</p>
    <div className="workspace-actions commission-toolbar">
      <label className="workspace-field">Season<select className="ui-input" value={season} onChange={(e) => setSeason(e.target.value)}><option value="">All seasons</option>{(data?.seasons || []).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="workspace-field">Rep<select className="ui-input" value={rep} onChange={(e) => setRep(e.target.value)}><option value="">All reps</option>{(data?.reps || []).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      <button className="modern-btn-primary is-neutral" disabled={!data?.records?.length || loading} onClick={download}>Export CSV</button>
      <button className="modern-btn-primary" onClick={() => setEditing('new')}>Add seasonal program</button>
    </div>
    <ErrorNotice error={error || exportError} />
    <div className="workspace-metrics">
      <StatCard label="Commission pool" value={summary ? usd(summary.pool) : '...'} caption="Programs excluding voids" />
      <StatCard label="Rep payouts" value={summary ? usd(summary.rep_payout) : '...'} caption="Agreed allocations, not payments" />
      <StatCard label="Sales Director" value={summary ? usd(summary.director_remainder) : '...'} caption="Remainder on allocated programs" />
      <StatCard label="Awaiting allocation" value={summary ? usd(summary.unallocated_pool) : '...'} caption={`${summary?.needs_review ?? 0} programs need a payout decision`} />
    </div>
    <h2 className="workspace-section-title">Programs</h2>
    {loading && <p>Loading programs...</p>}
    {!loading && !error && !data?.records?.length ? <Empty title="No seasonal programs yet" text="Add a program using confirmed revenue and expenses, then allocate the commission pool." /> : <DataTable rows={data?.records || []} columns={columns} rowKey={(row) => row.id} />}
    <h2 className="workspace-section-title">Totals by rep</h2>
    <DataTable rows={data?.by_rep || []} rowKey={(row) => `${row.rep_id}-${row.rep_name}`} columns={[
      { key: 'rep_name', header: 'Rep' }, { key: 'programs', header: 'Programs' },
      ...['pool', 'rep_payout', 'director_remainder'].map((key) => ({ key, header: label(key), render: (row) => usd(row[key]) })),
    ]} />
    <h2 className="workspace-section-title">Totals by season</h2>
    <DataTable rows={data?.by_season || []} rowKey={(row) => row.season} columns={[
      { key: 'season', header: 'Season' }, { key: 'programs', header: 'Programs' },
      ...['gross', 'pool', 'rep_payout', 'director_remainder'].map((key) => ({ key, header: label(key), render: (row) => usd(row[key]) })),
    ]} />
    {editing && <ProgramDialog record={editing === 'new' ? null : editing} reps={data?.reps || []} seasons={data?.seasons || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    {history && <HistoryDialog record={history} onClose={() => setHistory(null)} />}
  </>
}
