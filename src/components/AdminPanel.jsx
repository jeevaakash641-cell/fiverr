import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowLeft, BookOpen, Plus, Trash2, Eye, Download, Users, 
  BarChart3, Shield, Ban, CheckCircle, AlertTriangle, Search, 
  Filter, RefreshCw, FileText, UserCheck, UserX, Activity, Sparkles,
  LogOut, Settings as SettingsIcon, Key, Lock, UserPlus, UserMinus,
  MessageSquare, Star, MessageCircle, ThumbsUp, HelpCircle, Edit,
  Compass, Check, Tag, Layers, X, ChevronRight, ClipboardCheck, Award,
  Inbox, ExternalLink, Clock, FileQuestion, Menu, History as HistoryIcon
} from 'lucide-react'
import { 
  fetchAllUsersList, banUser, unbanUser, deleteUserAccount, deleteAllLearners,
  setUserRole, registerNewAdmin, changeUserPassword, findUserByEmail,
  recordUserActivity
} from '../utils/authStorage'
import { getAllBooks } from '../data/booksData'
import { API_BASE_URL } from '../config'
import { 
  fetchAdminHelpTopics, 
  createHelpTopic, 
  updateHelpTopic, 
  deleteHelpTopic,
  deleteAllHelpTopics,
  resetDefaultHelpTopics,
  DEFAULT_FALLBACK_TOPICS
} from '../services/helpTopicService'
import { COURSE_CATEGORIES } from '../services/courseService'
import { 
  fetchAdminContentRequests, 
  updateAdminContentRequest, 
  rejectAdminContentRequest, 
  linkExistingContentToRequest 
} from '../services/contentRequestService'
import { fetchAdminQuizzes } from '../services/quizService'
import { fetchAdminAssessments as fetchAdminBaselines } from '../services/baselineAssessmentService'
import { fetchAdminAfterAssessments } from '../services/afterAssessmentService'
import { logAdminClientEvent } from '../services/adminAuditService'

const AdminPanel = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const handleLogout = () => {
    logAdminClientEvent({
      action: 'Admin Logout',
      category: 'Security',
      targetType: 'AuthSession',
      targetId: user?.email || 'admin',
      targetName: user?.name || user?.email || 'Admin',
      result: 'Success',
      description: `Administrator ${user?.name || user?.email} logged out from Admin Portal`
    });
    logout();
    navigate('/');
  }
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'learners')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['learners', 'admins', 'topics', 'feedback', 'requests', 'stats'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])
  const [usersList, setUsersList] = useState([])
  const [booksList, setBooksList] = useState([])
  const [feedbackList, setFeedbackList] = useState([])
  const [beneficiaryFeedbackList, setBeneficiaryFeedbackList] = useState([])
  const [contentRequestsList, setContentRequestsList] = useState([])
  const [helpTopicsList, setHelpTopicsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Feedback Sub-tab & Filters
  const [feedbackSubTab, setFeedbackSubTab] = useState('beneficiary') // 'beneficiary' | 'general'
  const [beneficiarySearch, setBeneficiarySearch] = useState('')
  const [beneficiaryCourseFilter, setBeneficiaryCourseFilter] = useState('all')
  const [beneficiaryRecommendFilter, setBeneficiaryRecommendFilter] = useState('all')
  const [beneficiaryConsentFilter, setBeneficiaryConsentFilter] = useState('all')

  // Content Requests Filters & Actions
  const [requestSearch, setRequestSearch] = useState('')
  const [requestStatusFilter, setRequestStatusFilter] = useState('all')
  const [requestTypeFilter, setRequestTypeFilter] = useState('all')
  const [updatingRequestId, setUpdatingRequestId] = useState(null)
  
  // User Search & Filters
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('all')

  // Online Users Search & Filters
  const [onlineSearch, setOnlineSearch] = useState('')
  const [onlineRoleFilter, setOnlineRoleFilter] = useState('all')

  // Admin Search & Filter
  const [adminSearch, setAdminSearch] = useState('')

  // Delete All Learners State
  const [deleteAllLearnersModalOpen, setDeleteAllLearnersModalOpen] = useState(false)
  const [deleteAllLearnersConfirmText, setDeleteAllLearnersConfirmText] = useState('')
  const [deletingAllLearners, setDeletingAllLearners] = useState(false)

  // Help Topics Search & Modal State (Title only)
  const [topicSearch, setTopicSearch] = useState('')
  const [topicModalOpen, setTopicModalOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [topicFormData, setTopicFormData] = useState({ label: '' })
  const [savingTopic, setSavingTopic] = useState(false)
  const [deletingTopicId, setDeletingTopicId] = useState(null)
  const [deleteAllTopicsModalOpen, setDeleteAllTopicsModalOpen] = useState(false)
  const [deleteAllTopicsConfirmText, setDeleteAllTopicsConfirmText] = useState('')
  const [deletingAllTopics, setDeletingAllTopics] = useState(false)
  const [resetTopicsModalOpen, setResetTopicsModalOpen] = useState(false)
  const [resettingTopics, setResettingTopics] = useState(false)

  // Books Search & Filters
  const [bookSearch, setBookSearch] = useState('')
  const [bookFormatFilter, setBookFormatFilter] = useState('all')
  const [bookSubjectFilter, setBookSubjectFilter] = useState('all')

  // User Feedback Search & Filters
  const [feedbackSearch, setFeedbackSearch] = useState('')
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState('all')
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState('all')
  const [deletingFeedbackId, setDeletingFeedbackId] = useState(null)
  const [selectedBeneficiaryFeedback, setSelectedBeneficiaryFeedback] = useState(null)
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false)

  // Content Request Modal States
  const [rejectModalState, setRejectModalState] = useState({
    isOpen: false,
    requestId: null,
    reason: '',
    submitting: false
  })
  const [linkModalState, setLinkModalState] = useState({
    isOpen: false,
    request: null,
    contentType: 'quiz',
    contentId: '',
    availableOptions: [],
    loading: false,
    submitting: false
  })

  // Add Admin Form State
  const [showAddAdminForm, setShowAddAdminForm] = useState(false)
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [addingAdmin, setAddingAdmin] = useState(false)

  // Change Admin Password Form State
  const [adminPasswordForm, setAdminPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  // Notification / Feedback alert
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' })

  const showAlert = (type, message) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 4000)
  }

  // Load initial data
  const loadAdminData = async () => {
    setRefreshing(true)
    try {
      // 1. Load users
      const users = await fetchAllUsersList()
      setUsersList(users || [])

      // 2. Load books from localStorage and server
      let combinedBooks = []
      const deletedIds = new Set(JSON.parse(localStorage.getItem('deletedBookIds') || '[]'))

      try {
        const localUploaded = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
        combinedBooks = [...localUploaded]
      } catch (e) {
        console.warn('Error reading local books:', e)
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/books`)
        if (res.ok) {
          const data = await res.json()
          if (data.books && Array.isArray(data.books)) {
            const localKeys = new Set(combinedBooks.map(b => b.key || b.id))
            data.books.forEach(serverBook => {
              const sKey = serverBook.key || serverBook.id
              if (sKey && !localKeys.has(sKey) && !deletedIds.has(sKey)) {
                combinedBooks.push({
                  id: sKey,
                  key: sKey,
                  title: serverBook.title || serverBook.metadata?.title || sKey.split('/').pop(),
                  author: serverBook.author || serverBook.metadata?.author || 'One Community Ely',
                  subject: serverBook.subject || serverBook.metadata?.subject || 'Work & Life Skills',
                  class: serverBook.class || serverBook.metadata?.class || 'All',
                  type: serverBook.type || serverBook.metadata?.type || 'guide',
                  format: serverBook.format || (sKey.split('.').pop() || 'PDF').toUpperCase(),
                  fileUrl: serverBook.url || serverBook.viewUrl,
                  uploadedAt: serverBook.lastModified || serverBook.uploadedAt || new Date().toISOString()
                })
              }
            })
          }
        }
      } catch (s3Err) {
        console.warn('Error fetching S3 books list:', s3Err)
      }

      // Filter out deleted books
      const finalBooks = combinedBooks.filter(b => {
        if (b.id && deletedIds.has(b.id)) return false
        if (b.key && deletedIds.has(b.key)) return false
        if (b.title && deletedIds.has(b.title)) return false
        return true
      })

      setBooksList(finalBooks)

      // 3a. Load general user feedback
      try {
        const fbRes = await fetch(`${API_BASE_URL}/api/feedback`)
        if (fbRes.ok) {
          const fbData = await fbRes.json()
          setFeedbackList(fbData.feedback || [])
        }
      } catch (fbErr) {
        console.warn('Error reading feedback from server:', fbErr)
      }

      // 3b. Load course beneficiary feedback
      try {
        const bfData = await fetchAdminFeedbackList({}, user)
        setBeneficiaryFeedbackList(bfData || [])
      } catch (bfErr) {
        console.warn('Error reading beneficiary feedback from server:', bfErr)
      }

      // 3c. Load learner content requests (quizzes & assessments)
      try {
        const crData = await fetchAdminContentRequests({}, user)
        setContentRequestsList(crData || [])
      } catch (crErr) {
        console.warn('Error reading content requests from server:', crErr)
      }

      // 4. Load Help Topics for learner dropdown
      try {
        const topics = await fetchAdminHelpTopics(user)
        setHelpTopicsList(topics && topics.length > 0 ? topics : DEFAULT_FALLBACK_TOPICS)
      } catch (tErr) {
        console.warn('Error loading help topics:', tErr)
        setHelpTopicsList(DEFAULT_FALLBACK_TOPICS)
      }
    } catch (err) {
      console.error('Error loading admin data:', err)
      showAlert('error', 'Failed to refresh data: ' + err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/admin-login')
      return
    }
    if (user.userType !== 'teacher') {
      alert('Access denied. The Admin Portal is restricted to administrators.')
      navigate('/dashboard')
      return
    }
    recordUserActivity(user.email)
    loadAdminData()
  }, [user, navigate])

  // Real-Time Online Status Check (Active within last 15 minutes or currently authenticated session)
  const isUserOnline = (userData) => {
    if (!userData) return false
    if (user?.email && userData.email?.toLowerCase() === user.email.toLowerCase()) return true
    if (!userData.lastActiveAt) return false
    const diffMinutes = (Date.now() - new Date(userData.lastActiveAt).getTime()) / (1000 * 60)
    return diffMinutes <= 15
  }

  // Ban / Unban user action
  const handleBanToggle = async (targetUser) => {
    const isBanned = targetUser.isBanned || targetUser.status === 'banned'
    const confirmMsg = isBanned 
      ? `Are you sure you want to restore and UNBAN ${targetUser.name || targetUser.email}?` 
      : `Are you sure you want to BAN ${targetUser.name || targetUser.email}? They will be immediately blocked from logging in.`
    
    if (!window.confirm(confirmMsg)) return

    try {
      if (isBanned) {
        await unbanUser(targetUser.email)
        showAlert('success', `Learner ${targetUser.name || targetUser.email} has been unbanned.`)
      } else {
        await banUser(targetUser.email, 'Banned by Administrator via Live Admin Portal')
        showAlert('success', `Learner ${targetUser.name || targetUser.email} has been banned.`)
      }
      loadAdminData()
    } catch (err) {
      showAlert('error', 'Action failed: ' + err.message)
    }
  }

  // Delete User Account
  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`⚠️ DANGER: Permanently delete account for "${targetUser.name || targetUser.email}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteUserAccount(targetUser.email)
      showAlert('success', `Account for ${targetUser.name || targetUser.email} was permanently deleted.`)
      loadAdminData()
    } catch (err) {
      showAlert('error', 'Failed to delete user: ' + err.message)
    }
  }

  // Role Toggle (Learner <-> Admin)
  const handleRoleToggle = async (targetUser) => {
    const isTeacher = targetUser.userType === 'teacher'
    const newRole = isTeacher ? 'student' : 'teacher'
    const actionName = isTeacher ? 'demote to Learner' : 'promote to Administrator'

    if (!window.confirm(`Are you sure you want to ${actionName} for "${targetUser.name || targetUser.email}"?`)) {
      return
    }

    try {
      await setUserRole(targetUser.email, newRole)
      showAlert('success', `Role for ${targetUser.name || targetUser.email} updated to ${newRole === 'teacher' ? 'Administrator' : 'Learner'}.`)
      loadAdminData()
    } catch (err) {
      showAlert('error', 'Failed to update role: ' + err.message)
    }
  }

  // Create New Admin Account
  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
      showAlert('error', 'All fields are required to register an administrator.')
      return
    }
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      showAlert('error', 'Passwords do not match.')
      return
    }
    if (newAdminForm.password.length < 6) {
      showAlert('error', 'Password must be at least 6 characters long.')
      return
    }

    setAddingAdmin(true)
    try {
      await registerNewAdmin({
        name: newAdminForm.name.trim(),
        email: newAdminForm.email.trim(),
        password: newAdminForm.password
      })
      showAlert('success', `Administrator account for ${newAdminForm.name} created successfully!`)
      setNewAdminForm({ name: '', email: '', password: '', confirmPassword: '' })
      setShowAddAdminForm(false)
      loadAdminData()
    } catch (err) {
      showAlert('error', err.message || 'Failed to create administrator account.')
    } finally {
      setAddingAdmin(false)
    }
  }

  // Delete Feedback Action
  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm('Delete this user feedback entry permanently?')) return

    setDeletingFeedbackId(feedbackId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback/${feedbackId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to delete feedback')
      }
      setFeedbackList(prev => prev.filter(f => f.id !== feedbackId))
      showAlert('success', 'Feedback entry removed.')
    } catch (err) {
      showAlert('error', err.message || 'Failed to delete feedback entry.')
    } finally {
      setDeletingFeedbackId(null)
    }
  }

  // --- Help Topics Actions (Add / Edit / Delete - Title Only) ---
  const handleOpenCreateTopic = () => {
    setEditingTopic(null)
    setTopicFormData({ label: '' })
    setTopicModalOpen(true)
  }

  const handleOpenEditTopic = (topic) => {
    setEditingTopic(topic)
    setTopicFormData({ label: topic.label || '' })
    setTopicModalOpen(true)
  }

  const handleSaveTopic = async (e) => {
    e.preventDefault()
    if (!topicFormData.label.trim()) {
      showAlert('error', 'Topic title is required')
      return
    }

    setSavingTopic(true)
    try {
      const payload = {
        label: topicFormData.label.trim(),
        category: editingTopic?.category || 'Other',
        description: editingTopic?.description || '',
        keywords: editingTopic?.keywords || [],
        orderIndex: editingTopic?.orderIndex ?? helpTopicsList.length,
        isActive: true
      }

      if (editingTopic) {
        const updated = await updateHelpTopic(editingTopic.topicId, payload, user)
        setHelpTopicsList(prev => prev.map(t => t.topicId === updated.topicId ? updated : t))
        showAlert('success', `Topic "${updated.label}" updated successfully!`)
      } else {
        const created = await createHelpTopic(payload, user)
        setHelpTopicsList(prev => [...prev, created])
        showAlert('success', `New topic "${created.label}" added to learner dropdown!`)
      }

      setTopicModalOpen(false)
      setEditingTopic(null)
    } catch (err) {
      showAlert('error', err.message || 'Failed to save help topic')
    } finally {
      setSavingTopic(false)
    }
  }

  const handleDeleteTopic = async (topic) => {
    if (!window.confirm(`Are you sure you want to delete "${topic.label}" from the learner dropdown options?`)) {
      return
    }

    setDeletingTopicId(topic.topicId)
    try {
      await deleteHelpTopic(topic.topicId, user)
      setHelpTopicsList(prev => prev.filter(t => t.topicId !== topic.topicId))
      showAlert('success', `Topic "${topic.label}" deleted from learner dropdown.`)
    } catch (err) {
      showAlert('error', err.message || 'Failed to delete help topic')
    } finally {
      setDeletingTopicId(null)
    }
  }

  // Delete All Learners
  const handleConfirmDeleteAllLearners = async () => {
    if (deleteAllLearnersConfirmText.trim().toLowerCase() !== 'delete') {
      showAlert('error', 'Please type DELETE to confirm.')
      return
    }
    setDeletingAllLearners(true)
    try {
      await deleteAllLearners()
      showAlert('success', 'All learner accounts have been permanently deleted.')
      setDeleteAllLearnersModalOpen(false)
      setDeleteAllLearnersConfirmText('')
      loadAdminData()
    } catch (err) {
      showAlert('error', 'Failed to delete learners: ' + err.message)
    } finally {
      setDeletingAllLearners(false)
    }
  }

  // Delete All Topics
  const handleConfirmDeleteAllTopics = async () => {
    if (deleteAllTopicsConfirmText.trim().toLowerCase() !== 'delete') {
      showAlert('error', 'Please type DELETE to confirm.')
      return
    }
    setDeletingAllTopics(true)
    try {
      await deleteAllHelpTopics(user)
      setHelpTopicsList([])
      showAlert('success', 'All learner dropdown topics have been deleted.')
      setDeleteAllTopicsModalOpen(false)
      setDeleteAllTopicsConfirmText('')
    } catch (err) {
      showAlert('error', 'Failed to delete all topics: ' + err.message)
    } finally {
      setDeletingAllTopics(false)
    }
  }

  // Reset Default Topics
  const handleConfirmResetTopics = async () => {
    setResettingTopics(true)
    try {
      const defaults = await resetDefaultHelpTopics(user)
      setHelpTopicsList(defaults)
      showAlert('success', 'Learner dropdown topics reset to default requirements.')
      setResetTopicsModalOpen(false)
    } catch (err) {
      showAlert('error', 'Failed to reset topics: ' + err.message)
    } finally {
      setResettingTopics(false)
    }
  }

  // Metrics Calculations
  const totalUsers = usersList.length
  const totalLearners = usersList.filter(u => u.userType !== 'teacher').length
  const totalAdmins = usersList.filter(u => u.userType === 'teacher').length
  const totalBanned = usersList.filter(u => u.isBanned || u.status === 'banned').length
  const totalOnline = usersList.filter(u => isUserOnline(u) && !u.isBanned && u.status !== 'banned').length
  const totalBooks = booksList.length
  const totalFeedback = feedbackList.length
  const totalBeneficiaryFeedback = beneficiaryFeedbackList.length
  const pendingRequestsCount = contentRequestsList.filter(r => r.status === 'pending').length

  // Action handlers for Content Requests & Beneficiary Feedback
  const handleUpdateRequestStatus = async (requestId, newStatus) => {
    setUpdatingRequestId(requestId)
    try {
      await updateAdminContentRequest(requestId, newStatus, user)
      showAlert('success', `Request marked as ${newStatus}.`)
      loadAdminData()
    } catch (err) {
      showAlert('error', 'Failed to update request: ' + err.message)
    } finally {
      setUpdatingRequestId(null)
    }
  }

  const handleOpenRejectModal = (requestId) => {
    setRejectModalState({
      isOpen: true,
      requestId,
      reason: '',
      submitting: false
    })
  }

  const handleConfirmReject = async () => {
    if (!rejectModalState.requestId) return
    setRejectModalState(prev => ({ ...prev, submitting: true }))
    try {
      await rejectAdminContentRequest(rejectModalState.requestId, rejectModalState.reason || 'Content request rejected by administrator', user)
      showAlert('success', 'Content request rejected and learner notified.')
      setRejectModalState({ isOpen: false, requestId: null, reason: '', submitting: false })
      loadAdminData()
    } catch (err) {
      showAlert('error', 'Failed to reject request: ' + err.message)
      setRejectModalState(prev => ({ ...prev, submitting: false }))
    }
  }

  const handleOpenLinkModal = async (req) => {
    const defaultType = req.requestType === 'after_assessment' ? 'after_assessment' : (req.requestType === 'baseline_assessment' || req.requestType === 'assessment') ? 'baseline_assessment' : 'quiz'
    setLinkModalState({
      isOpen: true,
      request: req,
      contentType: defaultType,
      contentId: '',
      availableOptions: [],
      loading: true,
      submitting: false
    })

    try {
      let options = []
      if (defaultType === 'quiz') {
        const quizzes = await fetchAdminQuizzes({ courseId: req.courseId }, user).catch(() => [])
        options = (quizzes || []).map(q => ({ id: q.quizId, title: q.title || 'Untitled Quiz', status: q.status }))
      } else if (defaultType === 'baseline_assessment') {
        const baselines = await fetchAdminBaselines({ courseId: req.courseId }, user).catch(() => [])
        options = (baselines || []).map(b => ({ id: b.assessmentId, title: b.title || 'Untitled Baseline', status: b.status }))
      } else {
        const afters = await fetchAdminAfterAssessments({ courseId: req.courseId }, user).catch(() => [])
        options = (afters || []).map(a => ({ id: a.assessmentId, title: a.title || 'Untitled After Assessment', status: a.status }))
      }
      setLinkModalState(prev => ({
        ...prev,
        availableOptions: options,
        contentId: options[0]?.id || '',
        loading: false
      }))
    } catch (err) {
      setLinkModalState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleContentTypeChangeInLinkModal = async (newType) => {
    if (!linkModalState.request) return
    setLinkModalState(prev => ({ ...prev, contentType: newType, loading: true, availableOptions: [], contentId: '' }))
    try {
      let options = []
      const cid = linkModalState.request.courseId
      if (newType === 'quiz') {
        const quizzes = await fetchAdminQuizzes({ courseId: cid }, user).catch(() => [])
        options = (quizzes || []).map(q => ({ id: q.quizId, title: q.title || 'Untitled Quiz', status: q.status }))
      } else if (newType === 'baseline_assessment') {
        const baselines = await fetchAdminBaselines({ courseId: cid }, user).catch(() => [])
        options = (baselines || []).map(b => ({ id: b.assessmentId, title: b.title || 'Untitled Baseline', status: b.status }))
      } else {
        const afters = await fetchAdminAfterAssessments({ courseId: cid }, user).catch(() => [])
        options = (afters || []).map(a => ({ id: a.assessmentId, title: a.title || 'Untitled After Assessment', status: a.status }))
      }
      setLinkModalState(prev => ({
        ...prev,
        availableOptions: options,
        contentId: options[0]?.id || '',
        loading: false
      }))
    } catch (err) {
      setLinkModalState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleConfirmLink = async () => {
    if (!linkModalState.request || !linkModalState.contentId) {
      showAlert('error', 'Please select a content item to link.')
      return
    }
    setLinkModalState(prev => ({ ...prev, submitting: true }))
    try {
      await linkExistingContentToRequest(linkModalState.request.requestId, {
        contentType: linkModalState.contentType,
        contentId: linkModalState.contentId
      }, user)
      showAlert('success', 'Content successfully linked and request marked fulfilled!')
      setLinkModalState({ isOpen: false, request: null, contentType: 'quiz', contentId: '', availableOptions: [], loading: false, submitting: false })
      loadAdminData()
    } catch (err) {
      showAlert('error', 'Failed to link content: ' + err.message)
      setLinkModalState(prev => ({ ...prev, submitting: false }))
    }
  }

  const handleWithdrawConsent = async (feedbackItem) => {
    const reason = window.prompt(
      `Enter reason for administrative consent withdrawal for ${feedbackItem.learnerName || 'Learner'}:`,
      'Learner requested consent withdrawal or Safeguarding review'
    )
    if (reason === null) return
    try {
      await recordAdminConsentWithdrawal(feedbackItem.feedbackId, reason, user)
      showAlert('success', 'Consent successfully withdrawn. Testimonial is now restricted from public display.')
      loadAdminData()
    } catch (err) {
      showAlert('error', 'Failed to withdraw consent: ' + err.message)
    }
  }

  // Filtered Learners List
  const filteredLearners = usersList
    .filter(u => u.userType !== 'teacher')
    .filter(u => {
      const isBanned = u.isBanned || u.status === 'banned'
      if (userStatusFilter === 'active') return !isBanned
      if (userStatusFilter === 'banned') return isBanned
      return true
    })
    .filter(u => {
      if (!userSearch) return true
      return (
        (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    })

  // Filtered Admins List
  const filteredAdmins = usersList
    .filter(u => u.userType === 'teacher')
    .filter(u => {
      if (!adminSearch) return true
      return (
        (u.name || '').toLowerCase().includes(adminSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(adminSearch.toLowerCase())
      )
    })

  // Filtered Online Users List (Live Active Sessions)
  const filteredOnlineUsers = usersList
    .filter(u => isUserOnline(u) && !u.isBanned && u.status !== 'banned')
    .filter(u => {
      if (onlineRoleFilter === 'learner') return u.userType !== 'teacher'
      if (onlineRoleFilter === 'admin') return u.userType === 'teacher'
      return true
    })
    .filter(u => {
      if (!onlineSearch) return true
      const q = onlineSearch.toLowerCase()
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.generalLocation || '').toLowerCase().includes(q) ||
        (u.learningInterests || '').toLowerCase().includes(q)
      )
    })

  // Filtered Help Topics List
  const filteredHelpTopics = helpTopicsList.filter(t => {
    if (!topicSearch) return true
    return (
      (t.label || '').toLowerCase().includes(topicSearch.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(topicSearch.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(topicSearch.toLowerCase())
    )
  })

  // Filtered Feedback List
  const filteredFeedback = feedbackList.filter(f => {
    const matchesSearch = 
      (f.userName || '').toLowerCase().includes(feedbackSearch.toLowerCase()) ||
      (f.userEmail || '').toLowerCase().includes(feedbackSearch.toLowerCase()) ||
      (f.message || '').toLowerCase().includes(feedbackSearch.toLowerCase()) ||
      (f.category || '').toLowerCase().includes(feedbackSearch.toLowerCase())

    const matchesRating = feedbackRatingFilter === 'all' || Number(f.rating) === Number(feedbackRatingFilter)
    const matchesCategory = feedbackCategoryFilter === 'all' || (f.category || '').toLowerCase() === feedbackCategoryFilter.toLowerCase()

    return matchesSearch && matchesRating && matchesCategory
  })

  // Filtered Beneficiary Course Feedback List
  const filteredBeneficiaryFeedback = beneficiaryFeedbackList.filter(f => {
    const matchesSearch = 
      (f.learnerName || '').toLowerCase().includes(beneficiarySearch.toLowerCase()) ||
      (f.learnerEmail || '').toLowerCase().includes(beneficiarySearch.toLowerCase()) ||
      (f.courseTitle || '').toLowerCase().includes(beneficiarySearch.toLowerCase()) ||
      (f.testimonial || '').toLowerCase().includes(beneficiarySearch.toLowerCase()) ||
      (f.supportGains || '').toLowerCase().includes(beneficiarySearch.toLowerCase())

    const matchesCourse = beneficiaryCourseFilter === 'all' || f.courseId === beneficiaryCourseFilter
    const ratingVal = Number(f.recommendRating || f.rating || 0)
    const matchesRecommend = beneficiaryRecommendFilter === 'all' || 
      (beneficiaryRecommendFilter === 'high' && ratingVal >= 4) ||
      (beneficiaryRecommendFilter === 'low' && ratingVal > 0 && ratingVal < 4)
    const matchesConsent = beneficiaryConsentFilter === 'all' ||
      (beneficiaryConsentFilter === 'granted' && f.consentGranted) ||
      (beneficiaryConsentFilter === 'withdrawn' && !f.consentGranted)

    return matchesSearch && matchesCourse && matchesRecommend && matchesConsent
  })

  // Filtered Content Requests List
  const filteredContentRequests = contentRequestsList.filter(r => {
    const matchesSearch =
      (r.courseTitle || '').toLowerCase().includes(requestSearch.toLowerCase()) ||
      (r.learnerName || '').toLowerCase().includes(requestSearch.toLowerCase()) ||
      (r.learnerEmail || '').toLowerCase().includes(requestSearch.toLowerCase()) ||
      (r.requestType || '').toLowerCase().includes(requestSearch.toLowerCase()) ||
      (r.note || '').toLowerCase().includes(requestSearch.toLowerCase())

    const matchesStatus = requestStatusFilter === 'all' || r.status === requestStatusFilter
    const matchesType = requestTypeFilter === 'all' || r.requestType === requestTypeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  // Beneficiary Feedback KPI Metrics
  const beneficiaryMetrics = useMemo(() => {
    const total = beneficiaryFeedbackList.length
    const recommendYes = beneficiaryFeedbackList.filter(f => f.wouldRecommend === 'yes' || Number(f.recommendRating || f.rating) >= 4).length
    const recommendPercent = total > 0 ? Math.round((recommendYes / total) * 100) : 0
    const namedConsent = beneficiaryFeedbackList.filter(f => (f.testimonialConsent === 'named' || f.consentType === 'named' || (!f.consentWithdrawn && f.consentGranted && !f.isAnonymous))).length
    const anonConsent = beneficiaryFeedbackList.filter(f => (f.testimonialConsent === 'anonymous' || f.consentType === 'anonymous' || (!f.consentWithdrawn && f.consentGranted && f.isAnonymous))).length
    const withdrawnConsent = beneficiaryFeedbackList.filter(f => f.consentWithdrawn || f.consentGranted === false).length

    return { total, recommendPercent, namedConsent, anonConsent, withdrawnConsent }
  }, [beneficiaryFeedbackList])

  // Unique course list from beneficiary feedback for filter dropdown
  const uniqueBeneficiaryCourses = Array.from(
    new Map(beneficiaryFeedbackList.filter(f => f.courseId).map(f => [f.courseId, f.courseTitle || f.courseId])).entries()
  ).map(([courseId, courseTitle]) => ({ courseId, courseTitle }))

  const tabs = [
    { id: 'learners', name: 'Manage Learners', icon: Users, count: totalLearners },
    { id: 'online', name: 'Online Users Live', icon: Activity, count: totalOnline },
    { id: 'admins', name: 'Manage Admins', icon: Shield, count: totalAdmins },
    { id: 'topics', name: 'Help Topics (Learner Dropdown)', icon: HelpCircle, count: helpTopicsList.length },
    { id: 'requests', name: 'Content Requests', icon: Inbox, count: pendingRequestsCount },
    { id: 'stats', name: 'Analytics & System', icon: BarChart3 }
  ]

  const adminNavModules = [
    { to: '/admin/courses', label: 'Courses', icon: BookOpen, color: 'text-emerald-800', bg: 'bg-emerald-50 hover:bg-emerald-100', border: 'border-emerald-200' },
    { to: '/admin/quizzes', label: 'Quizzes', icon: HelpCircle, color: 'text-purple-700', bg: 'bg-purple-50 hover:bg-purple-100', border: 'border-purple-200' },
    { to: '/admin/baseline-assessments', label: 'Baseline', icon: ClipboardCheck, color: 'text-teal-800', bg: 'bg-teal-50 hover:bg-teal-100', border: 'border-teal-200' },
    { to: '/admin/after-assessments', label: 'After Assessment', icon: Award, color: 'text-cyan-800', bg: 'bg-cyan-50 hover:bg-cyan-100', border: 'border-cyan-200' },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-amber-900', bg: 'bg-amber-50 hover:bg-amber-100', border: 'border-amber-200', isTab: true },
    { to: '/admin/certificates', label: 'Certificates', icon: Award, color: 'text-blue-900', bg: 'bg-blue-50 hover:bg-blue-100', border: 'border-blue-200' },
    { to: '/admin/impact-reports', label: 'Impact Reports', icon: BarChart3, color: 'text-[#1b5e4d]', bg: 'bg-emerald-50 hover:bg-emerald-100', border: 'border-emerald-200' },
    { to: '/admin/evidence', label: 'Evidence Library', icon: Layers, color: 'text-teal-900', bg: 'bg-teal-50 hover:bg-teal-100', border: 'border-teal-200' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-xs border-b sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 cursor-pointer"
              title="Toggle Menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link to="/admin-panel" className="flex items-center space-x-3">
              <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} className="shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base md:text-lg font-black text-gray-900 whitespace-nowrap">
                    Admin Portal
                  </h1>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200 whitespace-nowrap">
                    Live Control
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 whitespace-nowrap hidden sm:block">One Community Ely Training Centre Database & Resources</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-xs font-bold disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Refresh Database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#23735F]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/upload-books"
              className="px-3 py-1.5 bg-[#23735F] hover:bg-[#1b5c4c] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Upload Books & Materials"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Upload Book</span>
            </Link>

            <Link
              to="/dashboard"
              className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <Compass className="h-3.5 w-3.5 text-[#23735F]" />
              <span>Learner View</span>
            </Link>

            <Link
              to="/admin/history"
              className="px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              title="Admin Activity History"
            >
              <HistoryIcon className="h-3.5 w-3.5 text-blue-700" />
              <span className="hidden sm:inline">History</span>
            </Link>

            <Link
              to="/admin-settings"
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors text-xs font-bold inline-flex items-center gap-1.5"
              title="Admin Settings"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Settings</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl transition-colors text-xs font-bold border border-red-200 cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      {alertInfo.message && (
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 pt-4">
          <div className={`p-4 rounded-xl shadow-md border flex items-center space-x-3 animate-fade-in ${
            alertInfo.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {alertInfo.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{alertInfo.message}</p>
          </div>
        </div>
      )}

      {/* Main Layout (Left Sidebar + Main Content) */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 flex flex-col lg:flex-row items-start gap-6">
        {/* ======================================================== */}
        {/* LEFT SIDEBAR NAVIGATION */}
        {/* ======================================================== */}
        <aside className={`w-full lg:w-64 xl:w-72 shrink-0 space-y-6 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
          {/* Section 1: Core Modules (User Requested Pills on Left Side) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-gray-100">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                Curriculum & Modules
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                8 Modules
              </span>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              {adminNavModules.map((item) => {
                const Icon = item.icon
                const isCurrentActiveTab = item.isTab && activeTab === item.id

                if (item.isTab) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-xs font-bold ${
                        isCurrentActiveTab 
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                          : `${item.bg} ${item.border} ${item.color} shadow-2xs hover:shadow-xs`
                      } group cursor-pointer text-left`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 transition-all ${isCurrentActiveTab ? 'text-white' : 'opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-xs font-bold ${item.bg} ${item.border} ${item.color} shadow-2xs hover:shadow-xs group`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Section 2: Platform Controls & Quick Switchers */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-2">
            <div className="px-1 pb-1 border-b border-gray-100">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                Portal Management
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#23735F] text-white shadow-xs'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <span>{tab.name}</span>
                    </div>
                    {tab.count !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* MAIN DASHBOARD CONTENT AREA */}
        {/* ======================================================== */}
        <main className="flex-1 min-w-0 w-full space-y-6">
        {/* Real-Time Database Metrics Cards - Interactive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5 mb-8">
          <div 
            onClick={() => setActiveTab('learners')} 
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center relative overflow-hidden cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
            <Users className="h-6 w-6 text-indigo-600 mx-auto mb-1.5" />
            <h3 className="text-xl font-bold text-gray-900">{totalUsers}</h3>
            <p className="text-xs text-gray-500 font-medium">Total Users</p>
          </div>

          <div 
            onClick={() => setActiveTab('online')} 
            className={`bg-white p-4 rounded-xl shadow-sm border text-center relative overflow-hidden cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'online' ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-md' : 'border-gray-200 hover:border-emerald-400'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <Activity className="h-6 w-6 text-emerald-600" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
            </div>
            <h3 className="text-xl font-bold text-emerald-950">{totalOnline}</h3>
            <p className="text-xs text-emerald-700 font-semibold">Online Live</p>
          </div>

          <div 
            onClick={() => setActiveTab('learners')} 
            className={`bg-white p-4 rounded-xl shadow-sm border text-center relative overflow-hidden cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'learners' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-400'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
            <UserCheck className="h-6 w-6 text-blue-600 mx-auto mb-1.5" />
            <h3 className="text-xl font-bold text-gray-900">{totalLearners}</h3>
            <p className="text-xs text-gray-500 font-medium">Learners</p>
          </div>

          <div 
            onClick={() => setActiveTab('admins')} 
            className={`bg-white p-4 rounded-xl shadow-sm border text-center relative overflow-hidden cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'admins' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-400'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500"></div>
            <Shield className="h-6 w-6 text-purple-600 mx-auto mb-1.5" />
            <h3 className="text-xl font-bold text-purple-900">{totalAdmins}</h3>
            <p className="text-xs text-purple-700 font-semibold">Admins</p>
          </div>

          <div 
            onClick={() => setActiveTab('topics')} 
            className={`bg-white p-4 rounded-xl shadow-sm border text-center relative overflow-hidden cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'topics' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-emerald-400'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
            <HelpCircle className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
            <h3 className="text-xl font-bold text-gray-900">{helpTopicsList.length}</h3>
            <p className="text-xs text-emerald-700 font-semibold">Help Topics</p>
          </div>

          <div 
            onClick={() => setActiveTab('feedback')} 
            className={`bg-white p-4 rounded-xl shadow-sm border text-center relative overflow-hidden cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'feedback' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-gray-200 hover:border-amber-400'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            <MessageSquare className="h-6 w-6 text-amber-600 mx-auto mb-1.5" />
            <h3 className="text-xl font-bold text-gray-900">{totalBeneficiaryFeedback + totalFeedback}</h3>
            <p className="text-xs text-amber-700 font-semibold" title={`${totalBeneficiaryFeedback} Course Reviews • ${totalFeedback} Site Feedback`}>
              {totalBeneficiaryFeedback} Course • {totalFeedback} Site
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('requests')} 
            className={`bg-white p-4 rounded-xl shadow-sm border text-center relative overflow-hidden cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'requests' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-400'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500"></div>
            <Inbox className="h-6 w-6 text-purple-600 mx-auto mb-1.5" />
            <h3 className="text-xl font-bold text-purple-900">{pendingRequestsCount}</h3>
            <p className="text-xs text-purple-700 font-semibold" title={`${pendingRequestsCount} pending requests out of ${contentRequestsList.length} total`}>
              Content Requests
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: MANAGE LEARNERS (STUDENTS) */}
        {/* ======================================================== */}
        {activeTab === 'learners' && (
          <div className="space-y-6">
            {/* Search and Filters Card */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by learner name or email address..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Account Status:</span>
                    <select
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-indigo-500 outline-none"
                    >
                      <option value="all">All Learners ({totalLearners})</option>
                      <option value="active">Active Accounts</option>
                      <option value="banned">Banned Accounts ({usersList.filter(u => u.userType !== 'teacher' && (u.isBanned || u.status === 'banned')).length})</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Learners Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Learner Accounts ({filteredLearners.length})
                </h3>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => { setDeleteAllLearnersConfirmText(''); setDeleteAllLearnersModalOpen(true); }}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Permanently delete all learner accounts (administrator accounts are strictly preserved)"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span>Delete All Learners</span>
                  </button>
                  <span className="text-xs text-gray-500 hidden sm:inline">Live synchronized with client & DynamoDB</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-600 border-b">
                    <tr>
                      <th className="px-6 py-3.5">Learner</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Account Status</th>
                      <th className="px-6 py-3.5">Activity Status</th>
                      <th className="px-6 py-3.5">Registered</th>
                      <th className="px-6 py-3.5 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLearners.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-gray-500">
                          <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="font-medium">No learners found matching your search or filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLearners.map((u) => {
                        const isBanned = u.isBanned || u.status === 'banned'
                        const isOnline = isUserOnline(u) && !isBanned

                        return (
                          <tr key={u.email} className={`hover:bg-gray-50/80 transition-colors ${isBanned ? 'bg-red-50/40' : ''}`}>
                            {/* User Info */}
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0 ${
                                  isBanned ? 'bg-red-500' : 'bg-indigo-600'
                                }`}>
                                  {(u.name || u.email || 'L').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">
                                    {u.name || 'Anonymous Learner'}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                                🎓 Learner
                              </span>
                            </td>

                            {/* Status (Active / Banned) */}
                            <td className="px-6 py-4">
                              {isBanned ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                  <Ban className="h-3.5 w-3.5 text-red-600" />
                                  Banned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                  Active
                                </span>
                              )}
                            </td>

                            {/* Activity */}
                            <td className="px-6 py-4 text-xs">
                              {isOnline ? (
                                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Online Now</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">
                                  {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : 'Offline'}
                                </span>
                              )}
                            </td>

                            {/* Registered */}
                            <td className="px-6 py-4 text-xs text-gray-500">
                              {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : 'N/A'}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {/* Ban / Unban Toggle */}
                                <button
                                  onClick={() => handleBanToggle(u)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                                    isBanned
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                  }`}
                                  title={isBanned ? 'Unban Learner' : 'Ban Learner'}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>{isBanned ? 'Unban' : 'Ban'}</span>
                                </button>

                                {/* Delete User */}
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete User from Database"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: ONLINE USERS LIVE (DEDICATED VIEW) */}
        {/* ======================================================== */}
        {activeTab === 'online' && (
          <div className="space-y-6">
            {/* Live Status Header & Search */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={onlineSearch}
                    onChange={(e) => setOnlineSearch(e.target.value)}
                    placeholder="Search online users by name, email, location or interest..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>

                {/* Role Filter & Counter */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Role:</span>
                    <select
                      value={onlineRoleFilter}
                      onChange={(e) => setOnlineRoleFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-emerald-500 outline-none font-medium"
                    >
                      <option value="all">All Online Users ({usersList.filter(u => isUserOnline(u) && !u.isBanned && u.status !== 'banned').length})</option>
                      <option value="learner">Online Learners ({usersList.filter(u => isUserOnline(u) && u.userType !== 'teacher' && !u.isBanned && u.status !== 'banned').length})</option>
                      <option value="admin">Online Admins ({usersList.filter(u => isUserOnline(u) && u.userType === 'teacher' && !u.isBanned && u.status !== 'banned').length})</option>
                    </select>
                  </div>

                  <button
                    onClick={loadAdminData}
                    disabled={refreshing}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-bold border border-emerald-200 cursor-pointer"
                    title="Live Heartbeat Refresh"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-700' : ''}`} />
                    <span>Live Sync</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Online Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <Activity className="h-5 w-5 text-emerald-700" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute -top-0.5 -right-0.5" />
                  </div>
                  <h3 className="font-extrabold text-emerald-950 flex items-center gap-2 text-sm md:text-base">
                    Live Online Users ({filteredOnlineUsers.length})
                  </h3>
                </div>
                <span className="text-xs text-emerald-800 font-semibold bg-white/80 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                  🟢 Real-Time Active Sessions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-600 border-b">
                    <tr>
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Location / Interest</th>
                      <th className="px-6 py-3.5">Session Status</th>
                      <th className="px-6 py-3.5">Authentication</th>
                      <th className="px-6 py-3.5 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOnlineUsers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-gray-500">
                          <Activity className="h-10 w-10 text-emerald-300 mx-auto mb-2" />
                          <p className="font-bold text-gray-700 text-base">No Users Currently Online</p>
                          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                            When learners or administrators log in and browse lessons, courses, or portals, their live active sessions will be displayed here in real time.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredOnlineUsers.map((u) => {
                        const isAdmin = u.userType === 'teacher' || u.role === 'admin' || u.email?.toLowerCase() === 'admin@onecommunityely.com'
                        const isBanned = u.isBanned || u.status === 'banned'
                        const isCurrentUser = user?.email && u.email?.toLowerCase() === user.email.toLowerCase()

                        return (
                          <tr key={u.email} className="hover:bg-emerald-50/40 transition-colors">
                            {/* User Info */}
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="relative flex-shrink-0">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs ${
                                    isAdmin ? 'bg-purple-600 ring-2 ring-purple-300' : 'bg-emerald-600 ring-2 ring-emerald-300'
                                  }`}>
                                    {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-xs" title="Online Live" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                                    <span>{u.name || (isAdmin ? 'Ely Admin' : 'Learner')}</span>
                                    {isCurrentUser && (
                                      <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-6 py-4">
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-purple-50 text-purple-700 border-purple-200">
                                  🛡️ Administrator
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                                  🎓 Learner
                                </span>
                              )}
                            </td>

                            {/* Location / Interest */}
                            <td className="px-6 py-4 text-xs">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-gray-800">
                                  {u.generalLocation ? `📍 ${u.generalLocation}` : '📍 Ely Area'}
                                </div>
                                {u.learningInterests && (
                                  <div className="text-[11px] text-gray-500 truncate max-w-[180px]">
                                    {Array.isArray(u.learningInterests) ? u.learningInterests.join(', ') : u.learningInterests}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Session Status */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                <span>Active Now</span>
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {u.lastActiveAt ? `Last ping: ${new Date(u.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Current session'}
                              </div>
                            </td>

                            {/* Authentication */}
                            <td className="px-6 py-4 text-xs">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700">
                                {u.provider === 'google' ? 'Google Auth' : 'Email / Password'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <a
                                  href={`mailto:${u.email}`}
                                  className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Send Email"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </a>

                                {!isAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleBanToggle(u)}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                                        isBanned
                                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                          : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                      }`}
                                      title={isBanned ? 'Unban Learner' : 'Ban Learner'}
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      <span>{isBanned ? 'Unban' : 'Ban'}</span>
                                    </button>

                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete User from Database"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MANAGE ADMINS SEPARATELY */}
        {/* ======================================================== */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            {/* Header & Add Admin Toggle */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  System Administrators ({totalAdmins})
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Manage administrators with full access to user management, book uploads, and system controls.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddAdminForm(!showAddAdminForm)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors text-sm font-semibold shadow-sm cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{showAddAdminForm ? 'Close Form' : 'Add New Admin'}</span>
                </button>
              </div>
            </div>

            {/* Add New Admin Form (Collapsible) */}
            {showAddAdminForm && (
              <div className="bg-white p-6 rounded-xl shadow-md border-2 border-purple-200 animate-fade-in">
                <h4 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-purple-600" />
                  Create New Administrator Account
                </h4>
                <p className="text-xs text-gray-500 mb-5">
                  Enter the credentials for the new administrator. They will be granted full administrative authority.
                </p>

                <form onSubmit={handleCreateAdmin} className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Admin Full Name *</label>
                      <input
                        type="text"
                        value={newAdminForm.name}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Admin Email Address *</label>
                      <input
                        type="email"
                        value={newAdminForm.email}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                        placeholder="admin.new@onecommunityely.com"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password *</label>
                      <input
                        type="password"
                        value={newAdminForm.password}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        value={newAdminForm.confirmPassword}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, confirmPassword: e.target.value })}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={addingAdmin}
                      className="px-6 py-2.5 bg-purple-700 text-white rounded-lg font-bold text-sm hover:bg-purple-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {addingAdmin ? 'Creating Administrator...' : 'Create Admin Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddAdminForm(false)}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Admins Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search administrators by name or email..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Total Admins: <strong>{filteredAdmins.length}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-600 border-b">
                    <tr>
                      <th className="px-6 py-3.5">Administrator</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Account Status</th>
                      <th className="px-6 py-3.5">Activity Status</th>
                      <th className="px-6 py-3.5">Registered</th>
                      <th className="px-6 py-3.5 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAdmins.map((adm) => {
                      const isBanned = adm.isBanned || adm.status === 'banned'
                      const isOnline = isUserOnline(adm) && !isBanned
                      const isCurrentAdmin = adm.email === user.email

                      return (
                        <tr key={adm.email} className="hover:bg-gray-50 transition-colors">
                          {/* Admin Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                                {(adm.name || adm.email).charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                  <span className="truncate">{adm.name || 'Administrator'}</span>
                                  {isCurrentAdmin && (
                                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                                      You (Active)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 font-mono truncate">{adm.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-purple-50 text-purple-800 border-purple-200">
                              🛡️ Administrator
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            {isBanned ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                <Ban className="h-3.5 w-3.5 text-red-600" />
                                Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                Active
                              </span>
                            )}
                          </td>

                          {/* Activity */}
                          <td className="px-6 py-4 text-xs">
                            {isOnline ? (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Online Now</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">
                                {adm.lastActiveAt ? new Date(adm.lastActiveAt).toLocaleDateString() : 'Offline'}
                              </span>
                            )}
                          </td>

                          {/* Registered */}
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {adm.registeredAt ? new Date(adm.registeredAt).toLocaleDateString() : 'Active'}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Demote to Learner */}
                              <button
                                onClick={() => handleRoleToggle(adm)}
                                disabled={isCurrentAdmin}
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title={isCurrentAdmin ? 'Cannot demote current logged-in admin' : 'Demote to Learner'}
                              >
                                Make Learner
                              </button>

                              {/* Ban Admin */}
                              <button
                                onClick={() => handleBanToggle(adm)}
                                disabled={isCurrentAdmin}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title={isCurrentAdmin ? 'Cannot ban self' : (isBanned ? 'Unban Admin' : 'Ban Admin')}
                              >
                                <Ban className="h-4 w-4" />
                              </button>

                              {/* Delete Admin */}
                              <button
                                onClick={() => handleDeleteUser(adm)}
                                disabled={isCurrentAdmin}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title={isCurrentAdmin ? 'Cannot delete self' : 'Delete Administrator'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: LEARNER HELP TOPICS (DROPDOWN MANAGEMENT) */}
        {/* ======================================================== */}
        {activeTab === 'topics' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-emerald-700" />
                  "What would you most like help with?" — Learner Dropdown Management
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Add, edit, or delete the interest topics shown to learners on their dashboard and course recommendations.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setResetTopicsModalOpen(true)}
                  className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  title="Reset topics back to standard default requirements"
                >
                  <RotateCcw className="h-4 w-4 text-gray-600" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setDeleteAllTopicsConfirmText(''); setDeleteAllTopicsModalOpen(true); }}
                  className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Delete all dropdown topics"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span>Delete All Topics</span>
                </button>

                <button
                  onClick={handleOpenCreateTopic}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#23735F] text-white rounded-lg hover:bg-[#1b5c4c] transition-colors text-sm font-semibold shadow-sm cursor-pointer flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Topic</span>
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Search topics by title, category, or keyword..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                Total Topics: <strong>{filteredHelpTopics.length}</strong>
              </span>
            </div>

            {/* Topics List - Simple Title Only */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-700" />
                  Learner Dropdown Options ({filteredHelpTopics.length})
                </h4>
                <span className="text-xs text-gray-500">Live options shown to learners</span>
              </div>

              {filteredHelpTopics.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No topics found matching your search.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredHelpTopics.map((topic, idx) => (
                    <div
                      key={topic.topicId}
                      className="p-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200 flex-shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900">
                          {topic.label}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditTopic(topic)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Edit Title"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic)}
                          disabled={deletingTopicId === topic.topicId}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Delete Topic"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: USER & COURSE BENEFICIARY FEEDBACK MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            {/* Feedback Source Sub-tab switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setFeedbackSubTab('beneficiary')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    feedbackSubTab === 'beneficiary'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Beneficiary Course Feedback ({beneficiaryFeedbackList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackSubTab('general')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                    feedbackSubTab === 'general'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  General Platform Feedback ({feedbackList.length})
                </button>
              </div>
            </div>

            {/* --- SUBTAB 1: BENEFICIARY COURSE FEEDBACK --- */}
            {feedbackSubTab === 'beneficiary' && (
              <div className="space-y-4">
                {/* 5 KPI Metric Cards for Beneficiary Feedback */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Feedback</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{beneficiaryMetrics.total}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Recommend %</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{beneficiaryMetrics.recommendPercent}%</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Named Consent</p>
                    <p className="text-2xl font-black text-teal-700 mt-1">{beneficiaryMetrics.namedConsent}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Anonymous Consent</p>
                    <p className="text-2xl font-black text-blue-700 mt-1">{beneficiaryMetrics.anonConsent}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Withdrawn</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">{beneficiaryMetrics.withdrawnConsent}</p>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                      <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={beneficiarySearch}
                        onChange={(e) => setBeneficiarySearch(e.target.value)}
                        placeholder="Search by learner name, email, course title, testimonial..."
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Course Filter */}
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Course:</span>
                      <select
                        value={beneficiaryCourseFilter}
                        onChange={(e) => setBeneficiaryCourseFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none max-w-[200px] truncate"
                      >
                        <option value="all">All Courses ({uniqueBeneficiaryCourses.length})</option>
                        {uniqueBeneficiaryCourses.map(c => (
                          <option key={c.courseId} value={c.courseId}>{c.courseTitle}</option>
                        ))}
                      </select>
                    </div>

                    {/* Recommendation Filter */}
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Rating:</span>
                      <select
                        value={beneficiaryRecommendFilter}
                        onChange={(e) => setBeneficiaryRecommendFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="all">All Ratings</option>
                        <option value="high">High (4 - 5 Stars)</option>
                        <option value="low">Needs Attention (1 - 3 Stars)</option>
                      </select>
                    </div>

                    {/* Consent Filter */}
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Consent:</span>
                      <select
                        value={beneficiaryConsentFilter}
                        onChange={(e) => setBeneficiaryConsentFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="all">All Consent</option>
                        <option value="granted">Granted (Public)</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Beneficiary Feedback Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-600" />
                      Course Beneficiary Feedback ({filteredBeneficiaryFeedback.length})
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">Post-Course Reviews, Recommendations & Consent</span>
                  </div>

                  {filteredBeneficiaryFeedback.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="font-medium">No course beneficiary feedback records found matching your filters.</p>
                      <p className="text-xs text-gray-400 mt-1">When learners complete courses and submit feedback, it will display here automatically.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-700">
                        <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-600 border-b">
                          <tr>
                            <th className="px-5 py-3.5">Learner</th>
                            <th className="px-5 py-3.5">Course</th>
                            <th className="px-5 py-3.5">Ratings & Gains</th>
                            <th className="px-5 py-3.5">Learner Testimonial / Feedback</th>
                            <th className="px-5 py-3.5">Consent Status</th>
                            <th className="px-5 py-3.5">Submitted</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredBeneficiaryFeedback.map((item) => {
                            const ratingNum = Number(item.rating || item.recommendRating || 0)
                            return (
                              <tr key={item.feedbackId || item.id} className="hover:bg-gray-50 transition-colors">
                                {/* Learner Info */}
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <div className="font-semibold text-gray-900">{item.learnerName || item.userName || 'Anonymous Learner'}</div>
                                  <div className="text-xs text-gray-500 font-mono">{item.learnerEmail || item.userEmail || 'No email recorded'}</div>
                                </td>

                                {/* Course */}
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="font-semibold text-indigo-900 text-xs bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                                    {item.courseTitle || item.courseId || 'General Course'}
                                  </span>
                                </td>

                                {/* Ratings */}
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3.5 w-3.5 ${
                                          star <= ratingNum ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-1 text-xs font-bold text-gray-700">({ratingNum}/5)</span>
                                  </div>
                                  {item.confidenceBefore !== undefined && item.confidenceAfter !== undefined && (
                                    <div className="text-xs text-emerald-700 font-medium mt-1">
                                      Confidence: {item.confidenceBefore}/5 → {item.confidenceAfter}/5
                                    </div>
                                  )}
                                </td>

                                {/* Testimonial / Message */}
                                <td className="px-5 py-4 max-w-sm">
                                  <p className="text-xs text-gray-800 leading-relaxed font-normal whitespace-pre-wrap line-clamp-3">
                                    {item.testimonial || item.feedbackText || item.improvements || item.mostUsefulLearning || item.message || 'No written testimonial provided.'}
                                  </p>
                                  {item.supportGains && (
                                    <p className="text-xs text-indigo-700 mt-1 italic font-medium">
                                      Gains: {item.supportGains}
                                    </p>
                                  )}
                                </td>

                                {/* Consent Status */}
                                <td className="px-5 py-4 whitespace-nowrap">
                                  {item.consentGranted !== false && !item.consentWithdrawn ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {item.testimonialConsent === 'named' ? 'Named Consent' : item.testimonialConsent === 'anonymous' ? 'Anon Consent' : 'Consent Granted'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                      <Ban className="h-3 w-3 mr-1 text-red-500" />
                                      Withdrawn
                                    </span>
                                  )}
                                </td>

                                {/* Date */}
                                <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                                  {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'Recent'}
                                </td>

                                {/* Actions */}
                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedBeneficiaryFeedback(item)
                                        setBeneficiaryModalOpen(true)
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                      title="View all questionnaire responses"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span>Details</span>
                                    </button>
                                    {item.consentGranted !== false && !item.consentWithdrawn ? (
                                      <button
                                        type="button"
                                        onClick={() => handleWithdrawConsent(item)}
                                        className="px-2.5 py-1 text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                                        title="Withdraw consent for this testimonial"
                                      >
                                        Withdraw
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">Withdrawn</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- SUBTAB 2: GENERAL PLATFORM FEEDBACK --- */}
            {feedbackSubTab === 'general' && (
              <div className="space-y-4">
                {/* Filter and Search Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                      <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        placeholder="Search by user name, email, keyword, or category..."
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Rating Filter */}
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Rating:</span>
                      <select
                        value={feedbackRatingFilter}
                        onChange={(e) => setFeedbackRatingFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="all">All Stars (1 - 5)</option>
                        <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                        <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                        <option value="3">⭐⭐⭐ 3 Stars</option>
                        <option value="2">⭐⭐ 2 Stars</option>
                        <option value="1">⭐ 1 Star</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Category:</span>
                      <select
                        value={feedbackCategoryFilter}
                        onChange={(e) => setFeedbackCategoryFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="all">All Categories</option>
                        <option value="general">General</option>
                        <option value="ai assistant">AI Assistant</option>
                        <option value="quiz">Quiz & Practice</option>
                        <option value="live classes">Live Classes</option>
                        <option value="books">Books & Guides</option>
                        <option value="ui/ux">UI / UX</option>
                        <option value="performance">Performance</option>
                        <option value="bug report">Bug Report</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* General Feedback Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-amber-600" />
                      General Platform Feedback ({filteredFeedback.length})
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">Ratings, Suggestions & Bug Reports</span>
                  </div>

                  {filteredFeedback.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="font-medium">No feedback entries found matching your search.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-700">
                        <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-600 border-b">
                          <tr>
                            <th className="px-6 py-3.5">User</th>
                            <th className="px-6 py-3.5">Rating</th>
                            <th className="px-6 py-3.5">Category</th>
                            <th className="px-6 py-3.5">Message / Comments</th>
                            <th className="px-6 py-3.5">Date</th>
                            <th className="px-6 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredFeedback.map((item) => {
                            const ratingNum = Number(item.rating) || 0
                            return (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                {/* User Info */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="font-semibold text-gray-900">{item.userName || 'Anonymous'}</div>
                                  <div className="text-xs text-gray-500 font-mono">{item.userEmail || 'No Email'}</div>
                                </td>

                                {/* Rating Stars */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-4 w-4 ${
                                          star <= ratingNum ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-1 text-xs font-bold text-gray-700">({ratingNum}/5)</span>
                                  </div>
                                </td>

                                {/* Category Badge */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                                    {item.category || 'General'}
                                  </span>
                                </td>

                                {/* Message */}
                                <td className="px-6 py-4 max-w-md">
                                  <p className="text-xs text-gray-800 leading-relaxed font-normal whitespace-pre-wrap">
                                    {item.message}
                                  </p>
                                </td>

                                {/* Date */}
                                <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent'}
                                </td>

                                {/* Delete Action */}
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => handleDeleteFeedback(item.id)}
                                    disabled={deletingFeedbackId === item.id}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                                    title="Delete Feedback"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: LEARNER CONTENT REQUESTS (QUIZZES & ASSESSMENTS) */}
        {/* ======================================================== */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Header Description & Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-purple-600" />
                  Learner Content Upload Requests
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  When a learner reaches a quiz or assessment milestone for a course that has no matching quiz/assessment title, they can submit an upload request. Admins can review requests here, create the content, and mark them fulfilled.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 w-full">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    placeholder="Search by learner name, email, course title, or note..."
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {/* Type Filter */}
                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Type:</span>
                  <select
                    value={requestTypeFilter}
                    onChange={(e) => setRequestTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="all">All Content Types</option>
                    <option value="quiz">Quiz Requests Only</option>
                    <option value="assessment">Assessment Requests Only</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Status:</span>
                  <select
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="all">All Statuses ({contentRequestsList.length})</option>
                    <option value="pending">Pending Action ({pendingRequestsCount})</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Requests Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-purple-600" />
                  Requests ({filteredContentRequests.length})
                </h3>
                <span className="text-xs text-gray-500 font-medium">Review and upload matching quizzes or assessments</span>
              </div>

              {filteredContentRequests.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700">No content requests matching your filters.</p>
                  <p className="text-xs text-gray-400 mt-1">All learner quiz and assessment requests are up to date.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-700">
                    <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-600 border-b">
                      <tr>
                        <th className="px-5 py-3.5">Requested Type</th>
                        <th className="px-5 py-3.5">Target Course</th>
                        <th className="px-5 py-3.5">Learner</th>
                        <th className="px-5 py-3.5">Learner Note</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Requested Date</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredContentRequests.map((req) => {
                        const isPending = req.status === 'pending'
                        const isFulfilled = req.status === 'fulfilled'
                        const isQuiz = req.requestType === 'quiz'

                        return (
                          <tr key={req.requestId} className={`hover:bg-gray-50 transition-colors ${isPending ? 'bg-purple-50/20' : ''}`}>
                            {/* Request Type */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              {isQuiz ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                  <HelpCircle className="h-3.5 w-3.5 mr-1" />
                                  Quiz Request
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                                  <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                                  Assessment Request
                                </span>
                              )}
                            </td>

                            {/* Target Course */}
                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-900">{req.courseTitle || 'Untitled Course'}</div>
                              <div className="text-xs text-gray-400 font-mono">ID: {req.courseId || 'N/A'}</div>
                            </td>

                            {/* Learner */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-800">{req.learnerName || 'Learner'}</div>
                              <div className="text-xs text-gray-500 font-mono">{req.learnerEmail || 'N/A'}</div>
                            </td>

                            {/* Note */}
                            <td className="px-5 py-4 max-w-xs">
                              <p className="text-xs text-gray-700 italic">
                                {req.note ? `"${req.note}"` : <span className="text-gray-400 not-italic">No extra note provided</span>}
                              </p>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              {isPending && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending Action
                                </span>
                              )}
                              {isFulfilled && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200" title={req.fulfilledContentId ? `Linked to ${req.fulfilledContentType}: ${req.fulfilledContentId}` : 'Fulfilled'}>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Fulfilled
                                </span>
                              )}
                              {req.status === 'rejected' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200" title={req.rejectionReason || 'Rejected'}>
                                  Rejected
                                </span>
                              )}
                              {req.status === 'dismissed' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                                  Dismissed
                                </span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                              {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recent'}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                                {isPending ? (
                                  <>
                                    {/* Direct Create & Link Button */}
                                    {isQuiz ? (
                                      <Link
                                        to={`/admin/quizzes?courseId=${encodeURIComponent(req.courseId || '')}&requestId=${encodeURIComponent(req.requestId)}&create=true`}
                                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                                        title="Create and auto-link new quiz for this course"
                                      >
                                        <span>Create & Link Quiz</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </Link>
                                    ) : (
                                      <div className="flex items-center space-x-1">
                                        <Link
                                          to={`/admin/baseline-assessments?courseId=${encodeURIComponent(req.courseId || '')}&requestId=${encodeURIComponent(req.requestId)}&create=true`}
                                          className="px-2 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                                          title="Create Baseline Assessment"
                                        >
                                          <span>Baseline</span>
                                          <ExternalLink className="h-3 w-3" />
                                        </Link>
                                        <Link
                                          to={`/admin/after-assessments?courseId=${encodeURIComponent(req.courseId || '')}&requestId=${encodeURIComponent(req.requestId)}&create=true`}
                                          className="px-2 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                                          title="Create After Assessment"
                                        >
                                          <span>After</span>
                                          <ExternalLink className="h-3 w-3" />
                                        </Link>
                                      </div>
                                    )}

                                    {/* Link Existing Content */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLinkModal(req)}
                                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                      title="Link an existing published quiz or assessment"
                                    >
                                      Link Existing
                                    </button>

                                    {/* Reject Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRejectModal(req.requestId)}
                                      className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                      title="Reject with reason"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {/* Reopen Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRequestStatus(req.requestId, 'pending')}
                                      disabled={updatingRequestId === req.requestId}
                                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                      Reopen
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: PLATFORM ANALYTICS & STATS */}
        {/* ======================================================== */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Roles & Health Card */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  User Demographics & Account Distribution
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-sm font-medium mb-1">
                      <span>Learners (Students)</span>
                      <span className="font-bold text-blue-600">{totalLearners} ({totalUsers ? Math.round((totalLearners/totalUsers)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${totalUsers ? (totalLearners/totalUsers)*100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-sm font-medium mb-1">
                      <span>Administrators</span>
                      <span className="font-bold text-purple-600">{totalAdmins} ({totalUsers ? Math.round((totalAdmins/totalUsers)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${totalUsers ? (totalAdmins/totalUsers)*100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-sm font-medium mb-1">
                      <span>Banned Accounts</span>
                      <span className="font-bold text-red-600">{totalBanned} ({totalUsers ? Math.round((totalBanned/totalUsers)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${totalUsers ? (totalBanned/totalUsers)*100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resource Format Distribution */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  Learning Materials & Format Diversity
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">Total Uploaded Books & Documents</span>
                    <span className="font-bold text-gray-900">{totalBooks}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">PDF Documents</span>
                    <span className="font-bold text-red-600">{booksList.filter(b => (b.format || '').toUpperCase().includes('PDF')).length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">Word Documents (DOC / DOCX)</span>
                    <span className="font-bold text-blue-600">{booksList.filter(b => (b.format || '').toUpperCase().includes('DOC')).length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">eBooks & EPUBs</span>
                    <span className="font-bold text-emerald-600">{booksList.filter(b => (b.format || '').toUpperCase().includes('EPUB')).length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">Images & Graphics (PNG / JPG / WEBP)</span>
                    <span className="font-bold text-pink-600">{booksList.filter(b => {
                      const f = (b.format || '').toUpperCase();
                      return f.includes('PNG') || f.includes('JPG') || f.includes('JPEG') || f.includes('WEBP') || f.includes('GIF') || f.includes('SVG');
                    }).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>

      {/* --- Modal: Add / Edit Help Topic (Learner Dropdown) --- */}
      {topicModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#23735F] text-white rounded-lg">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingTopic ? 'Edit Help Topic' : 'Add New Help Topic'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Learner "What would you most like help with?" Dropdown
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTopicModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="p-6 space-y-4">
           {/* Topic Label */}
           <div>
             <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
               Topic Title <span className="text-red-500">*</span>
             </label>
             <input
               type="text"
               value={topicFormData.label}
               onChange={(e) => setTopicFormData({ label: e.target.value })}
               placeholder="e.g. Managing my money, Improving my digital skills"
               className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 bg-white"
               required
               autoFocus
             />
           </div>

           {/* Footer */}
           <div className="pt-3 border-t border-gray-200 flex justify-end gap-3">
             <button
               type="button"
               onClick={() => setTopicModalOpen(false)}
               className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 cursor-pointer"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={savingTopic}
               className="px-5 py-2 bg-[#23735F] text-white rounded-lg text-xs font-bold hover:bg-[#1b5c4c] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
             >
               {savingTopic ? 'Saving...' : editingTopic ? 'Save Changes' : 'Add Topic'}
             </button>
           </div>
         </form>
          </div>
        </div>
      )}

      {/* --- Modal: Beneficiary Feedback & Consent Details --- */}
      {beneficiaryModalOpen && selectedBeneficiaryFeedback && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6 border border-gray-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-600 text-white rounded-lg">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Beneficiary Evaluation & Consent Details
                  </h2>
                  <p className="text-xs text-gray-600">
                    {selectedBeneficiaryFeedback.learnerName || selectedBeneficiaryFeedback.userName || 'Learner'} • {selectedBeneficiaryFeedback.courseTitle || 'Course'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBeneficiaryModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Consent Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                selectedBeneficiaryFeedback.consentWithdrawn || selectedBeneficiaryFeedback.consentGranted === false
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : selectedBeneficiaryFeedback.testimonialConsent === 'named'
                  ? 'bg-teal-50 text-teal-900 border-teal-200'
                  : selectedBeneficiaryFeedback.testimonialConsent === 'anonymous'
                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              }`}>
                <Shield className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-extrabold text-sm">
                    {selectedBeneficiaryFeedback.consentWithdrawn || selectedBeneficiaryFeedback.consentGranted === false
                      ? 'Testimonial Consent Withdrawn'
                      : selectedBeneficiaryFeedback.testimonialConsent === 'named'
                      ? 'Permission Granted (Named Testimonial)'
                      : selectedBeneficiaryFeedback.testimonialConsent === 'anonymous'
                      ? 'Permission Granted (Anonymous Only)'
                      : 'Testimonial Consent Granted'}
                  </p>
                  <p className="leading-relaxed opacity-90">
                    {selectedBeneficiaryFeedback.consentWithdrawn || selectedBeneficiaryFeedback.consentGranted === false
                      ? `Consent was recorded as withdrawn. This feedback must NOT be used for public testimonial purposes.`
                      : selectedBeneficiaryFeedback.testimonialConsent === 'named'
                      ? 'Learner granted permission for their comments and name to be quoted in reporting/testimonials.'
                      : selectedBeneficiaryFeedback.testimonialConsent === 'anonymous'
                      ? 'Learner granted permission for anonymised quotes only. Do not disclose learner identity.'
                      : 'Learner submitted evaluation with standard consent permissions.'}
                  </p>
                </div>
              </div>

              {/* Key Scores Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Usefulness / Rating</span>
                  <p className="text-base font-extrabold text-gray-900 mt-0.5">
                    {selectedBeneficiaryFeedback.usefulnessRating || selectedBeneficiaryFeedback.rating || selectedBeneficiaryFeedback.recommendRating || 5} / 5
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Confidence Gain</span>
                  <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                    {selectedBeneficiaryFeedback.confidenceBefore !== undefined && selectedBeneficiaryFeedback.confidenceAfter !== undefined
                      ? `${selectedBeneficiaryFeedback.confidenceBefore}/5 → ${selectedBeneficiaryFeedback.confidenceAfter}/5`
                      : selectedBeneficiaryFeedback.confidenceRating ? `${selectedBeneficiaryFeedback.confidenceRating}/5` : 'High'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Would Recommend</span>
                  <p className="text-base font-extrabold text-teal-700 uppercase mt-0.5">
                    {selectedBeneficiaryFeedback.wouldRecommend || (Number(selectedBeneficiaryFeedback.rating || 0) >= 4 ? 'Yes' : 'Feedback Given')}
                  </p>
                </div>
              </div>

              {/* Questionnaire Answers */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                {selectedBeneficiaryFeedback.mostUsefulLearning && (
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">What was the most useful thing you learned?</span>
                    <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                      "{selectedBeneficiaryFeedback.mostUsefulLearning}"
                    </p>
                  </div>
                )}

                {selectedBeneficiaryFeedback.intendedChange && (
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">What will you do differently?</span>
                    <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                      "{selectedBeneficiaryFeedback.intendedChange}"
                    </p>
                  </div>
                )}

                {selectedBeneficiaryFeedback.testimonial && selectedBeneficiaryFeedback.testimonial !== selectedBeneficiaryFeedback.mostUsefulLearning && (
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Learner Testimonial & Reflections</span>
                    <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                      "{selectedBeneficiaryFeedback.testimonial}"
                    </p>
                  </div>
                )}

                {selectedBeneficiaryFeedback.supportGains && (
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Support & Skills Gains</span>
                    <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                      {selectedBeneficiaryFeedback.supportGains}
                    </p>
                  </div>
                )}

                {selectedBeneficiaryFeedback.nextLearning && (
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Next Learning Goal</span>
                    <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                      {selectedBeneficiaryFeedback.nextLearning}
                    </p>
                  </div>
                )}

                {selectedBeneficiaryFeedback.improvements && (
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Suggested Improvements</span>
                    <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                      {selectedBeneficiaryFeedback.improvements}
                    </p>
                  </div>
                )}
              </div>

              {/* Submission Metadata */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-1">
                <span>Submitted: {selectedBeneficiaryFeedback.submittedAt ? new Date(selectedBeneficiaryFeedback.submittedAt).toLocaleString() : 'Recent'}</span>
                <span>Learner Email: {selectedBeneficiaryFeedback.learnerEmail || selectedBeneficiaryFeedback.userEmail || 'N/A'}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              {selectedBeneficiaryFeedback.consentGranted !== false && !selectedBeneficiaryFeedback.consentWithdrawn ? (
                <button
                  type="button"
                  onClick={async () => {
                    await handleWithdrawConsent(selectedBeneficiaryFeedback)
                    setBeneficiaryModalOpen(false)
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors cursor-pointer"
                >
                  Withdraw Consent
                </button>
              ) : (
                <span className="text-xs text-red-600 font-semibold italic">Consent Withdrawn</span>
              )}

              <button
                type="button"
                onClick={() => setBeneficiaryModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Content Request Modal */}
      {rejectModalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Reject Content Request
            </h3>
            <p className="text-xs text-gray-600">
              Please enter a reason for rejecting this learner's request. The learner will receive an in-app notification with this reason.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Reason for Rejection *
              </label>
              <textarea
                value={rejectModalState.reason}
                onChange={(e) => setRejectModalState(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Content is covered under another module / Quiz not required for this introductory workshop"
                className="w-full p-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[90px]"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectModalState({ isOpen: false, requestId: null, reason: '', submitting: false })}
                disabled={rejectModalState.submitting}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectModalState.submitting || !rejectModalState.reason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {rejectModalState.submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Existing Content Modal */}
      {linkModalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-indigo-600" />
              Link Existing Content
            </h3>
            <p className="text-xs text-gray-600">
              Select an existing published quiz or assessment to satisfy this learner request. The learner will be notified immediately.
            </p>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
              <div className="font-bold text-gray-900">{linkModalState.request?.courseTitle}</div>
              <div className="text-gray-500 font-mono text-[11px]">Course ID: {linkModalState.request?.courseId}</div>
              <div className="text-gray-500 text-[11px]">Learner: {linkModalState.request?.learnerName} ({linkModalState.request?.learnerEmail})</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Content Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleContentTypeChangeInLinkModal('quiz')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      linkModalState.contentType === 'quiz'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentTypeChangeInLinkModal('baseline_assessment')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      linkModalState.contentType === 'baseline_assessment'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Baseline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentTypeChangeInLinkModal('after_assessment')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      linkModalState.contentType === 'after_assessment'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    After Assessment
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Item to Link *
                </label>
                {linkModalState.loading ? (
                  <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                    Loading content items for course...
                  </div>
                ) : linkModalState.availableOptions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                    No matching published {linkModalState.contentType.replace('_', ' ')} found for this course. You can create a new one using "Create & Link".
                  </div>
                ) : (
                  <select
                    value={linkModalState.contentId}
                    onChange={(e) => setLinkModalState(prev => ({ ...prev, contentId: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {linkModalState.availableOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.title} ({opt.status}) - ID: {opt.id}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setLinkModalState({ isOpen: false, request: null, contentType: 'quiz', contentId: '', availableOptions: [], loading: false, submitting: false })}
                disabled={linkModalState.submitting}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                disabled={linkModalState.submitting || !linkModalState.contentId || linkModalState.availableOptions.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {linkModalState.submitting ? 'Linking...' : 'Link & Fulfill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL LEARNERS CONFIRMATION MODAL */}
      {deleteAllLearnersModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-red-500">
            <div className="flex items-center gap-2.5 text-red-600">
              <Trash2 className="h-5 w-5" />
              <h3 className="text-base font-black text-red-700">Delete All Learner Accounts</h3>
            </div>

            <p className="text-xs text-red-800 leading-relaxed font-semibold">
              Warning: This will permanently delete <strong>all learner accounts</strong> from the database and local storage. Administrator accounts are strictly preserved. This action cannot be undone.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Type <strong>DELETE</strong> below to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteAllLearnersConfirmText}
                onChange={(e) => setDeleteAllLearnersConfirmText(e.target.value)}
                className="w-full p-2.5 border border-red-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setDeleteAllLearnersModalOpen(false); setDeleteAllLearnersConfirmText(''); }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAllLearners || deleteAllLearnersConfirmText.trim().toLowerCase() !== 'delete'}
                onClick={handleConfirmDeleteAllLearners}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-40 cursor-pointer"
              >
                {deletingAllLearners ? 'Deleting Learners...' : 'Permanently Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL HELP TOPICS CONFIRMATION MODAL */}
      {deleteAllTopicsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-red-500">
            <div className="flex items-center gap-2.5 text-red-600">
              <Trash2 className="h-5 w-5" />
              <h3 className="text-base font-black text-red-700">Delete All Help Topics</h3>
            </div>

            <p className="text-xs text-red-800 leading-relaxed font-semibold">
              Warning: This will permanently delete <strong>all dropdown options</strong> shown in the learner "What would you most like help with?" selector.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Type <strong>DELETE</strong> below to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteAllTopicsConfirmText}
                onChange={(e) => setDeleteAllTopicsConfirmText(e.target.value)}
                className="w-full p-2.5 border border-red-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setDeleteAllTopicsModalOpen(false); setDeleteAllTopicsConfirmText(''); }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAllTopics || deleteAllTopicsConfirmText.trim().toLowerCase() !== 'delete'}
                onClick={handleConfirmDeleteAllTopics}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-40 cursor-pointer"
              >
                {deletingAllTopics ? 'Deleting Topics...' : 'Permanently Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET HELP TOPICS TO DEFAULTS MODAL */}
      {resetTopicsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-700">
              <RotateCcw className="h-5 w-5" />
              <h3 className="text-base font-black text-gray-900">Reset Help Topics to Defaults</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              This will restore the standard One Community Ely topics (Managing money, Finding work, Digital skills, AI learning, Communication, Podcasting, Small business, Everyday life skills, Something else).
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setResetTopicsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resettingTopics}
                onClick={handleConfirmResetTopics}
                className="px-4 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {resettingTopics ? 'Resetting...' : 'Confirm Reset to Defaults'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel