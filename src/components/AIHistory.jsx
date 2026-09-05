import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { historyService } from '../services/historyService'
import { ArrowLeft, MessageSquare, Clock, Trash2, Calendar, TrendingUp, MessageCircle } from 'lucide-react'

const AIHistory = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [aiHistory, setAIHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState(null)
  const [expandedChat, setExpandedChat] = useState(null)

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
      const [chats, stats] = await Promise.all([
        historyService.getAIHistory(100),
        historyService.getStatistics()
      ])
      setAIHistory(chats)
      setStatistics(stats)
    } catch (error) {
      console.error('Error loading AI history:', error)
    }
    setLoading(false)
  }

  const handleDeleteEntry = async (historyId) => {
    if (!confirm('Delete this conversation?')) return

    try {
      console.log('Deleting AI history entry:', historyId)
      await historyService.deleteHistoryEntry(historyId, 'ai_conversation')
      
      // Immediately update UI
      setAIHistory(prev => prev.filter(chat => chat.id !== historyId))
      
      // Reload to get fresh data
      await loadHistory()
      console.log('AI history entry deleted successfully')
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry. Please try again.')
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('Clear all AI chat history? This cannot be undone.')) return

    try {
      console.log('Clearing all AI history...')
      
      const deletePromises = aiHistory.map(chat => 
        historyService.deleteHistoryEntry(chat.id, 'ai_conversation')
      )
      await Promise.all(deletePromises)
      
      // Clear UI immediately
      setAIHistory([])
      
      // Reload to confirm
      await loadHistory()
      console.log('All AI history cleared successfully')
    } catch (error) {
      console.error('Error clearing history:', error)
      alert('Failed to clear history. Please try again.')
    }
  }

  const toggleExpand = (chatId) => {
    setExpandedChat(expandedChat === chatId ? null : chatId)
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
                <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-800">AI Chat History</h1>
                  <p className="text-xs md:text-sm text-gray-600">Your AI conversations</p>
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
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Conversations</p>
                  <p className="text-2xl font-bold text-gray-800">{statistics.totalAIConversations}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {aiHistory.reduce((sum, chat) => sum + chat.messageCount, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Chat Time</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {Math.floor(aiHistory.reduce((sum, chat) => sum + (chat.duration || 0), 0) / 60)}m
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading history...</p>
          </div>
        )}

        {/* AI Chat History List */}
        {!loading && (
          <div className="space-y-4">
            {aiHistory.map((chat) => (
              <div key={chat.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">
                        AI Chat - {chat.subject}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(chat.timestamp)}</span>
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {chat.messageCount} messages
                        </span>
                        {chat.duration && (
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(chat.duration)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(chat.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* First Message Preview */}
                {chat.messages && chat.messages.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        <span className="font-medium text-gray-900">You: </span>
                        {chat.messages[0].content}
                      </p>
                    </div>
                    
                    {/* Expand/Collapse Button */}
                    {chat.messages.length > 1 && (
                      <button
                        onClick={() => toggleExpand(chat.id)}
                        className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        {expandedChat === chat.id ? 'Show less' : `Show all ${chat.messages.length} messages`}
                      </button>
                    )}

                    {/* Expanded Messages */}
                    {expandedChat === chat.id && chat.messages.length > 1 && (
                      <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                        {chat.messages.slice(1).map((message, index) => (
                          <div
                            key={index}
                            className={`rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-blue-50 ml-4'
                                : 'bg-purple-50 mr-4'
                            }`}
                          >
                            <p className="text-sm text-gray-700">
                              <span className="font-medium text-gray-900">
                                {message.role === 'user' ? 'You: ' : 'AI: '}
                              </span>
                              {message.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Empty State */}
            {aiHistory.length === 0 && (
              <div className="text-center py-16">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No AI Conversations Yet</h3>
                <p className="text-gray-500 mb-6">Start chatting with AI to see your history here</p>
                <Link to="/ai-assistant" className="btn btn-primary">
                  Chat with AI
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default AIHistory
