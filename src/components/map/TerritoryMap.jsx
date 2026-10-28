import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FALLBACK_STYLE,
  STYLE_URL,
  loadMapLibre,
  webglAvailable,
} from './mapSetup'
import { MAP_CENTER, MAP_DEFAULT_ZOOM, MAP_LAYERS } from '../../lib/mapLayers'

const EMPTY = { type: 'FeatureCollection', features: [] }
const FONT = ['Noto Sans Bold']
const FONT_REGULAR = ['Noto Sans Regular']
const INTERACTIVE = [
  'accounts-active',
  'accounts-former',
  'accounts-pipeline',
  'account-clusters',
  'prospect-points',
  'prospect-clusters',
]
const NOT_CLUSTER = ['!', ['has', 'point_count']]
const uidIs = (uid) => ['==', ['get', 'uid'], uid || '']
const growWithZoom = (a, b, c) => [
  'interpolate',
  ['linear'],
  ['zoom'],
  8,
  a,
  12,
  b,
  15,
  c,
]

function addSourcesAndLayers(map) {
  if (map.getSource('accounts')) return
  map.addSource('prospects', {
    type: 'geojson',
    data: EMPTY,
    cluster: true,
    clusterRadius: 38,
    clusterMaxZoom: 12,
  })
  map.addSource('accounts', {
    type: 'geojson',
    data: EMPTY,
    cluster: true,
    clusterRadius: 42,
    clusterMaxZoom: 11,
  })

  const prospectColor = [
    'match',
    ['get', 'layer'],
    ...MAP_LAYERS.flatMap((layer) => [layer.key, layer.swatch]),
    '#8b8b94',
  ]
  const textPaint = (color) => ({
    'text-color': color,
    'text-halo-color': 'rgba(0,0,0,0.35)',
    'text-halo-width': 0.6,
  })

  map.addLayer({
    id: 'prospect-clusters',
    type: 'circle',
    source: 'prospects',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': 'rgba(255,255,255,0.09)',
      'circle-stroke-color': 'rgba(255,255,255,0.28)',
      'circle-stroke-width': 1,
      'circle-radius': ['step', ['get', 'point_count'], 11, 10, 14, 50, 18],
    },
  })
  map.addLayer({
    id: 'prospect-cluster-count',
    type: 'symbol',
    source: 'prospects',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': FONT_REGULAR,
      'text-size': 10,
      'text-allow-overlap': true,
    },
    paint: textPaint('#c9c9cf'),
  })
  map.addLayer({
    id: 'prospect-points',
    type: 'circle',
    source: 'prospects',
    filter: NOT_CLUSTER,
    paint: {
      'circle-color': prospectColor,
      'circle-opacity': 0.72,
      'circle-radius': growWithZoom(3, 4, 6),
      'circle-stroke-color': 'rgba(10,10,11,0.7)',
      'circle-stroke-width': 1,
    },
  })

  map.addLayer({
    id: 'account-clusters',
    type: 'circle',
    source: 'accounts',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#1b1b20',
      'circle-stroke-color': '#f4f4f5',
      'circle-stroke-width': 2,
      'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 40, 24],
    },
  })
  map.addLayer({
    id: 'account-cluster-count',
    type: 'symbol',
    source: 'accounts',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': FONT,
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#f4f4f5' },
  })
  map.addLayer({
    id: 'accounts-pipeline',
    type: 'circle',
    source: 'accounts',
    filter: ['all', NOT_CLUSTER, ['==', ['get', 'group'], 'pipeline']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.8,
      'circle-radius': growWithZoom(4, 5.5, 7),
      'circle-stroke-color': 'rgba(255,255,255,0.55)',
      'circle-stroke-width': 1.25,
    },
  })
  map.addLayer({
    id: 'accounts-former',
    type: 'circle',
    source: 'accounts',
    filter: ['all', NOT_CLUSTER, ['==', ['get', 'group'], 'former']],
    paint: {
      'circle-color': '#0a0a0b',
      'circle-opacity': 0.7,
      'circle-radius': growWithZoom(6, 8, 10.5),
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': 2.5,
      'circle-stroke-opacity': 0.85,
    },
  })
  map.addLayer({
    id: 'accounts-active',
    type: 'circle',
    source: 'accounts',
    filter: ['all', NOT_CLUSTER, ['==', ['get', 'group'], 'active']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': growWithZoom(7, 9, 12),
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })

  const ring = (id, source, radius, width, opacity) =>
    map.addLayer({
      id,
      type: 'circle',
      source,
      filter: uidIs(''),
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-radius': radius,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': width,
        'circle-stroke-opacity': opacity,
      },
    })
  ring('accounts-hover', 'accounts', 15, 1.5, 0.7)
  ring('prospects-hover', 'prospects', 10, 1.5, 0.7)
  ring('accounts-selected', 'accounts', 17, 2.5, 1)
  ring('prospects-selected', 'prospects', 12, 2.5, 1)
}

function pickFeature(map, point) {
  const hits = map.queryRenderedFeatures(point, { layers: INTERACTIVE })
  return hits[0] || null
}

/**
 * The MapLibre canvas for the Territory page. React owns the data and the
 * selection; this component owns the imperative map and is rebuilt only on
 * mount/unmount.
 *
 * @param {object}   accounts   GeoJSON FeatureCollection of our accounts.
 * @param {object}   prospects  GeoJSON FeatureCollection of prospect layers.
 * @param {string}   selectedUid  uid property of the selected feature.
 * @param {function} onSelect   Called with feature properties (or null).
 * @param {object}   fitRequest {id, bounds} to fit the viewport.
 * @param {object}   flyRequest {id, lng, lat, zoom} to fly to a point.
 */
export default function TerritoryMap({
  accounts,
  prospects,
  selectedUid,
  onSelect,
  fitRequest,
  flyRequest,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  const handled = useRef({ fit: null, fly: null })
  const [status, setStatus] = useState(() =>
    webglAvailable() ? 'loading' : 'nogl',
  )
  const [basemapDown, setBasemapDown] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    if (status === 'nogl') return undefined
    let cancelled = false
    let map = null
    let observer = null
    let timer = null
    let loaded = false
    let fellBack = false
    let hoverPopup = null

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return
        try {
          map = new maplibregl.Map({
            container: containerRef.current,
            style: STYLE_URL,
            center: MAP_CENTER,
            zoom: MAP_DEFAULT_ZOOM,
            minZoom: 3,
            maxPitch: 0,
            dragRotate: false,
            attributionControl: { compact: false },
          })
        } catch {
          setStatus('nogl')
          return
        }
        map.touchZoomRotate.disableRotation()
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          'top-right',
        )
        hoverPopup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          className: 'tm-hover-pop',
        })

        const setup = () => {
          loaded = true
          clearTimeout(timer)
          addSourcesAndLayers(map)
          mapRef.current = map
          setStatus('ready')
        }
        const fallBack = () => {
          if (loaded || fellBack || !map) return
          fellBack = true
          setBasemapDown(true)
          map.setStyle(FALLBACK_STYLE)
          map.once('style.load', setup)
        }
        map.once('load', setup)
        map.on('error', (event) => {
          // Style-level failures have no source or tile; tile errors do.
          if (!event.sourceId && !event.tile) fallBack()
        })
        timer = setTimeout(fallBack, 12000)

        const setHover = (feature) => {
          const uid = feature && !feature.properties.point_count ? feature.properties.uid : ''
          map.setFilter('accounts-hover', uidIs(feature?.source === 'accounts' ? uid : ''))
          map.setFilter('prospects-hover', uidIs(feature?.source === 'prospects' ? uid : ''))
          if (feature && uid) {
            const [lng, lat] = feature.geometry.coordinates
            hoverPopup
              .setLngLat([lng, lat])
              .setText(feature.properties.name)
              .addTo(map)
          } else {
            hoverPopup.remove()
          }
          map.getCanvas().style.cursor = feature ? 'pointer' : ''
        }
        map.on('mousemove', (event) => {
          if (!loaded) return
          setHover(pickFeature(map, event.point))
        })
        map.on('mouseout', () => loaded && setHover(null))
        map.on('click', async (event) => {
          if (!loaded) return
          const feature = pickFeature(map, event.point)
          if (!feature) {
            onSelectRef.current?.(null)
            return
          }
          if (feature.properties.point_count) {
            try {
              const zoom = await map
                .getSource(feature.source)
                .getClusterExpansionZoom(feature.properties.cluster_id)
              map.easeTo({
                center: feature.geometry.coordinates,
                zoom: Math.min(zoom + 0.5, 17),
                duration: 500,
              })
            } catch {
              map.easeTo({ center: feature.geometry.coordinates, zoom: map.getZoom() + 2 })
            }
            return
          }
          onSelectRef.current?.({ ...feature.properties, lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] })
        })

        observer = new ResizeObserver(() => map.resize())
        observer.observe(containerRef.current)
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
      observer?.disconnect()
      hoverPopup?.remove()
      mapRef.current = null
      map?.remove()
    }
    // The map is created exactly once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ready = status === 'ready'

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.getSource('accounts')?.setData(accounts || EMPTY)
  }, [accounts, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.getSource('prospects')?.setData(prospects || EMPTY)
  }, [prospects, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const uid = selectedUid || ''
    map.setFilter('accounts-selected', uidIs(uid.startsWith('a:') ? uid : ''))
    map.setFilter('prospects-selected', uidIs(uid.startsWith('p:') ? uid : ''))
  }, [selectedUid, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !fitRequest || handled.current.fit === fitRequest.id) return
    handled.current.fit = fitRequest.id
    if (!fitRequest.bounds) return
    const width = containerRef.current?.clientWidth || 0
    const desktop = width > 900
    map.fitBounds(fitRequest.bounds, {
      padding: desktop
        ? { top: 70, bottom: 70, left: 390, right: 80 }
        : { top: 150, bottom: 90, left: 40, right: 40 },
      maxZoom: 13,
      duration: fitRequest.instant ? 0 : 700,
    })
  }, [fitRequest, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !flyRequest || handled.current.fly === flyRequest.id) return
    handled.current.fly = flyRequest.id
    const desktop = (containerRef.current?.clientWidth || 0) > 900
    map.flyTo({
      center: [flyRequest.lng, flyRequest.lat],
      zoom: flyRequest.zoom || 14,
      offset: desktop ? [170, 0] : [0, 60],
      essential: true,
    })
  }, [flyRequest, ready])

  if (status === 'nogl' || status === 'error') {
    return (
      <div className="tm-canvas tm-fallback" role="alert">
        <div className="tm-fallback-card">
          <strong>
            {status === 'nogl'
              ? 'The interactive map needs WebGL'
              : 'The map engine could not load'}
          </strong>
          <p>
            {status === 'nogl'
              ? 'WebGL looks disabled or unsupported in this browser. Turn on hardware acceleration, or try a recent version of Chrome, Edge, Safari, or Firefox.'
              : 'Check your connection and reload the page.'}
          </p>
          <Link className="tm-btn" to="/accounts">
            See accounts as a list
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className="tm-canvas" />
      {status === 'loading' && (
        <div className="tm-loading" role="status">
          <span className="tm-spinner" aria-hidden="true" />
          Loading map
        </div>
      )}
      {basemapDown && (
        <div className="tm-basemap-note" role="status">
          Basemap tiles could not load. Your accounts are still shown.
        </div>
      )}
    </>
  )
}
