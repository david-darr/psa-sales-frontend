import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import DataTable from './components/DataTable'
import { Empty, ErrorNotice, Segmented } from './components/WorkspaceUI'
import { useResource } from './lib/crm'
import ProgramCommissions from './ProgramCommissions'
import './styles/portfolio.css'

const TABS = [
  { value: 'ownership', label: 'Ownership' },
  { value: 'commissions', label: 'Commissions' },
]

function Ownership() {
  const { data, loading, error } = useResource('/api/crm/portfolio')
  const reps = data?.reps || []
  if (error) return <ErrorNotice error={error} />
  if (!loading && !reps.length) return <Empty title="No reps yet" text="Share a sign-up link from Team to add reps." />
  return (
    <DataTable
      rowKey={(rep) => rep.id}
      rows={reps}
      columns={[
        {
          key: 'name',
          header: 'Rep',
          render: (rep) => (
            <span>
              <strong>{rep.name}</strong>
              {rep.admin && <span className="workspace-subtle"> · Admin</span>}
              <br />
              <span className="workspace-subtle">{rep.email}</span>
            </span>
          ),
        },
        { key: 'total', header: 'Schools owned', render: (rep) => rep.counts.total },
        { key: 'pipeline', header: 'In pipeline', render: (rep) => rep.counts.pipeline },
        { key: 'active', header: 'Active clients', render: (rep) => rep.counts.active },
        { key: 'former', header: 'Former clients', render: (rep) => rep.counts.former },
        { key: 'recent', header: 'Closed, last 90 days', render: (rep) => rep.closed_last_90 },
        {
          key: 'open',
          header: '',
          render: (rep) => (
            <span className="workspace-actions">
              <Link className="modern-btn-primary is-neutral is-small" to={`/schools?owner=${rep.id}`}>
                Schools
              </Link>
              <Link className="modern-btn-primary is-neutral is-small" to={`/map?owner=${rep.id}`}>
                Map
              </Link>
            </span>
          ),
        },
      ]}
    />
  )
}

export default function SalesAdmin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('ownership')
  if (user && !user.admin) return <Navigate to="/" replace />
  return (
    <AppLayout
      title="Sales admin"
      subtitle="Who owns what, what closed, and what each rep earned. Visible to administrators only."
      actions={<Segmented label="Sales admin view" value={tab} onChange={setTab} options={TABS} />}
    >
      {tab === 'ownership' ? <Ownership /> : <ProgramCommissions />}
    </AppLayout>
  )
}
