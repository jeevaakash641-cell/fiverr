import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, FileText, Video, Award } from 'lucide-react'

const SubjectPage = () => {
  const { subjectName } = useParams()
  const displayName = subjectName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  // Sample chapters data
  const chapters = [
    { id: 1, title: 'Introduction to Basics', progress: 100, videos: 5, notes: 3 },
    { id: 2, title: 'Fundamental Concepts', progress: 80, videos: 7, notes: 4 },
    { id: 3, title: 'Advanced Topics', progress: 60, videos: 6, notes: 5 },
    { id: 4, title: 'Practical Applications', progress: 40, videos: 8, notes: 3 },
    { id: 5, title: 'Problem Solving', progress: 20, videos: 4, notes: 2 },
    { id: 6, title: 'Review and Assessment', progress: 0, videos: 3, notes: 1 }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="flex items-center space-x-3">
              <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{displayName}</h1>
                <p className="text-sm text-gray-600">Complete course content</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Subject Overview */}
        <div className="grid-2 mb-8">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Course Progress</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
                <div>
                  <div className="font-semibold text-green-600">3</div>
                  <div className="text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="font-semibold text-yellow-600">2</div>
                  <div className="text-gray-600">In Progress</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-600">1</div>
                  <div className="text-gray-600">Not Started</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/ai-assistant" className="btn btn-primary w-full flex items-center justify-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Ask AI Assistant</span>
              </Link>
              <Link to={`/quiz/${subjectName}`} className="btn btn-secondary w-full flex items-center justify-center space-x-2">
                <Award className="h-4 w-4" />
                <span>Take Quiz</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Chapters</h2>
          <div className="space-y-4">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">
                      Chapter {chapter.id}: {chapter.title}
                    </h3>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Video className="h-4 w-4" />
                        <span>{chapter.videos} Videos</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{chapter.notes} Notes</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{chapter.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              chapter.progress === 100 ? 'bg-green-500' :
                              chapter.progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${chapter.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <button className="btn btn-primary">
                        {chapter.progress === 0 ? 'Start' : 
                         chapter.progress === 100 ? 'Review' : 'Continue'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guide Books Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Guide Books & References</h2>
          <div className="grid-3">
            <Link to="/guide-books" className="card text-center">
              <div className="w-16 h-20 bg-blue-100 rounded mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Textbook</h3>
              <p className="text-sm text-gray-600 mb-4">Official curriculum textbook</p>
              <div className="btn btn-secondary w-full">View</div>
            </Link>
            
            <Link to="/guide-books" className="card text-center">
              <div className="w-16 h-20 bg-green-100 rounded mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Reference Guide</h3>
              <p className="text-sm text-gray-600 mb-4">Additional study materials</p>
              <div className="btn btn-secondary w-full">View</div>
            </Link>
            
            <Link to="/guide-books" className="card text-center">
              <div className="w-16 h-20 bg-purple-100 rounded mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Practice Book</h3>
              <p className="text-sm text-gray-600 mb-4">Exercises and problems</p>
              <div className="btn btn-secondary w-full">View</div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default SubjectPage