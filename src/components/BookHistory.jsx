import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { historyService } from '../services/historyService'
import { ArrowLeft, BookOpen, Clock, Eye, Trash2, Calendar, TrendingUp } from 'lucide-react'

const BookHistory = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookHistory, setBookHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState(null)

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
      const [books, stats] = await Promise.all([
        historyService.getBookHistory(100),
        historyService.getStatistics()
      ])
      setBookHistory(books)
      setStatistics(stats)
    } catch (error) {
      console.error('Error loading book history:', error)
    }
    setLoading(false)
  }

  const handleDeleteEntry = async (historyId) => {
    if (!confirm('Delete this history entry?')) return

    try {
      console.log('Deleting book history entry:', historyId)
      await historyService.deleteHistoryEntry(historyId, 'book_view')
      
      // Immediately update UI by filtering out the deleted item
      setBookHistory(prev => prev.filter(book => book.id !== historyId))
      
      // Reload to get fresh data
      await loadHistory()
      console.log('Book history entry deleted successfully')
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry. Please try again.')
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('Clear all book history? This cannot be undone.')) return

    try {
      console.log('Clearing all book history...')
      
      // Delete all book history entries
      const deletePromises = bookHistory.map(book => 
        historyService.deleteHistoryEntry(book.id, 'book_view')
      )
      await Promise.all(deletePromises)
      
      // Clear UI immediately
      setBookHistory([])
      
      // Reload to confirm
      await loadHistory()
      console.log('All book history cleared successfully')
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
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

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
                <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-800">Book History</h1>
                  <p className="text-xs md:text-sm text-gray-600">Your reading activity</p>
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
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Books Viewed</p>
                  <p className="text-2xl font-bold text-gray-800">{statistics.totalBooksViewed}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Reading Time</p>
                  <p className="text-2xl font-bold text-gray-800">{statistics.totalStudyTime}m</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Most Read Subject</p>
                  <p className="text-lg font-bold text-gray-800">{statistics.mostViewedSubject}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading history...</p>
          </div>
        )}

        {/* Book History List */}
        {!loading && (
          <div className="space-y-4">
            {bookHistory.map((book) => (
              <div key={book.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{book.bookTitle}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(book.timestamp)}</span>
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {book.bookSubject}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Class {book.bookClass}
                        </span>
                        {book.duration > 0 && (
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(book.duration)}</span>
                          </span>
                        )}
                        {book.lastPage > 1 && (
                          <span className="text-xs text-gray-500">
                            Last read: Page {book.lastPage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/book-viewer/${book.bookId}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Continue Reading"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteEntry(book.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {bookHistory.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Books Read Yet</h3>
                <p className="text-gray-500 mb-6">Start reading to see your history here</p>
                <Link to="/guide-books" className="btn btn-primary">
                  Browse Books
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default BookHistory
