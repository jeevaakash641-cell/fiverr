import { useState, useEffect, useRef } from 'react'
import { getBedrockResponseWithTranslation } from '../services/bedrockService'
import { 
  VoiceRecognitionService, 
  TextToSpeechService, 
  getLanguageCode,
  LANGUAGE_CODES 
} from '../services/voiceService'

/**
 * Complete Voice-Enabled Chatbot
 * - Voice Input (Speech-to-Text)
 * - AI Processing (AWS Bedrock)
 * - Voice Output (Text-to-Speech)
 */
export default function VoiceEnabledChatbot() {
  const [userLanguage, setUserLanguage] = useState('Tamil')
  const [messages, setMessages] = useState([])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [textInput, setTextInput] = useState('')

  // Voice services
  const voiceRecognition = useRef(null)
  const textToSpeech = useRef(null)

  // Initialize voice services
  useEffect(() => {
    voiceRecognition.current = new VoiceRecognitionService()
    textToSpeech.current = new TextToSpeechService()

    // Load voices (needed for some browsers)
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('Voices loaded:', textToSpeech.current.getAvailableVoices().length)
      }
    }

    return () => {
      // Cleanup
      voiceRecognition.current?.stopListening()
      textToSpeech.current?.stop()
    }
  }, [])

  /**
   * Start voice recording
   */
  const startVoiceInput = () => {
    setError(null)
    const languageCode = getLanguageCode(userLanguage)

    voiceRecognition.current.startListening(
      languageCode,
      // On success
      async (transcript, confidence) => {
        setIsListening(false)
        console.log('📝 Transcript:', transcript)
        
        // Add user message
        addMessage('user', transcript)
        
        // Process with AI
        await processUserMessage(transcript)
      },
      // On error
      (error) => {
        setIsListening(false)
        setError(`Voice recognition error: ${error}`)
      }
    )

    setIsListening(true)
  }

  /**
   * Stop voice recording
   */
  const stopVoiceInput = () => {
    voiceRecognition.current?.stopListening()
    setIsListening(false)
  }

  /**
   * Process user message with AI
   */
  const processUserMessage = async (message) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Get AI response from AWS Bedrock
      const { response } = await getBedrockResponseWithTranslation(message, 'voice-user')

      // Add AI response to chat
      addMessage('ai', response, response)

      // Speak the response in user's language
      speakResponse(response, userLanguage)

    } catch (err) {
      setError(`AI Error: ${err.message}`)
      addMessage('error', err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Speak AI response
   */
  const speakResponse = (text, language) => {
    const languageCode = getLanguageCode(language)
    setIsSpeaking(true)

    textToSpeech.current.speak(text, languageCode, {
      rate: 0.9,
      pitch: 1,
      volume: 1
    })

    // Update speaking state
    setTimeout(() => {
      const checkSpeaking = setInterval(() => {
        if (!textToSpeech.current.isSpeaking()) {
          setIsSpeaking(false)
          clearInterval(checkSpeaking)
        }
      }, 100)
    }, 100)
  }

  /**
   * Stop speaking
   */
  const stopSpeaking = () => {
    textToSpeech.current?.stop()
    setIsSpeaking(false)
  }

  /**
   * Add message to chat
   */
  const addMessage = (type, content, englishContent = null) => {
    setMessages(prev => [...prev, {
      type,
      content,
      englishContent,
      timestamp: new Date()
    }])
  }

  /**
   * Handle text input submit
   */
  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!textInput.trim()) return

    addMessage('user', textInput)
    await processUserMessage(textInput)
    setTextInput('')
  }

  /**
   * Replay message audio
   */
  const replayMessage = (message) => {
    if (message.type === 'ai') {
      speakResponse(message.content, userLanguage)
    }
  }

  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '10px'
      }}>
        <h1 style={{ margin: '0 0 10px 0' }}>🎤 Voice AI Chatbot</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>Speak in your language, get answers in voice!</p>
      </div>

      {/* Language Selection */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <label style={{ fontWeight: 'bold' }}>
          🌍 Select Language:
        </label>
        <select 
          value={userLanguage} 
          onChange={(e) => setUserLanguage(e.target.value)}
          style={{ 
            padding: '10px 15px',
            fontSize: '16px',
            borderRadius: '5px',
            border: '2px solid #667eea',
            cursor: 'pointer'
          }}
        >
          {Object.entries(LANGUAGE_CODES).map(([key, value]) => (
            <option key={key} value={key}>
              {value.display} ({key})
            </option>
          ))}
        </select>
      </div>

      {/* Voice Controls */}
      <div style={{ 
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '15px' }}>
          {!isListening ? (
            <button
              onClick={startVoiceInput}
              disabled={isProcessing || isSpeaking}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: isProcessing || isSpeaking ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s',
                opacity: isProcessing || isSpeaking ? 0.6 : 1
              }}
            >
              🎤 Start Speaking
            </button>
          ) : (
            <button
              onClick={stopVoiceInput}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)',
                animation: 'pulse 1.5s infinite'
              }}
            >
              ⏹️ Stop Recording
            </button>
          )}
        </div>

        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            🔇 Stop Speaking
          </button>
        )}

        {/* Status */}
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          {isListening && '🎤 Listening...'}
          {isProcessing && '🤔 AI is thinking...'}
          {isSpeaking && '🔊 Speaking...'}
          {!isListening && !isProcessing && !isSpeaking && '✨ Ready to help!'}
        </div>
      </div>

      {/* Text Input (Alternative) */}
      <div style={{ marginBottom: '20px' }}>
        <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Or type your question here..."
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
          <button
            type="submit"
            disabled={isProcessing || !textInput.trim()}
            style={{
              padding: '12px 25px',
              fontSize: '16px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            📤 Send
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#c62828'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Chat Messages */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '10px',
        padding: '20px',
        minHeight: '400px',
        maxHeight: '600px',
        overflowY: 'auto',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#999', 
            padding: '50px 20px' 
          }}>
            <p style={{ fontSize: '48px', margin: '0 0 20px 0' }}>🎤</p>
            <p>Click "Start Speaking" to ask your question!</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Supported: Tamil, Hindi, Telugu, Kannada, Malayalam, English & more
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                marginBottom: '20px',
                padding: '15px',
                borderRadius: '10px',
                backgroundColor: msg.type === 'user' ? '#e3f2fd' : 
                               msg.type === 'error' ? '#ffebee' : '#f3e5f5',
                border: `2px solid ${msg.type === 'user' ? '#2196f3' : 
                                     msg.type === 'error' ? '#f44336' : '#9c27b0'}`
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  {msg.type === 'user' ? '👤 You' : 
                   msg.type === 'error' ? '❌ Error' : '🤖 AI Assistant'}
                </span>
                {msg.type === 'ai' && (
                  <button
                    onClick={() => replayMessage(msg)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '12px',
                      backgroundColor: '#9c27b0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    🔊 Replay
                  </button>
                )}
              </div>
              
              {/* Native Language */}
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: '1.6',
                marginBottom: msg.englishContent ? '15px' : '0'
              }}>
                {msg.content}
              </div>

              {/* English Translation */}
              {msg.englishContent && (
                <div style={{
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid #ddd'
                }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '8px'
                  }}>
                    📝 English Translation:
                  </div>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: '1.6',
                    fontSize: '14px',
                    color: '#555'
                  }}>
                    {msg.englishContent}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
