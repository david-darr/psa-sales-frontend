import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Icon from './components/Icon'
import RepCard, { stagesFor } from './components/portfolio/RepCard'
import { Empty, ErrorNotice, Segmented } from './components/WorkspaceUI'
import { dateLabel, stageLabel, useDebounced, useResource } from './lib/crm'
import './styles/portfolio.css'

const VIEWS = [
  { value: 'active', label: 'Active' },
  { value: 'former', label: 'Former' },
  { value: 'all', label: 'All closed' },
]

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

function exportCsv(reps, view) {
  const stages = stagesFor(view)
  const lines = [['Rep', 'School', 'Status', 'City', 'Type', 'Closed']]
  reps.forEach((rep) =>
    rep.accounts
      .filter((account) => stages.includes(account.status))
      .forEach((account) =>
        lines.push([
          rep.name,
          account.school_name,
          stageLabel(account.status),
          account.city || '',
          account.school_type || '',
          account.closed_at ? dateLabel(account.closed_at) : '',
        ]),
      ),
  )
  const blob = new Blob([lines.map((line) => line.map(csvCell).join(',')).join('\n')], {
    type: 'text/csv',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `accounts-${view}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function Portfolio() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useResource('/api/crm/portfolio')
  const [view, setView] = useState('active')
  const [search, setSearch] = useState('')
  const [openIds, setOpenIds] = useState(null)
  const query = useDebounced(search.trim().toLowerCase())

  const reps = useMemo(() => data?.reps || [], [data])
  const stages = stagesFor(view)

  const visible = useMemo(() => {
    if (!query) return reps
    return reps
      .map((rep) => {
        const repHit = `${rep.name} ${rep.email}`.toLowerCase().includes(query)
        if (repHit) return rep
        const accounts = rep.accounts.filter((account) =>
          `${account.school_name} ${account.city || ''}`.toLowerCase().includes(query),
        )
        return accounts.length ? { ...rep, accounts } : null
      })
      .filter(Boolean)
  }, [reps, query])

  const shown = visible.reduce(
    (sum, rep) => sum + rep.accounts.filter((account) => stages.includes(account.status)).length,
    0,
  )
  const defaultOpen = new Set(
    visible.length === 1 || query ? visible.map((rep) => rep.id) : visible.slice(0, 1).map((rep) => rep.id),
  )
  const open = openIds || defaultOpen
  const toggle = (id) => {
    const next = new Set(open)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpenIds(next)
  }

  const totals = data?.totals
  const selfOnly = data && data.scope === 'self'
  const tiles = totals
    ? [
        ['Active clients', totals.active_clients, 'Still doing business with us', 'is-good'],
        ['Former clients', totals.former_clients, 'Closed, no longer active'],
        ['Closed, last 90 days', totals.closed_last_90, 'New wins this quarter'],
        ['In pipeline', totals.in_pipeline, 'Open conversations'],
      ]
    : []

  return (
    <AppLayout
      title="Accounts"
      subtitle="Which schools each rep owns and closed."
      actions={
        <>
          <button className="modern-btn-primary is-neutral" disabled={loading} onClick={reload}>
            <Icon name="refresh" size={14} />
            Refresh
          </button>
          <button
            className="modern-btn-primary is-neutral"
            disabled={!shown}
            onClick={() => exportCsv(visible, view)}
          >
            <Icon name="download" size={14} />
            Export CSV
          </button>
          <Link className="modern-btn-primary" to={`/map?stages=${stages.join(',')}`}>
            <Icon name="map" size={14} />
            View on map
          </Link>
        </>
      }
    >
      <ErrorNotice error={error} />

      {selfOnly && !user?.admin && (
        <div className="pf-note" role="status">
          <Icon name="info" size={15} />
          You are seeing your own accounts. Ask an admin for access to see every rep.
        </div>
      )}

      <div className="pf-tiles">
        {loading && !data
          ? [1, 2, 3, 4].map((key) => <div className="pf-tile is-loading" key={key} />)
          : tiles.map((tile) => (
              <div className={`pf-tile ${tile[3] || ''}`} key={tile[0]}>
                <span className="pf-tile-label">{tile[0]}</span>
                <span className="pf-tile-value">{tile[1]}</span>
                <span className="pf-tile-foot">{tile[2]}</span>
              </div>
            ))}
      </div>

      <div className="pf-toolbar">
        <Segmented value={view} onChange={setView} options={VIEWS} label="Account status" />
        <label className="workspace-toolbar-search pf-search">
          <Icon name="search" size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a rep or school..."
            aria-label="Search accounts"
          />
        </label>
        <span className="pf-count">
          {shown} {shown === 1 ? 'school' : 'schools'}
          {reps.length > 1 && ` across ${visible.length} ${visible.length === 1 ? 'rep' : 'reps'}`}
        </span>
      </div>

      {loading && !data && <div className="pf-loading">Loading accounts...</div>}

      {data && !visible.length && (
        <Empty
          title={query ? 'No matches' : 'No reps yet'}
          text={query ? 'Try another rep or school name.' : 'Once teammates join, their accounts show up here.'}
          icon="team"
        />
      )}

      <div className="pf-list">
        {visible.map((rep) => (
          <RepCard
            key={rep.id}
            rep={rep}
            view={view}
            you={rep.id === user?.id}
            open={open.has(rep.id)}
            onToggle={() => toggle(rep.id)}
          />
        ))}
      </div>
    </AppLayout>
  )
}
