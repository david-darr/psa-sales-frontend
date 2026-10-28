import { Link } from 'react-router-dom'
import { blockerMeta, relativeTime, resetLabel } from '../../emails/constants'

export function Chip({ tone, children, title }) {
  return (
    <span className={`ou-chip${tone ? ` tone-${tone}` : ''}`} title={title}>
      {children}
    </span>
  )
}

export function BlockerChips({ blockers }) {
  if (!blockers?.length) return <Chip tone="ok">Ready</Chip>
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {blockers.map((key) => {
        const meta = blockerMeta(key)
        return (
          <Chip key={key} tone={meta.tone} title={meta.tip}>
            {meta.label}
          </Chip>
        )
      })}
    </span>
  )
}

export function Dot({ tone = 'neutral' }) {
  return <span className={`ou-dot tone-${tone}`} aria-hidden="true" />
}

export function LimitMeter({ limits, error }) {
  if (!limits) {
    return (
      <div className="ou-card ou-meter">
        <span className="ou-muted">{error || 'Checking your daily sending limit...'}</span>
      </div>
    )
  }
  const used = limits.sent_today
  const pct = Math.min(100, Math.round((used / Math.max(limits.daily_limit, 1)) * 100))
  const tone = pct >= 100 ? 'is-full' : pct >= 80 ? 'is-warn' : ''
  return (
    <div className="ou-card ou-meter">
      <div className="ou-meter-text">
        <span className="ou-label">Sent today</span>
        <span className="ou-meter-num ou-mono">
          {used} <span className="ou-muted">/ {limits.daily_limit}</span>
        </span>
      </div>
      <div
        className="ou-meter-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limits.daily_limit}
        aria-valuenow={used}
        aria-label="Emails sent today"
      >
        <div className={`ou-meter-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="ou-meter-text" style={{ textAlign: 'right' }}>
        <span className="ou-strong ou-mono">{limits.remaining} left</span>
        <span className="ou-sub">resets {resetLabel(limits.resets_at)}</span>
      </div>
    </div>
  )
}

export function MailboxCallout({ limits }) {
  if (!limits || limits.mailbox_connected) return null
  return (
    <div className="ou-callout tone-danger" role="alert">
      <span>
        <strong>Your mailbox is not connected.</strong> You can build and review messages, but sending is
        turned off until you connect it.
      </span>
      <Link className="ou-btn ou-btn-ghost ou-btn-sm" to="/account">
        Connect mailbox
      </Link>
    </div>
  )
}

export { relativeTime }
