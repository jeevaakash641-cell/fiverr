// Voice Service - Speech Recognition and Text-to-Speech
// Uses browser's built-in Web Speech API (100% FREE)

/**
 * Speech Recognition (Voice Input)
 * Converts user's voice to text in multiple languages
 */
export class VoiceRecognitionService {
  constructor() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser')
      this.supported = false
      return
    }

    this.recognition = new SpeechRecognition()
    this.supported = true
    this.isListening = false
    
    // Configure recognition
    this.recognition.continuous = true  // Unlimited time, doesn't auto-stop
    this.recognition.interimResults = true  // Get real-time updates
    this.recognition.maxAlternatives = 1
  }

  /**
   * Start listening to user's voice
   * @param {string} language - Language code (e.g., 'ta-IN', 'hi-IN', 'en-IN')
   * @param {function} onResult - Callback when speech is recognized
   * @param {function} onError - Callback on error
   */
  startListening(language = 'ta-IN', onResult, onError) {
    if (!this.supported) {
      onError?.('Speech recognition not supported in this browser')
      return
    }

    // Set language
    this.recognition.lang = language
    
    // Handle results
    this.recognition.onresult = (event) => {
      let resultTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        resultTranscript += event.results[i][0].transcript
      }
      
      const confidence = event.results[event.results.length - 1][0].confidence
      console.log('🎤 Speech input:', resultTranscript)
      onResult?.(resultTranscript, confidence)
    }

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('🎤 Recognition error:', event.error)
      this.isListening = false
      onError?.(event.error)
    }

    // Handle end
    this.recognition.onend = () => {
      console.log('🎤 Recognition ended')
      this.isListening = false
    }

    // Start recognition
    try {
      this.recognition.start()
      this.isListening = true
      console.log('🎤 Listening...')
    } catch (error) {
      console.error('🎤 Failed to start:', error)
      onError?.(error.message)
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening() {
    return this.isListening
  }
}

/**
 * Text-to-Speech (Voice Output)
 * Converts AI response to voice in multiple languages
 */
export class TextToSpeechService {
  constructor() {
    // Check browser support
    if (!window.speechSynthesis) {
      console.error('Text-to-Speech not supported in this browser')
      this.supported = false
      return
    }

    this.synthesis = window.speechSynthesis
    this.supported = true
    this.currentUtterance = null
  }

  /**
   * Speak text in specified language
   * @param {string} text - Text to speak
   * @param {string} language - Language code (e.g., 'ta-IN', 'hi-IN', 'en-US')
   * @param {object} options - Voice options (rate, pitch, volume)
   */
  speak(text, language = 'ta-IN', options = {}) {
    if (!this.supported) {
      console.error('Text-to-Speech not supported')
      return
    }

    // Stop any ongoing speech
    this.stop()

    // Create utterance
    this.currentUtterance = new SpeechSynthesisUtterance(text)
    this.currentUtterance.lang = language
    this.currentUtterance.rate = options.rate || 0.9  // Speed (0.1 to 10)
    this.currentUtterance.pitch = options.pitch || 1  // Pitch (0 to 2)
    this.currentUtterance.volume = options.volume || 1  // Volume (0 to 1)

    // Try to find a voice for the language
    const voices = this.synthesis.getVoices()
    const voice = voices.find(v => v.lang.startsWith(language.split('-')[0]))
    if (voice) {
      this.currentUtterance.voice = voice
    }

    // Event handlers
    this.currentUtterance.onstart = () => {
      console.log('🔊 Speaking...')
    }

    this.currentUtterance.onend = () => {
      console.log('🔊 Finished speaking')
    }

    this.currentUtterance.onerror = (event) => {
      console.error('🔊 Speech error:', event.error)
    }

    // Speak
    this.synthesis.speak(this.currentUtterance)
  }

  /**
   * Stop speaking
   */
  stop() {
    if (this.synthesis) {
      this.synthesis.cancel()
    }
  }

  /**
   * Pause speaking
   */
  pause() {
    if (this.synthesis) {
      this.synthesis.pause()
    }
  }

  /**
   * Resume speaking
   */
  resume() {
    if (this.synthesis) {
      this.synthesis.resume()
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking() {
    return this.synthesis?.speaking || false
  }

  /**
   * Get available voices
   */
  getAvailableVoices() {
    return this.synthesis?.getVoices() || []
  }
}

/**
 * Language code mappings for ALL 23 Official Indian Languages + English
 * Based on the 8th Schedule of the Indian Constitution
 */
export const LANGUAGE_CODES = {
  // Major Indian Languages (Scheduled Languages)
  Tamil: { speech: 'ta-IN', display: 'தமிழ்', native: 'Tamil' },
  Hindi: { speech: 'hi-IN', display: 'हिंदी', native: 'Hindi' },
  Telugu: { speech: 'te-IN', display: 'తెలుగు', native: 'Telugu' },
  Kannada: { speech: 'kn-IN', display: 'ಕನ್ನಡ', native: 'Kannada' },
  Malayalam: { speech: 'ml-IN', display: 'മലയാളം', native: 'Malayalam' },
  Bengali: { speech: 'bn-IN', display: 'বাংলা', native: 'Bengali' },
  Marathi: { speech: 'mr-IN', display: 'मराठी', native: 'Marathi' },
  Gujarati: { speech: 'gu-IN', display: 'ગુજરાતી', native: 'Gujarati' },
  Punjabi: { speech: 'pa-IN', display: 'ਪੰਜਾਬੀ', native: 'Punjabi' },
  Odia: { speech: 'or-IN', display: 'ଓଡ଼ିଆ', native: 'Odia' },
  Assamese: { speech: 'as-IN', display: 'অসমীয়া', native: 'Assamese' },
  Urdu: { speech: 'ur-IN', display: 'اردو', native: 'Urdu' },
  
  // Additional Scheduled Languages
  Sanskrit: { speech: 'sa-IN', display: 'संस्कृत', native: 'Sanskrit' },
  Kashmiri: { speech: 'ks-IN', display: 'कॉशुर', native: 'Kashmiri' },
  Nepali: { speech: 'ne-IN', display: 'नेपाली', native: 'Nepali' },
  Konkani: { speech: 'kok-IN', display: 'कोंकणी', native: 'Konkani' },
  Manipuri: { speech: 'mni-IN', display: 'মৈতৈলোন্', native: 'Manipuri' },
  Sindhi: { speech: 'sd-IN', display: 'سنڌي', native: 'Sindhi' },
  Dogri: { speech: 'doi-IN', display: 'डोगरी', native: 'Dogri' },
  Maithili: { speech: 'mai-IN', display: 'मैथिली', native: 'Maithili' },
  Santali: { speech: 'sat-IN', display: 'ᱥᱟᱱᱛᱟᱲᱤ', native: 'Santali' },
  Bodo: { speech: 'brx-IN', display: 'बड़ो', native: 'Bodo' },
  
  // English (Official Language)
  English: { speech: 'en-IN', display: 'English', native: 'English' }
}

/**
 * Get all supported languages as array
 */
export function getSupportedLanguages() {
  return Object.keys(LANGUAGE_CODES).map(key => ({
    name: key,
    code: LANGUAGE_CODES[key].speech,
    display: LANGUAGE_CODES[key].display,
    native: LANGUAGE_CODES[key].native
  }))
}

/**
 * Get language code for speech recognition
 */
export function getLanguageCode(language) {
  return LANGUAGE_CODES[language]?.speech || 'en-IN'
}

/**
 * Get language display name
 */
export function getLanguageDisplay(language) {
  return LANGUAGE_CODES[language]?.display || language
}

/**
 * Detect language from medium selection
 */
export function detectLanguageFromMedium(mediumName, stateLanguage) {
  if (!mediumName) return 'English'
  
  // If English medium, return English
  if (mediumName.toLowerCase().includes('english')) {
    return 'English'
  }
  
  // Try to match state language
  if (stateLanguage && LANGUAGE_CODES[stateLanguage]) {
    return stateLanguage
  }
  
  // Try to extract language from medium name
  const languageMatch = mediumName.match(/^(\w+)\s+Medium$/i)
  if (languageMatch) {
    const lang = languageMatch[1]
    if (LANGUAGE_CODES[lang]) {
      return lang
    }
  }
  
  return 'English'
}

export default {
  VoiceRecognitionService,
  TextToSpeechService,
  LANGUAGE_CODES,
  getLanguageCode,
  getLanguageDisplay,
  getSupportedLanguages,
  detectLanguageFromMedium
}
