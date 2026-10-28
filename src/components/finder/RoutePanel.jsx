import { useMemo } from 'react'
import Modal from '../Modal'
import Glyph from './icons'
import { formatKm, haversineKm, routeUrls } from './finderUtils'

/**
 * Route planning dialog: pick a start, ask /api/route-plan for the visit
 * order, then show ordered stops with straight-line leg distances and a
 * multi-stop Google Maps link.
 */
export default function RoutePanel({
  stops,
  startText,
  onStartText,
  startCoords,
  loading,
  error,
  order,
  onPlan,
  onClose,
}) {
  const byId = useMemo(
    () => new Map(stops.map((s) => [s.place_id, s])),
    [stops],
  )
  const ordered = useMemo(
    () => (order || []).map((id) => byId.get(id)).filter(Boolean),
    [order, byId],
  )
  const legs = useMemo(() => {
    let prev = startCoords
    return ordered.map((stop) => {
      const here = { lat: Number(stop.lat), lng: Number(stop.lng) }
      const km = prev ? haversineKm(prev, here) : null
      prev = here
      return km
    })
  }, [ordered, startCoords])
  const total = legs.reduce((sum, km) => sum + (km || 0), 0)
  const urls = useMemo(
    () =>
      ordered.length
        ? routeUrls(
            ordered,
            startCoords
              ? `${startCoords.lat},${startCoords.lng}`
              : startText || null,
          )
        : [],
    [ordered, startCoords, startText],
  )

  return (
    <Modal
      title="Plan route"
      onClose={onClose}
      size="lg"
      footer={
        <>
          {urls.map((u) => (
            <a
              key={u.from}
              className="fd-btn fd-btn-solid"
              href={u.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Glyph name="external" size={14} />
              {urls.length > 1
                ? `Open stops ${u.from} to ${u.to} in Google Maps`
                : 'Open in Google Maps'}
            </a>
          ))}
          <button type="button" className="fd-btn fd-btn-ghost" onClick={onClose}>
            {order ? 'Show on map' : 'Cancel'}
          </button>
        </>
      }
    >
      <form
        className="fd-route-form"
        onSubmit={(event) => {
          event.preventDefault()
          onPlan()
        }}
      >
        <label className="fd-label" htmlFor="fd-route-start">
          Starting point
        </label>
        <div className="fd-route-start">
          <input
            id="fd-route-start"
            className="fd-route-input"
            value={startText}
            onChange={(event) => onStartText(event.target.value)}
            placeholder="Address to start from"
            autoComplete="street-address"
          />
          <button
            type="submit"
            className="fd-btn fd-btn-solid"
            disabled={loading || !startText.trim() || stops.length < 2}
          >
            <Glyph name="route" size={14} />
            {loading ? 'Planning...' : order ? 'Re-plan' : 'Plan route'}
          </button>
        </div>
        <p className="fd-muted fd-route-note">
          {stops.length} stops selected. Order is based on distance; traffic
          can change the best sequence.
        </p>
      </form>

      {error && (
        <p className="fd-form-error" role="alert">
          <Glyph name="alert" size={14} />
          {error}
        </p>
      )}

      {loading && (
        <div className="fd-route-skel" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="fd-skel fd-skel-line" style={{ height: 38 }} />
          ))}
        </div>
      )}

      {!loading && ordered.length > 0 && (
        <>
          <div className="fd-route-summary fd-mono">
            {ordered.length} stops
            {total > 0 && <> / about {formatKm(total)} straight-line</>}
          </div>
          <ol className="fd-route-list" aria-label="Visit order">
            <li className="fd-route-stop is-start">
              <span className="fd-route-num fd-mono">S</span>
              <div>
                <strong>Start</strong>
                <span className="fd-muted">{startText}</span>
              </div>
            </li>
            {ordered.map((stop, i) => (
              <li key={stop.place_id} className="fd-route-stop">
                <span className="fd-route-num fd-mono">{i + 1}</span>
                <div>
                  <strong>{stop.school_name}</strong>
                  <span className="fd-muted">{stop.address}</span>
                </div>
                {legs[i] !== null && (
                  <span className="fd-mono fd-muted fd-route-leg">
                    +{formatKm(legs[i])}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  )
}
