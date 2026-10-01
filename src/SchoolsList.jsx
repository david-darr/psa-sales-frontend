import { useCallback, useEffect, useRef, useState } from 'react'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import StatCard from './components/StatCard'
import DataTable from './components/DataTable'
import EmptyState from './components/EmptyState'
import api from './lib/api'

export default function SchoolsList() {
  const [schools, setSchools] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const rowRefs = useRef({})

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/api/schools')
      setSchools(Array.isArray(data) ? data : [])
    } catch (err) {
      // Previously this was only console.error'd, so a failed load was
      // indistinguishable from an empty database.
      setError(err.message || 'Could not load the school directory.')
      setSchools([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  const term = search.trim().toLowerCase()
  const filteredSchools = term
    ? schools.filter((school) =>
        [school.name, school.address, school.contact, school.email].some((field) =>
          (field || '').toLowerCase().includes(term),
        ),
      )
    : schools

  function handleSearchKeyDown(event) {
    if (event.key !== 'Enter') return
    const match = schools.find((s) => (s.name || '').toLowerCase() === term)
    if (match && rowRefs.current[match.id]) {
      rowRefs.current[match.id].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'School Name',
      render: (school) => <div className="ui-cell-strong">{school.name}</div>,
    },
    { key: 'address', header: 'Address' },
    { key: 'phone', header: 'Phone', className: 'ui-cell-mono' },
    { key: 'contact', header: 'Contact' },
    {
      key: 'email',
      header: 'Email',
      className: 'ui-cell-email',
      render: (school) => <a href={`mailto:${school.email}`}>{school.email}</a>,
    },
  ]

  const refreshButton = (
    <button className="modern-btn-primary" onClick={fetchSchools} disabled={loading}>
      {loading ? '🔄 Loading...' : '🔄 Refresh'}
    </button>
  )

  return (
    <AppLayout
      title="SCHOOLS DATABASE"
      subtitle="Complete Directory of Schools & Contact Information"
      actions={refreshButton}
    >
      <div className="ui-stat-grid">
        <StatCard label="Total Schools" icon="🏫" value={schools.length} caption="Schools" />
        <StatCard
          label="Search Results"
          icon="🔍"
          tone="success"
          value={filteredSchools.length}
          caption="Found"
        />
        <StatCard
          label="Database"
          icon={loading ? '⏳' : error ? '⚠️' : '✅'}
          tone={loading ? 'warning' : error ? 'danger' : 'success'}
          value={loading ? 'Loading...' : error ? 'Unavailable' : 'Connected'}
          caption="Status"
        />
      </div>

      <Card title="Schools Directory" icon="📋">
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <input
            type="search"
            className="ui-input"
            placeholder="Search by name, address, contact, or email. Press Enter to jump to an exact match."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search schools"
          />
          <div className="ui-field-note">
            <span>
              {search
                ? `Showing ${filteredSchools.length} of ${schools.length} schools`
                : `${schools.length} schools total`}
            </span>
            {search && (
              <button className="ui-link-button" onClick={() => setSearch('')}>
                Clear search
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <EmptyState
            icon="⏳"
            title="Loading Schools..."
            message="Fetching the latest school directory data."
          />
        ) : error ? (
          <EmptyState
            icon="⚠️"
            title="Could Not Load Schools"
            message={error}
            action={
              <button className="modern-btn-primary" onClick={fetchSchools}>
                Try Again
              </button>
            }
          />
        ) : filteredSchools.length === 0 ? (
          <EmptyState
            icon={search ? '🔍' : '📚'}
            title={search ? 'No Schools Found' : 'No Schools Available'}
            message={
              search
                ? `No schools match your search for "${search}".`
                : 'The school database appears to be empty.'
            }
            action={
              search ? (
                <button className="modern-btn-primary" onClick={() => setSearch('')}>
                  Clear Search
                </button>
              ) : (
                <button className="modern-btn-primary" onClick={fetchSchools}>
                  🔄 Refresh Database
                </button>
              )
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filteredSchools}
            rowKey={(school) => school.id}
            rowRef={(school, el) => {
              rowRefs.current[school.id] = el
            }}
          />
        )}
      </Card>
    </AppLayout>
  )
}
