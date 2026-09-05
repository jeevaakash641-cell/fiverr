import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchAdminCourses,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  bulkDeleteCourses,
  deleteAllCourses,
  COURSE_CATEGORIES,
  COURSE_DIFFICULTIES,
  COURSE_STATUSES
} from '../services/courseService'
import {
  BookOpen, Plus, Search, Filter, RefreshCw, ArrowLeft,
  Edit, Globe, EyeOff, Archive, CheckCircle, AlertTriangle,
  Clock, Award, ArrowUp, ArrowDown, Trash2, X, Shield,
  Layers, Sparkles, AlertCircle, Image as ImageIcon, Check,
  CheckSquare, Square, HelpCircle
} from 'lucide-react'

const AdminCourses = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Selection state for bulk operations
  const [selectedCourseIds, setSelectedCourseIds] = useState([])

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Notification Alert
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' })
  const showAlert = (type, message) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 4000)
  }

  // Course Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formDirty, setFormDirty] = useState(false)

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    category: '',
    thumbnailUrl: '',
    estimatedDuration: '',
    difficultyLevel: 'Beginner',
    learningOutcomes: []
  })
  const [formErrors, setFormErrors] = useState({})
  const [newOutcomeInput, setNewOutcomeInput] = useState('')

  // Confirmation Modals State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: '',
    course: null,
    targetStatus: ''
  })

  // 1. Auth Guard
  useEffect(() => {
    if (!user) {
      navigate('/admin-login')
      return
    }
    const role = String(user.userType || user.role || '').toLowerCase();
    const isElyAdmin = String(user.email || '').toLowerCase() === 'admin@onecommunityely.com';
    if (role !== 'teacher' && role !== 'admin' && !isElyAdmin) {
      alert('Access denied. Administrator privileges required. Please sign in with an Administrator account.');
      navigate('/admin-login');
      return;
    }
    loadCourses();
  }, [user, navigate]);

  // Warn on window reload if form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isModalOpen && formDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isModalOpen, formDirty])

  // 2. Load Courses
  const loadCourses = async () => {
    setRefreshing(true)
    try {
      const data = await fetchAdminCourses({}, user)
      setCourses(data)
    } catch (err) {
      showAlert('error', err.message || 'Failed to load courses from database')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 3. Metrics Calculations
  const metrics = useMemo(() => {
    const total = courses.length
    const published = courses.filter(c => c.status === 'published').length
    const draft = courses.filter(c => c.status === 'draft').length
    const unpublished = courses.filter(c => c.status === 'unpublished').length
    const archived = courses.filter(c => c.status === 'archived').length
    return { total, published, draft, unpublished, archived }
  }, [courses])

  // 4. Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch =
        (course.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.shortDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.category || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || course.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [courses, searchQuery, statusFilter, categoryFilter])

  // 5. Selection Handlers
  const handleToggleSelectCourse = (courseId, e) => {
    e?.stopPropagation()
    setSelectedCourseIds(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    )
  }

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredCourses.map(c => c.courseId)
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedCourseIds.includes(id))
    if (allSelected) {
      setSelectedCourseIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelectedCourseIds(prev => Array.from(new Set([...prev, ...filteredIds])))
    }
  }

  // 6. Delete Action Triggers
  const handleRequestDeleteCourse = (course) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Course',
      message: `Are you sure you want to permanently delete "${course.title}"? This will remove the course and all its modules and lessons completely from the database. This action cannot be undone.`,
      actionType: 'delete-single',
      course,
      targetStatus: ''
    })
  }

  const handleRequestBulkDelete = () => {
    if (selectedCourseIds.length === 0) return
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedCourseIds.length} Selected Course${selectedCourseIds.length > 1 ? 's' : ''}`,
      message: `Are you sure you want to permanently delete the ${selectedCourseIds.length} selected course(s) and all their associated modules and lessons? This action cannot be undone.`,
      actionType: 'delete-bulk',
      course: null,
      targetStatus: ''
    })
  }

  const handleRequestDeleteAll = () => {
    if (courses.length === 0) return
    setConfirmModal({
      isOpen: true,
      title: '⚠️ Delete ALL Courses Completely',
      message: `Are you sure you want to permanently delete ALL ${courses.length} courses from the training centre database? All modules, lessons, and learner course selections will be wiped. This action is PERMANENT.`,
      actionType: 'delete-all',
      course: null,
      targetStatus: ''
    })
  }

  // 7. Modal Execution Handler (Deletions + Status Changes)
  const executeModalAction = async () => {
    setIsDeleting(true)
    try {
      if (confirmModal.actionType === 'delete-single') {
        const targetId = confirmModal.course?.courseId
        await deleteCourse(targetId, user)
        setCourses(prev => prev.filter(c => c.courseId !== targetId))
        setSelectedCourseIds(prev => prev.filter(id => id !== targetId))
        showAlert('success', `Course "${confirmModal.course?.title}" was permanently deleted.`)
      } else if (confirmModal.actionType === 'delete-bulk') {
        const idsToDelete = [...selectedCourseIds]
        await bulkDeleteCourses(idsToDelete, user)
        setCourses(prev => prev.filter(c => !idsToDelete.includes(c.courseId)))
        setSelectedCourseIds([])
        showAlert('success', `Successfully deleted ${idsToDelete.length} courses and their contents.`)
      } else if (confirmModal.actionType === 'delete-all') {
        await deleteAllCourses(user)
        setCourses([])
        setSelectedCourseIds([])
        showAlert('success', 'All courses, modules, and lessons were permanently deleted.')
      } else if (confirmModal.actionType === 'unpublish' || confirmModal.actionType === 'archive') {
        const updated = await updateCourseStatus(confirmModal.course.courseId, confirmModal.targetStatus, user)
        setCourses(prev => prev.map(c => c.courseId === updated.courseId ? updated : c))
        showAlert('success', `Course "${confirmModal.course.title}" is now ${confirmModal.targetStatus}.`)
      }
    } catch (err) {
      showAlert('error', err.message || 'Operation failed.')
    } finally {
      setIsDeleting(false)
      setConfirmModal({ isOpen: false, title: '', message: '', actionType: '', course: null, targetStatus: '' })
    }
  }

  // 8. Open Create / Edit Modal
  const handleOpenCreate = () => {
    setEditingCourse(null)
    setFormData({
      title: '',
      shortDescription: '',
      fullDescription: '',
      category: COURSE_CATEGORIES[0],
      thumbnailUrl: '',
      estimatedDuration: '',
      difficultyLevel: 'Beginner',
      learningOutcomes: []
    })
    setFormErrors({})
    setNewOutcomeInput('')
    setFormDirty(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (course) => {
    setEditingCourse(course)
    setFormData({
      title: course.title || '',
      shortDescription: course.shortDescription || '',
      fullDescription: course.fullDescription || '',
      category: course.category || COURSE_CATEGORIES[0],
      thumbnailUrl: course.thumbnailUrl || '',
      estimatedDuration: course.estimatedDuration || '',
      difficultyLevel: course.difficultyLevel || 'Beginner',
      learningOutcomes: Array.isArray(course.learningOutcomes) ? [...course.learningOutcomes] : []
    })
    setFormErrors({})
    setNewOutcomeInput('')
    setFormDirty(false)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (formDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setIsModalOpen(false)
        setEditingCourse(null)
        setFormDirty(false)
      }
    } else {
      setIsModalOpen(false)
      setEditingCourse(null)
    }
  }

  // 9. Form Input Changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFormDirty(true)
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  // 10. Learning Outcomes List Management
  const handleAddOutcome = () => {
    const trimmed = newOutcomeInput.trim()
    if (!trimmed) return
    setFormData(prev => ({
      ...prev,
      learningOutcomes: [...prev.learningOutcomes, trimmed]
    }))
    setNewOutcomeInput('')
    setFormDirty(true)
    if (formErrors.learningOutcomes) {
      setFormErrors(prev => ({ ...prev, learningOutcomes: null }))
    }
  }

  const handleRemoveOutcome = (index) => {
    setFormData(prev => ({
      ...prev,
      learningOutcomes: prev.learningOutcomes.filter((_, i) => i !== index)
    }))
    setFormDirty(true)
  }

  const handleMoveOutcome = (index, direction) => {
    const list = [...formData.learningOutcomes]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= list.length) return
    const [moved] = list.splice(index, 1)
    list.splice(targetIndex, 0, moved)
    setFormData(prev => ({ ...prev, learningOutcomes: list }))
    setFormDirty(true)
  }

  // 11. Form Validation
  const validateForm = () => {
    const errors = {}
    if (!formData.title || formData.title.trim().length < 3) {
      errors.title = 'Title is required (minimum 3 characters)'
    }
    if (!formData.shortDescription || formData.shortDescription.trim().length < 10) {
      errors.shortDescription = 'Short description is required (minimum 10 characters)'
    }
    if (!formData.category) {
      errors.category = 'Please select a category'
    }
    if (!formData.estimatedDuration || !formData.estimatedDuration.trim()) {
      errors.estimatedDuration = 'Estimated duration is required (e.g., 4 hours)'
    }
    if (!formData.difficultyLevel) {
      errors.difficultyLevel = 'Please select a difficulty level'
    }

    const cleanOutcomes = formData.learningOutcomes.map(o => o.trim()).filter(Boolean)
    if (cleanOutcomes.length === 0) {
      errors.learningOutcomes = 'At least one learning outcome is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 12. Save / Publish Handler
  const handleSaveCourse = async (targetStatus) => {
    if (!validateForm()) {
      showAlert('error', 'Please correct the highlighted errors before saving.')
      return
    }

    setSaving(true)
    try {
      const cleanOutcomes = formData.learningOutcomes.map(o => o.trim()).filter(Boolean)
      const payload = {
        title: formData.title.trim(),
        shortDescription: formData.shortDescription.trim(),
        fullDescription: formData.fullDescription.trim(),
        category: formData.category.trim(),
        thumbnailUrl: formData.thumbnailUrl.trim(),
        estimatedDuration: formData.estimatedDuration.trim(),
        difficultyLevel: formData.difficultyLevel,
        learningOutcomes: cleanOutcomes,
        status: targetStatus
      }

      if (editingCourse) {
        const updated = await updateCourse(editingCourse.courseId, payload, user)
        setCourses(prev => prev.map(c => c.courseId === updated.courseId ? updated : c))
        showAlert('success', `Course "${updated.title}" updated successfully!`)
      } else {
        const created = await createCourse(payload, user)
        setCourses(prev => [created, ...prev])
        showAlert('success', `Course "${created.title}" created as ${targetStatus}!`)
      }

      setFormDirty(false)
      setIsModalOpen(false)
      setEditingCourse(null)
    } catch (err) {
      showAlert('error', err.message || 'Failed to save course.')
    } finally {
      setSaving(false)
    }
  }

  // 13. Status Transitions Trigger
  const handleRequestStatusChange = (course, targetStatus) => {
    if (targetStatus === 'unpublished') {
      setConfirmModal({
        isOpen: true,
        title: 'Unpublish Course',
        message: `Are you sure you want to unpublish "${course.title}"? It will no longer be visible to learners in the public training centre.`,
        actionType: 'unpublish',
        course,
        targetStatus: 'unpublished'
      })
    } else if (targetStatus === 'archived') {
      setConfirmModal({
        isOpen: true,
        title: 'Archive Course',
        message: `Are you sure you want to archive "${course.title}"? Archived courses are hidden from learners and preserved in your database.`,
        actionType: 'archive',
        course,
        targetStatus: 'archived'
      })
    } else {
      // Direct publish / republish
      (async () => {
        try {
          const updated = await updateCourseStatus(course.courseId, targetStatus, user)
          setCourses(prev => prev.map(c => c.courseId === updated.courseId ? updated : c))
          showAlert('success', `Course "${course.title}" is now ${targetStatus}.`)
        } catch (err) {
          showAlert('error', err.message || 'Failed to update course status.')
        }
      })()
    }
  }

  // Helper Badge Colors
  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Published</span>
      case 'draft':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">Draft</span>
      case 'unpublished':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Unpublished</span>
      case 'archived':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Archived</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>
    }
  }

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Beginner</span>
      case 'Intermediate':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Intermediate</span>
      case 'Advanced':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Advanced</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-50 text-gray-700">{difficulty}</span>
    }
  }

  if (!user || user.userType !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-sm w-full">
          <Shield className="h-12 w-12 text-emerald-600 mx-auto mb-3 animate-pulse" />
          <h2 className="text-lg font-bold text-gray-800 mb-1">Authenticating Admin...</h2>
          <p className="text-gray-500 text-xs mb-4">Please sign in with administrator credentials.</p>
          <Link to="/admin-login" className="inline-block px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 transition-colors">
            Go to Admin Login
          </Link>
        </div>
      </div>
    )
  }

  const allFilteredSelected = filteredCourses.length > 0 && filteredCourses.every(c => selectedCourseIds.includes(c.courseId))

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/admin-panel')}
                className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium cursor-pointer"
                title="Back to Admin Portal"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Portal</span>
              </button>
              <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Course Management
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                    Online Training Centre
                  </span>
                </h1>
                <p className="text-xs text-gray-500">Create, publish, and manage educational courses for Ely learners</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
              {courses.length > 0 && (
                <button
                  onClick={handleRequestDeleteAll}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold shadow-2xs cursor-pointer"
                  title="Delete All Courses"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span className="hidden lg:inline">Delete All Courses</span>
                </button>
              )}
              <button
                onClick={loadCourses}
                disabled={refreshing}
                className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                title="Refresh Courses"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden md:inline">Refresh</span>
              </button>
              <Link
                to="/admin/quizzes"
                className="flex items-center space-x-1.5 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-sm font-semibold shadow-2xs"
                title="Manage Course Quizzes"
              >
                <HelpCircle className="h-4 w-4 text-purple-600" />
                <span className="hidden md:inline">Quizzes</span>
              </Link>
              <button
                onClick={handleOpenCreate}
                className="flex items-center space-x-2 px-4 py-2 bg-[#23735F] text-white rounded-lg hover:bg-[#1b5c4c] transition-colors text-sm font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Course</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alert Notification */}
      {alertInfo.message && (
        <div className="container mx-auto px-4 md:px-6 pt-4 animate-fade-in">
          <div className={`p-4 rounded-xl shadow-md border flex items-center space-x-3 ${
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

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-7xl">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          <div
            onClick={() => setStatusFilter('all')}
            className={`bg-white p-4 rounded-xl shadow-sm border text-center cursor-pointer transition-all ${
              statusFilter === 'all' ? 'border-emerald-600 ring-2 ring-emerald-100 shadow-md' : 'border-gray-200 hover:border-emerald-400'
            }`}
          >
            <BookOpen className="h-5 w-5 text-emerald-700 mx-auto mb-1.5" />
            <h3 className="text-2xl font-bold text-gray-900">{metrics.total}</h3>
            <p className="text-xs text-gray-500 font-medium">Total Courses</p>
          </div>

          <div
            onClick={() => setStatusFilter('published')}
            className={`bg-white p-4 rounded-xl shadow-sm border text-center cursor-pointer transition-all ${
              statusFilter === 'published' ? 'border-emerald-600 ring-2 ring-emerald-100 shadow-md' : 'border-gray-200 hover:border-emerald-400'
            }`}
          >
            <Globe className="h-5 w-5 text-emerald-600 mx-auto mb-1.5" />
            <h3 className="text-2xl font-bold text-emerald-700">{metrics.published}</h3>
            <p className="text-xs text-emerald-800 font-semibold">Published</p>
          </div>

          <div
            onClick={() => setStatusFilter('draft')}
            className={`bg-white p-4 rounded-xl shadow-sm border text-center cursor-pointer transition-all ${
              statusFilter === 'draft' ? 'border-slate-600 ring-2 ring-slate-100 shadow-md' : 'border-gray-200 hover:border-slate-400'
            }`}
          >
            <Layers className="h-5 w-5 text-slate-600 mx-auto mb-1.5" />
            <h3 className="text-2xl font-bold text-slate-800">{metrics.draft}</h3>
            <p className="text-xs text-slate-600 font-medium">Drafts</p>
          </div>

          <div
            onClick={() => setStatusFilter('unpublished')}
            className={`bg-white p-4 rounded-xl shadow-sm border text-center cursor-pointer transition-all ${
              statusFilter === 'unpublished' ? 'border-amber-600 ring-2 ring-amber-100 shadow-md' : 'border-gray-200 hover:border-amber-400'
            }`}
          >
            <EyeOff className="h-5 w-5 text-amber-600 mx-auto mb-1.5" />
            <h3 className="text-2xl font-bold text-amber-800">{metrics.unpublished}</h3>
            <p className="text-xs text-amber-700 font-semibold">Unpublished</p>
          </div>

          <div
            onClick={() => setStatusFilter('archived')}
            className={`bg-white p-4 rounded-xl shadow-sm border text-center cursor-pointer transition-all ${
              statusFilter === 'archived' ? 'border-purple-600 ring-2 ring-purple-100 shadow-md' : 'border-gray-200 hover:border-purple-400'
            }`}
          >
            <Archive className="h-5 w-5 text-purple-600 mx-auto mb-1.5" />
            <h3 className="text-2xl font-bold text-purple-800">{metrics.archived}</h3>
            <p className="text-xs text-purple-700 font-medium">Archived</p>
          </div>
        </div>

        {/* Search, Filters and Selection Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, or category..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-gray-500 hidden sm:inline" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-gray-700 outline-none"
                >
                  <option value="all">All Categories</option>
                  {COURSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-gray-700 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Selection and Batch Action Bar */}
          {filteredCourses.length > 0 && (
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="flex items-center gap-1.5 font-semibold text-gray-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                  <span>Select All ({filteredCourses.length})</span>
                </button>

                {selectedCourseIds.length > 0 && (
                  <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    {selectedCourseIds.length} Selected
                  </span>
                )}
              </div>

              {selectedCourseIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCourseIds([])}
                    className="px-2.5 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded font-medium transition-colors cursor-pointer"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestBulkDelete}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Selected ({selectedCourseIds.length})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Course List */}
        {loading ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm font-medium">Loading courses from DynamoDB...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">No Courses Found</h3>
            <p className="text-gray-500 text-xs mb-4">
              {courses.length === 0
                ? 'Get started by creating your first course for One Community Ely.'
                : 'No courses match the current search query or filter selection.'}
            </p>
            {courses.length === 0 ? (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#23735F] text-white rounded-lg text-sm font-semibold hover:bg-[#1b5c4c] transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Course</span>
              </button>
            ) : (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => {
              const isSelected = selectedCourseIds.includes(course.courseId)
              return (
                <div
                  key={course.courseId}
                  className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden flex flex-col hover:shadow-md ${
                    isSelected ? 'ring-2 ring-emerald-600 border-emerald-600' : 'border-gray-200'
                  }`}
                >
                  {/* Thumbnail Header */}
                  <div className="h-40 bg-gradient-to-r from-emerald-800 to-teal-900 relative overflow-hidden flex items-center justify-center">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="text-center p-4">
                        <BookOpen className="h-10 w-10 text-white/40 mx-auto mb-1" />
                        <span className="text-white/60 text-xs font-medium">{course.category}</span>
                      </div>
                    )}

                    {/* Top Badges & Select Checkbox */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectCourse(course.courseId, e)}
                        className="p-1 bg-white/90 hover:bg-white text-gray-800 rounded shadow-xs cursor-pointer transition-colors"
                        title={isSelected ? 'Deselect Course' : 'Select Course'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                      {getStatusBadge(course.status)}
                    </div>

                    <div className="absolute top-3 right-3">
                      {getDifficultyBadge(course.difficultyLevel)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1.5">
                        <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[170px]">
                          {course.category}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500 font-normal ml-auto flex-shrink-0">
                          <Clock className="h-3 w-3" />
                          {course.estimatedDuration}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-2" title={course.title}>
                        {course.title}
                      </h3>

                      <p className="text-xs text-gray-600 mb-3.5 line-clamp-2 leading-relaxed" title={course.shortDescription}>
                        {course.shortDescription}
                      </p>

                      {/* Learning Outcomes Preview */}
                      {Array.isArray(course.learningOutcomes) && course.learningOutcomes.length > 0 && (
                        <div className="mb-3.5 pt-2 border-t border-gray-100">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                            Key Outcomes ({course.learningOutcomes.length}):
                          </span>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {course.learningOutcomes.slice(0, 2).map((outcome, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 line-clamp-1">
                                <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <span className="truncate">{outcome}</span>
                              </li>
                            ))}
                            {course.learningOutcomes.length > 2 && (
                              <li className="text-[11px] text-gray-400 font-medium pl-5">
                                +{course.learningOutcomes.length - 2} more outcome{course.learningOutcomes.length - 2 > 1 ? 's' : ''}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions Footer */}
                    <div className="pt-3 border-t border-gray-100 mt-2">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-3">
                        <span>Updated: {new Date(course.updatedAt || course.createdAt).toLocaleDateString()}</span>
                        <span>By: {course.createdBy?.split('@')[0] || 'Admin'}</span>
                      </div>

                      {/* Manage Content Primary Button */}
                      <Link
                        to={`/admin/courses/${encodeURIComponent(course.courseId)}/content`}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#23735F] hover:bg-[#1b5c4c] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs mb-2.5 cursor-pointer"
                      >
                        <Layers className="h-4 w-4" />
                        <span>Manage Content</span>
                      </Link>

                      {/* Action Buttons Row: Edit | Publish | Archive | Delete */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(course)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                          title="Edit course details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Publish / Unpublish Button */}
                        {course.status === 'published' ? (
                          <button
                            onClick={() => handleRequestStatusChange(course, 'unpublished')}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                            title="Unpublish course"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Unpublish</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRequestStatusChange(course, 'published')}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                            title="Publish course"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Publish</span>
                          </button>
                        )}

                        {/* Archive / Restore Button */}
                        {course.status !== 'archived' ? (
                          <button
                            onClick={() => handleRequestStatusChange(course, 'archived')}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                            title="Archive course"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            <span>Archive</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRequestStatusChange(course, 'draft')}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                            title="Restore to Draft"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>To Draft</span>
                          </button>
                        )}

                        {/* Delete Single Course Button */}
                        <button
                          onClick={() => handleRequestDeleteCourse(course)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                          title="Permanently delete course"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Course Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#23735F] text-white rounded-lg">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingCourse ? 'Edit Course' : 'Create New Course'}
                  </h2>
                  <p className="text-xs text-gray-600">
                    One Community Ely Online Training Centre Foundation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Course Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Confidence and Assertiveness for the Workplace"
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                    formErrors.title ? 'border-red-500 bg-red-50/30' : 'border-gray-300 bg-white'
                  }`}
                />
                {formErrors.title && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.title}
                  </p>
                )}
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Short Description (Catalog Summary) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.shortDescription}
                  onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                  placeholder="A clear 1-2 sentence overview for course cards and search previews..."
                  rows="2"
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                    formErrors.shortDescription ? 'border-red-500 bg-red-50/30' : 'border-gray-300 bg-white'
                  }`}
                />
                {formErrors.shortDescription && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.shortDescription}
                  </p>
                )}
              </div>

              {/* Full Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Course Description
                </label>
                <textarea
                  value={formData.fullDescription}
                  onChange={(e) => handleInputChange('fullDescription', e.target.value)}
                  placeholder="Detailed course description, prerequisites, and syllabus background..."
                  rows="4"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              {/* Category, Duration, Difficulty Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-800"
                  >
                    {COURSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.estimatedDuration}
                    onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                    placeholder="e.g., 4 hours, 2 weeks"
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                      formErrors.estimatedDuration ? 'border-red-500 bg-red-50/30' : 'border-gray-300 bg-white'
                    }`}
                  />
                  {formErrors.estimatedDuration && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {formErrors.estimatedDuration}
                    </p>
                  )}
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Difficulty Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.difficultyLevel}
                    onChange={(e) => handleInputChange('difficultyLevel', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-800"
                  >
                    {COURSE_DIFFICULTIES.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thumbnail URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Thumbnail Image URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={formData.thumbnailUrl}
                      onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
                      placeholder="https://images.unsplash.com/photo-... or /images/..."
                      className="w-full pl-9 pr-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    />
                  </div>
                  {formData.thumbnailUrl && (
                    <div className="h-9 w-12 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                      <img
                        src={formData.thumbnailUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Learning Outcomes Builder */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Key Learning Outcomes <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Add concrete skills and knowledge learners will gain upon completing this course.
                </p>

                {/* Add new outcome input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newOutcomeInput}
                    onChange={(e) => setNewOutcomeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddOutcome()
                      }
                    }}
                    placeholder="Type an outcome and click Add (or press Enter)..."
                    className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddOutcome}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>

                {formErrors.learningOutcomes && (
                  <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.learningOutcomes}
                  </p>
                )}

                {/* List of Outcomes */}
                {formData.learningOutcomes.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center text-xs text-gray-400">
                    No learning outcomes added yet. Add at least 1 outcome.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {formData.learningOutcomes.map((outcome, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-800"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{outcome}</span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveOutcome(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded"
                            title="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOutcome(idx, 1)}
                            disabled={idx === formData.learningOutcomes.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded"
                            title="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveOutcome(idx)}
                            className="p-1 text-red-400 hover:text-red-700 rounded ml-1"
                            title="Delete outcome"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveCourse('draft')}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCourse('published')}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#23735F] hover:bg-[#1b5c4c] rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Globe className="h-4 w-4" />
                      <span>Publish Course</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Confirmation Dialog Modal (Delete Single, Delete Bulk, Delete All, Archive, Unpublish) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2.5 rounded-full ${
                confirmModal.actionType?.startsWith('delete')
                  ? 'bg-red-100 text-red-700'
                  : confirmModal.actionType === 'archive'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {confirmModal.actionType?.startsWith('delete') ? (
                  <Trash2 className="h-6 w-6 text-red-600" />
                ) : confirmModal.actionType === 'archive' ? (
                  <Archive className="h-6 w-6" />
                ) : (
                  <EyeOff className="h-6 w-6" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', actionType: '', course: null, targetStatus: '' })}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeModalAction}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  confirmModal.actionType?.startsWith('delete')
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.actionType === 'archive'
                    ? 'bg-purple-700 hover:bg-purple-800'
                    : 'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>
                    {confirmModal.actionType === 'delete-all'
                      ? 'Confirm Delete All'
                      : confirmModal.actionType === 'delete-bulk'
                      ? 'Confirm Delete Selected'
                      : confirmModal.actionType === 'delete-single'
                      ? 'Delete Course'
                      : confirmModal.actionType === 'archive'
                      ? 'Confirm Archive'
                      : 'Confirm Unpublish'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCourses
