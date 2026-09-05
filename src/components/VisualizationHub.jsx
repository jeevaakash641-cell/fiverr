import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import MathVisualizer from './MathVisualizer'
import ScienceVisualizer from './ScienceVisualizer'
import { 
  Calculator, 
  Atom, 
  Globe, 
  BookOpen, 
  Code, 
  TrendingUp,
  Play,
  Eye,
  Download,
  Share2,
  ArrowLeft,
  Sparkles,
  Zap,
  Star
} from 'lucide-react'

const VisualizationHub = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeSubject, setActiveSubject] = useState('mathematics')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [hoveredSubject, setHoveredSubject] = useState(null)
  const [viewCount, setViewCount] = useState(0)

  useEffect(() => {
    // Animate view count on mount
    let count = 0
    const interval = setInterval(() => {
      count += 5
      setViewCount(count)
      if (count >= 50) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const visualizationSubjects = {
    mathematics: {
      icon: Calculator,
      title: 'Mathematics',
      color: 'blue',
      topics: [
        'Algebra - Quadratic Equations',
        'Geometry - Triangles and Circles', 
        'Calculus - Derivatives and Integrals',
        'Statistics - Data Analysis',
        'Trigonometry - Sine and Cosine',
        'Probability - Random Events'
      ],
      component: MathVisualizer
    },
    physics: {
      icon: Atom,
      title: 'Physics',
      color: 'purple',
      topics: [
        'Motion - Projectile and Circular',
        'Forces - Newton\'s Laws',
        'Energy - Kinetic and Potential',
        'Waves - Sound and Light',
        'Electricity - Circuits and Fields',
        'Magnetism - Magnetic Fields'
      ],
      component: ScienceVisualizer
    },
    chemistry: {
      icon: Atom,
      title: 'Chemistry',
      color: 'green',
      topics: [
        'Molecules - Structure and Bonding',
        'Reactions - Chemical Equations',
        'Acids and Bases - pH Scale',
        'Periodic Table - Element Properties',
        'Organic Chemistry - Carbon Compounds',
        'States of Matter - Solid, Liquid, Gas'
      ],
      component: ScienceVisualizer
    },
    biology: {
      icon: Globe,
      title: 'Biology',
      color: 'emerald',
      topics: [
        'Cells - Structure and Function',
        'Photosynthesis - Energy Conversion',
        'DNA - Genetic Information',
        'Evolution - Natural Selection',
        'Ecosystems - Food Chains',
        'Human Body - Organ Systems'
      ],
      component: ScienceVisualizer
    },
    geography: {
      icon: Globe,
      title: 'Geography',
      color: 'cyan',
      topics: [
        'Earth Structure - Layers and Plates',
        'Climate - Weather Patterns',
        'Rivers - Water Cycle',
        'Mountains - Formation Process',
        'Population - Demographics',
        'Resources - Natural Distribution'
      ],
      component: null // Will create later
    },
    computerScience: {
      icon: Code,
      title: 'Computer Science',
      color: 'indigo',
      topics: [
        'Algorithms - Sorting and Searching',
        'Data Structures - Arrays and Trees',
        'Programming - Logic Flow',
        'Networks - Internet Protocols',
        'Databases - Data Organization',
        'AI - Machine Learning Basics'
      ],
      component: null // Will create later
    }
  }

  const getSubjectColor = (subject, type = 'bg') => {
    const color = visualizationSubjects[subject]?.color || 'gray'
    const colorMap = {
      bg: {
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        green: 'bg-green-500',
        emerald: 'bg-emerald-500',
        cyan: 'bg-cyan-500',
        indigo: 'bg-indigo-500',
        gray: 'bg-gray-500'
      },
      border: {
        blue: 'border-blue-500',
        purple: 'border-purple-500',
        green: 'border-green-500',
        emerald: 'border-emerald-500',
        cyan: 'border-cyan-500',
        indigo: 'border-indigo-500',
        gray: 'border-gray-500'
      },
      text: {
        blue: 'text-blue-700',
        purple: 'text-purple-700',
        green: 'text-green-700',
        emerald: 'text-emerald-700',
        cyan: 'text-cyan-700',
        indigo: 'text-indigo-700',
        gray: 'text-gray-700'
      }
    }
    return colorMap[type][color]
  }

  const renderVisualization = () => {
    const subject = visualizationSubjects[activeSubject]
    if (!subject?.component) {
      return (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-gray-400 mb-4">
            <subject.icon className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">
            {subject.title} Visualizations
          </h3>
          <p className="text-gray-700 font-semibold mb-4">
            Interactive visualizations for {subject.title} are coming soon!
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-semibold text-sm">
              🚧 We're working on amazing visual learning tools for {subject.title}. 
              Check back soon for interactive simulations and demonstrations!
            </p>
          </div>
        </div>
      )
    }

    const VisualizationComponent = subject.component
    return (
      <VisualizationComponent 
        subject={activeSubject}
        topic={selectedTopic}
      />
    )
  }

  const availableSubjects = user?.subjects || Object.keys(visualizationSubjects)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-3 md:p-4">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Enhanced Header with Gradient */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-4 md:p-6 mb-4 md:mb-6 transform hover:scale-[1.01] transition-all duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 md:space-x-4 w-full md:w-auto">
              <button
                onClick={() => navigate('/dashboard')}
                className="group flex items-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 flex-shrink-0 shadow-md hover:shadow-lg transform hover:-translate-x-1"
              >
                <ArrowLeft className="h-4 w-4 group-hover:animate-pulse" />
                <span className="text-sm md:text-base font-medium">Back</span>
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
                    Interactive Learning Visualizations
                  </h1>
                  <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
                </div>
                <p className="text-sm md:text-base text-gray-700 font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  Explore concepts through interactive animations and visual demonstrations
                </p>
              </div>
            </div>
            <div className="flex space-x-2 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 text-sm md:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <Share2 className="h-4 w-4" />
                <span className="font-medium">Share</span>
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 text-sm md:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                <Download className="h-4 w-4" />
                <span className="font-medium">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Subject Navigation with 3D Effect */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <h2 className="text-lg md:text-xl font-extrabold text-gray-900">Choose Subject</h2>
            <Star className="h-5 w-5 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {Object.entries(visualizationSubjects).map(([key, subject]) => {
              const Icon = subject.icon
              const isActive = activeSubject === key
              const isHovered = hoveredSubject === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveSubject(key)
                    setSelectedTopic('')
                  }}
                  onMouseEnter={() => setHoveredSubject(key)}
                  onMouseLeave={() => setHoveredSubject(null)}
                  className={`group relative p-4 rounded-xl border-2 transition-all duration-300 transform ${
                    isActive
                      ? `${getSubjectColor(key, 'border')} bg-gradient-to-br from-white to-${subject.color}-50 shadow-lg scale-105`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:scale-105'
                  }`}
                  style={{
                    transform: isHovered ? 'translateY(-4px) rotateX(5deg)' : '',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl animate-pulse"></div>
                  )}
                  <Icon className={`h-8 w-8 mx-auto mb-2 transition-all duration-300 ${
                    isActive ? `${getSubjectColor(key, 'text')} scale-110 drop-shadow-md` : 'text-gray-700 group-hover:scale-110'
                  }`} />
                  <div className={`font-bold text-sm transition-colors ${
                    isActive ? getSubjectColor(key, 'text') : 'text-gray-900'
                  }`}>
                    {subject.title}
                  </div>
                  {isActive && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Enhanced Topic Selection with Hover Effects */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-4 md:p-6 mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-extrabold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
            <span>{visualizationSubjects[activeSubject]?.title} Topics</span>
            <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visualizationSubjects[activeSubject]?.topics.map((topic, index) => {
              const isSelected = selectedTopic === topic
              return (
                <button
                  key={index}
                  onClick={() => setSelectedTopic(topic)}
                  className={`group relative p-4 text-left rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    isSelected
                      ? `${getSubjectColor(activeSubject, 'border')} bg-gradient-to-br from-white to-${visualizationSubjects[activeSubject].color}-50 shadow-lg`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-xl"></div>
                  )}
                  <div className="relative flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? `bg-gradient-to-br from-${visualizationSubjects[activeSubject].color}-400 to-${visualizationSubjects[activeSubject].color}-600` : 'bg-gray-100 group-hover:bg-gray-200'
                    } transition-all duration-300`}>
                      <span className="text-lg">{isSelected ? '✨' : '📚'}</span>
                    </div>
                    <div className="flex-1">
                      <div className={`font-extrabold text-sm mb-1 ${
                        isSelected ? getSubjectColor(activeSubject, 'text') : 'text-gray-900 group-hover:text-gray-900'
                      }`}>
                        {topic.split(' - ')[0]}
                      </div>
                      <div className="text-xs text-gray-700 font-medium group-hover:text-gray-800">
                        {topic.split(' - ')[1]}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Enhanced Quick Stats with Animations */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-4 md:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <Eye className="h-8 w-8 group-hover:animate-pulse" />
              <div className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">Live</div>
            </div>
            <div className="text-3xl md:text-4xl font-black mb-1">{viewCount}+</div>
            <div className="text-sm font-semibold opacity-90">Visualizations</div>
          </div>
          
          <div className="group bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-4 md:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <Play className="h-8 w-8 group-hover:animate-bounce" />
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="text-2xl md:text-3xl font-black mb-1">Interactive</div>
            <div className="text-sm font-semibold opacity-90">Animations</div>
          </div>
          
          <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-4 md:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 group-hover:animate-pulse" />
              <Zap className="h-5 w-5 animate-pulse" />
            </div>
            <div className="text-2xl md:text-3xl font-black mb-1">Real-time</div>
            <div className="text-sm font-semibold opacity-90">Updates</div>
          </div>
          
          <div className="group bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-4 md:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="h-8 w-8 group-hover:animate-bounce" />
              <Star className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div className="text-2xl md:text-3xl font-black mb-1">All Classes</div>
            <div className="text-sm font-semibold opacity-90">1-12 Support</div>
          </div>
        </div>

        {/* Main Visualization Area */}
        {renderVisualization()}

        {/* Enhanced Learning Tips with Animations */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-4 md:p-6 mt-4 md:mt-6 transform hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-gray-900">
                How to Use Visualizations Effectively
              </h3>
              <p className="text-sm text-gray-700 font-semibold">Master these 4 steps for better learning</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="group relative p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 transform hover:scale-105 hover:shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-black text-blue-900 text-lg">1. Observe</div>
                </div>
                <p className="text-blue-900 text-sm leading-relaxed font-semibold">
                  Watch the animation carefully and notice patterns and changes in real-time.
                </p>
              </div>
            </div>
            
            <div className="group relative p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all duration-300 transform hover:scale-105 hover:shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-200 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-black text-green-900 text-lg">2. Interact</div>
                </div>
                <p className="text-green-900 text-sm leading-relaxed font-semibold">
                  Use controls to change parameters and see how it affects the result instantly.
                </p>
              </div>
            </div>
            
            <div className="group relative p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 transform hover:scale-105 hover:shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-black text-purple-900 text-lg">3. Question</div>
                </div>
                <p className="text-purple-900 text-sm leading-relaxed font-semibold">
                  Ask yourself "what if" questions and test your predictions actively.
                </p>
              </div>
            </div>
            
            <div className="group relative p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200 hover:border-orange-400 transition-all duration-300 transform hover:scale-105 hover:shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-black text-orange-900 text-lg">4. Apply</div>
                </div>
                <p className="text-orange-900 text-sm leading-relaxed font-semibold">
                  Connect what you see to real-world examples and practical problems.
                </p>
              </div>
            </div>
          </div>
          
          {/* Additional Tips Section */}
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-indigo-900 mb-2 flex items-center gap-2">
                  Pro Tips for Maximum Learning
                  <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                </h4>
                <ul className="space-y-2 text-sm text-indigo-900 font-semibold">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-black text-base">•</span>
                    <span>Pause and replay animations to understand each step thoroughly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-black text-base">•</span>
                    <span>Try extreme values to see how the system behaves at boundaries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 font-black text-base">•</span>
                    <span>Compare multiple topics to find connections between concepts</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualizationHub