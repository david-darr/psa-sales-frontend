import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import api from './lib/api'
import { useAuth } from './hooks/useAuth'
import SearchCard from './components/finder/SearchCard'
import ResultsPane from './components/finder/ResultsPane'
import BulkBar from './components/finder/BulkBar'
import SaveToast from './components/finder/SaveToast'
import RoutePanel from './components/finder/RoutePanel'
import Glyph from './components/finder/icons'
import useFinderSearch from './components/finder/useFinderSearch'
import useSchoolDetails from './components/finder/useSchoolDetails'
import {
  DEFAULT_KEYWORDS,
  DEFAULT_RADIUS,
  MY_LOCATION_LABEL,
  guessSchoolType,
  humanizeReason,
  loadLastSearch,
  parseUrlSearch,
  saveLastSearch,
  sortSchools,
} from './components/finder/finderUtils'
import './styles/finder.css'

const FinderMap = lazy(() => import('./components/finder/FinderMap'))
const SchoolDialog = lazy(() => import('./components/SchoolDialog'))

const EXAMPLES = ['Fairfax, VA', 'Reston, VA', 'Arlington, VA', 'Alexandria, VA']
const NARROW = '(max-width: 900px)'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function SchoolFinder() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  // URL params win over the last saved search, which wins over defaults.
  const [initial] = useState(() => {
    const url = parseUrlSearch(params)
    const last = loadLastSearch()
    return {
      fromUrl: Boolean(url),
      address: url?.address ?? last?.address ?? '',
      keywords:
        url?.keywords ??
        (last?.keywords?.length ? last.keywords : DEFAULT_KEYWORDS),
      radius: url?.radius ?? last?.radius ?? DEFAULT_RADIUS,
    }
  })

  const [address, setAddress] = useState(initial.address)
  const [keywords, setKeywords] = useState(initial.keywords)
  const [radius, setRadius] = useState(initial.radius)
  const [myCoords, setMyCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [formError, setFormError] = useState('')

  const finder = useFinderSearch()
  const { patchSchools } = finder
  const details = useSchoolDetails()

  const [sort, setSort] = useState('distance')
  const [hideSaved, setHideSaved] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [selected, setSelected] = useState(() => new Set())
  const [hoverId, setHoverId] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [savingIds, setSavingIds] = useState(() => new Set())
  const [mobileView, setMobileView] = useState('list')
  const [toast, setToast] = useState(null)
  const [adding, setAdding] = useState(null)
  const [team, setTeam] = useState([])
  const [assignTo, setAssignTo] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  // Route planning
  const [routeOpen, setRouteOpen] = useState(false)
  const [routeStops, setRouteStops] = useState([])
  const [routeStart, setRouteStart] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [routeOrder, setRouteOrder] = useState(null)

  const isAdmin = Boolean(user?.admin)

  useEffect(() => {
    if (!isAdmin) return undefined
    let active = true
    api
      .get('/api/crm/team')
      .then((rows) => {
        if (!active) return
        const list = Array.isArray(rows) ? rows : rows?.items || []
        setTeam(list.filter((member) => member?.id !== undefined))
      })
      .catch(() => {
        // Assign-to is optional; the select simply stays on "Me".
      })
    return () => {
      active = false
    }
  }, [isAdmin])

  // ---- derived data ------------------------------------------------------

  const mineIds = useMemo(() => {
    const ids = new Set()
    for (const school of finder.schools) {
      if (
        school.already_saved &&
        (school._mine || (user?.name && school.owner_name === user.name))
      )
        ids.add(school.place_id)
    }
    return ids
  }, [finder.schools, user?.name])

  const rows = useMemo(() => {
    const kept = finder.schools.filter(
      (s) =>
        !(hideSaved && s.already_saved) &&
        (minRating === 0 || (s.rating ?? 0) >= minRating),
    )
    return sortSchools(kept, sort)
  }, [finder.schools, hideSaved, minRating, sort])

  const ranks = useMemo(
    () => new Map(rows.map((s, i) => [s.place_id, i + 1])),
    [rows],
  )
  const newCount = useMemo(
    () => rows.filter((s) => !s.already_saved).length,
    [rows],
  )
  const selectedSchools = useMemo(
    () => rows.filter((s) => selected.has(s.place_id)),
    [rows, selected],
  )
  const saveable = useMemo(
    () => selectedSchools.filter((s) => !s.already_saved),
    [selectedSchools],
  )

  // ---- search ------------------------------------------------------------

  const runSearch = useCallback(
    (override = {}) => {
      const text = (override.address ?? address).trim()
      const kw = override.keywords ?? keywords
      const r = override.radius ?? radius
      const coords =
        override.coords !== undefined ? override.coords : myCoords
      if (!text && !coords) {
        setFormError('Enter an address, city or ZIP, or use your location.')
        return
      }
      if (!kw.length) {
        setFormError('Pick at least one keyword to search for.')
        return
      }
      setFormError('')
      const body = {
        address: text || MY_LOCATION_LABEL,
        keywords: kw,
        radius_km: r,
      }
      if (coords) {
        body.lat = coords.lat
        body.lng = coords.lng
      } else {
        saveLastSearch({ address: text, keywords: kw, radius: r })
      }
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (coords) {
            next.delete('q')
            next.delete('k')
            next.delete('r')
          } else {
            next.set('q', text)
            next.set('k', kw.join(','))
            next.set('r', String(r))
          }
          return next
        },
        { replace: true },
      )
      setSelected(new Set())
      setRouteOrder(null)
      setRouteStops([])
      setHoverId(null)
      setActiveId(null)
      setToast(null)
      setMobileView('list')
      finder.search(body)
    },
    // finder.search is stable; the rest are the form values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, keywords, radius, myCoords, setParams, finder.search],
  )

  const autoRan = useRef(false)
  useEffect(() => {
    if (autoRan.current || !initial.fromUrl) return
    autoRan.current = true
    runSearch()
    // Run once on mount for shared links.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAddress(value) {
    setAddress(value)
    if (myCoords) setMyCoords(null)
    if (formError) setFormError('')
  }

  function locate() {
    if (!navigator.geolocation) {
      setFormError('Location is not available in this browser.')
      return
    }
    setLocating(true)
    setFormError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setLocating(false)
        setMyCoords(coords)
        setAddress(MY_LOCATION_LABEL)
        runSearch({ address: MY_LOCATION_LABEL, coords })
      },
      (err) => {
        setLocating(false)
        setFormError(
          err.code === 1
            ? 'Location permission was denied. Type an address instead.'
            : 'Could not read your location. Type an address instead.',
        )
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  function widenRadius() {
    setRadius(20)
    runSearch({ radius: 20 })
  }

  // ---- list <-> map sync -------------------------------------------------

  const toggle = useCallback((id) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const focusPin = useCallback((id) => {
    setActiveId(id)
    if (window.matchMedia(NARROW).matches) setMobileView('map')
  }, [])

  const selectFromMap = useCallback((id) => {
    setActiveId(id)
    document.getElementById(`fd-row-${id}`)?.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [])

  function selectAllNew() {
    setSelected((current) => {
      const next = new Set(current)
      rows.forEach((s) => {
        if (!s.already_saved) next.add(s.place_id)
      })
      return next
    })
  }

  function clearFilters() {
    setHideSaved(false)
    setMinRating(0)
  }

  // ---- saving ------------------------------------------------------------

  const saveSchools = async (list, assignee) => {
    if (!list.length) return
    const ids = list.map((s) => s.place_id)
    const nameById = new Map(list.map((s) => [s.place_id, s.school_name]))
    setSavingIds((cur) => new Set([...cur, ...ids]))
    if (list.length > 1) setBulkSaving(true)
    const payload = list.map((s) => {
      const d = details.get(s.place_id) || {}
      const item = {
        place_id: s.place_id,
        school_name: s.school_name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        school_type: guessSchoolType(s),
      }
      if (d.phone) item.phone = d.phone
      if (d.website) item.website = d.website
      return item
    })
    const body = { schools: payload }
    const member = assignee
      ? team.find((m) => String(m.id) === String(assignee))
      : null
    if (member) body.assign_to = member.id
    try {
      const result = await api.post('/api/find-schools/save-batch', body)
      const created = result?.created || []
      const skipped = result?.skipped || []
      const owner = member?.name || user?.name || 'You'
      const patches = {}
      for (const item of created) {
        patches[item.place_id] = {
          already_saved: true,
          saved_school_id: item.id,
          owner_name: owner,
          _mine: !member || member.id === user?.id,
        }
      }
      patchSchools(patches)
      setSelected((cur) => {
        const next = new Set(cur)
        created.forEach((item) => next.delete(item.place_id))
        return next
      })
      setToast({
        created: created.map((item) => ({
          ...item,
          name: nameById.get(item.place_id),
        })),
        skipped: skipped.map((item) => ({
          place_id: item.place_id,
          name: nameById.get(item.place_id) || item.place_id,
          reason: humanizeReason(item.reason),
        })),
        assignee: member && member.id !== user?.id ? member.name : '',
      })
    } catch (err) {
      setToast({
        created: [],
        skipped: [],
        error: err?.message || 'Something went wrong while saving.',
        retry: () => saveRef.current(list, assignee),
      })
    } finally {
      setSavingIds((cur) => {
        const next = new Set(cur)
        ids.forEach((id) => next.delete(id))
        return next
      })
      setBulkSaving(false)
    }
  }
  const saveRef = useRef(saveSchools)
  useEffect(() => {
    saveRef.current = saveSchools
  })
  const saveOne = useCallback((school) => saveRef.current([school]), [])
  const editOne = useCallback((school) => setAdding(school), [])
  const dismissToast = useCallback(() => setToast(null), [])

  function handleDialogSaved(school, created) {
    patchSchools({
      [school.place_id]: {
        already_saved: true,
        saved_school_id: created.id,
        owner_name: user?.name,
        _mine: true,
      },
    })
    setToast({
      created: [{ place_id: school.place_id, id: created.id, name: school.school_name }],
      skipped: [],
    })
  }

  // ---- route planning ----------------------------------------------------

  function openRoute() {
    const sameSet =
      routeOrder &&
      routeStops.length === selectedSchools.length &&
      selectedSchools.every((s) => routeStops.some((r) => r.place_id === s.place_id))
    if (!sameSet) {
      setRouteStops(selectedSchools)
      setRouteOrder(null)
      setRouteError('')
    }
    if (!routeStart) {
      setRouteStart(
        myCoords ? MY_LOCATION_LABEL : address.trim() === MY_LOCATION_LABEL ? '' : address.trim(),
      )
    }
    setRouteOpen(true)
  }

  const startForApi =
    routeStart === MY_LOCATION_LABEL && myCoords
      ? `${myCoords.lat},${myCoords.lng}`
      : routeStart.trim()
  const startCoords =
    routeStart === MY_LOCATION_LABEL
      ? myCoords
      : finder.location && routeStart.trim() === address.trim()
        ? { lat: Number(finder.location.lat), lng: Number(finder.location.lng) }
        : null

  async function planRoute() {
    if (routeStops.length < 2 || !startForApi) return
    setRouteLoading(true)
    setRouteError('')
    try {
      const body = { schools: routeStops, start_address: startForApi }
      if (startCoords) {
        body.start_lat = startCoords.lat
        body.start_lng = startCoords.lng
      }
      const data = await api.post('/api/route-plan', body)
      setRouteOrder(data?.route?.length ? data.route : null)
      if (!data?.route?.length) setRouteError('The planner returned no stops.')
    } catch (err) {
      setRouteError(err?.message || 'Could not create a route.')
      setRouteOrder(null)
    } finally {
      setRouteLoading(false)
    }
  }

  // ---- render ------------------------------------------------------------

  const { status } = finder
  const showMap =
    status === 'loading' || (status === 'done' && finder.schools.length > 0)
  const center = finder.location
    ? { lat: Number(finder.location.lat), lng: Number(finder.location.lng) }
    : null

  return (
    <AppLayout
      title="Discover schools"
      subtitle="Search an area, save promising leads, and plan the visit."
    >
      <div className="fd-page">
        <SearchCard
          address={address}
          onAddress={handleAddress}
          keywords={keywords}
          onKeywords={setKeywords}
          radius={radius}
          onRadius={setRadius}
          onSubmit={() => runSearch()}
          onLocate={locate}
          locating={locating}
          busy={status === 'loading'}
          error={formError}
        />

        {status === 'idle' ? (
          <div className="fd-state is-idle">
            <span className="fd-state-icon">
              <Glyph name="pin" size={20} />
            </span>
            <h2>Find schools near any address</h2>
            <p>
              Search by address, city or ZIP, or tap Use my location while you
              are in the field. Results show who already owns each school so
              nobody gets poached.
            </p>
            <div className="fd-chips fd-examples">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="fd-chip"
                  onClick={() => {
                    setAddress(example)
                    setMyCoords(null)
                    runSearch({ address: example, coords: null })
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`fd-results${showMap ? '' : ' is-single'}`}
            data-view={mobileView}
          >
            <section className="fd-pane-list" aria-label="Search results">
              <ResultsPane
                status={status}
                error={finder.error}
                onRetry={() => runSearch()}
                location={finder.location}
                radius={finder.radius ?? radius}
                rows={rows}
                loadedCount={finder.schools.length}
                newCount={newCount}
                ranks={ranks}
                mineIds={mineIds}
                selectedIds={selected}
                savingIds={savingIds}
                hoverId={hoverId}
                activeId={activeId}
                details={details}
                sort={sort}
                onSort={setSort}
                hideSaved={hideSaved}
                onHideSaved={setHideSaved}
                minRating={minRating}
                onMinRating={setMinRating}
                onClearFilters={clearFilters}
                onSelectAllNew={selectAllNew}
                hasMore={Boolean(finder.nextToken)}
                loadingMore={finder.loadingMore}
                moreError={finder.moreError}
                onLoadMore={finder.loadMore}
                onWidenRadius={widenRadius}
                onToggle={toggle}
                onHover={setHoverId}
                onFocusPin={focusPin}
                onSave={saveOne}
                onEdit={editOne}
                view={mobileView}
                onView={setMobileView}
              />
            </section>

            {showMap && (
              <aside className="fd-pane-map" aria-label="Results map">
                <div className={`fd-map-sticky${status === 'loading' ? ' is-loading' : ''}`}>
                  <Suspense fallback={<div className="fd-map-skel fd-skel" />}>
                    <FinderMap
                      center={center}
                      radiusKm={finder.radius ?? radius}
                      schools={rows}
                      ranks={ranks}
                      mineIds={mineIds}
                      selectedIds={selected}
                      hoverId={hoverId}
                      activeId={activeId}
                      routeIds={routeOrder}
                      fitKey={finder.searchId}
                      onHover={setHoverId}
                      onSelect={selectFromMap}
                    />
                  </Suspense>
                </div>
              </aside>
            )}
          </div>
        )}

        <BulkBar
          selectedCount={selected.size}
          saveCount={saveable.length}
          newCount={newCount}
          isAdmin={isAdmin}
          team={team}
          assignTo={assignTo}
          onAssignTo={setAssignTo}
          saving={bulkSaving}
          hasRoute={Boolean(routeOrder)}
          onClear={() => setSelected(new Set())}
          onSelectAllNew={selectAllNew}
          onSave={() => saveSchools(saveable, assignTo)}
          onPlanRoute={openRoute}
          onViewRoute={() => setRouteOpen(true)}
        />

        <SaveToast
          result={toast}
          onDismiss={dismissToast}
          lifted={selected.size > 0}
        />
      </div>

      {routeOpen && (
        <RoutePanel
          stops={routeStops}
          startText={routeStart}
          onStartText={setRouteStart}
          startCoords={startCoords}
          loading={routeLoading}
          error={routeError}
          order={routeOrder}
          onPlan={planRoute}
          onClose={() => setRouteOpen(false)}
        />
      )}

      {adding && (
        <Suspense fallback={null}>
          <SchoolDialog
            initial={{
              name: adding.school_name,
              address: adding.address,
              phone: details.get(adding.place_id)?.phone || '',
              contact: '',
            }}
            onClose={() => setAdding(null)}
            onSaved={(created) => handleDialogSaved(adding, created)}
          />
        </Suspense>
      )}
    </AppLayout>
  )
}
