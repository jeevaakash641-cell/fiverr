import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { historyService } from '../services/historyService'
import { fetchLearnerDashboardSummary } from '../services/dashboardService'
import { 
  ArrowLeft, 
  BookOpen, 
  Award, 
  MessageSquare, 
  Clock, 
  TrendingUp,
  Trash2,
  Eye,
  Calendar,
  BarChart3,
  CheckCircle2,
  PlayCircle,
  Compass,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react'
import Feedback from './Feedback'

const History = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('courses') // Default to 'courses' so learner immediately sees course progress
  const [courseFilter, setCourseFilter] = useState('all') // 'all' | 'in_progress' | 'completed'
  const [bookHistory, setBookHistory] = useState([])
  const [quizHistory, setQuizHistory] = useState([])
  const [aiHistory, setAIHistory] = useState([])
  const [dashboardSummary, setDashboardSummary] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    historyService.setUser(user.email || user.id)
    loadHistory()
  }, [user, navigate])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const [books, quizzes, aiChats, stats, summaryData] = await Promise.all([
        historyService.getBookHistory(50).catch(() => []),
        historyService.getQuizHistory(50).catch(() => []),
        historyService.getAIHistory(50).catch(() => []),
        historyService.getStatistics().catch(() => null),
        fetchLearnerDashboardSummary(user).catch(() => null)
      ])

      setBookHistory(books || [])
      setQuizHistory(quizzes || [])
      setAIHistory(aiChats || [])
      setStatistics(stats)
      setDashboardSummary(summaryData)
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEntry = async (historyId, type) => {
    if (!confirm('Delete this history entry?')) return

    try {
      await historyService.deleteHistoryEntry(historyId, type)
      loadHistory()
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry')
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('Clear all learning activity history? This cannot be undone.')) return

    try {
      await historyService.clearHistory()
      loadHistory()
    } catch (error) {
      console.error('Error clearing history:', error)
      alert('Failed to clear history')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently'
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return 'Recently'
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0m'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (!user) return null

  // Course Summary Data
  const inProgressCourses = dashboardSummary?.coursesInProgress || []
  const completedCourses = dashboardSummary?.coursesCompleted || []
  const notStartedCourses = dashboardSummary?.coursesNotStarted || []
  const certificates = dashboardSummary?.certificates || []
  const counts = dashboardSummary?.summaryCounts || {
    inProgressCount: inProgressCourses.length,
    completedCount: completedCourses.length,
    certificatesCount: certificates.length
  }

  const totalCourseCount = inProgressCourses.length + completedCourses.length + notStartedCourses.length

  // Filtered courses for Courses tab
  const displayedCourses = (() => {
    if (courseFilter === 'in_progress') return inProgressCourses
    if (courseFilter === 'completed') return completedCourses
    if (courseFilter === 'not_started') return notStartedCourses
    return [...inProgressCourses, ...completedCourses, ...notStartedCourses]
  })()

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white shadow-2xs border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center space-x-2.5">
              <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
              <div>
                <h1 className="text-base md:text-lg font-black text-gray-900 leading-tight">Learning & Course History</h1>
                <p className="text-xs text-gray-500 font-medium">Track your course progress, completions and activities</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/course-recommendations"
              className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Compass className="h-3.5 w-3.5 text-[#23735F]" />
              <span className="hidden sm:inline">Find Courses</span>
            </Link>

            <button
              onClick={() => setShowFeedback(true)}
              className="px-3 py-1.5 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Share Your Feedback & Experience"
            >
              <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
              <span>Feedback</span>
            </button>

            <Link
              to="/settings"
              className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-xs font-bold"
              title="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>

            <button
              onClick={handleClearHistory}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors text-xs font-bold"
              title="Clear Activity History"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Clear Activity</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-7xl space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
          {/* Courses In Progress */}
          <div 
            onClick={() => { setActiveTab('courses'); setCourseFilter('in_progress'); }}
            className={`bg-white p-4 rounded-2xl shadow-xs border cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'courses' && courseFilter === 'in_progress' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-gray-200 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 md:w-11 md:h-11 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">In Progress</p>
                <p className="text-xl md:text-2xl font-black text-amber-700">{counts.inProgressCount || inProgressCourses.length}</p>
                <p className="text-[10px] text-gray-400 font-medium">Courses ongoing</p>
              </div>
            </div>
          </div>

          {/* Courses Completed */}
          <div 
            onClick={() => { setActiveTab('courses'); setCourseFilter('completed'); }}
            className={`bg-white p-4 rounded-2xl shadow-xs border cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'courses' && courseFilter === 'completed' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 md:w-11 md:h-11 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Completed</p>
                <p className="text-xl md:text-2xl font-black text-emerald-700">{counts.completedCount || completedCourses.length}</p>
                <p className="text-[10px] text-gray-400 font-medium">100% finished</p>
              </div>
            </div>
          </div>

          {/* Certificates Earned */}
          <div 
            onClick={() => { setActiveTab('courses'); setCourseFilter('completed'); }}
            className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 md:w-11 md:h-11 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Certificates</p>
                <p className="text-xl md:text-2xl font-black text-blue-800">{counts.certificatesCount || certificates.length}</p>
                <p className="text-[10px] text-gray-400 font-medium">Verified issued</p>
              </div>
            </div>
          </div>

          {/* Quizzes / Activity */}
          <div 
            onClick={() => setActiveTab('quizzes')}
            className={`bg-white p-4 rounded-2xl shadow-xs border cursor-pointer hover:shadow-md transition-all ${
              activeTab === 'quizzes' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-400'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 md:w-11 md:h-11 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quizzes Attempted</p>
                <p className="text-xl md:text-2xl font-black text-purple-900">{quizHistory.length || statistics?.totalQuizzesTaken || 0}</p>
                <p className="text-[10px] text-gray-400 font-medium">Knowledge checks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 text-xs md:text-sm font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-[#23735F] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Course Progress & Completions</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-1 ${
              activeTab === 'courses' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {totalCourseCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs md:text-sm font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#23735F] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>All Activities</span>
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-4 py-2 text-xs md:text-sm font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quizzes'
                ? 'bg-[#23735F] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Quizzes</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-1 ${
              activeTab === 'quizzes' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {quizHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('books')}
            className={`px-4 py-2 text-xs md:text-sm font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'books'
                ? 'bg-[#23735F] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Study Guides</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-1 ${
              activeTab === 'books' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {bookHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-xs md:text-sm font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-[#23735F] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>AI Chats</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-1 ${
              activeTab === 'ai' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {aiHistory.length}
            </span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#23735F] border-t-transparent mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700">Loading your learning history...</p>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: COURSES IN PROGRESS & COMPLETED */}
        {/* ======================================================== */}
        {!loading && activeTab === 'courses' && (
          <div className="space-y-6">
            {/* Filter Pills for Courses */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase mr-1">Filter:</span>
                <button
                  onClick={() => setCourseFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    courseFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Courses ({totalCourseCount})
                </button>
                <button
                  onClick={() => setCourseFilter('in_progress')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    courseFilter === 'in_progress'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  In Progress ({inProgressCourses.length})
                </button>
                <button
                  onClick={() => setCourseFilter('completed')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    courseFilter === 'completed'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Completed ({completedCourses.length})
                </button>
                {notStartedCourses.length > 0 && (
                  <button
                    onClick={() => setCourseFilter('not_started')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      courseFilter === 'not_started'
                        ? 'bg-blue-700 text-white'
                        : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    Not Started ({notStartedCourses.length})
                  </button>
                )}
              </div>

              <Link
                to="/course-recommendations"
                className="text-xs font-black text-[#23735F] hover:underline flex items-center gap-1"
              >
                <span>Browse More Courses</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Courses List */}
            {displayedCourses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs space-y-3">
                <GraduationCap className="h-12 w-12 text-gray-300 mx-auto" />
                <h3 className="text-base font-bold text-gray-900">
                  {courseFilter === 'in_progress' ? 'No Courses Currently In Progress' :
                   courseFilter === 'completed' ? 'No Completed Courses Yet' :
                   'No Courses Found in History'}
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  {courseFilter === 'completed' 
                    ? 'When you complete 100% of course lessons and pass required assessments, your completed courses will appear here.'
                    : 'Explore the course catalog to start tailored digital, work and life skills training.'}
                </p>
                <Link
                  to="/course-recommendations"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#23735F] text-white rounded-xl text-xs font-black hover:bg-[#1b5b4b] transition-all shadow-xs"
                >
                  <Compass className="h-4 w-4" />
                  <span>Explore Course Catalog</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedCourses.map((c) => {
                  const isCompleted = c.status === 'completed' || (c.progressPercentage >= 100)
                  const isNotStarted = c.status === 'not_started' || (!c.progressPercentage && !c.completedLessonsCount)
                  const progressPct = c.progressPercentage || (isCompleted ? 100 : 0)

                  return (
                    <div 
                      key={c.courseId}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                              {c.category || 'Digital Skills'}
                            </span>
                            <h3 className="text-base font-black text-gray-900 leading-snug">
                              {c.courseTitle || c.title}
                            </h3>
                          </div>

                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0 flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isNotStarted
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}>
                            {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                            {isCompleted ? 'Completed' : isNotStarted ? 'Enrolled' : `${progressPct}% In Progress`}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-gray-600">
                            <span>Progress</span>
                            <span className="font-bold text-gray-900">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isCompleted ? 'bg-emerald-600' : 'bg-[#23735F]'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Metadata Details */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 pt-1 border-t border-gray-100">
                          {c.completedLessonsCount !== undefined && c.totalRequiredLessons !== undefined && (
                            <span className="font-medium">
                              📚 {c.completedLessonsCount} / {c.totalRequiredLessons} lessons finished
                            </span>
                          )}
                          {c.completedAt && (
                            <span className="font-medium text-emerald-800">
                              🏆 Finished: {formatDate(c.completedAt)}
                            </span>
                          )}
                          {c.lastAccessedAt && !c.completedAt && (
                            <span className="font-medium">
                              ⏱️ Last active: {formatDate(c.lastAccessedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Course Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        <Link
                          to={`/courses/${c.courseId}`}
                          className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          Course Overview
                        </Link>

                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <Link
                              to={`/courses/${c.courseId}/certificate`}
                              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>View Certificate</span>
                            </Link>
                          ) : (
                            <Link
                              to={c.currentLessonId ? `/courses/${c.courseId}/learn/${c.currentLessonId}` : `/courses/${c.courseId}/learn`}
                              className="px-4 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              <span>Continue Course</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: ALL ACTIVITIES */}
        {/* ======================================================== */}
        {!loading && activeTab === 'all' && (
          <div className="space-y-4">
            {[...bookHistory, ...quizHistory, ...aiHistory].length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs space-y-2">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto" />
                <h3 className="text-base font-bold text-gray-900">No Activity Records Yet</h3>
                <p className="text-xs text-gray-500">Your recent quizzes, book readings, and AI questions will appear here.</p>
              </div>
            ) : (
              [...bookHistory, ...quizHistory, ...aiHistory]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 30)
                .map((entry) => (
                  <div key={entry.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          entry.type === 'book_view' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                          entry.type === 'quiz_attempt' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          'bg-purple-50 text-purple-600 border border-purple-200'
                        }`}>
                          {entry.type === 'book_view' && <BookOpen className="h-5 w-5" />}
                          {entry.type === 'quiz_attempt' && <Award className="h-5 w-5" />}
                          {entry.type === 'ai_conversation' && <MessageSquare className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm truncate">
                            {entry.type === 'book_view' && entry.bookTitle}
                            {entry.type === 'quiz_attempt' && `${entry.subject} Quiz`}
                            {entry.type === 'ai_conversation' && `AI Chat - ${entry.subject || 'General'}`}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(entry.timestamp)}</span>
                            </span>
                            {entry.duration && (
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{formatDuration(entry.duration)}</span>
                              </span>
                            )}
                            {entry.type === 'quiz_attempt' && (
                              <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                entry.percentage >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                entry.percentage >= 60 ? 'bg-amber-100 text-amber-900' :
                                'bg-red-100 text-red-800'
                              }`}>
                                Score: {entry.percentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id, entry.type)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: QUIZZES */}
        {/* ======================================================== */}
        {!loading && activeTab === 'quizzes' && (
          <div className="space-y-4">
            {quizHistory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs space-y-2">
                <Award className="h-12 w-12 text-gray-300 mx-auto" />
                <h3 className="text-base font-bold text-gray-900">No Quiz Attempts Yet</h3>
                <p className="text-xs text-gray-500">Test your understanding by taking practice quizzes.</p>
                <Link to="/quiz" className="inline-block px-4 py-2 bg-[#23735F] text-white rounded-xl text-xs font-black shadow-xs">
                  Take a Quiz
                </Link>
              </div>
            ) : (
              quizHistory.map((quiz) => (
                <div key={quiz.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center flex-shrink-0 text-purple-700 font-black text-xs">
                        {quiz.percentage}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm">{quiz.subject} Quiz</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{formatDate(quiz.timestamp)}</span>
                          <span>•</span>
                          <span>{quiz.correctAnswers}/{quiz.totalQuestions} correct</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                            quiz.percentage >= 80 ? 'bg-emerald-100 text-emerald-800' :
                            quiz.percentage >= 60 ? 'bg-amber-100 text-amber-900' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {quiz.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(quiz.id, 'quiz_attempt')}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: BOOKS & STUDY GUIDES */}
        {/* ======================================================== */}
        {!loading && activeTab === 'books' && (
          <div className="space-y-4">
            {bookHistory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs space-y-2">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto" />
                <h3 className="text-base font-bold text-gray-900">No Books Viewed Yet</h3>
                <p className="text-xs text-gray-500">Read study materials and digital guides to see your reading history here.</p>
                <Link to="/guide-books" className="inline-block px-4 py-2 bg-[#23735F] text-white rounded-xl text-xs font-black shadow-xs">
                  Browse Guide Books
                </Link>
              </div>
            ) : (
              bookHistory.map((book) => (
                <div key={book.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{book.bookTitle}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{book.bookSubject}</span>
                        <span>•</span>
                        <span>{formatDate(book.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/book-viewer/${book.bookId}`}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Read book"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteEntry(book.id, 'book_view')}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: AI CHATS */}
        {/* ======================================================== */}
        {!loading && activeTab === 'ai' && (
          <div className="space-y-4">
            {aiHistory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs space-y-2">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto" />
                <h3 className="text-base font-bold text-gray-900">No AI Conversations Yet</h3>
                <p className="text-xs text-gray-500">Ask the AI Assistant questions about courses or subjects.</p>
                <Link to="/ai-assistant" className="inline-block px-4 py-2 bg-[#23735F] text-white rounded-xl text-xs font-black shadow-xs">
                  Ask AI Assistant
                </Link>
              </div>
            ) : (
              aiHistory.map((chat) => (
                <div key={chat.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm">AI Chat - {chat.subject || 'General'}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{formatDate(chat.timestamp)}</span>
                          <span>•</span>
                          <span>{chat.messageCount || 1} messages</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(chat.id, 'ai_conversation')}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Learner Feedback Modal */}
      {showFeedback && (
        <Feedback onClose={() => setShowFeedback(false)} />
      )}
    </div>
  )
}

export default History
