import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchLearnerQuizzes } from '../services/quizService'
import { fetchPublishedCourses } from '../services/courseService'
import {
  ArrowLeft, Clock, BookOpen, Brain, Zap, Target,
  RefreshCw, Sparkles, Award, Search, Filter, HelpCircle,
  CheckCircle, Layers, FileText, ChevronRight, Plus
} from 'lucide-react'

const Quiz = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [quizzes, setQuizzes] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')

  const isAdmin = user?.userType === 'teacher'

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadQuizzes()
  }, [user])

  const loadQuizzes = async () => {
    setLoading(true)
    try {
      const [quizzesData, coursesData] = await Promise.all([
        fetchLearnerQuizzes({}, user).catch(() => []),
        fetchPublishedCourses().catch(() => [])
      ])
      setQuizzes(quizzesData || [])
      setCourses(coursesData || [])
    } catch (err) {
      console.error('Error loading published quizzes for learner:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      if (courseFilter !== 'all' && quiz.courseId !== courseFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = quiz.title?.toLowerCase().includes(query)
        const matchesCourse = quiz.courseTitle?.toLowerCase().includes(query)
        const matchesModule = quiz.moduleTitle?.toLowerCase().includes(query)
        const matchesLesson = quiz.lessonTitle?.toLowerCase().includes(query)
        const matchesDesc = quiz.instructions?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesCourse && !matchesModule && !matchesLesson && !matchesDesc) {
          return false
        }
      }
      return true
    })
  }, [quizzes, courseFilter, searchQuery])

  if (!user) {
    return null
  }

  const getQuizProgress = (quizId) => {
    try {
      const key = user?.email ? `quiz_progress_${user.email}_${quizId}` : `quiz_progress_guest_${quizId}`
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && (Object.keys(parsed.answers || {}).length > 0 || (parsed.currentQIndex || 0) > 0)) {
          return parsed
        }
      }
    } catch (e) {}
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between">
            {/* Left: Brand & Back */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Brain className="h-4 w-4 text-[#23735F]" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-gray-900 leading-none">Course Knowledge Checks</h1>
                  <p className="text-[11px] text-gray-500 mt-0.5">One Community Ely Training Centre</p>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5">
              {isAdmin && (
                <Link
                  to="/admin/quizzes"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#23735F] hover:bg-[#185243] rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Manage Quizzes</span>
                </Link>
              )}

              <Link
                to="/quiz-history"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Clock className="h-3.5 w-3.5 text-gray-500" />
                <span>My History</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Banner */}
        <div className="rounded-2xl p-6 sm:p-8 mb-8 text-white shadow-xs bg-gradient-to-r from-[#185243] to-[#23735F]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider mb-3">
              <Award className="h-3.5 w-3.5 text-emerald-200" />
              <span>Learner Assessments</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mb-2 leading-snug">
              Course Quizzes & Skill Knowledge Checks
            </h2>
            <p className="text-xs sm:text-sm text-emerald-50/90 leading-relaxed">
              Complete instructor-created quizzes to test your understanding, reinforce core learnings, and evaluate your progress across your training courses.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quizzes by title, course, or topic..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.title}
                </option>
              ))}
            </select>

            <button
              onClick={loadQuizzes}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh Quizzes"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quizzes List */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-gray-200">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Loading published quizzes...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-gray-300">
            <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {quizzes.length === 0 ? 'No Quizzes Published Yet' : 'No Matching Quizzes Found'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              {quizzes.length === 0
                ? 'Your instructors have not published any course quizzes yet. When an admin creates and publishes a quiz, it will appear here.'
                : 'No quizzes match your current search and filter settings.'}
            </p>

            {isAdmin && quizzes.length === 0 && (
              <Link
                to="/admin/quizzes"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#23735F] text-white font-bold text-sm hover:bg-[#185243] transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Create & Publish a Quiz in Admin Portal</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => {
              const inProgress = getQuizProgress(quiz.quizId)

              return (
                <div
                  key={quiz.quizId}
                  className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-shadow p-6 flex flex-col justify-between ${
                    inProgress ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <HelpCircle className="h-3 w-3" />
                          {quiz.questionCount || quiz.questions?.length || 0} Questions
                        </span>

                        {inProgress && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="h-3 w-3 text-amber-700" />
                            In Progress (Q{(inProgress.currentQIndex || 0) + 1})
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-[#23735F]">
                        Pass: {quiz.passingScore || 70}%
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1" title={quiz.title}>
                      {quiz.title}
                    </h3>

                    {/* Associated Course / Module / Lesson */}
                    <div className="space-y-1.5 mb-4 text-xs text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <BookOpen className="h-3.5 w-3.5 text-[#23735F] shrink-0" />
                        <span className="font-semibold text-gray-800">Course:</span>
                        <span className="truncate">{quiz.courseTitle || 'General Training'}</span>
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

                    {/* Description / Instructions */}
                    {quiz.instructions && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
                        {quiz.instructions}
                      </p>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="pt-4 border-t border-gray-100">
                    <Link
                      to={quiz.courseId ? `/course/${quiz.courseId}/quiz/${quiz.quizId}` : `/take-quiz/${quiz.quizId}`}
                      className={`inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                        inProgress 
                          ? 'bg-[#185243] hover:bg-[#113a30]' 
                          : 'bg-[#23735F] hover:bg-[#185243]'
                      }`}
                    >
                      <span>{inProgress ? `Resume Quiz (Q${(inProgress.currentQIndex || 0) + 1})` : 'Start Quiz'}</span>
                      {inProgress ? <Play className="h-3.5 w-3.5 fill-current" /> : <ChevronRight className="h-4 w-4" />}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default Quiz
