import React from 'react'
import { AlertTriangle, RefreshCw, Edit3 } from 'lucide-react'

class LessonEditorErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      fallbackText: props.fallbackValue || ''
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lesson Editor Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleFallbackChange = (e) => {
    const val = e.target.value
    this.setState({ fallbackText: val })
    this.props.onChange?.(val)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4 my-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-900">
                Rich Text Editor Encountered a Glitch (Safe Mode Activated)
              </h4>
              <p className="text-xs text-amber-800 mt-1">
                Your lesson draft is protected. You can continue writing in safe text mode below or try reloading the rich editor.
              </p>

              <textarea
                value={this.props.value || this.state.fallbackText}
                onChange={this.handleFallbackChange}
                placeholder="Type lesson content here..."
                rows={6}
                className="w-full mt-3 p-3 text-sm bg-white border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-sans"
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Try Restoring Rich Editor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default LessonEditorErrorBoundary
