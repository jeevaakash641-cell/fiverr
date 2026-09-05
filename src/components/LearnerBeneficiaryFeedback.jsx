import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchCourseFeedbackStatus,
  submitCourseFeedback,
  fetchMyCourseFeedback
} from '../services/beneficiaryFeedbackService';
import { fetchCourseById } from '../services/courseService';
import {
  MessageSquare, ArrowLeft, CheckCircle2, AlertCircle,
  HelpCircle, Sparkles, Send, ShieldAlert, BookOpen, Clock,
  ChevronRight, RefreshCw, Star, ThumbsUp, ThumbsDown,
  Shield, Check, Heart, Award, ArrowRight
} from 'lucide-react';

const RATING_OPTIONS = [
  { value: 1, title: 'Not at all', desc: 'Did not meet expectations' },
  { value: 2, title: 'Slightly', desc: 'A small amount of value' },
  { value: 3, title: 'Moderately', desc: 'Reasonably helpful' },
  { value: 4, title: 'Very', desc: 'Substantially helpful' },
  { value: 5, title: 'Extremely', desc: 'Transformative and essential' }
];

const CONSENT_OPTIONS = [
  {
    value: 'none',
    title: 'No, I do not give permission',
    desc: 'Keep my feedback private for internal training evaluation only.'
  },
  {
    value: 'anonymous',
    title: 'Yes, but only anonymously',
    desc: 'You may quote my words in reports or testimonials without mentioning my name.'
  },
  {
    value: 'named',
    title: 'Yes, my name may be used',
    desc: 'You may use my feedback alongside my first name in community testimonials.'
  }
];

const LearnerBeneficiaryFeedback = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [existingFeedback, setExistingFeedback] = useState(null);

  // Form State (Note: testimonialConsent defaults to '' to guarantee NO pre-selection)
  const [formData, setFormData] = useState({
    usefulnessRating: null,
    confidenceRating: null,
    mostUsefulLearning: '',
    intendedChange: '',
    nextLearning: '',
    wouldRecommend: '',
    testimonialConsent: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [courseData, status] = await Promise.all([
          fetchCourseById(courseId).catch(() => null),
          fetchCourseFeedbackStatus(courseId, user)
        ]);
        setCourse(courseData);
        setStatusInfo(status);

        if (status.alreadySubmitted) {
          const myFb = await fetchMyCourseFeedback(courseId, user).catch(() => null);
          setExistingFeedback(myFb || status.feedback);
        }
      } catch (err) {
        console.error('Failed to load feedback status:', err);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) init();
  }, [courseId, user]);

  const validateForm = () => {
    const errs = {};

    if (!formData.usefulnessRating) {
      errs.usefulnessRating = 'Please rate how useful this training was (1 to 5).';
    }

    if (!formData.confidenceRating) {
      errs.confidenceRating = 'Please rate whether you feel more confident (1 to 5).';
    }

    if (!formData.mostUsefulLearning.trim()) {
      errs.mostUsefulLearning = 'Please tell us what was the most useful thing you learned.';
    } else if (formData.mostUsefulLearning.length > 2000) {
      errs.mostUsefulLearning = 'Response exceeds 2000 characters.';
    }

    if (!formData.intendedChange.trim()) {
      errs.intendedChange = 'Please tell us what you plan to do differently.';
    } else if (formData.intendedChange.length > 2000) {
      errs.intendedChange = 'Response exceeds 2000 characters.';
    }

    if (formData.nextLearning.length > 2000) {
      errs.nextLearning = 'Response exceeds 2000 characters.';
    }

    if (!formData.wouldRecommend) {
      errs.wouldRecommend = 'Please let us know if you would recommend this training.';
    }

    if (!formData.testimonialConsent) {
      errs.testimonialConsent = 'Please select a testimonial and case-study permission choice.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitCourseFeedback(courseId, formData, user);
      if (res && res.success) {
        setSubmittedSuccess(true);
        setExistingFeedback(res.feedback);
      }
    } catch (err) {
      setErrors({ global: err.message || 'Failed to submit feedback. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-700">Checking feedback eligibility...</p>
        </div>
      </div>
    );
  }

  // Course content incomplete
  if (statusInfo && !statusInfo.eligible && !statusInfo.alreadySubmitted) {
    if (statusInfo.afterAssessmentRequired) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 p-6 shadow-md text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
              <Award className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-black text-gray-900">Final Assessment Pending</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              {statusInfo.reason || 'Please complete your final course reflection assessment before providing feedback.'}
            </p>
            <div className="pt-2">
              <Link
                to={`/courses/${courseId}/after-assessment`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Award className="h-4 w-4" />
                <span>Take Final Assessment</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 p-6 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-black text-gray-900">Course Content Incomplete</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {statusInfo.reason || 'Complete the required course content before providing feedback.'}
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

  // Already submitted / Success Confirmation Screen
  if (statusInfo?.alreadySubmitted || submittedSuccess) {
    const fb = existingFeedback || statusInfo?.feedback || {};

    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-gray-50 to-white pb-20">
        <header className="bg-white border-b sticky top-0 z-20 shadow-2xs">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>My Dashboard</span>
            </Link>
            <span className="text-xs font-extrabold text-[#23735F] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Feedback Submitted ✓
            </span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div className="p-8 rounded-2xl bg-white border border-emerald-200 shadow-md text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-[#23735F]">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h1 className="text-xl font-black text-gray-900">
              Thank you for sharing your experience!
            </h1>

            <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
              Your feedback will help One Community Ely improve future training and support more community members across Cambridgeshire.
            </p>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-600">Course:</span>
                <span className="font-extrabold text-gray-900">{course?.title || fb.courseTitle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-600">Usefulness Rating:</span>
                <span className="font-bold text-[#23735F]">{fb.usefulnessRating} / 5 ({fb.usefulnessLabel})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-600">Confidence Rating:</span>
                <span className="font-bold text-[#23735F]">{fb.confidenceRating} / 5 ({fb.confidenceLabel})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-600">Would Recommend:</span>
                <span className="font-bold text-gray-900 uppercase">{fb.wouldRecommend}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-600">Testimonial Consent:</span>
                <span className="font-bold text-gray-900 capitalize">{fb.testimonialConsent}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link
                to={`/courses/${courseId}/certificate`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <Award className="h-4 w-4" />
                <span>View Certificate</span>
              </Link>
              <Link
                to={`/courses/${courseId}/learn`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors inline-flex items-center justify-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                <span>Review Course</span>
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-gray-50 to-white pb-20">
      {/* Header */}
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
            Beneficiary Feedback
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Intro Guidance Card */}
        <div className="p-6 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 text-[#23735F] shrink-0 mt-0.5">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
              One Community Ely Online Training Centre
            </span>
            <h1 className="text-lg font-black text-gray-900">
              Beneficiary Training Feedback: {course?.title || 'Course'}
            </h1>
            <p className="text-xs text-gray-600 leading-relaxed">
              Your feedback helps One Community Ely understand the impact of our training and improve future sessions for adult community members. This is respectful, simple and confidential.
            </p>
          </div>
        </div>

        {errors.global && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question 1: How useful was this training? */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-black text-gray-900">
                1. How useful was this training? <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-gray-400">Required</span>
            </div>
            <p className="text-xs text-gray-500">Rate from 1 (Not at all) to 5 (Extremely):</p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1">
              {RATING_OPTIONS.map((opt) => {
                const isSelected = formData.usefulnessRating === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, usefulnessRating: opt.value })}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                      isSelected
                        ? 'bg-[#23735F] text-white border-[#23735F] shadow-sm ring-2 ring-[#23735F]/20'
                        : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                    }`}
                  >
                    <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {opt.value}
                    </span>
                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                      {opt.title}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.usefulnessRating && (
              <p className="text-xs text-red-600 font-semibold mt-1">{errors.usefulnessRating}</p>
            )}
          </div>

          {/* Question 2: Do you feel more confident? */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-black text-gray-900">
                2. Do you feel more confident? <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-gray-400">Required</span>
            </div>
            <p className="text-xs text-gray-500">Rate from 1 (Not at all) to 5 (Extremely):</p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1">
              {RATING_OPTIONS.map((opt) => {
                const isSelected = formData.confidenceRating === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, confidenceRating: opt.value })}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                      isSelected
                        ? 'bg-[#23735F] text-white border-[#23735F] shadow-sm ring-2 ring-[#23735F]/20'
                        : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                    }`}
                  >
                    <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {opt.value}
                    </span>
                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                      {opt.title}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.confidenceRating && (
              <p className="text-xs text-red-600 font-semibold mt-1">{errors.confidenceRating}</p>
            )}
          </div>

          {/* Question 3: What was the most useful thing you learned? */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-black text-gray-900">
                3. What was the most useful thing you learned? <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-gray-400">Required</span>
            </div>
            <textarea
              rows={3}
              value={formData.mostUsefulLearning}
              onChange={(e) => setFormData({ ...formData, mostUsefulLearning: e.target.value })}
              placeholder="Tell us about a specific skill, topic or tool that helped you most..."
              className="w-full p-3.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F] leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Share freely; there are no right or wrong answers.</span>
              <span>{formData.mostUsefulLearning.length} / 2000</span>
            </div>
            {errors.mostUsefulLearning && (
              <p className="text-xs text-red-600 font-semibold">{errors.mostUsefulLearning}</p>
            )}
          </div>

          {/* Question 4: What will you do differently? */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-black text-gray-900">
                4. What will you do differently? <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-gray-400">Required</span>
            </div>
            <textarea
              rows={3}
              value={formData.intendedChange}
              onChange={(e) => setFormData({ ...formData, intendedChange: e.target.value })}
              placeholder="Describe any practical actions, habits, or routines you plan to use in daily life or work..."
              className="w-full p-3.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F] leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Intended real-world behavior or application.</span>
              <span>{formData.intendedChange.length} / 2000</span>
            </div>
            {errors.intendedChange && (
              <p className="text-xs text-red-600 font-semibold">{errors.intendedChange}</p>
            )}
          </div>

          {/* Question 5: What would you like to learn next? */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-black text-gray-900">
                5. What would you like to learn next?
              </label>
              <span className="text-[11px] font-bold text-gray-400">Optional</span>
            </div>
            <textarea
              rows={2}
              value={formData.nextLearning}
              onChange={(e) => setFormData({ ...formData, nextLearning: e.target.value })}
              placeholder="Topics, courses, or digital skills you would like One Community Ely to offer next..."
              className="w-full p-3.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F] leading-relaxed"
            />
            <div className="flex items-center justify-end text-[11px] text-gray-400">
              <span>{formData.nextLearning.length} / 2000</span>
            </div>
            {errors.nextLearning && (
              <p className="text-xs text-red-600 font-semibold">{errors.nextLearning}</p>
            )}
          </div>

          {/* Question 6: Would you recommend this training? */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-black text-gray-900">
                6. Would you recommend this training? <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-gray-400">Required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, wouldRecommend: 'yes' })}
                className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  formData.wouldRecommend === 'yes'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  formData.wouldRecommend === 'yes' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <ThumbsUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">Yes</p>
                  <p className="text-[11px] text-gray-500">I would recommend this training to others</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, wouldRecommend: 'no' })}
                className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  formData.wouldRecommend === 'no'
                    ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-400/20 shadow-xs'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  formData.wouldRecommend === 'no' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <ThumbsDown className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">No</p>
                  <p className="text-[11px] text-gray-500">I would not recommend this training</p>
                </div>
              </button>
            </div>
            {errors.wouldRecommend && (
              <p className="text-xs text-red-600 font-semibold mt-1">{errors.wouldRecommend}</p>
            )}
          </div>

          {/* Question 7: Testimonial and Case-Study Consent */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-black text-gray-900">
                7. Testimonial & Case-Study Permission <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-gray-400">Required</span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Do you give One Community Ely CIC permission to use your feedback as a testimonial or as part of an anonymised case study?
            </p>

            <div className="space-y-2 pt-1">
              {CONSENT_OPTIONS.map((opt) => {
                const isSelected = formData.testimonialConsent === opt.value;
                return (
                  <label
                    key={opt.value}
                    onClick={() => setFormData({ ...formData, testimonialConsent: opt.value })}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-[#23735F] ring-1 ring-[#23735F]'
                        : 'bg-white hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="testimonialConsent"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 text-[#23735F] focus:ring-[#23735F]"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-gray-900">{opt.title}</p>
                      <p className="text-[11px] text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="text-[11px] text-gray-400 italic pt-1">
              Note: Refusing permission will not prevent course completion or affect future access to One Community Ely training. You can contact us to withdraw consent at any time.
            </p>

            {errors.testimonialConsent && (
              <p className="text-xs text-red-600 font-semibold mt-1">{errors.testimonialConsent}</p>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-2">
            <Link
              to={`/courses/${courseId}`}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Submit Feedback</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default LearnerBeneficiaryFeedback;
