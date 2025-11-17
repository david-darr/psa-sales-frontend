import { useState, useEffect } from 'react'
import { useAuth } from "./AuthContext"
import NavigationCard from './NavigationCard'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024 && window.innerWidth > 768)
  useEffect(() => {
    const onResize = () => setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isTablet
}

export default function Emails() {
  const { user, accessToken } = useAuth()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Component state
  const [mySchools, setMySchools] = useState([])
  const [selectedSchools, setSelectedSchools] = useState([])
  const [selectedEmailsToDelete, setSelectedEmailsToDelete] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [emailStatuses, setEmailStatuses] = useState([])
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [schoolFilter, setSchoolFilter] = useState("all") // New filter state
  const [emailFilter, setEmailFilter] = useState("all") // Add this new state
  const [newSchool, setNewSchool] = useState({
    school_name: "",
    contact_name: "",
    email: "",
    additional_emails: [""], // New field
    phone: "",
    address: "",
    school_type: "preschool"
  })
  const [sendToAllEmails, setSendToAllEmails] = useState(false) // New state
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState(null)
  const [selectedReply, setSelectedReply] = useState(null)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [loadingReply, setLoadingReply] = useState(false)
  const [showCustomReplyModal, setShowCustomReplyModal] = useState(false)
  const [customReplyData, setCustomReplyData] = useState({
    email_id: null,
    school_email: '',
    school_name: '',
    subject: '',
    message: ''
  })
  const [sendingCustomReply, setSendingCustomReply] = useState(false)

  // Filter schools based on selected filter
  const filteredSchools = mySchools.filter(school => {
    if (schoolFilter === "pending") {
      return school.status !== "contacted"
    } else if (schoolFilter === "contacted") {
      return school.status === "contacted"
    }
    return true // "all" shows everything
  })

  // Update selected schools when filter changes
  useEffect(() => {
    // Clear selections when filter changes to avoid selecting schools not visible
    setSelectedSchools([])
  }, [schoolFilter])

  // Ensure full viewport coverage
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    
    return () => {
      if (!document.querySelector('.dashboard-container')) {
        document.body.style.display = 'flex';
        document.body.style.alignItems = 'center';
        document.body.style.justifyContent = 'center';
        document.body.style.background = '#f5f5f5';
      }
    };
  }, []);

  // Close mobile nav when clicking outside or on resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile && mobileNavOpen) {
        setMobileNavOpen(false)
      }
    }

    const handleClickOutside = (event) => {
      if (mobileNavOpen && !event.target.closest('.mobile-nav-sidebar') && !event.target.closest('.mobile-nav-toggle')) {
        setMobileNavOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    document.addEventListener('click', handleClickOutside)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobile, mobileNavOpen])

  // Load user's schools
  useEffect(() => {
    if (accessToken) {
      fetchMySchools()
    }
  }, [accessToken])

  // Load sent emails
  useEffect(() => {
    if (accessToken) {
      fetchEmailStatuses()
    }
  }, [accessToken])

  const fetchMySchools = () => {
    fetch("https://psa-sales-backend.onrender.com/api/my-schools", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(setMySchools)
  }

  const fetchEmailStatuses = () => {
    fetch("https://psa-sales-backend.onrender.com/api/sent-emails", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(setEmailStatuses)
  }

  const handleSchoolSelect = (schoolId) => {
    setSelectedSchools(schools =>
      schools.includes(schoolId) 
        ? schools.filter(id => id !== schoolId) 
        : [...schools, schoolId]
    )
  }

  const handleEmailSelectToDelete = (emailId) => {
    setSelectedEmailsToDelete(emails =>
      emails.includes(emailId)
        ? emails.filter(id => id !== emailId)
        : [...emails, emailId]
    )
  }

  const handleSelectAllSchools = () => {
    if (selectedSchools.length === filteredSchools.length) {
      setSelectedSchools([])
    } else {
      setSelectedSchools(filteredSchools.map(school => school.id))
    }
  }

  const handleSelectAllEmails = () => {
    if (selectedEmailsToDelete.length === filteredEmails.length) {
      setSelectedEmailsToDelete([])
    } else {
      setSelectedEmailsToDelete(filteredEmails.map(email => email.id))
    }
  }

  const addEmailField = () => {
    setNewSchool(prev => ({
      ...prev,
      additional_emails: [...prev.additional_emails, ""]
    }))
  }

  const removeEmailField = (index) => {
    setNewSchool(prev => ({
      ...prev,
      additional_emails: prev.additional_emails.filter((_, i) => i !== index)
    }))
  }

  const updateAdditionalEmail = (index, value) => {
    setNewSchool(prev => ({
      ...prev,
      additional_emails: prev.additional_emails.map((email, i) => 
        i === index ? value : email
      )
    }))
  }

  const handleAddSchool = async (e) => {
    e.preventDefault()
    
    // Filter out empty additional emails
    const filteredAdditionalEmails = newSchool.additional_emails.filter(email => email.trim())
    
    const res = await fetch("https://psa-sales-backend.onrender.com/api/add-school", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        ...newSchool,
        additional_emails: filteredAdditionalEmails
      })
    })
    const data = await res.json()
    if (data.message) {
      fetchMySchools()
      setNewSchool({ 
        school_name: "", 
        contact_name: "", 
        email: "", 
        additional_emails: [""],
        phone: "", 
        address: "",
        school_type: "preschool"
      })
      setShowAddSchool(false)
      setStatus("School added successfully!")
      setTimeout(() => setStatus(""), 3000)
    } else {
      setStatus(data.error || "Failed to add school")
      setTimeout(() => setStatus(""), 3000)
    }
  }

  const handleSendEmails = async (e) => {
    e.preventDefault()
    setStatus("")
    setLoading(true)
    
    try {
      // Calculate total emails that will be sent
      let totalEmailsToSend = 0
      if (sendToAllEmails) {
        const selectedSchoolsData = mySchools.filter(school => selectedSchools.includes(school.id))
        totalEmailsToSend = selectedSchoolsData.reduce((total, school) => {
          return total + (school.all_emails ? school.all_emails.length : 1)
        }, 0)
      } else {
        totalEmailsToSend = selectedSchools.length
      }
      
      if (totalEmailsToSend > 15) {
        setStatus(`Too many emails to send (${totalEmailsToSend}). Maximum is 15 per batch. ${sendToAllEmails ? 'Try unchecking "Send to all emails"' : ''}`)
        setLoading(false)
        setTimeout(() => setStatus(""), 5000)
        return
      }
      
      let totalSent = 0
      let totalErrors = []
      
      // Split large selections into chunks of 5 schools (not emails)
      const chunkSize = 5
      const chunks = []
      for (let i = 0; i < selectedSchools.length; i += chunkSize) {
        chunks.push(selectedSchools.slice(i, i + chunkSize))
      }
      
      // Send each chunk separately
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        setStatus(`Sending emails ${i * chunkSize + 1}-${Math.min((i + 1) * chunkSize, selectedSchools.length)} of ${selectedSchools.length} schools...`)
        
        const res = await fetch("https://psa-sales-backend.onrender.com/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            school_ids: chunk,
            subject: "Let's Connect! PSA Programs",
            send_to_all_emails: sendToAllEmails
          })
        })
        
        const data = await res.json()
        totalSent += data.sent_count || 0
        if (data.errors) {
          totalErrors = [...totalErrors, ...data.errors]
        }
        
        // Small delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      if (totalSent > 0) {
        setStatus(`✅ Successfully sent ${totalSent} emails!`)
        setSelectedSchools([])
        setSendToAllEmails(false)
        fetchEmailStatuses()
        fetchMySchools()
      } else {
        setStatus("❌ Failed to send emails")
      }
      
      if (totalErrors.length > 0) {
        console.log("Email errors:", totalErrors)
      }
      
    } catch (error) {
      console.error('Email sending error:', error)
      setStatus("❌ Error occurred while sending emails")
    } finally {
      setLoading(false)
      setTimeout(() => setStatus(""), 5000)
    }
  }

  const handleDeleteSelectedEmails = async () => {
    if (selectedEmailsToDelete.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedEmailsToDelete.length} email record${selectedEmailsToDelete.length === 1 ? '' : 's'}?`)) {
      return
    }

    setLoading(true)
    let deletedCount = 0
    let errors = []

    for (const emailId of selectedEmailsToDelete) {
      try {
        const res = await fetch("https://psa-sales-backend.onrender.com/api/delete-sent-email", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({ email_id: emailId })
        })

        if (res.ok) {
          deletedCount++
        } else {
          const data = await res.json()
          errors.push(data.error || "Failed to delete")
        }
      } catch (error) {
        errors.push("Network error")
      }
    }

    setSelectedEmailsToDelete([])
    fetchEmailStatuses()
    
    if (deletedCount > 0) {
      setStatus(`${deletedCount} email record${deletedCount === 1 ? '' : 's'} deleted successfully!`)
    }
    if (errors.length > 0) {
      setStatus(prev => prev + ` ${errors.length} failed to delete.`)
    }
    
    setLoading(false)
    setTimeout(() => setStatus(""), 5000)
  }

  const handleCheckEmailReplies = async () => {
    setLoading(true)
    setStatus("Checking for email replies...")
    
    try {
      const res = await fetch("https://psa-sales-backend.onrender.com/api/check-email-replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        }
      })
      
      const data = await res.json()
      
      if (data.status) {
        setStatus("Email reply check completed! Refreshing email statuses...")
        fetchEmailStatuses()
      } else {
        setStatus(data.error || "Failed to check email replies")
      }
    } catch (error) {
      setStatus("Error checking email replies")
    }
    
    setLoading(false)
    setTimeout(() => setStatus(""), 5000)
  }

  const handleCsvUpload = async (e) => {
    e.preventDefault()
    if (!csvFile) {
      setStatus("Please select a CSV file")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    setCsvUploading(true)
    setStatus("Uploading CSV file...")

    try {
      const formData = new FormData()
      formData.append('file', csvFile)

      const res = await fetch("https://psa-sales-backend.onrender.com/api/upload-schools-csv", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        },
        body: formData
      })

      const data = await res.json()

      if (data.status === "success") {
        setCsvResult(data)
        setStatus(`Success! Added ${data.schools_added} schools. ${data.schools_skipped} were skipped.`)
        fetchMySchools() // Refresh the schools list
        setCsvFile(null)
        setShowCsvUpload(false)
      } else {
        setStatus(data.error || "Failed to upload CSV")
      }
    } catch (error) {
      setStatus("Error uploading CSV file")
      console.error('CSV upload error:', error)
    } finally {
      setCsvUploading(false)
      setTimeout(() => setStatus(""), 5000)
    }
  }

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.name.toLowerCase().endsWith('.csv')) {
        setCsvFile(file)
      } else {
        setStatus("Please select a CSV file")
        setTimeout(() => setStatus(""), 3000)
      }
    }
  }

  // Get counts for filter labels
  const pendingCount = mySchools.filter(school => school.status !== "contacted").length
  const contactedCount = mySchools.filter(school => school.status === "contacted").length

  // Add these filter functions after your existing filteredSchools logic
  const filteredEmails = emailStatuses.filter(email => {
    if (emailFilter === "pending") {
      return !email.responded && !email.followup_sent
    } else if (emailFilter === "followup") {
      return !email.responded && email.followup_sent
    } else if (emailFilter === "responded") {
      return email.responded
    }
    return true // "all" shows everything
  })

  // Get counts for filter labels
  const pendingEmailsCount = emailStatuses.filter(email => !email.responded && !email.followup_sent).length
  const followupEmailsCount = emailStatuses.filter(email => !email.responded && email.followup_sent).length
  const respondedEmailsCount = emailStatuses.filter(email => email.responded).length

  const urgentFollowups = emailStatuses.filter(email => 
    !email.responded && !email.followup_sent && (email.days_ago || 0) >= 14
  ).length

  const dueFollowups = emailStatuses.filter(email => 
    !email.responded && !email.followup_sent && (email.days_ago || 0) >= 7 && (email.days_ago || 0) < 14
  ).length

  // Fetch and display reply content
  const handleViewReply = async (emailId) => {
    try {
      setLoadingReply(true)
      setShowReplyModal(true)
      
      const res = await fetch(`https://psa-sales-backend.onrender.com/api/email-reply-chain/${emailId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (res.ok) {
        const replyData = await res.json()
        setSelectedReply(replyData)
      } else {
        const errorData = await res.json()
        setSelectedReply({
          error: errorData.error || "Failed to load reply chain"
        })
      }
    } catch (error) {
      console.error('Error fetching reply chain:', error)
      setSelectedReply({
        error: "Network error while loading reply chain"
      })
    } finally {
      setLoadingReply(false)
    }
  }

  const closeReplyModal = () => {
    setShowReplyModal(false)
    setSelectedReply(null)
    setLoadingReply(false)
  }

  const handleOpenCustomReply = (email) => {
    setCustomReplyData({
      email_id: email.id,
      school_email: email.school_email,
      school_name: email.school_name,
      subject: `Re: ${email.subject || 'PSA Programs'}`,
      message: ''
    })
    setShowCustomReplyModal(true)
  }

  const handleSendCustomReply = async (e) => {
    if (e) e.preventDefault()
    
    if (!customReplyData.message.trim()) {
      setStatus("Please enter a reply message")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    setSendingCustomReply(true)
    setStatus("Sending custom reply...")

    try {
      const res = await fetch("https://psa-sales-backend.onrender.com/api/send-custom-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email_id: customReplyData.email_id,
          to_email: customReplyData.school_email,
          subject: customReplyData.subject,
          message: customReplyData.message
        })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("✅ Custom reply sent successfully!")
        setShowCustomReplyModal(false)
        setCustomReplyData({
          email_id: null,
          school_email: '',
          school_name: '',
          subject: '',
          message: ''
        })
        fetchEmailStatuses() // Refresh to show updated status
      } else {
        setStatus(data.error || "Failed to send custom reply")
      }
    } catch (error) {
      setStatus("Error sending custom reply")
      console.error('Custom reply error:', error)
    } finally {
      setSendingCustomReply(false)
      setTimeout(() => setStatus(""), 5000)
    }
  }

  const handleMassFollowup = async () => {
    const pendingEmails = emailStatuses.filter(email => !email.responded && !email.followup_sent)
    
    if (pendingEmails.length === 0) {
      setStatus("No pending emails to send follow-ups to")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    if (!confirm(`Send follow-up emails to ${pendingEmails.length} pending school${pendingEmails.length === 1 ? '' : 's'}?`)) {
      return
    }

    setLoading(true)
    setStatus("Sending mass follow-ups...")
    
    try {
      let totalSent = 0
      let totalErrors = []
      
      // Split into chunks of 3 to prevent timeout (smaller than regular emails since follow-ups are simpler)
      const chunkSize = 3
      const chunks = []
      for (let i = 0; i < pendingEmails.length; i += chunkSize) {
        chunks.push(pendingEmails.slice(i, i + chunkSize))
      }
      
      // Send each chunk separately
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        setStatus(`Sending follow-ups ${i * chunkSize + 1}-${Math.min((i + 1) * chunkSize, pendingEmails.length)} of ${pendingEmails.length}...`)
        
        // Send follow-ups in parallel for each chunk
        const chunkPromises = chunk.map(async (email) => {
          try {
            const res = await fetch("https://psa-sales-backend.onrender.com/api/send-followup", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
              },
              body: JSON.stringify({ email_id: email.id })
            })
            
            const data = await res.json()
            if (data.status === "follow-up sent") {
              return { success: true, school: email.school_name }
            } else {
              return { success: false, school: email.school_name, error: data.error }
            }
          } catch (error) {
            return { success: false, school: email.school_name, error: "Network error" }
          }
        })
        
        const chunkResults = await Promise.all(chunkPromises)
        
        // Count successes and errors
        chunkResults.forEach(result => {
          if (result.success) {
            totalSent++
          } else {
            totalErrors.push(`${result.school}: ${result.error}`)
          }
        })
        
        // Small delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      // Refresh email statuses
      fetchEmailStatuses()
      
      if (totalSent > 0) {
        setStatus(`✅ Successfully sent ${totalSent} follow-up emails!`)
      }
      
      if (totalErrors.length > 0) {
        setStatus(prev => prev + ` ${totalErrors.length} failed to send.`)
        console.log("Follow-up errors:", totalErrors)
      }
      
    } catch (error) {
      console.error('Mass follow-up error:', error)
      setStatus("❌ Error occurred while sending follow-ups")
    } finally {
      setLoading(false)
      setTimeout(() => setStatus(""), 5000)
    }
  }

  const downloadCsvTemplate = () => {
    const csvContent = `school_name,email,contact_name,phone,address,school_type
"ABC Preschool","director@abcpreschool.com","Jane Smith","555-0123","123 Main St, Fairfax VA","preschool"
"ABC Preschool","admin@abcpreschool.com","John Doe","555-0123","123 Main St, Fairfax VA","preschool"
"XYZ Elementary","principal@xyzelementary.edu","Mary Johnson","555-0456","456 Oak Ave, Reston VA","elementary"
"St. Mary Catholic School","office@stmary.org","Father Mike","555-0789","789 Pine Rd, McLean VA","private"`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'schools_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Add this helper function around line 50 (after the getFollowupUrgency function)
  const getTimeAgoDisplay = (sentAt, daysAgo) => {
    if (daysAgo === 0) {
      return { text: "Today", color: "#10b981", icon: "🆕" }
    } else if (daysAgo === 1) {
      return { text: "Yesterday", color: "#3b82f6", icon: "📅" }
    } else if (daysAgo <= 7) {
      return { text: `${daysAgo} days ago`, color: "#f59e0b", icon: "📆" }
    } else if (daysAgo <= 30) {
      return { text: `${daysAgo} days ago`, color: "#ef4444", icon: "⏰" }
    } else {
      return { text: `${daysAgo} days ago`, color: "#64748b", icon: "🕐" }
    }
  }

  // Add this function right after getTimeAgoDisplay
  const getFollowupUrgency = (email) => {
    if (email.responded) return null
    if (email.followup_sent) return null
    
    const daysAgo = email.days_ago || 0
    
    if (daysAgo >= 14) {
      return { 
        text: "🚨 Urgent Follow-up", 
        color: "#ef4444", 
        bg: "rgba(239, 68, 68, 0.1)" 
      }
    } else if (daysAgo >= 7) {
      return { 
        text: "⚠️ Follow-up Due", 
        color: "#f59e0b", 
        bg: "rgba(245, 158, 11, 0.1)" 
      }
    } else if (daysAgo >= 3) {
      return { 
        text: "📅 Follow-up Soon", 
        color: "#3b82f6", 
        bg: "rgba(59, 130, 246, 0.1)" 
      }
    }
    
    return null
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Navigation Toggle Button */}
      {isMobile && (
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 1001,
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            border: '1px solid #475569',
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              width: '20px',
              height: '16px'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '2px',
                background: '#f1f5f9',
                borderRadius: '1px',
                transition: 'all 0.3s ease',
                transform: mobileNavOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'
              }}
            />
            <div
              style={{
                width: '100%',
                height: '2px',
                background: '#f1f5f9',
                borderRadius: '1px',
                transition: 'all 0.3s ease',
                opacity: mobileNavOpen ? 0 : 1
              }}
            />
            <div
              style={{
                width: '100%',
                height: '2px',
                background: '#f1f5f9',
                borderRadius: '1px',
                transition: 'all 0.3s ease',
                transform: mobileNavOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none'
              }}
            />
          </div>
        </button>
      )}

      {/* Mobile Navigation Overlay */}
      {isMobile && mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Mobile Navigation Sidebar - Only visible on mobile when open */}
      {isMobile && (
        <div
          className="mobile-nav-sidebar"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '280px',
            height: '100vh',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderRight: '1px solid #334155',
            padding: '2rem',
            transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
            zIndex: 1000,
            overflowY: 'auto'
          }}
        >
          <NavigationCard />
        </div>
      )}

      {/* Desktop Navigation Sidebar - Only visible on desktop */}
      {!isMobile && (
        <div
          className="nav-sidebar"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '280px',
            height: '100vh',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderRight: '1px solid #334155',
            padding: '2rem',
            zIndex: 1000,
            overflowY: 'auto'
          }}
        >
          <NavigationCard />
        </div>
      )}
      
      <main className="modern-main-content" style={{ 
        marginLeft: isMobile ? 0 : 280,
        paddingTop: isMobile ? "4rem" : "2rem",
        paddingLeft: isMobile ? "1rem" : "2rem",
        paddingRight: isMobile ? "1rem" : "2rem",
        paddingBottom: "2rem",
        width: isMobile ? "100vw" : "calc(100vw - 280px)"
      }}>
        {/* Header Section */}
        <div className="modern-page-header" style={{ 
          marginBottom: isMobile ? "1rem" : "2rem",
          textAlign: "left"
        }}>
          <h1 className="modern-page-title" style={{
            fontSize: isMobile ? "2rem" : "3rem",
            marginBottom: isMobile ? "0.25rem" : "0.5rem",
            textAlign: "left"
          }}>
            EMAIL CENTER
          </h1>
          <p className="modern-page-subtitle" style={{
            textAlign: "left"
          }}>
            Manage School Communications & Email Campaigns
          </p>
        </div>

        {user ? (
          <>
            {/* Status Message */}
            {status && (
              <div className="modern-dashboard-card" style={{ 
                marginBottom: isMobile ? "1rem" : "2rem",
                borderLeft: status.includes("success") || status.includes("sent") || status.includes("deleted") ? "4px solid #10b981" : "4px solid #ef4444"
              }}>
                <div className="modern-card-content" style={{ 
                  color: status.includes("success") || status.includes("sent") || status.includes("deleted") ? "#10b981" : "#ef4444",
                  fontWeight: "600",
                  textAlign: "center"
                }}>
                  {status}
                </div>
              </div>
            )}

            {/* Updated Add School Card with CSV Upload */}
            <div className="modern-dashboard-card" style={{ marginBottom: isMobile ? "1rem" : "2rem" }}>
              <div className="modern-card-header">
                <div className="modern-card-title">Add Schools</div>
                <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                  🏫
                </div>
              </div>
              <div className="modern-card-content">
                {/* Toggle Buttons */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: "0.5rem",
                  marginBottom: "1.5rem"
                }}>
                  <button
                    className="modern-btn-primary"
                    onClick={() => {
                      setShowAddSchool(!showAddSchool)
                      setShowCsvUpload(false)
                    }}
                    style={{ 
                      background: showAddSchool ? "#ef4444" : "#10b981"
                    }}
                  >
                    {showAddSchool ? "❌ Cancel Manual Entry" : "➕ Add Single School"}
                  </button>
                  
                  <button
                    className="modern-btn-primary"
                    onClick={() => {
                      setShowCsvUpload(!showCsvUpload)
                      setShowAddSchool(false)
                    }}
                    style={{ 
                      background: showCsvUpload ? "#ef4444" : "#3b82f6"
                    }}
                  >
                    {showCsvUpload ? "❌ Cancel CSV Upload" : "📄 Upload CSV File"}
                  </button>
                </div>

                {/* Manual School Entry Form */}
                {showAddSchool && (
                  <form onSubmit={handleAddSchool}>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <input
                        placeholder="School Name *"
                        value={newSchool.school_name}
                        onChange={(e) => setNewSchool({...newSchool, school_name: e.target.value})}
                        required
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                      <input
                        placeholder="Contact Name"
                        value={newSchool.contact_name}
                        onChange={(e) => setNewSchool({...newSchool, contact_name: e.target.value})}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                    </div>

                    {/* Primary Email */}
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{
                        color: "#f1f5f9",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "0.5rem"
                      }}>
                        Primary Email *
                      </label>
                      <input
                        type="email"
                        placeholder="Primary Email *"
                        value={newSchool.email}
                        onChange={(e) => setNewSchool({...newSchool, email: e.target.value})}
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                    </div>

                    {/* Additional Emails */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem"
                      }}>
                        <label style={{
                          color: "#f1f5f9",
                          fontSize: "0.9rem",
                          fontWeight: "600"
                        }}>
                          Additional Emails (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={addEmailField}
                          style={{
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.8rem",
                            cursor: "pointer"
                          }}
                        >
                          + Add Email
                        </button>
                      </div>
                      
                      {newSchool.additional_emails.map((email, index) => (
                        <div key={index} style={{
                          display: "flex",
                          gap: "0.5rem",
                          marginBottom: "0.5rem"
                        }}>
                          <input
                            type="email"
                            placeholder={`Additional Email ${index + 1}`}
                            value={email}
                            onChange={(e) => updateAdditionalEmail(index, e.target.value)}
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              border: "1px solid #475569",
                              borderRadius: "6px",
                              background: "#334155",
                              color: "#f1f5f9",
                              fontSize: "0.9rem"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeEmailField(index)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              padding: "0.5rem",
                              cursor: "pointer",
                              fontSize: "0.8rem"
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "1rem",
                      marginBottom: "1rem"
                    }}>
                      <input
                        placeholder="Phone"
                        value={newSchool.phone}
                        onChange={(e) => setNewSchool({...newSchool, phone: e.target.value})}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                      <input
                        placeholder="Address"
                        value={newSchool.address}
                        onChange={(e) => setNewSchool({...newSchool, address: e.target.value})}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: "1rem" }}>
                      <select
                        name="school_type"
                        value={newSchool.school_type}
                        onChange={(e) => setNewSchool({...newSchool, school_type: e.target.value})}
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          background: "#334155",
                          color: "#f1f5f9",
                          fontSize: "1rem"
                        }}
                      >
                        <option value="preschool">Preschool</option>
                        <option value="elementary">Elementary School</option>
                        <option value="private">Private School</option>
                      </select>
                    </div>
                    
                    <button 
                      type="submit" 
                      className="modern-btn-primary"
                      style={{ width: "100%", background: "#10b981" }}
                    >
                      ✅ Add School
                    </button>
                  </form>
                )}

                {/* CSV Upload Form */}
                {showCsvUpload && (
                  <div>
                    {/* CSV Format Requirements */}
                    <div style={{ 
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "1.5rem"
                    }}>
                      <h4 style={{ 
                        color: "#3b82f6", 
                        marginBottom: "0.75rem",
                        fontSize: "1rem",
                        fontWeight: "600"
                      }}>
                        📋 CSV Format Requirements
                      </h4>
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: "1.5" }}>
                        <p style={{ marginBottom: "0.5rem" }}>
                          <strong>Required columns:</strong> school_name, email
                        </p>
                        <p style={{ marginBottom: "0.5rem" }}>
                          <strong>Optional columns:</strong> contact_name, phone, address, school_type
                        </p>
                        <p style={{ marginBottom: "0.5rem" }}>
                          <strong>School types:</strong> "preschool", "elementary", or "private" (defaults to preschool)
                        </p>
                        <p style={{ marginBottom: "0.5rem" }}>
                          <strong>Multiple emails:</strong> Use separate rows for the same school with different emails
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          Column names are flexible - we'll match variations like "School Name", "Contact Name", etc.
                          Schools with the same name will be grouped together with all their email addresses.
                        </p>
                      </div>
                    </div>

                    {/* Sample CSV Download */}
                    <div style={{ 
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "1.5rem"
                    }}>
                      <h4 style={{ 
                        color: "#10b981", 
                        marginBottom: "0.75rem",
                        fontSize: "1rem",
                        fontWeight: "600"
                      }}>
                        📥 Sample CSV Template
                      </h4>
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                        Download a sample CSV file to see the correct format:
                      </div>
                      <button
                        className="modern-btn-primary"
                        onClick={downloadCsvTemplate}
                        style={{ 
                          background: "#10b981",
                          fontSize: "0.85rem",
                          padding: "0.5rem 1rem"
                        }}
                      >
                        📄 Download Template
                      </button>
                    </div>

                    {/* File Upload Form */}
                    <form onSubmit={handleCsvUpload}>
                      <div style={{ marginBottom: "1rem" }}>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileChange}
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            background: "#334155",
                            color: "#f1f5f9",
                            fontSize: "1rem"
                          }}
                        />
                      </div>

                      {csvFile && (
                        <div style={{ 
                          background: "rgba(245, 158, 11, 0.1)",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          marginBottom: "1rem",
                          fontSize: "0.9rem",
                          color: "#f59e0b"
                        }}>
                          📁 Selected file: {csvFile.name}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="modern-btn-primary"
                        disabled={!csvFile || csvUploading}
                        style={{ 
                          width: "100%",
                          background: "#3b82f6",
                          opacity: !csvFile || csvUploading ? 0.6 : 1,
                          cursor: !csvFile || csvUploading ? "not-allowed" : "pointer"
                        }}
                      >
                        {csvUploading ? "📤 Uploading..." : "📤 Upload CSV File"}
                      </button>
                    </form>

                    {/* Upload Results */}
                    {csvResult && (
                      <div style={{ 
                        marginTop: "1.5rem",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        borderRadius: "8px",
                        padding: "1rem"
                      }}>
                        <h4 style={{ 
                          color: "#10b981", 
                          marginBottom: "0.75rem",
                          fontSize: "1rem",
                          fontWeight: "600"
                        }}>
                          ✅ Upload Results
                        </h4>
                        <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                          <p>✅ Schools added: <strong style={{ color: "#10b981" }}>{csvResult.schools_added}</strong></p>
                          <p>⏭️ Schools skipped: <strong style={{ color: "#f59e0b" }}>{csvResult.schools_skipped}</strong></p>
                          {csvResult.errors && csvResult.errors.length > 0 && (
                            <div style={{ marginTop: "0.75rem" }}>
                              <p style={{ color: "#ef4444", fontWeight: "600" }}>Errors:</p>
                              <ul style={{ marginLeft: "1rem", color: "#ef4444", fontSize: "0.8rem" }}>
                                {csvResult.errors.slice(0, 5).map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                                {csvResult.errors.length > 5 && (
                                  <li>... and {csvResult.errors.length - 5} more errors</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Schools Selection Card with Filter */}
            <div className="modern-dashboard-card" style={{ marginBottom: isMobile ? "1rem" : "2rem" }}>
              <div className="modern-card-header">
                <div className="modern-card-title">Select Schools to Email ({selectedSchools.length} selected)</div>
                <div className="modern-card-icon" style={{ background: "#3b82f620", color: "#3b82f6" }}>
                  📧
                </div>
              </div>
              <div className="modern-card-content">
                {/* Filter Controls */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                      Filter schools:
                    </div>
                    <select
                      value={schoolFilter}
                      onChange={(e) => setSchoolFilter(e.target.value)}
                      style={{
                        padding: "0.5rem 1rem",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                        background: "#334155",
                        color: "#f1f5f9",
                        fontSize: "0.9rem",
                        minWidth: "200px"
                      }}
                    >
                      <option value="all">📋 All Schools ({mySchools.length})</option>
                      <option value="pending">⏳ Pending ({pendingCount})</option>
                      <option value="contacted">✅ Contacted ({contactedCount})</option>
                    </select>
                  </div>
                  
                  <button
                    className="modern-btn-primary"
                    onClick={handleSelectAllSchools}
                    style={{ 
                      padding: "0.5rem 1rem", 
                      fontSize: "0.85rem",
                      background: selectedSchools.length === filteredSchools.length ? "#ef4444" : "#3b82f6"
                    }}
                  >
                    {selectedSchools.length === filteredSchools.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {/* Filter Info */}
                <div style={{ 
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                  color: "#94a3b8"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span>
                      Showing <strong style={{ color: "#3b82f6" }}>{filteredSchools.length}</strong> schools
                      {schoolFilter !== "all" && (
                        <span> (filtered from {mySchools.length} total)</span>
                      )}
                    </span>
                    <span>
                      ⏳ {pendingCount} pending • ✅ {contactedCount} contacted
                    </span>
                  </div>
                </div>
                
                <div style={{ 
                  maxHeight: "400px", 
                  overflowY: "auto",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                  marginBottom: "1rem"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#475569", position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", width: "50px" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Select</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>School</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Type</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Contact</span>
                        </th>
                        {!isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Email</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>
                            {isMobile ? "Date & Age" : "Date Sent"}
                          </span>
                        </th>
                        {user.admin && !isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Added By</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Status</span>
                        </th>
                        {user.admin && !isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Actions</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchools.map((school, index) => (
                        <tr 
                          key={school.id}
                          style={{ 
                            background: index % 2 === 0 ? "rgba(51, 65, 85, 0.3)" : "rgba(30, 41, 59, 0.3)",
                            borderBottom: "1px solid #475569"
                          }}
                        >
                          <td style={{ padding: "0.75rem" }}>
                            <input
                              type="checkbox"
                              checked={selectedSchools.includes(school.id)}
                              onChange={() => handleSchoolSelect(school.id)}
                              style={{ accentColor: "#3b82f6" }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ color: "#f1f5f9", fontWeight: "500", fontSize: "0.9rem" }}>
                              {school.school_name}
                            </div>
                            {isMobile && (
                              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                <div>📧 {school.email}</div>
                                {school.additional_emails && school.additional_emails.length > 0 && (
                                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                                    +{school.additional_emails.length} more email{school.additional_emails.length === 1 ? '' : 's'}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ 
                              fontSize: "0.8rem", 
                              color: school.school_type === 'preschool' ? "#f59e0b" : 
                                     school.school_type === 'private' ? "#8b5cf6" : "#10b981",
                              fontWeight: "600",
                              marginBottom: "0.5rem"
                            }}>
                              {school.school_type === 'preschool' ? '👶 Preschool' : 
                               school.school_type === 'private' ? '🏫 Private School' : '📚 Elementary'}
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
                              {school.contact_name || "—"}
                            </div>
                          </td>
                          {!isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              <div>{school.email}</div>
                              {school.additional_emails && school.additional_emails.length > 0 && (
                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                                  +{school.additional_emails.length} additional email{school.additional_emails.length === 1 ? '' : 's'}
                                </div>
                              )}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
                              {school.status === 'contacted' ? 'Recently contacted' : 'Not contacted yet'}
                            </div>
                          </td>
                          {user.admin && !isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {school.user_name || "Unknown"}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              <span style={{
                                background: school.status === 'contacted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                color: school.status === 'contacted' ? '#10b981' : '#64748b',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '500'
                              }}>
                                {school.status === 'contacted' ? '✅ Contacted' : '⏳ Pending'}
                              </span>
                            </div>
                          </td>
                          {user.admin && !isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {school.user_name || "Unknown"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredSchools.length === 0 && mySchools.length > 0 && (
                    <div style={{ 
                      textAlign: "center", 
                      padding: "2rem", 
                      color: "#64748b",
                      fontSize: "0.9rem"
                    }}>
                      No schools match the current filter. Try selecting a different filter option.
                    </div>
                  )}
                  
                  {mySchools.length === 0 && (
                    <div style={{ 
                      textAlign: "center", 
                      padding: "2rem", 
                      color: "#64748b",
                      fontSize: "0.9rem"
                    }}>
                      No schools added yet. Add some schools to get started!
                    </div>
                  )}
                </div>

                {/* Add this before the Send Email button around line 900 */}
                <div style={{
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1rem"
                }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#f1f5f9",
                    fontSize: "0.9rem",
                    cursor: "pointer"
                  }}>
                    <input
                      type="checkbox"
                      checked={sendToAllEmails}
                      onChange={(e) => setSendToAllEmails(e.target.checked)}
                      style={{ accentColor: "#3b82f6" }}
                    />
                    📧 Send to all email addresses (including additional emails)
                  </label>
                  <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                    When checked, emails will be sent to both primary and additional email addresses for each school.
                  </div>
                </div>

                <button
                  onClick={handleSendEmails}
                  className="modern-btn-primary"
                  style={{ 
                    width: "100%",
                    opacity: selectedSchools.length === 0 || loading ? 0.6 : 1,
                    cursor: selectedSchools.length === 0 || loading ? "not-allowed" : "pointer",
                    background: "#3b82f6"
                  }}
                  disabled={selectedSchools.length === 0 || loading}
                >
                  {loading ? 
                    "📧 Sending..." : 
                    `📧 Send Email to ${selectedSchools.length} School${selectedSchools.length === 1 ? "" : "s"} ${sendToAllEmails ? '(All Addresses)' : '(Primary Only)'}`
                  }
                </button>
              </div>
            </div>

            {/* Updated Email History Card with Filters */}
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">Email History ({emailStatuses.length} emails sent)</div>
                <div className="modern-card-icon" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                  📋
                </div>
              </div>
              <div className="modern-card-content">
                {/* Filter Controls */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                      Filter emails:
                    </div>
                    <select
                      value={emailFilter}
                      onChange={(e) => setEmailFilter(e.target.value)}
                      style={{
                        padding: "0.5rem 1rem",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                        background: "#334155",
                        color: "#f1f5f9",
                        fontSize: "0.9rem",
                        minWidth: "220px"
                      }}
                    >
                      <option value="all">📋 All Emails ({emailStatuses.length})</option>
                      <option value="pending">⏳ Pending ({pendingEmailsCount})</option>
                      <option value="followup">📧 Follow-up Sent ({followupEmailsCount})</option>
                      <option value="responded">✅ Responded ({respondedEmailsCount})</option>
                    </select>
                  </div>
                  
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {/* Mass Follow-up Button */}
                    {pendingEmailsCount > 0 && (
                      <button
                        className="modern-btn-primary"
                        onClick={handleMassFollowup}
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.85rem",
                          background: "#f59e0b"
                        }}
                        disabled={loading}
                      >
                        {loading ? "📧 Sending..." : `📧 Mass Follow-up (${pendingEmailsCount})`}
                      </button>
                    )}
                    
                    <button
                      className="modern-btn-primary"
                      onClick={handleSelectAllEmails}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        fontSize: "0.85rem",
                        background: selectedEmailsToDelete.length === filteredEmails.length ? "#ef4444" : "#64748b"
                      }}
                    >
                      {selectedEmailsToDelete.length === filteredEmails.length ? "Deselect All" : "Select All"}
                    </button>
                    <button
                      className="modern-btn-primary"
                      onClick={handleCheckEmailReplies}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        fontSize: "0.85rem",
                        background: "#3b82f6"
                      }}
                      disabled={loading}
                    >
                      {loading ? "🔄 Checking..." : "🔄 Check Replies"}
                    </button>
                    {selectedEmailsToDelete.length > 0 && (
                      <button
                        className="modern-btn-primary"
                        onClick={handleDeleteSelectedEmails}
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.85rem",
                          background: "#ef4444"
                        }}
                        disabled={loading}
                      >
                        {loading ? "🗑️ Deleting..." : `🗑️ Delete ${selectedEmailsToDelete.length}`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Info */}
                <div style={{ 
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                  color: "#94a3b8"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span>
                      Showing <strong style={{ color: "#f59e0b" }}>{filteredEmails.length}</strong> emails
                      {emailFilter !== "all" && (
                        <span> (filtered from {emailStatuses.length} total)</span>
                      )}
                    </span>
                    <span>
                      ⏳ {pendingEmailsCount} pending • 📧 {followupEmailsCount} follow-up sent • ✅ {respondedEmailsCount} responded
                    </span>
                  </div>
                  
                  {/* Add time-based urgency summary */}
                  {(urgentFollowups > 0 || dueFollowups > 0) && (
                    <div style={{ 
                      marginTop: "0.5rem", 
                      paddingTop: "0.5rem", 
                      borderTop: "1px solid rgba(245, 158, 11, 0.2)",
                      fontSize: "0.8rem"
                    }}>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        {urgentFollowups > 0 && (
                          <span style={{ color: "#ef4444" }}>
                            🚨 {urgentFollowups} urgent follow-up{urgentFollowups === 1 ? '' : 's'} (14+ days)
                          </span>
                        )}
                        {dueFollowups > 0 && (
                          <span style={{ color: "#f59e0b" }}>
                            ⚠️ {dueFollowups} follow-up{dueFollowups === 1 ? '' : 's'} due (7+ days)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ 
                  maxHeight: "500px", 
                  overflowY: "auto",
                  border: "1px solid #475569",
                  borderRadius: "8px"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#475569", position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", width: "50px" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Select</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>School</span>
                        </th>
                        {!isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Email</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>
                            {isMobile ? "Date & Age" : "Date Sent"}
                          </span>
                        </th>
                        {user.admin && !isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>User</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Status</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmails.map((email, index) => (
                        <tr 
                          key={email.id}
                          style={{ 
                            background: index % 2 === 0 ? "rgba(51, 65, 85, 0.3)" : "rgba(30, 41, 59, 0.3)",
                            borderBottom: "1px solid #475569"
                          }}
                        >
                          <td style={{ padding: "0.75rem" }}>
                            <input
                              type="checkbox"
                              checked={selectedEmailsToDelete.includes(email.id)}
                              onChange={() => handleEmailSelectToDelete(email.id)}
                              style={{ accentColor: "#ef4444" }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ color: "#f1f5f9", fontWeight: "500", fontSize: "0.9rem" }}>
                              {email.school_name}
                            </div>
                            {isMobile && (
                              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                <div>📧 {email.school_email}</div>
                                <div style={{ 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center",
                                  marginTop: "0.25rem" 
                                }}>
                                  <span>{email.sent_at_formatted || new Date(email.sent_at).toLocaleDateString()}</span>
                                  <span style={{ 
                                    color: getTimeAgoDisplay(email.sent_at, email.days_ago).color,
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.25rem"
                                  }}>
                                    {getTimeAgoDisplay(email.sent_at, email.days_ago).icon}
                                    {getTimeAgoDisplay(email.sent_at, email.days_ago).text}
                                  </span>
                                </div>
                                {getFollowupUrgency(email) && (
                                  <div style={{
                                    fontSize: "0.7rem",
                                    color: getFollowupUrgency(email).color,
                                    fontWeight: "600",
                                    marginTop: "0.25rem"
                                  }}>
                                    {getFollowupUrgency(email).text}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          {!isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {email.school_email}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem", color: "#e2e8f0", fontSize: "0.85rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <div style={{ fontWeight: "500" }}>
                                {email.sent_at_formatted || new Date(email.sent_at).toLocaleDateString()}
                              </div>
                              <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "0.25rem",
                                fontSize: "0.75rem"
                              }}>
                                <span>{getTimeAgoDisplay(email.sent_at, email.days_ago).icon}</span>
                                <span style={{ 
                                  color: getTimeAgoDisplay(email.sent_at, email.days_ago).color,
                                  fontWeight: "600"
                                }}>
                                  {getTimeAgoDisplay(email.sent_at, email.days_ago).text}
                                </span>
                              </div>
                            </div>
                          </td>
                          {user.admin && !isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {email.user_name || "Unknown"}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              <span style={{
                                background: email.responded ? 'rgba(16, 185, 129, 0.2)' : email.followup_sent ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                color: email.responded ? '#10b981' : email.followup_sent ? '#f59e0b' : '#64748b',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: '500'
                              }}>
                                {email.responded
                                  ? "✅ Responded"
                                  : email.followup_sent
                                  ? "📧 Follow-Up Sent"
                                  : "⏳ Pending"}
                              </span>
                              
                              {/* Time-based urgency indicator */}
                              {getFollowupUrgency(email) && (
                                <span style={{
                                  background: getFollowupUrgency(email).bg,
                                  color: getFollowupUrgency(email).color,
                                  padding: '0.2rem 0.4rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: '600'
                                }}>
                                  {getFollowupUrgency(email).text}
                                </span>
                              )}
                            </div>
                          </td>
                          {user.admin && !isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {email.user_name || "Unknown"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredEmails.length === 0 && emailStatuses.length > 0 && (
                    <div style={{ 
                      textAlign: "center", 
                      padding: "2rem", 
                      color: "#64748b",
                      fontSize: "0.9rem"
                    }}>
                      No emails match the current filter. Try selecting a different filter option.
                    </div>
                  )}
                  
                  {emailStatuses.length ===  0 && (
                    <div style={{ 
                      textAlign: "center", 
                      padding: "3rem 2rem",
                      color: "#64748b"
                    }}>
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
                      <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem", fontSize: "1.2rem" }}>No Emails Sent Yet</h3>
                      <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                        Start by adding schools and sending your first email campaign!
                      </p>
                      <button 
                        className="modern-btn-primary"
                        onClick={() => setShowAddSchool(true)}
                        style={{ background: "#10b981" }}
                      >
                        🏫 Add Your First School
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Responded Emails Card - NEW SECTION */}
            <div className="modern-dashboard-card">
              <div className="modern-card-header">
                <div className="modern-card-title">
                  Responded Emails ({emailStatuses.filter(email => email.responded).length} responses received)
                </div>
                <div className="modern-card-icon" style={{ background: "#10b98120", color: "#10b981" }}>
                  ✅
                </div>
              </div>
              <div className="modern-card-content">
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.5rem"
                }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                    Schools that have responded to your email campaigns
                  </div>
                </div>
                
                <div style={{ 
                  maxHeight: "400px", 
                  overflowY: "auto",
                  border: "1px solid #475569",
                  borderRadius: "8px"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#475569", position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>School</span>
                        </th>
                        {!isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Email</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>
                            Original Email Date
                          </span>
                        </th>
                        {user.admin && !isMobile && (
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>
                            <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Sent By</span>
                          </th>
                        )}
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Response Status</span>
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>
                          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmails
                        .filter(email => email.responded)
                        .map((email, index) => (
                        <tr 
                          key={email.id}
                          style={{ 
                            background: index % 2 === 0 ? "rgba(16, 185, 129, 0.05)" : "rgba(16, 185, 129, 0.1)",
                            borderBottom: "1px solid #475569"
                          }}
                        >
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ color: "#f1f5f9", fontWeight: "500", fontSize: "0.9rem" }}>
                              {email.school_name}
                            </div>
                            {isMobile && (
                              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                📧 {email.school_email}
                              </div>
                            )}
                          </td>
                          {!isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {email.school_email}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem", color: "#e2e8f0", fontSize: "0.85rem" }}>
                            {new Date(email.sent_at).toLocaleDateString()}
                          </td>
                          {user.admin && !isMobile && (
                            <td style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {email.user_name || "Unknown"}
                            </td>
                          )}
                          <td style={{ padding: "0.75rem" }}>
                            <span style={{
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#10b981',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}>
                              ✅ Responded
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button
                                className="modern-btn-primary"
                                style={{ 
                                  padding: "0.35rem 0.75rem", 
                                  fontSize: "0.8rem",
                                  background: "#3b82f6"
                                }}
                                onClick={() => {
                                  // Copy email to clipboard for easy contact
                                  navigator.clipboard.writeText(email.school_email).then(() => {
                                    setStatus(`📋 Copied ${email.school_name}'s email to clipboard!`)
                                    setTimeout(() => setStatus(""), 2000)
                                  }).catch(() => {
                                    setStatus("Failed to copy email")
                                    setTimeout(() => setStatus(""), 2000)
                                  })
                                }}
                              >
                                📋 Copy Email
                              </button>
                              
                              {email.has_reply_content && (
                                <button
                                  className="modern-btn-primary"
                                  style={{ 
                                    padding: "0.35rem 0.75rem", 
                                    fontSize: "0.8rem",
                                    background: "#10b981"
                                  }}
                                  onClick={() => handleViewReply(email.id)}
                                >
                                  👁️ View Reply
                                </button>
                              )}
                              
                              <button
                                className="modern-btn-primary"
                                style={{ 
                                  padding: "0.35rem 0.75rem", 
                                  fontSize: "0.8rem",
                                  background: "#64748b"
                                }}
                                onClick={async () => {
                                  if (confirm(`Mark ${email.school_name} as no longer responded?`)) {
                                    const res = await fetch("https://psa-sales-backend.onrender.com/api/mark-responded", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${accessToken}`
                                      },
                                      body: JSON.stringify({ email_id: email.id, responded: false })
                                    })
                                    if (res.ok) {
                                      fetchEmailStatuses()
                                      setStatus(`${email.school_name} marked as not responded`)
                                      setTimeout(() => setStatus(""), 3000)
                                    }
                                  }
                                }}
                              >
                                ↩️ Unmark
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {emailStatuses.length === 0 && (
                    <div style={{ 
                      textAlign: "center", 
                      padding: "3rem 2rem",
                      color: "#64748b"
                    }}>
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💬</div>
                      <h3 style={{ color: "#f1f5f9", marginBottom: "0.5rem", fontSize: "1.2rem" }}>No Responses Yet</h3>
                      <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                        When schools respond to your emails, they'll appear here for easy tracking and follow-up.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reply Chain Modal */}
            {showReplyModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.8)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  border: '1px solid #475569',
                  borderRadius: '16px',
                  padding: '2rem',
                  maxWidth: '800px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  position: 'relative'
                }}>
                                   {/* Modal Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #475569'
                  }}>
                    <h2 style={{
                      color: '#f1f5f9',
                      fontSize: '1.5rem',
                      fontWeight: '700'
                    }}>
                      💬 Email Reply Chain
                    </h2>
                    
                    <button
                      onClick={closeReplyModal}
                      style={{
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  {loadingReply ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      🔄 Loading reply chain...
                    </div>
                  ) : selectedReply && !selectedReply.error ? (
                    <div>
                      {/* Reply Chain Header */}
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                      }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                          gap: '0.75rem',
                          color: '#94a3b8'
                        }}>
                          <div>
                            <strong style={{ color: '#f1f5f9' }}>School:</strong> {selectedReply.school_name}
                          </div>
                          <div>
                            <strong style={{ color: '#f1f5f9' }}>Email:</strong> {selectedReply.school_email}
                          </div>
                          <div>
                            <strong style={{ color: '#f1f5f9' }}>Total Replies:</strong> {selectedReply.reply_count || 0}
                          </div>
                          <div>
                            <strong style={{ color: '#f1f5f9' }}>Last Reply:</strong> {selectedReply.last_reply_date ? new Date(selectedReply.last_reply_date).toLocaleDateString() : 'None'}
                          </div>
                        </div>
                      </div>

                      {/* Show replies or old format */}
                      {selectedReply.replies && selectedReply.replies.length > 0 ? (
                        <div>
                          <h4 style={{ color: '#f1f5f9', marginBottom: '1rem' }}>
                            💬 Conversation Chain ({selectedReply.replies.length} replies):
                          </h4>
                          
                          {selectedReply.replies.map((reply, index) => (
                            <div key={reply.id} style={{
                              background: index % 2 === 0 ? '#1e293b' : '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              padding: '1.5rem',
                                                           marginBottom: '1rem'
                            }}>
                              <div style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                                <strong>Reply #{index + 1}</strong> • {new Date(reply.reply_date).toLocaleString()}
                              </div>
                              
                              <div style={{
                                background: '#0f172a',
                                border: '1px solid #475569',
                                borderRadius: '6px',
                                padding: '1rem',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                lineHeight: '1.5',
                                color: '#e2e8f0',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: '200px',
                                overflowY: 'auto'
                              }}>
                                {reply.reply_content || 'No content available'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Fallback to old single reply format
                        <div style={{
                          background: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          padding: '1.5rem',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          lineHeight: '1.5',
                          color: '#e2e8f0',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          {selectedReply.reply_content || selectedReply.content || 'No reply content available'}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '1.5rem',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => {
                            setCustomReplyData({
                              email_id: selectedReply.id,
                              school_email: selectedReply.school_email,
                              school_name: selectedReply.school_name,
                              subject: `Re: PSA Programs`,
                              message: ''
                            })
                            setShowCustomReplyModal(true)
                            setShowReplyModal(false)
                          }}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.75rem 1.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}
                        >
                          ✍️ Send Custom Reply
                        </button>
                        
                        <button
                          onClick={closeReplyModal}
                          style={{
                            background: '#64748b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.75rem 1.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : selectedReply && selectedReply.error ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: '#ef4444',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Error Loading Reply</div>
                      <div style={{ fontSize: '0.9rem' }}>{selectedReply.error}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="modern-dashboard-card">
            <div className="modern-card-content" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔐</div>
              <h2 style={{ color: "#f1f5f9", marginBottom: "1rem" }}>Authentication Required</h2>
              <p style={{ color: "#94a3b8", marginBottom: "2rem", fontSize: "1.1rem" }}>
                Please log in to access the Email Center and manage your school communications.
              </p>
              <button 
                className="modern-btn-primary"
                onClick={() => window.location.href = '/account'}
                style={{ fontSize: "1rem", padding: "1rem 2rem" }}
              >
                🔐 Login to Continue
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}