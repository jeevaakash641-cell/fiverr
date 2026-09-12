import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNetwork } from '../contexts/NetworkContext'
import { ArrowLeft, Send, Mic, BookOpen, Loader, StickyNote, Clock, Database, Volume2, VolumeX } from 'lucide-react'
import { getBedrockResponse, getBedrockResponseWithTranslation } from '../services/bedrockService'
import SubjectHelper from './SubjectHelper'
import { VoiceRecognitionService } from '../services/voiceService'
import NotesPanel from './NotesPanel'
import { historyService } from '../services/historyService'

// NEW IMPORTS - Feature 1 & 2
import { VoiceEmotionAnalyzer } from '../services/voiceEmotionAnalyzer'
import VoiceAnalyticsIndicator from './VoiceAnalyticsIndicator'
import { renderFormattedAIContent } from '../utils/aiMarkdownFormatter'
import { getOfflineAI } from '../services/offlineAILite'
import { storeDoubtOffline } from '../services/offlineDoubtStorage'
import OfflineDoubtsPanel from './OfflineDoubtsPanel'
import { API_BASE_URL } from '../config'
import { NETWORK_STATUS } from '../services/networkMonitor'

const EnhancedAIAssistant = () => {
  const { user } = useAuth()
  const { networkStatus, pendingDoubtsCount, refreshPendingCount, isOnline, isOffline } = useNetwork()
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputMode, setInputMode] = useState('text')
  const [isRecording, setIsRecording] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [showNotes, setShowNotes] = useState(false)
  const fileInputRef = useRef(null)
  const voiceRecognition = useRef(null)
  const conversationIdRef = useRef(`conv-${Date.now()}`)
  const latestTranscriptRef = useRef('')

  // NEW STATE - Feature 1: Voice Emotion Analysis
  const [voiceAnalyzer, setVoiceAnalyzer] = useState(null)
  const [voiceAnalytics, setVoiceAnalytics] = useState(null)
  const [showVoiceAnalytics, setShowVoiceAnalytics] = useState(false)

  // NEW STATE - Feature 2: Offline Mode (using context)
  const [offlineAI] = useState(() => getOfflineAI())
  const [showOfflinePanel, setShowOfflinePanel] = useState(false)

  // Text-to-Speech (Read Aloud) States & Hooks
  const [voices, setVoices] = useState([])
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null)

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

    // Clean formatting for natural reading
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/•/g, '')
      .replace(/-/g, '')
      .replace(/\n+/g, ' ')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    const selectedVoice = voices.find(v => v.name === selectedVoiceName)
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onend = () => {
      setCurrentlySpeakingId(null)
    }
    utterance.onerror = () => {
      setCurrentlySpeakingId(null)
    }

    setCurrentlySpeakingId(messageId)
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    // Initialize voice recognition service
    voiceRecognition.current = new VoiceRecognitionService()

    // Cleanup on unmount
    return () => {
      if (voiceRecognition.current && voiceRecognition.current.isCurrentlyListening()) {
        voiceRecognition.current.stopListening()
      }
    }
  }, [user, navigate])

  useEffect(() => {
    // Set initial message after user is loaded
    if (user && messages.length === 0) {
      const initialMessage = {
        id: 1,
        type: 'ai',
        content: `Hello ${user.name || user.email?.split('@')[0]}! 👋 How can I help you today? 🚀`
      }
      setMessages([initialMessage])
    }
  }, [user, messages.length])

  if (!user) {
    return null
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputText
    setInputText('')
    setIsLoading(true)

    try {
      // NEW: Check network status
      if (isOffline) {
        // Use offline AI
        const offlineResponse = offlineAI.getResponse(currentInput)
        
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: offlineResponse.response,
          isOffline: true
        }
        setMessages(prev => [...prev, aiMessage])

        // Store doubt for later sync
        await storeDoubtOffline({
          question: currentInput,
          subject: 'General',
          userContext: {
            name: user?.name,
            class: user?.class,
            board: user?.board
          },
          offlineResponse: offlineResponse.response
        })
        
        await refreshPendingCount()
        setIsLoading(false)
        return
      }

      // Online mode - use full AI
      console.log('🚀 Sending message to AWS Bedrock:', currentInput)
      
      const { response } = await getBedrockResponseWithTranslation(
        currentInput,
        user?.email || user?.id || 'anonymous'
      )

      if (!response) throw new Error('Empty AI response')
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response
      }
      
      setMessages(prev => [...prev, aiMessage])

      // Track AI conversation
      try {
        historyService.setUser(user.email || user.id)
        await historyService.trackAIConversation({
          sessionId: conversationIdRef.current,
          subject: 'General',
          messages: [
            { role: 'user', content: currentInput, timestamp: new Date().toISOString() },
            { role: 'assistant', content: response, timestamp: new Date().toISOString() }
          ],
          startTime: new Date().toISOString(),
          duration: 0
        })
      } catch (error) {
        console.error('Error tracking AI conversation:', error)
      }
    } catch (error) {
      console.error('❌ AWS Bedrock Error:', error)
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `🔧 **Error**\n\n${error.message}\n\nPlease try again or rephrase your question.`
      }
      setMessages(prev => [...prev, errorMessage])
    }

    setIsLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuestionSelect = (question) => {
    setInputText(question)
    setTimeout(() => {
      handleSendMessage()
    }, 100)
  }

  // NEW: Enhanced voice recording with emotion analysis
  const startVoiceRecording = async () => {
    if (!voiceRecognition.current || !voiceRecognition.current.supported) {
      setVoiceError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    // NEW: Start emotion analysis
    if (VoiceEmotionAnalyzer.isSupported()) {
      const analyzer = new VoiceEmotionAnalyzer()
      const started = await analyzer.startAnalysis()
      if (started) {
        setVoiceAnalyzer(analyzer)
        setShowVoiceAnalytics(true)
      }
    }

    setVoiceError(null)
    setIsRecording(true)

    // Determine language
    let languageCode = 'en-IN'
    if (user.mediumName) {
      const mediumLower = user.mediumName.toLowerCase()
      if (mediumLower.includes('tamil')) languageCode = 'ta-IN'
      else if (mediumLower.includes('hindi')) languageCode = 'hi-IN'
      else if (mediumLower.includes('telugu')) languageCode = 'te-IN'
      else if (mediumLower.includes('kannada')) languageCode = 'kn-IN'
      else if (mediumLower.includes('malayalam')) languageCode = 'ml-IN'
      else if (mediumLower.includes('bengali')) languageCode = 'bn-IN'
      else if (mediumLower.includes('marathi')) languageCode = 'mr-IN'
      else if (mediumLower.includes('gujarati')) languageCode = 'gu-IN'
      else if (mediumLower.includes('punjabi')) languageCode = 'pa-IN'
    }

    latestTranscriptRef.current = ''
    setInputText('')

    voiceRecognition.current.startListening(
      languageCode,
      (transcript, confidence) => {
        console.log('🎤 Voice input intermediate:', transcript)
        latestTranscriptRef.current = transcript
        setInputText(transcript)
      },
      (error) => {
        setIsRecording(false)
        setShowVoiceAnalytics(false)
        if (voiceAnalyzer) {
          voiceAnalyzer.stopAnalysis()
          setVoiceAnalyzer(null)
        }
        
        let errorMsg = '⚠️ Voice recognition error. '
        
        if (error === 'not-allowed' || error === 'permission-denied') {
          errorMsg += 'Please allow microphone access in your browser. Click the 🔒 icon in the address bar and select "Allow" for microphone.'
        } else if (error === 'no-speech') {
          errorMsg += 'No speech detected. Please speak louder and closer to the microphone, then try again.'
        } else if (error === 'audio-capture') {
          errorMsg += 'Microphone not available. Please check if your microphone is connected and not being used by another application.'
        } else if (error === 'network') {
          errorMsg += 'Speech recognition service unavailable. Please check your internet connection and try again.'
        } else if (error === 'not-supported') {
          errorMsg += 'Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge for voice features.'
        } else {
          errorMsg += `Please try again or use text input instead. (Error: ${error})`
        }
        
        setVoiceError(errorMsg)
        
        console.error('🎤 Voice recognition error:', error)
        console.log('💡 Tip: Check VOICE_TROUBLESHOOTING.md for detailed help')
      }
    )
  }

  const stopVoiceRecording = async () => {
    if (voiceRecognition.current) {
      voiceRecognition.current.stopListening()
      setIsRecording(false)
    }

    let analytics = null
    if (voiceAnalyzer) {
      analytics = voiceAnalyzer.stopAnalysis()
      setVoiceAnalytics(analytics)
      setVoiceAnalyzer(null)
    }
    setShowVoiceAnalytics(false)

    const finalTranscript = latestTranscriptRef.current.trim()
    if (finalTranscript) {
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: finalTranscript,
        voiceAnalytics: analytics
      }
      setMessages(prev => [...prev, userMessage])
      setInputText('')
      setIsLoading(true)

      try {
        let response

        // Check network status
        if (isOffline) {
          // Offline mode
          const offlineResponse = offlineAI.getResponse(finalTranscript)
          response = offlineResponse.response
          
          // Store with emotion data
          await storeDoubtOffline({
            question: finalTranscript,
            subject: 'General',
            userContext: {
              name: user?.name,
              class: user?.class
            },
            emotion: analytics?.emotion,
            confidence: analytics?.confidence,
            offlineResponse: response
          })
          
          await refreshPendingCount()
        } else if (analytics && isOnline) {
          // Use emotion-aware endpoint
          const emotionResponse = await fetch(`${API_BASE_URL}/api/emotion-aware/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: finalTranscript,
              emotion: analytics.emotion,
              confidence: analytics.confidence,
              userContext: {
                name: user?.name,
                class: user?.class,
                board: user?.board,
                subjects: user?.subjects
              }
            })
          })

          if (!emotionResponse.ok) throw new Error('Emotion-aware API failed')
          
          const data = await emotionResponse.json()
          response = data.response
        } else {
          // Regular online mode
          const { response: voiceResponse } = await getBedrockResponseWithTranslation(
            finalTranscript,
            user?.email || user?.id || 'anonymous'
          )
          response = voiceResponse
        }
        
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: response,
          isOffline: isOffline
        }
        setMessages(prev => [...prev, aiMessage])
        
        // Hide analytics after a delay
        setTimeout(() => setShowVoiceAnalytics(false), 5000)
      } catch (error) {
        console.error('❌ Error:', error)
        const errorMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: `Sorry, I encountered an error: ${error.message}`
        }
        setMessages(prev => [...prev, errorMessage])
      }
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      {/* Voice Analytics Indicator */}
      <VoiceAnalyticsIndicator
        emotion={voiceAnalytics?.emotion}
        confidence={voiceAnalytics?.confidence}
        metrics={voiceAnalytics?.metrics}
        isVisible={showVoiceAnalytics}
      />

      {/* Header */}
      <header className="edu-dashboard-header">
        <div className="edu-dashboard-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/dashboard" style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={16} color="#374151" />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.png" alt="One Community Ely Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', lineHeight: 1 }}>Enhanced AI Assistant</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Emotion-aware · Multilingual · Offline-ready</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {voices.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f4f5f7', border: '1px solid #e5e7eb', padding: '6px 10px', borderRadius: 8, fontSize: 13, color: '#374151', fontWeight: 600 }}>
                <span style={{ fontSize: 11, color: '#6b7280' }} className="hidden lg:inline">Voice:</span>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, outline: 'none', color: '#374151', maxWidth: '120px', cursor: 'pointer' }}
                >
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name} style={{ color: '#000000' }}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {pendingDoubtsCount > 0 && (
              <button onClick={() => setShowOfflinePanel(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Database size={14} />
                <span>{pendingDoubtsCount} Pending</span>
              </button>
            )}
            <Link to="/ai-history"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6d28d9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <Clock size={14} />
              <span>History</span>
            </Link>
            <button onClick={() => setShowNotes(!showNotes)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: showNotes ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'white', border: '1px solid #e5e7eb', color: showNotes ? 'white' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <StickyNote size={14} />
              <span>Notes</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px' }}>
        <SubjectHelper onQuestionSelect={handleQuestionSelect} />

        <div style={{ display: 'grid', gridTemplateColumns: showNotes ? '1fr 1fr' : '1fr', gap: 20, marginTop: 16 }}>
          {/* Chat */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(79,70,229,0.08)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)' }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((message) => (
                <div key={message.id} style={{ display: 'flex', justifyContent: message.type === 'user' ? 'flex-end' : message.type === 'system' ? 'center' : 'flex-start' }}>
                  <div style={{
                    width: '100%',
                    maxWidth: message.type === 'user' ? '70%' : '85%',
                    padding: '12px 16px', borderRadius: 14,
                    background: message.type === 'user'
                      ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                      : message.type === 'system' ? '#f0fdf4'
                      : message.isOffline ? '#fff7ed'
                      : '#f8fafc',
                    border: message.type === 'user' ? 'none'
                      : message.type === 'system' ? '1px solid #bbf7d0'
                      : message.isOffline ? '1px solid #fed7aa'
                      : '1px solid #e5e7eb',
                    color: message.type === 'user' ? 'white' : '#1a1a2e',
                    resize: (message.type !== 'user' && message.type !== 'system') ? 'vertical' : 'none',
                    overflow: (message.type !== 'user' && message.type !== 'system') ? 'auto' : 'visible',
                    minHeight: (message.type !== 'user' && message.type !== 'system') ? '80px' : 'auto',
                    maxHeight: (message.type !== 'user' && message.type !== 'system') ? '600px' : 'auto',
                    position: 'relative',
                    paddingRight: (message.type !== 'user' && message.type !== 'system') ? '48px' : '16px'
                  }}>
                    {(message.type !== 'user' && message.type !== 'system') && (
                      <button
                        onClick={() => handleReadAloud(message.id, message.content)}
                        style={{ position: 'absolute', top: 12, right: 12, padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', zIndex: 10 }}
                        title={currentlySpeakingId === message.id ? "Stop Reading" : "Read Aloud"}
                      >
                        {currentlySpeakingId === message.id ? (
                          <VolumeX size={16} color="#ef4444" className="animate-pulse" />
                        ) : (
                          <Volume2 size={16} color="#4f46e5" />
                        )}
                      </button>
                    )}
                    {message.voiceAnalytics && (
                      <div style={{ marginBottom: 8, padding: '3px 10px', borderRadius: 20, background: '#f5f3ff', color: '#6d28d9', fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                        {message.voiceAnalytics.emotion} · {message.voiceAnalytics.confidence}% confidence
                      </div>
                    )}
                    {message.isOffline && (
                      <div style={{ marginBottom: 8, padding: '3px 10px', borderRadius: 20, background: '#fff7ed', color: '#c2410c', fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                        Offline AI Response
                      </div>
                    )}
                    <div style={{ fontSize: 14, lineHeight: 1.65 }}>
                      {renderFormattedAIContent(message.content)}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 18px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Loader size={16} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>
                      {networkStatus === NETWORK_STATUS.OFFLINE ? 'Offline AI thinking…' : 'AI is thinking…'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['text', 'voice'].map(mode => (
                  <button key={mode} onClick={() => setInputMode(mode)}
                    style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: inputMode === mode ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#f4f5f7', color: inputMode === mode ? 'white' : '#374151' }}>
                    {mode === 'text' ? 'Text' : '🎭 Voice + Emotion'}
                  </button>
                ))}
              </div>

              {inputMode === 'text' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <textarea value={inputText} onChange={e => setInputText(e.target.value)} onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about your studies…"
                    style={{ flex: 1, padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 10, resize: 'vertical', overflow: 'auto', minHeight: '60px', maxHeight: '400px', fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#1a1a2e', background: '#fafafa' }}
                    rows={2} />
                  <button onClick={handleSendMessage} disabled={!inputText.trim() || isLoading}
                    style={{ padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', color: 'white', cursor: 'pointer', opacity: (!inputText.trim() || isLoading) ? 0.5 : 1 }}>
                    <Send size={18} />
                  </button>
                </div>
              )}

              {inputMode === 'voice' && (
                <div style={{ textAlign: 'center' }}>
                  {!isRecording ? (
                    <button onClick={startVoiceRecording} disabled={isLoading}
                      style={{ padding: '10px 24px', borderRadius: 10, background: '#ef4444', border: 'none', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Mic size={16} /> Start Recording
                    </button>
                  ) : (
                    <button onClick={stopVoiceRecording}
                      style={{ padding: '10px 24px', borderRadius: 10, background: '#6b7280', border: 'none', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, animation: 'pulse 1.5s infinite' }}>
                      <Mic size={16} /> Stop Recording
                    </button>
                  )}
                  <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
                    {isRecording ? 'Speak now… Analyzing emotion and confidence' : 'Voice input with real-time emotion detection'}
                  </p>
                  {voiceError && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 10, color: '#b91c1c', fontSize: 13 }}>
                      {voiceError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {showNotes && (
            <div style={{ height: 'calc(100vh - 280px)' }}>
              <NotesPanel sourceType="ai-chat" sourceId="enhanced-ai-assistant" subject="General" title="AI Chat Notes" />
            </div>
          )}
        </div>
      </div>

      <OfflineDoubtsPanel isOpen={showOfflinePanel} onClose={() => { setShowOfflinePanel(false); refreshPendingCount() }} />
    </div>
  )
}

export default EnhancedAIAssistant
