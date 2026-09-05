import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { historyService } from '../services/historyService'
import { ArrowLeft, Award, Clock, Trash2, Calendar, TrendingUp, Target, BarChart3 } from 'lucide-react'

const QuizHistory = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quizHistory, setQuizHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [expandedQuiz, setExpandedQuiz] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    historyService.setUser(user.email || user.id)
    loadHistory()
  }, [user, navigate, selectedSubject])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const subject = selectedSubject === 'all' ? null : selectedSubject
      const [quizzes, stats] = await Promise.all([
        historyService.getQuizHistory(100, subject),
        historyService.getStatistics()
      ])
      setQuizHistory(quizzes)
      setStatistics(stats)
    } catch (error) {
      console.error('Error loading quiz history:', error)
    }
    setLoading(false)
  }

  const handleDeleteEntry = async (historyId) => {
    if (!confirm('Delete this quiz attempt?')) return

    try {
      console.log('Deleting quiz history entry:', historyId)
      await historyService.deleteHistoryEntry(historyId, 'quiz_attempt')
      
      // Immediately update UI
      setQuizHistory(prev => prev.filter(quiz => quiz.id !== historyId))
      
      // Reload to get fresh data
      await loadHistory()
      console.log('Quiz history entry deleted successfully')
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry. Please try again.')
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('Clear all quiz history? This cannot be undone.')) return

    try {
      console.log('Clearing all quiz history...')
      
      const deletePromises = quizHistory.map(quiz => 
        historyService.deleteHistoryEntry(quiz.id, 'quiz_attempt')
      )
      await Promise.all(deletePromises)
      
      // Clear UI immediately
      setQuizHistory([])
      
      // Reload to confirm
      await loadHistory()
      console.log('All quiz history cleared successfully')
    } catch (error) {
      console.error('Error clearing history:', error)
      alert('Failed to clear history. Please try again.')
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0m'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-100 text-green-700 border-green-200'
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  const getScoreIcon = (percentage) => {
    if (percentage >= 80) return '🎉'
    if (percentage >= 60) return '👍'
    return '📚'
  }

  const toggleQuizDetails = (quizId) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId)
  }

  // Mock questions for demo - in real app, these would come from quiz data
  const getQuizQuestions = (quiz) => {
    // This is sample data - replace with actual quiz questions from your quiz system
    return [
      {
        id: 1,
        question: "What is the fundamental principle behind this concept?",
        options: [
          "Option A: First principle explanation",
          "Option B: Second principle explanation",
          "Option C: Third principle explanation",
          "Option D: Fourth principle explanation"
        ],
        correctAnswer: 0,
        userAnswer: quiz.answers?.[1] !== undefined ? quiz.answers[1] : null,
        explanation: "The correct answer is Option A because it represents the fundamental principle that forms the basis of this concept."
      },
      {
        id: 2,
        question: "Which of the following best describes the relationship?",
        options: [
          "Option A: Direct relationship",
          "Option B: Inverse relationship",
          "Option C: No relationship",
          "Option D: Complex relationship"
        ],
        correctAnswer: 1,
        userAnswer: quiz.answers?.[2] !== undefined ? quiz.answers[2] : null,
        explanation: "Option B is correct as it demonstrates an inverse relationship where one variable increases as the other decreases."
      },
      {
        id: 3,
        question: "What would be the expected outcome in this scenario?",
        options: [
          "Option A: Positive outcome",
          "Option B: Negative outcome",
          "Option C: Neutral outcome",
          "Option D: Variable outcome"
        ],
        correctAnswer: 2,
        userAnswer: quiz.answers?.[3] !== undefined ? quiz.answers[3] : null,
        explanation: "The neutral outcome (Option C) is expected because the factors balance each other out in this particular scenario."
      }
    ]
  }

  // Get unique subjects from user's profile
  const subjects = user?.subjects || []

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
              </Link>
              <div className="flex items-center space-x-2 md:space-x-3">
                <Award className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-800">Quiz History</h1>
                  <p className="text-xs md:text-sm text-gray-600">Your quiz performance</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleClearHistory}
              className="flex items-center space-x-2 px-3 md:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden md:inline">Clear All</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quizzes Taken</p>
                  <p className="text-2xl font-bold text-gray-800">{statistics.totalQuizzesTaken}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-800">{statistics.averageQuizScore}%</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Best Subject</p>
                  <p className="text-lg font-bold text-gray-800">{statistics.mostViewedSubject}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subject Filter */}
        {subjects.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubject('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSubject === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Subjects
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSubject === subject
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading history...</p>
          </div>
        )}

        {/* Quiz History List */}
        {!loading && (
          <div className="space-y-4">
            {quizHistory.map((quiz) => (
              <div key={quiz.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center border-2 ${getScoreColor(quiz.percentage)}`}>
                      <span className="text-2xl">{getScoreIcon(quiz.percentage)}</span>
                      <span className="text-xs font-bold">{quiz.percentage}%</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{quiz.subject} Quiz</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(quiz.timestamp)}</span>
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {quiz.correctAnswers}/{quiz.totalQuestions} correct
                        </span>
                        {quiz.timeTaken && (
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(quiz.timeTaken)}</span>
                          </span>
                        )}
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            quiz.percentage >= 80 ? 'bg-green-500' :
                            quiz.percentage >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${quiz.percentage}%` }}
                        ></div>
                      </div>
                      {/* View Details Button */}
                      <button
                        onClick={() => toggleQuizDetails(quiz.id)}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        {expandedQuiz === quiz.id ? '▼ Hide Details' : '▶ View Questions & Answers'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(quiz.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Expanded Quiz Details */}
                {expandedQuiz === quiz.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-4">Quiz Review</h4>
                    <div className="space-y-6">
                      {getQuizQuestions(quiz).map((q, index) => {
                        const isCorrect = q.userAnswer === q.correctAnswer
                        const wasAnswered = q.userAnswer !== null && q.userAnswer !== undefined
                        
                        return (
                          <div key={q.id} className="bg-gray-50 rounded-lg p-4">
                            {/* Question */}
                            <div className="flex items-start space-x-2 mb-3">
                              <span className="font-semibold text-gray-700">Q{index + 1}.</span>
                              <p className="font-medium text-gray-800">{q.question}</p>
                            </div>

                            {/* Options */}
                            <div className="space-y-2 ml-6 mb-4">
                              {q.options.map((option, optIndex) => {
                                const isUserAnswer = q.userAnswer === optIndex
                                const isCorrectAnswer = q.correctAnswer === optIndex
                                
                                let optionClass = 'bg-white border-2 border-gray-200'
                                let icon = ''
                                
                                if (isUserAnswer && isCorrect) {
                                  optionClass = 'bg-green-50 border-2 border-green-500'
                                  icon = '✓'
                                } else if (isUserAnswer && !isCorrect) {
                                  optionClass = 'bg-red-50 border-2 border-red-500'
                                  icon = '✗'
                                } else if (isCorrectAnswer) {
                                  optionClass = 'bg-green-50 border-2 border-green-300'
                                  icon = '✓'
                                }
                                
                                return (
                                  <div key={optIndex} className={`p-3 rounded-lg ${optionClass}`}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-800">{option}</span>
                                      {icon && (
                                        <span className={`font-bold ${isCorrect && isUserAnswer ? 'text-green-600' : isUserAnswer ? 'text-red-600' : 'text-green-600'}`}>
                                          {icon}
                                        </span>
                                      )}
                                    </div>
                                    {isUserAnswer && !isCorrect && (
                                      <span className="text-xs text-red-600 mt-1 block">Your answer</span>
                                    )}
                                    {isCorrectAnswer && !isUserAnswer && (
                                      <span className="text-xs text-green-600 mt-1 block">Correct answer</span>
                                    )}
                                    {isUserAnswer && isCorrect && (
                                      <span className="text-xs text-green-600 mt-1 block">Your answer (Correct!)</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Result Badge */}
                            <div className="ml-6 mb-3">
                              {wasAnswered ? (
                                isCorrect ? (
                                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    ✓ Correct
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                    ✗ Incorrect
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                  ⊘ Not Answered
                                </span>
                              )}
                            </div>

                            {/* Solution/Explanation */}
                            <div className="ml-6 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                              <p className="text-sm font-semibold text-blue-900 mb-1">💡 Solution:</p>
                              <p className="text-sm text-blue-800">{q.explanation}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Empty State */}
            {quizHistory.length === 0 && (
              <div className="text-center py-16">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Quizzes Taken Yet</h3>
                <p className="text-gray-500 mb-6">
                  {selectedSubject === 'all' 
                    ? 'Start taking quizzes to track your progress'
                    : `No ${selectedSubject} quizzes taken yet`
                  }
                </p>
                <Link to="/dashboard" className="btn btn-primary">
                  Take a Quiz
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default QuizHistory
