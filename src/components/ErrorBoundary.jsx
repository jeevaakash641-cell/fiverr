import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // Log to localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      localStorage.setItem('last_error', JSON.stringify(errorLog))
    } catch (e) {
      console.error('Failed to log error:', e)
    }
  }

  handleClearCache = async () => {
    try {
      // Clear everything
      localStorage.clear()
      sessionStorage.clear()
      
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map(n => caches.delete(n)))
      }
      
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
      
      // Reload
      window.location.href = '/'
    } catch (error) {
      console.error('Clear cache error:', error)
      window.location.reload()
    }
  }

  handleGoToMobileTest = () => {
    window.location.href = '/mobile-test.html'
  }

  render() {
    if (this.state.hasError) {
      // Check if mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ color: '#333', marginBottom: '15px', fontSize: '24px' }}>
              Something Went Wrong
            </h1>
            <p style={{ color: '#666', marginBottom: '25px', fontSize: '16px' }}>
              {isMobile 
                ? 'The app encountered an error on your mobile device. This might be due to cached data.'
                : 'The app encountered an error. Please try clearing your cache.'}
            </p>
            
            {this.state.error && (
              <div style={{
                background: '#fee2e2',
                border: '2px solid #ef4444',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <p style={{ 
                  color: '#991b1b', 
                  fontSize: '14px', 
                  fontFamily: 'monospace',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            
            <button
              onClick={this.handleClearCache}
              style={{
                width: '100%',
                padding: '16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              🗑️ Clear Cache & Reload
            </button>
            
            {isMobile && (
              <button
                onClick={this.handleGoToMobileTest}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}
              >
                📱 Mobile Diagnostic
              </button>
            )}
            
            <button
              onClick={() => window.location.href = '/refresh.html'}
              style={{
                width: '100%',
                padding: '16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              ⚡ Quick Refresh
            </button>
            
            <p style={{ 
              marginTop: '20px', 
              fontSize: '12px', 
              color: '#999' 
            }}>
              Error logged to console. Check browser developer tools for details.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
