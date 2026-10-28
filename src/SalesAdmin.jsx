import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import DataTable from './components/DataTable'
import Icon from './components/Icon'
import Modal from './components/Modal'
import StatCard from './components/StatCard'
import { Empty, ErrorNotice, Segmented, StageBadge } from './components/WorkspaceUI'
import { dateLabel, localToday, useDebounced, useResource } from './lib/crm'
import api from './lib/api'
import './styles/portfolio.css'

const TABS = [
  { value: 'ownership', label: 'Ownership' },
  { value: 'commissions', label: 'Commissions' },
]

const currency = (value) =>
  value === null || value === undefined
    ? 'Not set'
    : value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })

function rangeFor(preset) {
  const today = new Date()
  const iso = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  if (preset === 'month') return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: localToday() }
  if (preset === 'last') {
    return {
      from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  if (preset === 'year') return { from: `${today.getFullYear()}-01-01`, to: localToday() }
  return { from: '', to: '' }
}

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

function exportCsv(closes) {
  const lines = [['School', 'Stage', 'Closed', 'Deal value', 'Rep', 'Share %', 'Rate %', 'Commission']]
  closes.forEach((close) =>
    close.earners.forEach((line) =>
      lines.push([
        close.school_name,
        close.status,
        close.closed_at ? close.closed_at.slice(0, 10) : '',
        close.deal_value ?? '',
        line.name,
        line.share_pct,
        line.effective_rate_pct ?? '',
        line.commission ?? '',
      ]),
    ),
  )
  const blob = new Blob([lines.map((line) => line.map(csvCell).join(',')).join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `psa-commissions-${localToday()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function Ownership() {
  const { data, loading, error } = useResource('/api/crm/portfolio')
  const reps = data?.reps || []
  if (error) return <ErrorNotice error={error} />
  if (!loading && !reps.length) return <Empty title="No reps yet" text="Share a sign-up link from Team to add reps." />
  return (
    <DataTable
      rowKey={(rep) => rep.id}
      rows={reps}
      columns={[
        {
          key: 'name',
          header: 'Rep',
          render: (rep) => (
            <span>
              <strong>{rep.name}</strong>
              {rep.admin && <span className="workspace-subtle"> · Admin</span>}
              <br />
              <span className="workspace-subtle">{rep.email}</span>
            </span>
          ),
        },
        { key: 'total', header: 'Schools owned', render: (rep) => rep.counts.total },
        { key: 'pipeline', header: 'In pipeline', render: (rep) => rep.counts.pipeline },
        { key: 'active', header: 'Active clients', render: (rep) => rep.counts.active },
        { key: 'former', header: 'Former clients', render: (rep) => rep.counts.former },
        { key: 'recent', header: 'Closed, last 90 days', render: (rep) => rep.closed_last_90 },
        {
          key: 'open',
          header: '',
          render: (rep) => (
            <span className="workspace-actions">
              <Link className="modern-btn-primary is-neutral is-small" to={`/schools?owner=${rep.id}`}>
                Schools
              </Link>
              <Link className="modern-btn-primary is-neutral is-small" to={`/map?owner=${rep.id}`}>
                Map
              </Link>
            </span>
          ),
        },
      ]}
    />
  )
}

function RateCell({ rep, onSaved }) {
  const [value, setValue] = useState(rep.commission_rate ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dirty = String(value) !== String(rep.commission_rate ?? '')
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await api.patch(`/api/admin/reps/${rep.id}`, { commission_rate: value === '' ? null : Number(value) })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <input
        className="ui-input"
        style={{ width: 84 }}
        type="number"
        min={0}
        max={100}
        step="0.5"
        aria-label={`Default commission rate for ${rep.name}`}
        placeholder="%"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {dirty && (
        <button className="modern-btn-primary is-small" disabled={busy} onClick={save}>
          Save
        </button>
      )}
      {error && <span className="workspace-subtle" role="alert">{error}</span>}
    </span>
  )
}

function CloseDialog({ close, reps, onClose, onSaved }) {
  const [schoolQuery, setSchoolQuery] = useState('')
  const [school, setSchool] = useState(close ? { id: close.id, school_name: close.school_name } : null)
  const search = useDebounced(schoolQuery.trim())
  const results = useResource(!close && search.length >= 2 ? `/api/crm/schools?q=${encodeURIComponent(search)}&limit=8` : null)
  const [status, setStatus] = useState(close?.status || 'partner')
  const [dealValue, setDealValue] = useState(close?.deal_value ?? '')
  const [closedBy, setClosedBy] = useState(close?.closed_by_id || close?.owner_id || '')
  const [closedOn, setClosedOn] = useState(close?.closed_at ? close.closed_at.slice(0, 10) : localToday())
  const [splits, setSplits] = useState(
    close?.custom_split
      ? close.earners.map((line) => ({ user_id: line.user_id, share_pct: line.share_pct, rate_pct: line.rate_pct ?? '' }))
      : [],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shareTotal = splits.reduce((sum, split) => sum + Number(split.share_pct || 0), 0)

  const save = async (event) => {
    event.preventDefault()
    if (!school) return setError('Choose a school.')
    setBusy(true)
    setError('')
    try {
      await api.put(`/api/admin/schools/${school.id}/close`, {
        status,
        deal_value: dealValue === '' ? null : Number(dealValue),
        closed_by_id: Number(closedBy),
        closed_on: closedOn,
        splits: splits.map((split) => ({
          user_id: Number(split.user_id),
          share_pct: Number(split.share_pct),
          rate_pct: split.rate_pct === '' ? null : Number(split.rate_pct),
        })),
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const setSplit = (index, key, value) =>
    setSplits((old) => old.map((split, i) => (i === index ? { ...split, [key]: value } : split)))

  return (
    <Modal
      title={close ? `Edit close: ${close.school_name}` : 'Record a close'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="modern-btn-primary is-neutral" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="modern-btn-primary" type="submit" form="close-form" disabled={busy}>
            {busy ? 'Saving...' : 'Save close'}
          </button>
        </>
      }
    >
      <form id="close-form" className="workspace-form" onSubmit={save}>
        <ErrorNotice error={error} />
        {!close && (
          <label className="workspace-field">
            School
            {school ? (
              <span className="workspace-actions">
                <strong>{school.school_name}</strong>
                <button type="button" className="ui-link-button" onClick={() => setSchool(null)}>
                  Change
                </button>
              </span>
            ) : (
              <>
                <input
                  className="ui-input"
                  placeholder="Search schools by name"
                  value={schoolQuery}
                  onChange={(e) => setSchoolQuery(e.target.value)}
                />
                {(results.data?.items || []).map((row) => (
                  <button
                    type="button"
                    key={row.id}
                    className="ui-link-button"
                    style={{ textAlign: 'left' }}
                    onClick={() => {
                      setSchool(row)
                      setClosedBy(row.user_id)
                    }}
                  >
                    {row.school_name} · {row.user_name || row.owner_name}
                  </button>
                ))}
              </>
            )}
          </label>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label className="workspace-field" style={{ flex: 1, minWidth: 160 }}>
            Stage
            <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="partner">Active client</option>
              <option value="former">Former client</option>
            </select>
          </label>
          <label className="workspace-field" style={{ flex: 1, minWidth: 160 }}>
            Deal value (USD)
            <input
              className="ui-input"
              type="number"
              min={0}
              step="0.01"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
            />
          </label>
          <label className="workspace-field" style={{ flex: 1, minWidth: 160 }}>
            Close date
            <input className="ui-input" type="date" value={closedOn} onChange={(e) => setClosedOn(e.target.value)} />
          </label>
          <label className="workspace-field" style={{ flex: 1, minWidth: 160 }}>
            Closed by
            <select className="ui-input" required value={closedBy} onChange={(e) => setClosedBy(e.target.value)}>
              <option value="">Choose a rep</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="workspace-field">
          Commission split
          <p className="workspace-subtle">
            {splits.length
              ? `Shares total ${shareTotal}%. They must add up to 100%. Leave a rate blank to use that rep's default.`
              : 'The closer earns 100% at their default rate. Add a split to share credit or override a rate.'}
          </p>
          {splits.map((split, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="ui-input"
                style={{ flex: 2, minWidth: 150 }}
                aria-label="Rep"
                value={split.user_id}
                onChange={(e) => setSplit(index, 'user_id', e.target.value)}
              >
                <option value="">Choose a rep</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
              <input
                className="ui-input"
                style={{ width: 96 }}
                type="number"
                min={0}
                max={100}
                aria-label="Share percent"
                placeholder="Share %"
                value={split.share_pct}
                onChange={(e) => setSplit(index, 'share_pct', e.target.value)}
              />
              <input
                className="ui-input"
                style={{ width: 96 }}
                type="number"
                min={0}
                max={100}
                step="0.5"
                aria-label="Rate override percent"
                placeholder="Rate %"
                value={split.rate_pct}
                onChange={(e) => setSplit(index, 'rate_pct', e.target.value)}
              />
              <button
                type="button"
                className="ui-link-button"
                onClick={() => setSplits((old) => old.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="modern-btn-primary is-neutral is-small"
            style={{ alignSelf: 'flex-start' }}
            onClick={() =>
              setSplits((old) =>
                old.length
                  ? [...old, { user_id: '', share_pct: '', rate_pct: '' }]
                  : [
                      { user_id: closedBy, share_pct: 50, rate_pct: '' },
                      { user_id: '', share_pct: 50, rate_pct: '' },
                    ],
              )
            }
          >
            <Icon name="plus" size={13} /> Add a rep to the split
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Commissions() {
  const [preset, setPreset] = useState('month')
  const range = rangeFor(preset)
  const query = new URLSearchParams(Object.entries(range).filter(([, value]) => value)).toString()
  const { data, loading, error, reload } = useResource(`/api/admin/commissions${query ? `?${query}` : ''}`)
  const [editing, setEditing] = useState(null)
  const [reviewOnly, setReviewOnly] = useState(false)
  const reps = useMemo(() => data?.reps || [], [data])
  const closes = (data?.closes || []).filter((close) => !reviewOnly || close.needs_review)

  return (
    <>
      <div className="workspace-actions" style={{ justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' }}>
        <Segmented
          label="Period"
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'month', label: 'This month' },
            { value: 'last', label: 'Last month' },
            { value: 'year', label: 'This year' },
            { value: 'all', label: 'All time' },
          ]}
        />
        <span className="workspace-actions">
          <button className="modern-btn-primary is-neutral" disabled={!closes.length} onClick={() => exportCsv(closes)}>
            <Icon name="download" size={14} /> Export CSV
          </button>
          <button className="modern-btn-primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={14} /> Record a close
          </button>
        </span>
      </div>
      <ErrorNotice error={error} />
      <div className="workspace-metrics" style={{ marginBottom: 20 }}>
        <StatCard label="Closes" value={data?.summary.closes ?? '…'} caption="Active or former clients closed" />
        <StatCard label="Deal value" value={data ? currency(data.summary.deal_value) : '…'} caption="Recorded on closes" tone="success" />
        <StatCard label="Commission owed" value={data ? currency(data.summary.commission) : '…'} caption="Across every rep" tone="info" />
        <StatCard
          label="Need review"
          value={data?.summary.needs_review ?? '…'}
          caption="Missing a deal value or rate"
          tone={data?.summary.needs_review ? 'warning' : 'primary'}
        />
      </div>

      <h2 className="workspace-section-title">Reps</h2>
      <DataTable
        rowKey={(rep) => rep.id}
        rows={reps}
        columns={[
          { key: 'name', header: 'Rep', render: (rep) => <strong>{rep.name}</strong> },
          { key: 'rate', header: 'Default rate %', render: (rep) => <RateCell key={`${rep.id}-${rep.commission_rate}`} rep={rep} onSaved={reload} /> },
          { key: 'closes', header: 'Closes' },
          { key: 'value', header: 'Credited value', render: (rep) => currency(rep.credited_value) },
          { key: 'commission', header: 'Commission', render: (rep) => <strong>{currency(rep.commission)}</strong> },
        ]}
      />

      <div className="workspace-actions" style={{ justifyContent: 'space-between', margin: '24px 0 10px' }}>
        <h2 className="workspace-section-title" style={{ margin: 0 }}>Closed schools</h2>
        <label className="workspace-subtle" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
          Only show closes that need review
        </label>
      </div>
      {!loading && !closes.length ? (
        <Empty title="No closes in this period" text="Closes appear here when a school becomes an active client." />
      ) : (
        <DataTable
          rowKey={(close) => close.id}
          rows={closes}
          columns={[
            {
              key: 'school',
              header: 'School',
              render: (close) => (
                <span>
                  <Link to={`/schools/${close.id}`}>{close.school_name}</Link>
                  <br />
                  <span className="workspace-subtle">Owner: {close.owner_name || 'Unassigned'}</span>
                </span>
              ),
            },
            { key: 'stage', header: 'Stage', render: (close) => <StageBadge stage={close.status} /> },
            { key: 'closed', header: 'Closed', render: (close) => (close.closed_at ? dateLabel(close.closed_at) : 'No date') },
            { key: 'value', header: 'Deal value', render: (close) => currency(close.deal_value) },
            {
              key: 'earners',
              header: 'Commission',
              render: (close) =>
                close.earners.map((line) => (
                  <div key={line.user_id ?? line.name}>
                    {line.name}: {line.share_pct}% at{' '}
                    {line.effective_rate_pct === null ? 'no rate' : `${line.effective_rate_pct}%`} ={' '}
                    <strong>{currency(line.commission)}</strong>
                  </div>
                )),
            },
            {
              key: 'edit',
              header: '',
              render: (close) => (
                <span className="workspace-actions">
                  {close.needs_review && <span className="stage-badge" style={{ '--stage-color': '#f5b84a' }}>Needs review</span>}
                  <button className="modern-btn-primary is-neutral is-small" onClick={() => setEditing(close)}>
                    Edit
                  </button>
                </span>
              ),
            },
          ]}
        />
      )}
      {editing && (
        <CloseDialog
          close={editing === 'new' ? null : editing}
          reps={reps}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}

export default function SalesAdmin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('ownership')
  if (user && !user.admin) return <Navigate to="/" replace />
  return (
    <AppLayout
      title="Sales admin"
      subtitle="Who owns what, what closed, and what each rep earned. Visible to administrators only."
      actions={<Segmented label="Sales admin view" value={tab} onChange={setTab} options={TABS} />}
    >
      {tab === 'ownership' ? <Ownership /> : <Commissions />}
    </AppLayout>
  )
}
