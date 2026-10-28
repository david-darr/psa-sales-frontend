import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'

/**
 * Account-level data for the Outreach page: sent emails (history and replies),
 * mailbox sync state, and the actions that mutate them. Batch sending lives in
 * useOutreach.js; this keeps the older endpoints (add school, CSV import, reply
 * threads, delete records) working.
 */
export function useEmailCenter({ accessToken, user }) {
  const [sentEmails, setSentEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [mailSync, setMailSync] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const autoSyncToken = useRef(null)

  const notify = useCallback((tone, text) => setStatus({ tone, text }), [])
  const clearStatus = useCallback(() => setStatus(null), [])

  // Restart the dismiss timer whenever a new notice replaces an old one.
  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(null), 6000)
    return () => clearTimeout(timer)
  }, [status])

  /* ---------------- Loading ---------------- */

  const loadSentEmails = useCallback(async () => {
    try {
      const data = await api.get('/api/sent-emails?scope=mine')
      setSentEmails(Array.isArray(data) ? data : [])
    } catch (err) {
      notify('danger', err.message || 'Could not load sent emails.')
    }
  }, [notify])

  const loadMailSync = useCallback(async () => {
    try {
      setMailSync(await api.get('/api/mail-sync-status'))
    } catch (err) {
      setMailSync({
        ready: false,
        error: err.message || 'Could not check mailbox status.',
      })
    }
  }, [])

  const reload = useCallback(
    () => Promise.all([loadSentEmails(), loadMailSync()]),
    [loadSentEmails, loadMailSync],
  )

  useEffect(() => {
    if (accessToken) reload()
  }, [accessToken, reload])

  const responded = useMemo(
    () => sentEmails.filter((email) => email.responded),
    [sentEmails],
  )

  /* ---------------- Mutations ---------------- */

  const addSchool = useCallback(
    async (draft) => {
      const payload = {
        ...draft,
        additional_emails: draft.additional_emails.filter((e) => e.trim()),
      }
      try {
        await api.post('/api/add-school', payload)
        notify('success', 'School added.')
        return true
      } catch (err) {
        notify('danger', err.message || 'Failed to add school.')
        return false
      }
    },
    [notify],
  )

  const uploadCsv = useCallback(
    async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      try {
        // The endpoint returns {message, schools_added, schools_skipped}; there
        // is no `status` key, so success is the absence of an error response.
        const data = await api.upload('/api/upload-schools-csv', formData)
        notify(
          'success',
          `Added ${data.schools_added} school${data.schools_added === 1 ? '' : 's'}` +
            `${data.schools_skipped ? `, skipped ${data.schools_skipped} already present` : ''}.`,
        )
        return data
      } catch (err) {
        notify('danger', err.message || 'Failed to upload CSV.')
        return null
      }
    },
    [notify],
  )

  const deleteSentEmails = useCallback(
    async (ids) => {
      setLoading(true)
      let deleted = 0
      let failed = 0
      for (const id of ids) {
        try {
          await api.del('/api/delete-sent-email', { email_id: id })
          deleted += 1
        } catch (err) {
          // A dead token ends the loop; the api client already logged out.
          if (err.status === 401) break
          failed += 1
        }
      }
      await loadSentEmails()
      setLoading(false)
      notify(
        failed ? 'warning' : 'success',
        `${deleted} email record${deleted === 1 ? '' : 's'} deleted` +
          (failed ? `, ${failed} failed.` : '.'),
      )
      return { deleted, failed }
    },
    [loadSentEmails, notify],
  )

  const sendCustomReply = useCallback(
    async (draft) => {
      setLoading(true)
      try {
        await api.post('/api/send-custom-reply', {
          email_id: draft.email_id,
          to_email: draft.school_email,
          subject: draft.subject,
          message: draft.message,
        })
        await loadSentEmails()
        notify('success', 'Reply sent.')
        return true
      } catch (err) {
        notify('danger', err.message || 'Failed to send reply.')
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadSentEmails, notify],
  )

  const checkReplies = useCallback(async () => {
    setSyncing(true)
    notify('info', 'Checking for email replies...')
    try {
      const data = await api.post('/api/check-email-replies')
      await loadSentEmails()
      setMailSync(data)
      notify(
        data.ready ? 'success' : 'warning',
        data.ready
          ? `Checked ${data.messages_checked} messages and found ${data.replies_found} replies.`
          : `Checked ${data.messages_checked} messages. ${data.pending_count} remain; check again before sending follow-ups.`,
      )
    } catch (err) {
      await loadMailSync()
      notify('danger', err.message || 'Failed to check for replies.')
    } finally {
      setSyncing(false)
    }
  }, [loadSentEmails, loadMailSync, notify])

  // Check once when the page opens, including a stale earlier sync. A larger
  // mailbox needs another explicit check so its backlog stays visible.
  useEffect(() => {
    if (
      accessToken &&
      user?.mail_connected &&
      mailSync &&
      !mailSync.ready &&
      !mailSync.error &&
      !syncing &&
      autoSyncToken.current !== accessToken
    ) {
      autoSyncToken.current = accessToken
      checkReplies()
    }
  }, [accessToken, user?.mail_connected, mailSync, syncing, checkReplies])

  const loadReplyChain = useCallback(
    (emailId) => api.get(`/api/email-reply-chain/${emailId}`),
    [],
  )

  const setResponded = useCallback(
    async (emailId, value) => {
      try {
        await api.post('/api/mark-responded', {
          email_id: emailId,
          responded: value,
        })
        await loadSentEmails()
        notify(
          'success',
          value ? 'Marked as responded.' : 'Marked as not responded.',
        )
      } catch (err) {
        notify('danger', err.message || 'Could not update the email.')
      }
    },
    [loadSentEmails, notify],
  )

  return {
    sentEmails,
    responded,
    isAdmin: Boolean(user?.admin),
    loading,
    status,
    mailSync,
    syncing,
    notify,
    clearStatus,
    reload,
    loadSentEmails,
    addSchool,
    uploadCsv,
    deleteSentEmails,
    sendCustomReply,
    checkReplies,
    loadReplyChain,
    setResponded,
  }
}

export default useEmailCenter
