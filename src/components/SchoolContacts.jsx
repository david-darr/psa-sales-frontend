import { salesText } from '../lib/salesWorkspace'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useResource } from '../lib/crm'
import api from '../lib/api'
import Modal from './Modal'
import { Empty, ErrorNotice, Panel } from './WorkspaceUI'
import ContactReport from './ContactReport'
import { salesWorkspace, salesRecordPath } from '../lib/salesWorkspace'

const CONTACT_ROLES = { unknown: 'Not classified', principal_ap: 'Principal / AP', pta_pto: 'PTA / PTO', enrichment: 'Enrichment / ASEP', other_staff: 'Other staff' }

function ContactEditor({ schoolId, contact, onClose, onSaved }) {
  const { user } = useAuth()
  const [draft, setDraft] = useState({ email: contact?.email || '', name: contact?.name || '',
    roles: contact?.roles || ['unknown'], tags: (contact?.tags || []).join('; '),
    is_primary: contact?.is_primary || false, do_not_contact: contact?.do_not_contact || false,
    suppression_reason: contact?.suppression_reason || '', school_do_not_contact:contact?.school_do_not_contact || false, school_suppression_reason:contact?.school_suppression_reason || '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (field, value) => setDraft((old) => ({ ...old, [field]: value }))
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    const body = { name: draft.name, roles: draft.roles.length ? draft.roles : ['unknown'], tags: draft.tags.split(';').map((value) => value.trim()).filter(Boolean), do_not_contact: draft.do_not_contact, suppression_reason: draft.suppression_reason, school_do_not_contact:draft.school_do_not_contact, school_suppression_reason:draft.school_suppression_reason }
    if (draft.is_primary) body.is_primary = true
    try {
      if (contact) await api.patch(`/api/sales-schools/${schoolId}/contacts/${contact.id}`, {
        ...body, do_not_contact: draft.do_not_contact, suppression_reason: draft.suppression_reason,
        version: contact.version, contact_version: contact.contact_version,
      })
      else await api.post(`/api/sales-schools/${schoolId}/contacts`, { ...body, email: draft.email })
      onSaved(); onClose()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <Modal title={contact ? salesText("Edit school contact") : salesText("Add school contact")} onClose={onClose}
    footer={<><button className="modern-btn-primary is-neutral" onClick={onClose} disabled={busy}>Cancel</button><button className="modern-btn-primary" type="submit" form="contact-form" disabled={busy}>{busy ? 'Saving...' : 'Save contact'}</button></>}>
    <form id="contact-form" className="workspace-form" onSubmit={save}>
      <ErrorNotice error={error} />
      <label className="workspace-field">Email<input className="ui-input" type="email" required disabled={Boolean(contact)} value={draft.email} onChange={(e) => set('email', e.target.value)} /></label>
      <label className="workspace-field">Contact name<input className="ui-input" maxLength={150} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Optional; leave blank if unknown" /></label>
      <fieldset className="workspace-field"><legend>{salesText("Roles at this school")}</legend>{Object.entries(salesWorkspace() === 'business' ? { unknown: 'Not classified', decision_maker: 'Decision maker / owner', marketing: 'Marketing', community_relations: 'Community relations', other_staff: 'Other staff' } : CONTACT_ROLES).map(([role, label]) => <label key={role} style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={draft.roles.includes(role)} onChange={(e) => set('roles', e.target.checked ? (role === 'unknown' ? ['unknown'] : [...draft.roles.filter((value) => value !== 'unknown'), role]) : draft.roles.filter((value) => value !== role))} />{label}</label>)}</fieldset>
      <label className="workspace-field">Audience tags<input className="ui-input" value={draft.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Separate with semicolons, e.g. trunk_or_treat" /></label>
      <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={draft.is_primary} disabled={contact?.is_primary} onChange={(e) => set('is_primary', e.target.checked)} />{salesText("Primary school email")}</label>
      <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={draft.do_not_contact} disabled={contact?.do_not_contact && !user?.admin} onChange={(e) => set('do_not_contact', e.target.checked)} />{"Stop all outreach to this address in School Sales and Business Sales"}</label>
      <label className="workspace-field">Reason for stopping this email everywhere<input className="ui-input" maxLength={500} required={draft.do_not_contact !== (contact?.do_not_contact || false)} value={draft.suppression_reason} onChange={(e) => set('suppression_reason', e.target.value)} /></label>
      <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={draft.school_do_not_contact} onChange={(e) => set('school_do_not_contact',e.target.checked)} />{salesText("Stop outreach for this school only")}</label>
      <label className="workspace-field">{salesText("Reason for this school")}<input className="ui-input" maxLength={500} required={draft.school_do_not_contact !== Boolean(contact?.school_do_not_contact)} value={draft.school_suppression_reason} onChange={(e)=>set('school_suppression_reason',e.target.value)} /></label>
      <p className="workspace-subtle">{salesText("A school-only stop does not block this contact at other schools. An opt-out or complaint blocks the email everywhere; only an admin can clear that global stop. Adding or editing a contact never sends mail.")}</p>
    </form>
  </Modal>
}

export default function SchoolContacts({ schoolId, onChanged }) {
  const { data, error, loading, reload } = useResource(`/api/sales-schools/${schoolId}/contacts`)
  const [editing, setEditing] = useState(null)
  const [reporting, setReporting] = useState(null)
  return <Panel title="Contacts and roles">
    <ErrorNotice error={error} />
    <p className="workspace-subtle">{salesWorkspace() === 'business' ? 'Keep decision makers, marketing and community contacts separate.' : 'Keep principals, PTAs and enrichment contacts separate.'}{salesText(" Outreach resolves these contacts by audience, sends separately to each mailbox, and asks which school to use when a mailbox is shared.")}</p>
    <button className="modern-btn-primary is-small" onClick={() => setEditing('new')}>Add contact</button>
    {loading && <p>Loading contacts...</p>}
    {!loading && !error && !data?.contacts?.length && <Empty title="No contacts yet" text={salesText("Add a mailbox and classify its school role.")} />}
    <ul className="workspace-list">{(data?.contacts || []).map((contact) => <li className="workspace-list-item" key={contact.id} style={{ flexWrap: 'wrap', gap: 10 }}>
      <div className="grow" style={{ minWidth: 0 }}>
        <strong style={{ overflowWrap: 'anywhere' }}>{contact.email}</strong>{contact.is_primary && <span className="workspace-subtle"> · Primary</span>}
        <p>{contact.name || 'Name not recorded'} · {contact.roles.map((role) => CONTACT_ROLES[role] || role).join(', ')}</p>
        {contact.tags.length > 0 && <p className="workspace-subtle">Tags: {contact.tags.join(', ')}</p>}
        {contact.do_not_contact && <p style={{ color: 'var(--color-danger)' }}>{salesText("Stopped for every school: ")}{contact.suppression_reason}</p>}
        {contact.school_do_not_contact && <p style={{ color: 'var(--color-danger)' }}>{salesText("Stopped for this school: ")}{contact.school_suppression_reason}</p>}
        {contact.linked_school_count > 1 && <p className="workspace-subtle">Shared mailbox, {contact.linked_school_count}{salesText(" schools. ")}{(contact.shared_schools || []).filter((school) => school.id !== Number(schoolId)).map((school) => <Link key={school.id} to={salesRecordPath(school.id)} style={{ marginRight: 8 }}>{school.name}</Link>)}</p>}
      </div>
      <button className="ui-link-button" onClick={() => setEditing(contact)}>Edit</button>
      <button className="ui-link-button" onClick={() => setReporting(contact)}>Report stop / complaint</button>
    </li>)}</ul>
    {editing && <ContactEditor schoolId={schoolId} contact={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { reload(); onChanged?.() }} />}
    {reporting && <ContactReport contact={reporting} onClose={() => setReporting(null)} onSaved={() => { reload(); onChanged?.() }} />}
  </Panel>
}
