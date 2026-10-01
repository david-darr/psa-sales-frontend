import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import EmptyState from './components/EmptyState'
import useEmailCenter from './emails/useEmailCenter'
import AddSchoolsCard from './emails/AddSchoolsCard'
import SchoolsCard from './emails/SchoolsCard'
import EmailHistoryCard from './emails/EmailHistoryCard'
import RespondedCard from './emails/RespondedCard'
import ReplyChainModal from './emails/ReplyChainModal'
import CustomEmailModal from './emails/CustomEmailModal'
import CustomReplyModal from './emails/CustomReplyModal'
import { EMPTY_CUSTOM_EMAIL, EMPTY_CUSTOM_REPLY } from './emails/constants'

/**
 * Email Center.
 *
 * Was a single 3,128-line component with 29 useState hooks and every dialog
 * inlined. Server data and mutations now live in useEmailCenter; each card and
 * dialog is its own component; this file wires them together and owns only the
 * dialog/selection state that spans more than one card.
 */
export default function Emails() {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const center = useEmailCenter({ accessToken, user })

  // Selections live here because the action buttons and the tables that drive
  // them sit in different cards.
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([])
  const [selectedEmailIds, setSelectedEmailIds] = useState([])

  // Dialogs
  const [replyChain, setReplyChain] = useState(null) // {email, chain, loading} | null
  const [customEmail, setCustomEmail] = useState(null) // draft | null
  const [customReply, setCustomReply] = useState(null) // draft | null
  const [sending, setSending] = useState(false)

  /* ---------------- Reply chain ---------------- */

  const openReplyChain = async (email) => {
    setReplyChain({ email, chain: null, loading: true })
    try {
      const chain = await center.loadReplyChain(email.id)
      setReplyChain({ email, chain, loading: false })
    } catch (err) {
      setReplyChain({
        email,
        chain: { error: err.message || 'Could not load the reply chain.' },
        loading: false,
      })
    }
  }

  const replyFromChain = () => {
    const chain = replyChain?.chain
    const email = replyChain?.email
    if (!email) return
    setCustomReply({
      ...EMPTY_CUSTOM_REPLY,
      email_id: email.id,
      school_email: chain?.school_email || email.school_email,
      school_name: chain?.school_name || email.school_name,
      subject: 'Re: PSA Programs',
    })
    setReplyChain(null)
  }

  /* ---------------- Composers ---------------- */

  const composeForSchool = (school) =>
    setCustomEmail({
      ...EMPTY_CUSTOM_EMAIL,
      school_id: school.id,
      school_name: school.school_name,
      school_email: school.email,
      all_emails: school.all_emails || [school.email],
    })

  const composeForSelection = (ids) =>
    setCustomEmail({
      ...EMPTY_CUSTOM_EMAIL,
      school_ids: [...ids],
      school_name: `${ids.length} Selected School${ids.length === 1 ? '' : 's'}`,
    })

  const composeReplyTo = (email) =>
    setCustomReply({
      ...EMPTY_CUSTOM_REPLY,
      email_id: email.id,
      school_email: email.school_email,
      school_name: email.school_name,
      subject: 'Re: PSA Programs',
    })

  const submitCustomEmail = async () => {
    setSending(true)
    const ok = await center.sendCustomEmail(customEmail)
    setSending(false)
    if (ok) {
      setCustomEmail(null)
      // A bulk send consumes the selection; clear it so the next action does
      // not silently reuse schools that were already contacted.
      if (customEmail.school_ids.length > 0) setSelectedSchoolIds([])
    }
  }

  const submitCustomReply = async () => {
    setSending(true)
    const ok = await center.sendCustomReply(customReply)
    setSending(false)
    if (ok) setCustomReply(null)
  }

  /* ---------------- Bulk actions ---------------- */

  const deleteSelectedSchools = async () => {
    if (
      !window.confirm(
        `Delete ${selectedSchoolIds.length} school${selectedSchoolIds.length === 1 ? '' : 's'}? This cannot be undone.`,
      )
    )
      return
    await center.deleteSchools(selectedSchoolIds)
    setSelectedSchoolIds([])
  }

  const deleteSelectedEmails = async () => {
    if (
      !window.confirm(
        `Delete ${selectedEmailIds.length} email record${selectedEmailIds.length === 1 ? '' : 's'}?`,
      )
    )
      return
    await center.deleteSentEmails(selectedEmailIds)
    setSelectedEmailIds([])
  }

  const sendTemplate = async ({ selectedIds, sendToAllEmails }) => {
    const addresses = center.countOutgoing(selectedIds, sendToAllEmails)
    if (
      !window.confirm(
        `Send the template email to ${addresses} address${addresses === 1 ? '' : 'es'} across ${selectedIds.length} school${selectedIds.length === 1 ? '' : 's'}?`,
      )
    )
      return
    await center.sendTemplateEmails({ selectedIds, sendToAllEmails })
    setSelectedSchoolIds([])
  }

  const massFollowup = async () => {
    if (!window.confirm(`Send follow-up emails to ${center.emailCounts.pending} pending school(s)?`))
      return
    await center.sendMassFollowup()
  }

  const unmarkResponded = async (email) => {
    if (!window.confirm(`Mark ${email.school_name} as no longer responded?`)) return
    await center.setResponded(email.id, false)
  }

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email.school_email)
      center.notify('success', `Copied ${email.school_name}'s email to the clipboard.`)
    } catch {
      center.notify('danger', 'Could not copy to the clipboard.')
    }
  }

  /* ---------------- Render ---------------- */

  if (!user) {
    return (
      <AppLayout title="EMAIL CENTER" subtitle="Manage School Communications">
        <Card>
          <EmptyState
            icon="🔐"
            title="Authentication Required"
            message="Please log in to access the Email Center and manage your school communications."
            action={
              <button className="modern-btn-primary" onClick={() => navigate('/account')}>
                🔐 Login to Continue
              </button>
            }
          />
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="EMAIL CENTER"
      subtitle="Manage School Communications & Email Campaigns"
      actions={
        <button
          className="modern-btn-primary is-neutral"
          onClick={center.reload}
          disabled={center.loading}
        >
          🔄 Refresh
        </button>
      }
    >
      {center.status && (
        <div
          className={`ui-alert is-centered tone-${center.status.tone}`}
          role={center.status.tone === 'danger' ? 'alert' : 'status'}
          style={{ marginBottom: 'var(--space-6)' }}
        >
          {center.status.text}
        </div>
      )}

      <AddSchoolsCard onAddSchool={center.addSchool} onUploadCsv={center.uploadCsv} />

      <SchoolsCard
        schools={center.schools}
        counts={center.schoolCounts}
        isAdmin={center.isAdmin}
        loading={center.loading}
        filterSchools={center.filterSchools}
        countOutgoing={center.countOutgoing}
        selectedIds={selectedSchoolIds}
        onSelectionChange={setSelectedSchoolIds}
        onDeleteSelected={deleteSelectedSchools}
        onSendTemplate={sendTemplate}
        onComposeSingle={composeForSchool}
        onComposeBulk={composeForSelection}
      />

      <EmailHistoryCard
        sentEmails={center.sentEmails}
        counts={center.emailCounts}
        isAdmin={center.isAdmin}
        loading={center.loading}
        filterEmails={center.filterEmails}
        selectedIds={selectedEmailIds}
        onSelectionChange={setSelectedEmailIds}
        onDeleteSelected={deleteSelectedEmails}
        onMassFollowup={massFollowup}
        onCheckReplies={center.checkReplies}
      />

      <RespondedCard
        sentEmails={center.sentEmails}
        isAdmin={center.isAdmin}
        onViewReply={openReplyChain}
        onCompose={composeReplyTo}
        onUnmark={unmarkResponded}
        onCopyEmail={copyEmail}
      />

      {replyChain && (
        <ReplyChainModal
          chain={replyChain.chain}
          loading={replyChain.loading}
          onClose={() => setReplyChain(null)}
          onReply={replyFromChain}
        />
      )}

      {customEmail && (
        <CustomEmailModal
          draft={customEmail}
          onChange={setCustomEmail}
          onSubmit={submitCustomEmail}
          onClose={() => setCustomEmail(null)}
          sending={sending}
        />
      )}

      {customReply && (
        <CustomReplyModal
          draft={customReply}
          onChange={setCustomReply}
          onSubmit={submitCustomReply}
          onClose={() => setCustomReply(null)}
          sending={sending}
        />
      )}
    </AppLayout>
  )
}
