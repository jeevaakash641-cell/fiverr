import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ZoomIn, ZoomOut, Download, BookOpen, ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { getBookById } from '../data/booksData'

const BookViewer = () => {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [book, setBook] = useState(null)

  useEffect(() => {
    const bookData = getBookById(bookId)
    if (bookData) {
      setBook(bookData)
    } else {
      // If book not found, redirect to guide books
      navigate('/guide-books')
    }
  }, [bookId, navigate])

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">Loading Book...</h2>
          <p className="text-gray-400">Please wait while we load your book.</p>
        </div>
      </div>
    )
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50))
  }

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, book.totalPages))
  }

  const handlePageInput = (e) => {
    const page = parseInt(e.target.value)
    if (page >= 1 && page <= book.pages) {
      setCurrentPage(page)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = book.downloadUrl
    link.download = `${book.title}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link to="/guide-books" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="h-6 w-6" />
                </Link>
                <Link to="/dashboard" className="text-gray-400 hover:text-white">
                  <Home className="h-6 w-6" />
                </Link>
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-6 w-6 text-blue-400" />
                  <div>
                    <h1 className="text-lg font-semibold text-white">{book.title}</h1>
                    <p className="text-sm text-gray-400">by {book.author} • Class {book.class} • {book.subject}</p>
                  </div>
                </div>
              </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-white text-sm min-w-12 text-center">{zoomLevel}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={currentPage}
                    onChange={handlePageInput}
                    min="1"
                    max={book.pages}
                    className="w-16 px-2 py-1 bg-gray-700 text-white text-center rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-400">of {book.pages}</span>
                </div>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === book.pages}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Download Button */}
              <button 
                onClick={handleDownload}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* PDF Viewer Area */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow-lg mx-auto" style={{ 
            width: `${zoomLevel}%`, 
            maxWidth: '800px',
            minWidth: '400px'
          }}>
            {/* PDF Page Simulation */}
            <div className="aspect-[8.5/11] bg-white p-8 rounded-lg">
              <div className="h-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Page {currentPage}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {book.title}
                  </p>
                  <div className="text-left max-w-md mx-auto space-y-4 text-gray-700">
                    <p className="font-semibold text-lg">
                      {book.chapters && book.chapters[Math.floor((currentPage - 1) / 10)] || `Chapter ${Math.ceil(currentPage / 10)}`}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      {book.description}
                    </p>
                    <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                      <p className="font-semibold text-blue-800">Sample Content - Page {currentPage}</p>
                      <p className="text-blue-700 mt-2">
                        This is a demonstration of the book viewer. In a real implementation, 
                        this would display the actual PDF content using a PDF viewer library 
                        like react-pdf or pdf.js.
                      </p>
                      <p className="text-blue-700 mt-2">
                        The book "{book.title}" contains {book.pages} pages of educational content 
                        covering {book.subject} for Class {book.class} students.
                      </p>
                    </div>
                    
                    {book.chapters && (
                      <div className="mt-4">
                        <p className="font-semibold text-gray-800 mb-2">Table of Contents:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {book.chapters.slice(0, 5).map((chapter, index) => (
                            <li key={index} className="flex justify-between">
                              <span>{index + 1}. {chapter}</span>
                              <span>Page {(index + 1) * Math.floor(book.pages / book.chapters.length)}</span>
                            </li>
                          ))}
                          {book.chapters.length > 5 && (
                            <li className="text-gray-500">... and {book.chapters.length - 5} more chapters</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Page Info */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {book.subject} • Class {book.class}
          </div>
          <div className="text-sm text-gray-400">
            Page {currentPage} of {book.pages} • Zoom {zoomLevel}% • {book.type === 'textbook' ? 'Textbook' : 'Guide'}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default BookViewer