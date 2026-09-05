import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchLearnerQuizById,
  submitQuizAttempt,
  fetchLearnerQuizAttempts
} from '../services/quizService'
import {
  BookOpen, Clock, Award, CheckCircle, XCircle, ArrowLeft,
  ArrowRight, Check, AlertCircle, RefreshCw, HelpCircle,
  Sparkles, Layers, FileText, ChevronRight, RotateCcw,
  Pause, Play, Save, LogOut, CheckCircle2
} from 'lucide-react'

const LearnerQuizViewer = () => {
  const { quizId, courseId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  // Storage key for in-progress session
  const progressKey = user?.email 
    ? `quiz_progress_${user.email}_${quizId}` 
    : `quiz_progress_guest_${quizId}`

  // Stages: 'overview' | 'taking' | 'submitting' | 'results'
  const [stage, setStage] = useState('overview')

  const [quizData, setQuizData] = useState(null)
  const [pastAttempts, setPastAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // In-quiz states
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { [questionId]: optionValue }
  const [submitting, setSubmitting] = useState(false)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)

  // Pause & Restart Modals
  const [pauseModalOpen, setPauseModalOpen] = useState(false)
  const [restartModalOpen, setRestartModalOpen] = useState(false)
  const [savedProgress, setSavedProgress] = useState(null)

  // Results state from backend grading
  const [submissionResult, setSubmissionResult] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadQuiz()
  }, [user, quizId])

  const loadQuiz = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLearnerQuizById(quizId, user)
      setQuizData(data)
      const attempts = await fetchLearnerQuizAttempts(quizId, user).catch(() => [])
      setPastAttempts(attempts || [])

      // Check for saved in-progress progress
      try {
        const raw = localStorage.getItem(progressKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && (Object.keys(parsed.answers || {}).length > 0 || (parsed.currentQIndex || 0) > 0)) {
            setSavedProgress(parsed)
          }
        }
      } catch (e) {
        console.warn('Failed to load saved progress:', e)
      }
    } catch (err) {
      console.error('Failed to load quiz:', err)
      setError(err.message || 'Could not load quiz.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-save whenever answers or current question index change during taking
  useEffect(() => {
    if (stage === 'taking' && quizId) {
      const payload = {
        quizId,
        answers,
        currentQIndex,
        savedAt: new Date().toISOString()
      }
      try {
        localStorage.setItem(progressKey, JSON.stringify(payload))
        setSavedProgress(payload)
      } catch (e) {
        console.warn('Auto-save failed:', e)
      }
    }
  }, [answers, currentQIndex, stage, quizId, progressKey])

  // Fresh Start
  const handleStartQuiz = () => {
    setAnswers({})
    setCurrentQIndex(0)
    setStage('taking')
  }

  // Resume In-Progress
  const handleResumeQuiz = () => {
    if (savedProgress) {
      setAnswers(savedProgress.answers || {})
      setCurrentQIndex(savedProgress.currentQIndex || 0)
    }
    setStage('taking')
  }

  // Pause Quiz (Open Modal & Persist)
  const handlePauseQuiz = () => {
    const payload = {
      quizId,
      answers,
      currentQIndex,
      savedAt: new Date().toISOString()
    }
    try {
      localStorage.setItem(progressKey, JSON.stringify(payload))
      setSavedProgress(payload)
    } catch (e) {}
    setPauseModalOpen(true)
  }

  // Confirm Save & Exit
  const handleSaveAndExit = () => {
    setPauseModalOpen(false)
    if (courseId) {
      navigate(`/courses/${courseId}`)
    } else {
      navigate('/quiz')
    }
  }

  // Request Restart Confirmation
  const handleRequestRestart = () => {
    setRestartModalOpen(true)
  }

  // Confirm Restart from Beginning
  const handleConfirmRestart = () => {
    try {
      localStorage.removeItem(progressKey)
    } catch (e) {}
    setSavedProgress(null)
    setAnswers({})
    setCurrentQIndex(0)
    setRestartModalOpen(false)
    if (stage !== 'taking') {
      setStage('taking')
    }
  }

  const handleSelectAnswer = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (currentQIndex < (quizData?.quiz?.questions?.length || 0) - 1) {
      setCurrentQIndex(prev => prev + 1)
    } else {
      setConfirmSubmitOpen(true)
    }
  }

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1)
    }
  }

  const handleSubmitQuiz = async () => {
    setConfirmSubmitOpen(false)
    setSubmitting(true)
    try {
      const clientSubmissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const result = await submitQuizAttempt(quizId, answers, clientSubmissionId, user)
      setSubmissionResult(result)
      
      // Clear saved in-progress attempt upon successful submission
      try {
        localStorage.removeItem(progressKey)
      } catch (e) {}
      setSavedProgress(null)

      setStage('results')
      // Refresh past attempts count in background
      fetchLearnerQuizAttempts(quizId, user).then(atts => setPastAttempts(atts || [])).catch(() => {})
    } catch (err) {
      alert('Error submitting quiz: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xs border border-gray-200">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Loading your knowledge check...</p>
        </div>
      </div>
    )
  }

  if (error || !quizData?.quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center p-8 bg-white rounded-2xl shadow-xs border border-gray-200">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Quiz Unavailable</h2>
          <p className="text-sm text-gray-600 mb-6">{error || 'This quiz could not be found or is not currently active.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl bg-[#23735F] text-white font-bold text-sm hover:bg-[#185243]"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const quiz = quizData.quiz
  const questions = quiz.questions || []
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length
  const progressPercent = totalQuestions > 0 ? Math.round(((currentQIndex + 1) / totalQuestions) * 100) : 0

  // ──────────────────────────────────────────
  // 1. PRE-QUIZ OVERVIEW SCREEN
  // ──────────────────────────────────────────
  if (stage === 'overview') {
    const bestScore = quizData.bestScore !== null && quizData.bestScore !== undefined ? quizData.bestScore : null
    const attemptCount = pastAttempts.length
    const maxAttempts = quiz.maximumAttempts
    const canAttempt = maxAttempts ? attemptCount < maxAttempts : true

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => courseId ? navigate(`/courses/${courseId}`) : navigate(-1)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Course</span>
            </button>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              One Community Ely · Assessment
            </div>
          </div>
        </header>

        {/* Overview Body */}
        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-[#185243] to-[#23735F] p-8 text-white">
              <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
                <Award className="h-4 w-4" />
                <span>Course Knowledge Check</span>
              </div>
              <h1 className="text-2xl font-black mb-3">{quiz.title}</h1>
              <p className="text-sm text-emerald-50/90 leading-relaxed max-w-2xl">
                {quiz.instructions || 'Test your practical knowledge and reinforce your key learnings from this course.'}
              </p>
            </div>

            {/* Meta & Stats */}
            <div className="p-8 space-y-6">
              {/* Association Card */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#23735F] shrink-0" />
                  <span className="font-bold text-gray-900">Course:</span>
                  <span>{quiz.courseTitle}</span>
                </div>
                {quiz.moduleTitle && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#23735F] shrink-0" />
                    <span className="font-bold text-gray-900">Module:</span>
                    <span>{quiz.moduleTitle}</span>
                  </div>
                )}
                {quiz.lessonTitle && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#23735F] shrink-0" />
                    <span className="font-bold text-gray-900">Lesson:</span>
                    <span>{quiz.lessonTitle}</span>
                  </div>
                )}
              </div>

              {/* Grid of Assessment Rules */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Total Questions</div>
                  <div className="text-xl font-extrabold text-gray-900">{totalQuestions}</div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Passing Score</div>
                  <div className="text-xl font-extrabold text-[#23735F]">{quiz.passingScore}%</div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white col-span-2 sm:col-span-1">
                  <div className="text-xs text-gray-500 font-semibold mb-1">Attempts Allowed</div>
                  <div className="text-xl font-extrabold text-gray-900">
                    {maxAttempts ? `${attemptCount} / ${maxAttempts}` : 'Unlimited'}
                  </div>
                </div>
              </div>

              {/* Previous Performance if any */}
              {/* Previous Performance if any */}
              {attemptCount > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Previous Attempts: {attemptCount}</div>
                    <div className="text-xs text-emerald-700">
                      Best Score: <strong className="text-sm">{bestScore}%</strong>
                    </div>
                  </div>
                  {bestScore >= (quiz.passingScore || 70) ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                      Passed ✓
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                      In Progress
                    </span>
                  )}
                </div>
              )}

              {/* In-Progress Session Alert */}
              {savedProgress && (
                <div className="p-5 rounded-xl bg-amber-50/90 border border-amber-300 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <Clock className="h-4 w-4 text-amber-700" />
                      <span>In-Progress Session Detected</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900">
                      Saved
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    You have an unfinished attempt from <strong>{savedProgress.savedAt ? new Date(savedProgress.savedAt).toLocaleDateString() + ' at ' + new Date(savedProgress.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier'}</strong>.
                    You answered <strong>{Object.keys(savedProgress.answers || {}).length}</strong> of <strong>{totalQuestions}</strong> questions and left off at <strong>Question {(savedProgress.currentQIndex || 0) + 1}</strong>.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={handleResumeQuiz}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#23735F] hover:bg-[#185243] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Resume from Question {(savedProgress.currentQIndex || 0) + 1}</span>
                    </button>
                    <button
                      onClick={handleRequestRestart}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                      <span>Restart from Beginning</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Start / Resume Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => courseId ? navigate(`/courses/${courseId}`) : navigate(-1)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Return to Course
                </button>

                {canAttempt ? (
                  <div className="flex items-center gap-2">
                    {savedProgress ? (
                      <>
                        <button
                          onClick={handleRequestRestart}
                          className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Restart
                        </button>
                        <button
                          onClick={handleResumeQuiz}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#23735F] hover:bg-[#185243] text-white text-sm font-bold shadow-sm transition-all cursor-pointer"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          <span>Resume Quiz</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartQuiz}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#23735F] hover:bg-[#185243] text-white text-sm font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <span>{attemptCount > 0 ? 'Retake Quiz' : 'Start Quiz'}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    Maximum attempts reached for this quiz.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 2. ACTIVE QUIZ TAKING SCREEN
  // ──────────────────────────────────────────
  if (stage === 'taking') {
    const currentQ = questions[currentQIndex]
    const isSelected = answers[currentQ?.questionId] !== undefined

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Quiz Progress Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#23735F] truncate max-w-[200px] sm:max-w-xs">{quiz.title}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500 font-medium">Question {currentQIndex + 1} of {totalQuestions}</span>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="text-xs font-semibold text-gray-600">
                  {answeredCount} of {totalQuestions} answered
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePauseQuiz}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                    title="Pause and save progress"
                  >
                    <Pause className="h-3.5 w-3.5 text-amber-700" />
                    <span>Pause & Exit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestRestart}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Restart quiz from Question 1"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#185243] to-[#23735F] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </header>

        {/* Stepper Pills */}
        <div className="bg-white border-b border-gray-100 py-2.5 px-4">
          <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-1">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.questionId] !== undefined
              const isCurrent = idx === currentQIndex

              return (
                <button
                  key={q.questionId || idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-8 min-w-[2rem] px-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#23735F] text-white shadow-xs'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Question Card */}
        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
          {currentQ && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
              {/* Question Text */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span className="font-bold text-[#23735F] uppercase tracking-wider">
                    {currentQ.type === 'true_false' ? 'True or False' : 'Multiple Choice'}
                  </span>
                  <span>{currentQ.points || 1} Point</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
                  {currentQ.questionText}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQ.options?.map((option, optIdx) => {
                  const isChecked = answers[currentQ.questionId] === option
                  const label = currentQ.type === 'true_false' ? option : String.fromCharCode(65 + optIdx)

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQ.questionId, option)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 cursor-pointer ${
                        isChecked
                          ? 'border-[#23735F] bg-emerald-50/50 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-[#23735F] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {label}
                      </div>
                      <span className={`text-sm flex-1 ${isChecked ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {option}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Navigation Bar */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentQIndex === 0}
                  onClick={handlePrev}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>

                {currentQIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#23735F] hover:bg-[#185243] text-white text-sm font-bold shadow-xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSubmitOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#23735F] hover:bg-[#185243] text-white text-sm font-bold shadow-xs cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Review & Submit</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Submit Confirmation Dialog */}
        {confirmSubmitOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 animate-in fade-in">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Submit?</h3>
              <p className="text-sm text-gray-600 mb-4">
                You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
                {answeredCount < totalQuestions && (
                  <span className="block mt-2 text-amber-600 font-semibold">
                    Warning: You still have {totalQuestions - answeredCount} unanswered question(s).
                  </span>
                )}
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Continue Quiz
                </button>
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#23735F] hover:bg-[#185243] text-white text-sm font-bold shadow-xs"
                >
                  {submitting ? 'Calculating Score...' : 'Submit Answers'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pause & Save Dialog */}
        {pauseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Pause className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Quiz Paused</h3>
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Progress automatically saved
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                <div><strong>Completed:</strong> {answeredCount} of {totalQuestions} questions answered</div>
                <div><strong>Current Position:</strong> Question {currentQIndex + 1}</div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                You can safely close the window or exit now. When you return to this quiz, you can resume right from where you left off.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleSaveAndExit}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Save & Exit to Courses
                </button>
                <button
                  type="button"
                  onClick={() => setPauseModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#23735F] hover:bg-[#185243] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Resume Taking Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restart Confirmation Dialog */}
        {restartModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Restart Quiz?</h3>
                  <p className="text-xs text-gray-500">Reset your answers and start over</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to restart from <strong>Question 1</strong>? Any answers chosen during your current session will be cleared.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRestartModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestart}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Yes, Restart Quiz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────
  // 3. POST-SUBMISSION RESULTS & REVIEW SCREEN
  // ──────────────────────────────────────────
  if (stage === 'results' && submissionResult) {
    const {
      percentage,
      score,
      totalPoints,
      correctCount,
      totalQuestions: resTotalQ,
      passed,
      passingScore,
      feedback,
      canRetry,
      questionsReview = []
    } = submissionResult

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Results Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Quiz Completed</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{quiz.title}</span>
            </div>
            <button
              onClick={() => courseId ? navigate(`/courses/${courseId}`) : navigate('/dashboard')}
              className="px-4 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Back to Course
            </button>
          </div>
        </header>

        {/* Results Main Body */}
        <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
          {/* Top Score Banner */}
          <div className={`rounded-2xl p-8 text-center text-white shadow-xs ${
            passed
              ? 'bg-gradient-to-br from-[#185243] to-[#23735F]'
              : 'bg-gradient-to-br from-amber-700 to-amber-600'
          }`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider mb-4">
              {passed ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{passed ? 'Passed Successfully' : 'Quiz Result'}</span>
            </div>

            <div className="text-6xl font-black mb-2 leading-none">
              {percentage}%
            </div>

            <p className="text-sm text-white/90 max-w-lg mx-auto leading-relaxed mt-3">
              {feedback}
            </p>
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-xs text-gray-500 font-semibold mb-1">Score</div>
              <div className="text-lg font-extrabold text-gray-900">{score} / {totalPoints} pts</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-xs text-gray-500 font-semibold mb-1">Correct Answers</div>
              <div className="text-lg font-extrabold text-emerald-600">{correctCount} / {resTotalQ}</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-xs text-gray-500 font-semibold mb-1">Passing Target</div>
              <div className="text-lg font-extrabold text-gray-900">{passingScore}%</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-xs text-gray-500 font-semibold mb-1">Status</div>
              <div className={`text-lg font-extrabold ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                {passed ? 'PASSED' : 'NOT PASSED'}
              </div>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#23735F]" />
              Detailed Review & Explanations
            </h3>

            {questionsReview.map((rev, idx) => {
              const isCorrect = rev.isCorrect

              return (
                <div
                  key={rev.questionId || idx}
                  className={`p-5 rounded-2xl border-2 transition-all space-y-3 ${
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black ${
                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-500">
                        {rev.type === 'true_false' ? 'True / False' : 'Multiple Choice'}
                      </span>
                    </div>

                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isCorrect ? `+${rev.pointsEarned} pt (Correct)` : `0 / ${rev.pointsPossible} pts`}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-gray-900 leading-snug">
                    {rev.questionText}
                  </p>

                  {/* Options with marked state */}
                  <div className="space-y-1.5 pt-1">
                    {rev.options?.map((opt, oIdx) => {
                      const wasUser = rev.submittedAnswer === opt
                      const isRight = rev.correctAnswer === opt

                      let style = 'border-gray-200 bg-white text-gray-700'
                      if (isRight) {
                        style = 'border-emerald-400 bg-emerald-50 font-bold text-emerald-900'
                      } else if (wasUser && !isCorrect) {
                        style = 'border-red-300 bg-red-50 font-bold text-red-900'
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`px-3.5 py-2 rounded-xl text-xs border flex items-center justify-between ${style}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{opt}</span>
                            {wasUser && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                                Your Selection
                              </span>
                            )}
                          </div>
                          {isRight && <span className="text-xs font-extrabold text-emerald-700">✓ Correct Answer</span>}
                          {wasUser && !isCorrect && <span className="text-xs font-extrabold text-red-600">✗ Incorrect</span>}
                        </div>
                      )
                    })}
                  </div>

                  {/* Takeaway Explanation */}
                  {rev.explanation && (
                    <div className="mt-3 p-3 rounded-xl bg-white border border-gray-200 text-xs text-gray-700 leading-relaxed">
                      <strong className="text-[#23735F]">Key Takeaway: </strong>
                      {rev.explanation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => courseId ? navigate(`/courses/${courseId}`) : navigate('/dashboard')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
            >
              Return to Course Overview
            </button>

            {canRetry && (
              <button
                onClick={handleStartQuiz}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#23735F] hover:bg-[#185243] text-white text-sm font-bold shadow-xs cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  return null
}

export default LearnerQuizViewer
