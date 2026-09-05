import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, RefreshCw, Printer, Download, Filter, Search, Calendar,
  Users, BookOpen, CheckCircle, TrendingUp, Award, Star, MessageSquare,
  AlertTriangle, HelpCircle, Check, X, ChevronLeft, ChevronRight, BarChart3,
  Layers, Shield, FileText, Activity
} from 'lucide-react';
import {
  fetchOverviewReport,
  fetchLearnerActivityReport,
  fetchCoursePerformanceReport,
  fetchQuizResultsReport,
  fetchOutcomesReport,
  fetchFeedbackReport,
  fetchCertificatesReport,
  fetchEvidenceReport,
  downloadCsvReport
} from '../services/impactReportingService';
import { fetchAdminCourses } from '../services/courseService';

const AdminImpactReports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'overview' | 'learners' | 'courses' | 'quizzes' | 'outcomes' | 'feedback' | 'certificates' | 'exports'
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [filterRangePreset, setFilterRangePreset] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCourseId, setFilterCourseId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLearnerStatus, setFilterLearnerStatus] = useState('all');
  const [dateError, setDateError] = useState('');

  // Search & Pagination
  const [learnerSearch, setLearnerSearch] = useState('');
  const [learnerPage, setLearnerPage] = useState(1);
  const itemsPerPage = 10;

  // Course dropdown options
  const [availableCourses, setAvailableCourses] = useState([]);

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [overviewData, setOverviewData] = useState(null);
  const [learnersData, setLearnersData] = useState(null);
  const [coursesData, setCoursesData] = useState(null);
  const [quizzesData, setQuizzesData] = useState(null);
  const [outcomesData, setOutcomesData] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [certificatesData, setCertificatesData] = useState(null);
  const [evidenceData, setEvidenceData] = useState(null);

  // Load available courses for dropdown
  useEffect(() => {
    fetchAdminCourses({}, user)
      .then(courses => setAvailableCourses(courses || []))
      .catch(err => console.warn('Could not load courses for filter:', err.message));
  }, [user]);

  // Quick Range Presets
  const applyRangePreset = (preset) => {
    setFilterRangePreset(preset);
    setDateError('');
    const now = new Date();

    if (preset === '7d') {
      const s = new Date(now);
      s.setDate(s.getDate() - 7);
      setFilterStartDate(s.toISOString().split('T')[0]);
      setFilterEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30d') {
      const s = new Date(now);
      s.setDate(s.getDate() - 30);
      setFilterStartDate(s.toISOString().split('T')[0]);
      setFilterEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '3m') {
      const s = new Date(now);
      s.setMonth(s.getMonth() - 3);
      setFilterStartDate(s.toISOString().split('T')[0]);
      setFilterEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const s = new Date(now.getFullYear(), 0, 1);
      setFilterStartDate(s.toISOString().split('T')[0]);
      setFilterEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  const resetFilters = () => {
    setFilterRangePreset('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCourseId('all');
    setFilterCategory('all');
    setFilterLearnerStatus('all');
    setDateError('');
    setLearnerSearch('');
    setLearnerPage(1);
  };

  // Compile active filter object
  const currentFilters = useMemo(() => {
    return {
      startDate: filterStartDate || null,
      endDate: filterEndDate || null,
      courseId: filterCourseId !== 'all' ? filterCourseId : null,
      category: filterCategory !== 'all' ? filterCategory : null,
      status: filterLearnerStatus !== 'all' ? filterLearnerStatus : null,
      rangePreset: filterRangePreset !== 'custom' ? filterRangePreset : null
    };
  }, [filterStartDate, filterEndDate, filterCourseId, filterCategory, filterLearnerStatus, filterRangePreset]);

  // Load All Reports
  const loadReports = async () => {
    if (filterStartDate && filterEndDate) {
      if (new Date(filterEndDate) < new Date(filterStartDate)) {
        setDateError('End date cannot be earlier than start date.');
        return;
      }
    }
    setDateError('');
    if (!user) {
      setErrorMessage('Please sign in to access impact reports.');
      setLoading(false);
      return;
    }
    const role = String(user.userType || user.role || '').toLowerCase();
    const isElyAdmin = String(user.email || '').toLowerCase() === 'admin@onecommunityely.com';
    if (role !== 'teacher' && role !== 'admin' && !isElyAdmin) {
      setErrorMessage('Administrator privileges required. Please sign in with an Administrator account.');
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setErrorMessage('');

    try {
      const [
        ov,
        ln,
        cs,
        qz,
        oc,
        fb,
        ct,
        ev
      ] = await Promise.all([
        fetchOverviewReport(currentFilters, user),
        fetchLearnerActivityReport(currentFilters, user),
        fetchCoursePerformanceReport(currentFilters, user),
        fetchQuizResultsReport(currentFilters, user),
        fetchOutcomesReport(currentFilters, user),
        fetchFeedbackReport(currentFilters, user),
        fetchCertificatesReport(currentFilters, user),
        fetchEvidenceReport(currentFilters, user)
      ]);

      setOverviewData(ov);
      setLearnersData(ln);
      setCoursesData(cs);
      setQuizzesData(qz);
      setOutcomesData(oc);
      setFeedbackData(fb);
      setCertificatesData(ct);
      setEvidenceData(ev);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setErrorMessage(err.message || 'Failed to load impact reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [currentFilters]);

  // Filtered learners for activity tab
  const filteredLearners = useMemo(() => {
    if (!learnersData?.learners) return [];
    if (!learnerSearch) return learnersData.learners;
    const q = learnerSearch.toLowerCase().trim();
    return learnersData.learners.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q)
    );
  }, [learnersData, learnerSearch]);

  const paginatedLearners = useMemo(() => {
    const start = (learnerPage - 1) * itemsPerPage;
    return filteredLearners.slice(start, start + itemsPerPage);
  }, [filteredLearners, learnerPage]);

  const totalLearnerPages = Math.ceil(filteredLearners.length / itemsPerPage) || 1;

  // CSV Export Trigger
  const handleExportCsv = async (type) => {
    try {
      await downloadCsvReport(type, currentFilters, user);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const summary = overviewData?.summary || {};

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link
                to="/admin-panel"
                className="inline-flex items-center text-sm font-semibold text-[#23735F] hover:text-[#185344] p-2 rounded-lg hover:bg-emerald-50 transition-colors"
                title="Return to Admin Panel"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                <span>Admin Portal</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-[#23735F]" />
                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                  Admin Impact Reporting
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <Link
                to={`/admin/impact-reports/print?${new URLSearchParams(currentFilters).toString()}`}
                target="_blank"
                className="inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
                title="Open formatted printable executive report"
              >
                <Printer className="h-4 w-4 mr-1.5 text-gray-600" />
                <span>Printable Report</span>
              </Link>

              <button
                onClick={loadReports}
                disabled={refreshing}
                className="inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-lg text-white bg-[#23735F] hover:bg-[#1b5e4d] shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Title & Purpose Banner */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-[#1b5e4d] mb-2">
                One Community Ely • Social Impact Evaluation
              </span>
              <h2 className="text-2xl font-bold text-gray-900">
                Adult Learning Impact & Progress Intelligence
              </h2>
              <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                Real-time tracking of learner registrations, completion rates, knowledge changes between baseline and final evaluations, community feedback, and official completion certificates.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExportCsv('courses')}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Course CSV
              </button>
              <button
                onClick={() => handleExportCsv('outcomes')}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Outcomes CSV
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="mt-6 pt-5 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                Quick Ranges:
              </span>
              {[
                { label: 'All Time', id: 'all' },
                { label: 'Last 7 Days', id: '7d' },
                { label: 'Last 30 Days', id: '30d' },
                { label: 'Last 3 Months', id: '3m' },
                { label: 'This Year', id: 'this_year' }
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyRangePreset(preset.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                    filterRangePreset === preset.id
                      ? 'bg-[#23735F] text-white border-[#23735F]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Start Date (UK: DD/MM/YYYY)
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setFilterRangePreset('custom');
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#23735F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  End Date (UK: DD/MM/YYYY)
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setFilterRangePreset('custom');
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#23735F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Course Filter
                </label>
                <select
                  value={filterCourseId}
                  onChange={(e) => setFilterCourseId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#23735F] focus:outline-none bg-white"
                >
                  <option value="all">All Courses</option>
                  {availableCourses.map(c => (
                    <option key={c.courseId} value={c.courseId}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Learner Activity Status
                </label>
                <select
                  value={filterLearnerStatus}
                  onChange={(e) => setFilterLearnerStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#23735F] focus:outline-none bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="banned">Banned Only</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Reset Filters
                </button>
              </div>
            </div>

            {dateError && (
              <div className="mt-3 p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                <span>{dateError}</span>
              </div>
            )}

            {/* Active filter summary pill */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>
                <strong>Applied Range:</strong> {overviewData?.filtersApplied?.startDate || 'All time'} — {overviewData?.filtersApplied?.endDate || 'Present'} • <strong>Course:</strong> {filterCourseId === 'all' ? 'All' : availableCourses.find(c => c.courseId === filterCourseId)?.title || filterCourseId}
              </span>
              <span className="italic text-gray-400">
                Formula: Completion Rate = (Completed ÷ Started) × 100
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm font-semibold">{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              {errorMessage.toLowerCase().includes('administrator') && (
                <Link
                  to="/admin-login"
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign In as Admin
                </Link>
              )}
              <button
                onClick={loadReports}
                className="px-3 py-1.5 bg-white text-red-700 border border-red-300 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Top Summary Metrics Cards Strip (10 cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Registered</span>
              <Users className="h-4 w-4 text-[#23735F]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {loading ? '...' : (summary.totalRegisteredLearners ?? 0)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              +{summary.newLearnersInPeriod ?? 0} in selected period
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Active Learners</span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {loading ? '...' : (summary.activeLearnersCount ?? 0)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {summary.inactiveLearnersCount ?? 0} inactive
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Courses Selected</span>
              <BookOpen className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {loading ? '...' : (summary.coursesSelectedCount ?? 0)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Enrolled by learners</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Courses Started</span>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {loading ? '...' : (summary.coursesStartedCount ?? 0)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Progress active</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Courses Completed</span>
              <CheckCircle className="h-4 w-4 text-teal-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-700">
              {loading ? '...' : (summary.coursesCompletedCount ?? 0)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">100% lessons done</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Completion Rate</span>
              <TrendingUp className="h-4 w-4 text-[#23735F]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[#23735F]">
              {loading ? '...' : `${summary.overallCompletionRate ?? 0}%`}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Completed ÷ Started</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Avg Quiz Score</span>
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700">
              {loading ? '...' : `${summary.averageQuizScore ?? 0}%`}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Across all attempts</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Avg Usefulness</span>
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {loading ? '...' : (summary.averageUsefulnessRating ? `${summary.averageUsefulnessRating}/5` : 'N/A')}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Learner feedback</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Avg Confidence</span>
              <Star className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {loading ? '...' : (summary.averageConfidenceRating ? `${summary.averageConfidenceRating}/5` : 'N/A')}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Post-training feedback</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Certificates Issued</span>
              <Award className="h-4 w-4 text-blue-700" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-800">
              {loading ? '...' : (summary.certificatesIssuedCount ?? 0)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {summary.activeCertificatesCount ?? 0} active, {summary.revokedCertificatesCount ?? 0} revoked
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview & Charts', icon: BarChart3 },
              { id: 'learners', label: 'Learner Activity', icon: Users },
              { id: 'courses', label: 'Course Performance', icon: BookOpen },
              { id: 'quizzes', label: 'Quiz Results', icon: Award },
              { id: 'outcomes', label: 'Before-vs-After Outcomes', icon: TrendingUp },
              { id: 'feedback', label: 'Beneficiary Feedback', icon: MessageSquare },
              { id: 'certificates', label: 'Certificates', icon: Award },
              { id: 'evidence', label: 'Community Evidence', icon: Layers },
              { id: 'exports', label: 'Export Reports (CSV)', icon: Download }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-5 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-[#23735F] text-[#23735F] bg-emerald-50/40'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* TAB 1: OVERVIEW & ACCESSIBLE CHARTS */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Course Starts vs Completions
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Comparison of learners who started each course versus those who finished all modules and lessons.
                  </p>

                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    {coursesData?.courses?.length > 0 ? (
                      <div className="space-y-4">
                        {coursesData.courses.map(course => {
                          const starts = course.startedCount || 0;
                          const completions = course.completedCount || 0;
                          const maxVal = Math.max(starts, completions, 1);
                          const startWidth = Math.round((starts / maxVal) * 100);
                          const compWidth = Math.round((completions / maxVal) * 100);

                          return (
                            <div key={course.courseId} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold text-gray-800">
                                <span>{course.title}</span>
                                <span className="text-[#23735F] font-bold">
                                  {course.completionRate}% completion rate
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[11px] font-medium text-gray-500 w-16">Started:</span>
                                  <div className="flex-1 bg-gray-200 h-3 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-500 h-full rounded-full transition-all"
                                      style={{ width: `${startWidth}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold text-gray-700 w-8 text-right">{starts}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[11px] font-medium text-gray-500 w-16">Completed:</span>
                                  <div className="flex-1 bg-gray-200 h-3 rounded-full overflow-hidden">
                                    <div
                                      className="bg-[#23735F] h-full rounded-full transition-all"
                                      style={{ width: `${compWidth}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold text-emerald-800 w-8 text-right">{completions}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-6">
                        No course activity data is available for the selected period.
                      </p>
                    )}
                  </div>
                </div>

                {/* Accessible Outcome Meter */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Before vs After Confidence Change Summary
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Authoritative outcome changes evaluated from linked baseline and final assessments.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                        Confidence Increased
                      </div>
                      <div className="text-3xl font-extrabold text-[#23735F] mt-2">
                        {outcomesData?.summary?.increasedPercentage ?? 0}%
                      </div>
                      <div className="text-xs text-emerald-700 mt-1">
                        {outcomesData?.summary?.increasedCount ?? 0} learners
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Confidence Maintained
                      </div>
                      <div className="text-3xl font-extrabold text-blue-700 mt-2">
                        {outcomesData?.summary?.maintainedPercentage ?? 0}%
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {outcomesData?.summary?.maintainedCount ?? 0} learners
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                        Confidence Reduced
                      </div>
                      <div className="text-3xl font-extrabold text-amber-700 mt-2">
                        {outcomesData?.summary?.reducedPercentage ?? 0}%
                      </div>
                      <div className="text-xs text-amber-700 mt-1">
                        {outcomesData?.summary?.reducedCount ?? 0} learners
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence & Community Activities Summary */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      Community Activities & Evidence Summary
                    </h3>
                    <Link
                      to="/admin/evidence"
                      className="text-xs font-semibold text-[#23735F] hover:text-[#185344] hover:underline flex items-center"
                    >
                      Open Evidence Library &rarr;
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Audit of recorded One Community Ely CIC community sessions, measured attendance, and verified evidence materials.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Recorded Activities</div>
                      <div className="text-2xl font-black text-gray-900 mt-1">
                        {evidenceData?.summary?.totalActivities ?? summary.evidenceActivitiesCount ?? 0}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">Community sessions & workshops</div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Measured Attendance</div>
                      <div className="text-2xl font-black text-[#23735F] mt-1">
                        {evidenceData?.summary?.totalAttendance ?? summary.totalEvidenceAttendance ?? 0}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        From {evidenceData?.summary?.recordsWithAttendance ?? summary.evidenceRecordsWithAttendance ?? 0} recorded sessions
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Unrecorded Attendance</div>
                      <div className="text-2xl font-black text-amber-700 mt-1">
                        {evidenceData?.summary?.recordsMissingAttendance ?? summary.evidenceRecordsMissingAttendance ?? 0}
                      </div>
                      <div className="text-[11px] text-amber-600 mt-1">Sessions with headcount unrecorded</div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Evidence Files & Links</div>
                      <div className="text-2xl font-black text-blue-900 mt-1">
                        {(evidenceData?.summary?.totalAttachments ?? 0) + (evidenceData?.summary?.totalExternalLinks ?? 0)}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        {evidenceData?.summary?.totalAttachments ?? 0} files, {evidenceData?.summary?.totalExternalLinks ?? 0} web links
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LEARNER ACTIVITY */}
            {activeTab === 'learners' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search learners by name or email..."
                      value={learnerSearch}
                      onChange={(e) => {
                        setLearnerSearch(e.target.value);
                        setLearnerPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#23735F] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>Showing {filteredLearners.length} registered learners</span>
                    <button
                      onClick={() => handleExportCsv('learners')}
                      className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Learner</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Registered</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Last Active</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Selected</th>
                        <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Started</th>
                        <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Completed</th>
                        <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Quiz Attempts</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedLearners.length > 0 ? (
                        paginatedLearners.map(learner => (
                          <tr key={learner.learnerId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{learner.name}</div>
                              <div className="text-gray-500 text-[11px]">{learner.email}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{learner.registeredAtFormatted}</td>
                            <td className="px-4 py-3 text-gray-600">{learner.lastActiveAtFormatted}</td>
                            <td className="px-4 py-3">
                              {learner.isBanned ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                  Banned
                                </span>
                              ) : learner.isActive ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-gray-800">{learner.coursesSelectedCount}</td>
                            <td className="px-4 py-3 text-center font-medium text-blue-700">{learner.coursesStartedCount}</td>
                            <td className="px-4 py-3 text-center font-medium text-emerald-700">{learner.coursesCompletedCount}</td>
                            <td className="px-4 py-3 text-center font-medium text-amber-700">{learner.quizAttemptsCount}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                            No learner accounts match the filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalLearnerPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setLearnerPage(p => Math.max(p - 1, 1))}
                      disabled={learnerPage === 1}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-600">
                      Page {learnerPage} of {totalLearnerPages}
                    </span>
                    <button
                      onClick={() => setLearnerPage(p => Math.min(p + 1, totalLearnerPages))}
                      disabled={learnerPage === totalLearnerPages}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: COURSE PERFORMANCE */}
            {activeTab === 'courses' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-gray-900">
                    Course Enrollment, Progression & Completion Metrics
                  </h3>
                  <button
                    onClick={() => handleExportCsv('courses')}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Course Title</th>
                        <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Category</th>
                        <th className="px-2 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Selected</th>
                        <th className="px-2 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Started</th>
                        <th className="px-2 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">In Progress</th>
                        <th className="px-2 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Completed</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Completion Rate</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Avg Progress</th>
                        <th className="px-2 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Baseline</th>
                        <th className="px-2 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Final</th>
                        <th className="px-2 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Feedback</th>
                        <th className="px-2 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Certificates</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {coursesData?.courses?.length > 0 ? (
                        coursesData.courses.map(course => (
                          <tr key={course.courseId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">{course.title}</td>
                            <td className="px-3 py-3 text-gray-500">{course.category}</td>
                            <td className="px-2 py-3 text-center font-medium text-gray-800">{course.selectedCount}</td>
                            <td className="px-2 py-3 text-center font-medium text-blue-700">{course.startedCount}</td>
                            <td className="px-2 py-3 text-center font-medium text-amber-700">{course.inProgressCount}</td>
                            <td className="px-2 py-3 text-center font-medium text-emerald-700">{course.completedCount}</td>
                            <td className="px-3 py-3 text-center font-bold text-[#23735F]">
                              {course.startedCount > 0 ? `${course.completionRate}%` : 'Not available'}
                            </td>
                            <td className="px-3 py-3 text-center font-semibold text-gray-700">{course.averageProgress}%</td>
                            <td className="px-2 py-3 text-center text-gray-600">{course.baselineSubmissions}</td>
                            <td className="px-2 py-3 text-center text-gray-600">{course.finalAssessmentSubmissions}</td>
                            <td className="px-2 py-3 text-center text-gray-600">{course.feedbackSubmissions}</td>
                            <td className="px-2 py-3 text-center font-bold text-blue-800">{course.certificatesIssued}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="12" className="px-4 py-8 text-center text-gray-500">
                            No courses available for the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: QUIZ RESULTS */}
            {activeTab === 'quizzes' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Quiz Assessments & Mastery Metrics
                    </h3>
                    <p className="text-xs text-gray-500">
                      Summarized evaluation of quizzes across lessons and courses. Correct answers remain strictly hidden.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportCsv('quizzes')}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Quiz Title</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Course</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Learners Attempted</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Total Attempts</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Average Score</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Highest</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Lowest</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Pass Rate</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Avg Attempts/Learner</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quizzesData?.quizzes?.length > 0 ? (
                        quizzesData.quizzes.map(quiz => (
                          <tr key={quiz.quizId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">{quiz.title}</td>
                            <td className="px-4 py-3 text-gray-600">{quiz.courseTitle}</td>
                            <td className="px-3 py-3 text-center font-medium text-gray-800">{quiz.learnersAttempted}</td>
                            <td className="px-3 py-3 text-center font-medium text-gray-800">{quiz.totalAttempts}</td>
                            <td className="px-3 py-3 text-center font-bold text-amber-700">{quiz.averageScore}%</td>
                            <td className="px-3 py-3 text-center text-emerald-700 font-semibold">{quiz.highestScore}%</td>
                            <td className="px-3 py-3 text-center text-gray-600 font-medium">{quiz.lowestScore}%</td>
                            <td className="px-3 py-3 text-center font-bold text-[#23735F]">
                              {quiz.learnersAttempted > 0 ? `${quiz.passRate}%` : 'Not available'}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700">{quiz.averageAttemptsPerLearner}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                            No quiz results are available for the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: BEFORE-VS-AFTER OUTCOMES */}
            {activeTab === 'outcomes' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Before-vs-After Knowledge & Confidence Outcomes
                    </h3>
                    <p className="text-xs text-gray-500">
                      Real linked baseline and after assessment evaluations.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportCsv('outcomes')}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export CSV
                  </button>
                </div>

                {/* Approved UK Wording & Disclaimer Notice */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center space-x-2 text-[#23735F] font-bold text-sm">
                    <CheckCircle className="h-5 w-5" />
                    <span>{outcomesData?.wording || 'Learner-reported confidence increased after training.'}</span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    {outcomesData?.disclaimer}
                  </p>
                </div>

                {/* Outcomes Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <span className="text-xs font-semibold text-gray-500">Valid Comparisons</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {outcomesData?.summary?.validComparisonsCount ?? 0}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {outcomesData?.summary?.unavailableCount ?? 0} unavailable
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <span className="text-xs font-semibold text-gray-500">Avg Baseline Confidence</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {outcomesData?.summary?.averageBaselineConfidence ? `${outcomesData.summary.averageBaselineConfidence}/5` : 'N/A'}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">Starting point</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <span className="text-xs font-semibold text-gray-500">Avg Final Confidence</span>
                    <div className="text-2xl font-bold text-[#23735F] mt-1">
                      {outcomesData?.summary?.averageFinalConfidence ? `${outcomesData.summary.averageFinalConfidence}/5` : 'N/A'}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">Post-completion</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <span className="text-xs font-semibold text-gray-500">Average Improvement</span>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {outcomesData?.summary?.averageChange !== null && outcomesData?.summary?.averageChange !== undefined
                        ? `+${outcomesData.summary.averageChange}`
                        : 'N/A'}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">Rating points delta</div>
                  </div>
                </div>

                {/* Comparisons Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Learner</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Course</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Baseline Confidence</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Final Confidence</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Change</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Outcome</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {outcomesData?.comparisons?.length > 0 ? (
                        outcomesData.comparisons.map(comp => (
                          <tr key={comp.comparisonId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">{comp.learnerName}</td>
                            <td className="px-4 py-3 text-gray-600">{comp.courseTitle}</td>
                            <td className="px-3 py-3 text-center font-medium text-gray-700">{comp.baselineConfidence} / 5</td>
                            <td className="px-3 py-3 text-center font-medium text-[#23735F]">{comp.finalConfidence} / 5</td>
                            <td className="px-3 py-3 text-center font-bold text-emerald-700">
                              {comp.change > 0 ? `+${comp.change}` : comp.change}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                comp.outcome === 'increased'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : comp.outcome === 'maintained'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {comp.outcome}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{comp.completedAtFormatted}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                            No valid before-and-after comparisons are available for the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: BENEFICIARY FEEDBACK */}
            {activeTab === 'feedback' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Beneficiary Feedback & Testimonial Permissions
                    </h3>
                    <p className="text-xs text-gray-500">
                      Community feedback, satisfaction, and verified testimonial consent statuses.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportCsv('feedback')}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export CSV
                  </button>
                </div>

                {/* Consent breakdown cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <span className="text-xs font-semibold text-gray-500">Total Submissions</span>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {feedbackData?.summary?.totalSubmissions ?? 0}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {feedbackData?.summary?.recommendationPercentage ?? 0}% would recommend
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm text-center">
                    <span className="text-xs font-semibold text-emerald-800">Named Testimonials</span>
                    <div className="text-2xl font-bold text-[#23735F] mt-1">
                      {feedbackData?.summary?.consentBreakdown?.named ?? 0}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-1">Named quote permitted</div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm text-center">
                    <span className="text-xs font-semibold text-blue-800">Anonymous Quotes</span>
                    <div className="text-2xl font-bold text-blue-800 mt-1">
                      {feedbackData?.summary?.consentBreakdown?.anonymous ?? 0}
                    </div>
                    <div className="text-[11px] text-blue-700 mt-1">Anonymous use permitted</div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <span className="text-xs font-semibold text-gray-600">Consent Withdrawn / None</span>
                    <div className="text-2xl font-bold text-gray-700 mt-1">
                      {(feedbackData?.summary?.consentBreakdown?.withdrawn ?? 0) + (feedbackData?.summary?.consentBreakdown?.none ?? 0)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {feedbackData?.summary?.consentBreakdown?.withdrawn ?? 0} withdrawn
                    </div>
                  </div>
                </div>

                {/* Requested Next Training Topics */}
                {feedbackData?.requestedTopics?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Common Requested Next-Training Topics:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {feedbackData.requestedTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-gray-100 text-gray-800 border border-gray-200"
                        >
                          <span className="font-semibold mr-1">{topic.topic}</span>
                          <span className="bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.2 text-[10px]">{topic.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Protected Comments List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Learner Comments & Permitted Usage:
                  </h4>
                  {feedbackData?.comments?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {feedbackData.comments.map(c => (
                        <div key={c.feedbackId} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-800">{c.displayName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.consentStatus === 'named'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.consentStatus === 'anonymous'
                                ? 'bg-blue-100 text-blue-800'
                                : c.consentStatus === 'withdrawn'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {c.consentStatus === 'named' ? 'Named consent' : c.consentStatus === 'anonymous' ? 'Anonymous consent' : c.consentStatus === 'withdrawn' ? 'Consent withdrawn' : 'Private (no consent)'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 italic mb-2">"{c.comment}"</p>
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Course: {c.courseTitle}</span>
                            <span>{c.submittedAtFormatted}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 py-4 text-center">
                      No written feedback comments available for this period.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: CERTIFICATES */}
            {activeTab === 'certificates' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Certificates of Completion Registry
                    </h3>
                    <p className="text-xs text-gray-500">
                      Audit of all issued and revoked official community completion certificates.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportCsv('certificates')}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Certificate Number</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Learner Name</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Course</th>
                        <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Completed Date</th>
                        <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Issue Date</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {certificatesData?.certificates?.length > 0 ? (
                        certificatesData.certificates.map(cert => (
                          <tr key={cert.certificateNumber} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono font-bold text-[#23735F]">{cert.certificateNumber}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{cert.learnerName}</td>
                            <td className="px-4 py-3 text-gray-700">{cert.courseTitle}</td>
                            <td className="px-3 py-3 text-gray-600">{cert.completedAtFormatted}</td>
                            <td className="px-3 py-3 text-gray-600">{cert.issuedAtFormatted}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                cert.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {cert.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                            No certificates have been issued in the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: COMMUNITY EVIDENCE & ACTIVITY REGISTRY */}
            {activeTab === 'evidence' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Community Evidence & Activity Registry
                    </h3>
                    <p className="text-xs text-gray-500">
                      Impact evidence and activity log for One Community Ely CIC community sessions, workshops, and partnerships.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to="/admin/evidence"
                      className="px-3 py-1.5 text-xs font-semibold text-[#23735F] bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center transition-colors"
                    >
                      <Layers className="h-3.5 w-3.5 mr-1" />
                      Manage in Evidence Library
                    </Link>
                    <button
                      onClick={() => handleExportCsv('evidence')}
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center transition-colors"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Privacy Safeguarding Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start space-x-2">
                  <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Confidentiality & Safeguarding Note:</span> Private beneficiary stories, personal contact details, and case studies lacking public consent are strictly excluded from aggregated reports and exports. Only authorised administrators may view full evidence records.
                  </div>
                </div>

                {/* Breakdown Grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Breakdown */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                      Activities by Category
                    </h4>
                    <div className="space-y-2">
                      {evidenceData?.categoryBreakdown && Object.keys(evidenceData.categoryBreakdown).length > 0 ? (
                        Object.entries(evidenceData.categoryBreakdown).map(([cat, item]) => (
                          <div key={cat} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-b-0">
                            <span className="font-semibold text-gray-800">{cat}</span>
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-500">{item.count} {item.count === 1 ? 'activity' : 'activities'}</span>
                              <span className="font-bold text-[#23735F] w-20 text-right">{item.totalAttendance} attended</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 py-4 text-center">No category breakdown available.</p>
                      )}
                    </div>
                  </div>

                  {/* Location Breakdown */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                      Activities by Location / Venue
                    </h4>
                    <div className="space-y-2">
                      {evidenceData?.locationBreakdown && Object.keys(evidenceData.locationBreakdown).length > 0 ? (
                        Object.entries(evidenceData.locationBreakdown).map(([loc, item]) => (
                          <div key={loc} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-b-0">
                            <span className="font-semibold text-gray-800 truncate max-w-[180px]" title={loc}>{loc}</span>
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-500">{item.count} {item.count === 1 ? 'session' : 'sessions'}</span>
                              <span className="font-bold text-[#23735F] w-20 text-right">{item.totalAttendance} attended</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 py-4 text-center">No location breakdown available.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evidence Records Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Activity Title</th>
                        <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Category</th>
                        <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Attendance</th>
                        <th className="px-3 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Location / Venue</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Evidence</th>
                        <th className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {evidenceData?.records?.length > 0 ? (
                        evidenceData.records.map(rec => (
                          <tr key={rec.evidenceId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">{rec.title}</td>
                            <td className="px-3 py-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                                {rec.category}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-gray-600">{rec.activityDateUK || rec.activityDate}</td>
                            <td className="px-3 py-3 text-center">
                              {rec.attendanceCount !== null && rec.attendanceCount !== undefined ? (
                                <span className="font-bold text-gray-900">{rec.attendanceCount}</span>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">Unrecorded</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-gray-600">{rec.location || '—'}</td>
                            <td className="px-3 py-3 text-center text-gray-600">
                              <span>{(rec.attachments?.length || 0)} files</span>
                              {rec.externalLinks?.length > 0 && (
                                <span className="text-gray-400 text-[10px] ml-1">({rec.externalLinks.length} links)</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.status === 'archived'
                                  ? 'bg-gray-100 text-gray-700'
                                  : rec.status === 'draft'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                            No evidence records found matching the active filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 8: EXPORT REPORTS */}
            {activeTab === 'exports' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Download Filtered CSV Reports
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Exports match the currently selected date range and course filters. Formatted with UTF-8 encoding and formula injection protection.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { type: 'learners', title: 'Learner Activity Export', desc: 'Registered learners, course activity, completion counts, and status.' },
                    { type: 'courses', title: 'Course Performance Export', desc: 'Selections, starts, completions, completion rates, and feedback count.' },
                    { type: 'quizzes', title: 'Quiz Results Summary', desc: 'Unique attempts, scores, pass rates, and average retakes per learner.' },
                    { type: 'outcomes', title: 'Before-vs-After Outcomes', desc: 'Baseline versus final confidence ratings and delta scores.' },
                    { type: 'feedback', title: 'Beneficiary Feedback & Consent', desc: 'Course ratings, comments, and verified testimonial permissions.' },
                    { type: 'certificates', title: 'Certificates Registry Export', desc: 'Official certificate serial numbers, issue dates, and audit status.' },
                    { type: 'evidence', title: 'Community Evidence & Activities Export', desc: 'Activity titles, categories, dates, measured attendance, locations, and attachment counts.' }
                  ].map(exp => (
                    <div key={exp.type} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1">{exp.title}</h4>
                        <p className="text-xs text-gray-500 mb-4">{exp.desc}</p>
                      </div>
                      <button
                        onClick={() => handleExportCsv(exp.type)}
                        className="w-full inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-lg text-white bg-[#23735F] hover:bg-[#1b5e4d] transition-colors"
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        Download {exp.type.toUpperCase()} CSV
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                  <strong>Security & Protection:</strong> All CSV exports automatically sanitize cells starting with '=', '+', '-', or '@' to prevent spreadsheet formula injection. Confidential authentication tokens, passwords, and correct quiz answer keys are excluded.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminImpactReports;
