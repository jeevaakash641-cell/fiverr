// API Configuration
// This will automatically use the correct backend URL based on environment

const getApiUrl = () => {
  // Priority 1: Use environment variable if set (for production deployment)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Priority 2: If accessing via ngrok domain, use same origin for API
  if (window.location.hostname.includes('ngrok')) {
    return window.location.origin
  }
  
  // Priority 3: If running in development on localhost, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001'
  }
  
  // Priority 4: For production or other remote access, use same host with backend port
  return window.location.origin.replace(':5173', ':3001')
}

export const API_BASE_URL = getApiUrl()

console.log('🔗 API Base URL:', API_BASE_URL)
console.log('🌐 Current hostname:', window.location.hostname)
console.log('🔍 Full URL:', window.location.href)
console.log('⚙️  Environment API URL:', import.meta.env.VITE_API_URL || 'Not set')
