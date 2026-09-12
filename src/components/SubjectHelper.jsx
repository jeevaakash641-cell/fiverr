import React, { useMemo } from 'react'
import { Sparkles, BookOpen } from 'lucide-react'

const SubjectHelper = ({ onQuestionSelect, activeContext = null }) => {
  const quickTips = useMemo(() => {
    const topic = activeContext?.lessonTitle || activeContext?.moduleTitle || activeContext?.courseTitle

    if (topic) {
      return [
        {
          text: 'Explain this topic',
          query: `Explain "${topic}" in simple, accessible terms with clear everyday examples for learners.`
        },
        {
          text: 'Real-world examples',
          query: `Give me realistic everyday examples and practical community scenarios for "${topic}" in Ely, Cardiff.`
        },
        {
          text: 'Generate a quiz',
          query: `Create a 5-question multiple choice practice quiz on "${topic}". Do not show the answers yet; wait for me to answer.`
        },
        {
          text: 'Step-by-step guide',
          query: `Provide a step-by-step practical action plan for applying "${topic}" in real life.`
        }
      ]
    }

    return [
      {
        text: 'Employability & CVs',
        query: 'Explain how to write an effective CV and prepare for job interviews in simple, practical steps.'
      },
      {
        text: 'Digital Skills & Safety',
        query: 'What are the most essential online safety rules when using digital banking and email?'
      },
      {
        text: 'Practice Quiz',
        query: 'Create a 5-question multiple choice practice quiz on workplace communication skills. Do not show the answers yet; wait for me to answer.'
      },
      {
        text: 'Market Stall Guide',
        query: 'Show me step-by-step how to plan, budget, and run a successful community market stall in Ely, Cardiff.'
      }
    ]
  }, [activeContext])

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-2.5 mb-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-1.5 whitespace-nowrap ml-1">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
          <span className="text-xs font-bold text-gray-700">Quick Tips</span>
          {activeContext?.courseTitle && (
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 truncate max-w-[200px]" title={activeContext.courseTitle}>
              {activeContext.courseTitle}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-grow">
          {quickTips.map((tip, idx) => (
            <button
              key={idx}
              onClick={() => onQuestionSelect(tip.query)}
              title={tip.query}
              className="text-center py-1.5 px-3 bg-gray-50 hover:bg-emerald-50 rounded-lg border border-gray-200 text-xs text-emerald-800 transition-all hover:border-emerald-300 font-semibold truncate cursor-pointer"
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