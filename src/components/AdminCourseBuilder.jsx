import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchCourseContentAdmin,
  createModule,
  updateModule,
  updateModuleStatus,
  reorderModules,
  createLesson,
  updateLesson,
  updateLessonStatus,
  reorderLessons,
  moveLesson
} from '../services/courseContentService'
import { fetchCourseById } from '../services/courseService'
import { sanitizeHtml, stripHtml, getEmbedVideoUrl, isValidVideoUrl, isValidImageUrl } from '../utils/sanitizeHtml'
import { API_BASE_URL } from '../config'
import {
  BookOpen, Plus, ArrowLeft, Edit, Globe, EyeOff, Archive, CheckCircle,
  AlertTriangle, Clock, Award, ArrowUp, ArrowDown, Trash2, X, Shield,
  Layers, Sparkles, AlertCircle, Image as ImageIcon, Video, FileText,
  ChevronDown, ChevronRight, Eye, MoveRight, ExternalLink, RefreshCw,
  Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon,
  Quote, Check, Paperclip, Search, Filter, PlayCircle
} from 'lucide-react'

const AdminCourseBuilder = () => {
  const { courseId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Expand / Collapse State for Modules
  const [expandedModules, setExpandedModules] = useState({})

  // Notifications
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' })
  const showAlert = (type, message) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 4000)
  }

  // --- Module Modal State ---
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [moduleFormData, setModuleFormData] = useState({ title: '', description: '' })
  const [moduleErrors, setModuleErrors] = useState({})
  const [savingModule, setSavingModule] = useState(false)

  // --- Lesson Modal State ---
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [targetModuleForLesson, setTargetModuleForLesson] = useState(null)
  const [editingLesson, setEditingLesson] = useState(null)
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    shortDescription: '',
    content: '',
    estimatedMinutes: 15,
    videoUrl: '',
    imageUrl: '',
    attachedResources: []
  })
  const [lessonErrors, setLessonErrors] = useState({})
  const [savingLesson, setSavingLesson] = useState(false)
  const [lessonDirty, setLessonDirty] = useState(false)

  // --- Resource Picker Modal State ---
  const [isResourcePickerOpen, setIsResourcePickerOpen] = useState(false)
  const [availableResources, setAvailableResources] = useState([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [resourceSearch, setResourceSearch] = useState('')
  const [resourceFormatFilter, setResourceFormatFilter] = useState('all')
  const [selectedResourcesToAttach, setSelectedResourcesToAttach] = useState([])

  // --- Move Lesson Modal State ---
  const [moveModal, setMoveModal] = useState({ isOpen: false, lesson: null, targetModuleId: '' })
  const [movingLesson, setMovingLesson] = useState(false)

  // --- Lesson Preview Modal State ---
  const [previewLesson, setPreviewLesson] = useState(null)

  // --- Generic Confirmation Modal ---
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: '',
    onConfirm: null
  })

  // 1. Auth Guard
  useEffect(() => {
    if (!user) {
      navigate('/admin-login')
      return
    }
    if (user.userType !== 'teacher') {
      alert('Access denied. Administrator privileges required.')
      navigate('/dashboard')
      return
    }
    loadData()
  }, [user, courseId, navigate])

  // 2. Load Course & Hierarchy Data
  const loadData = async () => {
    setRefreshing(true)
    try {
      const data = await fetchCourseContentAdmin(courseId, user)
      setCourse(data.course)
      setModules(data.modules || [])

      // Default expand all modules on initial load
      const expandMap = {}
      ;(data.modules || []).forEach(m => {
        expandMap[m.moduleId] = true
      })
      setExpandedModules(prev => ({ ...expandMap, ...prev }))
      setNotFound(false)
    } catch (err) {
      console.error('Failed to load course content:', err)
      setNotFound(true)
      showAlert('error', err.message || 'Course not found')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 3. Metric Calculations
  const metrics = useMemo(() => {
    const totalModules = modules.length
    let totalLessons = 0
    let draftItems = 0
    let publishedItems = 0

    modules.forEach(m => {
      if (m.status === 'published') publishedItems++
      else draftItems++

      const lessons = m.lessons || []
      totalLessons += lessons.length
      lessons.forEach(l => {
        if (l.status === 'published') publishedItems++
        else draftItems++
      })
    })

    return { totalModules, totalLessons, draftItems, publishedItems }
  }, [modules])

  // 4. Expand / Collapse Toggles
  const toggleModuleExpand = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  const handleExpandAll = () => {
    const allExpanded = {}
    modules.forEach(m => { allExpanded[m.moduleId] = true })
    setExpandedModules(allExpanded)
  }

  const handleCollapseAll = () => {
    setExpandedModules({})
  }

  // --- Module Handlers ---
  const handleOpenCreateModule = () => {
    setEditingModule(null)
    setModuleFormData({ title: '', description: '' })
    setModuleErrors({})
    setIsModuleModalOpen(true)
  }

  const handleOpenEditModule = (mod) => {
    setEditingModule(mod)
    setModuleFormData({
      title: mod.title || '',
      description: mod.description || ''
    })
    setModuleErrors({})
    setIsModuleModalOpen(true)
  }

  const validateModuleForm = () => {
    const errors = {}
    if (!moduleFormData.title || moduleFormData.title.trim().length < 3) {
      errors.title = 'Module title must contain at least 3 characters'
    }
    if (!moduleFormData.description || moduleFormData.description.trim().length < 10) {
      errors.description = 'Module description must contain at least 10 characters'
    }
    setModuleErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveModule = async (targetStatus = 'draft') => {
    if (!validateModuleForm()) return

    setSavingModule(true)
    try {
      const payload = {
        title: moduleFormData.title.trim(),
        description: moduleFormData.description.trim(),
        status: targetStatus
      }

      if (editingModule) {
        const updated = await updateModule(editingModule.moduleId, payload, user)
        setModules(prev => prev.map(m => m.moduleId === updated.moduleId ? { ...m, ...updated } : m))
        showAlert('success', `Module "${updated.title}" updated!`)
      } else {
        const created = await createModule(courseId, payload, user)
        setModules(prev => [...prev, { ...created, lessons: [] }])
        setExpandedModules(prev => ({ ...prev, [created.moduleId]: true }))
        showAlert('success', `Module "${created.title}" created!`)
      }
      setIsModuleModalOpen(false)
      setEditingModule(null)
    } catch (err) {
      showAlert('error', err.message || 'Failed to save module')
    } finally {
      setSavingModule(false)
    }
  }

  const handleModuleStatusChange = (mod, newStatus) => {
    const actionLabel = newStatus === 'unpublished' ? 'Unpublish' : newStatus === 'archived' ? 'Archive' : 'Publish'

    if (newStatus === 'published') {
      const lessonCount = (mod.lessons || []).length
      if (lessonCount === 0) {
        showAlert('error', 'A module should contain at least one lesson before publishing.')
      }
    }

    if (newStatus === 'unpublished' || newStatus === 'archived') {
      setConfirmModal({
        isOpen: true,
        title: `${actionLabel} Module`,
        message: `Are you sure you want to ${actionLabel.toLowerCase()} "${mod.title}"? Lessons inside this module will be affected.`,
        actionType: newStatus,
        onConfirm: async () => {
          try {
            const updated = await updateModuleStatus(mod.moduleId, newStatus, user)
            setModules(prev => prev.map(m => m.moduleId === updated.moduleId ? { ...m, ...updated } : m))
            showAlert('success', `Module "${mod.title}" is now ${newStatus}.`)
          } catch (err) {
            showAlert('error', err.message || 'Failed to update module status')
          } finally {
            setConfirmModal({ isOpen: false, title: '', message: '', actionType: '', onConfirm: null })
          }
        }
      })
    } else {
      // Direct publish
      (async () => {
        try {
          const updated = await updateModuleStatus(mod.moduleId, newStatus, user)
          setModules(prev => prev.map(m => m.moduleId === updated.moduleId ? { ...m, ...updated } : m))
          showAlert('success', `Module "${mod.title}" is now ${newStatus}.`)
        } catch (err) {
          showAlert('error', err.message || 'Failed to update module status')
        }
      })()
    }
  }

  const handleMoveModule = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= modules.length) return

    const reordered = [...modules]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp

    setModules(reordered)
    try {
      const moduleIds = reordered.map(m => m.moduleId)
      await reorderModules(courseId, moduleIds, user)
      showAlert('success', 'Module order updated')
    } catch (err) {
      showAlert('error', 'Failed to save module order')
      loadData()
    }
  }

  // --- Lesson Handlers ---
  const handleOpenCreateLesson = (mod) => {
    setTargetModuleForLesson(mod)
    setEditingLesson(null)
    setLessonFormData({
      title: '',
      shortDescription: '',
      content: '',
      estimatedMinutes: 15,
      videoUrl: '',
      imageUrl: '',
      attachedResources: []
    })
    setLessonErrors({})
    setLessonDirty(false)
    setIsLessonModalOpen(true)
  }

  const handleOpenEditLesson = (mod, lesson) => {
    setTargetModuleForLesson(mod)
    setEditingLesson(lesson)
    setLessonFormData({
      title: lesson.title || '',
      shortDescription: lesson.shortDescription || '',
      content: lesson.content || '',
      estimatedMinutes: lesson.estimatedMinutes || 15,
      videoUrl: lesson.videoUrl || '',
      imageUrl: lesson.imageUrl || '',
      attachedResources: Array.isArray(lesson.attachedResources) ? [...lesson.attachedResources] : []
    })
    setLessonErrors({})
    setLessonDirty(false)
    setIsLessonModalOpen(true)
  }

  const handleCloseLessonModal = () => {
    if (lessonDirty && !window.confirm('You have unsaved changes in this lesson. Are you sure you want to discard them?')) {
      return
    }
    setIsLessonModalOpen(false)
    setEditingLesson(null)
    setLessonDirty(false)
  }

  const validateLessonForm = () => {
    const errors = {}
    if (!lessonFormData.title || lessonFormData.title.trim().length < 3) {
      errors.title = 'Lesson title must contain at least 3 characters'
    }
    if (!lessonFormData.shortDescription || lessonFormData.shortDescription.trim().length < 10) {
      errors.shortDescription = 'Short description must contain at least 10 characters'
    }
    const textOnly = stripHtml(lessonFormData.content)
    if (!textOnly || textOnly.length === 0) {
      errors.content = 'Lesson content cannot be empty'
    }
    const mins = Number(lessonFormData.estimatedMinutes)
    if (!Number.isInteger(mins) || mins <= 0) {
      errors.estimatedMinutes = 'Duration must be a positive integer (e.g. 15)'
    }
    if (lessonFormData.videoUrl && !isValidVideoUrl(lessonFormData.videoUrl)) {
      errors.videoUrl = 'Please provide a valid YouTube, Vimeo, or direct MP4 video link'
    }
    if (lessonFormData.imageUrl && !isValidImageUrl(lessonFormData.imageUrl)) {
      errors.imageUrl = 'Please provide a valid image URL'
    }

    setLessonErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveLesson = async (targetStatus = 'draft') => {
    if (!validateLessonForm()) return

    setSavingLesson(true)
    try {
      const payload = {
        title: lessonFormData.title.trim(),
        shortDescription: lessonFormData.shortDescription.trim(),
        content: lessonFormData.content,
        estimatedMinutes: Number(lessonFormData.estimatedMinutes),
        videoUrl: lessonFormData.videoUrl.trim(),
        imageUrl: lessonFormData.imageUrl.trim(),
        attachedResources: lessonFormData.attachedResources,
        status: targetStatus
      }

      if (editingLesson) {
        const updated = await updateLesson(editingLesson.lessonId, payload, user)
        setModules(prev => prev.map(m => {
          if (m.moduleId !== targetModuleForLesson.moduleId) return m
          return {
            ...m,
            lessons: (m.lessons || []).map(l => l.lessonId === updated.lessonId ? updated : l)
          }
        }))
        showAlert('success', `Lesson "${updated.title}" updated!`)
      } else {
        const created = await createLesson(targetModuleForLesson.moduleId, payload, user)
        setModules(prev => prev.map(m => {
          if (m.moduleId !== targetModuleForLesson.moduleId) return m
          return {
            ...m,
            lessons: [...(m.lessons || []), created]
          }
        }))
        showAlert('success', `Lesson "${created.title}" created!`)
      }

      setIsLessonModalOpen(false)
      setEditingLesson(null)
      setLessonDirty(false)
    } catch (err) {
      showAlert('error', err.message || 'Failed to save lesson')
    } finally {
      setSavingLesson(false)
    }
  }

  const handleLessonStatusChange = (mod, lesson, newStatus) => {
    const actionLabel = newStatus === 'unpublished' ? 'Unpublish' : newStatus === 'archived' ? 'Archive' : 'Publish'

    if (newStatus === 'unpublished' || newStatus === 'archived') {
      setConfirmModal({
        isOpen: true,
        title: `${actionLabel} Lesson`,
        message: `Are you sure you want to ${actionLabel.toLowerCase()} "${lesson.title}"?`,
        actionType: newStatus,
        onConfirm: async () => {
          try {
            const updated = await updateLessonStatus(lesson.lessonId, newStatus, user)
            setModules(prev => prev.map(m => {
              if (m.moduleId !== mod.moduleId) return m
              return {
                ...m,
                lessons: (m.lessons || []).map(l => l.lessonId === updated.lessonId ? updated : l)
              }
            }))
            showAlert('success', `Lesson "${lesson.title}" is now ${newStatus}.`)
          } catch (err) {
            showAlert('error', err.message || 'Failed to update lesson status')
          } finally {
            setConfirmModal({ isOpen: false, title: '', message: '', actionType: '', onConfirm: null })
          }
        }
      })
    } else {
      (async () => {
        try {
          const updated = await updateLessonStatus(lesson.lessonId, newStatus, user)
          setModules(prev => prev.map(m => {
            if (m.moduleId !== mod.moduleId) return m
            return {
              ...m,
              lessons: (m.lessons || []).map(l => l.lessonId === updated.lessonId ? updated : l)
            }
          }))
          showAlert('success', `Lesson "${lesson.title}" is now ${newStatus}.`)
        } catch (err) {
          showAlert('error', err.message || 'Failed to update lesson status')
        }
      })()
    }
  }

  const handleMoveLessonOrder = async (mod, index, direction) => {
    const lessons = mod.lessons || []
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= lessons.length) return

    const reordered = [...lessons]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp

    setModules(prev => prev.map(m => m.moduleId === mod.moduleId ? { ...m, lessons: reordered } : m))

    try {
      const lessonIds = reordered.map(l => l.lessonId)
      await reorderLessons(mod.moduleId, lessonIds, user)
      showAlert('success', 'Lesson order updated')
    } catch (err) {
      showAlert('error', 'Failed to save lesson order')
      loadData()
    }
  }

  // --- Move Lesson to Another Module ---
  const handleOpenMoveModal = (lesson) => {
    setMoveModal({
      isOpen: true,
      lesson,
      targetModuleId: ''
    })
  }

  const handleExecuteMoveLesson = async () => {
    if (!moveModal.targetModuleId) {
      showAlert('error', 'Please select a destination module.')
      return
    }

    setMovingLesson(true)
    try {
      await moveLesson(moveModal.lesson.lessonId, moveModal.targetModuleId, courseId, user)
      showAlert('success', `Lesson moved successfully!`)
      setMoveModal({ isOpen: false, lesson: null, targetModuleId: '' })
      await loadData()
    } catch (err) {
      showAlert('error', err.message || 'Failed to move lesson')
    } finally {
      setMovingLesson(false)
    }
  }

  // --- Resource Attachment Modal ---
  const handleOpenResourcePicker = async () => {
    setIsResourcePickerOpen(true)
    setLoadingResources(true)
    setSelectedResourcesToAttach([])
    try {
      const res = await fetch(`${API_BASE_URL}/api/books`)
      const data = await res.json()
      setAvailableResources(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load books for attachment:', err)
      showAlert('error', 'Could not load existing uploaded resources')
    } finally {
      setLoadingResources(false)
    }
  }

  const handleToggleResourceSelect = (resource) => {
    const id = resource.id || resource.key
    setSelectedResourcesToAttach(prev => {
      const exists = prev.some(r => (r.id || r.key) === id)
      if (exists) return prev.filter(r => (r.id || r.key) !== id)
      return [...prev, resource]
    })
  }

  const handleConfirmAttachResources = () => {
    const formatted = selectedResourcesToAttach.map(r => ({
      resourceId: r.id || r.key,
      title: r.title || 'Learning Resource',
      format: (r.format || (r.fileName ? r.fileName.split('.').pop() : 'PDF')).toUpperCase(),
      storageKey: r.key || r.id,
      viewUrl: r.viewUrl || `/book-viewer/${encodeURIComponent(r.key || r.id)}`
    }))

    // Merge with existing attachments without duplicates
    setLessonFormData(prev => {
      const current = prev.attachedResources || []
      const currentIds = new Set(current.map(c => c.resourceId))
      const added = formatted.filter(f => !currentIds.has(f.resourceId))
      return { ...prev, attachedResources: [...current, ...added] }
    })

    setLessonDirty(true)
    setIsResourcePickerOpen(false)
    setSelectedResourcesToAttach([])
  }

  const handleRemoveAttachedResource = (resourceId) => {
    setLessonFormData(prev => ({
      ...prev,
      attachedResources: (prev.attachedResources || []).filter(r => r.resourceId !== resourceId)
    }))
    setLessonDirty(true)
  }

  // Filtered Resources in Picker
  const filteredAvailableResources = useMemo(() => {
    return availableResources.filter(r => {
      const matchesSearch =
        !resourceSearch.trim() ||
        (r.title || '').toLowerCase().includes(resourceSearch.toLowerCase()) ||
        (r.subject || '').toLowerCase().includes(resourceSearch.toLowerCase()) ||
        (r.author || '').toLowerCase().includes(resourceSearch.toLowerCase())

      const format = (r.format || (r.fileName ? r.fileName.split('.').pop() : 'PDF')).toUpperCase()
      const matchesFormat = resourceFormatFilter === 'all' || format.includes(resourceFormatFilter.toUpperCase())

      return matchesSearch && matchesFormat
    })
  }, [availableResources, resourceSearch, resourceFormatFilter])

  // --- Rich Text Simple Formatting Helpers ---
  const applyFormatting = (command, value = null) => {
    document.execCommand(command, false, value)
    const editor = document.getElementById('lesson-content-editable')
    if (editor) {
      setLessonFormData(prev => ({ ...prev, content: editor.innerHTML }))
      setLessonDirty(true)
    }
  }

  const handleContentInput = (e) => {
    setLessonFormData(prev => ({ ...prev, content: e.currentTarget.innerHTML }))
    setLessonDirty(true)
    if (lessonErrors.content) {
      setLessonErrors(prev => ({ ...prev, content: '' }))
    }
  }

  // --- Helper Badges ---
  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Published</span>
      case 'draft':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Draft</span>
      case 'unpublished':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Unpublished</span>
      case 'archived':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">Archived</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <h2 className="text-base font-bold text-gray-800">Loading Course Builder...</h2>
          <p className="text-xs text-gray-500 mt-1">Connecting to One Community Ely Training Centre database</p>
        </div>
      </div>
    )
  }

  if (notFound || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-1">Course Not Found</h2>
          <p className="text-xs text-gray-500 mb-4">
            The requested course ID "{courseId}" does not exist in the database or could not be loaded.
          </p>
          <Link
            to="/admin/courses"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#23735F] text-white rounded-lg text-sm font-semibold hover:bg-[#1b5c4c] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Course Management</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
            <div className="flex items-center space-x-3">
              <Link
                to="/admin/courses"
                className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                title="Back to Course Management"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Courses</span>
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-bold text-gray-900 line-clamp-1">
                    {course.title}
                  </h1>
                  {getStatusBadge(course.status)}
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="font-semibold text-emerald-800">{course.category}</span>
                  <span>•</span>
                  <span>{course.difficultyLevel}</span>
                  <span>•</span>
                  <span>{course.estimatedDuration}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <button
                onClick={loadData}
                disabled={refreshing}
                className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50"
                title="Refresh Content"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={handleOpenCreateModule}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#23735F] text-white rounded-lg hover:bg-[#1b5c4c] transition-colors text-xs sm:text-sm font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Module</span>
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
        {/* Course Hierarchy Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-center shadow-2xs">
            <Layers className="h-4 w-4 text-emerald-700 mx-auto mb-1" />
            <h3 className="text-xl font-bold text-gray-900">{metrics.totalModules}</h3>
            <p className="text-[11px] text-gray-500 font-medium">Modules</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-center shadow-2xs">
            <BookOpen className="h-4 w-4 text-blue-700 mx-auto mb-1" />
            <h3 className="text-xl font-bold text-gray-900">{metrics.totalLessons}</h3>
            <p className="text-[11px] text-gray-500 font-medium">Lessons</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-center shadow-2xs">
            <Globe className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
            <h3 className="text-xl font-bold text-emerald-700">{metrics.publishedItems}</h3>
            <p className="text-[11px] text-emerald-800 font-medium">Published Items</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-center shadow-2xs">
            <EyeOff className="h-4 w-4 text-slate-600 mx-auto mb-1" />
            <h3 className="text-xl font-bold text-slate-800">{metrics.draftItems}</h3>
            <p className="text-[11px] text-slate-600 font-medium">Draft / Unpublished</p>
          </div>
        </div>

        {/* Builder Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            Curriculum Structure
            <span className="text-xs text-gray-500 font-normal">
              (Drag or use ↑/↓ to reorder)
            </span>
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExpandAll}
              className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 text-xs font-semibold rounded-lg shadow-2xs hover:bg-gray-50"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 text-xs font-semibold rounded-lg shadow-2xs hover:bg-gray-50"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Modules & Lessons List */}
        {modules.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center shadow-sm">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">No Modules Created Yet</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
              Organise your course into progressive learning modules. Start by creating the first module.
            </p>
            <button
              onClick={handleOpenCreateModule}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#23735F] text-white rounded-lg text-sm font-semibold hover:bg-[#1b5c4c] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Module</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod, modIdx) => {
              const isExpanded = expandedModules[mod.moduleId] ?? true
              const lessons = mod.lessons || []

              return (
                <div
                  key={mod.moduleId}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all"
                >
                  {/* Module Header Card */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center space-x-3 flex-1">
                      <button
                        onClick={() => toggleModuleExpand(mod.moduleId)}
                        className="p-1 rounded text-gray-500 hover:bg-gray-200 transition-colors mt-0.5 sm:mt-0"
                        title={isExpanded ? 'Collapse module' : 'Expand module'}
                      >
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>

                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {modIdx + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm md:text-base font-bold text-gray-900">
                            {mod.title}
                          </h3>
                          {getStatusBadge(mod.status)}
                          <span className="text-[11px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                            {lessons.length} Lesson{lessons.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {mod.description}
                        </p>
                      </div>
                    </div>

                    {/* Module Actions */}
                    <div className="flex items-center gap-1 self-end sm:self-center flex-wrap">
                      {/* Reorder Buttons */}
                      <button
                        onClick={() => handleMoveModule(modIdx, 'up')}
                        disabled={modIdx === 0}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-30"
                        title="Move Module Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMoveModule(modIdx, 'down')}
                        disabled={modIdx === modules.length - 1}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-30"
                        title="Move Module Down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>

                      <div className="h-4 w-px bg-gray-300 mx-1"></div>

                      {/* Add Lesson */}
                      <button
                        onClick={() => handleOpenCreateLesson(mod)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        title="Add Lesson to this module"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Lesson</span>
                      </button>

                      {/* Edit Module */}
                      <button
                        onClick={() => handleOpenEditModule(mod)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-xs transition-colors"
                        title="Edit Module details"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {/* Publish / Unpublish */}
                      {mod.status === 'published' ? (
                        <button
                          onClick={() => handleModuleStatusChange(mod, 'unpublished')}
                          className="p-1.5 text-amber-700 hover:bg-amber-100 rounded text-xs transition-colors"
                          title="Unpublish Module"
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleModuleStatusChange(mod, 'published')}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded text-xs transition-colors"
                          title="Publish Module"
                        >
                          <Globe className="h-4 w-4" />
                        </button>
                      )}

                      {/* Archive */}
                      {mod.status !== 'archived' && (
                        <button
                          onClick={() => handleModuleStatusChange(mod, 'archived')}
                          className="p-1.5 text-purple-700 hover:bg-purple-100 rounded text-xs transition-colors"
                          title="Archive Module"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Module Lessons Body */}
                  {isExpanded && (
                    <div className="p-3 sm:p-4 bg-white space-y-2.5">
                      {lessons.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                          <BookOpen className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
                          <p className="text-xs text-gray-500 mb-2">No lessons in this module yet.</p>
                          <button
                            onClick={() => handleOpenCreateLesson(mod)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 text-white rounded text-xs font-semibold hover:bg-emerald-800 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add First Lesson</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {lessons.map((lesson, lesIdx) => (
                            <div
                              key={lesson.lessonId}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all gap-2"
                            >
                              <div className="flex items-start sm:items-center space-x-3 flex-1">
                                <span className="text-xs font-bold text-gray-400 w-7 text-center">
                                  {modIdx + 1}.{lesIdx + 1}
                                </span>

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                                      {lesson.title}
                                    </h4>
                                    {getStatusBadge(lesson.status)}

                                    <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                      <Clock className="h-3 w-3 text-gray-400" />
                                      {lesson.estimatedMinutes || 15}m
                                    </span>

                                    {lesson.videoUrl && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-semibold" title="Video lesson">
                                        <Video className="h-3 w-3" /> Video
                                      </span>
                                    )}

                                    {lesson.imageUrl && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold" title="Image asset">
                                        <ImageIcon className="h-3 w-3" /> Image
                                      </span>
                                    )}

                                    {Array.isArray(lesson.attachedResources) && lesson.attachedResources.length > 0 && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold" title="Attached learning resources">
                                        <Paperclip className="h-3 w-3" /> {lesson.attachedResources.length}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                    {lesson.shortDescription}
                                  </p>
                                </div>
                              </div>

                              {/* Lesson Row Actions */}
                              <div className="flex items-center gap-1 self-end sm:self-center">
                                {/* Reorder within module */}
                                <button
                                  onClick={() => handleMoveLessonOrder(mod, lesIdx, 'up')}
                                  disabled={lesIdx === 0}
                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30"
                                  title="Move Up"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveLessonOrder(mod, lesIdx, 'down')}
                                  disabled={lesIdx === lessons.length - 1}
                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30"
                                  title="Move Down"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>

                                <div className="h-3.5 w-px bg-gray-200 mx-1"></div>

                                {/* Preview Button */}
                                <button
                                  onClick={() => setPreviewLesson(lesson)}
                                  className="p-1 text-emerald-700 hover:bg-emerald-100 rounded text-xs transition-colors"
                                  title="Admin Preview"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => handleOpenEditLesson(mod, lesson)}
                                  className="p-1 text-gray-600 hover:bg-gray-100 rounded text-xs transition-colors"
                                  title="Edit Lesson"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>

                                {/* Move to Module Button */}
                                {modules.length > 1 && (
                                  <button
                                    onClick={() => handleOpenMoveModal(lesson)}
                                    className="p-1 text-blue-700 hover:bg-blue-100 rounded text-xs transition-colors"
                                    title="Move to another module"
                                  >
                                    <MoveRight className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {/* Publish / Unpublish */}
                                {lesson.status === 'published' ? (
                                  <button
                                    onClick={() => handleLessonStatusChange(mod, lesson, 'unpublished')}
                                    className="p-1 text-amber-700 hover:bg-amber-100 rounded text-xs transition-colors"
                                    title="Unpublish Lesson"
                                  >
                                    <EyeOff className="h-3.5 w-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleLessonStatusChange(mod, lesson, 'published')}
                                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded text-xs transition-colors"
                                    title="Publish Lesson"
                                  >
                                    <Globe className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {/* Archive */}
                                {lesson.status !== 'archived' && (
                                  <button
                                    onClick={() => handleLessonStatusChange(mod, lesson, 'archived')}
                                    className="p-1 text-purple-700 hover:bg-purple-100 rounded text-xs transition-colors"
                                    title="Archive Lesson"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* --- 1. Module Create / Edit Modal --- */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#23735F] text-white rounded-lg">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingModule ? 'Edit Module' : 'Create New Module'}
                </h3>
              </div>
              <button
                onClick={() => setIsModuleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Module Title *
                </label>
                <input
                  type="text"
                  value={moduleFormData.title}
                  onChange={(e) => {
                    setModuleFormData(prev => ({ ...prev, title: e.target.value }))
                    if (moduleErrors.title) setModuleErrors(prev => ({ ...prev, title: '' }))
                  }}
                  placeholder="e.g. Getting Started Online"
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${
                    moduleErrors.title ? 'border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-emerald-500'
                  }`}
                />
                {moduleErrors.title && (
                  <p className="text-xs text-red-600 mt-1">{moduleErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Module Description *
                </label>
                <textarea
                  rows={3}
                  value={moduleFormData.description}
                  onChange={(e) => {
                    setModuleFormData(prev => ({ ...prev, description: e.target.value }))
                    if (moduleErrors.description) setModuleErrors(prev => ({ ...prev, description: '' }))
                  }}
                  placeholder="Summarise the topics and goals covered in this module..."
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${
                    moduleErrors.description ? 'border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-emerald-500'
                  }`}
                />
                {moduleErrors.description && (
                  <p className="text-xs text-red-600 mt-1">{moduleErrors.description}</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModuleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveModule('draft')}
                  disabled={savingModule}
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveModule('published')}
                  disabled={savingModule}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#23735F] hover:bg-[#1b5c4c] rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingModule ? 'Saving...' : 'Publish Module'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. Lesson Create / Edit Modal (With Rich Text & Media) --- */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#23735F] text-white rounded-lg">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Module: <span className="font-semibold text-emerald-800">{targetModuleForLesson?.title}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseLessonModal}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Title & Estimated Minutes */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={lessonFormData.title}
                    onChange={(e) => {
                      setLessonFormData(prev => ({ ...prev, title: e.target.value }))
                      setLessonDirty(true)
                      if (lessonErrors.title) setLessonErrors(prev => ({ ...prev, title: '' }))
                    }}
                    placeholder="e.g. Understanding the Internet"
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${
                      lessonErrors.title ? 'border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                  {lessonErrors.title && (
                    <p className="text-xs text-red-600 mt-1">{lessonErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lessonFormData.estimatedMinutes}
                    onChange={(e) => {
                      setLessonFormData(prev => ({ ...prev, estimatedMinutes: e.target.value }))
                      setLessonDirty(true)
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Short Description * (Overview for lesson card)
                </label>
                <textarea
                  rows={2}
                  value={lessonFormData.shortDescription}
                  onChange={(e) => {
                    setLessonFormData(prev => ({ ...prev, shortDescription: e.target.value }))
                    setLessonDirty(true)
                    if (lessonErrors.shortDescription) setLessonErrors(prev => ({ ...prev, shortDescription: '' }))
                  }}
                  placeholder="Learn what the internet is, how web browsers work, and how data travels..."
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${
                    lessonErrors.shortDescription ? 'border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-emerald-500'
                  }`}
                />
                {lessonErrors.shortDescription && (
                  <p className="text-xs text-red-600 mt-1">{lessonErrors.shortDescription}</p>
                )}
              </div>

              {/* Lesson Content - Rich Text Editor */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Lesson Content (Rich Text) *
                </label>

                {/* Editor Toolbar */}
                <div className="border border-gray-300 border-b-0 rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-1 items-center">
                  <button
                    type="button"
                    onClick={() => applyFormatting('formatBlock', '<h1>')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded text-xs font-bold"
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('formatBlock', '<h2>')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded text-xs font-bold"
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('formatBlock', '<h3>')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded text-xs font-bold"
                    title="Heading 3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('formatBlock', '<p>')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded text-xs font-medium"
                    title="Paragraph"
                  >
                    P
                  </button>

                  <div className="h-4 w-px bg-gray-300 mx-1"></div>

                  <button
                    type="button"
                    onClick={() => applyFormatting('bold')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded font-bold"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('italic')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded italic"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-4 w-px bg-gray-300 mx-1"></div>

                  <button
                    type="button"
                    onClick={() => applyFormatting('insertUnorderedList')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded"
                    title="Bullet List"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('insertOrderedList')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded"
                    title="Numbered List"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('formatBlock', '<blockquote>')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded"
                    title="Quote"
                  >
                    <Quote className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-4 w-px bg-gray-300 mx-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Enter link URL (e.g. https://example.com):')
                      if (url) applyFormatting('createLink', url)
                    }}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded"
                    title="Insert Link"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('insertHorizontalRule')}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded text-xs font-semibold"
                    title="Divider"
                  >
                    HR
                  </button>
                </div>

                {/* Editable Area */}
                <div
                  id="lesson-content-editable"
                  contentEditable
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(lessonFormData.content) }}
                  onInput={handleContentInput}
                  className={`min-h-[160px] max-h-[300px] overflow-y-auto p-4 text-sm border rounded-b-lg outline-none bg-white prose prose-sm max-w-none focus:ring-2 focus:ring-emerald-500 ${
                    lessonErrors.content ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Type lesson content here..."
                />
                {lessonErrors.content && (
                  <p className="text-xs text-red-600 mt-1">{lessonErrors.content}</p>
                )}
              </div>

              {/* Video URL & Embed Preview */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Video URL (Optional: YouTube, Vimeo, or direct MP4)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={lessonFormData.videoUrl}
                    onChange={(e) => {
                      setLessonFormData(prev => ({ ...prev, videoUrl: e.target.value }))
                      setLessonDirty(true)
                      if (lessonErrors.videoUrl) setLessonErrors(prev => ({ ...prev, videoUrl: '' }))
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {lessonErrors.videoUrl && (
                  <p className="text-xs text-red-600 mt-1">{lessonErrors.videoUrl}</p>
                )}

                {/* Live Video Preview */}
                {lessonFormData.videoUrl && isValidVideoUrl(lessonFormData.videoUrl) && (
                  <div className="mt-2.5 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Video Player Preview:
                    </span>
                    <div className="aspect-video max-w-sm rounded overflow-hidden bg-black">
                      {(() => {
                        const parsed = getEmbedVideoUrl(lessonFormData.videoUrl)
                        if (!parsed) return null
                        if (parsed.type === 'direct') {
                          return (
                            <video src={parsed.embedUrl} controls className="w-full h-full object-cover" />
                          )
                        }
                        return (
                          <iframe
                            src={parsed.embedUrl}
                            title="Video Preview"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Image URL & Preview */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={lessonFormData.imageUrl}
                  onChange={(e) => {
                    setLessonFormData(prev => ({ ...prev, imageUrl: e.target.value }))
                    setLessonDirty(true)
                    if (lessonErrors.imageUrl) setLessonErrors(prev => ({ ...prev, imageUrl: '' }))
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {lessonErrors.imageUrl && (
                  <p className="text-xs text-red-600 mt-1">{lessonErrors.imageUrl}</p>
                )}

                {lessonFormData.imageUrl && isValidImageUrl(lessonFormData.imageUrl) && (
                  <div className="mt-2 max-w-xs h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                    <img
                      src={lessonFormData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* Attached Learning Resources */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Attached Learning Resources
                    </label>
                    <p className="text-xs text-gray-500">
                      Link existing books and documents from your resource library:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenResourcePicker}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#23735F] hover:bg-[#1b5c4c] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Attach Resources</span>
                  </button>
                </div>

                {lessonFormData.attachedResources.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    No resources attached yet. Click "Attach Resources" to select from uploaded books.
                  </p>
                ) : (
                  <div className="space-y-1.5 mt-3">
                    {lessonFormData.attachedResources.map((res, idx) => (
                      <div
                        key={res.resourceId || idx}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {res.format || 'PDF'}
                          </span>
                          <span className="font-semibold text-gray-800">{res.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachedResource(res.resourceId)}
                          className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Remove attachment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseLessonModal}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveLesson('draft')}
                  disabled={savingLesson}
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveLesson('published')}
                  disabled={savingLesson}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#23735F] hover:bg-[#1b5c4c] rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingLesson ? 'Saving...' : 'Publish Lesson'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 3. Resource Picker Modal --- */}
      {isResourcePickerOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Paperclip className="h-5 w-5 text-emerald-700" />
                <h3 className="text-base font-bold text-gray-900">Attach Learning Resources</h3>
              </div>
              <button
                onClick={() => setIsResourcePickerOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-gray-100 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder="Search resources by title or subject..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={resourceFormatFilter}
                onChange={(e) => setResourceFormatFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white text-gray-700"
              >
                <option value="all">All Formats</option>
                <option value="PDF">PDF</option>
                <option value="EPUB">EPUB</option>
                <option value="DOC">DOC / DOCX</option>
                <option value="TXT">TXT</option>
              </select>
            </div>

            {/* Resource List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {loadingResources ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading resources from S3 storage...</p>
                </div>
              ) : filteredAvailableResources.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No resources found matching your search.
                </div>
              ) : (
                filteredAvailableResources.map((res) => {
                  const id = res.id || res.key
                  const isSelected = selectedResourcesToAttach.some(r => (r.id || r.key) === id)
                  const isAlreadyAttached = (lessonFormData.attachedResources || []).some(r => r.resourceId === id)

                  return (
                    <div
                      key={id}
                      onClick={() => !isAlreadyAttached && handleToggleResourceSelect(res)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isAlreadyAttached
                          ? 'bg-gray-100 opacity-60 cursor-not-allowed border-gray-200'
                          : isSelected
                          ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-400'
                          : 'bg-white border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected || isAlreadyAttached}
                          disabled={isAlreadyAttached}
                          onChange={() => {}}
                          className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{res.title}</p>
                          <p className="text-[11px] text-gray-500">
                            {res.subject || 'General'} • {res.format || 'PDF'} • {res.size || ''}
                          </p>
                        </div>
                      </div>

                      {isAlreadyAttached && (
                        <span className="text-[10px] text-gray-500 font-semibold uppercase">Already Attached</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">
                {selectedResourcesToAttach.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsResourcePickerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAttachResources}
                  disabled={selectedResourcesToAttach.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#23735F] hover:bg-[#1b5c4c] rounded-lg disabled:opacity-50"
                >
                  Attach Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 4. Move Lesson Modal --- */}
      {moveModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MoveRight className="h-5 w-5 text-blue-600" />
              Move Lesson to Another Module
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select the destination module in this course for "{moveModal.lesson?.title}":
            </p>

            <select
              value={moveModal.targetModuleId}
              onChange={(e) => setMoveModal(prev => ({ ...prev, targetModuleId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 mb-6 bg-white"
            >
              <option value="">Select Destination Module</option>
              {modules
                .filter(m => m.moduleId !== moveModal.lesson?.moduleId)
                .map(m => (
                  <option key={m.moduleId} value={m.moduleId}>
                    {m.title} ({m.lessons?.length || 0} lessons)
                  </option>
                ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMoveModal({ isOpen: false, lesson: null, targetModuleId: '' })}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMoveLesson}
                disabled={movingLesson || !moveModal.targetModuleId}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50"
              >
                {movingLesson ? 'Moving...' : 'Move Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 5. Lesson Admin Preview Modal (Read-Only) --- */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Preview Banner */}
            <div className="px-6 py-3 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-emerald-200" />
                <span className="text-xs font-bold tracking-wider uppercase bg-emerald-900 px-2 py-0.5 rounded border border-emerald-700">
                  Admin Preview Mode
                </span>
                <span className="text-xs text-emerald-200 hidden sm:inline">• Read Only</span>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                className="text-emerald-200 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1 font-semibold text-emerald-800">
                    <Clock className="h-3.5 w-3.5" />
                    {previewLesson.estimatedMinutes || 15} minutes
                  </span>
                  <span>•</span>
                  <span>{getStatusBadge(previewLesson.status)}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  {previewLesson.title}
                </h2>
                <p className="text-xs text-gray-600 mt-1 italic">
                  {previewLesson.shortDescription}
                </p>
              </div>

              {/* Video Embed */}
              {previewLesson.videoUrl && isValidVideoUrl(previewLesson.videoUrl) && (
                <div className="rounded-xl overflow-hidden shadow-sm aspect-video bg-black max-w-2xl mx-auto">
                  {(() => {
                    const parsed = getEmbedVideoUrl(previewLesson.videoUrl)
                    if (!parsed) return null
                    if (parsed.type === 'direct') {
                      return <video src={parsed.embedUrl} controls className="w-full h-full" />
                    }
                    return (
                      <iframe
                        src={parsed.embedUrl}
                        title={previewLesson.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  })()}
                </div>
              )}

              {/* Image Asset */}
              {previewLesson.imageUrl && isValidImageUrl(previewLesson.imageUrl) && (
                <div className="rounded-xl overflow-hidden border border-gray-200 max-h-72 flex items-center justify-center bg-gray-50">
                  <img
                    src={previewLesson.imageUrl}
                    alt={previewLesson.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}

              {/* Formatted HTML Content */}
              <div
                className="prose prose-emerald max-w-none text-sm text-gray-800 leading-relaxed border-t border-gray-100 pt-4"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewLesson.content) }}
              />

              {/* Attached Resources */}
              {Array.isArray(previewLesson.attachedResources) && previewLesson.attachedResources.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-emerald-700" />
                    Attached Learning Resources ({previewLesson.attachedResources.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {previewLesson.attachedResources.map((res, idx) => (
                      <div
                        key={res.resourceId || idx}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{res.title}</p>
                          <span className="text-[10px] font-semibold text-emerald-800 uppercase">
                            {res.format || 'PDF'}
                          </span>
                        </div>
                        {res.viewUrl ? (
                          <Link
                            to={res.viewUrl}
                            target="_blank"
                            className="px-2.5 py-1 bg-white border border-gray-300 text-gray-700 hover:text-emerald-700 rounded font-semibold text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            Resource currently unavailable
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 6. Generic Confirmation Modal --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2.5 rounded-full ${
                confirmModal.actionType === 'archived' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {confirmModal.actionType === 'archived' ? <Archive className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', actionType: '', onConfirm: null })}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                  confirmModal.actionType === 'archived' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCourseBuilder
