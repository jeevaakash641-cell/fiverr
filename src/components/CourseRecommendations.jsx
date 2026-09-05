import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchCourseRecommendations,
  selectCourse,
  fetchMyCourseSelections
} from '../services/recommendationService'
import { fetchPublishedCourses } from '../services/courseService'
import { fetchHelpTopics } from '../services/helpTopicService'
import {
  Sparkles, BookOpen, Clock, Award, CheckCircle, AlertCircle,
  ArrowRight, Search, Filter, RefreshCw, Check, Star, Heart,
  Compass, ArrowLeft, Layers, Shield, ExternalLink, HelpCircle,
  ChevronDown
} from 'lucide-react'

const CourseRecommendations = () => {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  // Interest State & Help Topics
  const [interestInput, setInterestInput] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [helpTopics, setHelpTopics] = useState([])
  const [interestError, setInterestError] = useState('')
  const [isUpdatingInterest, setIsUpdatingInterest] = useState(false)

  // Recommendations & All Courses State
  const [recommendations, setRecommendations] = useState([])
  const [isFallback, setIsFallback] = useState(false)
  const [recommendationMessage, setRecommendationMessage] = useState('')
  const [allCourses, setAllCourses] = useState([])
  const [selectedCourseIds, setSelectedCourseIds] = useState(new Set())

  // Loading & Filter States
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [selectingCourseId, setSelectingCourseId] = useState(null)

  // Browse All Filter State
  const [browseSearch, setBrowseSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')

  // Notification Banner
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' })
  const showAlert = (type, message) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 5000)
  }

  // 1. Auth Guard
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    // Admins must not be redirected into learner recommendation flow
    if (user.userType === 'teacher') {
      navigate('/admin-panel')
      return
    }

    const currentInterest = typeof user.learningInterests === 'string'
      ? user.learningInterests
      : (Array.isArray(user.learningInterests) ? user.learningInterests.join(', ') : '')
    setInterestInput(currentInterest || '')
    setSelectedTopic(currentInterest || '')

    loadInitialData(currentInterest || '')
  }, [user, navigate])

  // 2. Load Recommendations, Selections, Published Courses, and Dynamic Help Topics
  const loadInitialData = async (interestText) => {
    setLoading(true)
    try {
      const [recData, coursesData, selectionsData, topicsData] = await Promise.all([
        fetchCourseRecommendations(interestText),
        fetchPublishedCourses(),
        fetchMyCourseSelections(user),
        fetchHelpTopics()
      ])

      setRecommendations(recData.recommendations || [])
      setIsFallback(Boolean(recData.isFallback))
      setRecommendationMessage(recData.message || '')
      setAllCourses(Array.isArray(coursesData) ? coursesData : [])
      setHelpTopics(topicsData || [])

      const selSet = new Set((selectionsData || []).map(s => s.courseId))
      setSelectedCourseIds(selSet)
    } catch (err) {
      console.error('Failed to load recommendation data:', err)
      showAlert('error', 'Could not load courses. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }

  // 3. Validation for Learning Interest
  const validateInterest = (text) => {
    const trimmed = (text || '').trim()
    if (!trimmed) {
      return 'Please enter what you would like help with.'
    }
    if (trimmed.length < 3) {
      return 'Learning interest must be at least 3 characters long.'
    }
    if (trimmed.length > 500) {
      return 'Learning interest must not exceed 500 characters.'
    }
    // Reject purely punctuation strings
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      return 'Please include letters or words describing your learning goals.'
    }
    return ''
  }

  // 4. Update Interest & Recalculate Recommendations
  const handleUpdateInterest = async (e) => {
    e?.preventDefault()
    const errorMsg = validateInterest(interestInput)
    if (errorMsg) {
      setInterestError(errorMsg)
      return
    }
    setInterestError('')

    setIsUpdatingInterest(true)
    try {
      const cleanInterest = interestInput.trim()
      // Persist to user profile (locally and in DynamoDB)
      if (updateProfile) {
        await updateProfile({ learningInterests: cleanInterest })
      }

      // Recompute recommendations
      const recData = await fetchCourseRecommendations(cleanInterest)
      setRecommendations(recData.recommendations || [])
      setIsFallback(Boolean(recData.isFallback))
      setRecommendationMessage(recData.message || '')

      showAlert('success', 'Your learning interest has been updated and new recommendations loaded!')
    } catch (err) {
      console.error('Failed to update interest:', err)
      showAlert('error', 'Failed to update recommendations: ' + err.message)
    } finally {
      setIsUpdatingInterest(false)
    }
  }

  // 5. Select Course Handler
  const handleSelectCourse = async (course, source = 'recommendation', reason = '') => {
    if (selectedCourseIds.has(course.courseId)) {
      showAlert('info', `"${course.title}" is already in your selected courses.`)
      return
    }

    setSelectingCourseId(course.courseId)
    try {
      const result = await selectCourse(course.courseId, source, reason, user)
      setSelectedCourseIds(prev => new Set([...prev, course.courseId]))
      showAlert('success', `Course "${course.title}" successfully selected! You can access it anytime from your dashboard.`)
    } catch (err) {
      console.error('Failed to select course:', err)
      showAlert('error', err.message || 'Failed to select course')
    } finally {
      setSelectingCourseId(null)
    }
  }

  // 6. Filter Browse All Courses
  const filteredAllCourses = useMemo(() => {
    return allCourses.filter(course => {
      const matchesSearch =
        !browseSearch.trim() ||
        (course.title || '').toLowerCase().includes(browseSearch.toLowerCase()) ||
        (course.shortDescription || '').toLowerCase().includes(browseSearch.toLowerCase()) ||
        (course.category || '').toLowerCase().includes(browseSearch.toLowerCase())

      const matchesCat = categoryFilter === 'all' || course.category === categoryFilter
      const matchesDiff = difficultyFilter === 'all' || course.difficultyLevel === difficultyFilter

      return matchesSearch && matchesCat && matchesDiff
    })
  }, [allCourses, browseSearch, categoryFilter, difficultyFilter])

  // Extract unique categories for filter
  const categoriesList = useMemo(() => {
    const set = new Set(allCourses.map(c => c.category).filter(Boolean))
    return Array.from(set)
  }, [allCourses])

  const getDifficultyBadge = (level) => {
    switch (level) {
      case 'Beginner':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Beginner</span>
      case 'Intermediate':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Intermediate</span>
      case 'Advanced':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Advanced</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">{level || 'All Levels'}</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Bar */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/dashboard"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" style={{ height: '32px', width: 'auto' }} />
              <div>
                <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                  Course Recommendations
                </h1>
                <p className="text-[11px] text-gray-500">Personalised to your learning goals</p>
              </div>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1"
          >
            <span>My Courses</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Alert Notification */}
      {alertInfo.message && (
        <div className="container mx-auto px-4 md:px-6 pt-4 animate-fade-in">
          <div className={`p-4 rounded-xl shadow-sm border flex items-center space-x-3 ${
            alertInfo.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : alertInfo.type === 'info'
              ? 'bg-blue-50 text-blue-900 border-blue-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {alertInfo.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : alertInfo.type === 'info' ? (
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-medium">{alertInfo.message}</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-6xl space-y-8">
        {/* --- 1. Learning Interest Editor Card --- */}
        <section className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-xs rounded-full text-xs font-semibold text-emerald-100 mb-3 border border-white/15">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Smart Interest Matching</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
              What would you most like help with?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mb-5 leading-relaxed">
              Tell us your learning goals, interests, or the skills you wish to build. We'll automatically suggest the most relevant courses for you.
            </p>

            <form onSubmit={handleUpdateInterest} className="space-y-4">
              {/* Dropdown Selector */}
              <div>
                <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Select an area of interest</span>
                  <span className="text-emerald-200/80 font-normal lowercase">or choose a topic below</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedTopic}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedTopic(val)
                      if (val && val !== 'Something else') {
                        setInterestInput(val)
                        if (interestError) setInterestError('')
                      } else if (val === 'Something else') {
                        setInterestInput('')
                      }
                    }}
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-white rounded-xl shadow-md border-2 border-emerald-300 focus:ring-2 focus:ring-amber-400 outline-none font-medium cursor-pointer appearance-none"
                  >
                    <option value="">-- Choose what you would most like help with --</option>
                    {helpTopics.map(t => (
                      <option key={t.topicId} value={t.label}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Quick Select Option Pills (From Image Requirements) */}
              {helpTopics.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-emerald-100 block mb-2">
                    Quick Options:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {helpTopics.map((topic) => {
                      const isSelected = selectedTopic === topic.label || interestInput === topic.label
                      return (
                        <button
                          key={topic.topicId}
                          type="button"
                          onClick={() => {
                            setSelectedTopic(topic.label)
                            if (topic.label === 'Something else') {
                              setInterestInput('')
                            } else {
                              setInterestInput(topic.label)
                              if (interestError) setInterestError('')
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-white/70 font-bold scale-105'
                              : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                          }`}
                        >
                          • {topic.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Custom Details / Additional Notes */}
              <div className="relative pt-1">
                <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Custom Learning Goals / Details</span>
                  <span>{interestInput.length}/500</span>
                </label>
                <textarea
                  rows={2}
                  value={interestInput}
                  onChange={(e) => {
                    setInterestInput(e.target.value)
                    if (interestError) setInterestError('')
                  }}
                  placeholder="Describe your learning goals, background, or specific skills you need..."
                  className={`w-full p-3.5 text-sm text-gray-900 bg-white rounded-xl shadow-inner border outline-none resize-none focus:ring-2 focus:ring-amber-400 ${
                    interestError ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {interestError && (
                  <p className="text-xs text-amber-300 font-semibold mt-1">
                    ⚠️ {interestError}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingInterest}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isUpdatingInterest ? 'animate-spin' : ''}`} />
                  <span>{isUpdatingInterest ? 'Updating...' : 'Find Matching Courses'}</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* --- 2. Recommended Courses Section --- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Compass className="h-5 w-5 text-emerald-700" />
                <span>Recommended for You</span>
              </h2>
              {recommendationMessage && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {recommendationMessage}
                </p>
              )}
            </div>

            {recommendations.length > 0 && !isFallback && (
              <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                {recommendations.length} Matched Course{recommendations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center shadow-xs">
              <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">Calculating your course recommendations...</h3>
              <p className="text-xs text-gray-500 mt-1">Matching against published courses in One Community Ely</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center shadow-xs">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-800">No courses available at the moment.</h3>
              <p className="text-xs text-gray-500 mt-1">Please check back soon as new courses are published regularly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendations.map((course, idx) => {
                const isSelected = selectedCourseIds.has(course.courseId)
                const isSelecting = selectingCourseId === course.courseId

                return (
                  <div
                    key={course.courseId}
                    className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all hover:shadow-md ${
                      course.isBestMatch ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-gray-200'
                    }`}
                  >
                    {/* Thumbnail & Badges */}
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

                      {/* Best Match Badge */}
                      {course.isBestMatch && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 bg-amber-400 text-slate-900 text-xs font-extrabold rounded-full shadow-md">
                          <Star className="h-3.5 w-3.5 fill-slate-900" />
                          <span>Best Match</span>
                        </div>
                      )}

                      <div className="absolute top-3 right-3">
                        {getDifficultyBadge(course.difficultyLevel)}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
                          <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {course.category}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500 font-normal">
                            <Clock className="h-3 w-3" />
                            {course.estimatedDuration || 'Self-paced'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-gray-900 line-clamp-2 mt-1.5" title={course.title}>
                          {course.title}
                        </h3>

                        <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">
                          {course.shortDescription}
                        </p>

                        {/* Learning Outcomes Preview */}
                        {Array.isArray(course.learningOutcomes) && course.learningOutcomes.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              What you'll learn:
                            </span>
                            {course.learningOutcomes.slice(0, 2).map((outcome, oIdx) => (
                              <div key={oIdx} className="flex items-start gap-1.5 line-clamp-1">
                                <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <span className="truncate">{outcome}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recommendation Reason Box */}
                      {course.recommendationReason && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] font-medium text-emerald-900 leading-snug">
                            {course.recommendationReason}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-gray-100 flex gap-2">
                        <Link
                          to={`/courses/${course.courseId}`}
                          className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold text-center transition-colors"
                        >
                          View Course
                        </Link>

                        <button
                          onClick={() => handleSelectCourse(course, 'recommendation', course.recommendationReason)}
                          disabled={isSelected || isSelecting}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                              : 'bg-[#23735F] hover:bg-[#1b5c4c] text-white shadow-xs cursor-pointer'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Selected</span>
                            </>
                          ) : isSelecting ? (
                            <span>Selecting...</span>
                          ) : (
                            <span>Select Course</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* --- 3. Browse All Published Courses Section --- */}
        <section className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-700" />
                <span>Browse All Courses</span>
              </h2>
              <p className="text-xs text-gray-500">
                Explore the complete catalogue of available training courses
              </p>
            </div>

            {/* Clear Filters Button */}
            {(browseSearch || categoryFilter !== 'all' || difficultyFilter !== 'all') && (
              <button
                onClick={() => {
                  setBrowseSearch('')
                  setCategoryFilter('all')
                  setDifficultyFilter('all')
                }}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold self-start sm:self-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Filter & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none bg-white text-gray-700"
              >
                <option value="all">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none bg-white text-gray-700"
              >
                <option value="all">All Difficulty Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* All Courses Grid */}
          {filteredAllCourses.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center shadow-2xs">
              <p className="text-xs text-gray-500">No courses found matching your filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAllCourses.map(course => {
                const isSelected = selectedCourseIds.has(course.courseId)
                const isSelecting = selectingCourseId === course.courseId

                return (
                  <div
                    key={course.courseId}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {course.category}
                        </span>
                        {getDifficultyBadge(course.difficultyLevel)}
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1" title={course.title}>
                        {course.title}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3">
                        {course.shortDescription}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <Link
                        to={`/courses/${course.courseId}`}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                      >
                        <span>Overview</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>

                      <button
                        onClick={() => handleSelectCourse(course, 'browse')}
                        disabled={isSelected || isSelecting}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                            : 'bg-[#23735F] hover:bg-[#1b5c4c] text-white cursor-pointer'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Selected</span>
                          </>
                        ) : isSelecting ? (
                          <span>Selecting...</span>
                        ) : (
                          <span>Select Course</span>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default CourseRecommendations
