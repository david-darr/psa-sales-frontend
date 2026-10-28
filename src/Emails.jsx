import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Card from './components/Card'
import EmptyState from './components/EmptyState'
import useEmailCenter from './emails/useEmailCenter'
import AddSchoolsCard from './emails/AddSchoolsCard'
import ReplyChainModal from './emails/ReplyChainModal'
import CustomReplyModal from './emails/CustomReplyModal'
import { BATCH_ACTIVE, EMPTY_CUSTOM_REPLY, KINDS } from './emails/constants'
import { useBatchList, useLimits, useRecipients } from './emails/useOutreach'
import ComposeFlow from './components/outreach/ComposeFlow'
import HistoryTab from './components/outreach/HistoryTab'
import InboxTab from './components/outreach/InboxTab'
import { LimitMeter, MailboxCallout } from './components/outreach/bits'
import './styles/outreach.css'

const TABS = [
  ['compose', 'Compose'],
  ['followups', 'Follow-ups'],
  ['inbox', 'Inbox'],
  ['history', 'History'],
  ['add', 'Add and import'],
]

const parseIds = (search) => {
  const params = new URLSearchParams(search)
  const raw = params.get('school_ids') || params.get('school') || ''
  const ids = raw
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
  return ids.length ? ids : null
}

export default function Emails() {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const center = useEmailCenter({ accessToken, user })
  const limits = useLimits()
  const [rev, setRev] = useState(0)
  const [batchId, setBatchId] = useState(null)
  const [composeKind, setComposeKind] = useState('initial')
  const [replyChain, setReplyChain] = useState(null)
  const [customReply, setCustomReply] = useState(null)
  const [sending, setSending] = useState(false)

  const requested = new URLSearchParams(location.search).get('tab')
  const tab = TABS.some(([id]) => id === requested) ? requested : 'compose'
  const preselect = useMemo(() => parseIds(location.search), [location.search])
  const setTab = (id) => navigate({ search: id === 'compose' ? '' : `?tab=${id}` }, { replace: true })

  const due = useRecipients({ kind: 'followup', page: 1, perPage: 1, rev })
  const recent = useBatchList(5, rev)
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current || recent.loading) return
    resumed.current = true
    const live = recent.items.find((item) => BATCH_ACTIVE.includes(item.status))
    if (live) setBatchId(live.id)
  }, [recent])

  const changed = () => {
    setRev((n) => n + 1)
    center.loadSentEmails()
  }

  const unread = center.responded.filter((email) => email.reply_unread).length

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
    const { chain, email } = replyChain || {}
    if (!email?.is_mine) return
    setCustomReply({
      ...EMPTY_CUSTOM_REPLY,
      email_id: email.id,
      school_email: chain?.school_email || email.school_email,
      school_name: chain?.school_name || email.school_name,
      subject: 'Re: PSA Programs',
    })
    setReplyChain(null)
  }

  const submitCustomReply = async () => {
    setSending(true)
    const ok = await center.sendCustomReply(customReply)
    setSending(false)
    if (ok) setCustomReply(null)
  }

  if (!user) {
    return (
      <AppLayout title="Outreach" subtitle="Reach more schools with less typing">
        <Card>
          <EmptyState
            icon="🔐"
            title="Authentication Required"
            message="Please log in to send outreach and manage replies."
            action={
              <button className="modern-btn-primary" onClick={() => navigate('/account')}>
                Login to Continue
              </button>
            }
          />
        </Card>
      </AppLayout>
    )
  }

  const flowProps = {
    limits,
    mailSync: center.mailSync,
    syncing: center.syncing,
    onCheckReplies: center.checkReplies,
    batchId,
    onBatch: setBatchId,
    onChanged: changed,
  }

  return (
    <AppLayout
      title="Outreach"
      subtitle="Pick schools, write once, send in one batch."
      actions={
        <button className="ou-btn ou-btn-ghost" onClick={() => { center.reload(); limits.reload(); changed() }} disabled={center.loading}>
          Refresh
        </button>
      }
    >
      <div className="ou-page">
        {center.status && (
          <div
            className={`ou-callout tone-${center.status.tone === 'info' ? 'neutral' : center.status.tone}`}
            role={center.status.tone === 'danger' ? 'alert' : 'status'}
          >
            {center.status.text}
          </div>
        )}

        <LimitMeter limits={limits.limits} error={limits.error} />
        <MailboxCallout limits={limits.limits} />

        <nav className="ou-tabs" aria-label="Outreach views">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`ou-tab${tab === id ? ' is-active' : ''}`}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              {label}
              {id === 'followups' && due.total > 0 && <span className="ou-count is-alert">{due.total}</span>}
              {id === 'inbox' && unread > 0 && <span className="ou-count is-alert">{unread}</span>}
            </button>
          ))}
        </nav>

        {tab === 'compose' && (
          <>
            {!batchId && (
              <div className="ou-seg" role="group" aria-label="Message type" style={{ alignSelf: 'flex-start' }}>
                {['initial', 'custom'].map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={composeKind === id ? 'is-active' : ''}
                    onClick={() => setComposeKind(id)}
                  >
                    {KINDS[id].label}
                  </button>
                ))}
              </div>
            )}
            <ComposeFlow key={composeKind} kind={composeKind} preselect={preselect} {...flowProps} />
          </>
        )}

        {tab === 'followups' && <ComposeFlow key="followup" kind="followup" {...flowProps} />}

        {tab === 'inbox' && (
          <InboxTab
            emails={center.responded}
            onOpen={openReplyChain}
            onCheckReplies={center.checkReplies}
            syncing={center.syncing}
            mailConnected={user.mail_connected === true}
          />
        )}

        {tab === 'history' && <HistoryTab emails={center.sentEmails} rev={rev} />}

        {tab === 'add' && <AddSchoolsCard onAddSchool={center.addSchool} onUploadCsv={center.uploadCsv} />}
      </div>

      {replyChain && (
        <ReplyChainModal
          chain={replyChain.chain}
          loading={replyChain.loading}
          onClose={() => setReplyChain(null)}
          onReply={replyFromChain}
          canReply={replyChain.email?.is_mine === true}
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
