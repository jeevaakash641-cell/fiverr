import React from 'react'
import { Sparkles } from 'lucide-react'

const SubjectHelper = ({ onQuestionSelect }) => {
  const quickTips = [
    { text: 'Explain a complex concept', query: 'Explain how gravity works in simple terms with examples.' },
    { text: 'Real-world examples', query: 'Give me real-world examples of Newton\'s laws of motion.' },
    { text: 'Generate a quiz', query: 'Create a 5-question multiple choice practice quiz on science. Do not show the answers yet; wait for me to answer.' },
    { text: 'Step-by-step solution', query: 'Show me step-by-step how to solve the equation: x² + 5x + 6 = 0' }
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2.5 mb-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5 whitespace-nowrap ml-1">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
          <span>Quick Tips:</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-grow">
          {quickTips.map((tip, idx) => (
            <button
              key={idx}
              onClick={() => onQuestionSelect(tip.query)}
              title={`e.g. "${tip.query}"`}
              className="text-center py-1.5 px-3 bg-gray-50 hover:bg-emerald-50 rounded-lg border border-gray-200 text-xs text-emerald-800 transition-all hover:border-emerald-300 font-semibold truncate"
            >
              {tip.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SubjectHelper