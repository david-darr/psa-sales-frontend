import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Default icon URLs, pointed at the copies in public/map.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/map/marker-icon-2x.png',
  iconUrl: '/map/marker-icon.png',
  shadowUrl: '/map/marker-shadow.png',
})

/** Northern Virginia. */
export const MAP_CENTER = [38.9, -77.25]

/**
 * One entry per marker layer, shared by the full Map page and the Home
 * dashboard's mini map.
 *
 * Each layer was previously written out by hand in up to five places - a stat
 * card, a <Marker> loop and a legend row on Map, plus a second <Marker> loop
 * and legend on Home - with its colour and label duplicated in each. Home and
 * Map had already drifted apart: Home labelled the purple layer "Elementary
 * School" where Map called it "Elementary/Catholic School", and Home's mobile
 * map silently dropped the rec and contacted layers entirely.
 *
 * `key` matches the key in the /api/map-schools response.
 */
export const MAP_LAYERS = [
  {
    key: 'happyfeet',
    label: 'HappyFeet',
    legend: 'HappyFeet Schools',
    popup: 'HappyFeet School',
    swatch: '#ef4444',
    icon: '🔴',
    tone: 'danger',
    marker: '/map/marker-red.png',
  },
  {
    key: 'psa',
    label: 'PSA',
    legend: 'PSA Schools',
    popup: 'PSA School',
    swatch: '#3b82f6',
    icon: '🔵',
    tone: 'primary',
    marker: '/map/marker-blue.png',
  },
  {
    key: 'elementary',
    label: 'Elementary',
    legend: 'Elementary',
    popup: 'Elementary/Catholic School',
    swatch: '#8b5cf6',
    icon: '🟣',
    tone: 'info',
    marker: '/map/marker-purple.png',
  },
  {
    key: 'reached_out',
    label: 'Contacted',
    legend: 'Contacted',
    popup: 'Contacted School',
    swatch: '#eab308',
    icon: '🟡',
    tone: 'warning',
    marker: '/map/marker-yellow.png',
  },
  {
    key: 'rec',
    label: 'Rec Sites',
    legend: 'Recreation Sites',
    popup: 'Recreation Site',
    swatch: '#10b981',
    icon: '🟢',
    tone: 'success',
    caption: 'Sites',
    marker: '/map/marker-green.png',
  },
]

/**
 * Icons are built once per size and reused. Home previously called
 * `new L.Icon(...)` inside its marker loops, allocating a fresh icon for every
 * marker on every render - several hundred objects per pass once the geocode
 * cache is warm.
 */
function iconSet(size) {
  return Object.fromEntries(
    MAP_LAYERS.map((layer) => [
      layer.key,
      new L.Icon({ iconUrl: layer.marker, iconSize: [size, size] }),
    ]),
  )
}

export const MARKER_ICONS = iconSet(32)
export const MARKER_ICONS_SMALL = iconSet(20)

/** Count rows per layer plus a total, tolerating missing/!Array values. */
export function countLayers(schools) {
  const perLayer = MAP_LAYERS.map((layer) => ({
    layer,
    count: Array.isArray(schools?.[layer.key]) ? schools[layer.key].length : 0,
  }))
  return {
    perLayer,
    total: perLayer.reduce((sum, entry) => sum + entry.count, 0),
  }
}

/** Rows for one layer that actually have coordinates. */
export function layerPoints(schools, key) {
  const rows = Array.isArray(schools?.[key]) ? schools[key] : []
  return rows.filter((s) => s.lat && s.lng)
}
