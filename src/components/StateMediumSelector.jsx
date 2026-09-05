import React, { useState, useEffect } from 'react'
import { MapPin, Globe } from 'lucide-react'

const StateMediumSelector = ({ onStateChange, onMediumChange, initialState = '', initialMedium = '' }) => {
  const [selectedState, setSelectedState] = useState(initialState)
  const [selectedMedium, setSelectedMedium] = useState(initialMedium)

  // Complete mapping of 26 Indian states to their mediums
  const stateMediumMapping = {
    'Tamil Nadu': ['Tamil Medium', 'English Medium'],
    'Kerala': ['Malayalam Medium', 'English Medium'],
    'Karnataka': ['Kannada Medium', 'English Medium'],
    'Andhra Pradesh': ['Telugu Medium', 'English Medium'],
    'Telangana': ['Telugu Medium', 'English Medium'],
    'Maharashtra': ['Marathi Medium', 'English Medium'],
    'West Bengal': ['Bengali Medium', 'English Medium'],
    'Gujarat': ['Gujarati Medium', 'English Medium'],
    'Punjab': ['Punjabi Medium', 'English Medium'],
    'Odisha': ['Odia Medium', 'English Medium'],
    'Assam': ['Assamese Medium', 'English Medium'],
    'Bihar': ['Hindi Medium', 'English Medium'],
    'Uttar Pradesh': ['Hindi Medium', 'English Medium'],
    'Madhya Pradesh': ['Hindi Medium', 'English Medium'],
    'Rajasthan': ['Hindi Medium', 'English Medium'],
    'Haryana': ['Hindi Medium', 'English Medium'],
    'Himachal Pradesh': ['Hindi Medium', 'English Medium'],
    'Chhattisgarh': ['Hindi Medium', 'English Medium'],
    'Jharkhand': ['Hindi Medium', 'English Medium'],
    'Uttarakhand': ['Hindi Medium', 'English Medium'],
    'Goa': ['Konkani Medium', 'English Medium'],
    'Manipur': ['Manipuri Medium', 'English Medium'],
    'Meghalaya': ['English Medium'],
    'Mizoram': ['Mizo Medium', 'English Medium'],
    'Nagaland': ['English Medium'],
    'Tripura': ['Bengali Medium', 'English Medium'],
    'Sikkim': ['Nepali Medium', 'English Medium']
  }

  // All 26 Indian states (excluding UTs)
  const indianStates = Object.keys(stateMediumMapping).sort()

  // Get available mediums for selected state
  const availableMediums = selectedState ? stateMediumMapping[selectedState] || [] : []

  // Handle state selection
  const handleStateChange = (state) => {
    setSelectedState(state)
    setSelectedMedium('') // Reset medium when state changes
    
    // Callback to parent component
    if (onStateChange) {
      onStateChange(state)
    }
    if (onMediumChange) {
      onMediumChange('') // Reset medium in parent
    }
  }

  // Handle medium selection
  const handleMediumChange = (medium) => {
    setSelectedMedium(medium)
    
    // Callback to parent component
    if (onMediumChange) {
      onMediumChange(medium)
    }
  }

  // Update local state when props change
  useEffect(() => {
    setSelectedState(initialState)
    setSelectedMedium(initialMedium)
  }, [initialState, initialMedium])

  return (
    <div className="space-y-6">
      {/* State Dropdown */}
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="inline h-4 w-4 mr-1" />
          Select State *
        </label>
        <select
          value={selectedState}
          onChange={(e) => handleStateChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        >
          <option value="">Choose your state</option>
          {indianStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Select your state to see available mediums
        </p>
      </div>

      {/* Medium Dropdown */}
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Globe className="inline h-4 w-4 mr-1" />
          Select Medium *
        </label>
        <select
          value={selectedMedium}
          onChange={(e) => handleMediumChange(e.target.value)}
          disabled={!selectedState || availableMediums.length === 0}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            !selectedState ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          required
        >
          <option value="">
            {!selectedState ? 'Select state first' : 'Choose medium of instruction'}
          </option>
          {availableMediums.map((medium) => (
            <option key={medium} value={medium}>
              {medium}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {selectedState 
            ? `Available mediums for ${selectedState}: ${availableMediums.join(', ')}`
            : 'Medium options will appear after selecting a state'
          }
        </p>
      </div>

      {/* Selection Summary */}
      {selectedState && selectedMedium && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="font-medium text-indigo-800 mb-2">Selection Summary</h4>
          <div className="text-sm text-indigo-700">
            <p><strong>State:</strong> {selectedState}</p>
            <p><strong>Medium:</strong> {selectedMedium}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default StateMediumSelector