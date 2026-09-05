import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowLeft, Upload, BookOpen, X, CheckCircle, FileText, 
  LogOut, Plus, Sparkles, Layers, AlertTriangle, 
  RefreshCw, ExternalLink, FileCheck
} from 'lucide-react'
import { API_BASE_URL } from '../config'

const UploadBooks = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const handleLogout = () => { logout(); navigate('/') }

  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [generationStage, setGenerationStage] = useState('')

  // Upload Mode: 'resource' | 'generate-course'
  const [uploadMode, setUploadMode] = useState('resource')

  // Generation Settings
  const [courseTitle, setCourseTitle] = useState('')
  const [includeExtractedText, setIncludeExtractedText] = useState(true)
  const [attachOriginalDocument, setAttachOriginalDocument] = useState(true)

  // Success Result Modal for Generated Course
  const [generationResult, setGenerationResult] = useState(null)
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false)

  const [bookData, setBookData] = useState({
    title: '',
    author: '',
    subject: 'Work & Life Skills',
    level: 'General',
    type: 'guide',
    description: '',
    isbn: '',
    publisher: 'One Community Ely',
    publishYear: new Date().getFullYear().toString()
  })

  if (!user || user.userType !== 'teacher') {
    navigate('/admin-login')
    return null
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setBookData(prev => ({
      ...prev,
      [name]: value
    }))
    if (name === 'title' && (!courseTitle || courseTitle === bookData.title)) {
      setCourseTitle(value)
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    
    files.forEach(file => {
      if (file.size <= 100 * 1024 * 1024) { // 100MB limit
        const ext = file.name.substring(file.name.lastIndexOf('.')).toUpperCase().replace('.', '') || 'PDF'
        const newFile = {
          id: Date.now() + Math.random(),
          file: file,
          name: file.name,
          format: ext,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          status: 'ready',
          progress: 0
        }
        setUploadedFiles(prev => [...prev, newFile])
        
        // Auto-fill title if empty
        if (!bookData.title) {
          const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
          const cleanName = rawName.replace(/[-_]/g, ' ')
          setBookData(prev => ({
            ...prev,
            title: prev.title || cleanName
          }))
          if (!courseTitle) {
            setCourseTitle(cleanName)
          }
        }
      } else {
        alert(`File ${file.name} exceeds 100MB limit`)
      }
    })
  }

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const isGenerationSupported = () => {
    if (uploadedFiles.length !== 1) return false
    const f = uploadedFiles[0]
    const fmt = (f.format || '').toUpperCase()
    return fmt === 'PDF' || fmt === 'DOCX'
  }

  const isMultiFileOrNonDoc = () => {
    if (uploadedFiles.length > 1) return true
    if (uploadedFiles.length === 1) {
      const fmt = (uploadedFiles[0].format || '').toUpperCase()
      return fmt !== 'PDF' && fmt !== 'DOCX'
    }
    return false
  }

  const saveBookToDatabase = async (bookInfo, fileName, fileObj) => {
    try {
      const ext = fileName.substring(fileName.lastIndexOf('.')).toUpperCase().replace('.', '') || 'PDF'
      
      const bookEntry = {
        id: `${(bookInfo.subject || 'general').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        title: bookInfo.title,
        author: bookInfo.author || 'One Community Ely',
        subject: bookInfo.subject,
        class: 'All',
        type: 'guide',
        board: "One Community Ely",
        state: "All",
        medium: "both",
        language: "English",
        pages: 0,
        size: uploadedFiles.find(f => f.file?.name === fileName)?.size || "1.5 MB",
        format: ext,
        description: bookInfo.description,
        chapters: [],
        downloadUrl: fileObj ? URL.createObjectURL(fileObj) : `/api/books/download/${encodeURIComponent(fileName)}`,
        viewUrl: ext === 'PDF' ? `/book-viewer/${bookInfo.title.replace(/\s+/g, '-')}` : '#',
        thumbnail: `/images/books/general.jpg`,
        isRealBook: true,
        lastUpdated: new Date().toISOString(),
        originalFileName: fileName,
        isbn: bookInfo.isbn,
        publisher: bookInfo.publisher || 'One Community Ely',
        publishYear: bookInfo.publishYear
      }

      const existingBooks = JSON.parse(localStorage.getItem('uploadedBooks') || '[]')
      existingBooks.unshift(bookEntry)
      localStorage.setItem('uploadedBooks', JSON.stringify(existingBooks))

      return bookEntry
    } catch (error) {
      console.error('Error saving book to database:', error)
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (uploadedFiles.length === 0) {
      alert('Please select at least one document or book file to upload.')
      return
    }

    if (!bookData.title || !bookData.subject) {
      alert('Please enter the Resource Title and Category / Topic.')
      return
    }

    // --- CASE 1: Upload and Generate Draft Course Mode ---
    if (uploadMode === 'generate-course') {
      if (uploadedFiles.length !== 1) {
        alert('Automatic course generation accepts one PDF or DOCX document at a time.')
        return
      }

      const targetFile = uploadedFiles[0]
      const fmt = (targetFile.format || '').toUpperCase()
      if (fmt !== 'PDF' && fmt !== 'DOCX') {
        alert('Automatic course generation is currently available for PDF and DOCX files only.')
        return
      }

      setIsUploading(true)
      setGenerationStage('Uploading document to secure S3 storage…')

      try {
        const formData = new FormData()
        formData.append('bookFile', targetFile.file)
        formData.append('title', bookData.title)
        formData.append('courseTitle', courseTitle.trim() || bookData.title)
        formData.append('author', bookData.author || 'One Community Ely')
        formData.append('subject', bookData.subject)
        formData.append('class', 'All')
        formData.append('type', 'guide')
        formData.append('state', 'All')
        formData.append('medium', 'both')
        formData.append('language', 'English')
        formData.append('description', bookData.description)
        formData.append('isbn', bookData.isbn)
        formData.append('publisher', bookData.publisher)
        formData.append('publishYear', bookData.publishYear)
        formData.append('includeExtractedText', includeExtractedText ? 'true' : 'false')
        formData.append('attachOriginalDocument', attachOriginalDocument ? 'true' : 'false')

        const timer1 = setTimeout(() => setGenerationStage('Extracting document content and structure…'), 1200)
        const timer2 = setTimeout(() => setGenerationStage('Detecting chapters, modules and lesson sections…'), 2500)
        const timer3 = setTimeout(() => setGenerationStage('Creating draft course structure in DynamoDB…'), 4200)
        const timer4 = setTimeout(() => setGenerationStage('Generating modules and lessons with resource attachments…'), 6000)
        const timer5 = setTimeout(() => setGenerationStage('Finalising draft course curriculum…'), 8000)

        const token = localStorage.getItem('edulearn_id_token')
        const headers = {
          'x-user-email': user.email
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const res = await fetch(`${API_BASE_URL}/api/resources/generate-course`, {
          method: 'POST',
          headers,
          body: formData
        })

        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
        clearTimeout(timer5)

        const data = await res.json()

        if (!res.ok || data.success === false) {
          if (data.resourceUploaded) {
            await saveBookToDatabase(bookData, targetFile.name, targetFile.file)
            alert(data.error || 'The document was uploaded successfully, but a course could not be generated because readable text was not detected.')
            navigate('/manage-books')
            return
          }
          throw new Error(data.error || 'Failed to generate draft course')
        }

        await saveBookToDatabase(bookData, targetFile.name, targetFile.file)

        setGenerationResult({
          courseId: data.courseId,
          courseTitle: data.courseTitle || courseTitle || bookData.title,
          moduleCount: data.moduleCount || 0,
          lessonCount: data.lessonCount || 0,
          resource: data.resource || null,
          fileName: targetFile.name,
          warnings: data.warnings || []
        })

        setIsGenerationModalOpen(true)
      } catch (err) {
        console.error('Course generation error:', err)
        alert('Course generation notice: ' + err.message)
      } finally {
        setIsUploading(false)
        setGenerationStage('')
      }
      return
    }

    // --- CASE 2: Normal Upload Mode (Resource Library) ---
    setIsUploading(true)

    try {
      for (let fileData of uploadedFiles) {
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? { ...f, status: 'uploading' } : f)
        )

        const formData = new FormData()
        formData.append('bookFile', fileData.file)
        formData.append('title', bookData.title)
        formData.append('author', bookData.author || 'One Community Ely')
        formData.append('subject', bookData.subject)
        formData.append('class', 'All')
        formData.append('type', 'guide')
        formData.append('state', 'All')
        formData.append('medium', 'both')
        formData.append('language', 'English')
        formData.append('description', bookData.description)
        formData.append('isbn', bookData.isbn)
        formData.append('publisher', bookData.publisher)
        formData.append('publishYear', bookData.publishYear)
        formData.append('uploadedBy', user.email)
        formData.append('userType', user.userType)

        try {
          const token = localStorage.getItem('edulearn_id_token')
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
          await fetch(`${API_BASE_URL}/api/upload-book`, {
            method: 'POST',
            headers,
            body: formData
          })
        } catch (serverErr) {
          console.warn('Server upload notice (saved locally):', serverErr)
        }

        await saveBookToDatabase(bookData, fileData.name, fileData.file)

        setUploadedFiles(prev => 
          prev.map(f => f.id === fileData.id ? { ...f, status: 'completed', progress: 100 } : f)
        )
      }

      setIsUploading(false)
      alert(`Successfully uploaded resource! Redirecting to Manage Books...`)
      navigate('/manage-books')
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error uploading resource: ' + error.message)
      setIsUploading(false)
      setUploadedFiles(prev => 
        prev.map(f => ({ ...f, status: 'ready', progress: 0 }))
      )
    }
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
                  Upload Learning Resources
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                    Resource Creator
                  </span>
                </h1>
                <p className="text-xs text-gray-500">Upload books and materials in all formats for learners</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                to="/admin/courses"
                className="flex items-center space-x-2 px-4 py-2 bg-[#23735F] text-white rounded-lg hover:bg-[#1b5c4c] transition-colors text-sm font-semibold shadow-sm"
              >
                <BookOpen className="h-4 w-4" />
                <span>Manage Courses</span>
              </Link>
              <Link
                to="/manage-books"
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm font-semibold shadow-sm"
              >
                <BookOpen className="h-4 w-4" />
                <span>Manage Books</span>
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
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-4xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resource Details Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Resource Details & Metadata
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="form-group">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Resource Title *</label>
                <input
                  type="text"
                  name="title"
                  value={bookData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Workplace Communication Skills"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
                  required
                />
              </div>

              <div className="form-group">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Author / Instructor</label>
                <input
                  type="text"
                  name="author"
                  value={bookData.author}
                  onChange={handleInputChange}
                  placeholder="e.g. One Community Ely Training Team"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <div className="form-group">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category / Topic *</label>
                <input
                  type="text"
                  name="subject"
                  value={bookData.subject}
                  onChange={handleInputChange}
                  placeholder="e.g. Work & Life Skills, Digital Skills, AI..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
                  required
                />
              </div>

              <div className="form-group">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Publisher / Source</label>
                <input
                  type="text"
                  name="publisher"
                  value={bookData.publisher}
                  onChange={handleInputChange}
                  placeholder="One Community Ely"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
            </div>

            <div className="form-group mt-5">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
              <textarea
                name="description"
                value={bookData.description}
                onChange={handleInputChange}
                placeholder="Brief overview of the material for learners..."
                rows="2"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* File Upload Dropzone Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              Upload Files (All Formats Supported)
            </h2>
            
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/30 rounded-xl p-7 text-center hover:border-emerald-500 hover:bg-emerald-50/60 transition-all">
              <Upload className="h-9 w-9 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-800 mb-1">
                Drag & drop files here, or click to browse
              </h3>
              <p className="text-gray-500 mb-3 text-xs">
                Supports: <strong>PDF, Word (DOC/DOCX), Images (PNG/JPG/WEBP/GIF), Text (TXT/MD), eBooks (EPUB), PPT/PPTX, CSV, XLSX</strong>. Up to 100MB per file.
              </p>
              <input
                type="file"
                multiple={uploadMode !== 'generate-course'}
                accept=".pdf,.doc,.docx,.txt,.epub,.ppt,.pptx,.rtf,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.ico"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg cursor-pointer inline-block text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
              >
                Choose Files
              </label>
            </div>

            {/* Uploaded Files Queue */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-xs font-bold uppercase text-gray-600">Selected Files ({uploadedFiles.length}):</h3>
                {uploadedFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="p-2 rounded bg-emerald-100 text-emerald-700 flex-shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">{file.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getFormatBadgeColor(file.format)}`}>
                            {file.format}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{file.size}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      {file.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- UPLOAD MODE SELECTOR --- */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                How would you like to use this document?
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose whether to save as a standard resource or automatically extract structured course curriculum.
              </p>
            </div>

            {isMultiFileOrNonDoc() && uploadMode === 'generate-course' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>Automatic course generation is currently available for 1 PDF or DOCX file only.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Normal Resource Upload (Default) */}
              <div
                onClick={() => setUploadMode('resource')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                  uploadMode === 'resource'
                    ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="uploadModeRadio"
                  checked={uploadMode === 'resource'}
                  onChange={() => setUploadMode('resource')}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-emerald-700" />
                    <span>Upload as Learning Resource</span>
                    <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-semibold">Default</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Save the complete file in the Resource Library so it can be opened, downloaded or attached to lessons.
                  </p>
                </div>
              </div>

              {/* Option 2: Upload and Generate Draft Course */}
              <div
                onClick={() => {
                  if (uploadedFiles.length > 1) {
                    alert('Automatic course generation accepts a single PDF or DOCX document at a time.')
                    return
                  }
                  if (uploadedFiles.length === 1 && !isGenerationSupported()) {
                    alert('Automatic course generation is currently available for PDF and DOCX files only.')
                    return
                  }
                  setUploadMode('generate-course')
                }}
                className={`p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 ${
                  uploadMode === 'generate-course'
                    ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500'
                    : isMultiFileOrNonDoc()
                    ? 'border-gray-200 bg-gray-50/60 opacity-70 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="uploadModeRadio"
                  checked={uploadMode === 'generate-course'}
                  disabled={isMultiFileOrNonDoc()}
                  onChange={() => setUploadMode('generate-course')}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span>Upload and Generate Draft Course</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Analyse a PDF or DOCX and automatically create a suggested draft course with modules and lessons.
                  </p>
                  {isMultiFileOrNonDoc() && (
                    <p className="text-[11px] text-amber-700 mt-1.5 font-medium">
                      Select a single PDF or DOCX file to enable generation.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* --- GENERATION SETTINGS SECTION --- */}
            {uploadMode === 'generate-course' && (
              <div className="mt-4 p-4.5 bg-gradient-to-r from-gray-50 to-slate-50 border border-emerald-200 rounded-xl space-y-4 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Draft Course Generation Settings
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Workplace Communication Skills"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">Pre-filled from Resource Title. You can customize the course title before generating.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Generation Method
                  </label>
                  <div className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    <span>Automatic — Detect headings, chapters and sections</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-gray-200/80">
                  <label className="flex items-center space-x-2.5 text-xs text-gray-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeExtractedText}
                      onChange={(e) => setIncludeExtractedText(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span>Include extracted section text in generated lessons</span>
                  </label>

                  <label className="flex items-center space-x-2.5 text-xs text-gray-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachOriginalDocument}
                      onChange={(e) => setAttachOriginalDocument(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span>Attach the original document to generated lessons</span>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Actions & Progress Indicator */}
            {isUploading && generationStage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-fade-in">
                <div className="flex items-center gap-2.5 text-emerald-900 text-xs font-bold">
                  <RefreshCw className="h-4 w-4 text-emerald-600 animate-spin" />
                  <span>{generationStage}</span>
                </div>
                <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-2/3 animate-pulse"></div>
                </div>
                <p className="text-[11px] text-emerald-700">Please do not close this window while the document is being processed.</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUploading || uploadedFiles.length === 0}
                className="px-6 py-2.5 bg-[#23735F] hover:bg-[#1b5c4c] text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : uploadMode === 'generate-course' ? (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>Upload & Generate Draft Course</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>{uploadedFiles.length <= 1 ? 'Upload Resource' : `Upload ${uploadedFiles.length} Resources`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* --- SUCCESS MODAL: DRAFT COURSE GENERATED --- */}
      {isGenerationModalOpen && generationResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white text-center">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                <CheckCircle className="h-6 w-6 text-emerald-300" />
              </div>
              <h3 className="text-lg font-bold">Draft Course Generated Successfully</h3>
              <p className="text-xs text-emerald-100/80 mt-1">
                Your document has been saved to the Resource Library and a draft course curriculum was created.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Course Title</div>
                <div className="text-base font-bold text-gray-900">{generationResult.courseTitle}</div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 text-xs">
                  <div>
                    <span className="text-gray-500 block">Modules Created:</span>
                    <span className="font-bold text-emerald-800">{generationResult.moduleCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Lessons Created:</span>
                    <span className="font-bold text-emerald-800">{generationResult.lessonCount}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 text-xs text-gray-600">
                  <span className="text-gray-500 block">Source Document:</span>
                  <span className="font-medium text-gray-800 truncate block">{generationResult.fileName}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <strong>Draft Status Notice:</strong> Nothing is published automatically. You can review, rename, modify lessons, and publish when ready.
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-2">
              <Link
                to={`/admin/courses/${generationResult.courseId}/content`}
                className="w-full py-2.5 px-4 bg-[#23735F] hover:bg-[#1b5c4c] text-white rounded-xl text-xs font-bold text-center transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Review Generated Course in Course Builder</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <Link
                  to="/manage-books"
                  className="py-2 px-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold text-center transition-colors"
                >
                  Return to Manage Resources
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsGenerationModalOpen(false)
                    setUploadedFiles([])
                  }}
                  className="py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold text-center transition-colors"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadBooks