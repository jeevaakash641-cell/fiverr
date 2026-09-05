import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchCourseOverview, selectCourse, checkCourseSelection } from '../services/recommendationService'
import { fetchLearnerQuizzes } from '../services/quizService'
import { startCourse, fetchCourseProgress, fetchCourseResume } from '../services/progressService'
import { fetchCourseBaselineStatus } from '../services/baselineAssessmentService'
import {
  BookOpen, Clock, Award, CheckCircle, CheckCircle2, ArrowLeft, ArrowRight,
  Layers, Check, Video, Paperclip, ChevronDown, ChevronRight,
  Sparkles, ExternalLink, RefreshCw, AlertCircle, HelpCircle, Zap, Play,
  ClipboardCheck, Inbox
} from 'lucide-react'
import ContentRequestModal from './ContentRequestModal'

const CourseOverview = () => {
  const { courseId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isSelected, setIsSelected] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [courseQuizzes, setCourseQuizzes] = useState([])
  const [requestModalState, setRequestModalState] = useState({
    isOpen: false,
    courseId: '',
    courseTitle: '',
    requestType: 'quiz'
  })

  // Expand / collapse module curriculum sections
  const [expandedModules, setExpandedModules] = useState({})

  // Notifications
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' })
  const showAlert = (type, message) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 4000)
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadCourseDetails()
  }, [user, courseId])

  const loadCourseDetails = async () => {
    setLoading(true)
    try {
      const [data, checkResult, quizzes, prog] = await Promise.all([
        fetchCourseOverview(courseId),
        checkCourseSelection(courseId, user),
        fetchLearnerQuizzes({ courseId }, user).catch(() => []),
        fetchCourseProgress(courseId, user).catch(() => null)
      ])

      setOverview(data)
      setIsSelected(Boolean(checkResult?.isSelected))
      setCourseQuizzes(quizzes || [])
      setProgress(prog)

      // Expand all modules by default
      const exp = {}
      ;(data.modules || []).forEach(m => { exp[m.moduleId] = true })
      setExpandedModules(exp)
      setNotFound(false)
    } catch (err) {
      console.error('Failed to load course overview:', err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCourse = async () => {
    if (isSelected) return

    setSelecting(true)
    try {
      await selectCourse(courseId, 'browse', 'Selected from course overview', user)
      setIsSelected(true)
      showAlert('success', `"${overview?.course?.title}" added to your selected courses!`)
    } catch (err) {
      showAlert('error', err.message || 'Failed to select course')
    } finally {
      setSelecting(false)
    }
  }

  const handleStartCourse = async () => {
    setStarting(true)
    try {
      if (!isSelected) {
        await selectCourse(courseId, 'browse', 'Started from course overview', user)
        setIsSelected(true)
      }

      // Check baseline assessment requirement
      try {
        const baselineStatus = await fetchCourseBaselineStatus(courseId, user)
        if (baselineStatus?.required && !baselineStatus?.completed) {
          navigate(`/courses/${courseId}/baseline-assessment`)
          return
        }
      } catch (e) {
        // Fall through to startCourse backend check
      }

      const newProgress = await startCourse(courseId, user)
      setProgress(newProgress)
      navigate(`/courses/${courseId}/learn`)
    } catch (err) {
      if (err.data?.baselineRequired || err.baselineRequired) {
        navigate(`/courses/${courseId}/baseline-assessment`)
        return
      }
      showAlert('error', err.message || 'Failed to start course')
    } finally {
      setStarting(false)
    }
  }

  const handleContinueLearning = async () => {
    try {
      const resume = await fetchCourseResume(courseId, user)
      if (resume?.targetLesson?.lessonId) {
        navigate(`/courses/${courseId}/learn/${resume.targetLesson.lessonId}`)
      } else {
        navigate(`/courses/${courseId}/learn`)
      }
    } catch (err) {
      navigate(`/courses/${courseId}/learn`)
    }
  }

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  const getDifficultyBadge = (level) => {
    switch (level) {
      case 'Beginner':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Beginner</span>
      case 'Intermediate':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">Intermediate</span>
      case 'Advanced':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Advanced</span>
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-800">{level || 'All Levels'}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-xs border border-gray-200">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <h2 className="text-base font-bold text-gray-800">Loading Course Overview...</h2>
          <p className="text-xs text-gray-500 mt-1">One Community Ely Training Centre</p>
        </div>
      </div>
    )
  }

  if (notFound || !overview?.course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800 mb-1">Course Not Found</h2>
          <p className="text-xs text-gray-500 mb-4">
            This course does not exist, is not currently published, or may have been archived.
          </p>
          <Link
            to="/course-recommendations"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#23735F] text-white rounded-lg text-sm font-semibold hover:bg-[#1b5c4c] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Browse Recommendations</span>
          </Link>
        </div>
      </div>
    )
  }

  const { course, totalModules, totalLessons, modules = [] } = overview

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Bar */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <h1 className="text-sm md:text-base font-bold text-gray-900 line-clamp-1">
              {course.title}
            </h1>
          </div>

          <Link
            to="/dashboard"
            className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold"
          >
            My Dashboard
          </Link>
        </div>
      </header>

      {/* Alert Notification */}
      {alertInfo.message && (
        <div className="container mx-auto px-4 md:px-6 pt-4 animate-fade-in">
          <div className={`p-4 rounded-xl shadow-sm border flex items-center space-x-3 ${
            alertInfo.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {alertInfo.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{alertInfo.message}</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-5xl space-y-8">
        {/* --- Hero Banner Card --- */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3">
            {/* Thumbnail */}
            <div className="h-48 md:h-auto bg-gradient-to-r from-emerald-800 to-teal-900 relative overflow-hidden flex items-center justify-center">
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="text-center p-6">
                  <BookOpen className="h-12 w-12 text-white/40 mx-auto mb-2" />
                  <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">{course.category}</span>
                </div>
              )}
            </div>

            {/* Course Meta & Action */}
            <div className="p-6 md:p-8 md:col-span-2 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {course.category}
                  </span>
                  {getDifficultyBadge(course.difficultyLevel)}
                  <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {course.estimatedDuration || 'Self-paced'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                  {course.title}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                  {course.shortDescription}
                </p>
              </div>

              {/* Action & Progress Buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs text-gray-500">
                  <span className="font-bold text-gray-800">{totalModules}</span> Modules •{' '}
                  <span className="font-bold text-gray-800">{totalLessons}</span> Lessons
                  {progress && progress.status !== 'not_started' && (
                    <span className="ml-2 font-bold text-[#23735F]">
                      • {progress.progressPercentage}% Completed ({progress.completedLessonIds?.length || 0}/{totalLessons})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!isSelected ? (
                    <button
                      onClick={handleSelectCourse}
                      disabled={selecting}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#23735F] hover:bg-[#1b5c4c] text-white shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {selecting ? <span>Saving...</span> : <span>Select This Course</span>}
                    </button>
                  ) : progress?.status === 'completed' || progress?.progressPercentage === 100 ? (
                    <button
                      onClick={handleContinueLearning}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Review Course (Completed ✓)</span>
                    </button>
                  ) : progress?.status === 'in_progress' ? (
                    <button
                      onClick={handleContinueLearning}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#23735F] hover:bg-[#1b5c4c] text-white shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      <span>Continue Learning ({progress.progressPercentage}%)</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleStartCourse}
                      disabled={starting}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#23735F] hover:bg-[#1b5c4c] text-white shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      {starting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 fill-white" />
                      )}
                      <span>Start Course</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Learning Outcomes --- */}
        {Array.isArray(course.learningOutcomes) && course.learningOutcomes.length > 0 && (
          <section className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xs border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-700" />
              <span>What You Will Learn</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {course.learningOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{outcome}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- Curriculum Outline (Published Modules & Lessons) --- */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-700" />
              <span>Course Curriculum</span>
            </h2>
            <p className="text-xs text-gray-500">
              {totalModules} Modules • {totalLessons} Lessons total
            </p>
          </div>

          {modules.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center shadow-2xs">
              <p className="text-xs text-gray-500">Curriculum details will be published soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((mod, modIdx) => {
                const isExp = expandedModules[mod.moduleId] ?? true
                const lessons = mod.lessons || []

                return (
                  <div
                    key={mod.moduleId}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs"
                  >
                    {/* Module Header */}
                    <div
                      onClick={() => toggleModule(mod.moduleId)}
                      className="p-4 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {modIdx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">
                            {mod.title}
                          </h3>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500 font-medium">
                          {lessons.length} Lesson{lessons.length !== 1 ? 's' : ''}
                        </span>
                        {isExp ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Lesson Items */}
                    {isExp && lessons.length > 0 && (
                      <div className="p-3 divide-y divide-gray-100 bg-white">
                        {lessons.map((les, lIdx) => {
                          const isCompleted = progress?.completedLessonIds?.includes(les.lessonId)
                          return (
                            <div
                              key={les.lessonId}
                              onClick={() => navigate(`/courses/${courseId}/learn/${les.lessonId}`)}
                              className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-emerald-50/50 rounded-lg transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center space-x-2.5">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <span className="text-[11px] font-bold text-gray-400 w-6">
                                    {modIdx + 1}.{lIdx + 1}
                                  </span>
                                )}
                                <span className={`font-semibold group-hover:text-[#23735F] transition-colors ${
                                  isCompleted ? 'text-emerald-950 font-bold' : 'text-gray-800'
                                }`}>
                                  {les.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {isCompleted && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Completed
                                  </span>
                                )}
                                {les.hasVideo && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                    <Video className="h-3 w-3" /> Video
                                  </span>
                                )}
                                {les.resourceCount > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    <Paperclip className="h-3 w-3" /> {les.resourceCount}
                                  </span>
                                )}
                                <span className="text-gray-400 font-normal">
                                  {les.estimatedMinutes || 15}m
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* --- Course Quizzes & Knowledge Checks (with Title Matching Check) --- */}
        {(() => {
          const currentTitle = (overview?.course?.title || '').trim().toLowerCase();
          const matchingQuizzes = courseQuizzes.filter(q => 
            (q.courseTitle && q.courseTitle.trim().toLowerCase() === currentTitle) ||
            q.courseId === courseId
          );
          const hasMatchingQuiz = matchingQuizzes.length > 0;

          return (
            <section className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-purple-700" />
                    <span>Course Quizzes & Knowledge Checks</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Quizzes must match the course title: <span className="font-semibold text-gray-700">"{overview?.course?.title}"</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRequestModalState({
                    isOpen: true,
                    courseId,
                    courseTitle: overview?.course?.title || courseId,
                    requestType: 'quiz'
                  })}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span>Request Quiz from Admin</span>
                </button>
              </div>

              {hasMatchingQuiz ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {matchingQuizzes.map((quiz) => (
                    <div
                      key={quiz.quizId}
                      className="bg-white rounded-xl p-5 border border-purple-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                            {quiz.questionCount || quiz.questions?.length || 5} Questions
                          </span>
                          <span className="text-[11px] font-bold text-[#23735F]">
                            Pass: {quiz.passingScore}%
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">{quiz.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                          {quiz.instructions || 'Interactive knowledge check to assess core concepts.'}
                        </p>
                      </div>

                      <Link
                        to={`/course/${courseId}/quiz/${quiz.quizId}`}
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#23735F] hover:bg-[#185243] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Take Quiz</span>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 bg-purple-50/50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-purple-900">No Matching Quiz Title Uploaded Yet</h4>
                    <p className="text-xs text-purple-700">
                      The administrator has not yet uploaded a quiz matching "{overview?.course?.title}". You can submit a request so admin will post the quiz.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequestModalState({
                      isOpen: true,
                      courseId,
                      courseTitle: overview?.course?.title || courseId,
                      requestType: 'quiz'
                    })}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Request Quiz from Admin
                  </button>
                </div>
              )}
            </section>
          );
        })()}

        {/* --- Course Assessments (Title Matching Check & Admin Request) --- */}
        <section className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-teal-700" />
                <span>Course Assessments (Baseline & Social Value)</span>
              </h2>
              <p className="text-xs text-gray-500">
                Confidence reflections must correspond with: <span className="font-semibold text-gray-700">"{overview?.course?.title}"</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRequestModalState({
                isOpen: true,
                courseId,
                courseTitle: overview?.course?.title || courseId,
                requestType: 'assessment'
              })}
              className="px-3 py-1.5 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Request Assessment from Admin</span>
            </button>
          </div>
        </section>
      </main>

      {/* Content Request Modal */}
      <ContentRequestModal
        isOpen={requestModalState.isOpen}
        onClose={() => setRequestModalState(prev => ({ ...prev, isOpen: false }))}
        courseId={requestModalState.courseId}
        courseTitle={requestModalState.courseTitle}
        requestType={requestModalState.requestType}
        onSuccess={() => showAlert('success', 'Content request submitted to administrators!')}
      />
    </div>
  )
}

export default CourseOverview
