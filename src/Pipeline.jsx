import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Icon from './components/Icon'
import { Empty, ErrorNotice } from './components/WorkspaceUI'
import { STAGES, dueLabel, useDebounced, useResource } from './lib/crm'
import api from './lib/api'

function PipelineColumn({ stage, query, scope, owner, onMove, busy }) {
  const [over, setOver] = useState(false)
  const filters = new URLSearchParams({
    stage: stage.id,
    q: query,
    scope,
    limit: 25,
  })
  if (owner) filters.set('owner', owner)
  const { data, error, loading } = useResource('/api/crm/schools?' + filters)
  return (
    <section
      className={'workspace-column' + (over ? ' is-drop-target' : '')}
      aria-label={stage.label}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const id = Number(e.dataTransfer.getData('text/plain'))
        if (Number.isInteger(id) && id > 0) onMove(id, stage.id)
      }}
    >
      <header className="workspace-column-header">
        <strong>
          <i style={{ background: stage.color }} />
          {stage.label}
        </strong>
        <span>{loading ? '…' : data?.total || 0}</span>
      </header>
      <ErrorNotice error={error} />
      {data?.items?.map((school) => (
        <article
          className="pipeline-card"
          key={school.id}
          draggable={!busy}
          aria-busy={busy === school.id}
          onDragStart={(e) =>
            e.dataTransfer.setData('text/plain', String(school.id))
          }
        >
          <Link to={'/schools/' + school.id}>{school.school_name}</Link>
          <p>{school.contact_name || school.email}</p>
          {school.next_action && (
            <div className="pipeline-card-next">
              <Icon name="clock" size={12} />
              {school.next_action}
            </div>
          )}
          <div className="pipeline-card-footer">
            <small>
              {school.user_name?.split(' ')[0]}
              {school.next_action_at
                ? ' · ' + dueLabel(school.next_action_at)
                : ''}
            </small>
            <select
              className="pipeline-stage-select"
              value={school.status}
              aria-label={'Move ' + school.school_name + ' to stage'}
              disabled={Boolean(busy)}
              onChange={(e) => onMove(school.id, e.target.value)}
            >
              {STAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </article>
      ))}
      {!loading && !data?.items?.length && (
        <Empty
          title="Room for the next opportunity"
          text="Move a school here when it reaches this stage."
          icon="school"
        />
      )}
      {data?.total > 25 && (
        <Link className="workspace-subtle" to={'/schools?stage=' + stage.id}>
          Showing 25 of {data.total}. View all →
        </Link>
      )}
    </section>
  )
}
export default function Pipeline() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const query = useDebounced(search)
  const [scope, setScope] = useState(user.admin ? 'team' : 'mine')
  const [owner, setOwner] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { data: team } = useResource(user.admin ? '/api/crm/team' : null)
  const move = async (id, status) => {
    setBusy(id)
    setError('')
    setNotice('')
    try {
      await api.post('/api/crm/schools/bulk', { ids: [id], status })
      setRevision((old) => old + 1)
      setNotice(
        'School moved to ' +
          STAGES.find((item) => item.id === status).label +
          '.',
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }
  return (
    <AppLayout
      title="Pipeline"
      subtitle="Move relationships forward, one meaningful step at a time."
      actions={
        <>
          <Link to="/schools" className="modern-btn-primary is-neutral">
            <Icon name="list" size={14} />
            List view
          </Link>
          <Link to="/schools?new=1" className="modern-btn-primary">
            <Icon name="plus" size={14} />
            Add school
          </Link>
        </>
      }
    >
      <ErrorNotice error={error} />
      {notice && (
        <div
          className="ui-alert tone-success"
          role="status"
          style={{ marginBottom: 16 }}
        >
          {notice}
        </div>
      )}
      <div
        className="workspace-toolbar"
        style={{ padding: '0 0 22px', border: 0 }}
      >
        <label className="workspace-toolbar-search">
          <Icon name="search" size={15} />
          <input
            type="search"
            placeholder="Find an opportunity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search pipeline"
          />
        </label>
        {user.admin && (
          <>
            <select
              className="workspace-select"
              aria-label="Pipeline scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="team">Team pipeline</option>
              <option value="mine">My pipeline</option>
            </select>
            <select
              className="workspace-select"
              aria-label="Pipeline owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="">All owners</option>
              {(team || []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </>
        )}
        <span className="workspace-toolbar-tail">
          Drag a card or use its stage menu
        </span>
      </div>
      <div className="workspace-board">
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage.id + '-' + revision}
            stage={stage}
            query={query}
            scope={scope}
            owner={owner}
            onMove={move}
            busy={busy}
          />
        ))}
      </div>
    </AppLayout>
  )
}
