import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, BookOpen, Download, Eye, Search, Filter, Book, StickyNote, Clock } from 'lucide-react'
// Books are loaded from server API and localStorage only
import { API_BASE_URL } from '../config'
import NotesPanel from './NotesPanel'

const GuideBooks = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [books, setBooks] = useState([])
  const [showNotes, setShowNotes] = useState(false)

  // Version check - if you see this in console, the new code is loaded
  console.log('🔄 GuideBooks v2.0 - Tamil books support enabled')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const loadBooks = async () => {
      // Load books from server API
      const loadBooksFromServer = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/books`)
          if (response.ok) {
            const serverBooks = await response.json()
            console.log('📚 Server returned books:', serverBooks.length)
            console.log('📚 Books by subject:', serverBooks.reduce((acc, book) => {
              acc[book.subject] = (acc[book.subject] || 0) + 1
              return acc
            }, {}))
            console.log('Loaded books from server:', serverBooks.length)
            return serverBooks
          }
        } catch (error) {
          console.error('Error loading books from server:', error)
        }
        return []
      }

      // Load uploaded books from server
      const serverBooks = await loadBooksFromServer()
      
      // Start with empty array - we'll load from server and localStorage only
      let availableBooks = []
      
      // Filter server books based on user preferences
      const filteredServerBooks = serverBooks.filter(book => {
        const matchesState = !user.selectedState || book.state === user.selectedState
        const matchesClass = !user.class || book.class === user.class.toString()
        
        // Enhanced medium matching logic
        let matchesMedium = true
        if (user.selectedMedium && book.medium) {
          const userMedium = user.selectedMedium.toLowerCase()
          const bookMedium = book.medium.toLowerCase()
          const userMediumName = (user.mediumName || '').toLowerCase()
          const bookLanguage = (book.language || '').toLowerCase()
          
          if (userMedium === bookMedium) {
            matchesMedium = true
          } else if (userMedium === 'state' && (bookMedium === 'state' || bookMedium === 'hindi' || bookMedium.includes('hindi') || bookMedium.includes('telugu'))) {
            matchesMedium = true
          } else if (userMediumName && bookLanguage && userMediumName === bookLanguage) {
            // Match by language name (e.g., user medium name "Telugu" matches book language "Telugu")
            matchesMedium = true
          } else if (userMediumName && bookMedium === 'state' && (bookLanguage.includes(userMediumName) || userMediumName.includes(bookLanguage))) {
            // State medium books match user's language preference
            matchesMedium = true
          } else if (userMedium === 'english' && (bookMedium === 'english' || bookMedium.includes('english'))) {
            matchesMedium = true
          } else if (bookMedium === 'both') {
            // Books with medium "both" should appear for ALL medium selections
            matchesMedium = true
          } else if (!user.selectedMedium) {
            matchesMedium = true
          } else {
            matchesMedium = false
          }
        }
        
        // IMPORTANT: Mother tongue books (Tamil) should ALWAYS be shown regardless of subject selection
        // Check if this is a mother tongue book
        const isMotherTongue = book.isMotherTongue === true || book.subject === 'Tamil'
        
        // Show ALL books for the user's class, state, and medium
        // Don't filter by subjects - let users see all available books
        const matchesSubjects = true  // Always true - show all books
        
        console.log('Book filter debug:', {
          bookTitle: book.title,
          bookState: book.state,
          bookClass: book.class,
          bookSubject: book.subject,
          bookMedium: book.medium,
          isMotherTongue: isMotherTongue,
          userState: user.selectedState,
          userMedium: user.selectedMedium,
          userClass: user.class,
          userSubjects: user.subjects,
          matchesState,
          matchesClass,
          matchesMedium,
          matchesSubjects,
          finalResult: matchesState && matchesClass && matchesMedium && matchesSubjects
        })
        
        return matchesState && matchesClass && matchesMedium && matchesSubjects
      })

      // Load uploaded books from localStorage (legacy support)
      try {
        const uploadedBooks = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
        console.log('=== BOOK FILTERING DEBUG ===')
        console.log('User profile:', {
          selectedState: user.selectedState,
          selectedMedium: user.selectedMedium,
          mediumName: user.mediumName,
          stateLanguage: user.stateLanguage,
          class: user.class,
          subjects: user.subjects,
          userType: user.userType
        })
        console.log('Total uploaded books:', uploadedBooks.length)
        console.log('Server books:', serverBooks.length)
        console.log('Filtered server books:', filteredServerBooks.length)
        
        // Show all uploaded books in detail
        uploadedBooks.forEach((book, index) => {
          console.log(`LocalStorage Book ${index + 1}:`, book)
        })
        
        filteredServerBooks.forEach((book, index) => {
          console.log(`Server Book ${index + 1}:`, book)
        })
        
        console.log('=== FILTERING RESULTS ===')
        
        const filteredUploadedBooks = uploadedBooks.filter(book => {
          const matchesState = !user.selectedState || book.state === user.selectedState
          const matchesClass = !user.class || book.class === user.class.toString()
          
          // Enhanced medium matching logic
          let matchesMedium = true
          if (user.selectedMedium && book.medium) {
            // Handle different medium formats
            const userMedium = user.selectedMedium.toLowerCase()
            const bookMedium = book.medium.toLowerCase()
            
            // Check for direct match
            if (userMedium === bookMedium) {
              matchesMedium = true
            }
            // Check for state language match (Hindi Medium = state for Hindi states)
            else if (userMedium === 'state' && (bookMedium === 'state' || bookMedium === 'hindi' || bookMedium.includes('hindi'))) {
              matchesMedium = true
            }
            // Check for English medium match
            else if (userMedium === 'english' && (bookMedium === 'english' || bookMedium.includes('english'))) {
              matchesMedium = true
            }
            // Check for 'both' medium books - should appear for ALL medium selections
            else if (bookMedium === 'both') {
              matchesMedium = true
            }
            // If user has no medium preference, show all
            else if (!user.selectedMedium) {
              matchesMedium = true
            }
            else {
              matchesMedium = false
            }
          }
          
          // IMPORTANT: Mother tongue books should ALWAYS be shown
          const isMotherTongue = book.isMotherTongue === true || book.subject === 'Tamil'
          
          // Show ALL books for the user's class, state, and medium
          // Don't filter by subjects - let users see all available books
          const matchesSubjects = true  // Always true - show all books
          
          console.log('Book filtering:', {
            bookTitle: book.title,
            bookState: book.state,
            bookMedium: book.medium,
            bookClass: book.class,
            isMotherTongue: isMotherTongue,
            userState: user.selectedState,
            userMedium: user.selectedMedium,
            userClass: user.class,
            matchesState,
            matchesMedium,
            matchesClass,
            matchesSubjects,
            finalMatch: matchesState && matchesClass && matchesMedium && matchesSubjects
          })
          
          return matchesState && matchesClass && matchesMedium && matchesSubjects
        })
        
        console.log('Filtered uploaded books:', filteredUploadedBooks.length)
        
        // Read deleted IDs tracker from localStorage
        const deletedIds = new Set(JSON.parse(localStorage.getItem('deletedBookIds') || '[]'))

        // Combine uploaded books and server books without duplicates or deleted items
        const combined = []
        const seen = new Set()

        const addIfValid = (book) => {
          if (!book) return
          const id = book.id || book.key || book.title
          // Check if marked as deleted
          if (
            (book.id && deletedIds.has(book.id)) ||
            (book.key && deletedIds.has(book.key)) ||
            (book.title && deletedIds.has(book.title))
          ) {
            return
          }
          if (id && !seen.has(id)) {
            seen.add(id)
            combined.push(book)
          }
        }

        filteredUploadedBooks.forEach(addIfValid)
        filteredServerBooks.forEach(addIfValid)

        availableBooks = combined
      } catch (error) {
        console.error('Error loading uploaded books:', error)
        const deletedIds = new Set(JSON.parse(localStorage.getItem('deletedBookIds') || '[]'))
        availableBooks = filteredServerBooks.filter(b => 
          !deletedIds.has(b.id) && !deletedIds.has(b.key) && !deletedIds.has(b.title)
        )
      }
      
      console.log('✅ Final books to display:', availableBooks.length)
      console.log('✅ Books by subject:', availableBooks.reduce((acc, book) => {
        acc[book.subject] = (acc[book.subject] || 0) + 1
        return acc
      }, {}))
      console.log('✅ All book titles:', availableBooks.map(b => `${b.title} (${b.subject})`))
      
      // Sort books by order field (curriculum order)
      availableBooks.sort((a, b) => {
        const orderA = a.order || 999
        const orderB = b.order || 999
        return orderA - orderB
      })
      
      setBooks(availableBooks)
    }

    loadBooks()
  }, [user, navigate])

  const categories = [
    { id: 'all', name: 'All Books' },
    { id: 'textbook', name: 'Textbooks' },
    { id: 'guide', name: 'Reference Guides' },
    { id: 'practice', name: 'Practice Books' }
  ]

  // Get unique subjects from available books
  const uniqueSubjects = [...new Set(books.map(book => book.subject))].sort()
  const subjects = [
    { id: 'all', name: 'All Subjects' },
    ...uniqueSubjects.map(s => ({ id: s, name: s }))
  ]

  // Filter books based on search and filters
  const filteredBooks = books.filter(book => {
    const matchesSearch = !searchTerm || 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || book.type === selectedCategory
    const matchesSubject = selectedSubject === 'all' || book.subject === selectedSubject
    
    return matchesSearch && matchesCategory && matchesSubject
  })

  const handleDownload = async (book) => {
    try {
      console.log('📥 Downloading book:', book.title)
      
      // If book has a direct download URL (local upload or blob)
      if (book.downloadUrl && !book.key) {
        const link = document.createElement('a')
        link.href = book.downloadUrl
        const ext = book.format ? `.${book.format.toLowerCase()}` : '.pdf'
        link.download = book.originalFileName || `${book.title}${ext}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      // Get presigned URL from backend
      const apiUrl = `${API_BASE_URL}/api/books/${encodeURIComponent(book.key || book.id)}`
      console.log('📥 Fetching from:', apiUrl)
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        if (book.downloadUrl) {
          window.open(book.downloadUrl, '_blank')
          return
        }
        throw new Error('Failed to get download URL')
      }
      
      const data = await response.json()
      const presignedUrl = data.url
      
      const link = document.createElement('a')
      link.href = presignedUrl
      link.download = book.originalFileName || `${book.title}.pdf`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('❌ Download error:', error)
      if (book.downloadUrl) {
        window.open(book.downloadUrl, '_blank')
      } else {
        alert('Failed to download book: ' + error.message)
      }
    }
  }

  const handleView = async (book) => {
    try {
      console.log('👁️ Viewing book:', book.title)
      
      if (book.downloadUrl && !book.key) {
        window.open(book.downloadUrl, '_blank')
        return
      }

      // Get presigned URL from backend
      const response = await fetch(`${API_BASE_URL}/api/books/${encodeURIComponent(book.key || book.id)}`)
      if (!response.ok) {
        if (book.downloadUrl) {
          window.open(book.downloadUrl, '_blank')
          return
        }
        throw new Error('Failed to get book URL')
      }
      
      const data = await response.json()
      const viewUrl = data.url
      window.open(viewUrl, '_blank')
    } catch (error) {
      console.error('❌ View error:', error)
      if (book.downloadUrl) {
        window.open(book.downloadUrl, '_blank')
      } else {
        alert('Failed to open book: ' + error.message)
      }
    }
  }

  // Component to render individual book card
  const BookCard = ({ book }) => (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Book Thumbnail */}
      <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-10"></div>
        <div className="text-center z-10">
          <BookOpen className="h-16 w-16 text-indigo-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-indigo-700 bg-white bg-opacity-80 px-2 py-1 rounded">
            {book.subject}
          </div>
        </div>
        {/* Show uploaded badge for user-uploaded books */}
        {book.isRealBook && book.originalFileName && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            Uploaded
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">{book.title}</h3>
          <p className="text-sm text-gray-600">by {book.author}</p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            book.type === 'textbook' ? 'bg-blue-100 text-blue-700' :
            book.type === 'guide' ? 'bg-green-100 text-green-700' :
            'bg-purple-100 text-purple-700'
          }`}>
            {book.type === 'textbook' ? 'Textbook' : 
             book.type === 'guide' ? 'Guide' : 'Practice'}
          </span>
          <span className="text-gray-500">Class {book.class}</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            {book.board || 'State Board'}
          </span>
        </div>

        {/* Show term if available */}
        {book.term && (
          <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded inline-block">
            Term {book.term}
          </div>
        )}

        <p className="text-sm text-gray-600 line-clamp-3">{book.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <span>{book.pages || 'Unknown'} pages</span>
          <span>{book.size}</span>
          <span>{book.format}</span>
        </div>

        {/* Chapters Preview */}
        {book.chapters && book.chapters.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="font-medium">Chapters: </span>
            <span>{book.chapters.slice(0, 2).join(', ')}</span>
            {book.chapters.length > 2 && <span> +{book.chapters.length - 2} more</span>}
          </div>
        )}

        {/* Publisher and Year info for uploaded books */}
        {(book.publisher || book.publishYear) && (
          <div className="text-xs text-gray-500">
            {book.publisher && <span className="font-medium">Publisher: </span>}
            {book.publisher && <span>{book.publisher}</span>}
            {book.publisher && book.publishYear && <span> • </span>}
            {book.publishYear && <span>{book.publishYear}</span>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => handleView(book)}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>View</span>
          </button>
          
          <button
            onClick={() => handleDownload(book)}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  )

  if (!user) {
    return null
  }

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
              <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-800">Guide Books & Textbooks</h1>
                <p className="text-xs md:text-sm text-gray-600">Access your study materials</p>
              </div>
            </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                to="/book-history"
                className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                title="View Book History"
              >
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden md:inline">Book History</span>
              </Link>
              <button
                onClick={() => setShowNotes(!showNotes)}
                className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors ${
                  showNotes 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Study Notes"
              >
                <StickyNote className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden md:inline">Notes</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className={`grid ${showNotes ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
          {/* Books Section */}
          <div className={showNotes ? 'lg:col-span-2' : 'col-span-1'}>
        {/* Search and Filter */}
        <div className="flex flex-col lg:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search books, subjects, or authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 sm:flex-none px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm md:text-base"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Book className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex-1 sm:flex-none px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm md:text-base"
              >
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Books Count */}
        <div className="mb-4 md:mb-6">
          <p className="text-sm md:text-base text-gray-600">
            Showing {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} 
            {user.class && ` for Class ${user.class}`}
            {user.board && ` (${user.board})`}
            {user.selectedState && ` - ${user.selectedState}`}
            {user.mediumName && ` - ${user.mediumName}`}
          </p>
        </div>

        {/* Books Display with Term Grouping */}
        {(() => {
          // Group books by term if they have term information
          const termBooks = {}
          const nonTermBooks = []
          
          filteredBooks.forEach(book => {
            if (book.term) {
              if (!termBooks[book.term]) {
                termBooks[book.term] = []
              }
              termBooks[book.term].push(book)
            } else {
              nonTermBooks.push(book)
            }
          })
          
          const hasTermBooks = Object.keys(termBooks).length > 0
          
          return (
            <div>
              {/* Term-based grouping */}
              {hasTermBooks && Object.keys(termBooks).sort((a, b) => parseInt(a) - parseInt(b)).map(term => (
                <div key={`term-${term}`} className="mb-6 md:mb-8">
                  <div className="flex items-center mb-3 md:mb-4">
                    <div className="bg-indigo-100 text-indigo-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold">
                      Term {term}
                    </div>
                    <div className="ml-2 md:ml-3 text-xs md:text-sm text-gray-600">
                      {termBooks[term].length} book{termBooks[term].length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {termBooks[term].map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Non-term books */}
              {nonTermBooks.length > 0 && (
                <div className={hasTermBooks ? "mt-6 md:mt-8" : ""}>
                  {hasTermBooks && (
                    <div className="flex items-center mb-3 md:mb-4">
                      <div className="bg-gray-100 text-gray-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold">
                        Other Books
                      </div>
                      <div className="ml-2 md:ml-3 text-xs md:text-sm text-gray-600">
                        {nonTermBooks.length} book{nonTermBooks.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {nonTermBooks.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* No Results */}
        {filteredBooks.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No books found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No books available for your subjects'}
            </p>
          </div>
        )}

        {/* Upload Section for Teachers */}
        {user.userType === 'teacher' && (
          <div className="mt-12 card bg-blue-50 border-2 border-dashed border-blue-300">
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Manage Your Books</h3>
              <p className="text-blue-600 mb-4">Upload new books or manage existing ones</p>
              <div className="flex justify-center space-x-4">
                <Link to="/upload-books" className="btn btn-primary">
                  Upload Books
                </Link>
                <Link to="/manage-books" className="btn btn-secondary">
                  Manage Books
                </Link>
              </div>
            </div>
          </div>
        )}
          </div>
          
          {/* Notes Panel */}
          {showNotes && (
            <div className="lg:col-span-1">
              <div className="sticky top-6 h-[calc(100vh-120px)]">
                <NotesPanel
                  sourceType="general"
                  sourceId="books-section"
                  subject={selectedSubject !== 'all' ? selectedSubject : 'General'}
                  title="Study Notes"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default GuideBooks