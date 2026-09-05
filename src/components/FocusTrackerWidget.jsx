import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Clock, Activity } from 'lucide-react'
import { startFocusTracking, stopFocusTracking, getFocusStats, getFormattedActiveTime } from '../utils/focusTracker'

/**
 * Focus Tracker Widget Component
 * Displays real-time focus metrics during study sessions
 */
const FocusTrackerWidget = () => {
  const [stats, setStats] = useState({
    isTracking: false,
    focusScore: 100,
    tabSwitchCount: 0,
    activeTime: 0,
    inactiveTime: 0,
    totalTime: 0,
    isTabVisible: true,
    isWindowFocused: true
  })

  const [isExpanded, setIsExpanded] = useState(true)

  // Update stats every second
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStats = getFocusStats()
      setStats(currentStats)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stats.isTracking) {
        stopFocusTracking()
      }
    }
  }, [stats.isTracking])

  const handleStartTracking = () => {
    startFocusTracking()
    setStats(getFocusStats())
  }

  const handleStopTracking = () => {
    stopFocusTracking()
    setStats(getFocusStats())
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const getFocusScoreColor = (score) => {
    if (score >= 80) return '#10b981' // Green
    if (score >= 60) return '#f59e0b' // Orange
    return '#ef4444' // Red
  }

  const getFocusScoreLabel = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Great'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Fair'
    if (score >= 50) return 'Needs Improvement'
    return 'Poor'
  }

  return (
    <div className="modern-card" style={{ maxWidth: '400px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="icon-container" style={{ width: '40px', height: '40px' }}>
            <Activity style={{ width: '20px', height: '20px' }} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Focus Meter</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-icon"
          style={{ width: '32px', height: '32px' }}
        >
          {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Focus Score */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Focus Score</span>
              <span 
                className="text-2xl font-bold"
                style={{ color: getFocusScoreColor(stats.focusScore) }}
              >
                {stats.focusScore}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="progress-bar-modern">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${stats.focusScore}%`,
                  background: `linear-gradient(90deg, ${getFocusScoreColor(stats.focusScore)}, ${getFocusScoreColor(stats.focusScore)})`
                }}
              ></div>
            </div>
            
            <p className="text-xs text-gray-500 mt-1 text-center">
              {getFocusScoreLabel(stats.focusScore)}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Active Study Time */}
            <div className="bg-indigo-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-600">Active Time</span>
              </div>
              <p className="text-lg font-bold text-indigo-900">
                {formatTime(stats.activeTime)}
              </p>
            </div>

            {/* Tab Switches */}
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} className="text-purple-600" />
                <span className="text-xs font-semibold text-purple-600">Tab Switches</span>
              </div>
              <p className="text-lg font-bold text-purple-900">
                {stats.tabSwitchCount}
              </p>
            </div>
          </div>

          {/* Warning Message */}
          {stats.isTracking && stats.tabSwitchCount > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">💡 Tip:</span> Stay focused to improve your learning score
              </p>
            </div>
          )}

          {/* Status Indicator */}
          {stats.isTracking && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <div 
                className={`w-2 h-2 rounded-full ${stats.isTabVisible && stats.isWindowFocused ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
              ></div>
              <span className="text-gray-600">
                {stats.isTabVisible && stats.isWindowFocused ? 'Tracking active' : 'Tab not focused'}
              </span>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!stats.isTracking ? (
              <button
                onClick={handleStartTracking}
                className="btn-modern-primary w-full"
              >
                Start Tracking
              </button>
            ) : (
              <button
                onClick={handleStopTracking}
                className="btn-modern-danger w-full"
              >
                Stop Tracking
              </button>
            )}
          </div>

          {/* Additional Info */}
          {stats.isTracking && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Focus score decreases by 5% for each tab switch
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FocusTrackerWidget
