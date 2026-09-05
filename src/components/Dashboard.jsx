import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchLearnerDashboardSummary } from '../services/dashboardService';
import { selectCourse } from '../services/recommendationService';
import { downloadCertificatePdf } from '../services/certificateService';
import {
  Award, BookOpen, CheckCircle2, ChevronRight, Compass, ArrowRight,
  Sparkles, RefreshCw, AlertCircle, Clock, FileText, CheckCircle,
  HelpCircle, GraduationCap, TrendingUp, MessageSquare, ShieldCheck,
  Shield, Layers, LogOut, Settings as SettingsIcon, History as HistoryIcon, Brain, Video,
  Heart, Target, ExternalLink, Calendar, PlayCircle, Star, Lock, Inbox, Plus
} from 'lucide-react';
import Feedback from './Feedback';
import ContentRequestModal from './ContentRequestModal';
import NotificationBell from './NotificationBell';

const Dashboard = () => {
  const { user, logout, predictions } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`dashboard_cache_${user?.email || 'default'}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`dashboard_cache_${user?.email || 'default'}`);
      return !cached;
    } catch {
      return true;
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectingCourseId, setSelectingCourseId] = useState(null);
  const [requestModalState, setRequestModalState] = useState({
    isOpen: false,
    courseId: '',
    courseTitle: '',
    requestType: 'quiz'
  });

  const handleOpenContentRequest = (courseId, courseTitle, requestType) => {
    setRequestModalState({
      isOpen: true,
      courseId,
      courseTitle,
      requestType
    });
  };

  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!summary) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchLearnerDashboardSummary(user);
      setSummary(data);
      if (user?.email) {
        try {
          sessionStorage.setItem(`dashboard_cache_${user.email}`, JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      if (!summary) {
        setError(err.message || 'We could not load this section. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.userType === 'teacher' || user.role === 'admin') {
      navigate('/admin-panel');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSelectRecommendedCourse = async (rec) => {
    setSelectingCourseId(rec.courseId);
    try {
      if (user?.email) {
        try { sessionStorage.removeItem(`dashboard_cache_${user.email}`); } catch {}
      }
      await selectCourse(rec.courseId, 'recommendation', rec.recommendationReason, user);
      await loadDashboardData(true);
    } catch (err) {
      alert(err.message || 'Failed to select course');
    } finally {
      setSelectingCourseId(null);
    }
  };

  const handleDownloadCert = async (cert) => {
    try {
      await downloadCertificatePdf(cert.certificateId, cert.certificateNumber, user);
    } catch (err) {
      alert(err.message || 'Failed to download certificate');
    }
  };

  if (!user) return null;

  const isAdmin = user.userType === 'teacher' || user.role === 'admin';

  // Fallbacks
  const profile = summary?.learnerProfile || {
    name: user.name || user.displayName || user.email?.split('@')[0],
    email: user.email,
    learningInterest: ''
  };

  const nextAction = summary?.nextAction;
  const counts = summary?.summaryCounts || {
    selectedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    certificatesCount: 0,
    lessonsCompletedCount: 0,
    quizzesPassedCount: 0
  };

  const pendingActions = summary?.pendingActions || [];
  const inProgressCourses = summary?.coursesInProgress || [];
  const notStartedCourses = summary?.coursesNotStarted || [];
  const completedCourses = summary?.coursesCompleted || [];
  const certificates = summary?.certificates || [];
  const achievements = summary?.achievements || [];
  const recommendations = summary?.recommendations || [];
  const learningJourney = summary?.learningJourney || [];
  const currentJourneyStep = summary?.currentJourneyStep || 1;

  const activeCourse = inProgressCourses[0] || notStartedCourses[0] || completedCourses[0] || null;
  const activeCourseTitle = activeCourse?.courseTitle || nextAction?.courseTitle || (learningJourney.find(m => m.courseTitle)?.courseTitle) || null;

  const quickActions = [
    { to: '/course-recommendations', icon: Compass, label: 'Course Catalog', desc: 'Interest-matched community training', color: '#059669', bg: '#ecfdf5', badge: 'Browse' },
    ...(isAdmin ? [
      { to: '/admin-panel', icon: Shield, label: 'Admin Portal', desc: 'Curriculum, assessments & feedback', color: '#059669', bg: '#ecfdf5', badge: 'Admin' },
      { to: '/upload-books', icon: BookOpen, label: 'Upload Resources', desc: 'Add new books & documents', color: '#d97706', bg: '#fffbeb' },
    ] : []),
    { to: '/ai-assistant', icon: Brain, label: 'AI Assistant', desc: 'Get help with questions & concepts', color: '#7c3aed', bg: '#f5f3ff' },
    { to: '/guide-books', icon: BookOpen, label: 'Guide Books', desc: 'Access comprehensive study resources', color: '#059669', bg: '#ecfdf5' },
    { to: '/quiz', icon: Award, label: 'Quizzes', desc: 'Knowledge checks & assessments', color: '#ca8a04', bg: '#fefce8' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="One Community Ely"
                className="h-9 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="hidden sm:block">
                <span className="text-xs font-black tracking-wider uppercase text-[#23735F] block leading-none">
                  One Community Ely
                </span>
                <span className="text-[10px] text-gray-500 font-semibold block">
                  Online Training Centre
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing || loading}
              className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#23735F]' : ''}`} />
              <span className="hidden md:inline text-[11px]">Refresh</span>
            </button>

            <Link
              to="/course-recommendations"
              className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Compass className="h-3.5 w-3.5 text-[#23735F]" />
              <span>Find Courses</span>
            </Link>

            <Link
              to="/history"
              className="px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              title="View In-Progress & Completed Courses"
            >
              <HistoryIcon className="h-3.5 w-3.5 text-blue-700" />
              <span>History</span>
            </Link>

            <button
              onClick={() => setShowFeedback(true)}
              className="px-3 py-1.5 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Share Your Feedback & Experience"
            >
              <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
              <span>Feedback</span>
            </button>

            <NotificationBell />

            {isAdmin && (
              <Link
                to="/upload-books"
                className="px-3 py-1.5 bg-[#23735F] hover:bg-[#1b5c4c] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                title="Upload Books & Materials"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Upload Book</span>
              </Link>
            )}

            <Link
              to="/settings"
              className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-xs font-bold"
              title="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-xl transition-colors text-xs font-bold"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-xs space-y-3">
            <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto" />
            <h3 className="text-sm font-black text-gray-900">Loading your learning dashboard...</h3>
            <p className="text-xs text-gray-500">Retrieving course progress, pending steps, and achievements</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
            <h3 className="text-sm font-black text-red-900">{error}</h3>
            <p className="text-xs text-red-700">We could not load this section. Please try again.</p>
            <button
              onClick={() => loadDashboardData()}
              className="px-4 py-2 bg-[#23735F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#1b5b4b]"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* 1. Welcome & High-Priority Next Action Card */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#23735F] block">
                    Adult Community Learning
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    Hello, {profile.name}. Welcome to One Community Training Centre.
                  </h1>
                </div>
                {profile.learningInterest && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold text-amber-900 self-start sm:self-auto">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    <span>Focus: {profile.learningInterest}</span>
                  </div>
                )}
              </div>

              {/* Prominent Next Action Card */}
              {nextAction && (
                <div className="relative overflow-hidden bg-gradient-to-br from-[#23735F] via-[#1d5f4e] to-[#124136] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                        {nextAction.badge || 'Recommended Next Step'}
                      </span>
                      {nextAction.courseTitle && (
                        <span className="text-xs text-emerald-200 font-semibold truncate max-w-xs">
                          {nextAction.courseTitle}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {nextAction.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                      {nextAction.description}
                    </p>
                  </div>

                  <Link
                    to={nextAction.buttonUrl || '/course-recommendations'}
                    className="w-full md:w-auto px-6 py-3 bg-white text-[#23735F] hover:bg-emerald-50 text-xs font-black rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <span>{nextAction.buttonText || 'Take Action'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </section>

            {/* Summary Metric Cards */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Selected</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{counts.selectedCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{counts.inProgressCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{counts.completedCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Certificates</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{counts.certificatesCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Lessons Done</p>
                <p className="text-2xl font-black text-purple-700 mt-1">{counts.lessonsCompletedCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Quizzes Passed</p>
                <p className="text-2xl font-black text-teal-700 mt-1">{counts.quizzesPassedCount}</p>
              </div>
            </section>

            {/* 6. Pending Actions Section (if any incomplete requirements) */}
            {pendingActions.length > 0 && (
              <section className="bg-white rounded-3xl border border-amber-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <h3 className="text-base font-black text-gray-900">Pending Actions</h3>
                  </div>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-amber-50 text-amber-900 rounded-full border border-amber-200">
                    {pendingActions.length} Pending
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingActions.map(action => (
                    <div
                      key={action.id}
                      className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-[#23735F]/40 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                            {action.badge}
                          </span>
                          <span className="text-[11px] font-bold text-gray-400 truncate max-w-[160px]">
                            {action.courseTitle}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-gray-900 mt-1">{action.title}</h4>
                        <p className="text-[11px] text-gray-600 leading-relaxed">{action.description}</p>
                      </div>

                      <Link
                        to={action.buttonUrl}
                        className="w-full py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>{action.buttonText}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Courses In Progress */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-[#23735F]" />
                  <h3 className="text-lg font-black text-gray-900">Courses in Progress</h3>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {inProgressCourses.length} active
                </span>
              </div>

              {inProgressCourses.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-8 text-center space-y-2">
                  <BookOpen className="h-8 w-8 text-gray-300 mx-auto" />
                  <h4 className="text-xs font-bold text-gray-700">No Courses In Progress</h4>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                    Start one of your selected courses below or explore our recommended training catalog.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inProgressCourses.map(c => {
                    const resumeLesson = c.resumeInfo?.targetLesson;
                    return (
                      <div
                        key={c.courseId}
                        className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#23735F] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            {c.category}
                          </span>
                          <h4 className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
                            {c.courseTitle}
                          </h4>

                          {/* Progress Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[11px] font-bold text-gray-600">
                              <span>Progress</span>
                              <span className="text-[#23735F]">{c.progressPercentage}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#23735F] rounded-full transition-all duration-300"
                                style={{ width: `${c.progressPercentage}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {c.completedLessonsCount} of {c.totalRequiredLessons} lessons completed
                            </p>
                          </div>

                          {/* Next Up / Last Visited */}
                          {resumeLesson && (
                            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px] space-y-0.5">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Current Lesson</span>
                              <p className="font-bold text-gray-800 truncate">{resumeLesson.title}</p>
                            </div>
                          )}

                          {/* Course Title Matching & Admin Content Requests */}
                          {(c.quizMismatchOrMissing || c.assessmentMismatchOrMissing) && (
                            <div className="p-2.5 bg-purple-50/70 border border-purple-200/80 rounded-xl text-[11px] space-y-1.5">
                              {c.quizMismatchOrMissing && (
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-purple-900 font-semibold truncate" title="Quiz course title must match this course">
                                    Quiz missing / title mismatch
                                  </span>
                                  {c.quizRequestPending ? (
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md shrink-0">
                                      Quiz requested — awaiting Admin ⏳
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenContentRequest(c.courseId, c.courseTitle, 'quiz')}
                                      className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors shrink-0 cursor-pointer"
                                    >
                                      Request Quiz
                                    </button>
                                  )}
                                </div>
                              )}
                              {c.assessmentMismatchOrMissing && (
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-teal-900 font-semibold truncate" title="Assessment course title must match this course">
                                    Assessment missing / mismatch
                                  </span>
                                  {c.assessmentRequestPending ? (
                                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md shrink-0">
                                      Assessment requested — awaiting Admin ⏳
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenContentRequest(c.courseId, c.courseTitle, 'assessment')}
                                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 transition-colors shrink-0 cursor-pointer"
                                    >
                                      Request Assessment
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <Link
                          to={resumeLesson ? `/courses/${c.courseId}/learn/${resumeLesson.lessonId}` : `/courses/${c.courseId}/learn`}
                          className="w-full py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <span>Continue Learning</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Not Started Courses */}
            {notStartedCourses.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-gray-700" />
                    <h3 className="text-lg font-black text-gray-900">Not Started Courses</h3>
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    {notStartedCourses.length} ready
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notStartedCourses.map(c => (
                    <div
                      key={c.courseId}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                          {c.category}
                        </span>
                        <h4 className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
                          {c.courseTitle}
                        </h4>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {c.shortDescription || 'Selected training course.'}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                          <span>{c.moduleCount} modules</span>
                          <span>•</span>
                          <span>{c.lessonCount} lessons</span>
                        </div>

                        {/* Course Title Matching & Admin Content Requests */}
                        {(c.quizMismatchOrMissing || c.assessmentMismatchOrMissing) && (
                          <div className="p-2.5 bg-purple-50/70 border border-purple-200/80 rounded-xl text-[11px] space-y-1.5">
                            {c.quizMismatchOrMissing && (
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-purple-900 font-semibold truncate" title="Quiz course title must match this course">
                                  Quiz missing / title mismatch
                                </span>
                                {c.quizRequestPending ? (
                                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md shrink-0">
                                    Quiz requested — awaiting Admin ⏳
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenContentRequest(c.courseId, c.courseTitle, 'quiz')}
                                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors shrink-0 cursor-pointer"
                                  >
                                    Request Quiz
                                  </button>
                                )}
                              </div>
                            )}
                            {c.assessmentMismatchOrMissing && (
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-teal-900 font-semibold truncate" title="Assessment course title must match this course">
                                  Assessment missing / mismatch
                                </span>
                                {c.assessmentRequestPending ? (
                                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md shrink-0">
                                    Assessment requested — awaiting Admin ⏳
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenContentRequest(c.courseId, c.courseTitle, 'assessment')}
                                    className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 transition-colors shrink-0 cursor-pointer"
                                  >
                                    Request Assessment
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Link
                        to={c.baselineRequired && !c.baselineCompleted
                          ? `/courses/${c.courseId}/baseline-assessment`
                          : `/courses/${c.courseId}/learn`}
                        className="w-full py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span>{c.baselineRequired && !c.baselineCompleted ? 'Take Baseline Assessment' : 'Start Course'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Completed Courses */}
            {completedCourses.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-700" />
                    <h3 className="text-lg font-black text-gray-900">Completed Courses</h3>
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    {completedCourses.length} finished
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedCourses.map(c => {
                    const needsAfter = c.afterAssessmentRequired && !c.afterAssessmentCompleted;
                    const needsFeedback = !needsAfter && !c.feedbackCompleted;
                    const needsCert = !needsAfter && !needsFeedback && !c.certificateIssued;

                    return (
                      <div
                        key={c.courseId}
                        className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              100% Completed
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {c.completedAt ? new Date(c.completedAt).toLocaleDateString('en-GB') : ''}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
                            {c.courseTitle}
                          </h4>

                          {/* Multi-step Status Indicator */}
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[11px] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 font-medium">Final Reflection:</span>
                              <span className={`font-bold ${c.afterAssessmentCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {c.afterAssessmentCompleted ? 'Completed ✓' : (c.afterAssessmentRequired ? 'Pending' : 'Not Required')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 font-medium">Beneficiary Feedback:</span>
                              <span className={`font-bold ${c.feedbackCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {c.feedbackCompleted ? 'Submitted ✓' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 font-medium">Certificate:</span>
                              <span className={`font-bold ${c.certificateIssued ? 'text-emerald-700' : 'text-blue-700'}`}>
                                {c.certificateIssued ? 'Issued ✓' : 'Ready to Claim'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action depending on stage */}
                        <div className="space-y-2">
                          {needsAfter ? (
                            <Link
                              to={`/courses/${c.courseId}/after-assessment`}
                              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>Take Final Assessment</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          ) : needsFeedback ? (
                            <Link
                              to={`/courses/${c.courseId}/feedback`}
                              className="w-full py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>Give Feedback</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <Link
                              to={`/courses/${c.courseId}/certificate`}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Award className="h-4 w-4" />
                              <span>{c.certificateIssued ? 'View Certificate' : 'Issue Certificate'}</span>
                            </Link>
                          )}

                          <Link
                            to={`/courses/${c.courseId}/learn`}
                            className="w-full py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-100 text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Review Lessons</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 8. Certificates of Completion */}
            {certificates.length > 0 && (
              <section className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#23735F]" />
                    <h3 className="text-base font-black text-gray-900">My Certificates of Completion</h3>
                  </div>
                  <span className="text-[11px] font-extrabold px-3 py-1 bg-emerald-50 text-[#23735F] rounded-full border border-emerald-200">
                    {certificates.length} Official {certificates.length === 1 ? 'Credential' : 'Credentials'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {certificates.map(cert => {
                    const isRevoked = cert.status === 'revoked';
                    return (
                      <div
                        key={cert.certificateId}
                        className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                          isRevoked ? 'bg-red-50/50 border-red-200' : 'bg-emerald-50/30 border-emerald-200'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-gray-500">
                              {cert.certificateNumber}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isRevoked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {cert.status}
                            </span>
                          </div>

                          <h4 className="text-xs font-black text-gray-900 line-clamp-2">
                            {cert.courseTitleSnapshot}
                          </h4>

                          <p className="text-[11px] text-gray-500">
                            Completed: {new Date(cert.courseCompletionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <Link
                            to={`/courses/${cert.courseId}/certificate`}
                            className="flex-1 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold rounded-xl transition-colors text-center"
                          >
                            View
                          </Link>
                          {!isRevoked && (
                            <button
                              onClick={() => handleDownloadCert(cert)}
                              className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors"
                              title="Download PDF"
                            >
                              PDF
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 7. Sequential One-by-One Learning Journey */}
            <section className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#23735F] flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-gray-900">
                        Sequential Learning Journey
                      </h3>
                      {activeCourseTitle && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-[#23735F] border border-emerald-300/80 rounded-full text-xs font-black shadow-2xs">
                          <BookOpen className="h-3.5 w-3.5 text-[#23735F]" />
                          <span>Course: {activeCourseTitle}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Step-by-step milestone progression for <strong className="text-gray-700 font-bold">{activeCourseTitle || 'your course'}</strong>: Course Started → Lesson Completed → Quiz Passed → Course Completed → Assessment → Feedback → Official Certificate.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="text-xs font-bold px-3 py-1.5 bg-emerald-50 text-[#23735F] rounded-full border border-emerald-200 shadow-2xs">
                    {learningJourney.filter(m => m.unlocked).length} of {learningJourney.length} Milestones Achieved
                  </span>
                </div>
              </div>

              {/* Sequential Stepper Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {learningJourney.map((milestone) => {
                  const isCompleted = milestone.status === 'completed';
                  const isActive = milestone.status === 'active';
                  const isLocked = milestone.status === 'locked';

                  return (
                    <div
                      key={milestone.step}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all relative overflow-hidden ${
                        isCompleted
                          ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950 shadow-2xs'
                          : isActive
                          ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-200 text-gray-900 shadow-xs'
                          : 'bg-gray-50/60 border-gray-200 text-gray-400 opacity-60'
                      }`}
                    >
                      {/* Top Step Pill & Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          isCompleted
                            ? 'bg-[#23735F] text-white'
                            : isActive
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {milestone.step}
                        </span>

                        {isCompleted && (
                          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full animate-pulse">
                            Current Goal ★
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-0.5">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h4 className={`text-xs font-black leading-snug ${
                          isCompleted ? 'text-emerald-950' : isActive ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {milestone.title}
                        </h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3">
                          {milestone.description}
                        </p>
                      </div>

                      {/* Action Button depending on milestone state */}
                      <div className="pt-2 border-t border-gray-100/80">
                        {isCompleted ? (
                          <div className="text-[10px] font-bold text-emerald-700 flex items-center justify-center gap-1 py-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Milestone Unlocked</span>
                          </div>
                        ) : isActive ? (
                          <div className="space-y-1.5">
                            {milestone.actionType === 'request_quiz' ? (
                              milestone.quizRequestPending ? (
                                <span className="w-full block py-1.5 px-2 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-xl text-center">
                                  Request Pending ⏳
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenContentRequest(milestone.courseId, milestone.courseTitle, 'quiz')}
                                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-xl transition-colors shadow-xs cursor-pointer text-center block"
                                >
                                  Request Quiz
                                </button>
                              )
                            ) : milestone.actionType === 'request_assessment' ? (
                              milestone.assessmentRequestPending ? (
                                <span className="w-full block py-1.5 px-2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-xl text-center">
                                  Request Pending ⏳
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenContentRequest(milestone.courseId, milestone.courseTitle, 'assessment')}
                                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold rounded-xl transition-colors shadow-xs cursor-pointer text-center block"
                                >
                                  Request Assessment
                                </button>
                              )
                            ) : (
                              <Link
                                to={milestone.actionUrl}
                                className="w-full py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-[11px] font-bold rounded-xl transition-colors text-center block shadow-xs"
                              >
                                {milestone.actionText || 'Continue'}
                              </Link>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold block text-center py-1">
                            Unlocks at Step {milestone.step}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Recommended Training */}
            {recommendations.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-emerald-700" />
                    <h3 className="text-lg font-black text-gray-900">Recommended Training</h3>
                  </div>
                  <Link
                    to="/course-recommendations"
                    className="text-xs font-bold text-[#23735F] hover:underline flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendations.map(rec => (
                    <div
                      key={rec.courseId}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {rec.category || 'General'}
                        </span>
                        <h4 className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
                          {rec.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {rec.shortDescription || 'Community training module.'}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50/50 p-2 rounded-lg">
                          💡 {rec.recommendationReason || 'Popular course matching community goals.'}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSelectRecommendedCourse(rec)}
                        disabled={selectingCourseId === rec.courseId}
                        className="w-full py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {selectingCourseId === rec.courseId ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <span>Select Course</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Exploration Actions */}
            <section className="pt-2">
              <h3 className="font-extrabold text-base text-gray-900 mb-3">Additional Learning Hubs</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {quickActions.map(({ to, onClick, icon: Icon, label, desc, color, bg, badge }, idx) => {
                  const content = (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                          <Icon className="h-4 w-4" style={{ color }} />
                        </div>
                        {badge && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {badge}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900">{label}</h4>
                        <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{desc}</p>
                      </div>
                    </>
                  );

                  return to ? (
                    <Link
                      key={to}
                      to={to}
                      className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between gap-3 text-left"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={label || idx}
                      type="button"
                      onClick={onClick}
                      className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between gap-3 text-left cursor-pointer"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Content Request Modal */}
      <ContentRequestModal
        isOpen={requestModalState.isOpen}
        onClose={() => setRequestModalState(prev => ({ ...prev, isOpen: false }))}
        courseId={requestModalState.courseId}
        courseTitle={requestModalState.courseTitle}
        requestType={requestModalState.requestType}
        onSuccess={() => loadDashboardData(true)}
      />

      {/* Learner Feedback Modal */}
      {showFeedback && (
        <Feedback onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
};

export default Dashboard;
