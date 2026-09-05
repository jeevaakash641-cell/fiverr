import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchCourseAfterEligibility,
  fetchCourseAfterAssessment,
  submitAfterResponse
} from '../services/afterAssessmentService';
import { getCourseById } from '../services/courseService';
import {
  Award, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle,
  HelpCircle, Sparkles, Send, ShieldAlert, BookOpen, Clock,
  ChevronRight, RefreshCw, Star, Info
} from 'lucide-react';

const CONFIDENCE_OPTIONS = [
  { value: 1, label: '1', title: 'Not confident', desc: 'I do not feel confident about this yet' },
  { value: 2, label: '2', title: 'Slightly confident', desc: 'I have some doubts and need guidance' },
  { value: 3, label: '3', title: 'Moderately confident', desc: 'I feel reasonably okay with the basics' },
  { value: 4, label: '4', title: 'Confident', desc: 'I feel good about doing this independently' },
  { value: 5, label: '5', title: 'Very confident', desc: 'I feel completely secure and self-assured' }
];

const LearnerAfterAssessment = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  // Wizard state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [validationError, setValidationError] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [courseData, elig] = await Promise.all([
          getCourseById(courseId),
          fetchCourseAfterEligibility(courseId, user)
        ]);
        setCourse(courseData);
        setEligibility(elig);

        if (elig.hasAssessment && elig.assessment) {
          setAssessment(elig.assessment);
        } else if (elig.eligible) {
          const loadedAss = await fetchCourseAfterAssessment(courseId, user);
          setAssessment(loadedAss);
        }
      } catch (err) {
        console.error('Failed to load final assessment:', err);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) init();
  }, [courseId, user]);

  const questions = assessment?.questions || [];
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSelectConfidence = (val) => {
    if (!currentQuestion) return;
    setValidationError('');
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.questionId]: val
    }));
  };

  const handleTextChange = (text) => {
    if (!currentQuestion) return;
    setValidationError('');
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.questionId]: text
    }));
  };

  const validateCurrent = () => {
    if (!currentQuestion) return true;
    if (currentQuestion.required) {
      const val = answers[currentQuestion.questionId];
      if (val === undefined || val === null || val === '') {
        setValidationError('Please answer this question before continuing.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrent()) return;

    if (isLastQuestion) {
      setIsReviewing(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setValidationError('');
    if (isReviewing) {
      setIsReviewing(false);
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setValidationError('');
    try {
      const res = await submitAfterResponse(assessment.assessmentId, answers, user);
      if (res && res.success) {
        navigate(`/courses/${courseId}/outcome-comparison`);
      }
    } catch (err) {
      setValidationError(err.message || 'Failed to submit final assessment.');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-700">Checking course completion...</p>
        </div>
      </div>
    );
  }

  // Learner Ineligible (< 100% progress)
  if (eligibility && !eligibility.eligible && !eligibility.completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 p-6 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-black text-gray-900">Course Content Incomplete</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {eligibility.reason || 'Complete the required course content before taking the final assessment.'}
          </p>
          <div className="pt-2">
            <Link
              to={`/courses/${courseId}/learn`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>Resume Course Lessons</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Already Completed
  if (eligibility?.completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-200 p-6 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-black text-gray-900">Final Assessment Completed</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            You have already completed your final reflections and confidence assessment for this course.
          </p>
          <div className="pt-2">
            <Link
              to={`/courses/${courseId}/outcome-comparison`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>View My Outcome Comparison</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-md text-center space-y-4">
          <Award className="h-10 w-10 text-gray-400 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">No Final Assessment Active</h2>
          <p className="text-xs text-gray-500">
            There is currently no final outcome assessment published for this course.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-4 py-2 bg-[#23735F] text-white text-xs font-bold rounded-xl hover:bg-[#1b5b4b]"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const answeredCount = questions.filter(q => {
    const val = answers[q.questionId];
    return val !== undefined && val !== null && val !== '';
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-gray-50 to-white pb-20">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Course Overview</span>
          </Link>
          <span className="text-xs font-extrabold text-[#23735F] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Post-Course Reflection
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Friendly Guidance Banner */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900">{assessment.title}</h1>
            <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
              {assessment.instructions || 'This short assessment helps you and One Community Ely understand what changed during your training. It is not a pass-or-fail test.'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{answeredCount} of {questions.length} Answered</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#23735F] transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Question or Review Screen */}
        {!isReviewing ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {currentQuestion.type === 'confidence_rating' ? 'Confidence Rating' : 'Written Reflection'}
                </span>
                {currentQuestion.required && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Required
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-gray-900 leading-snug">
                {currentQuestion.questionText}
              </h2>
            </div>

            {/* Answer Input */}
            {currentQuestion.type === 'confidence_rating' ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-gray-500 font-medium">
                  Select how confident you feel now after completing your training (1 to 5):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {CONFIDENCE_OPTIONS.map((opt) => {
                    const isSelected = answers[currentQuestion.questionId] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectConfidence(opt.value)}
                        className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                          isSelected
                            ? 'bg-[#23735F] text-white border-[#23735F] shadow-sm ring-2 ring-[#23735F]/20'
                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300'
                        }`}
                      >
                        <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {opt.label}
                        </span>
                        <span className={`text-[11px] font-extrabold leading-tight ${isSelected ? 'text-white/95' : 'text-gray-800'}`}>
                          {opt.title}
                        </span>
                        <span className={`text-[10px] line-clamp-2 leading-tight hidden sm:block ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <textarea
                  rows={4}
                  value={answers[currentQuestion.questionId] || ''}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Type your answer here...'}
                  className="w-full p-4 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F] focus:border-transparent transition-all leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>Take your time to share what stood out to you.</span>
                  <span>{(answers[currentQuestion.questionId] || '').length} / 1000</span>
                </div>
              </div>
            )}

            {validationError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>{isLastQuestion ? 'Review Answers' : 'Next Question'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Review Answers State */
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-black text-gray-900">Review Your Responses</h2>
              <p className="text-xs text-gray-500">
                Please double check your answers. Once submitted, your outcome comparison will be generated.
              </p>
            </div>

            <div className="space-y-3 divide-y divide-gray-100">
              {questions.map((q, idx) => {
                const val = answers[q.questionId];
                const isConfidence = q.type === 'confidence_rating';

                return (
                  <div key={q.questionId} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900">
                        {idx + 1}. {q.questionText}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsReviewing(false);
                          setCurrentIndex(idx);
                        }}
                        className="text-[11px] font-bold text-[#23735F] hover:underline shrink-0"
                      >
                        Change
                      </button>
                    </div>

                    {isConfidence ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                          Rating: {val ? `${val} / 5` : 'Not answered'}
                        </span>
                        {val && (
                          <span className="text-xs text-gray-600 font-medium">
                            ({CONFIDENCE_OPTIONS.find(o => o.value === val)?.title})
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg whitespace-pre-wrap">
                        {val || <span className="italic text-gray-400">No response entered</span>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {validationError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100"
              >
                Back to Questions
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-6 py-2.5 rounded-xl bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Submit Final Assessment</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-[#23735F]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-gray-900">Ready to Submit?</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your final answers will be saved and compared with your starting benchmark to display what changed during your training.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Review Again
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Yes, Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerAfterAssessment;
