import VoiceEnabledChatbot from '../components/VoiceEnabledChatbot'

/**
 * Demo page for Voice-Enabled Chatbot
 * Use this to test the voice features
 */
export default function VoiceChatDemo() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <VoiceEnabledChatbot />
      
      {/* Instructions */}
      <div style={{
        maxWidth: '900px',
        margin: '30px auto',
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginTop: 0 }}>📖 How to Use:</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li><strong>Select your language</strong> from the dropdown (Tamil, Hindi, etc.)</li>
          <li><strong>Click "Start Speaking"</strong> button</li>
          <li><strong>Allow microphone access</strong> when browser asks</li>
          <li><strong>Speak your question</strong> clearly (e.g., "2 + 2 என்றால் என்ன?")</li>
          <li><strong>Wait for AI</strong> to process and respond</li>
          <li><strong>Listen to voice answer</strong> automatically</li>
          <li><strong>Read both versions</strong> (your language + English)</li>
        </ol>

        <h3>🎯 Try These Questions:</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px',
          marginTop: '15px'
        }}>
          <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
            <strong>Tamil:</strong><br/>
            "2 + 2 என்றால் என்ன?"<br/>
            "ஒளிச்சேர்க்கை என்றால் என்ன?"
          </div>
          <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
            <strong>Hindi:</strong><br/>
            "2 + 2 क्या है?"<br/>
            "प्रकाश संश्लेषण क्या है?"
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
            <strong>English:</strong><br/>
            "What is 2 + 2?"<br/>
            "Explain photosynthesis"
          </div>
        </div>

        <h3 style={{ marginTop: '25px' }}>✨ Features:</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>🎤 <strong>Voice Input</strong> - Speak in any language</li>
          <li>🔊 <strong>Voice Output</strong> - AI speaks back to you</li>
          <li>📝 <strong>Dual Language</strong> - See answers in 2 languages</li>
          <li>💬 <strong>Text Input</strong> - Type if you prefer</li>
          <li>🔁 <strong>Replay</strong> - Listen to any answer again</li>
          <li>💯 <strong>100% FREE</strong> - No costs!</li>
        </ul>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#c8e6c9',
          borderRadius: '8px',
          border: '2px solid #4caf50'
        }}>
          <strong>✅ Ready to Use!</strong><br/>
          Your Groq API is already configured. Just start speaking!
        </div>
      </div>
    </div>
  )
}
