import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Icon from './components/Icon'
import TaskDialog from './components/TaskDialog'
import { Empty, ErrorNotice, Pagination } from './components/WorkspaceUI'
import { dueLabel, isOverdue, localToday, useResource } from './lib/crm'
import api from './lib/api'

const VIEWS = [
  ['open', 'All open'],
  ['today', 'Due today'],
  ['overdue', 'Overdue'],
  ['upcoming', 'Upcoming'],
  ['completed', 'Completed'],
]
export default function Tasks() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const schoolId = params.get('school')
  const [view, setView] = useState('open')
  const [scope, setScope] = useState(user.admin && schoolId ? 'team' : 'mine')
  const [page, setPage] = useState(1)
  const [newTask, setNewTask] = useState(false)
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState('')
  const { data, error, loading, reload } = useResource(
    '/api/crm/tasks?' +
      new URLSearchParams({
        view,
        scope,
        page,
        limit: 25,
        ...(schoolId ? { school_id: schoolId } : {}),
      }),
  )
  const update = async (task, changes) => {
    setBusy(task.id)
    setActionError('')
    try {
      await api.patch('/api/crm/tasks/' + task.id, {
        ...changes,
        version: task.version,
      })
      reload()
    } catch (err) {
      setActionError(err.message)
      reload()
    } finally {
      setBusy(null)
    }
  }
  return (
    <AppLayout
      title="Tasks"
      subtitle="A clear next step for every relationship."
      actions={
        <>
          {user.admin && (
            <select
              className="workspace-select"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value)
                setPage(1)
              }}
              aria-label="Task scope"
            >
              <option value="mine">My tasks</option>
              <option value="team">Team tasks</option>
            </select>
          )}
          <button
            className="modern-btn-primary"
            onClick={() => setNewTask(true)}
          >
            <Icon name="plus" size={14} />
            New task
          </button>
        </>
      }
    >
      <ErrorNotice error={error || actionError} />
      {schoolId && (
        <div className="workspace-onboarding">
          <div>
            <strong>Tasks for one school</strong>
            <p>Opened from the school workspace.</p>
          </div>
          <Link to="/tasks" className="ui-link-button">
            Show all tasks
          </Link>
        </div>
      )}
      <div className="workspace-tabs" aria-label="Task views">
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            className={view === key ? 'is-active' : ''}
            onClick={() => {
              setView(key)
              setPage(1)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="workspace-panel" aria-busy={loading}>
        <div className="workspace-toolbar">
          <Icon name="check" size={16} />
          <strong style={{ fontSize: '.76rem' }}>
            {VIEWS.find(([key]) => key === view)?.[1]} tasks
          </strong>
          <span className="workspace-toolbar-tail">
            {loading ? 'Updating...' : (data?.total || 0) + ' tasks'}
            <button
              className="ui-link-button"
              onClick={reload}
              disabled={loading}
              aria-label="Refresh tasks"
            >
              <Icon name="refresh" size={14} />
            </button>
          </span>
        </div>
        {data?.items?.length ? (
          data.items.map((task) => (
            <div key={task.id} className="task-row">
              <button
                className={
                  'workspace-check' +
                  (task.status === 'completed' ? ' is-done' : '')
                }
                aria-label={
                  (task.status === 'completed' ? 'Reopen ' : 'Complete ') +
                  task.title
                }
                disabled={busy === task.id}
                onClick={() =>
                  update(task, {
                    status: task.status === 'open' ? 'completed' : 'open',
                  })
                }
              >
                {task.status === 'completed' && <Icon name="check" size={14} />}
              </button>
              <div className="grow">
                <div
                  className={
                    'task-row-title' +
                    (task.status === 'completed' ? ' is-complete' : '')
                  }
                >
                  {task.title}
                </div>
                <div className="task-row-meta">
                  {task.school_id && (
                    <Link to={'/schools/' + task.school_id}>
                      {task.school_name}
                    </Link>
                  )}
                  <span>{task.owner_name}</span>
                  <span
                    className={
                      isOverdue(task.due_at) && task.status === 'open'
                        ? 'workspace-date is-overdue'
                        : ''
                    }
                  >
                    {dueLabel(task.due_at)}
                  </span>
                </div>
              </div>
              {task.priority === 'high' && (
                <span className="task-priority">High priority</span>
              )}
              {task.status === 'open' && (
                <div className="workspace-actions">
                  <label className="workspace-subtle">
                    Reschedule
                    <input
                      className="workspace-select"
                      style={{ marginLeft: 8, fontSize: '.68rem' }}
                      type="date"
                      aria-label={'Reschedule ' + task.title}
                      value={task.due_at?.slice(0, 10) || ''}
                      disabled={busy === task.id}
                      onChange={(e) =>
                        update(task, {
                          due_at: e.target.value
                            ? e.target.value + 'T00:00:00'
                            : null,
                        })
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          ))
        ) : (
          <Empty
            title={
              loading
                ? 'Loading tasks...'
                : view === 'completed'
                  ? 'No completed tasks yet'
                  : 'You’re all caught up'
            }
            text="Create a task when you have a next step to track."
          />
        )}
        <Pagination
          page={page}
          limit={25}
          total={data?.total || 0}
          onPage={setPage}
          disabled={loading}
        />
      </section>
      <p className="workspace-subtle" style={{ marginTop: 14 }}>
        School tasks move with the school when an administrator changes its
        owner. Today is {dueLabel(localToday())}.
      </p>
      {newTask && (
        <TaskDialog
          onClose={() => setNewTask(false)}
          onSaved={() => {
            setPage(1)
            reload()
          }}
        />
      )}
    </AppLayout>
  )
}
