import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import StatCard from './components/StatCard'
import EmptyState from './components/EmptyState'
import { useIsMobile } from './hooks/useBreakpoint'
import api from './lib/api'

// Configure Leaflet icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/map/marker-icon-2x.png',
  iconUrl: '/map/marker-icon.png',
  shadowUrl: '/map/marker-shadow.png',
})

/**
 * One entry per marker layer. Previously each layer was three separate
 * hand-written blocks - a stat card, a <Marker> loop and a legend row - that
 * had to be kept in sync by hand; adding the "elementary" layer meant editing
 * all three in three places.
 *
 * `key` matches the key in the /api/map-schools response.
 */
const LAYERS = [
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

const MARKER_ICONS = Object.fromEntries(
  LAYERS.map((layer) => [layer.key, new L.Icon({ iconUrl: layer.marker, iconSize: [32, 32] })]),
)

const MAP_CENTER = [38.9, -77.25]

export default function PSAMap() {
  const isMobile = useIsMobile()
  const [schools, setSchools] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/api/map-schools', { auth: false })
      setSchools(data && typeof data === 'object' ? data : {})
    } catch (err) {
      setError(err.message || 'Could not load map data.')
      setSchools({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  const handleRefreshMap = async () => {
    setRefreshing(true)
    setError('')
    try {
      // Re-reads the Google Sheet and re-geocodes every address server-side,
      // so this is slow by design.
      await api.post('/api/refresh-map-schools', undefined, { auth: false })
      await fetchSchools()
    } catch (err) {
      setError(err.message || 'Could not refresh map data.')
    } finally {
      setRefreshing(false)
    }
  }

  const counts = useMemo(() => {
    const perLayer = LAYERS.map((layer) => ({
      layer,
      count: Array.isArray(schools[layer.key]) ? schools[layer.key].length : 0,
    }))
    return {
      perLayer,
      total: perLayer.reduce((sum, entry) => sum + entry.count, 0),
    }
  }, [schools])

  const refreshButton = (
    <button
      className="modern-btn-primary"
      onClick={handleRefreshMap}
      disabled={refreshing || loading}
    >
      {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Map Data'}
    </button>
  )

  return (
    <AppLayout title="MAP" subtitle="School Locations & Distribution" actions={refreshButton}>
      <div className="ui-stat-grid">
        <StatCard label="Total" icon="🏫" value={counts.total} caption="Schools" />
        {counts.perLayer.map(({ layer, count }) => (
          <StatCard
            key={layer.key}
            label={layer.label}
            icon={layer.icon}
            tone={layer.tone}
            value={count}
            caption={layer.caption || 'Schools'}
          />
        ))}
      </div>

      <Card title="School Distribution Map" icon="🗺️" tone="success">
        {error && (
          <div className="ui-alert tone-danger" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <EmptyState icon="⏳" title="Loading map data..." />
        ) : counts.total === 0 && !error ? (
          // The backend serves this from an in-memory cache that starts empty
          // on every boot, so a cold Render instance legitimately has no data
          // until someone refreshes. Previously this rendered as a blank map
          // with no explanation.
          <EmptyState
            icon="🗺️"
            title="No Map Data Loaded"
            message="The server builds this map by geocoding the PSA school sheet, and its cache is empty after a restart. Refreshing rebuilds it."
            action={refreshButton}
          />
        ) : (
          <>
            <div className="ui-map-canvas">
              <MapContainer
                center={MAP_CENTER}
                zoom={isMobile ? 9 : 10}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />

                {LAYERS.flatMap((layer) => {
                  const rows = Array.isArray(schools[layer.key]) ? schools[layer.key] : []
                  return rows
                    .filter((s) => s.lat && s.lng)
                    .map((s, i) => (
                      <Marker
                        key={`${layer.key}-${i}`}
                        position={[s.lat, s.lng]}
                        icon={MARKER_ICONS[layer.key]}
                      >
                        <Popup>
                          <b>{s.name}</b>
                          <br />
                          {layer.popup}
                          <br />
                          {s.address}
                        </Popup>
                      </Marker>
                    ))
                })}
              </MapContainer>
            </div>

            <div className="ui-legend">
              {LAYERS.map((layer) => (
                <div key={layer.key} className="ui-legend-item">
                  <span
                    className="ui-legend-swatch"
                    style={{ '--swatch-color': layer.swatch }}
                  />
                  <span className="ui-legend-label">{layer.legend}</span>
                </div>
              ))}
            </div>

            <div className="ui-center">{refreshButton}</div>
          </>
        )}
      </Card>
    </AppLayout>
  )
}
