import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchAdminQuizzes,
  fetchAdminQuizById,
  createManualQuiz,
  generateAIQuiz,
  updateQuiz,
  updateQuizStatus,
  duplicateQuiz,
  deleteQuiz
} from '../services/quizService'
import { fetchAdminCourses } from '../services/courseService'
import { fetchCourseContentAdmin } from '../services/courseContentService'
import {
  BookOpen, Plus, Search, Filter, RefreshCw, ArrowLeft,
  Edit, Globe, EyeOff, Archive, CheckCircle, AlertTriangle,
  Clock, Award, ArrowUp, ArrowDown, Trash2, X, Shield,
  Layers, Sparkles, AlertCircle, Check, Copy, HelpCircle,
  FileText, Play, CheckSquare, ListOrdered, ChevronRight, Eye
} from 'lucide-react'

const AdminQuizzes = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [quizzes, setQuizzes] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState(searchParams.get('courseId') || 'all')
  const [methodFilter, setMethodFilter] = useState('all')

  // Notification Alert
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' })
  const showAlert = (type, message) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 5000)
  }

  // Create Mode Selection Dialog (Manual vs AI)
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false)

  // AI Generator Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiFormData, setAiFormData] = useState({
    courseId: '',
    moduleId: '',
    moduleTitle: '',
    lessonId: '',
    lessonTitle: '',
    title: '',
    numQuestions: 5,
    difficulty: 'medium',
    questionTypes: 'mixed',
    passingScore: 70
  })
  const [aiModules, setAiModules] = useState([])
  const [aiLessons, setAiLessons] = useState([])

  // Quiz Editor (Manual or AI Review) Modal State
  const [editorModalOpen, setEditorModalOpen] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState(null)
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  // Form fields for Quiz Editor
  const [quizForm, setQuizForm] = useState({
    title: '',
    instructions: '',
    courseId: '',
    moduleId: '',
    moduleTitle: '',
    lessonId: '',
    lessonTitle: '',
    passingScore: 70,
    maximumAttempts: '',
    status: 'draft',
    creationMethod: 'manual',
    questions: []
  })
  const [editorModules, setEditorModules] = useState([])
  const [editorLessons, setEditorLessons] = useState([])

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewQuiz, setPreviewQuiz] = useState(null)

  // Confirmation Modals State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: '',
    quiz: null
  })

  // 1. Auth Guard
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.userType !== 'teacher') {
      navigate('/dashboard')
      return
    }
    loadData()
  }, [user])

  // 2. Load Quizzes & Courses
  const loadData = async () => {
    setRefreshing(true)
    try {
      const [quizzesData, coursesData] = await Promise.all([
        fetchAdminQuizzes({}, user).catch(() => []),
        fetchAdminCourses({}, user).catch(() => [])
      ])
      setQuizzes(quizzesData)
      setCourses(coursesData)
    } catch (err) {
      console.error('Error loading admin quizzes:', err)
      showAlert('error', 'Failed to load quizzes: ' + err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Track if create query param was already handled
  const createTriggeredRef = useRef(false)

  // Handle URL query parameters for courseId and create trigger
  useEffect(() => {
    const targetCourseId = searchParams.get('courseId')
    const shouldCreate = searchParams.get('create') === 'true'
    if (courses.length > 0 && targetCourseId && targetCourseId !== 'all') {
      setCourseFilter(targetCourseId)
      if (shouldCreate && !createTriggeredRef.current) {
        createTriggeredRef.current = true
        setCreateChoiceOpen(true)
        handleEditorCourseChange(targetCourseId)
        handleAiCourseChange(targetCourseId)
      }
    }
  }, [courses, searchParams])

  // Load modules & lessons when course changes in AI modal
  const handleAiCourseChange = async (courseId) => {
    setAiFormData(prev => ({ ...prev, courseId, moduleId: '', moduleTitle: '', lessonId: '', lessonTitle: '' }))
    setAiModules([])
    setAiLessons([])
    if (courseId) {
      try {
        const content = await fetchCourseContentAdmin(courseId, user)
        const mods = content.modules || []
        setAiModules(mods)
        // Extract all lessons across the course
        const allLessons = mods.flatMap(m => (m.lessons || []).map(l => ({ ...l, moduleTitle: m.title })))
        setAiLessons(allLessons)
      } catch (err) {
        console.warn('Error fetching modules for AI generator:', err)
      }
    }
  }

  // Handle module text change in AI modal (free text or datalist selection)
  const handleAiModuleTextChange = (text) => {
    const matched = aiModules.find(m => m.title.toLowerCase() === text.trim().toLowerCase() || m.moduleId === text.trim())
    setAiFormData(prev => ({
      ...prev,
      moduleTitle: text,
      moduleId: matched ? matched.moduleId : ''
    }))
  }

  // Handle lesson text change in AI modal (free text or datalist selection)
  const handleAiLessonTextChange = (text) => {
    const matched = aiLessons.find(l => l.title.toLowerCase() === text.trim().toLowerCase() || l.lessonId === text.trim())
    setAiFormData(prev => ({
      ...prev,
      lessonTitle: text,
      lessonId: matched ? matched.lessonId : '',
      moduleTitle: matched?.moduleTitle || prev.moduleTitle,
      moduleId: matched?.moduleId || prev.moduleId
    }))
  }

  // Load modules & lessons when course changes in Quiz Editor
  const handleEditorCourseChange = async (courseId) => {
    setQuizForm(prev => ({ ...prev, courseId, moduleId: '', moduleTitle: '', lessonId: '', lessonTitle: '' }))
    setEditorModules([])
    setEditorLessons([])
    if (courseId) {
      try {
        const content = await fetchCourseContentAdmin(courseId, user)
        const mods = content.modules || []
        setEditorModules(mods)
        // Extract all lessons across the course
        const allLessons = mods.flatMap(m => (m.lessons || []).map(l => ({ ...l, moduleTitle: m.title })))
        setEditorLessons(allLessons)
      } catch (err) {
        console.warn('Error fetching modules for editor:', err)
      }
    }
  }

  // Handle module text change in Quiz Editor (free text or datalist selection)
  const handleEditorModuleTextChange = (text) => {
    const matched = editorModules.find(m => m.title.toLowerCase() === text.trim().toLowerCase() || m.moduleId === text.trim())
    setQuizForm(prev => ({
      ...prev,
      moduleTitle: text,
      moduleId: matched ? matched.moduleId : ''
    }))
  }

  // Handle lesson text change in Quiz Editor (free text or datalist selection)
  const handleEditorLessonTextChange = (text) => {
    const matched = editorLessons.find(l => l.title.toLowerCase() === text.trim().toLowerCase() || l.lessonId === text.trim())
    setQuizForm(prev => ({
      ...prev,
      lessonTitle: text,
      lessonId: matched ? matched.lessonId : '',
      moduleTitle: matched?.moduleTitle || prev.moduleTitle,
      moduleId: matched?.moduleId || prev.moduleId
    }))
  }

  // Open Editor for Brand New Manual Quiz
  const openNewManualQuiz = () => {
    setCreateChoiceOpen(false)
    setEditingQuiz(null)
    setQuizForm({
      title: '',
      instructions: 'Complete all questions to check your knowledge and understanding.',
      courseId: courses.length > 0 ? courses[0].courseId : '',
      moduleId: '',
      moduleTitle: '',
      lessonId: '',
      lessonTitle: '',
      passingScore: 70,
      maximumAttempts: '',
      status: 'draft',
      creationMethod: 'manual',
      questions: [
        {
          questionId: `q_${Date.now()}_1`,
          order: 1,
          type: 'multiple_choice',
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          explanation: '',
          points: 1
        }
      ]
    })
    setFormErrors({})
    if (courses.length > 0) {
      handleEditorCourseChange(courses[0].courseId)
    }
    setEditorModalOpen(true)
  }

  // Open AI Generator Modal
  const openAiGenerator = () => {
    setCreateChoiceOpen(false)
    setAiFormData({
      courseId: courses.length > 0 ? courses[0].courseId : '',
      moduleId: '',
      moduleTitle: '',
      lessonId: '',
      lessonTitle: '',
      title: '',
      numQuestions: 5,
      difficulty: 'medium',
      questionTypes: 'mixed',
      passingScore: 70
    })
    if (courses.length > 0) {
      handleAiCourseChange(courses[0].courseId)
    }
    setAiModalOpen(true)
  }

  // Submit AI Generation
  const handleGenerateAiSubmit = async (e) => {
    e.preventDefault()
    if (!aiFormData.courseId) {
      showAlert('error', 'Please select a course to generate questions from.')
      return
    }

    setGeneratingAi(true)
    try {
      const generatedQuiz = await generateAIQuiz(aiFormData, user)
      setAiModalOpen(false)
      showAlert('success', 'AI draft quiz generated! Please review and publish when ready.')
      
      // Reload quizzes list
      await loadData()

      // Open the generated quiz directly into the review/edit modal
      openEditQuiz(generatedQuiz)
    } catch (err) {
      showAlert('error', 'AI Generation Failed: ' + err.message)
    } finally {
      setGeneratingAi(false)
    }
  }

  // Open Edit Quiz
  const openEditQuiz = async (quiz) => {
    try {
      // Fetch full quiz with answers
      const fullQuiz = await fetchAdminQuizById(quiz.quizId, user)
      setEditingQuiz(fullQuiz)
      setQuizForm({
        title: fullQuiz.title || '',
        instructions: fullQuiz.instructions || '',
        courseId: fullQuiz.courseId || '',
        moduleId: fullQuiz.moduleId || '',
        moduleTitle: fullQuiz.moduleTitle || '',
        lessonId: fullQuiz.lessonId || '',
        lessonTitle: fullQuiz.lessonTitle || '',
        passingScore: fullQuiz.passingScore !== undefined ? fullQuiz.passingScore : 70,
        maximumAttempts: fullQuiz.maximumAttempts || '',
        status: fullQuiz.status || 'draft',
        creationMethod: fullQuiz.creationMethod || 'manual',
        questions: Array.isArray(fullQuiz.questions) && fullQuiz.questions.length > 0 
          ? fullQuiz.questions 
          : [
              {
                questionId: `q_${Date.now()}_1`,
                order: 1,
                type: 'multiple_choice',
                questionText: '',
                options: ['', '', '', ''],
                correctAnswer: '',
                explanation: '',
                points: 1
              }
            ]
      })
      setFormErrors({})

      // Load related modules and lessons
      if (fullQuiz.courseId) {
        const content = await fetchCourseContentAdmin(fullQuiz.courseId, user).catch(() => ({}))
        const mods = content.modules || []
        setEditorModules(mods)
        if (fullQuiz.moduleId) {
          const mod = mods.find(m => m.moduleId === fullQuiz.moduleId)
          setEditorLessons(mod?.lessons || [])
        } else {
          const allLessons = mods.flatMap(m => (m.lessons || []).map(l => ({ ...l, moduleTitle: m.title })))
          setEditorLessons(allLessons)
        }
      }

      setEditorModalOpen(true)
    } catch (err) {
      showAlert('error', 'Failed to load quiz details: ' + err.message)
    }
  }

  // Open Preview Modal
  const openPreviewQuiz = async (quiz) => {
    try {
      const fullQuiz = await fetchAdminQuizById(quiz.quizId, user)
      setPreviewQuiz(fullQuiz)
      setPreviewModalOpen(true)
    } catch (err) {
      showAlert('error', 'Failed to load preview: ' + err.message)
    }
  }

  // Question manipulation helpers
  const handleAddQuestion = (type = 'multiple_choice') => {
    const newQ = {
      questionId: `q_${Date.now()}_${quizForm.questions.length + 1}`,
      order: quizForm.questions.length + 1,
      type,
      questionText: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : ['True', 'False'],
      correctAnswer: type === 'multiple_choice' ? '' : 'True',
      explanation: '',
      points: 1
    }
    setQuizForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }))
  }

  // Add multiple question slots at once (e.g. 5, 10, 20, 50)
  const handleAddBatchQuestions = (count = 5, type = 'multiple_choice') => {
    const newQuestions = []
    const baseLength = quizForm.questions.length
    for (let i = 0; i < count; i++) {
      const idx = baseLength + i + 1
      newQuestions.push({
        questionId: `q_${Date.now()}_${idx}`,
        order: idx,
        type,
        questionText: '',
        options: type === 'multiple_choice' ? ['', '', '', ''] : ['True', 'False'],
        correctAnswer: type === 'multiple_choice' ? '' : 'True',
        explanation: '',
        points: 1
      })
    }
    setQuizForm(prev => ({
      ...prev,
      questions: [...prev.questions, ...newQuestions]
    }))
    showAlert('success', `Added ${count} new ${type === 'multiple_choice' ? 'multiple choice' : 'true/false'} questions.`)
  }

  // Duplicate a specific question in manual builder
  const handleDuplicateQuestion = (qIndex) => {
    const targetQ = quizForm.questions[qIndex]
    if (!targetQ) return
    const cloned = {
      ...targetQ,
      questionId: `q_${Date.now()}_${quizForm.questions.length + 1}`,
      order: quizForm.questions.length + 1,
      options: [...(targetQ.options || [])]
    }
    setQuizForm(prev => {
      const updated = [...prev.questions]
      updated.splice(qIndex + 1, 0, cloned)
      return { ...prev, questions: updated }
    })
    showAlert('success', `Question #${qIndex + 1} duplicated.`)
  }

  const handleUpdateQuestion = (qIndex, field, value) => {
    setQuizForm(prev => {
      const updated = [...prev.questions]
      updated[qIndex] = { ...updated[qIndex], [field]: value }
      return { ...prev, questions: updated }
    })
  }

  const handleUpdateOption = (qIndex, optIndex, value) => {
    setQuizForm(prev => {
      const updated = [...prev.questions]
      const q = { ...updated[qIndex] }
      const newOpts = [...q.options]
      const oldVal = newOpts[optIndex]
      newOpts[optIndex] = value

      // If this option was the correctAnswer, update correctAnswer too
      if (q.correctAnswer === oldVal) {
        q.correctAnswer = value
      }

      q.options = newOpts
      updated[qIndex] = q
      return { ...prev, questions: updated }
    })
  }

  const handleAddOption = (qIndex) => {
    setQuizForm(prev => {
      const updated = [...prev.questions]
      const q = { ...updated[qIndex] }
      q.options = [...q.options, '']
      updated[qIndex] = q
      return { ...prev, questions: updated }
    })
  }

  const handleRemoveOption = (qIndex, optIndex) => {
    setQuizForm(prev => {
      const updated = [...prev.questions]
      const q = { ...updated[qIndex] }
      if (q.options.length <= 2) {
        showAlert('error', 'Multiple choice questions must have at least 2 options')
        return prev
      }
      const removedVal = q.options[optIndex]
      q.options = q.options.filter((_, idx) => idx !== optIndex)
      if (q.correctAnswer === removedVal) {
        q.correctAnswer = q.options[0] || ''
      }
      updated[qIndex] = q
      return { ...prev, questions: updated }
    })
  }

  const handleDeleteQuestion = (qIndex) => {
    if (quizForm.questions.length <= 1) {
      showAlert('error', 'Quiz must contain at least one question')
      return
    }
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== qIndex)
    }))
  }

  const handleMoveQuestion = (qIndex, direction) => {
    const targetIndex = qIndex + direction
    if (targetIndex < 0 || targetIndex >= quizForm.questions.length) return

    setQuizForm(prev => {
      const updated = [...prev.questions]
      const temp = updated[qIndex]
      updated[qIndex] = updated[targetIndex]
      updated[targetIndex] = temp
      return { ...prev, questions: updated }
    })
  }

  // Validate quiz form before saving
  const validateForm = (isPublishing) => {
    const errors = {}

    if (!quizForm.title || !quizForm.title.trim()) {
      errors.title = 'Quiz title is required'
    }

    if (!quizForm.courseId) {
      errors.courseId = 'An associated course is required'
    }

    const passing = Number(quizForm.passingScore)
    if (isNaN(passing) || passing < 0 || passing > 100) {
      errors.passingScore = 'Passing score must be between 0 and 100'
    }

    if (isPublishing) {
      if (!quizForm.questions || quizForm.questions.length === 0) {
        errors.questions = 'At least one question is required before publishing'
      }

      quizForm.questions.forEach((q, idx) => {
        const qNum = idx + 1
        if (!q.questionText || !q.questionText.trim()) {
          errors[`q_${idx}_text`] = `Question #${qNum} is missing question text`
        }

        if (q.type === 'multiple_choice') {
          const cleanOpts = (q.options || []).map(o => o.trim()).filter(Boolean)
          if (cleanOpts.length < 2) {
            errors[`q_${idx}_opts`] = `Question #${qNum} requires at least 2 non-empty options`
          }
          if (!q.correctAnswer || !q.correctAnswer.trim()) {
            errors[`q_${idx}_correct`] = `Question #${qNum} must have a correct answer selected`
          }
        } else if (q.type === 'true_false') {
          if (!['True', 'False', true, false].includes(q.correctAnswer)) {
            errors[`q_${idx}_correct`] = `Question #${qNum} must select True or False`
          }
        }
      })
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save Quiz (Draft or Publish)
  const handleSaveQuiz = async (targetStatus) => {
    const isPublishing = targetStatus === 'published'
    if (!validateForm(isPublishing)) {
      showAlert('error', isPublishing ? 'Please fix the validation errors before publishing.' : 'Please fill the required title and course.')
      return
    }

    setSavingQuiz(true)
    try {
      const payload = {
        ...quizForm,
        status: targetStatus,
        maximumAttempts: quizForm.maximumAttempts ? Number(quizForm.maximumAttempts) : null,
        passingScore: Number(quizForm.passingScore)
      }

      if (editingQuiz) {
        await updateQuiz(editingQuiz.quizId, payload, user)
        showAlert('success', `Quiz updated successfully (${targetStatus === 'published' ? 'Published' : 'Saved as Draft'})`)
      } else {
        await createManualQuiz(payload, user)
        showAlert('success', `Quiz created successfully (${targetStatus === 'published' ? 'Published' : 'Saved as Draft'})`)
      }

      setEditorModalOpen(false)
      await loadData()
    } catch (err) {
      showAlert('error', err.message || 'Failed to save quiz')
    } finally {
      setSavingQuiz(false)
    }
  }

  // Quick Status Toggle (Publish / Unpublish)
  const handleToggleStatus = async (quiz) => {
    const nextStatus = quiz.status === 'published' ? 'unpublished' : 'published'
    try {
      await updateQuizStatus(quiz.quizId, nextStatus, user)
      showAlert('success', `Quiz ${nextStatus === 'published' ? 'published' : 'unpublished'} successfully`)
      await loadData()
    } catch (err) {
      showAlert('error', err.message || 'Failed to update quiz status')
    }
  }

  // Duplicate Quiz
  const handleDuplicate = async (quiz) => {
    try {
      await duplicateQuiz(quiz.quizId, user)
      showAlert('success', `"${quiz.title}" duplicated as draft`)
      await loadData()
    } catch (err) {
      showAlert('error', err.message || 'Failed to duplicate quiz')
    }
  }

  // Delete / Archive Quiz with Confirmation
  const confirmDelete = (quiz) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Quiz',
      message: 'Are you sure you want to delete this quiz? Existing learner results will not be deleted.',
      actionType: 'delete',
      quiz
    })
  }

  const executeDelete = async () => {
    if (!confirmModal.quiz) return
    try {
      await deleteQuiz(confirmModal.quiz.quizId, user)
      showAlert('success', 'Quiz deleted successfully. Learner results are preserved.')
      setConfirmModal({ isOpen: false, title: '', message: '', actionType: '', quiz: null })
      await loadData()
    } catch (err) {
      showAlert('error', err.message || 'Failed to delete quiz')
    }
  }

  // Filtered Quizzes calculation
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      if (statusFilter !== 'all' && quiz.status !== statusFilter) return false
      if (courseFilter !== 'all' && quiz.courseId !== courseFilter) return false
      if (methodFilter !== 'all' && quiz.creationMethod !== methodFilter) return false

      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase()
        const matchesTitle = quiz.title?.toLowerCase().includes(term)
        const matchesCourse = quiz.courseTitle?.toLowerCase().includes(term)
        const matchesModule = quiz.moduleTitle?.toLowerCase().includes(term)
        const matchesLesson = quiz.lessonTitle?.toLowerCase().includes(term)
        if (!matchesTitle && !matchesCourse && !matchesModule && !matchesLesson) return false
      }

      return true
    })
  }, [quizzes, statusFilter, courseFilter, methodFilter, searchQuery])

  if (!user || user.userType !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-gray-200 shadow-sm text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-600 mb-6">
            Administrator privileges are required to access this area.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#23735F] text-white font-bold text-sm hover:bg-[#185243] transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/admin-panel"
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors"
                title="Back to Admin Portal"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#23735F] text-white flex items-center justify-center font-bold">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">Manage Quizzes</h1>
                  <p className="text-xs text-gray-500">One Community Ely Training Centre Assessments</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={() => setCreateChoiceOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#23735F] hover:bg-[#185243] rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create Quiz
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Feedback Alert */}
        {alertInfo.message && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
            alertInfo.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {alertInfo.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-semibold">{alertInfo.message}</span>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs mb-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quizzes by title, course, or lesson..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.courseId} value={c.courseId}>{c.title}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
              <option value="archived">Archived</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Methods</option>
              <option value="manual">Manual</option>
              <option value="ai">AI Generated</option>
            </select>
          </div>
        </div>

        {/* Quizzes Grid / Table */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-xl border border-gray-200">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Loading training quizzes...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-xl border border-dashed border-gray-300">
            <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900 mb-1">No quizzes found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              {searchQuery || statusFilter !== 'all' || courseFilter !== 'all' || methodFilter !== 'all'
                ? 'No quizzes match your current search and filter criteria.'
                : 'Get started by creating your first course quiz manually or generating one using AI.'}
            </p>
            <button
              onClick={() => setCreateChoiceOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#23735F] text-white font-bold text-sm hover:bg-[#185243] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => {
              const isAi = quiz.creationMethod === 'ai'
              const isPublished = quiz.status === 'published'

              return (
                <div
                  key={quiz.quizId}
                  className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isPublished
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : quiz.status === 'draft'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}>
                        {quiz.status.toUpperCase()}
                      </span>

                      {isAi ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          <Sparkles className="h-3 w-3" />
                          AI Generated Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Manual
                        </span>
                      )}
                    </div>

                    {/* Quiz Title */}
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-1" title={quiz.title}>
                      {quiz.title}
                    </h3>

                    {/* Associated Course / Module / Lesson */}
                    <div className="space-y-1 mb-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <BookOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-800">Course:</span>
                        <span className="truncate">{quiz.courseTitle || 'Unassigned'}</span>
                      </div>
                      {quiz.moduleTitle && (
                        <div className="flex items-center gap-1.5 line-clamp-1">
                          <Layers className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-800">Module:</span>
                          <span className="truncate">{quiz.moduleTitle}</span>
                        </div>
                      )}
                      {quiz.lessonTitle && (
                        <div className="flex items-center gap-1.5 line-clamp-1">
                          <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-800">Lesson:</span>
                          <span className="truncate">{quiz.lessonTitle}</span>
                        </div>
                      )}
                    </div>

                    {/* Key Stats Bar */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-2.5 mb-4 text-center">
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">Questions</div>
                        <div className="text-base font-extrabold text-gray-900">{quiz.questionCount || quiz.questions?.length || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">Passing Score</div>
                        <div className="text-base font-extrabold text-[#23735F]">{quiz.passingScore || 70}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openPreviewQuiz(quiz)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-[#23735F] hover:bg-emerald-50 transition-colors"
                        title="Preview Quiz Questions"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => openEditQuiz(quiz)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Quiz"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(quiz)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Duplicate Quiz"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => confirmDelete(quiz)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Quiz"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Publish / Unpublish Button */}
                    <button
                      onClick={() => handleToggleStatus(quiz)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        isPublished
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-[#23735F] text-white hover:bg-[#185243]'
                      }`}
                    >
                      {isPublished ? 'Unpublish' : 'Publish Quiz'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── CREATE CHOICE MODAL (Manual vs AI) ── */}
      {createChoiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-200 animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Choose How to Create Your Quiz</h2>
              <button onClick={() => setCreateChoiceOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-6">
              You can construct quiz questions from scratch or leverage AWS Bedrock AI to generate a grounded draft from your course and lesson content.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Manual */}
              <button
                onClick={openNewManualQuiz}
                className="p-5 rounded-xl border-2 border-gray-200 hover:border-[#23735F] hover:bg-emerald-50/40 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                    <Edit className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-[#23735F]">
                    Create Quiz Manually
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Write your own multiple choice and true/false questions, configure passing scores, and add custom explanations.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs font-bold text-[#23735F] flex items-center justify-between">
                  <span>Start Manual &rarr;</span>
                </div>
              </button>

              {/* Option 2: AI Generated */}
              <button
                onClick={openAiGenerator}
                className="p-5 rounded-xl border-2 border-purple-200 bg-purple-50/20 hover:border-purple-500 hover:bg-purple-50/60 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-purple-700">
                    Generate Quiz with AI
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Automatically draft scenario questions from course and lesson text. AI quizzes are saved as drafts for your review before publishing.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-purple-100 text-xs font-bold text-purple-700 flex items-center justify-between">
                  <span>Generate with Bedrock &rarr;</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI QUIZ GENERATOR MODAL ── */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-700">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-lg font-bold text-gray-900">Generate Quiz with AI</h2>
              </div>
              <button onClick={() => setAiModalOpen(false)} disabled={generatingAi} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-5">
              Select the course material. AWS Bedrock will extract the syllabus and draft relevant practical questions.
            </p>

            <form onSubmit={handleGenerateAiSubmit} className="space-y-4">
              {/* Course Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={aiFormData.courseId}
                  onChange={(e) => handleAiCourseChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">Select a Course...</option>
                  {courses.map(c => (
                    <option key={c.courseId} value={c.courseId}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Module Textfield */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Module <span className="text-gray-400 font-normal">(Optional — type or select)</span>
                </label>
                <input
                  type="text"
                  list="ai-modules-datalist"
                  value={aiFormData.moduleTitle || ''}
                  onChange={(e) => handleAiModuleTextChange(e.target.value)}
                  placeholder={aiModules.length > 0 ? "Type or select a module..." : "Enter module/topic name..."}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <datalist id="ai-modules-datalist">
                  {aiModules.map(m => (
                    <option key={m.moduleId} value={m.title}>{m.title}</option>
                  ))}
                </datalist>
              </div>

              {/* Lesson Textfield */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Lesson <span className="text-gray-400 font-normal">(Optional — quiz will be generated from this lesson)</span>
                </label>
                <input
                  type="text"
                  list="ai-lessons-datalist"
                  value={aiFormData.lessonTitle || ''}
                  onChange={(e) => handleAiLessonTextChange(e.target.value)}
                  placeholder={aiLessons.length > 0 ? "Type or select a lesson..." : "Enter lesson/topic name..."}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <datalist id="ai-lessons-datalist">
                  {aiLessons.map(l => (
                    <option key={l.lessonId} value={l.title}>
                      {l.moduleTitle ? `[${l.moduleTitle}] ${l.title}` : l.title}
                    </option>
                  ))}
                </datalist>
                {aiFormData.lessonTitle && (
                  <p className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    The AI will specifically ground and craft all questions from "{aiFormData.lessonTitle}".
                  </p>
                )}
              </div>

              {/* Optional Custom Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Quiz Title <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={aiFormData.title}
                  onChange={(e) => setAiFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Budgeting & Daily Expense Assessment"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Number of questions */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Number of Questions <span className="text-gray-400 font-normal">(e.g. 5, 20, 50, 100)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={aiFormData.numQuestions}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1)
                      setAiFormData(prev => ({ ...prev, numQuestions: val }))
                    }}
                    placeholder="Enter number (e.g. 10, 50, 100)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Difficulty Level</label>
                  <select
                    value={aiFormData.difficulty}
                    onChange={(e) => setAiFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Question Formats</label>
                <select
                  value={aiFormData.questionTypes}
                  onChange={(e) => setAiFormData(prev => ({ ...prev, questionTypes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="mixed">Mixed (Multiple Choice & True/False)</option>
                  <option value="multiple_choice">Multiple Choice Only</option>
                  <option value="true_false">True / False Only</option>
                </select>
              </div>

              {/* Rules Note */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 leading-relaxed">
                <strong>AI Safety Rule:</strong> AI-generated quizzes are always saved as <strong>Draft</strong>. You will be able to review, edit, and reorder all questions before publishing.
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  disabled={generatingAi}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingAi || !aiFormData.courseId}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {generatingAi ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating your draft quiz. Please wait…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Draft Quiz
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FULL QUIZ BUILDER / EDITOR MODAL ── */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 my-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {editingQuiz ? 'Edit Quiz' : 'Create Quiz Manually'}
                    </h2>
                    {quizForm.creationMethod === 'ai' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI Generated Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Configure quiz metadata, questions, points, and answers.</p>
                </div>
              </div>
              <button onClick={() => setEditorModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto py-6 space-y-6 flex-1 pr-2">
              {/* Section 1: General Info */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#23735F]" />
                  Quiz Settings & Association
                </h3>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Quiz Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quizForm.title}
                    onChange={(e) => setQuizForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Budgeting Essentials & Living Costs"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {formErrors.title && <p className="text-xs text-red-600 mt-1">{formErrors.title}</p>}
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Instructions</label>
                  <textarea
                    rows={2}
                    value={quizForm.instructions}
                    onChange={(e) => setQuizForm(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Instructions for the learner before taking this quiz..."
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Course, Module, Lesson Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Associated Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={quizForm.courseId}
                      onChange={(e) => handleEditorCourseChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">Select Course...</option>
                      {courses.map(c => (
                        <option key={c.courseId} value={c.courseId}>{c.title}</option>
                      ))}
                    </select>
                    {formErrors.courseId && <p className="text-xs text-red-600 mt-1">{formErrors.courseId}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Module <span className="text-gray-400 font-normal">(Optional — type or select)</span>
                    </label>
                    <input
                      type="text"
                      list="editor-modules-datalist"
                      value={quizForm.moduleTitle || ''}
                      onChange={(e) => handleEditorModuleTextChange(e.target.value)}
                      placeholder={editorModules.length > 0 ? "Type or choose a module..." : "Enter module name..."}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <datalist id="editor-modules-datalist">
                      {editorModules.map(m => (
                        <option key={m.moduleId} value={m.title}>{m.title}</option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Lesson <span className="text-gray-400 font-normal">(Optional — type or select)</span>
                    </label>
                    <input
                      type="text"
                      list="editor-lessons-datalist"
                      value={quizForm.lessonTitle || ''}
                      onChange={(e) => handleEditorLessonTextChange(e.target.value)}
                      placeholder={editorLessons.length > 0 ? "Type or choose a lesson..." : "Enter lesson name..."}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <datalist id="editor-lessons-datalist">
                      {editorLessons.map(l => (
                        <option key={l.lessonId} value={l.title}>
                          {l.moduleTitle ? `[${l.moduleTitle}] ${l.title}` : l.title}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Passing score and Max Attempts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Passing Score (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={quizForm.passingScore}
                      onChange={(e) => setQuizForm(prev => ({ ...prev, passingScore: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {formErrors.passingScore && <p className="text-xs text-red-600 mt-1">{formErrors.passingScore}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Max Attempts <span className="text-gray-400 font-normal">(Optional, leave empty for unlimited)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quizForm.maximumAttempts}
                      onChange={(e) => setQuizForm(prev => ({ ...prev, maximumAttempts: e.target.value }))}
                      placeholder="e.g. 3 (empty = unlimited)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Questions Manager */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-[#23735F]" />
                    Questions ({quizForm.questions.length})
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('multiple_choice')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Multiple Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('true_false')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add True / False
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBatchQuestions(5, 'multiple_choice')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      title="Add 5 questions at once"
                    >
                      + 5 Questions
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBatchQuestions(10, 'multiple_choice')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      title="Add 10 questions at once"
                    >
                      + 10 Questions
                    </button>
                  </div>
                </div>

                {quizForm.questions.map((q, qIdx) => {
                  const isMc = q.type === 'multiple_choice'
                  const qNum = qIdx + 1

                  return (
                    <div
                      key={q.questionId || qIdx}
                      className="bg-white rounded-xl p-5 border border-gray-300 shadow-xs space-y-4 relative"
                    >
                      {/* Question Card Header */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-[#23735F] text-white flex items-center justify-center text-xs font-bold">
                            {qNum}
                          </span>
                          <span className="text-xs font-bold text-gray-700">
                            {isMc ? 'Multiple Choice' : 'True / False'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(qIdx)}
                            className="p-1 rounded-md text-gray-400 hover:text-purple-600"
                            title="Duplicate this Question"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={qIdx === 0}
                            onClick={() => handleMoveQuestion(qIdx, -1)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={qIdx === quizForm.questions.length - 1}
                            onClick={() => handleMoveQuestion(qIdx, 1)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="p-1 rounded-md text-red-400 hover:text-red-700"
                            title="Delete Question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text & Points */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Question Text <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => handleUpdateQuestion(qIdx, 'questionText', e.target.value)}
                            placeholder="Enter the question here..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                          {formErrors[`q_${qIdx}_text`] && (
                            <p className="text-xs text-red-600 mt-1">{formErrors[`q_${qIdx}_text`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Points</label>
                          <input
                            type="number"
                            min={1}
                            value={q.points || 1}
                            onChange={(e) => handleUpdateQuestion(qIdx, 'points', Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Multiple Choice Options */}
                      {isMc ? (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-gray-700">
                            Answer Options <span className="font-normal text-gray-500">(Click radio button to mark correct answer)</span>
                          </label>
                          <div className="space-y-2">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = q.correctAnswer === opt && opt !== ''

                              return (
                                <div key={oIdx} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct_${qIdx}`}
                                    checked={isCorrect}
                                    onChange={() => handleUpdateQuestion(qIdx, 'correctAnswer', opt)}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateOption(qIdx, oIdx, e.target.value)}
                                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                    className={`flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none ${
                                      isCorrect ? 'border-emerald-500 bg-emerald-50/40 font-semibold' : 'border-gray-300'
                                    }`}
                                  />
                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(qIdx, oIdx)}
                                      className="text-gray-400 hover:text-red-500 p-1"
                                      title="Remove Option"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleAddOption(qIdx)}
                              className="text-xs font-bold text-[#23735F] hover:underline flex items-center gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Another Option
                            </button>
                            {formErrors[`q_${qIdx}_correct`] && (
                              <p className="text-xs text-red-600">{formErrors[`q_${qIdx}_correct`]}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* True / False Options */
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-2">
                            Correct Answer <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-4">
                            {['True', 'False'].map((val) => {
                              const isSelected = String(q.correctAnswer).toLowerCase() === val.toLowerCase()
                              return (
                                <label
                                  key={val}
                                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer font-bold text-sm transition-all ${
                                    isSelected
                                      ? 'border-[#23735F] bg-emerald-50 text-[#23735F]'
                                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`tf_${qIdx}`}
                                    value={val}
                                    checked={isSelected}
                                    onChange={() => handleUpdateQuestion(qIdx, 'correctAnswer', val)}
                                    className="sr-only"
                                  />
                                  <span>{val}</span>
                                  {isSelected && <Check className="h-4 w-4 text-[#23735F]" />}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Explanation <span className="font-normal text-gray-500">(Displayed after the learner submits the quiz)</span>
                        </label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                          placeholder="Why is this answer correct? Helpful takeaway for the learner..."
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditorModalOpen(false)}
                disabled={savingQuiz}
                className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>

              <div className="w-full sm:w-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveQuiz('draft')}
                  disabled={savingQuiz}
                  className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuiz('published')}
                  disabled={savingQuiz}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-[#23735F] hover:bg-[#185243] text-white text-sm font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingQuiz ? 'Saving...' : 'Publish Quiz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW QUIZ MODAL ── */}
      {previewModalOpen && previewQuiz && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <span className="text-xs font-bold text-[#23735F] uppercase tracking-wider">Quiz Preview</span>
                <h2 className="text-lg font-bold text-gray-900">{previewQuiz.title}</h2>
                <p className="text-xs text-gray-500">Course: {previewQuiz.courseTitle} · Passing score: {previewQuiz.passingScore}%</p>
              </div>
              <button onClick={() => setPreviewModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
              {previewQuiz.instructions && (
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-xs text-emerald-900">
                  <strong>Instructions:</strong> {previewQuiz.instructions}
                </div>
              )}

              {previewQuiz.questions?.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>Q{idx + 1}. {q.type === 'true_false' ? 'True/False' : 'Multiple Choice'}</span>
                    <span className="text-gray-400">{q.points || 1} pt</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{q.questionText}</p>

                  <div className="space-y-1.5 pt-1">
                    {q.options?.map((opt, oIdx) => {
                      const isCorrect = opt === q.correctAnswer
                      return (
                        <div
                          key={oIdx}
                          className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                            isCorrect
                              ? 'bg-emerald-100/70 border border-emerald-300 font-bold text-emerald-900'
                              : 'bg-white border border-gray-200 text-gray-700'
                          }`}
                        >
                          <span>{opt}</span>
                          {isCorrect && <span className="text-emerald-700 font-extrabold text-[11px]">✓ Correct Answer</span>}
                        </div>
                      )
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-2 text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="font-bold text-[#23735F]">Explanation: </span>{q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 animate-in fade-in">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', actionType: '', quiz: null })}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
              >
                Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminQuizzes
