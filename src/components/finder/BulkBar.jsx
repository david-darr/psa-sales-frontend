import Glyph from './icons'
import { MAX_ROUTE_STOPS } from './finderUtils'

/** Sticky bar shown while rows are selected. */
export default function BulkBar({
  selectedCount,
  saveCount,
  newCount,
  isAdmin,
  team,
  assignTo,
  onAssignTo,
  saving,
  hasRoute,
  onClear,
  onSelectAllNew,
  onSave,
  onPlanRoute,
  onViewRoute,
}) {
  if (selectedCount === 0) return null
  const tooMany = selectedCount > MAX_ROUTE_STOPS
  const routeHint = tooMany
    ? `Routes support up to ${MAX_ROUTE_STOPS} stops`
    : selectedCount < 2
      ? 'Select at least 2 schools to plan a route'
      : ''
  const alreadySaved = selectedCount - saveCount

  return (
    <div className="fd-bulk" role="region" aria-label="Bulk actions">
      <div className="fd-bulk-info">
        <strong className="fd-mono">{selectedCount}</strong>
        <span>selected</span>
        {alreadySaved > 0 && (
          <span className="fd-muted">({alreadySaved} already saved)</span>
        )}
        <button type="button" className="fd-link" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="fd-bulk-actions">
        <button
          type="button"
          className="fd-btn fd-btn-ghost fd-btn-sm"
          onClick={onSelectAllNew}
          disabled={newCount === 0}
        >
          Select all new
        </button>

        {isAdmin && team.length > 0 && (
          <label className="fd-select fd-select-inline">
            <span className="fd-label">Assign to</span>
            <select
              value={assignTo}
              onChange={(event) => onAssignTo(event.target.value)}
              disabled={saving}
            >
              <option value="">Me</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <span className="fd-hint-wrap" title={routeHint || undefined}>
          <button
            type="button"
            className="fd-btn fd-btn-ghost fd-btn-sm"
            onClick={onPlanRoute}
            disabled={Boolean(routeHint)}
          >
            <Glyph name="route" size={14} />
            Plan route
          </button>
        </span>
        {hasRoute && (
          <button
            type="button"
            className="fd-btn fd-btn-ghost fd-btn-sm"
            onClick={onViewRoute}
          >
            View route
          </button>
        )}

        <button
          type="button"
          className="fd-btn fd-btn-solid"
          onClick={onSave}
          disabled={saving || saveCount === 0}
        >
          <Glyph name="plus" size={14} />
          {saving
            ? 'Saving...'
            : saveCount === 0
              ? 'Nothing new to save'
              : `Save ${saveCount} lead${saveCount === 1 ? '' : 's'}`}
        </button>
      </div>
      {routeHint && (
        <p className="fd-bulk-hint" role="status">
          {routeHint}.
        </p>
      )}
    </div>
  )
}
