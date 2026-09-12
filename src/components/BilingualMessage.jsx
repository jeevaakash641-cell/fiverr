import React from 'react'
import { renderFormattedAIContent } from '../utils/aiMarkdownFormatter'

/**
 * BilingualMessage Component
 * Renders cleanly formatted text with zero raw asterisks
 */
const BilingualMessage = ({ englishText, className = '' }) => {
  return (
    <div className={`bilingual-message ${className}`}>
      <div className="text-gray-800 leading-relaxed">
        {renderFormattedAIContent(englishText)}
      </div>
    </div>
  )
}

export default BilingualMessage
