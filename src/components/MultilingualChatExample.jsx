import { useState } from 'react'
import { getBedrockResponseWithTranslation } from '../services/bedrockService'

/**
 * Example component showing how to use multilingual chatbot
 */
export default function MultilingualChatExample() {
  const [userInput, setUserInput] = useState('')
  const [userLanguage, setUserLanguage] = useState('Tamil')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userInput.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      // Get response from AWS Bedrock
      const { response: result } = await getBedrockResponseWithTranslation(userInput, 'multilingual-user')
      setResponse({ nativeLanguage: result, english: result })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🌍 Multilingual AI Chatbot</h2>
      
      {/* Language Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label>Select Your Language: </label>
        <select 
          value={userLanguage} 
          onChange={(e) => setUserLanguage(e.target.value)}
          style={{ padding: '8px', marginLeft: '10px' }}
        >
          <option value="Tamil">Tamil (தமிழ்)</option>
          <option value="Hindi">Hindi (हिंदी)</option>
          <option value="Telugu">Telugu (తెలుగు)</option>
          <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
          <option value="Malayalam">Malayalam (മലയാളം)</option>
          <option value="English">English</option>
        </select>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask your question in any language..."
          rows="4"
          style={{ 
            width: '100%', 
            padding: '10px', 
            fontSize: '16px',
            marginBottom: '10px',
            color: '#000000',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db'
          }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Processing...' : '🚀 Ask AI'}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '5px'
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div style={{ marginTop: '30px' }}>
          {/* Native Language Response */}
          <div style={{ 
            marginBottom: '20px', 
            padding: '20px', 
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            border: '2px solid #2196f3'
          }}>
            <h3>📝 Answer in {response.language}</h3>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.6',
              fontSize: '16px'
            }}>
              {response.nativeLanguage}
            </div>
          </div>

          {/* English Response */}
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f3e5f5',
            borderRadius: '8px',
            border: '2px solid #9c27b0'
          }}>
            <h3>📝 Answer in English</h3>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.6',
              fontSize: '16px'
            }}>
              {response.english}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
