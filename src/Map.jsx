import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import StatCard from './components/StatCard'
import EmptyState from './components/EmptyState'
import SchoolMarkers from './components/SchoolMarkers'
import MapLegend from './components/MapLegend'
import { useIsMobile } from './hooks/useBreakpoint'
import { MAP_CENTER, countLayers } from './lib/mapLayers'
import api from './lib/api'

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

  const counts = useMemo(() => countLayers(schools), [schools])

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
          // The backend serves this from an in-memory dict that is empty on
          // every boot, so a cold Render instance legitimately has no data
          // until someone refreshes. This previously rendered as a blank map
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
                <SchoolMarkers schools={schools} />
              </MapContainer>
            </div>

            <MapLegend />

            <div className="ui-center">{refreshButton}</div>
          </>
        )}
      </Card>
    </AppLayout>
  )
}
