import { useMemo, useState } from 'react'
import Icon from '../Icon'
import MapLegend from '../MapLegend'
import { MAP_LAYERS, initialsOf, repColor } from '../../lib/mapLayers'

function Toggle({ checked, onChange, children, count }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`tm-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="tm-toggle-label">{children}</span>
      {count !== undefined && <span className="tm-count">{count}</span>}
      <span className="tm-switch" aria-hidden="true" />
    </button>
  )
}

const dotColor = (feature) =>
  feature.properties.kind === 'account'
    ? feature.properties.color
    : MAP_LAYERS.find((layer) => layer.key === feature.properties.layer)?.swatch

/**
 * The floating left card: search, rep filter, stage and layer toggles, legend.
 * Purely presentational; Map.jsx owns the state.
 */
export default function ControlCard({
  reps,
  repSel,
  onRepToggle,
  onAllReps,
  onJustMe,
  userId,
  toggles,
  onToggle,
  stageCounts,
  layerCounts,
  layersOn,
  onLayer,
  searchables,
  onPick,
  onFit,
  fitDisabled,
  notices,
  collapsed,
  onCollapse,
  emptyReps,
}) {
  const [term, setTerm] = useState('')
  const results = useMemo(() => {
    const q = term.trim().toLowerCase()
    if (q.length < 2) return []
    return searchables
      .filter((feature) => feature.properties.name.toLowerCase().includes(q))
      .slice(0, 7)
  }, [term, searchables])
  const everyone = repSel.length === 0
  const justMe = repSel.length === 1 && String(repSel[0]) === String(userId)

  return (
    <section className={`tm-card ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="tm-card-top">
        <div className="tm-search">
          <Icon name="search" size={15} />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Find a school on the map"
            aria-label="Search schools on the map"
          />
          {term && (
            <button
              type="button"
              className="tm-clear"
              aria-label="Clear search"
              onClick={() => setTerm('')}
            >
              <Icon name="close" size={12} />
            </button>
          )}
          {term.trim().length >= 2 && (
            <ul className="tm-results">
              {results.length ? (
                results.map((feature) => (
                  <li key={feature.properties.uid}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(feature)
                        setTerm('')
                      }}
                    >
                      <span className="tm-dot" style={{ '--dot': dotColor(feature) }} />
                      <span className="tm-result-name">{feature.properties.name}</span>
                      <span className="tm-result-meta">
                        {feature.properties.kind === 'account' ? 'Account' : 'Prospect'}
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="tm-result-empty">No matching schools on the map</li>
              )}
            </ul>
          )}
        </div>
        <div className="tm-card-actions">
          <button type="button" className="tm-btn" onClick={onFit} disabled={fitDisabled}>
            <Icon name="map" size={13} />
            Fit to my accounts
          </button>
          <button
            type="button"
            className="tm-btn tm-only-mobile"
            onClick={onCollapse}
            aria-expanded={!collapsed}
          >
            <Icon name="filter" size={13} />
            {collapsed ? 'Filters' : 'Hide'}
          </button>
        </div>
        {notices}
      </div>

      <div className="tm-card-body">
        <div className="tm-section">
          <div className="tm-section-head">
            <h3>Reps</h3>
            <div className="tm-pills">
              <button
                type="button"
                className={`tm-pill ${everyone ? 'is-on' : ''}`}
                onClick={onAllReps}
              >
                All reps
              </button>
              <button
                type="button"
                className={`tm-pill ${justMe ? 'is-on' : ''}`}
                onClick={onJustMe}
              >
                Just me
              </button>
            </div>
          </div>
          {reps.length ? (
            <div className="tm-chips">
              {reps.map((rep) => {
                const on = repSel.includes(String(rep.id))
                return (
                  <button
                    type="button"
                    key={rep.id}
                    className={`tm-chip ${on ? 'is-on' : ''} ${!everyone && !on ? 'is-dim' : ''}`}
                    aria-pressed={on}
                    onClick={() => onRepToggle(String(rep.id))}
                    style={{ '--rep': repColor(rep.id) }}
                  >
                    <span className="tm-chip-swatch" aria-hidden="true">
                      {initialsOf(rep.name)}
                    </span>
                    <span className="tm-chip-name">{rep.name}</span>
                    <span className="tm-count">{rep.count}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="tm-muted">{emptyReps || 'No reps to show yet.'}</p>
          )}
        </div>

        <div className="tm-section">
          <div className="tm-section-head">
            <h3>Stages</h3>
          </div>
          <Toggle
            checked={toggles.active}
            onChange={(value) => onToggle('active', value)}
            count={stageCounts.active}
          >
            <span className="tm-key tm-key-active" />
            Active clients
          </Toggle>
          <Toggle
            checked={toggles.former}
            onChange={(value) => onToggle('former', value)}
            count={stageCounts.former}
          >
            <span className="tm-key tm-key-former" />
            Former clients
          </Toggle>
          <Toggle
            checked={toggles.pipeline}
            onChange={(value) => onToggle('pipeline', value)}
            count={stageCounts.pipeline}
          >
            <span className="tm-key tm-key-pipeline" />
            In pipeline
          </Toggle>
        </div>

        <div className="tm-section">
          <div className="tm-section-head">
            <h3>Prospect layers</h3>
          </div>
          {MAP_LAYERS.map((layer) => (
            <Toggle
              key={layer.key}
              checked={layersOn.includes(layer.key)}
              onChange={(value) => onLayer(layer.key, value)}
              count={layerCounts[layer.key] || 0}
            >
              <span
                className="tm-key tm-key-prospect"
                style={{ '--swatch': layer.swatch }}
              />
              {layer.label}
            </Toggle>
          ))}
        </div>

        <div className="tm-section">
          <div className="tm-section-head">
            <h3>Legend</h3>
          </div>
          <MapLegend />
        </div>
      </div>
    </section>
  )
}
