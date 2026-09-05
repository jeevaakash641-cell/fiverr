import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowLeft, Send, Mic, Image, Youtube, BookOpen, Loader, 
  StickyNote, Clock, Volume2, VolumeX, Search, Filter, 
  Book, Sparkles, Copy, Check, RefreshCw, Plus, Paperclip, 
  FileText, X, Video, ExternalLink, Maximize2, Minimize2,
  Sliders, Type, ZoomIn, ZoomOut
} from 'lucide-react'
import { getBedrockResponse, getBedrockResponseWithTranslation } from '../services/bedrockService'
import { VoiceRecognitionService, getLanguageCode } from '../services/voiceService'
import NotesPanel from './NotesPanel'
import SubjectHelper from './SubjectHelper'
import { historyService } from '../services/historyService'
import { useBilingualAI } from '../hooks/useBilingualAI'
import BilingualMessage from './BilingualMessage'

const AIAssistant = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { getBilingual } = useBilingualAI()
  
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [showNotes, setShowNotes] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  
  // Resize & Appearance States
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('ai_font_size') || 'normal' // 'compact', 'normal', 'large', 'xl'
  })
  const [windowWidth, setWindowWidth] = useState(() => {
    return localStorage.getItem('ai_window_width') || 'standard' // 'compact', 'standard', 'wide'
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showResizeMenu, setShowResizeMenu] = useState(false)
  const resizeMenuRef = useRef(null)

  const handleSetFontSize = (size) => {
    setFontSize(size)
    localStorage.setItem('ai_font_size', size)
  }

  const handleSetWindowWidth = (width) => {
    setWindowWidth(width)
    localStorage.setItem('ai_window_width', width)
  }

  // Plus Icon Menu & Attachments State
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [videoUrlInput, setVideoUrlInput] = useState('')

  const fileImageInputRef = useRef(null)
  const fileDocInputRef = useRef(null)
  const plusMenuRef = useRef(null)
  const voiceRecognition = useRef(null)
  const conversationIdRef = useRef(`conv-${Date.now()}`)
  const latestTranscriptRef = useRef('')
  const chatBottomRef = useRef(null)

  // Text-to-Speech (Read Aloud) States & Hooks
  const [voices, setVoices] = useState([])
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target)) {
        setShowPlusMenu(false)
      }
      if (resizeMenuRef.current && !resizeMenuRef.current.contains(event.target)) {
        setShowResizeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const availableVoices = window.speechSynthesis.getVoices()
        const englishVoices = availableVoices.filter(v => v.lang.toLowerCase().startsWith('en'))
        setVoices(englishVoices)
        const defaultVoice = englishVoices[0]
        if (defaultVoice) {
          setSelectedVoiceName(defaultVoice.name)
        }
      }
    }
    loadVoices()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const handleReadAloud = (messageId, text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.')
      return
    }

    if (currentlySpeakingId === messageId) {
      window.speechSynthesis.cancel()
      setCurrentlySpeakingId(null)
      return
    }

    window.speechSynthesis.cancel()

    // Clean formatting and remove emojis for natural reading
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/Step \d+:/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/•/g, '')
      .replace(/---/g, '')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    const chosenVoice = voices.find(v => v.name === selectedVoiceName)
    if (chosenVoice) {
      utterance.voice = chosenVoice
    }
    utterance.rate = 0.95
    utterance.pitch = 1.0

    utterance.onend = () => setCurrentlySpeakingId(null)
    utterance.onerror = () => setCurrentlySpeakingId(null)

    setCurrentlySpeakingId(messageId)
    window.speechSynthesis.speak(utterance)
  }

  // Copy Message Text
  const handleCopyText = (messageId, text) => {
    const cleanText = text.replace(/\*\*/g, '').trim()
    navigator.clipboard.writeText(cleanText)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Check Auth & Initial Welcome
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    setMessages([
      {
        id: Date.now(),
        type: 'ai',
        content: `Hello ${user.name || 'Student'}! 👋 I am your One Community Ely AI Learning Assistant. You can ask me any questions about work and life skills, digital skills, money management, and your courses. Feel free to type, use voice dictation, or upload questions!`
      }
    ])
  }, [user, navigate])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // 1. Image Attachment Handler
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target?.result
      setAttachments(prev => [
        ...prev,
        {
          id: `img-${Date.now()}`,
          type: 'image',
          name: file.name,
          previewUrl: base64Data,
          data: base64Data
        }
      ])
      setShowPlusMenu(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // 2. Document Attachment Handler
  const handleDocUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAttachments(prev => [
      ...prev,
      {
        id: `doc-${Date.now()}`,
        type: 'file',
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`
      }
    ])
    setShowPlusMenu(false)
    e.target.value = ''
  }

  // 3. Video Link Handler
  const handleAddVideoUrl = () => {
    if (!videoUrlInput.trim()) return

    setAttachments(prev => [
      ...prev,
      {
        id: `vid-${Date.now()}`,
        type: 'video',
        name: videoUrlInput.trim(),
        url: videoUrlInput.trim()
      }
    ])
    setVideoUrlInput('')
    setShowVideoModal(false)
  }

  // Remove attachment
  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(att => att.id !== id))
  }

  // 4. Voice Recognition Handlers
  const startVoiceRecording = async () => {
    setVoiceError(null)
    try {
      if (!voiceRecognition.current) {
        voiceRecognition.current = new VoiceRecognitionService()
      }

      if (!voiceRecognition.current.supported) {
        setVoiceError('Voice recognition is not supported in this browser. Please use Chrome or Edge.')
        return
      }

      const langCode = getLanguageCode(user.mediumName || 'English')
      latestTranscriptRef.current = inputText

      voiceRecognition.current.startListening(
        langCode,
        (transcript) => {
          latestTranscriptRef.current = transcript
          setInputText(transcript)
        },
        (error) => {
          console.error('Voice error:', error)
          let msg = 'Microphone error. '
          if (error === 'not-allowed' || error === 'permission-denied') {
            msg += 'Please allow microphone access in your browser settings.'
          } else if (error === 'no-speech') {
            msg += 'No speech detected. Please speak clearly and try again.'
          } else if (error === 'audio-capture') {
            msg += 'Microphone not found. Please check your microphone is connected.'
          } else if (error === 'network') {
            msg += 'Speech recognition requires an internet connection.'
          } else {
            msg += `(${error})`
          }
          setVoiceError(msg)
          setIsRecording(false)
        }
      )
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start voice recognition:', err)
      setVoiceError(err.message || 'Microphone error')
      setIsRecording(false)
    }
  }


  const stopVoiceRecording = () => {
    if (voiceRecognition.current) {
      voiceRecognition.current.stopListening()
    }
    setIsRecording(false)
    if (latestTranscriptRef.current && latestTranscriptRef.current.trim()) {
      handleSendMessage(latestTranscriptRef.current.trim())
    }
  }

  // 5. Send Message to AI
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend !== null ? textToSend : inputText).trim()
    if (!text && attachments.length === 0) return

    let userMessageContent = text
    if (attachments.length > 0) {
      const attNames = attachments.map(a => `📎 [${a.type.toUpperCase()}: ${a.name}]`).join(' ')
      userMessageContent = text ? `${text}\n\n${attNames}` : attNames
    }

    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessageContent,
      attachments: [...attachments]
    }

    setMessages(prev => [...prev, newUserMessage])
    setInputText('')
    setAttachments([])
    setIsLoading(true)

    try {
      let promptText = text
      if (attachments.length > 0) {
        const attContext = attachments.map(a => `Attached ${a.type}: ${a.name}`).join(', ')
        promptText = `${text}\n\n[Context: User attached: ${attContext}]`
      }

      const motherTongue = user.mediumName || 'English'
      const result = await getBedrockResponseWithTranslation(
        promptText,
        user?.email || user?.id || 'anonymous'
      )

      // getBedrockResponseWithTranslation returns { response, language, sessionId }
      const aiResponseText = (typeof result === 'string')
        ? result
        : (result?.response || result?.text || result?.content || 'I could not generate an answer. Please try asking again.')

      const newAiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponseText
      }

      setMessages(prev => [...prev, newAiMessage])

      // Save to History
      try {
        historyService.saveAIInteraction(user.id || user.email, {
          question: text || 'Attachment inquiry',
          answer: aiResponseText,
          subject: selectedSubject !== 'all' ? selectedSubject : 'Work & Life Skills',
          medium: motherTongue,
          confidence: 0.95
        })
      } catch (histErr) {
        console.warn('History save notice:', histErr)
      }
    } catch (error) {
      console.error('AI Error:', error)
      const errorMsg = {
        id: Date.now() + 1,
        type: 'ai',
        content: '⚠️ I encountered an error retrieving the explanation. Please verify your connection or try rephrasing your question.'
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Markdown rendering helper
  const renderLineWithMarkdown = (lineText, isList = false) => {
    const cleanLine = isList 
      ? lineText.replace(/^[•\-\*]\s*/, '').trim()
      : lineText

    const parts = cleanLine.split(/(\*\*.*?\*\*)/g)

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
  }

  // Dynamic Font Size Styles
  const fontStyles = {
    compact: {
      text: 'text-xs',
      heading: 'text-sm font-bold text-emerald-900 mt-2 mb-1',
      math: 'text-[11px] font-mono bg-gray-100 px-2 py-1 rounded',
      padding: 'p-3',
      userBubble: 'max-w-xl text-xs',
      aiBubble: 'max-w-2xl text-xs',
      prose: 'prose-xs'
    },
    normal: {
      text: 'text-sm',
      heading: 'text-base font-bold text-emerald-900 mt-3 mb-1',
      math: 'text-xs font-mono bg-gray-100 px-3 py-1.5 rounded',
      padding: 'p-4 md:p-5',
      userBubble: 'max-w-2xl text-sm',
      aiBubble: 'max-w-3xl text-sm',
      prose: 'prose-sm'
    },
    large: {
      text: 'text-base',
      heading: 'text-lg font-bold text-emerald-900 mt-3.5 mb-1.5',
      math: 'text-sm font-mono bg-gray-100 px-3.5 py-2 rounded',
      padding: 'p-5 md:p-6',
      userBubble: 'max-w-3xl text-base',
      aiBubble: 'max-w-4xl text-base',
      prose: 'prose-base'
    },
    xl: {
      text: 'text-lg',
      heading: 'text-xl font-bold text-emerald-900 mt-4 mb-2',
      math: 'text-base font-mono bg-gray-100 px-4 py-2 rounded',
      padding: 'p-6 md:p-7',
      userBubble: 'max-w-4xl text-lg',
      aiBubble: 'max-w-5xl text-lg',
      prose: 'prose-lg'
    }
  }[fontSize] || {
    text: 'text-sm',
    heading: 'text-base font-bold text-emerald-900 mt-3 mb-1',
    math: 'text-xs font-mono bg-gray-100 px-3 py-1.5 rounded',
    padding: 'p-4 md:p-5',
    userBubble: 'max-w-2xl text-sm',
    aiBubble: 'max-w-3xl text-sm',
    prose: 'prose-sm'
  }

  // Dynamic Container Max Width
  const containerMaxWidth = isFullscreen
    ? 'max-w-none w-full'
    : windowWidth === 'compact'
    ? 'max-w-4xl'
    : windowWidth === 'wide'
    ? 'max-w-7xl'
    : 'max-w-5xl'

  if (!user) return null

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 overflow-hidden' : ''}`}>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileImageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileDocInputRef}
        onChange={handleDocUpload}
        accept=".pdf,.docx,.doc,.txt,.ppt,.pptx"
        className="hidden"
      />

      {/* Sticky Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20 flex-shrink-0">
        <div className="container mx-auto px-4 md:px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div className="flex items-center space-x-3">
                <Link to="/dashboard">
                  <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    AI Learning Assistant
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                      Active AI
                    </span>
                  </h1>
                  <p className="text-xs text-gray-500">Instant answers, explanations & course assistance</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-3">
              {voices.length > 0 && (
                <div className="flex items-center space-x-1 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hidden sm:flex">
                  <span className="text-xs font-semibold text-gray-600 hidden lg:inline">Voice:</span>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="text-xs bg-transparent border-none font-medium text-gray-800 focus:outline-none max-w-[110px] md:max-w-[140px] cursor-pointer"
                  >
                    {voices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Resize & Layout Menu Button */}
              <div className="relative" ref={resizeMenuRef}>
                <button
                  onClick={() => setShowResizeMenu(!showResizeMenu)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors border text-sm font-semibold shadow-xs cursor-pointer ${
                    showResizeMenu 
                      ? 'bg-emerald-700 text-white border-emerald-700' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'
                  }`}
                  title="Resize AI Workspace & Text"
                >
                  <Sliders className="h-4 w-4 text-emerald-700" />
                  <span className="hidden md:inline">Resize</span>
                </button>

                {/* Resize Dropdown Popover */}
                {showResizeMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 text-xs text-gray-700 space-y-3">
                    {/* Text Size Control */}
                    <div>
                      <div className="flex items-center justify-between font-bold text-gray-900 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Type className="h-3.5 w-3.5 text-emerald-700" />
                          <span>Text Size</span>
                        </span>
                        <span className="capitalize text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {fontSize}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { key: 'compact', label: 'A-', title: 'Small (12px)' },
                          { key: 'normal', label: 'A', title: 'Default (14px)' },
                          { key: 'large', label: 'A+', title: 'Large (16px)' },
                          { key: 'xl', label: 'A++', title: 'Extra Large (18px)' }
                        ].map(item => (
                          <button
                            key={item.key}
                            onClick={() => handleSetFontSize(item.key)}
                            className={`py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                              fontSize === item.key
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                            title={item.title}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Window Width Control */}
                    <div>
                      <div className="flex items-center justify-between font-bold text-gray-900 mb-1.5">
                        <span>Window Width</span>
                        <span className="capitalize text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {windowWidth}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { key: 'compact', label: 'Compact' },
                          { key: 'standard', label: 'Standard' },
                          { key: 'wide', label: 'Wide' }
                        ].map(item => (
                          <button
                            key={item.key}
                            onClick={() => handleSetWindowWidth(item.key)}
                            className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                              windowWidth === item.key
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fullscreen Toggle */}
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setIsFullscreen(!isFullscreen)
                          setShowResizeMenu(false)
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-800 rounded-lg font-bold transition-colors cursor-pointer"
                      >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        <span>{isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors shadow-xs cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen Workspace'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              
              <Link
                to="/ai-history"
                className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 text-sm font-semibold shadow-xs"
                title="View AI Chat History"
              >
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">AI History</span>
              </Link>
              
              <button
                onClick={() => setShowNotes(!showNotes)}
                className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors border text-sm font-semibold shadow-xs cursor-pointer ${
                  showNotes 
                    ? 'bg-emerald-700 text-white border-emerald-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'
                }`}
                title="Study Notes"
              >
                <StickyNote className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Notes</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`container mx-auto px-2 sm:px-4 md:px-6 py-4 flex-1 flex flex-col transition-all duration-200 ${containerMaxWidth}`}>
        {/* Quick Tips Helper Bar (Hidden in Fullscreen for maximum workspace) */}
        {!isFullscreen && <SubjectHelper onQuestionSelect={(q) => handleSendMessage(q)} />}

        {/* Main Chat & Notes Area */}
        <div className={`grid ${showNotes ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-4 flex-1 h-full`}>
          {/* Chat Window */}
          <div className={`${showNotes ? 'lg:col-span-2' : 'col-span-1'} bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col ${isFullscreen ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-230px)] min-h-[520px]'}`}>
            {/* Header info strip inside chat container with Quick Controls */}
            <div className="px-4 md:px-5 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-gray-700">Live AI Session</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">Language: {user.mediumName || 'English'}</span>
              </div>

              {/* Right Quick Controls: Font Size toggles + Fullscreen + Reset */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center bg-gray-200/70 p-0.5 rounded-lg border border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleSetFontSize(fontSize === 'xl' ? 'large' : fontSize === 'large' ? 'normal' : 'compact')}
                    disabled={fontSize === 'compact'}
                    className="p-1 hover:bg-white rounded text-gray-600 disabled:opacity-30 cursor-pointer"
                    title="Decrease Font Size"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] font-bold text-gray-700 px-1.5 capitalize">{fontSize}</span>
                  <button
                    type="button"
                    onClick={() => handleSetFontSize(fontSize === 'compact' ? 'normal' : fontSize === 'normal' ? 'large' : 'xl')}
                    disabled={fontSize === 'xl'}
                    className="p-1 hover:bg-white rounded text-gray-600 disabled:opacity-30 cursor-pointer"
                    title="Increase Font Size"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>

                <button
                  onClick={() => setMessages([{ id: Date.now(), type: 'ai', content: 'Chat history cleared. How can I help you next?' }])}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium pl-1 cursor-pointer"
                  title="Clear current view"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Messages Scroll Area with Dynamic Font Sizing */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-2xl transition-all ${fontStyles.padding} ${
                      message.type === 'user'
                        ? `${fontStyles.userBubble} bg-emerald-700 text-white ml-auto shadow-sm rounded-tr-none`
                        : `${fontStyles.aiBubble} bg-white border border-gray-200 text-gray-800 shadow-sm rounded-tl-none relative`
                    }`}
                  >
                    {message.type === 'ai' && (
                      <div className="flex items-center gap-1 absolute top-3 right-3">
                        <button
                          onClick={() => handleCopyText(message.id, message.content)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                          title="Copy Answer"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleReadAloud(message.id, message.content)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-700 transition-colors cursor-pointer"
                          title={currentlySpeakingId === message.id ? "Stop Reading" : "Read Aloud"}
                        >
                          {currentlySpeakingId === message.id ? (
                            <VolumeX className="h-4 w-4 text-red-500 animate-pulse" />
                          ) : (
                            <Volume2 className="h-4 w-4 text-emerald-700" />
                          )}
                        </button>
                      </div>
                    )}

                    {message.type === 'ai' ? (
                      message.bilingual && message.bilingual.motherTongue ? (
                        <BilingualMessage
                          englishText={message.bilingual.english}
                          translatedText={message.bilingual.motherTongue}
                          language={message.bilingual.language}
                          nativeName={message.bilingual.nativeName}
                        />
                      ) : (
                        <div className={`prose max-w-none text-gray-800 pr-12 ${fontStyles.prose}`}>
                          {message.content.split('\n').map((line, index) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return (
                                <h3 key={index} className={fontStyles.heading}>
                                  {line.replace(/\*\*/g, '')}
                                </h3>
                              )
                            }
                            if (line.match(/^(Step \d+:|Final Answer:|Key Concept:|Common Mistake:)/)) {
                              return (
                                <p key={index} className={`font-bold text-emerald-800 my-1 bg-emerald-50 px-2.5 py-1 rounded ${fontStyles.text}`}>
                                  {line}
                                </p>
                              )
                            }
                            if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
                              return (
                                <li key={index} className={`ml-4 text-gray-700 list-disc my-0.5 ${fontStyles.text}`}>
                                  {renderLineWithMarkdown(line, true)}
                                </li>
                              )
                            }
                            if (line.trim() === '---') {
                              return <hr key={index} className="my-3 border-gray-200" />
                            }
                            if (line.includes('=') || line.includes('÷') || line.includes('×')) {
                              return (
                                <p key={index} className={`my-1.5 ${fontStyles.math}`}>
                                  {line}
                                </p>
                              )
                            }
                            if (line.trim()) {
                              return (
                                <p key={index} className={`text-gray-800 leading-relaxed my-1.5 ${fontStyles.text}`}>
                                  {renderLineWithMarkdown(line, false)}
                                </p>
                              )
                            }
                            return <br key={index} />
                          })}
                        </div>
                      )
                    ) : (
                      <p className={`whitespace-pre-wrap leading-relaxed text-white font-medium ${fontStyles.text}`}>{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-5 py-3 rounded-2xl flex items-center space-x-3 shadow-sm">
                    <Loader className="h-4 w-4 animate-spin text-emerald-700" />
                    <span className="text-sm font-semibold">AI is analyzing and generating response...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Toolbar & Area — Modern Pill Bar with '+' Popover */}
            <div className="border-t border-gray-200 p-3 md:p-4 bg-white rounded-b-xl relative flex-shrink-0">
              {/* Attachment Preview Chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 px-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center space-x-1.5 bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-full border border-gray-300"
                    >
                      {att.type === 'image' && <Image className="h-3.5 w-3.5 text-blue-600" />}
                      {att.type === 'file' && <Paperclip className="h-3.5 w-3.5 text-purple-600" />}
                      {att.type === 'video' && <Youtube className="h-3.5 w-3.5 text-red-600" />}
                      <span className="max-w-[180px] truncate font-medium">{att.name}</span>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="text-gray-400 hover:text-red-600 p-0.5 rounded-full cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Modern Rounded Input Bar */}
              <div className="relative">
                {/* '+' Popover Menu */}
                {showPlusMenu && (
                  <div
                    ref={plusMenuRef}
                    className="absolute bottom-full left-0 mb-3 bg-white rounded-2xl shadow-xl border border-gray-200 p-1.5 w-48 z-50 animate-in fade-in slide-in-from-bottom-2 space-y-0.5"
                  >
                    {/* Attach Image */}
                    <button
                      onClick={() => {
                        fileImageInputRef.current?.click()
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 text-gray-800 hover:text-blue-900 text-sm font-semibold transition-colors text-left group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-blue-200 transition-colors flex-shrink-0">
                        <Image className="h-4 w-4" />
                      </div>
                      <span>Attach Image</span>
                    </button>

                    {/* Video Link */}
                    <button
                      onClick={() => {
                        setShowPlusMenu(false)
                        setShowVideoModal(true)
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-gray-800 hover:text-red-900 text-sm font-semibold transition-colors text-left group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center group-hover:bg-red-200 transition-colors flex-shrink-0">
                        <Youtube className="h-4 w-4" />
                      </div>
                      <span>Video Link</span>
                    </button>

                    {/* Attach Files */}
                    <button
                      onClick={() => {
                        fileDocInputRef.current?.click()
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 text-gray-800 hover:text-purple-900 text-sm font-semibold transition-colors text-left group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:bg-purple-200 transition-colors flex-shrink-0">
                        <Paperclip className="h-4 w-4" />
                      </div>
                      <span>Attach Files</span>
                    </button>
                  </div>
                )}

                {/* Pill Container */}
                <div className="flex items-center bg-gray-100 hover:bg-gray-50 focus-within:bg-white border border-gray-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-full px-3 py-1.5 shadow-sm transition-all">
                  {/* Plus Icon Button */}
                  <button
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className={`p-2 rounded-full transition-all flex-shrink-0 cursor-pointer ${
                      showPlusMenu 
                        ? 'bg-emerald-700 text-white rotate-45' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                    title="Add attachments (Voice, Image, Video, Files)"
                  >
                    <Plus className="h-5 w-5 transition-transform duration-200" />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask AI Assistant anything..."
                    className="flex-1 bg-transparent border-none text-sm text-gray-900 placeholder-gray-500 focus:outline-none px-3 py-2 font-sans"
                  />

                  {/* Voice Button inside Pill */}
                  {!isRecording ? (
                    <button
                      onClick={startVoiceRecording}
                      disabled={isLoading}
                      className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 cursor-pointer"
                      title="Voice Dictation"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      onClick={stopVoiceRecording}
                      className="p-2 text-red-600 bg-red-100 rounded-full animate-pulse flex-shrink-0 cursor-pointer"
                      title="Stop Voice Recording"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}

                  {/* Send Button inside Pill */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
                    className="p-2 bg-emerald-700 text-white rounded-full hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ml-1 cursor-pointer"
                    title="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Voice Error notice if any */}
              {voiceError && (
                <div className="mt-2 text-xs text-red-600 text-center">
                  ⚠️ {voiceError}
                </div>
              )}
            </div>
          </div>

          {/* Notes Panel Component */}
          {showNotes && (
            <div className="lg:col-span-1 h-[calc(100vh-280px)] min-h-[500px]">
              <NotesPanel
                sourceType="ai-chat"
                sourceId="ai-assistant-session"
                subject={selectedSubject !== 'all' ? selectedSubject : 'General'}
                title="AI Study Notes"
              />
            </div>
          )}
        </div>
      </main>

      {/* Video URL Modal Dialog */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <Youtube className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Add Video Link</h3>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              type="url"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              autoFocus
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVideoUrl}
                disabled={!videoUrlInput.trim()}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
              >
                Attach Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIAssistant