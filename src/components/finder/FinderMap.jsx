import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { circlePolygon } from './finderUtils'
import { bindMapWorker } from '../map/mapWorker'

bindMapWorker(maplibregl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const EMPTY = { type: 'FeatureCollection', features: [] }

function pinClass({ school, mine, selected, hovered, active, routed }) {
  return [
    'fd-pin',
    school.already_saved ? (mine ? 'is-mine' : 'is-owned') : 'is-new',
    selected && 'is-selected',
    routed && 'is-routed',
    hovered && 'is-hover',
    active && 'is-active',
  ]
    .filter(Boolean)
    .join(' ')
}

function pinLabel(school, rank, routeNumber) {
  const n = routeNumber ? `stop ${routeNumber}` : `number ${rank}`
  return `${school.school_name}, ${n}`
}

/**
 * Results map on MapLibre GL (key-less OpenFreeMap dark style). Numbered DOM
 * markers stay in sync with the list: hover and click highlight both ways.
 * Falls back to a plain scatter plot when WebGL is unavailable.
 */
export default function FinderMap({
  center,
  radiusKm,
  schools,
  ranks,
  mineIds,
  selectedIds,
  hoverId,
  activeId,
  routeIds,
  fitKey,
  onHover,
  onSelect,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const centerMarkerRef = useRef(null)
  const cbRef = useRef({ onHover, onSelect })
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    cbRef.current = { onHover, onSelect }
  })

  const routeNumbers = useMemo(() => {
    const map = new Map()
    ;(routeIds || []).forEach((id, i) => map.set(id, i + 1))
    return map
  }, [routeIds])

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    let map
    try {
      map = new maplibregl.Map({
        container,
        style: STYLE_URL,
        center: [center?.lng ?? -77.25, center?.lat ?? 38.89],
        zoom: 10.5,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      })
    } catch {
      setFailed(true)
      return undefined
    }
    map.touchZoomRotate.disableRotation()
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    )
    map.on('error', (event) => {
      if (/webgl/i.test(String(event?.error?.message))) setFailed(true)
    })
    map.on('load', () => {
      map.addSource('fd-radius', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'fd-radius-fill',
        type: 'fill',
        source: 'fd-radius',
        paint: { 'fill-color': '#ff4d5e', 'fill-opacity': 0.05 },
      })
      map.addLayer({
        id: 'fd-radius-line',
        type: 'line',
        source: 'fd-radius',
        paint: {
          'line-color': '#ff4d5e',
          'line-opacity': 0.55,
          'line-width': 1.2,
          'line-dasharray': [3, 3],
        },
      })
      map.addSource('fd-route', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'fd-route-line',
        type: 'line',
        source: 'fd-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f4f4f5',
          'line-width': 2.5,
          'line-opacity': 0.85,
        },
      })
      setReady(true)
    })
    mapRef.current = map
    const resize = new ResizeObserver(() => map.resize())
    resize.observe(container)
    const markers = markersRef.current
    return () => {
      resize.disconnect()
      markers.forEach((entry) => entry.marker.remove())
      markers.clear()
      centerMarkerRef.current?.remove()
      centerMarkerRef.current = null
      map.remove()
      mapRef.current = null
      setReady(false)
    }
    // The map is created once; center is applied by the fit effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Search center + radius ring.
  useEffect(() => {
    const map = mapRef.current
    if (!map || failed) return
    if (!center) {
      centerMarkerRef.current?.remove()
      centerMarkerRef.current = null
    } else {
      if (!centerMarkerRef.current) {
        const el = document.createElement('div')
        el.className = 'fd-center'
        el.setAttribute('role', 'img')
        el.setAttribute('aria-label', 'Search center')
        centerMarkerRef.current = new maplibregl.Marker({ element: el })
      }
      centerMarkerRef.current.setLngLat([center.lng, center.lat]).addTo(map)
    }
    if (ready) {
      map
        .getSource('fd-radius')
        ?.setData(
          center && radiusKm
            ? circlePolygon(center.lat, center.lng, radiusKm)
            : EMPTY,
        )
    }
  }, [center, radiusKm, ready, failed])

  // Route polyline.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const byId = new Map(schools.map((s) => [s.place_id, s]))
    const coords = (routeIds || [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((s) => [Number(s.lng), Number(s.lat)])
    map.getSource('fd-route')?.setData(
      coords.length > 1
        ? {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
          }
        : EMPTY,
    )
  }, [routeIds, schools, ready])

  // Sync markers with the visible list.
  useEffect(() => {
    const map = mapRef.current
    if (!map || failed) return
    const live = markersRef.current
    const wanted = new Set(schools.map((s) => s.place_id))
    live.forEach((entry, id) => {
      if (!wanted.has(id)) {
        entry.marker.remove()
        live.delete(id)
      }
    })
    for (const school of schools) {
      const id = school.place_id
      let entry = live.get(id)
      if (!entry) {
        const el = document.createElement('button')
        el.type = 'button'
        el.tabIndex = -1
        const dot = document.createElement('span')
        dot.className = 'fd-pin-dot'
        el.appendChild(dot)
        el.addEventListener('mouseenter', () => cbRef.current.onHover(id))
        el.addEventListener('mouseleave', () => cbRef.current.onHover(null))
        el.addEventListener('click', (event) => {
          event.stopPropagation()
          cbRef.current.onSelect(id)
        })
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([Number(school.lng), Number(school.lat)])
          .addTo(map)
        entry = { marker, el, dot }
        live.set(id, entry)
      }
      const routeNumber = routeNumbers.get(id)
      entry.el.className = pinClass({
        school,
        mine: mineIds.has(id),
        selected: selectedIds.has(id),
        hovered: hoverId === id,
        active: activeId === id,
        routed: Boolean(routeNumber),
      })
      entry.el.setAttribute(
        'aria-label',
        pinLabel(school, ranks.get(id), routeNumber),
      )
      entry.dot.textContent = String(routeNumber || ranks.get(id) || '')
    }
  }, [
    schools,
    ranks,
    mineIds,
    selectedIds,
    hoverId,
    activeId,
    routeNumbers,
    failed,
  ])

  // Fit to the results when a new search lands (and the first time).
  const fittedKey = useRef(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || failed || fittedKey.current === fitKey) return
    const points = schools.map((s) => [Number(s.lng), Number(s.lat)])
    if (center) points.push([center.lng, center.lat])
    if (!points.length) return
    fittedKey.current = fitKey
    const bounds = points.reduce(
      (b, p) => b.extend(p),
      new maplibregl.LngLatBounds(points[0], points[0]),
    )
    map.fitBounds(bounds, {
      padding: 56,
      maxZoom: 14.5,
      duration: 0,
    })
  }, [fitKey, schools, center, failed])

  // Fly to the active school.
  useEffect(() => {
    const map = mapRef.current
    if (!map || failed || !activeId) return
    const school = schools.find((s) => s.place_id === activeId)
    if (!school) return
    map.easeTo({
      center: [Number(school.lng), Number(school.lat)],
      zoom: Math.max(map.getZoom(), 13.5),
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 500,
    })
    // Only re-run when the active id changes, not when the list refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, failed])

  if (failed) {
    return (
      <PlotFallback
        center={center}
        radiusKm={radiusKm}
        schools={schools}
        ranks={ranks}
        mineIds={mineIds}
        selectedIds={selectedIds}
        hoverId={hoverId}
        activeId={activeId}
        routeNumbers={routeNumbers}
        onHover={onHover}
        onSelect={onSelect}
      />
    )
  }

  return (
    <div className="fd-map-canvas">
      <div ref={containerRef} className="fd-map-gl" />
      <MapLegend />
    </div>
  )
}

function MapLegend() {
  return (
    <ul className="fd-legend" aria-label="Map legend">
      <li>
        <i className="fd-legend-dot is-new" />
        New
      </li>
      <li>
        <i className="fd-legend-dot is-mine" />
        Yours
      </li>
      <li>
        <i className="fd-legend-dot is-owned" />
        Owned
      </li>
    </ul>
  )
}

/** Equirectangular scatter used only when WebGL cannot start. */
function PlotFallback({
  center,
  radiusKm,
  schools,
  ranks,
  mineIds,
  selectedIds,
  hoverId,
  activeId,
  routeNumbers,
  onHover,
  onSelect,
}) {
  const points = schools.map((s) => ({
    s,
    lat: Number(s.lat),
    lng: Number(s.lng),
  }))
  const lats = [...points.map((p) => p.lat), center?.lat].filter(
    Number.isFinite,
  )
  const lngs = [...points.map((p) => p.lng), center?.lng].filter(
    Number.isFinite,
  )
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const spanLat = Math.max(maxLat - minLat, 0.01)
  const spanLng = Math.max(maxLng - minLng, 0.01)
  const at = (lat, lng) => ({
    left: `${8 + ((lng - minLng) / spanLng) * 84}%`,
    top: `${92 - ((lat - minLat) / spanLat) * 84}%`,
  })
  return (
    <div className="fd-map-canvas fd-plot">
      <p className="fd-plot-note">
        Map tiles unavailable on this device. Showing relative positions.
        {radiusKm ? ` Radius ${radiusKm} km.` : ''}
      </p>
      {center && (
        <div className="fd-center" style={at(center.lat, center.lng)} />
      )}
      {points.map(({ s, lat, lng }) => (
        <button
          key={s.place_id}
          type="button"
          tabIndex={-1}
          className={pinClass({
            school: s,
            mine: mineIds.has(s.place_id),
            selected: selectedIds.has(s.place_id),
            hovered: hoverId === s.place_id,
            active: activeId === s.place_id,
            routed: routeNumbers.has(s.place_id),
          })}
          style={at(lat, lng)}
          aria-label={pinLabel(
            s,
            ranks.get(s.place_id),
            routeNumbers.get(s.place_id),
          )}
          onMouseEnter={() => onHover(s.place_id)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(s.place_id)}
        >
          <span className="fd-pin-dot">
            {routeNumbers.get(s.place_id) || ranks.get(s.place_id)}
          </span>
        </button>
      ))}
      <MapLegend />
    </div>
  )
}
