import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, AlertCircle, StickyNote, Clock } from 'lucide-react'
import { getBookById } from '../data/booksData'
import { API_BASE_URL } from '../config'
import NotesPanel from './NotesPanel'
import { historyService } from '../services/historyService'
import { useAuth } from '../contexts/AuthContext'

const SimplePDFViewer = () => {
  const { bookId } = useParams()
  const { user } = useAuth()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const startTimeRef = useRef(Date.now())
  const trackingIntervalRef = useRef(null)
  const hasTrackedRef = useRef(false) // Prevent duplicate tracking

  useEffect(() => {
    const loadBook = async () => {
      // First, try to get book from static database
      let foundBook = getBookById(bookId)
      
      // If not found in database, check localStorage
      if (!foundBook) {
        try {
          const uploadedBooks = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
          foundBook = uploadedBooks.find(b => b.id === bookId || b.viewUrl.includes(bookId))
        } catch (error) {
          console.error('Error loading uploaded books from localStorage:', error)
        }
      }
      
      // If still not found, check server API
      if (!foundBook) {
        try {
          console.log('Searching for book on server with ID:', bookId)
          const response = await fetch(`${API_BASE_URL}/api/books`)
          if (response.ok) {
            const serverBooks = await response.json()
            console.log('Server books:', serverBooks)
            foundBook = serverBooks.find(b => b.id === bookId || b.viewUrl.includes(bookId))
            console.log('Found book on server:', foundBook)
          }
        } catch (error) {
          console.error('Error loading books from server:', error)
        }
      }
      
      // If book is S3 hosted, get fresh signed URL
      if (foundBook && foundBook.isS3Hosted && foundBook.s3Key) {
        try {
          console.log('Getting fresh signed URL for S3 book:', foundBook.s3Key)
          const urlResponse = await fetch(`${API_BASE_URL}/api/books/${foundBook.id}/signed-url`)
          if (urlResponse.ok) {
            const { signedUrl } = await urlResponse.json()
            console.log('Got fresh signed URL')
            foundBook.downloadUrl = signedUrl // Use fresh signed URL
          } else {
            console.error('Failed to get signed URL, using existing URL')
          }
        } catch (error) {
          console.error('Error getting signed URL:', error)
        }
      }
      
      console.log('Final book result:', foundBook)
      setBook(foundBook)
      setLoading(false)

      // Track book view when loaded (only once)
      if (foundBook && user && !hasTrackedRef.current) {
        hasTrackedRef.current = true // Mark as tracked
        try {
          historyService.setUser(user.email || user.id)
          await historyService.trackBookView({
            id: foundBook.id,
            title: foundBook.title,
            subject: foundBook.subject,
            class: foundBook.class,
            author: foundBook.author
          })
          console.log('📚 Book view tracked')
        } catch (error) {
          console.error('Error tracking book view:', error)
        }
      }
    }

    loadBook()
  }, [bookId]) // Remove 'user' from dependencies to prevent re-tracking

  // Track reading progress periodically
  useEffect(() => {
    if (!book || !user) return

    historyService.setUser(user.email || user.id)

    // Update progress every 30 seconds
    trackingIntervalRef.current = setInterval(async () => {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      try {
        await historyService.updateBookView(`book_${book.id}`, duration, currentPage)
        console.log('📖 Reading progress updated')
      } catch (error) {
        console.error('Error updating progress:', error)
      }
    }, 30000)

    // Cleanup on unmount
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
      }
      // Final progress update
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      historyService.updateBookView(`book_${book.id}`, duration, currentPage).catch(console.error)
    }
  }, [book, user, currentPage])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading book...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Book Not Found</h2>
          <p className="text-gray-600 mb-2">The requested book could not be found.</p>
          <p className="text-sm text-gray-500 mb-6">Book ID: {bookId}</p>
          <div className="space-y-3">
            <Link to="/guide-books" className="btn btn-primary">
              Back to Books
            </Link>
            <div className="text-xs text-gray-400">
              <p>Searched in: Static DB, LocalStorage, Server API</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = book.downloadUrl
    link.download = book.originalFileName || `${book.title}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openInNewTab = () => {
    window.open(book.downloadUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/guide-books" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{book.title}</h1>
                <p className="text-sm text-gray-600">
                  {book.author} • Class {book.class} • {book.subject}
                  {book.term && <span> • Term {book.term}</span>}
                  {book.isRealBook && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Uploaded Book
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link
                to="/book-history"
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                title="View Book History"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden md:inline">Book History</span>
              </Link>

              <button
                onClick={() => setShowNotes(!showNotes)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showNotes 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <StickyNote className="h-4 w-4" />
                <span className="hidden md:inline">Notes</span>
              </button>
              
              <button
                onClick={openInNewTab}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden md:inline">Open</span>
              </button>
              
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">Download</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Book Info */}
      <div className="container mx-auto px-6 py-6">
        <div className={`grid ${showNotes ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
          {/* Book Content Section */}
          <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Pages:</span>
              <span className="ml-2">{book.pages || 'Unknown'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Size:</span>
              <span className="ml-2">{book.size}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Format:</span>
              <span className="ml-2">{book.format}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Medium:</span>
              <span className="ml-2">{book.language}</span>
            </div>
          </div>
          
          {book.description && (
            <div className="mt-4">
              <p className="text-gray-700">{book.description}</p>
            </div>
          )}
          
          {book.originalFileName && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                <span className="font-medium">Original file:</span> {book.originalFileName}
              </p>
            </div>
          )}
          
          {book.chapters && book.chapters.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-gray-800 mb-2">Chapters:</h3>
              <div className="flex flex-wrap gap-2">
                {book.chapters.map((chapter, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {chapter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Book Preview</h3>
          
          {/* Notice for uploaded books */}
          {book.isRealBook && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800">Real Book Preview</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This is your uploaded book. If the preview doesn't load, try opening in a new tab or downloading the file.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
            <iframe
              src={`${book.downloadUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
              width="100%"
              height="100%"
              title={book.title}
              className="border-0"
              allow="fullscreen"
              onError={() => {
                console.log('PDF iframe failed to load')
              }}
            >
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Your browser does not support PDF preview.
                  </p>
                  <div className="space-x-3">
                    <button onClick={openInNewTab} className="btn btn-primary">
                      Open in New Tab
                    </button>
                    <button onClick={handleDownload} className="btn btn-secondary">
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </iframe>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-3">
              Having trouble viewing? Try opening in a new tab or downloading the file.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={openInNewTab}
                className="btn btn-secondary"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </button>
              <button
                onClick={handleDownload}
                className="btn btn-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
          </div>
          
          {/* Notes Panel */}
          {showNotes && (
            <div className="h-[calc(100vh-200px)] sticky top-6">
              <NotesPanel
                sourceType="book"
                sourceId={book.id}
                subject={book.subject}
                title={`Notes: ${book.title}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SimplePDFViewer