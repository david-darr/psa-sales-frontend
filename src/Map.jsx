import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Icon from './components/Icon'
import ControlCard from './components/map/ControlCard'
import AccountCard from './components/map/AccountCard'
import TerritoryMap from './components/map/TerritoryMap'
import {
  MAP_LAYERS,
  PIPELINE_STAGES,
  accountFeatures,
  boundsOf,
  countLayers,
  prospectFeatures,
  stageGroup,
  togglesFromStages,
} from './lib/mapLayers'
import api from './lib/api'
import './styles/map.css'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

function Territory() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const ownerParam = params.get('owner')
  const schoolParam = params.get('school')

  const [repSel, setRepSel] = useState(() => (ownerParam ? [String(ownerParam)] : []))
  const [toggles, setToggles] = useState(() => togglesFromStages(params.get('stages')))
  const [layersOn, setLayersOn] = useState(() => MAP_LAYERS.map((layer) => layer.key))
  const [selected, setSelected] = useState(null)
  const [panelCollapsed, setPanelCollapsed] = useState(true)

  const [data, setData] = useState(null)
  const [prospects, setProspects] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fit, setFit] = useState(null)
  const [fly, setFly] = useState(null)
  const [locating, setLocating] = useState(null)
  const [locateNote, setLocateNote] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState(null)
  const stopLocate = useRef(false)
  const stopRefresh = useRef(false)
  const fitted = useRef(false)
  const requestId = useRef(0)

  const includePipeline = toggles.pipeline
  const loadAccounts = useCallback(async () => {
    const id = ++requestId.current
    const stages = ['partner', 'former', ...(includePipeline ? PIPELINE_STAGES : [])]
    try {
      const result = await api.get(`/api/crm/map-accounts?stages=${stages.join(',')}`)
      if (id === requestId.current) {
        setData(result)
        setError('')
      }
    } catch (err) {
      if (id === requestId.current) setError(err.message || 'Could not load accounts.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [includePipeline])

  const loadProspects = useCallback(async () => {
    try {
      setProspects((await api.get('/api/map-schools')) || {})
    } catch {
      // The prospect layers are optional context; accounts still render.
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])
  useEffect(() => {
    loadProspects()
    const stop = stopLocate
    const stopSync = stopRefresh
    return () => {
      stop.current = true
      stopSync.current = true
    }
  }, [loadProspects])

  const accounts = useMemo(
    () =>
      (data?.accounts || []).filter(
        (row) => Number.isFinite(row.lat) && Number.isFinite(row.lng),
      ),
    [data],
  )
  const inGroups = useMemo(
    () => accounts.filter((row) => toggles[stageGroup(row.status)]),
    [accounts, toggles],
  )
  const visibleAccounts = useMemo(
    () =>
      repSel.length
        ? inGroups.filter((row) => repSel.includes(String(row.owner_id)))
        : inGroups,
    [inGroups, repSel],
  )
  const accountFC = useMemo(() => accountFeatures(visibleAccounts), [visibleAccounts])
  const prospectFC = useMemo(
    () => prospectFeatures(prospects, layersOn),
    [prospects, layersOn],
  )
  const layerCounts = useMemo(
    () =>
      Object.fromEntries(
        countLayers(prospects).perLayer.map((entry) => [entry.layer.key, entry.count]),
      ),
    [prospects],
  )
  const stageCounts = useMemo(() => {
    const out = { active: 0, former: 0, pipeline: 0 }
    for (const row of accounts) {
      if (repSel.length && !repSel.includes(String(row.owner_id))) continue
      const group = stageGroup(row.status)
      if (group in out) out[group] += 1
    }
    return out
  }, [accounts, repSel])

  const reps = useMemo(() => {
    const counts = new Map()
    for (const row of inGroups) {
      const key = String(row.owner_id)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return (data?.reps || [])
      .map((rep) => ({ ...rep, count: counts.get(String(rep.id)) ?? 0 }))
      .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)))
  }, [data, inGroups])

  const searchables = useMemo(
    () => [...accountFC.features, ...prospectFC.features],
    [accountFC, prospectFC],
  )
  const selectedPoint = useMemo(
    () =>
      selected &&
      searchables.some((feature) => feature.properties.uid === selected.uid)
        ? selected
        : null,
    [selected, searchables],
  )

  const fitTo = useCallback((features) => {
    const bounds = boundsOf(features)
    if (bounds) setFit((old) => ({ id: (old?.id || 0) + 1, bounds }))
  }, [])

  // Frame the territory once the first accounts arrive, honoring deep links.
  useEffect(() => {
    if (fitted.current || loading || !data) return
    fitted.current = true
    const focus = schoolParam
      ? accountFC.features.find((f) => String(f.properties.id) === String(schoolParam))
      : null
    if (focus) {
      const [lng, lat] = focus.geometry.coordinates
      setSelected({ ...focus.properties, lng, lat })
      setFly({ id: 1, lng, lat, zoom: 15 })
    } else {
      fitTo(accountFC.features.length ? accountFC.features : prospectFC.features)
    }
  }, [loading, data, schoolParam, accountFC, prospectFC, fitTo])

  const fitMine = () => {
    const mine = visibleAccounts.filter((row) => String(row.owner_id) === String(user?.id))
    fitTo(accountFeatures(mine.length ? mine : visibleAccounts).features)
  }

  const pick = (feature) => {
    const [lng, lat] = feature.geometry.coordinates
    setSelected({ ...feature.properties, lng, lat })
    setFly((old) => ({ id: (old?.id || 0) + 1, lng, lat, zoom: 14.5 }))
    setPanelCollapsed(true)
  }

  const toggleRep = (id) =>
    setRepSel((old) => (old.includes(id) ? old.filter((item) => item !== id) : [...old, id]))
  const setToggle = (key, value) => {
    const next = { ...toggles, [key]: value }
    if (!next.active && !next.former && !next.pipeline) return
    setToggles(next)
  }
  const setLayer = (key, on) =>
    setLayersOn((old) => (on ? [...old, key] : old.filter((item) => item !== key)))

  const unlocated = data?.unlocated || 0
  const locate = async () => {
    stopLocate.current = false
    setLocateNote('')
    let located = 0
    let remaining = unlocated
    setLocating({ located, remaining })
    try {
      while (!stopLocate.current) {
        const report = await api.post('/api/crm/map-accounts/locate', { limit: 25 })
        located += report?.located || 0
        remaining = report?.remaining ?? 0
        setLocating({ located, remaining })
        if (!remaining || !report?.located) break
      }
      if (remaining) {
        setLocateNote(
          stopLocate.current
            ? `Stopped. ${plural(located, 'account', 'accounts')} located.`
            : `${plural(remaining, 'address', 'addresses')} could not be located.`,
        )
      }
    } catch (err) {
      setError(err.message || 'Could not locate accounts.')
    } finally {
      setLocating(null)
      await loadAccounts()
    }
  }

  const refresh = async () => {
    stopRefresh.current = false
    setRefreshing(true)
    setError('')
    setProgress(null)
    try {
      while (!stopRefresh.current) {
        const report = await api.post('/api/refresh-map-schools')
        setProgress(report)
        await loadProspects()
        if (stopRefresh.current || !report?.remaining || !report?.processed) break
      }
    } catch (err) {
      setError(err.message || 'Could not sync locations.')
    } finally {
      setRefreshing(false)
    }
  }

  const reload = () => {
    setLoading(true)
    loadAccounts()
    loadProspects()
  }

  const notices = (
    <>
      {error && (
        <div className="tm-notice is-danger" role="alert">
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {!!unlocated && !locating && (
        <div className="tm-notice">
          <span>
            {plural(unlocated, 'account needs', 'accounts need')} map locations
          </span>
          <button type="button" onClick={locate}>
            Locate them
          </button>
        </div>
      )}
      {locating && (
        <div className="tm-notice" role="status">
          <span className="tm-notice-progress">
            <span className="tm-spinner" aria-hidden="true" />
            Locating: {locating.located} done, {locating.remaining} left
          </span>
          <button type="button" onClick={() => (stopLocate.current = true)}>
            Cancel
          </button>
        </div>
      )}
      {!locating && locateNote && (
        <div className="tm-notice is-quiet" role="status">
          <span>{locateNote}</span>
        </div>
      )}
      {refreshing && (
        <div className="tm-notice" role="status">
          <span className="tm-notice-progress">
            <span className="tm-spinner" aria-hidden="true" />
            Syncing prospects
            {progress?.remaining ? `, ${progress.remaining} waiting` : ''}
          </span>
          <button type="button" onClick={() => (stopRefresh.current = true)}>
            Stop
          </button>
        </div>
      )}
      {!refreshing && progress && !progress.remaining && (
        <div className="tm-notice is-quiet" role="status">
          <span>
            Prospect sync complete
            {progress.failed
              ? `, ${plural(progress.failed, 'address', 'addresses')} not found`
              : ''}
          </span>
        </div>
      )}
    </>
  )

  const nothingAtAll = !loading && !accounts.length && !countLayers(prospects).total
  const noMatch = !loading && !!accounts.length && !visibleAccounts.length

  return (
    <AppLayout
      title="Territory map"
      subtitle="Your accounts and prospects, by rep."
      actions={
        <>
          <button type="button" className="tm-btn" onClick={reload} disabled={loading}>
            <Icon name="refresh" size={13} />
            Reload map
          </button>
          {user?.admin && (
            <button
              type="button"
              className="tm-btn tm-btn-solid"
              onClick={refreshing ? () => (stopRefresh.current = true) : refresh}
            >
              <Icon name="map" size={13} />
              {refreshing ? 'Stop sync' : 'Sync locations'}
            </button>
          )}
        </>
      }
    >
      <div className="tm-stage">
        <TerritoryMap
          accounts={accountFC}
          prospects={prospectFC}
          selectedUid={selectedPoint?.uid}
          onSelect={setSelected}
          fitRequest={fit}
          flyRequest={fly}
        />
        <ControlCard
          reps={reps}
          repSel={repSel}
          onRepToggle={toggleRep}
          onAllReps={() => setRepSel([])}
          onJustMe={() => setRepSel([String(user?.id)])}
          userId={user?.id}
          toggles={toggles}
          onToggle={setToggle}
          stageCounts={stageCounts}
          layerCounts={layerCounts}
          layersOn={layersOn}
          onLayer={setLayer}
          searchables={searchables}
          onPick={pick}
          onFit={fitMine}
          fitDisabled={!visibleAccounts.length}
          notices={notices}
          collapsed={panelCollapsed}
          onCollapse={() => setPanelCollapsed((value) => !value)}
          emptyReps={loading ? 'Loading reps...' : 'No accounts to group by rep yet.'}
        />
        <AccountCard point={selectedPoint} onClose={() => setSelected(null)} />
        {loading && !data && (
          <div className="tm-overlay" role="status">
            <span className="tm-spinner" aria-hidden="true" />
            Loading your territory
          </div>
        )}
        {nothingAtAll && (
          <div className="tm-overlay is-card">
            <Icon name="map" size={22} />
            <strong>No accounts on the map yet</strong>
            <p>
              {user?.admin
                ? 'Close a school or sync locations and it will appear here.'
                : 'Schools you close will appear here once they have a location.'}
            </p>
            <Link className="tm-btn" to="/schools">
              Browse schools
            </Link>
          </div>
        )}
        {noMatch && !nothingAtAll && (
          <div className="tm-empty-note" role="status">
            No accounts match these filters.
          </div>
        )}
      </div>
    </AppLayout>
  )
}

/**
 * /map. Deep links (?owner=<id>, ?stages=partner,former, ?school=<id>) set the
 * initial filters; changing them remounts so the new filters apply cleanly.
 */
export default function PSAMap() {
  const [params] = useSearchParams()
  return <Territory key={params.toString()} />
}
