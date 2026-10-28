import { Component } from 'react'
import { SUPPORT_EMAIL, supportLink } from '../lib/support'

/**
 * Last line of defence: a page that crashes while rendering shows a way out and a
 * one-click report instead of a blank screen. Resets when the user navigates.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const message = String(error?.message || error).slice(0, 500)
    const page = window.location.pathname
    return (
      <div className="workspace-empty" role="alert" style={{ margin: '48px auto', maxWidth: 560 }}>
        <strong>Something went wrong on this page.</strong>
        <p>
          Reload the page to try again. If it keeps happening, send a report and it will be
          looked at.
        </p>
        <p className="workspace-subtle">{message}</p>
        <div className="workspace-actions" style={{ justifyContent: 'center' }}>
          <button className="modern-btn-primary is-neutral" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="modern-btn-primary" href={supportLink(message, page)}>
            Report this problem
          </a>
        </div>
        <p className="workspace-subtle">Or email {SUPPORT_EMAIL}</p>
      </div>
    )
  }
}
