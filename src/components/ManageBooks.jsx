import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowLeft, BookOpen, Trash2, Download, Search, Filter, 
  Plus, FileText, LogOut, RefreshCw, CheckCircle, AlertTriangle 
} from 'lucide-react'
import { getAllBooks } from '../data/booksData'
import { API_BASE_URL } from '../config'

const ManageBooks = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  const [booksList, setBooksList] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Search & Filters
  const [bookSearch, setBookSearch] = useState('')
  const [bookFormatFilter, setBookFormatFilter] = useState('all')
  const [bookSubjectFilter, setBookSubjectFilter] = useState('all')

  // Alert State
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' })

  const showAlert = (type, message) => {
    setAlertInfo({ type, message })
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 4000)
  }

  const fetchBooks = async () => {
    setRefreshing(true)
    let combinedBooks = []
    
    // Read deleted IDs tracker
    const deletedIds = new Set(JSON.parse(localStorage.getItem('deletedBookIds') || '[]'))

    try {
      const localUploaded = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
      combinedBooks = [...localUploaded]
    } catch (e) {
      console.warn('Error reading local books:', e)
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/books`)
      if (res.ok) {
        const serverBooks = await res.json()
        const existingIds = new Set(combinedBooks.map(b => b.id || b.key || b.title))
        serverBooks.forEach(sb => {
          const id = sb.id || sb.key || sb.title
          if (!existingIds.has(id)) {
            combinedBooks.push(sb)
          }
        })
      }
    } catch (err) {
      console.warn('Backend books API notice:', err)
    }

    if (combinedBooks.length === 0) {
      const defaultBooks = getAllBooks()
      combinedBooks = [...defaultBooks]
    }

    // Filter out any books that were deleted
    const finalBooks = combinedBooks.filter(b => {
      if (b.id && deletedIds.has(b.id)) return false
      if (b.key && deletedIds.has(b.key)) return false
      if (b.title && deletedIds.has(b.title)) return false
      return true
    })

    setBooksList(finalBooks)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    if (!user) {
      navigate('/admin-login')
      return
    }
    if (user.userType !== 'teacher') {
      alert('Access denied. Administrator privileges required.')
      navigate('/dashboard')
      return
    }
    fetchBooks()
  }, [user, navigate])

  if (!user || user.userType !== 'teacher') {
    return null
  }

  const handleDeleteBook = async (book) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${book.title}" from the library?`)) {
      return
    }

    const bookKey = book.key || book.id
    const bookTitle = book.title

    // 1. Immediately record in deletedBookIds in localStorage so it never comes back
    try {
      const deletedIds = JSON.parse(localStorage.getItem('deletedBookIds') || '[]')
      if (book.id) deletedIds.push(book.id)
      if (book.key) deletedIds.push(book.key)
      if (book.title) deletedIds.push(book.title)
      localStorage.setItem('deletedBookIds', JSON.stringify(Array.from(new Set(deletedIds))))
    } catch (e) {}

    // 2. Remove from uploadedBooks in localStorage
    try {
      const localUploaded = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
      const filtered = localUploaded.filter(b => b.id !== book.id && b.key !== book.key && b.title !== bookTitle)
      localStorage.setItem('uploadedBooks', JSON.stringify(filtered))
    } catch (e) {}

    // 3. Delete from AWS S3 via Backend API
    try {
      if (bookKey) {
        const token = localStorage.getItem('edulearn_id_token')
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
        await fetch(`${API_BASE_URL}/api/books/${encodeURIComponent(bookKey)}`, { method: 'DELETE', headers })
      }
    } catch (err) {
      console.warn('Server delete notice (locally purged):', err)
    }

    // 4. Update UI state immediately
    setBooksList(prev => prev.filter(b => b.id !== book.id && b.key !== book.key && b.title !== bookTitle))
    showAlert('success', `Book "${book.title}" deleted successfully from the library.`)
  }

  const getFormatBadgeColor = (format) => {
    const f = (format || 'PDF').toUpperCase()
    if (f.includes('PNG') || f.includes('JPG') || f.includes('JPEG') || f.includes('WEBP') || f.includes('GIF') || f.includes('SVG') || f.includes('BMP')) return 'bg-pink-100 text-pink-800 border-pink-200'
    if (f.includes('PDF')) return 'bg-red-100 text-red-800 border-red-200'
    if (f.includes('DOC')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (f.includes('TXT') || f.includes('MD')) return 'bg-gray-100 text-gray-800 border-gray-200'
    if (f.includes('EPUB')) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (f.includes('PPT')) return 'bg-amber-100 text-amber-800 border-amber-200'
    if (f.includes('XLS') || f.includes('CSV')) return 'bg-green-100 text-green-800 border-green-200'
    return 'bg-purple-100 text-purple-800 border-purple-200'
  }

  // Filtered Books
  const filteredBooks = booksList.filter(b => {
    const matchesSearch = 
      (b.title || '').toLowerCase().includes(bookSearch.toLowerCase()) ||
      (b.author || '').toLowerCase().includes(bookSearch.toLowerCase()) ||
      (b.subject || '').toLowerCase().includes(bookSearch.toLowerCase())

    const bookFormat = (b.format || (b.originalFileName ? b.originalFileName.split('.').pop() : 'PDF')).toUpperCase()
    const matchesFormat = bookFormatFilter === 'all' || bookFormat.includes(bookFormatFilter.toUpperCase())

    const matchesSubject = bookSubjectFilter === 'all' || (b.subject || '').toLowerCase() === bookSubjectFilter.toLowerCase()

    return matchesSearch && matchesFormat && matchesSubject
  })

  const allSubjects = Array.from(new Set(booksList.map(b => b.subject).filter(Boolean)))
  const allFormats = Array.from(new Set(booksList.map(b => (b.format || 'PDF').toUpperCase())))

  const totalPDFs = booksList.filter(b => (b.format || '').toUpperCase().includes('PDF')).length
  const totalDocs = booksList.filter(b => (b.format || '').toUpperCase().includes('DOC')).length
  const totalEPUBs = booksList.filter(b => (b.format || '').toUpperCase().includes('EPUB')).length
  const totalOthers = booksList.length - totalPDFs - totalDocs - totalEPUBs

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/admin-panel">
                <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Manage Uploaded Books & Materials
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                    {booksList.length} Total
                  </span>
                </h1>
                <p className="text-xs text-gray-500">View, inspect, download, and delete learning resources for learners</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchBooks}
                disabled={refreshing}
                className="flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                title="Refresh Book List"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-700' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link
                to="/admin/courses"
                className="flex items-center space-x-2 px-4 py-2 bg-[#23735F] text-white rounded-lg hover:bg-[#1b5c4c] transition-colors text-sm font-semibold shadow-sm"
              >
                <BookOpen className="h-4 w-4" />
                <span>Manage Courses</span>
              </Link>
              <Link
                to="/upload-books"
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Upload Books</span>
              </Link>
              <Link
                to="/admin-panel"
                className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Portal</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors text-sm font-semibold border border-red-200"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alert Notification */}
      {alertInfo.message && (
        <div className="container mx-auto px-4 md:px-6 pt-4 max-w-6xl">
          <div className={`p-4 rounded-xl shadow-md border flex items-center space-x-3 animate-fade-in ${
            alertInfo.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {alertInfo.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{alertInfo.message}</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-6xl space-y-6">
        {/* Quick Format Distribution Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
            <BookOpen className="h-6 w-6 text-emerald-700 mx-auto mb-1" />
            <h4 className="text-xl font-bold text-gray-900">{booksList.length}</h4>
            <p className="text-xs text-gray-500 font-medium">All Learning Materials</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 mb-1">PDF</span>
            <h4 className="text-xl font-bold text-gray-900">{totalPDFs}</h4>
            <p className="text-xs text-gray-500 font-medium">PDF Documents</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 mb-1">DOCX</span>
            <h4 className="text-xl font-bold text-gray-900">{totalDocs}</h4>
            <p className="text-xs text-gray-500 font-medium">Word Documents</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 mb-1">EPUB / TXT</span>
            <h4 className="text-xl font-bold text-gray-900">{totalEPUBs + totalOthers}</h4>
            <p className="text-xs text-gray-500 font-medium">eBooks & Notes</p>
          </div>
        </div>

        {/* Search & Filters Card */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search learning materials by title, author, or subject..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase">Format:</span>
                <select
                  value={bookFormatFilter}
                  onChange={(e) => setBookFormatFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-emerald-500"
                >
                  <option value="all">All Formats ({booksList.length})</option>
                  {allFormats.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Category:</span>
                <select
                  value={bookSubjectFilter}
                  onChange={(e) => setBookSubjectFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-emerald-500"
                >
                  <option value="all">All Categories</option>
                  {allSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Books & Documents Catalog Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              Learning Documents Catalog ({filteredBooks.length})
            </h3>
            <span className="text-xs text-gray-500">Live synchronized with AWS S3 & localStorage</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-600 border-b">
                <tr>
                  <th className="px-6 py-3.5">Resource / Document</th>
                  <th className="px-6 py-3.5">Format</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Author</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-gray-500">
                      <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="font-medium">No learning materials found matching your filters.</p>
                      <Link
                        to="/upload-books"
                        className="inline-block mt-3 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800"
                      >
                        Upload First Resource
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((b, idx) => {
                    const fmt = (b.format || (b.originalFileName ? b.originalFileName.split('.').pop() : 'PDF')).toUpperCase()
                    return (
                      <tr key={b.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{b.title}</p>
                              <p className="text-xs text-gray-500">{b.size || '1.2 MB'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold border ${getFormatBadgeColor(fmt)}`}>
                            {fmt}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs font-medium text-gray-600">
                          {b.subject || 'General'}
                        </td>

                        <td className="px-6 py-4 text-xs text-gray-500">
                          {b.author || 'Instructor'}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {b.downloadUrl && (
                              <a
                                href={b.downloadUrl}
                                download={b.originalFileName || `${b.title}.${fmt.toLowerCase()}`}
                                className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Download Resource"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteBook(b)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Resource"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ManageBooks