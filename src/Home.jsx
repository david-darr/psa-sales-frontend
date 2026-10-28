import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Icon from './components/Icon'
import TaskDialog from './components/TaskDialog'
import { Panel, Empty, ErrorNotice } from './components/WorkspaceUI'
import { STAGES, dateLabel, dueLabel, isOverdue, useResource } from './lib/crm'
import api from './lib/api'

export default function Home() {
  const { user } = useAuth()
  const [scope, setScope] = useState(user?.admin ? 'team' : 'mine')
  const { data, loading, error, reload } = useResource(
    '/api/crm/overview?scope=' + scope,
  )
  const [newTask, setNewTask] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [busy, setBusy] = useState(null)
  const complete = async (task) => {
    setBusy(task.id)
    setTaskError('')
    try {
      await api.patch('/api/crm/tasks/' + task.id, {
        status: 'completed',
        version: task.version,
      })
      reload()
    } catch (err) {
      setTaskError(err.message)
    } finally {
      setBusy(null)
    }
  }
  const value = (key) => (loading && !data ? '—' : (data?.[key] ?? '—'))
  const chartMax = Math.max(1, ...(data?.trend || []).map((day) => day.sent))
  const seriesTotal = (data?.trend || []).reduce(
    (sum, day) => sum + day.sent,
    0,
  )
  const pipeline = data?.pipeline || {}
  const total = data?.schools || 0
  const firstName = user?.name?.split(' ')[0] || 'there'
  return (
    <AppLayout
      title={'Welcome back, ' + firstName}
      subtitle="Your relationships, priorities, and progress. All in one place."
      actions={
        <>
          <button
            className="modern-btn-primary is-neutral"
            onClick={() => setNewTask(true)}
          >
            <Icon name="plus" size={14} />
            New task
          </button>
          <Link to="/schools?new=1" className="modern-btn-primary">
            <Icon name="plus" size={14} />
            Add school
          </Link>
        </>
      }
    >
      <ErrorNotice error={error || taskError} />
      {user?.admin && (
        <div
          className="workspace-inline"
          style={{ justifyContent: 'space-between', marginBottom: 18 }}
        >
          <span className="workspace-kicker" style={{ margin: 0 }}>
            WORKSPACE OVERVIEW
          </span>
          <select
            className="workspace-select"
            aria-label="Overview scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="team">Team overview</option>
            <option value="mine">My overview</option>
          </select>
        </div>
      )}
      {!user?.mail_connected && (
        <div className="workspace-onboarding">
          <div>
            <strong>Let’s get your workspace ready.</strong>
            <p>
              Add your first school, connect Gmail, and review your first
              outreach.
            </p>
          </div>
          <Link to="/account" className="modern-btn-primary is-neutral">
            Complete setup <Icon name="arrow" size={14} />
          </Link>
        </div>
      )}
      <div className="workspace-metrics">
        {[
          [
            'Schools in your workspace',
            value('schools'),
            'school',
            'Across every pipeline stage',
          ],
          [
            'Conversations started',
            value('sent'),
            'mail',
            'Total tracked outreach',
          ],
          [
            'Response rate',
            data ? data.response_rate + '%' : '—',
            'chart',
            (data?.responses ?? '—') + ' conversations with a response',
          ],
          [
            'Open tasks',
            value('tasks_open'),
            'check',
            data?.tasks_overdue
              ? data.tasks_overdue + ' overdue · take the next step'
              : 'Keep your next steps moving',
          ],
        ].map(([label, amount, icon, caption]) => (
          <div className="workspace-metric" key={label}>
            <div className="workspace-metric-head">
              {label}
              <Icon name={icon} size={16} />
            </div>
            <div className="workspace-metric-value">
              {typeof amount === 'number' ? amount.toLocaleString() : amount}
            </div>
            <div className="workspace-metric-foot">{caption}</div>
          </div>
        ))}
      </div>
      <div className="workspace-grid">
        <Panel
          title="Your pipeline at a glance"
          description="From a first introduction to a lasting partnership"
          to="/pipeline"
          link="Open pipeline"
        >
          <div
            className="pipeline-track"
            aria-label="School distribution by stage"
          >
            {STAGES.map((stage) => (
              <span
                key={stage.id}
                title={stage.label + ': ' + (pipeline[stage.id] || 0)}
                style={{
                  flex: pipeline[stage.id] || 0.05,
                  background: stage.color,
                }}
              />
            ))}
          </div>
          <div className="pipeline-legend">
            {STAGES.map((stage) => (
              <Link key={stage.id} to={'/schools?stage=' + stage.id}>
                <i style={{ background: stage.color }} />
                <div>
                  {stage.label}
                  <strong>
                    {loading && !data ? '—' : pipeline[stage.id] || 0}
                  </strong>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
        <section className="workspace-focus">
          <div>
            <div className="workspace-kicker">KEEP THE CONVERSATION GOING</div>
            <h2>
              {data?.due_followups
                ? data.due_followups + ' follow-ups ready for review.'
                : 'Your next connection starts here.'}
            </h2>
            <p>
              {data?.due_followups
                ? 'A thoughtful follow-up can make all the difference. Check replies, then review your next messages.'
                : total
                  ? 'Make the next move on your school relationships. Your outreach workspace has everything you need.'
                  : 'Discover local schools and turn a promising introduction into your next partnership.'}
            </p>
          </div>
          <Link
            to={total ? '/emails?tab=followups' : '/finder'}
            className="modern-btn-primary"
          >
            {total ? 'Review outreach' : 'Discover schools'}
            <Icon name="arrow" size={14} />
          </Link>
        </section>
      </div>
      <div className="workspace-grid">
        <Panel
          title="Outreach activity"
          description="Emails sent over the last 14 days"
          to="/emails?tab=history"
          link="View outreach"
        >
          <div className="workspace-chart-total">
            {loading && !data ? '—' : seriesTotal}
            <small>emails sent</small>
          </div>
          <div
            className="workspace-chart"
            role="img"
            aria-label={'Last 14 days: ' + seriesTotal + ' emails sent'}
          >
            {(data?.trend || []).map((day) => (
              <div
                key={day.date}
                className="workspace-chart-col"
                title={day.date + ': ' + day.sent + ' emails'}
              >
                <span>{day.sent || ''}</span>
                <i
                  style={{
                    height: Math.max((day.sent / chartMax) * 100, 1) + '%',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="workspace-chart-axis">
            <span>
              {dateLabel(
                data?.trend?.[0]?.date
                  ? data.trend[0].date + 'T12:00:00'
                  : null,
              )}
            </span>
            <span>Today</span>
          </div>
        </Panel>
        <Panel
          title="Next on your list"
          description="Small steps. Stronger relationships."
          to="/tasks"
          link="View tasks"
        >
          {data?.tasks?.length ? (
            <ul className="workspace-list">
              {data.tasks.slice(0, 4).map((task) => (
                <li className="workspace-list-item" key={task.id}>
                  <button
                    className="workspace-check"
                    disabled={busy === task.id}
                    onClick={() => complete(task)}
                    aria-label={'Complete ' + task.title}
                  />
                  <div className="grow">
                    <strong>{task.title}</strong>
                    <small>{task.school_name || task.owner_name}</small>
                  </div>
                  <span
                    className={
                      'workspace-date' +
                      (isOverdue(task.due_at) ? ' is-overdue' : '')
                    }
                  >
                    {dueLabel(task.due_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title={
                loading
                  ? 'Loading your tasks...'
                  : 'A clear list. A fresh start.'
              }
              text="Create a task to keep your next step in sight."
            />
          )}
          <button
            className="ui-link-button"
            style={{ marginTop: 18, fontSize: '.72rem' }}
            onClick={() => setNewTask(true)}
          >
            + Create a task
          </button>
        </Panel>
      </div>
      <div className="workspace-grid equal">
        <Panel
          title="Upcoming school actions"
          to="/schools?sort=due"
          link="View schools"
        >
          {data?.actions?.length ? (
            <ul className="workspace-list">
              {data.actions.map((school) => (
                <li className="workspace-list-item" key={school.id}>
                  <span className="record-mark">
                    <Icon name="school" size={16} />
                  </span>
                  <div className="grow">
                    <Link to={'/schools/' + school.id}>
                      <strong>{school.school_name}</strong>
                    </Link>
                    <small>{school.next_action}</small>
                  </div>
                  <span
                    className={
                      'workspace-date' +
                      (isOverdue(school.next_action_at) ? ' is-overdue' : '')
                    }
                  >
                    {dueLabel(school.next_action_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="Give every school a next step"
              text="Set the next action from a school’s workspace."
              icon="calendar"
            />
          )}
        </Panel>
        <Panel
          title="Recent activity"
          description={
            scope === 'team'
              ? 'The latest updates across your team'
              : 'The latest updates to your schools'
          }
        >
          {data?.activity?.length ? (
            <ul className="workspace-list">
              {data.activity.slice(0, 4).map((item, index) => (
                <li className="workspace-list-item" key={index}>
                  <span className="workspace-activity-dot">
                    <Icon
                      name={
                        item.kind === 'call'
                          ? 'phone'
                          : item.kind === 'meeting'
                            ? 'calendar'
                            : 'check'
                      }
                      size={15}
                    />
                  </span>
                  <div className="grow">
                    <Link to={'/schools/' + item.school_id}>
                      <strong>{item.school_name}</strong>
                    </Link>
                    <small>
                      {item.actor} · {item.detail}
                    </small>
                  </div>
                  <span className="workspace-date">{dateLabel(item.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="Your story starts here"
              text="School notes, calls, and updates will appear here."
              icon="clock"
            />
          )}
        </Panel>
      </div>
      {newTask && (
        <TaskDialog onClose={() => setNewTask(false)} onSaved={reload} />
      )}
    </AppLayout>
  )
}
