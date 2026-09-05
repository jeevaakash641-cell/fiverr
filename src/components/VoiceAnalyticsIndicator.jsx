import React from 'react';
import { Activity, TrendingUp, Zap } from 'lucide-react';

/**
 * Voice Analytics Indicator
 * Displays emotion and confidence during voice input
 */
const VoiceAnalyticsIndicator = ({ emotion, confidence, metrics, isVisible }) => {
  if (!isVisible) return null;

  const getEmotionColor = (emotion) => {
    switch (emotion) {
      case 'Stressed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'Confused':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Confident':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence < 40) return 'bg-red-500';
    if (confidence < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getEmotionEmoji = (emotion) => {
    switch (emotion) {
      case 'Stressed': return '😰';
      case 'Confused': return '🤔';
      case 'Confident': return '😊';
      default: return '😐';
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-4 max-w-xs">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-indigo-600 animate-pulse" />
          <span className="font-semibold text-gray-800">Voice Analysis</span>
        </div>

        {/* Emotion */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Emotion</span>
            <span className="text-xl">{getEmotionEmoji(emotion)}</span>
          </div>
          <div className={`px-3 py-2 rounded-lg border ${getEmotionColor(emotion)} text-center font-medium`}>
            {emotion}
          </div>
        </div>

        {/* Confidence */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Confidence</span>
            <span className="text-sm font-semibold text-gray-800">{confidence}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${getConfidenceColor(confidence)}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* Metrics (optional, collapsible) */}
        {metrics && (
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-200">
            <div className="flex justify-between">
              <span>Stability:</span>
              <span className="font-medium">{metrics.stability}%</span>
            </div>
            <div className="flex justify-between">
              <span>Hesitation:</span>
              <span className="font-medium">{metrics.hesitation}%</span>
            </div>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-400 text-center">
          AI adapting response...
        </div>
      </div>
    </div>
  );
};

export default VoiceAnalyticsIndicator;
