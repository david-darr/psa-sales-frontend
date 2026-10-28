import { useCallback, useEffect, useRef } from 'react'
import Glyph from './icons'
import ResultRow, { SkeletonRows } from './ResultRow'
import { SORT_OPTIONS } from './finderUtils'

const MIN_RATINGS = [
  { value: 0, label: 'Any' },
  { value: 4, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
]

/** One shared IntersectionObserver reports rows as they scroll into view. */
function useRowVisibility(onVisible) {
  const observerRef = useRef(null)
  const cbRef = useRef(onVisible)
  useEffect(() => {
    cbRef.current = onVisible
  })
  useEffect(
    () => () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    },
    [],
  )
  return useCallback((el) => {
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            observerRef.current?.unobserve(entry.target)
            cbRef.current(entry.target.dataset.place)
          }
        },
        { rootMargin: '240px 0px' },
      )
    }
    const observer = observerRef.current
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])
}

export default function ResultsPane({
  status,
  error,
  onRetry,
  location,
  radius,
  rows,
  loadedCount,
  newCount,
  ranks,
  mineIds,
  selectedIds,
  savingIds,
  hoverId,
  activeId,
  details,
  sort,
  onSort,
  hideSaved,
  onHideSaved,
  minRating,
  onMinRating,
  onClearFilters,
  onSelectAllNew,
  hasMore,
  loadingMore,
  moreError,
  onLoadMore,
  onWidenRadius,
  onToggle,
  onHover,
  onFocusPin,
  onSave,
  onEdit,
  view,
  onView,
}) {
  const observe = useRowVisibility((id) => details.request(id))
  const filtered = hideSaved || minRating > 0
  const hidden = loadedCount - rows.length

  if (status === 'error') {
    return (
      <div className="fd-state is-error" role="alert">
        <span className="fd-state-icon">
          <Glyph name="alert" size={20} />
        </span>
        <h2>We could not complete that search</h2>
        <p>{error}</p>
        <button type="button" className="fd-btn fd-btn-solid" onClick={onRetry}>
          <Glyph name="refresh" size={14} />
          Try again
        </button>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="fd-list-wrap" aria-busy="true">
        <div className="fd-toolbar" aria-hidden="true">
          <span className="fd-skel fd-skel-line" style={{ width: 220, height: 16 }} />
        </div>
        <p className="fd-sr" role="status">
          Searching for schools
        </p>
        <ul className="fd-list">
          <SkeletonRows count={6} />
        </ul>
      </div>
    )
  }

  if (status !== 'done') return null

  const label = location?.label || 'your search'

  if (loadedCount === 0) {
    return (
      <div className="fd-state">
        <span className="fd-state-icon">
          <Glyph name="search" size={20} />
        </span>
        <h2>No schools found</h2>
        <p>
          Nothing matched within {radius} km of {label}. Try a wider radius or
          different keywords.
        </p>
        {radius < 20 && (
          <button
            type="button"
            className="fd-btn fd-btn-solid"
            onClick={onWidenRadius}
          >
            Search within 20 km
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fd-list-wrap">
      <div className="fd-toolbar">
        <div className="fd-toolbar-title">
          <h2>
            {loadedCount} school{loadedCount === 1 ? '' : 's'}
            {hasMore ? '+' : ''}
          </h2>
          <span className="fd-muted">
            within {radius} km of {label}
          </span>
        </div>
        <div className="fd-view-toggle fd-segmented" role="radiogroup" aria-label="Mobile view">
          <button
            type="button"
            role="radio"
            aria-checked={view === 'list'}
            className="fd-seg"
            onClick={() => onView('list')}
          >
            <Glyph name="list" size={13} />
            List
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={view === 'map'}
            className="fd-seg"
            onClick={() => onView('map')}
          >
            <Glyph name="map" size={13} />
            Map
          </button>
        </div>
      </div>

      <div className="fd-filters">
        <label className="fd-select">
          <span className="fd-label">Sort</span>
          <select value={sort} onChange={(e) => onSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="fd-chip"
          aria-pressed={hideSaved}
          onClick={() => onHideSaved(!hideSaved)}
        >
          Hide already saved
        </button>
        <div className="fd-field fd-field-inline">
          <span className="fd-label" id="fd-minrating">
            Min rating
          </span>
          <div className="fd-segmented" role="radiogroup" aria-labelledby="fd-minrating">
            {MIN_RATINGS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={minRating === o.value}
                className="fd-seg"
                onClick={() => onMinRating(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="fd-btn fd-btn-ghost fd-btn-sm fd-push"
          onClick={onSelectAllNew}
          disabled={newCount === 0}
        >
          <Glyph name="check" size={13} />
          Select all new ({newCount})
        </button>
      </div>

      {filtered && (
        <p className="fd-filter-note" role="status">
          Showing {rows.length} of {loadedCount}
          {hidden > 0 ? `, ${hidden} hidden by filters.` : '.'}{' '}
          <button type="button" className="fd-link" onClick={onClearFilters}>
            Clear filters
          </button>
        </p>
      )}

      {rows.length === 0 ? (
        <div className="fd-state">
          <span className="fd-state-icon">
            <Glyph name="search" size={20} />
          </span>
          <h2>Every result is filtered out</h2>
          <p>Loosen the rating or show saved schools to see them again.</p>
          <button
            type="button"
            className="fd-btn fd-btn-solid"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="fd-list" aria-label="School results">
          {rows.map((school) => {
            const id = school.place_id
            return (
              <ResultRow
                key={id}
                school={school}
                rank={ranks.get(id)}
                selected={selectedIds.has(id)}
                hovered={hoverId === id}
                active={activeId === id}
                mine={mineIds.has(id)}
                details={details.get(id)}
                saving={savingIds.has(id)}
                observe={observe}
                onToggle={onToggle}
                onHover={onHover}
                onFocusPin={onFocusPin}
                onSave={onSave}
                onEdit={onEdit}
              />
            )
          })}
          {loadingMore && <SkeletonRows count={3} />}
        </ul>
      )}

      {moreError && (
        <p className="fd-form-error" role="alert">
          <Glyph name="alert" size={14} />
          {moreError}
        </p>
      )}
      {hasMore && (
        <div className="fd-more">
          <button
            type="button"
            className="fd-btn fd-btn-ghost"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore
              ? 'Loading more...'
              : moreError
                ? 'Retry loading more'
                : 'Load more schools'}
          </button>
        </div>
      )}
    </div>
  )
}
