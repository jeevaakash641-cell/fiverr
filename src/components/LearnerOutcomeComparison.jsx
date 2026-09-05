import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchCourseOutcomeResult } from '../services/afterAssessmentService';
import { getCourseById } from '../services/courseService';
import {
  Award, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown,
  Minus, RefreshCw, BookOpen, LayoutDashboard, Sparkles,
  HelpCircle, Info, ArrowRight, HeartHandshake, Check, MessageSquare
} from 'lucide-react';

const LearnerOutcomeComparison = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [courseData, result] = await Promise.all([
          getCourseById(courseId),
          fetchCourseOutcomeResult(courseId, user)
        ]);
        setCourse(courseData);
        setOutcome(result);
      } catch (err) {
        console.error('Failed to load outcome comparison:', err);
        setError(err.message || 'Outcome comparison not found.');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) init();
  }, [courseId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-700">Loading your outcome comparison...</p>
        </div>
      </div>
    );
  }

  if (error || !outcome) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 shadow-md text-center space-y-4">
          <Award className="h-10 w-10 text-gray-400 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">Outcome Not Found</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {error || 'You have not yet completed the final assessment for this course.'}
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Link
              to={`/courses/${courseId}`}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold"
            >
              Course Overview
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold"
            >
              My Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const comp = outcome.comparison || {};
  const avgBase = comp.averageBaseline;
  const avgFin = comp.averageFinal;
  const avgChg = comp.averageChange;
  const questionComparisons = comp.questionComparisons || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-gray-50 to-white pb-20">
      {/* Top Header */}
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
            Final Outcome Summary
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Celebration & Guidance Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-emerald-700 via-[#23735F] to-teal-800 text-white shadow-md relative overflow-hidden space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-emerald-200">
                Course Completed • Outcome Comparison
              </span>
              <h1 className="text-lg sm:text-xl font-black">{course?.title || outcome.courseTitle}</h1>
            </div>
          </div>

          <p className="text-xs text-white/95 leading-relaxed pt-1 border-t border-white/15">
            Your answers show a change in confidence after completing the course. This assessment helps you and One Community Ely understand what changed during your training. It is not a pass-or-fail test.
          </p>
        </div>

        {/* Confidence Averages Grid */}
        {comp.hasValidComparison ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Confidence Summary (1 to 5 Scale)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Starting Benchmark</span>
                <p className="text-2xl font-black text-gray-800">{avgBase} / 5</p>
                <span className="text-[11px] text-gray-500">Average before training</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Final Confidence</span>
                <p className="text-2xl font-black text-[#23735F]">{avgFin} / 5</p>
                <span className="text-[11px] text-emerald-700">Average after completion</span>
              </div>

              <div className={`p-4 rounded-xl border text-center space-y-1 ${
                avgChg > 0
                  ? 'bg-emerald-50 border-emerald-300'
                  : avgChg === 0
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-amber-50 border-amber-300'
              }`}>
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Confidence Shift</span>
                <p className={`text-2xl font-black flex items-center justify-center gap-1 ${
                  avgChg > 0 ? 'text-emerald-800' : avgChg === 0 ? 'text-blue-800' : 'text-amber-800'
                }`}>
                  {avgChg > 0 ? <TrendingUp className="h-5 w-5" /> : avgChg === 0 ? <Minus className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span>{avgChg > 0 ? `+${avgChg}` : avgChg}</span>
                </p>
                <span className="text-[11px] font-semibold text-gray-600">
                  {avgChg > 0 ? 'Overall Confidence Increased' : avgChg === 0 ? 'Confidence Maintained' : 'Area for Ongoing Practice'}
                </span>
              </div>
            </div>

            {/* Counts breakdown */}
            <div className="flex items-center justify-center gap-4 flex-wrap pt-2 text-xs font-semibold text-gray-600">
              {comp.improvedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <Check className="h-3.5 w-3.5" />
                  <span>{comp.improvedCount} Area{comp.improvedCount > 1 ? 's' : ''} Increased</span>
                </span>
              )}
              {comp.maintainedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  <Minus className="h-3.5 w-3.5" />
                  <span>{comp.maintainedCount} Area{comp.maintainedCount > 1 ? 's' : ''} Consistent</span>
                </span>
              )}
              {comp.reducedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <Info className="h-3.5 w-3.5" />
                  <span>{comp.reducedCount} Area{comp.reducedCount > 1 ? 's' : ''} for Continued Practice</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs text-center text-xs text-gray-500">
            Outcome comparison metrics will display when final questions are linked with starting baseline responses.
          </div>
        )}

        {/* Question by Question Comparisons */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="border-b pb-3">
            <h2 className="text-base font-black text-gray-900">Your Question-by-Question Reflections</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparison between your starting point and completion
            </p>
          </div>

          <div className="space-y-4">
            {questionComparisons.map((item, idx) => {
              const isConfidence = item.type === 'confidence_rating';

              if (!isConfidence) {
                return (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-2">
                    <p className="text-xs font-black text-gray-900">{idx + 1}. {item.questionText}</p>
                    <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                      {item.answerText || <span className="italic text-gray-400">No response provided</span>}
                    </div>
                  </div>
                );
              }

              const isCompared = item.status === 'compared';

              return (
                <div key={idx} className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-3">
                  <p className="text-xs font-black text-gray-900">{idx + 1}. {item.questionText}</p>

                  {isCompared ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                        {/* Before */}
                        <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Before:</span>
                          <span className="text-xs font-black text-gray-700">{item.baselineRating} / 5</span>
                          <span className="text-[11px] text-gray-500">({item.baselineLabel})</span>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />

                        {/* After */}
                        <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">After:</span>
                          <span className="text-xs font-black text-[#23735F]">{item.finalRating} / 5</span>
                          <span className="text-[11px] text-emerald-800">({item.finalLabel})</span>
                        </div>

                        {/* Shift Badge */}
                        <div className={`px-3 py-1 rounded-lg text-xs font-black border flex items-center gap-1 ${
                          item.change > 0
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : item.change === 0
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {item.change > 0 ? `+${item.change} Increased` : item.change === 0 ? 'Consistent' : `${item.change} Lower`}
                        </div>
                      </div>

                      {/* Supportive feedback line */}
                      <p className={`text-xs font-medium pl-1 ${
                        item.change > 0 ? 'text-emerald-800' : item.change === 0 ? 'text-blue-800' : 'text-amber-800'
                      }`}>
                        {item.change > 0
                          ? 'Your confidence increased.'
                          : item.change === 0
                          ? 'Your confidence remained consistent.'
                          : 'Your confidence was lower in this area. You may benefit from reviewing the course or receiving additional support.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Final Rating:</span>
                        <span className="text-xs font-black text-[#23735F]">{item.finalRating} / 5</span>
                        <span className="text-[11px] text-gray-600">({item.finalLabel})</span>
                      </div>
                      <span className="text-xs text-gray-400 italic">
                        Comparison unavailable
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            to={`/courses/${courseId}/learn`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors inline-flex items-center justify-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            <span>Review Course Content</span>
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to={`/courses/${courseId}/feedback`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Give Course Feedback</span>
            </Link>

            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LearnerOutcomeComparison;
