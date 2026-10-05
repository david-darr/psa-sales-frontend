import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import NavigationCard from '../NavigationCard'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { UI_PREVIEW, exitUiPreview } from '../lib/previewMode'
import '../styles/layout.css'

/**
 * The application shell: sidebar, mobile drawer + hamburger, scrim, and the
 * main content column.
 *
 * Every page previously hand-rolled this - the same ~130 lines of inline-styled
 * JSX, including two near-identical copies of the sidebar (one for mobile, one
 * for desktop) that differed only in a `transform`. Styling now lives in
 * styles/layout.css, and the drawer is always rendered so it can animate in
 * and out instead of being unmounted mid-transition.
 *
 * @param {string}    [title]     Rendered as the page <h1>.
 * @param {ReactNode} [subtitle]  Small muted line under the title.
 * @param {ReactNode} [actions]   Right-aligned controls in the page header.
 * @param {ReactNode} children    Page content.
 */
export default function AppLayout({ title, subtitle, actions, children }) {
  const { isMobile } = useBreakpoint()
  const [navOpen, setNavOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(() => localStorage.getItem('psa-nav-collapsed') === 'true')
  const location = useLocation()

  const toggleCollapsed = () => {
    setNavCollapsed((collapsed) => {
      localStorage.setItem('psa-nav-collapsed', String(!collapsed))
      return !collapsed
    })
  }

  // Navigating from inside the drawer should dismiss it, otherwise the new
  // page renders behind a still-open overlay.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  // Growing past the mobile breakpoint while the drawer is open would leave
  // the scrim stuck over a desktop layout that has no way to close it.
  useEffect(() => {
    if (!isMobile) setNavOpen(false)
  }, [isMobile])

  // A drawer-open page behind a scrim should not scroll.
  useEffect(() => {
    if (!isMobile || !navOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isMobile, navOpen])

  // Escape is the expected way out of an overlay.
  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  return (
    <div className={`app-shell${!isMobile && navCollapsed ? ' is-collapsed' : ''}`}>
      {isMobile && (
        <button
          type="button"
          className={`app-nav-toggle${navOpen ? ' is-open' : ''}`}
          onClick={() => setNavOpen((open) => !open)}
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
        >
          <span className="app-nav-toggle-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      )}

      {isMobile && (
        <div
          className={`app-scrim${navOpen ? ' is-visible' : ''}`}
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={`app-sidebar${isMobile ? ' is-drawer' : ''}${navOpen ? ' is-open' : ''}`}
      >
        <NavigationCard collapsed={!isMobile && navCollapsed} onToggle={toggleCollapsed} />
      </aside>

      <main className="app-main">
        {UI_PREVIEW && (
          <div className="app-preview-banner" role="status">
            <span><strong>UI preview</strong> · Fictional sample data · Changes and email sending disabled</span>
            <button type="button" onClick={exitUiPreview}>Exit preview</button>
          </div>
        )}
        {(title || subtitle || actions) && (
          <header className="app-page-header">
            <div>
              <div className="app-page-eyebrow">PSA / Sales workspace</div>
              {title && <h1 className="app-page-title">{title}</h1>}
              {subtitle && <p className="app-page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="app-page-actions">{actions}</div>}
          </header>
        )}
        {children}
      </main>
    </div>
  )
}
