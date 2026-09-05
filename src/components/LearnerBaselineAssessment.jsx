import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchCourseBaselineAssessment,
  submitBaselineResponse,
  fetchCourseBaselineStatus
} from '../services/baselineAssessmentService';
import { startCourse, fetchCourseProgress } from '../services/progressService';
import {
  ArrowLeft, ArrowRight, CheckCircle, AlertCircle, RefreshCw,
  BookOpen, HelpCircle, Send, Check, ShieldCheck, Heart
} from 'lucide-react';

const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Not confident', desc: 'I have little or no familiarity' },
  { value: 2, label: 'Slightly confident', desc: 'I have seen it but need guidance' },
  { value: 3, label: 'Moderately confident', desc: 'I can manage basic tasks' },
  { value: 4, label: 'Confident', desc: 'I feel comfortable doing this' },
  { value: 5, label: 'Very confident', desc: 'I feel completely confident' }
];

const LearnerBaselineAssessment = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startingCourse, setStartingCourse] = useState(false);

  // Assessment State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // Errors & Alerts
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Load Baseline Assessment & Status
  useEffect(() => {
    let isMounted = true;

    async function loadAssessment() {
      setLoading(true);
      setErrorMsg('');

      try {
        // Check if already completed
        const status = await fetchCourseBaselineStatus(courseId, user);
        if (status.completed) {
          if (isMounted) {
            setAlreadyCompleted(true);
            setLoading(false);
          }
          return;
        }

        // Fetch active published baseline assessment
        const data = await fetchCourseBaselineAssessment(courseId, user);
        if (isMounted) {
          setAssessment(data);
          // Initialize answers map
          const initial = {};
          (data.questions || []).forEach(q => {
            initial[q.questionId] = q.type === 'confidence_rating' ? null : '';
          });
          setAnswers(initial);
        }
      } catch (err) {
        console.error('Failed to load baseline assessment:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'No active baseline assessment found for this course.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (courseId) {
      loadAssessment();
    }

    return () => { isMounted = false; };
  }, [courseId, user]);

  const questions = assessment?.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // Answer change handlers
  const handleAnswerChange = (val) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.questionId]: val
    }));
  };

  // Next / Previous Navigation
  const handleNext = () => {
    if (currentQuestion?.required) {
      const val = answers[currentQuestion.questionId];
      if (val === null || val === undefined || val === '') {
        setErrorMsg('Please select or provide an answer before continuing.');
        return;
      }
    }
    setErrorMsg('');

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsReviewMode(true);
    }
  };

  const handlePrev = () => {
    setErrorMsg('');
    if (isReviewMode) {
      setIsReviewMode(false);
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Submit Baseline Assessment
  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    setErrorMsg('');

    try {
      await submitBaselineResponse(assessment.assessmentId, answers, user);
      setSubmissionComplete(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit your assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Start / Continue to Course after submission
  const handleBeginCourse = async () => {
    setStartingCourse(true);
    try {
      await startCourse(courseId, user);
      navigate(`/courses/${courseId}/learn`);
    } catch (err) {
      console.error('Error starting course after baseline:', err);
      // Navigate anyway if course progress was already in progress
      navigate(`/courses/${courseId}/learn`);
    } finally {
      setStartingCourse(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xs border border-gray-200">
          <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto mb-3" />
          <h2 className="text-base font-bold text-gray-800">Loading Baseline Assessment...</h2>
          <p className="text-xs text-gray-500 mt-1">One Community Ely Training Centre</p>
        </div>
      </div>
    );
  }

  // Already Completed Screen
  if (alreadyCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl p-8 border border-gray-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-black text-gray-900">Baseline Assessment Already Completed</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            You have already submitted your starting-point assessment for this course. Your starting knowledge and confidence benchmarks are safely recorded.
          </p>
          <div className="pt-2">
            <button
              onClick={handleBeginCourse}
              disabled={startingCourse}
              className="w-full py-3 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {startingCourse ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              <span>Continue to Course</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found Screen
  if (!assessment || errorMsg && !assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl p-8 border border-gray-200 shadow-sm text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-black text-gray-900">Assessment Not Found</h2>
          <p className="text-xs text-gray-600">
            {errorMsg || 'No active baseline assessment is published for this course.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors"
            >
              Back to Course Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Post-Submission Success Screen ---
  if (submissionComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full rounded-2xl p-8 border border-gray-200 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-gray-900">Starting-Point Recorded!</h2>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Thank you. Your starting-point assessment has been saved. You can now begin your course.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-left space-y-1">
            <p className="text-xs font-bold text-gray-700">Course: {assessment.courseTitle}</p>
            <p className="text-[11px] text-gray-500">
              Your initial responses help One Community Ely provide responsive and tailored learning support.
            </p>
          </div>

          <button
            onClick={handleBeginCourse}
            disabled={startingCourse}
            className="w-full py-3.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-sm font-extrabold shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {startingCourse ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            <span>Start Course Now</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to={`/courses/${courseId}`}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Course Overview</span>
          </Link>
          <div className="text-right">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#23735F] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Starting Point Assessment
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Friendly Guidance Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-5 flex items-start gap-3.5">
          <Heart className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
              A Warm Welcome
            </h3>
            <p className="text-xs text-emerald-900 leading-relaxed">
              {assessment.instructions || 'This short assessment helps us understand your starting point. It is not a test, and there are no pass or fail results.'}
            </p>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          {/* Progress Header */}
          <div className="p-5 border-b bg-gray-50/60">
            <div className="flex items-center justify-between text-xs font-extrabold text-gray-500 mb-2">
              <span className="text-[#23735F] font-bold truncate max-w-[250px]">
                {assessment.title}
              </span>
              <span>
                {isReviewMode ? 'Review & Submit' : `Question ${currentIndex + 1} of ${totalQuestions}`}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#23735F] transition-all duration-300 rounded-full"
                style={{
                  width: `${isReviewMode ? 100 : Math.round(((currentIndex + 1) / totalQuestions) * 100)}%`
                }}
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800 font-medium animate-fade-in">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!isReviewMode && currentQuestion ? (
              <div className="space-y-6">
                {/* Question Text */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Question {currentIndex + 1} {currentQuestion.required && <span className="text-red-500">*</span>}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                    {currentQuestion.questionText}
                  </h2>
                </div>

                {/* Question Input Based on Type */}
                {currentQuestion.type === 'confidence_rating' ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-gray-500 font-medium">
                      Select how confident you feel today on this 1 to 5 scale:
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      {CONFIDENCE_LEVELS.map(lvl => {
                        const isSelected = answers[currentQuestion.questionId] === lvl.value;

                        return (
                          <button
                            key={lvl.value}
                            type="button"
                            onClick={() => handleAnswerChange(lvl.value)}
                            className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-emerald-50 border-[#23735F] ring-2 ring-[#23735F]/20 text-emerald-950'
                                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                isSelected ? 'bg-[#23735F] text-white' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {lvl.value}
                              </span>
                              <div>
                                <p className="text-xs font-extrabold">{lvl.label}</p>
                                <p className="text-[11px] text-gray-500">{lvl.desc}</p>
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-[#23735F] bg-[#23735F] text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Your Thoughts:
                    </label>
                    <textarea
                      rows={4}
                      value={answers[currentQuestion.questionId] || ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder={currentQuestion.placeholder || 'Type your answer here...'}
                      className="w-full p-3.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F] focus:border-transparent"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Take your time — there are no wrong answers.</span>
                      <span>{(answers[currentQuestion.questionId] || '').length}/1000</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Review Mode */
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-gray-900">Review Your Starting Answers</h2>
                  <p className="text-xs text-gray-500">
                    Check your reflections before saving. You will be ready to begin your course immediately.
                  </p>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const ans = answers[q.questionId];
                    const isConf = q.type === 'confidence_rating';

                    return (
                      <div
                        key={q.questionId || idx}
                        className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-gray-900">
                            {idx + 1}. {q.questionText}
                          </span>
                          <button
                            onClick={() => {
                              setCurrentIndex(idx);
                              setIsReviewMode(false);
                            }}
                            className="text-[#23735F] hover:underline font-bold text-[11px]"
                          >
                            Edit
                          </button>
                        </div>

                        {isConf ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px]">
                            <span>Rating: {ans ? `${ans} — ${CONFIDENCE_LEVELS.find(l => l.value === ans)?.label}` : 'Not provided'}</span>
                          </div>
                        ) : (
                          <p className="text-gray-700 bg-white p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">
                            {ans || <span className="text-gray-400 italic">No answer entered</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-5 border-t bg-gray-50 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0 && !isReviewMode}
              className="px-4 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 disabled:opacity-30 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            {!isReviewMode ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>{currentIndex === totalQuestions - 1 ? 'Review Answers' : 'Next Question'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-6 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Save Starting Assessment</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-gray-200 shadow-2xl space-y-4 text-center">
            <ShieldCheck className="h-10 w-10 text-[#23735F] mx-auto" />
            <h3 className="text-base font-black text-gray-900">Ready to Submit?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Your starting reflections will be saved for this course. Once saved, you can immediately begin your lessons.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerBaselineAssessment;
