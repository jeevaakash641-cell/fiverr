import { API_BASE_URL } from '../config'

/**
 * History Service - Manages user activity history stored in S3
 * Tracks: Book views, Quiz attempts, AI conversations
 */

class HistoryService {
  constructor() {
    this.userId = null
    this.historyCache = {
      books: [],
      quizzes: [],
      aiChats: []
    }
  }

  /**
   * Initialize history service with user ID
   */
  setUser(userId) {
    this.userId = userId
    this.loadHistoryFromCache()
  }

  /**
   * Load history from localStorage cache
   */
  loadHistoryFromCache() {
    try {
      const cached = localStorage.getItem(`history_${this.userId}`)
      if (cached) {
        this.historyCache = JSON.parse(cached)
      }
    } catch (error) {
      console.error('Error loading history cache:', error)
    }
  }

  /**
   * Save history to localStorage cache
   */
  saveHistoryToCache() {
    try {
      localStorage.setItem(`history_${this.userId}`, JSON.stringify(this.historyCache))
    } catch (error) {
      console.error('Error saving history cache:', error)
    }
  }

  /**
   * Track book view
   */
  async trackBookView(bookData) {
    if (!this.userId) return

    const historyEntry = {
      id: `book_${Date.now()}`,
      type: 'book_view',
      userId: this.userId,
      bookId: bookData.id,
      bookTitle: bookData.title,
      bookSubject: bookData.subject,
      bookClass: bookData.class,
      timestamp: new Date().toISOString(),
      duration: 0, // Will be updated on close
      lastPage: 1
    }

    // Add to cache
    this.historyCache.books.unshift(historyEntry)
    this.historyCache.books = this.historyCache.books.slice(0, 50) // Keep last 50
    this.saveHistoryToCache()

    // Save to S3 via backend
    try {
      await fetch(`${API_BASE_URL}/api/history/book-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyEntry)
      })
    } catch (error) {
      console.error('Error saving book view history:', error)
    }

    return historyEntry.id
  }

  /**
   * Update book view duration and last page
   */
  async updateBookView(historyId, duration, lastPage) {
    if (!this.userId) return

    // Update cache
    const entry = this.historyCache.books.find(h => h.id === historyId)
    if (entry) {
      entry.duration = duration
      entry.lastPage = lastPage
      entry.lastUpdated = new Date().toISOString()
      this.saveHistoryToCache()
    }

    // Update in S3
    try {
      await fetch(`${API_BASE_URL}/api/history/book-view/${historyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration, lastPage })
      })
    } catch (error) {
      console.error('Error updating book view history:', error)
    }
  }

  /**
   * Track quiz attempt
   */
  async trackQuizAttempt(quizData) {
    if (!this.userId) return

    const historyEntry = {
      id: `quiz_${Date.now()}`,
      type: 'quiz_attempt',
      userId: this.userId,
      quizId: quizData.quizId || `quiz_${quizData.subject}_${Date.now()}`,
      subject: quizData.subject,
      class: quizData.class,
      totalQuestions: quizData.totalQuestions,
      correctAnswers: quizData.correctAnswers,
      score: quizData.score,
      percentage: quizData.percentage,
      timeTaken: quizData.timeTaken,
      answers: quizData.answers, // Array of user answers
      timestamp: new Date().toISOString()
    }

    // Add to cache
    this.historyCache.quizzes.unshift(historyEntry)
    this.historyCache.quizzes = this.historyCache.quizzes.slice(0, 100) // Keep last 100
    this.saveHistoryToCache()

    // Save to S3 via backend
    try {
      await fetch(`${API_BASE_URL}/api/history/quiz-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyEntry)
      })
    } catch (error) {
      console.error('Error saving quiz attempt history:', error)
    }

    return historyEntry.id
  }

  /**
   * Track AI conversation
   */
  async trackAIConversation(conversationData) {
    if (!this.userId) return

    const historyEntry = {
      id: `ai_${Date.now()}`,
      type: 'ai_conversation',
      userId: this.userId,
      sessionId: conversationData.sessionId || `session_${Date.now()}`,
      subject: conversationData.subject || 'General',
      messages: conversationData.messages, // Array of {role, content, timestamp}
      messageCount: conversationData.messages.length,
      startTime: conversationData.startTime,
      endTime: new Date().toISOString(),
      duration: conversationData.duration,
      timestamp: new Date().toISOString()
    }

    // Add to cache
    this.historyCache.aiChats.unshift(historyEntry)
    this.historyCache.aiChats = this.historyCache.aiChats.slice(0, 50) // Keep last 50
    this.saveHistoryToCache()

    // Save to S3 via backend
    try {
      await fetch(`${API_BASE_URL}/api/history/ai-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyEntry)
      })
    } catch (error) {
      console.error('Error saving AI conversation history:', error)
    }

    return historyEntry.id
  }

  /**
   * Get book view history
   */
  async getBookHistory(limit = 20) {
    if (!this.userId) return []

    // Return from cache (already filtered by deletes)
    return this.historyCache.books.slice(0, limit)
  }

  /**
   * Get quiz attempt history
   */
  async getQuizHistory(limit = 20, subject = null) {
    if (!this.userId) return []

    // Return from cache (already filtered by deletes)
    let history = this.historyCache.quizzes
    if (subject) {
      history = history.filter(h => h.subject === subject)
    }
    return history.slice(0, limit)
  }

  /**
   * Get AI conversation history
   */
  async getAIHistory(limit = 20) {
    if (!this.userId) return []

    // Return from cache (already filtered by deletes)
    return this.historyCache.aiChats.slice(0, limit)
  }

  /**
   * Get recent activity (all types)
   */
  async getRecentActivity(limit = 10) {
    if (!this.userId) return []

    try {
      const response = await fetch(`${API_BASE_URL}/api/history/recent/${this.userId}?limit=${limit}`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }

    // Fallback: combine all cached history
    const allHistory = [
      ...this.historyCache.books,
      ...this.historyCache.quizzes,
      ...this.historyCache.aiChats
    ]
    
    return allHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    if (!this.userId) return null

    try {
      const response = await fetch(`${API_BASE_URL}/api/history/statistics/${this.userId}`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }

    // Fallback: calculate from cache
    return {
      totalBooksViewed: this.historyCache.books.length,
      totalQuizzesTaken: this.historyCache.quizzes.length,
      totalAIConversations: this.historyCache.aiChats.length,
      averageQuizScore: this.calculateAverageQuizScore(),
      totalStudyTime: this.calculateTotalStudyTime(),
      mostViewedSubject: this.getMostViewedSubject()
    }
  }

  /**
   * Calculate average quiz score
   */
  calculateAverageQuizScore() {
    if (this.historyCache.quizzes.length === 0) return 0
    const total = this.historyCache.quizzes.reduce((sum, quiz) => sum + quiz.percentage, 0)
    return Math.round(total / this.historyCache.quizzes.length)
  }

  /**
   * Calculate total study time
   */
  calculateTotalStudyTime() {
    const bookTime = this.historyCache.books.reduce((sum, book) => sum + (book.duration || 0), 0)
    const aiTime = this.historyCache.aiChats.reduce((sum, chat) => sum + (chat.duration || 0), 0)
    return Math.round((bookTime + aiTime) / 60) // Convert to minutes
  }

  /**
   * Get most viewed subject
   */
  getMostViewedSubject() {
    const subjectCounts = {}
    
    this.historyCache.books.forEach(book => {
      subjectCounts[book.bookSubject] = (subjectCounts[book.bookSubject] || 0) + 1
    })
    
    this.historyCache.quizzes.forEach(quiz => {
      subjectCounts[quiz.subject] = (subjectCounts[quiz.subject] || 0) + 1
    })

    const subjects = Object.entries(subjectCounts)
    if (subjects.length === 0) return 'None'
    
    return subjects.reduce((max, curr) => curr[1] > max[1] ? curr : max)[0]
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    if (!this.userId) return

    this.historyCache = {
      books: [],
      quizzes: [],
      aiChats: []
    }
    this.saveHistoryToCache()

    try {
      await fetch(`${API_BASE_URL}/api/history/clear/${this.userId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Error clearing history:', error)
    }
  }

  /**
   * Delete specific history entry
   */
  async deleteHistoryEntry(historyId, type) {
    if (!this.userId) return

    // Remove from cache
    if (type === 'book_view') {
      this.historyCache.books = this.historyCache.books.filter(h => h.id !== historyId)
    } else if (type === 'quiz_attempt') {
      this.historyCache.quizzes = this.historyCache.quizzes.filter(h => h.id !== historyId)
    } else if (type === 'ai_conversation') {
      this.historyCache.aiChats = this.historyCache.aiChats.filter(h => h.id !== historyId)
    }
    this.saveHistoryToCache()

    // Delete from S3
    try {
      await fetch(`${API_BASE_URL}/api/history/${historyId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Error deleting history entry:', error)
    }
  }
}

// Export singleton instance
export const historyService = new HistoryService()

// Export class for testing
export default HistoryService
