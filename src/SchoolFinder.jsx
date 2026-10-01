import { useState } from 'react'
import SchoolMap from './SchoolMap'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import EmptyState from './components/EmptyState'
import api from './lib/api'

const ALL_KEYWORDS = [
  'elementary school',
  'day care',
  'preschool',
  'kindercare',
  'montessori',
  'church school',
]

export default function SchoolFinder() {
  // Search state
  const [address, setAddress] = useState('')
  const [schools, setSchools] = useState([])
  const [coords, setCoords] = useState(null)
  const [selectedKeywords, setSelectedKeywords] = useState([...ALL_KEYWORDS])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Route planning state
  const [selectedRouteSchools, setSelectedRouteSchools] = useState([])
  const [routeOrder, setRouteOrder] = useState(null)
  const [startAddress, setStartAddress] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')

  function handleKeywordChange(kw) {
    setSelectedKeywords((current) =>
      current.includes(kw) ? current.filter((k) => k !== kw) : [...current, kw],
    )
  }

  function toggleRouteSchool(placeId) {
    setSelectedRouteSchools((selected) =>
      selected.includes(placeId)
        ? selected.filter((id) => id !== placeId)
        : [...selected, placeId],
    )
  }

  function resetSearch() {
    setAddress('')
    setSchools([])
    setCoords(null)
    setSelectedRouteSchools([])
    setRouteOrder(null)
    setSearchError('')
    setRouteError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setSearchError('')
    try {
      const data = await api.post(
        '/api/find-schools',
        { address, keywords: selectedKeywords },
      )
      setSchools(data.schools || [])
      setCoords(data.location || null)
      setSelectedRouteSchools([])
      setRouteOrder(null)
    } catch (err) {
      // Previously console.error only, so a failed geocode looked identical
      // to a successful search that found nothing.
      setSearchError(err.message || 'Could not search for schools.')
      setSchools([])
      setCoords(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateRoute() {
    const schoolsToRoute = schools.filter((s) => selectedRouteSchools.includes(s.place_id))

    // The button is disabled in both of these cases; this is just a guard
    // against the handler being reached another way.
    if (schoolsToRoute.length < 2 || !startAddress) return

    setRouteLoading(true)
    setRouteError('')
    try {
      const data = await api.post(
        '/api/route-plan',
        { schools: schoolsToRoute, start_address: startAddress },
      )
      setRouteOrder(data.route || null)
    } catch (err) {
      setRouteError(err.message || 'Could not create a route.')
      setRouteOrder(null)
    } finally {
      setRouteLoading(false)
    }
  }

  const canRoute = selectedRouteSchools.length >= 2 && Boolean(startAddress)

  return (
    <AppLayout title="SCHOOL FINDER" subtitle="Discover New Schools in Your Area">
      <Card title="Search for Schools" icon="🔍" style={{ marginBottom: 'var(--space-6)' }}>
        <form onSubmit={handleSubmit}>
          <div className="ui-stack">
            <input
              type="text"
              className="ui-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address or location (e.g., 22101, Fairfax VA)"
              required
              aria-label="Search location"
            />
          </div>

          <div className="ui-stack">
            <span className="ui-field-label">School Types to Search:</span>
            <div className="ui-check-grid">
              {ALL_KEYWORDS.map((kw) => (
                <label key={kw} className="ui-check">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.includes(kw)}
                    onChange={() => handleKeywordChange(kw)}
                  />
                  {kw}
                </label>
              ))}
            </div>
          </div>

          {searchError && (
            <div className="ui-alert tone-danger" role="alert">
              {searchError}
            </div>
          )}

          <button
            type="submit"
            className="modern-btn-primary ui-block"
            disabled={loading || !address.trim() || selectedKeywords.length === 0}
          >
            {loading ? '🔍 Searching...' : '🔍 Find Schools'}
          </button>
        </form>
      </Card>

      {schools.length > 0 && (
        <div className="ui-two-col">
          <Card title={`Found Schools (${schools.length})`} icon="🏫" tone="success">
            <div className="ui-selectable-list">
              {schools.map((school) => {
                const selected = selectedRouteSchools.includes(school.place_id)
                return (
                  <label
                    key={school.place_id}
                    className={`ui-selectable${selected ? ' is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRouteSchool(school.place_id)}
                    />
                    <span className="ui-selectable-body">
                      <span className="ui-selectable-title">{school.name}</span>
                      <span className="ui-selectable-meta">📍 {school.address}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="ui-list-hint">Click schools to select them for route planning</div>
          </Card>

          <Card title="School Locations" icon="🗺️" tone="success">
            <div className="ui-map-frame">
              {coords ? (
                <SchoolMap coords={coords} schools={schools} />
              ) : (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Search for schools to see them on the map
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {schools.length > 0 && (
        <Card title="Route Planning" icon="🛣️" tone="warning">
          <div className="ui-stack">
            <input
              type="text"
              className="ui-input"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              placeholder="Enter starting address for route planning"
              aria-label="Route starting address"
            />
          </div>

          <div className="ui-toolbar-row">
            <div className="ui-toolbar-hint">
              Selected schools:{' '}
              <strong style={{ color: 'var(--color-primary)' }}>
                {selectedRouteSchools.length}
              </strong>
            </div>
            {selectedRouteSchools.length < 2 && (
              <div style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>
                Select at least 2 schools for routing
              </div>
            )}
          </div>

          {routeError && (
            <div className="ui-alert tone-danger" role="alert">
              {routeError}
            </div>
          )}

          <button
            onClick={handleCreateRoute}
            className="modern-btn-primary ui-block"
            disabled={!canRoute || routeLoading}
            style={{ marginBottom: routeOrder ? 'var(--space-5)' : 0 }}
          >
            {routeLoading ? '🛣️ Creating Route...' : '🛣️ Create Optimal Route'}
          </button>

          {routeOrder && (
            <div className="ui-panel tone-success">
              <h4 className="ui-panel-title">🏁 Optimal Route Order:</h4>
              <div className="ui-toolbar-hint" style={{ marginBottom: 'var(--space-4)' }}>
                Starting from: <strong style={{ color: 'var(--color-text)' }}>{startAddress}</strong>
              </div>
              <ol style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text-body)' }}>
                {routeOrder.map((pid) => {
                  const school = schools.find((s) => s.place_id === pid)
                  return (
                    <li key={pid} style={{ marginBottom: 'var(--space-3)' }}>
                      <div className="ui-selectable-title">{school?.name}</div>
                      <div className="ui-selectable-meta">📍 {school?.address}</div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </Card>
      )}

      {!loading && schools.length === 0 && coords && (
        <Card>
          <EmptyState
            icon="🔍"
            title="No Schools Found"
            message="Try adjusting your search location or selecting different school types."
            action={
              <button className="modern-btn-primary" onClick={resetSearch}>
                🔄 Start New Search
              </button>
            }
          />
        </Card>
      )}
    </AppLayout>
  )
}
