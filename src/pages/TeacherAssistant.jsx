import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, ClipboardList, Sparkles, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useBilingualAI } from '../hooks/useBilingualAI';
import BilingualMessage from '../components/BilingualMessage';
import { API_BASE_URL } from '../config';

const TeacherAssistant = () => {
  const navigate = useNavigate();
  const { getBilingual, userLanguage } = useBilingualAI();
  
  const [formData, setFormData] = useState({
    topic: '',
    gradeLevel: '',
    difficulty: 'medium',
    weakAreas: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [materials, setMaterials] = useState(null);
  const [bilingualMaterials, setBilingualMaterials] = useState(null);

  const gradeLevels = [
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerate = async () => {
    // Validation
    if (!formData.topic.trim()) {
      setError('Please enter a topic');
      return;
    }
    if (!formData.gradeLevel) {
      setError('Please select a grade level');
      return;
    }

    setLoading(true);
    setError(null);
    setMaterials(null);

    try {
      const weakAreasArray = formData.weakAreas
        .split(',')
        .map(area => area.trim())
        .filter(area => area.length > 0);

      const response = await fetch(`${API_BASE_URL}/api/teacher-assistant/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: formData.topic,
          gradeLevel: formData.gradeLevel,
          difficulty: formData.difficulty,
          weakAreas: weakAreasArray
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate materials');
      }

      if (data.success) {
        setMaterials(data.data);
        console.log('✅ Materials generated:', data.data);
        
        // Translate simplified notes to bilingual if available
        if (data.data.simplifiedNotes && userLanguage !== 'English') {
          const bilingualNotes = await getBilingual(data.data.simplifiedNotes);
          setBilingualMaterials({ simplifiedNotes: bilingualNotes });
        }
      } else {
        throw new Error(data.error || 'Failed to generate materials');
      }

    } catch (err) {
      console.error('❌ Generation error:', err);
      setError(err.message || 'Failed to generate educational materials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'mcq':
        return '📝';
      case 'short':
        return '✍️';
      case 'long':
        return '📄';
      default:
        return '❓';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'hard':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Teacher Assistant</h1>
                <p className="text-sm text-gray-600">AI-powered educational content generator</p>
              </div>
            </div>
            <Sparkles className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <BookOpen className="h-6 w-6 text-indigo-600 mr-2" />
            Generate Educational Materials
          </h2>
          
          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder="e.g., Newton's Laws, Photosynthesis, Algebra"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level <span className="text-red-500">*</span>
              </label>
              <select
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select grade level</option>
                {gradeLevels.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <div className="flex space-x-4">
                {['easy', 'medium', 'hard'].map(level => (
                  <label key={level} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={formData.difficulty === level}
                      onChange={handleInputChange}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Weak Areas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weak Areas (Optional)
              </label>
              <input
                type="text"
                name="weakAreas"
                value={formData.weakAreas}
                onChange={handleInputChange}
                placeholder="e.g., Force, Motion, Acceleration (comma-separated)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple areas with commas
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Generating Materials...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Materials</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Loader className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Generating Educational Materials
            </h3>
            <p className="text-gray-600">
              Our AI is creating customized content for your students...
            </p>
          </div>
        )}

        {/* Generated Materials */}
        {materials && !loading && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Materials Generated Successfully!</p>
                <p className="text-sm text-green-700">Review and use the content below for your class.</p>
              </div>
            </div>

            {/* Question Paper */}
            {materials.questionPaper && materials.questionPaper.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <FileText className="h-6 w-6 text-blue-600 mr-2" />
                  Question Paper
                </h2>
                <div className="space-y-4">
                  {materials.questionPaper.map((q, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">{getQuestionTypeIcon(q.type)}</span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              Q{index + 1}. {q.question}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 uppercase">
                            {q.type}
                          </span>
                          <span className="text-xs px-2 py-1 bg-indigo-100 rounded text-indigo-700 font-medium">
                            {q.marks} marks
                          </span>
                        </div>
                      </div>
                      
                      {q.options && q.options.length > 0 && (
                        <div className="mt-3 ml-7 space-y-1">
                          {q.options.map((option, i) => (
                            <div key={i} className="text-sm text-gray-700">
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {q.correctAnswer && (
                        <div className="mt-3 ml-7 bg-green-50 border border-green-200 rounded p-2">
                          <p className="text-sm font-medium text-green-800">Answer:</p>
                          <p className="text-sm text-green-700">{q.correctAnswer}</p>
                        </div>
                      )}
                      
                      {q.explanation && (
                        <div className="mt-2 ml-7 bg-blue-50 border border-blue-200 rounded p-2">
                          <p className="text-sm font-medium text-blue-800">Explanation:</p>
                          <p className="text-sm text-blue-700">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simplified Notes */}
            {materials.simplifiedNotes && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <BookOpen className="h-6 w-6 text-green-600 mr-2" />
                  Simplified Notes
                </h2>
                <div className="prose max-w-none">
                  {bilingualMaterials?.simplifiedNotes ? (
                    <BilingualMessage
                      englishText={bilingualMaterials.simplifiedNotes.english}
                      translatedText={bilingualMaterials.simplifiedNotes.motherTongue}
                      language={bilingualMaterials.simplifiedNotes.language}
                      nativeName={bilingualMaterials.simplifiedNotes.nativeName}
                    />
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {materials.simplifiedNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Homework Assignments */}
            {materials.homework && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <ClipboardList className="h-6 w-6 text-purple-600 mr-2" />
                  Homework Assignments
                </h2>
                
                <div className="space-y-6">
                  {/* Easy Level */}
                  {materials.homework.easy && materials.homework.easy.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm mr-2">
                          Easy Level
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {materials.homework.easy.map((hw, index) => (
                          <div key={index} className={`border rounded-lg p-4 ${getDifficultyColor('easy')}`}>
                            <p className="font-medium mb-2">
                              {index + 1}. {hw.question}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                💡 Hint: {hw.hint}
                              </span>
                              <span className="font-medium">
                                {hw.marks} mark{hw.marks > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medium Level */}
                  {materials.homework.medium && materials.homework.medium.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm mr-2">
                          Medium Level
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {materials.homework.medium.map((hw, index) => (
                          <div key={index} className={`border rounded-lg p-4 ${getDifficultyColor('medium')}`}>
                            <p className="font-medium mb-2">
                              {index + 1}. {hw.question}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                💡 Hint: {hw.hint}
                              </span>
                              <span className="font-medium">
                                {hw.marks} mark{hw.marks > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hard Level */}
                  {materials.homework.hard && materials.homework.hard.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm mr-2">
                          Hard Level
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {materials.homework.hard.map((hw, index) => (
                          <div key={index} className={`border rounded-lg p-4 ${getDifficultyColor('hard')}`}>
                            <p className="font-medium mb-2">
                              {index + 1}. {hw.question}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                💡 Hint: {hw.hint}
                              </span>
                              <span className="font-medium">
                                {hw.marks} mark{hw.marks > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherAssistant;
