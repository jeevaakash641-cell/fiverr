import React, { useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { LANGUAGE_CODES, getSupportedLanguages } from '../services/voiceService'

/**
 * Language Selector Component
 * Shows all 24 supported languages (23 Indian + English)
 */
const LanguageSelector = ({ selectedLanguage, onLanguageChange, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const languages = getSupportedLanguages()

  const handleSelect = (languageName) => {
    onLanguageChange(languageName)
    setIsOpen(false)
  }

  const selectedLang = LANGUAGE_CODES[selectedLanguage] || LANGUAGE_CODES.English

  if (compact) {
    // Compact dropdown for mobile/small spaces
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Globe className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium">{selectedLang.display}</span>
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
              <div className="p-2">
                <p className="text-xs text-gray-500 px-2 py-1 font-semibold">
                  Select Voice Input Language
                </p>
                {languages.map((lang) => (
                  <button
                    key={lang.name}
                    onClick={() => handleSelect(lang.name)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-indigo-50 transition-colors flex items-center justify-between ${
                      selectedLanguage === lang.name ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{lang.display}</div>
                      <div className="text-xs text-gray-500">{lang.native}</div>
                    </div>
                    {selectedLanguage === lang.name && (
                      <Check className="h-4 w-4 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // Full grid view for desktop
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-gray-700">
        <Globe className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold">Select Voice Input Language</h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {languages.map((lang) => (
          <button
            key={lang.name}
            onClick={() => handleSelect(lang.name)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              selectedLanguage === lang.name
                ? 'border-indigo-600 bg-indigo-50 shadow-md'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className={`font-medium text-sm ${
                  selectedLanguage === lang.name ? 'text-indigo-700' : 'text-gray-800'
                }`}>
                  {lang.display}
                </div>
                <div className="text-xs text-gray-500 mt-1">{lang.native}</div>
              </div>
              {selectedLanguage === lang.name && (
                <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Selected:</strong> {selectedLang.display} ({selectedLang.native})
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Speak in {selectedLang.native} and get answers in both {selectedLang.native} and English
        </p>
      </div>
    </div>
  )
}

export default LanguageSelector
