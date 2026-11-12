import { salesText } from '../lib/salesWorkspace'
import { salesWorkspace } from '../lib/salesWorkspace'
import { useState } from 'react'
import api from '../lib/api'
import FileUpload from './FileUpload'
import DataTable from './DataTable'
import { ErrorNotice } from './WorkspaceUI'

function downloadTemplate() {
  const csv = salesWorkspace() === 'business' ? 'business_name,email,contact_name,contact_role,address,county,school_type,stage,notes,audience_tags,do_not_contact\nExample Coffee,marketing@example.test,,marketing,1 Example St,Fairfax,business,pending,,,false\n' : 'school_name,email,contact_name,contact_role,address,county,school_type,stage,notes,audience_tags,do_not_contact\nExample Elementary,principal@example.test,,principal_ap,1 Example St,Fairfax,elementary,pending,,,false\nExample Elementary,pta@example.test,,pta_pto,1 Example St,Fairfax,elementary,pending,,trunk_or_treat,false\n'
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a'); link.href = url; link.download = salesWorkspace() === 'business' ? 'psa-business-contacts.csv' : salesText("psa-school-contacts.csv"); link.click(); URL.revokeObjectURL(url)
}

export default function ContactImport({ onImported }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [decisions, setDecisions] = useState({})
  const [skipInvalid, setSkipInvalid] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  async function read(event) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null)
    try {
      const form = new FormData(); form.append('file', file)
      const data = await api.upload('/api/contact-imports/preview', form)
      setPreview(data); setDecisions({}); setConfirmed(false); setSkipInvalid(false); setPage(0)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function commit() {
    setBusy(true); setError('')
    try {
      const data = await api.post(`/api/contact-imports/${preview.id}/commit`, { file_hash: preview.file_hash, decisions, skip_invalid: skipInvalid })
      setResult(data); setPreview(null); setConfirmed(false); onImported?.(data)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const unresolved = preview?.groups.filter((group) => (decisions[group.key]?.action || group.action) === 'conflict').length || 0
  return <div className="workspace-form">
    <p className="workspace-subtle">{salesText("One CSV row per school contact. Required: school_name and email. Optional: contact_name, contact_role, address, county, school_type, stage, notes, audience_tags, do_not_contact and suppression_reason. Roles: principal_ap, pta_pto, enrichment, other_staff, unknown. Multiple roles/tags use semicolons.")}</p>
    <p className="workspace-subtle">{salesText("Repeat the school name and address for each contact. Existing school owners, stages and notes are preserved. New schools default to pending. Shared PTA mailboxes can link to several schools without merging the schools. Nothing is emailed by an import.")}</p>
    <button type="button" className="ui-link-button" onClick={downloadTemplate}>Download contact CSV template</button>
    <form className="workspace-form" onSubmit={read}>
      <FileUpload label={salesText("School contact CSV")} hint="UTF-8 CSV, up to 2 MB and 2,000 rows. Preview before importing." accept=".csv,text/csv" buttonLabel="Choose CSV" busy={busy} onFileSelect={(file) => { setFile(file); setPreview(null); setResult(null); setError('') }} />
      <button className="modern-btn-primary" disabled={!file || busy}>{busy ? 'Working...' : 'Preview import'}</button>
    </form>
    <ErrorNotice error={error} />
    {preview && <>
      <h3>Review {preview.row_count} rows across {preview.groups.length}{salesText(" schools")}</h3>
      <p className="workspace-subtle">{salesText("No school/contact records have been changed. Review expires ")}{new Date(preview.expires_at).toLocaleTimeString()}{salesText(". A change to school/contact data requires a fresh preview.")}</p>
      {preview.errors.length > 0 && <div className="ui-alert tone-warning"><strong>{preview.errors.length} invalid rows</strong><ul>{preview.errors.map((row) => <li key={row.row_number}>Row {row.row_number}: {row.message}</li>)}</ul><label><input type="checkbox" checked={skipInvalid} onChange={(e) => { setSkipInvalid(e.target.checked); setConfirmed(false) }} /> Skip these invalid rows. Import only the reviewed valid rows.</label></div>}
      <DataTable rows={preview.groups.slice(page * 15, (page + 1) * 15)} rowKey={(row) => row.key} columns={[
        { key: salesText("school"), header: salesText("School"), render: (group) => <><strong>{group.school_name}</strong><p className="workspace-subtle">{group.address || 'No address'} · {group.county || 'No county'}</p>{group.warnings.map((warning) => <p key={warning} className="workspace-subtle">{warning}</p>)}</> },
        { key: 'contacts', header: 'Contacts', render: (group) => <details><summary>{group.rows.length} contact rows</summary>{group.rows.map((row) => <p key={row.row_number} style={{ overflowWrap: 'anywhere' }}>Row {row.row_number}: {row.email} · {row.roles.join(', ')}{row.do_not_contact ? ' · Do not contact' : ''}</p>)}</details> },
        { key: 'action', header: 'Action', render: (group) => <select className="ui-input" aria-label={`Import action for ${group.school_name}`} value={decisions[group.key]?.action === 'existing' ? `existing:${decisions[group.key].school_id}` : decisions[group.key]?.action || (group.action === 'existing' ? `existing:${group.school_id}` : group.action)} onChange={(e) => {
          const [action, id] = e.target.value.split(':'); setDecisions((old) => ({ ...old, [group.key]: { action, ...(id && { school_id: Number(id) }) } })); setConfirmed(false)
        }}><option value="conflict">Choose after reviewing matches</option><option value="new" disabled={group.action === 'existing'}>{salesText("Create a separate school")}</option>{group.candidates.filter((candidate) => candidate.editable).map((candidate) => <option key={candidate.id} value={`existing:${candidate.id}`}>Add contacts to {candidate.name}</option>)}<option value="skip">{salesText("Skip this school")}</option></select> },
      ]} />
      <div className="workspace-actions"><button className="modern-btn-primary is-neutral is-small" disabled={!page} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page + 1} / {Math.max(1, Math.ceil(preview.groups.length / 15))}</span><button className="modern-btn-primary is-neutral is-small" disabled={(page + 1) * 15 >= preview.groups.length} onClick={() => setPage((value) => value + 1)}>Next</button></div>
      {unresolved > 0 && <p role="status">Resolve {unresolved}{salesText(" possible school duplicates before importing. Correct the CSV when two groups represent the same new school.")}</p>}
      <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />{salesText("I reviewed the schools, contact roles, duplicate decisions and skipped rows.")}</label>
      <button className="modern-btn-primary" onClick={commit} disabled={busy || !confirmed || unresolved > 0 || (preview.errors.length > 0 && !skipInvalid)}>{busy ? 'Importing...' : 'Confirm reviewed import'}</button>
    </>}
    {result && <div className="ui-alert tone-success" role="status">Import complete: {result.schools_added}{salesText(" schools created, ")}{result.schools_updated}{salesText(" existing schools processed, ")}{result.contacts_added}{salesText(" school-contact links added, ")}{result.shared_contacts} shared mailbox links, {result.duplicates} existing/repeated contact rows, {result.rows_skipped} invalid rows skipped and {result.schools_skipped}{salesText(" schools skipped.")}</div>}
  </div>
}
