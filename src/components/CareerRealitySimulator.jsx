import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Briefcase, TrendingUp, DollarSign, Target, AlertCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { CAREERS } from '../data/careerData';
import { getHealthData } from '../services/healthTrackerService';

const CareerRealitySimulator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [avgStudyHours, setAvgStudyHours] = useState(0);
  const [goalEstimation, setGoalEstimation] = useState(null);

  useEffect(() => {
    if (user && selectedCareer) {
      calculateGoalEstimation();
    }
  }, [user, selectedCareer]);

  const calculateGoalEstimation = async () => {
    if (!user) return;

    // Get health data
    const healthData = await getHealthData(user.email);
    
    if (healthData.length === 0) {
      setAvgStudyHours(0);
      setGoalEstimation(null);
      return;
    }

    // Calculate average study hours from last 30 days
    const last30Days = healthData.slice(0, 30);
    const totalStudyHours = last30Days.reduce((sum, entry) => sum + (entry.data.studyHours || 0), 0);
    const avgHours = totalStudyHours / last30Days.length;
    setAvgStudyHours(avgHours);

    // Calculate goal estimation
    const requiredHours = selectedCareer.requiredStudyHours || 0;
    
    if (avgHours > 0 && requiredHours > 0) {
      const estimatedMonths = Math.ceil(requiredHours / (avgHours * 30));
      const estimatedYears = (estimatedMonths / 12).toFixed(1);
      
      // Determine status
      let status = 'good';
      let statusMessage = '';
      let suggestion = '';
      
      if (avgHours < 2) {
        status = 'low';
        statusMessage = 'Your current study time is too low to achieve this goal efficiently. Increase your daily study hours to stay on track.';
        const recommendedHours = Math.ceil(requiredHours / (24 * 30)); // 24 months target
        suggestion = `To achieve this goal within 24 months, you should study approximately ${recommendedHours} hours per day.`;
      } else if (avgHours >= 2 && avgHours < 4) {
        status = 'moderate';
        statusMessage = 'You can achieve this goal, but it may take longer unless study time increases.';
        const recommendedHours = Math.ceil(requiredHours / (24 * 30));
        suggestion = `To achieve this goal within 24 months, you should study approximately ${recommendedHours} hours per day.`;
      } else if (avgHours >= 5) {
        status = 'excellent';
        statusMessage = 'You are on a strong path toward achieving this goal.';
        suggestion = 'Keep up the excellent work! Your study habits are aligned with your career goals.';
      } else {
        status = 'good';
        statusMessage = 'You are making good progress toward this goal.';
        const recommendedHours = Math.ceil(requiredHours / (18 * 30)); // 18 months target
        suggestion = `To achieve this goal within 18 months, you should study approximately ${recommendedHours} hours per day.`;
      }

      setGoalEstimation({
        estimatedMonths,
        estimatedYears,
        status,
        statusMessage,
        suggestion,
        requiredHours
      });
    } else {
      setGoalEstimation(null);
    }
  };

  const handleCareerSelect = (careerId) => {
    setSelectedCareer(CAREERS[careerId]);
    setShowSimulation(true);
  };

  const getStressColor = (level) => {
    const stressLevel = typeof level === 'string' ? level : level?.level || 'medium';
    switch (stressLevel.toLowerCase()) {
      case 'very high':
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium-high':
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (showSimulation && selectedCareer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowSimulation(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800">{selectedCareer.name}</h1>
                  <p className="text-sm text-gray-600">Career Reality Simulation</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="space-y-6">
            {/* Goal Achievement Predictor */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-indigo-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Target className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-800">Goal Achievement Estimation</h2>
              </div>
              
              {avgStudyHours === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Study Data Available</h3>
                  <p className="text-gray-600 mb-4">
                    Start tracking your daily study hours in the Health Tracker to see personalized goal predictions.
                  </p>
                  <button
                    onClick={() => navigate('/health-tracker')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Go to Health Tracker
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Career Info */}
                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Selected Career</p>
                        <p className="text-lg font-bold text-gray-800">{selectedCareer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Your Average Study Time</p>
                        <p className="text-lg font-bold text-indigo-600">{avgStudyHours.toFixed(1)} hrs/day</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Required Study Hours</p>
                        <p className="text-lg font-bold text-purple-600">{selectedCareer.requiredStudyHours || 'N/A'} hours</p>
                      </div>
                    </div>
                  </div>

                  {/* Estimation */}
                  {goalEstimation && (
                    <>
                      <div className="bg-white rounded-lg p-6">
                        <div className="text-center mb-4">
                          <p className="text-sm text-gray-600 mb-2">Estimated Time to Achieve Goal</p>
                          <div className="flex items-center justify-center space-x-4">
                            <div>
                              <p className="text-4xl font-bold text-indigo-600">{goalEstimation.estimatedMonths}</p>
                              <p className="text-sm text-gray-600">Months</p>
                            </div>
                            <span className="text-2xl text-gray-400">≈</span>
                            <div>
                              <p className="text-4xl font-bold text-purple-600">{goalEstimation.estimatedYears}</p>
                              <p className="text-sm text-gray-600">Years</p>
                            </div>
                          </div>
                        </div>

                        {/* Status Indicator */}
                        <div className={`mt-4 p-4 rounded-lg flex items-start space-x-3 ${
                          goalEstimation.status === 'excellent' ? 'bg-green-100 text-green-800' :
                          goalEstimation.status === 'good' ? 'bg-blue-100 text-blue-800' :
                          goalEstimation.status === 'moderate' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {goalEstimation.status === 'excellent' ? (
                            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-semibold mb-1">
                              {goalEstimation.status === 'excellent' ? 'Excellent Progress!' :
                               goalEstimation.status === 'good' ? 'Good Progress' :
                               goalEstimation.status === 'moderate' ? 'Moderate Progress' :
                               'Needs Improvement'}
                            </p>
                            <p className="text-sm">{goalEstimation.statusMessage}</p>
                          </div>
                        </div>
                      </div>

                      {/* Suggestion */}
                      <div className="bg-white rounded-lg p-6">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                          <TrendingUp className="h-5 w-5 text-indigo-600 mr-2" />
                          Suggested Improvement
                        </h3>
                        <p className="text-gray-700">{goalEstimation.suggestion}</p>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border-l-4 border-indigo-500">
                          <p className="text-sm text-gray-600">At Current Pace</p>
                          <p className="text-lg font-bold text-gray-800">
                            {(goalEstimation.requiredHours / avgStudyHours).toFixed(0)} days of study
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                          <p className="text-sm text-gray-600">Monthly Progress</p>
                          <p className="text-lg font-bold text-gray-800">
                            {(avgStudyHours * 30).toFixed(0)} hours/month
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Required Skills */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Target className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-800">Required Skills</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedCareer.requiredSkills.map((skillObj, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                    <span className="text-purple-600">✓</span>
                    <div className="flex-1">
                      <span className="text-gray-700 font-medium">{skillObj.skill}</span>
                      <span className="text-xs text-gray-500 ml-2">({skillObj.level})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stress Level */}
            <div className={`rounded-lg shadow-sm border p-6 ${getStressColor(selectedCareer.stressLevel)}`}>
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="h-6 w-6" />
                <h2 className="text-xl font-bold">
                  Stress Level: {typeof selectedCareer.stressLevel === 'string' ? selectedCareer.stressLevel : selectedCareer.stressLevel.level}
                </h2>
              </div>
              {selectedCareer.stressLevel.reasons && (
                <ul className="space-y-2">
                  {selectedCareer.stressLevel.reasons.map((reason, index) => (
                    <li key={index} className="text-sm opacity-90 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Salary Timeline */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">Salary Timeline (India)</h2>
              </div>
              <div className="space-y-3">
                {selectedCareer.salaryTimeline.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-700">Year {item.year}</span>
                      <span className="text-sm text-gray-600 ml-2">({item.stage})</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{item.annual}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Roadmap */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-800">Career Roadmap</h2>
              </div>
              <div className="space-y-4">
                {selectedCareer.roadmap.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {step.step}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-gray-800">{step.title}</p>
                      <p className="text-sm text-gray-600">{step.description}</p>
                      <p className="text-xs text-indigo-600 mt-1">Duration: {step.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Future Preview */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center space-x-2 mb-4">
                <Briefcase className="h-6 w-6" />
                <h2 className="text-xl font-bold">Future Preview</h2>
              </div>
              <p className="text-indigo-100 leading-relaxed">{selectedCareer.futurePreview}</p>
            </div>

            {/* Pros & Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold text-green-600 mb-4">✓ Pros</h3>
                <ul className="space-y-2">
                  {selectedCareer.pros.map((pro, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span className="text-gray-700">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold text-red-600 mb-4">✗ Cons</h3>
                <ul className="space-y-2">
                  {selectedCareer.cons.map((con, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span className="text-gray-700">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Career Reality Simulator</h1>
                <p className="text-sm text-gray-600">Explore life after school</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Choose Your Career Path</h2>
            <p className="text-gray-600">
              Select a career to see what your daily life, salary, and journey would look like.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(CAREERS).map(([id, career]) => (
              <button
                key={id}
                onClick={() => handleCareerSelect(id)}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-lg transition-all text-left hover:border-indigo-300"
              >
                <div className="text-4xl mb-3">{career.icon}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{career.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{career.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className={`px-2 py-1 rounded ${getStressColor(career.stressLevel)}`}>
                    {typeof career.stressLevel === 'string' ? career.stressLevel : career.stressLevel.level} Stress
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CareerRealitySimulator;
