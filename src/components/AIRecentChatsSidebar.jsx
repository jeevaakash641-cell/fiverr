import React, { useState, useRef, useEffect } from 'react'
import { 
  Plus, MoreHorizontal, MessageSquare, Trash2, Edit3, 
  Search, Check, X, Clock, ChevronLeft, ChevronRight,
  Download
} from 'lucide-react'

const AIRecentChatsSidebar = ({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onClearAll,
  isOpen,
  onToggle
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const moreMenuRef = useRef(null)

  // Close more menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (session.title || '').toLowerCase().includes(q) ||
      (session.messages || []).some(m => (m.content || '').toLowerCase().includes(q))
    )
  })

  const startRename = (session, e) => {
    e.stopPropagation()
    setEditingSessionId(session.id)
    setEditTitle(session.title || '')
  }

  const handleSaveRename = (sessionId, e) => {
    e.stopPropagation()
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim())
    }
    setEditingSessionId(null)
  }

  const handleCancelRename = (e) => {
    e.stopPropagation()
    setEditingSessionId(null)
  }

  const handleDeleteClick = (sessionId, e) => {
    e.stopPropagation()
    if (window.confirm('Delete this conversation from history?')) {
      onDeleteSession(sessionId)
    }
  }

  const exportAllChats = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute("href", dataStr)
      downloadAnchor.setAttribute("download", `one_community_ai_chats_${Date.now()}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      setShowMoreMenu(false)
    } catch (err) {
      console.warn('Export failed:', err)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <aside className="w-64 md:w-72 bg-[#0c1017] text-gray-200 rounded-2xl flex flex-col border border-gray-800 shadow-xl overflow-hidden flex-shrink-0 h-[calc(100vh-230px)] min-h-[520px] transition-all duration-200 select-none">
      {/* Top Action Bar */}
      <div className="p-3 border-b border-gray-800/80 flex items-center justify-between gap-2 bg-[#090d14]">
        {/* + New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer group"
          title="Start a new conversation"
        >
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
          <span>New Chat</span>
        </button>

        {/* ... More Menu Button */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-700"
            title="More Options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl py-1 z-50 text-xs text-gray-200 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  setShowMoreMenu(false)
                  onNewChat()
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-400" />
                <span>New Conversation</span>
              </button>
              <button
                onClick={exportAllChats}
                className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-sky-400" />
                <span>Export All Chats</span>
              </button>
              <div className="my-1 border-t border-gray-700/80" />
              <button
                onClick={() => {
                  setShowMoreMenu(false)
                  if (window.confirm('Clear all conversation history? This cannot be undone.')) {
                    onClearAll()
                  }
                }}
                className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-950/40 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All History</span>
              </button>
            </div>
          )}
        </div>

        {/* Collapse Sidebar Button */}
        <button
          onClick={onToggle}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/80 rounded-xl transition-colors cursor-pointer"
          title="Collapse Recents"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Recents Section Header & Search */}
      <div className="px-3.5 pt-3 pb-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sky-400 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            <span>Recents</span>
          </span>
          <span className="text-[10px] text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded-full font-mono">
            {filteredSessions.length}
          </span>
        </div>

        {/* Search within recents */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent chats..."
            className="w-full bg-[#161b22] border border-gray-800 text-xs text-gray-200 placeholder-gray-400 rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto text-gray-700 stroke-1" />
            <p>{searchQuery ? 'No matching chats found' : 'No recent chats yet.'}</p>
            {!searchQuery && (
              <button
                onClick={onNewChat}
                className="text-emerald-400 hover:underline text-xs font-semibold cursor-pointer"
              >
                Start your first chat
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId
            const isEditing = editingSessionId === session.id

            if (isEditing) {
              return (
                <div
                  key={session.id}
                  className="p-1.5 bg-gray-800 rounded-xl border border-sky-500/50 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(session.id, e)
                      if (e.key === 'Escape') handleCancelRename(e)
                    }}
                    autoFocus
                    className="flex-1 bg-transparent text-xs text-white px-2 py-1 border-none focus:outline-none"
                  />
                  <button
                    onClick={(e) => handleSaveRename(session.id, e)}
                    className="p-1 text-emerald-400 hover:bg-gray-700 rounded cursor-pointer"
                    title="Save"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleCancelRename}
                    className="p-1 text-gray-400 hover:bg-gray-700 rounded cursor-pointer"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            }

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#21262d] text-white shadow-sm font-semibold border-l-2 border-sky-400'
                    : 'text-gray-300 hover:text-white hover:bg-[#161b22]'
                }`}
                title={session.title}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="truncate text-xs leading-snug">
                    {session.title || 'Untitled Conversation'}
                  </p>
                  {session.updatedAt && (
                    <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
                      {new Date(session.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {/* Action Buttons on Hover */}
                <div className={`items-center gap-1 ${isActive ? 'flex' : 'hidden group-hover:flex'}`}>
                  <button
                    onClick={(e) => startRename(session, e)}
                    className="p-1 text-gray-400 hover:text-sky-300 hover:bg-gray-700/80 rounded transition-colors cursor-pointer"
                    title="Rename"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(session.id, e)}
                    className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/80 rounded transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer info strip */}
      <div className="p-2.5 border-t border-gray-800/80 bg-[#090d14] text-[10px] text-gray-400 flex items-center justify-between">
        <span className="truncate">One Community Ely AI</span>
        <span className="text-emerald-400 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ready
        </span>
      </div>
    </aside>
  )
}

export default AIRecentChatsSidebar
