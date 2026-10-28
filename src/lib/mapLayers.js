/**
 * Shared constants and pure helpers for the Territory map and the Accounts
 * page. Nothing here touches the DOM or MapLibre, so it is safe to import from
 * any page without pulling the map engine into that page's bundle.
 */

/** Northern Virginia, as [lng, lat] (MapLibre order). */
export const MAP_CENTER = [-77.25, 38.9]
export const MAP_DEFAULT_ZOOM = 9

/**
 * Prospect layers from /api/map-schools. These are deliberately muted so they
 * read as background context behind our own accounts.
 * `key` matches the key in the response.
 */
export const MAP_LAYERS = [
  { key: 'happyfeet', label: 'HappyFeet', legend: 'HappyFeet schools', popup: 'HappyFeet school', swatch: '#c97a84' },
  { key: 'psa', label: 'PSA', legend: 'PSA schools', popup: 'PSA school', swatch: '#6f8fd6' },
  { key: 'elementary', label: 'Elementary', legend: 'Elementary', popup: 'Elementary or Catholic school', swatch: '#9a86c9' },
  { key: 'reached_out', label: 'Reached out', legend: 'Reached out', popup: 'Reached out', swatch: '#c9a85f' },
  { key: 'rec', label: 'Rec centers', legend: 'Recreation centers', popup: 'Recreation center', swatch: '#5fb596' },
]

/**
 * One color per rep, picked by rep id so a rep keeps the same color on the map
 * and on the Accounts page. Coral is intentionally absent: it is reserved for
 * alerts and the primary action.
 */
export const REP_COLORS = [
  '#5b9bff',
  '#3ecf8e',
  '#f5b84a',
  '#a78bfa',
  '#22d3ee',
  '#f472b6',
  '#a3e635',
  '#fb923c',
  '#818cf8',
]

export function repColor(id) {
  const n = Number(id)
  if (Number.isFinite(n)) return REP_COLORS[Math.abs(Math.trunc(n)) % REP_COLORS.length]
  let hash = 0
  for (const ch of String(id ?? '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return REP_COLORS[hash % REP_COLORS.length]
}

/** Stage presentation for the map and Accounts page. */
export const STAGE_META = {
  partner: { label: 'Active client', color: '#3ecf8e' },
  former: { label: 'Former client', color: '#8b8b94' },
  pending: { label: 'New lead', color: '#9da5b4' },
  contacted: { label: 'Contacted', color: '#6c8bcc' },
  replied: { label: 'In conversation', color: '#a080c6' },
  meeting: { label: 'Meeting', color: '#d3a162' },
  not_interested: { label: 'Not interested', color: '#cd8795' },
}

export const PIPELINE_STAGES = ['pending', 'contacted', 'replied', 'meeting']

export const stageMeta = (id) =>
  STAGE_META[id] || { label: id || 'Unknown', color: '#8b8b94' }

/** Which of the three map toggles a stage id belongs to. */
export function stageGroup(id) {
  if (id === 'partner') return 'active'
  if (id === 'former') return 'former'
  return PIPELINE_STAGES.includes(id) ? 'pipeline' : 'other'
}

/** Parse ?stages=partner,former,... into the three toggles. */
export function togglesFromStages(value) {
  const fallback = { active: true, former: true, pipeline: false }
  if (!value) return fallback
  const groups = new Set(String(value).split(',').map((s) => stageGroup(s.trim())))
  const toggles = {
    active: groups.has('active'),
    former: groups.has('former'),
    pipeline: groups.has('pipeline'),
  }
  return toggles.active || toggles.former || toggles.pipeline ? toggles : fallback
}

export function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function parseDate(value) {
  if (!value) return null
  const text = String(value)
  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(text) || text.length <= 10 ? text : `${text}Z`,
  )
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  return (
    parseDate(value)?.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) || ''
  )
}

export function relativeDays(value) {
  const date = parseDate(value)
  if (!date) return ''
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/** Google Maps directions link built from an address. No API key needed. */
export function directionsUrl(address) {
  return address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : ''
}

const hasPoint = (row) => Number.isFinite(row?.lat) && Number.isFinite(row?.lng)

/** Rows for one prospect layer that actually have coordinates. */
export function layerPoints(schools, key) {
  const rows = Array.isArray(schools?.[key]) ? schools[key] : []
  return rows.filter(hasPoint)
}

/** Count rows per prospect layer plus a total, tolerating missing values. */
export function countLayers(schools) {
  const perLayer = MAP_LAYERS.map((layer) => ({
    layer,
    count: layerPoints(schools, layer.key).length,
  }))
  return { perLayer, total: perLayer.reduce((sum, entry) => sum + entry.count, 0) }
}

const point = (props, row) => ({
  type: 'Feature',
  properties: props,
  geometry: { type: 'Point', coordinates: [row.lng, row.lat] },
})

/** GeoJSON for our own accounts. `color` is baked in for data-driven styling. */
export function accountFeatures(accounts) {
  return {
    type: 'FeatureCollection',
    features: (accounts || []).filter(hasPoint).map((row) =>
      point(
        {
          uid: `a:${row.id}`,
          kind: 'account',
          id: row.id,
          name: row.school_name || 'Unnamed school',
          address: row.address || '',
          status: row.status,
          group: stageGroup(row.status),
          school_type: row.school_type || '',
          owner_id: row.owner_id,
          owner_name: row.owner_name || '',
          closed_at: row.closed_at || '',
          color: repColor(row.owner_id),
        },
        row,
      ),
    ),
  }
}

/** GeoJSON for the prospect layers. Only layers in `visible` are included. */
export function prospectFeatures(schools, visible) {
  const features = []
  for (const layer of MAP_LAYERS) {
    if (!visible.includes(layer.key)) continue
    layerPoints(schools, layer.key).forEach((row, index) => {
      features.push(
        point(
          {
            uid: `p:${layer.key}:${index}`,
            kind: 'prospect',
            layer: layer.key,
            name: row.name || 'Unnamed location',
            address: row.address || '',
          },
          row,
        ),
      )
    })
  }
  return { type: 'FeatureCollection', features }
}

/** [[west, south], [east, north]] around a feature list, or null when empty. */
export function boundsOf(features) {
  if (!features.length) return null
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const feature of features) {
    const [lng, lat] = feature.geometry.coordinates
    west = Math.min(west, lng)
    east = Math.max(east, lng)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  return [
    [west, south],
    [east, north],
  ]
}
