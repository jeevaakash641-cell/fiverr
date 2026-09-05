import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchAdminFeedbackList,
  recordAdminConsentWithdrawal,
  archiveAdminFeedback
} from '../services/beneficiaryFeedbackService';
import { fetchAdminCourses } from '../services/courseService';
import {
  MessageSquare, ArrowLeft, Search, Filter, RefreshCw,
  ThumbsUp, ThumbsDown, Shield, ShieldAlert, CheckCircle,
  AlertCircle, BookOpen, Clock, Trash2, Eye, Award,
  ClipboardCheck, Sparkles, X, ChevronRight, Check,
  User, Archive, HeartHandshake, HelpCircle
} from 'lucide-react';

const AdminBeneficiaryFeedback = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [feedbackList, setFeedbackList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [recommendFilter, setRecommendFilter] = useState('all');
  const [consentFilter, setConsentFilter] = useState('all');

  // Drawer / Details Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Notifications
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
  const showAlert = (type, message) => {
    setAlertInfo({ type, message });
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 5000);
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [fbData, coursesData] = await Promise.all([
        fetchAdminFeedbackList({}, user),
        fetchAdminCourses({}, user)
      ]);
      setFeedbackList(fbData || []);
      setCourses(coursesData || []);
    } catch (err) {
      showAlert('error', err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/admin-login');
      return;
    }
    const role = String(user.userType || user.role || '').toLowerCase();
    const isElyAdmin = String(user.email || '').toLowerCase() === 'admin@onecommunityely.com';
    if (role !== 'teacher' && role !== 'admin' && !isElyAdmin) {
      showAlert('error', 'Administrator privileges required. Please sign in with an Administrator account.');
      navigate('/admin-login');
      return;
    }
    loadData();
  }, [user, navigate]);

  // Metrics
  const metrics = useMemo(() => {
    const total = feedbackList.length;
    const recommendYes = feedbackList.filter(f => f.wouldRecommend === 'yes').length;
    const recommendPercent = total > 0 ? Math.round((recommendYes / total) * 100) : 0;
    const namedConsent = feedbackList.filter(f => f.testimonialConsent === 'named' && !f.consentWithdrawn).length;
    const anonConsent = feedbackList.filter(f => f.testimonialConsent === 'anonymous' && !f.consentWithdrawn).length;
    const withdrawnConsent = feedbackList.filter(f => f.consentWithdrawn).length;

    return { total, recommendPercent, namedConsent, anonConsent, withdrawnConsent };
  }, [feedbackList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return feedbackList.filter(f => {
      const matchesSearch =
        (f.learnerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.learnerEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.courseTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.mostUsefulLearning || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.intendedChange || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCourse = courseFilter === 'all' || f.courseId === courseFilter;
      const matchesRecommend = recommendFilter === 'all' || f.wouldRecommend === recommendFilter;

      let matchesConsent = true;
      if (consentFilter === 'withdrawn') {
        matchesConsent = f.consentWithdrawn === true;
      } else if (consentFilter !== 'all') {
        matchesConsent = f.testimonialConsent === consentFilter && !f.consentWithdrawn;
      }

      return matchesSearch && matchesCourse && matchesRecommend && matchesConsent;
    });
  }, [feedbackList, searchQuery, courseFilter, recommendFilter, consentFilter]);

  // Record Consent Withdrawal
  const handleWithdrawConsent = async (item) => {
    if (!window.confirm(`Record testimonial consent withdrawal for ${item.learnerName}? This feedback will no longer be eligible for public/testimonial use.`)) {
      return;
    }

    try {
      const res = await recordAdminConsentWithdrawal(item.feedbackId, user);
      if (res && res.success) {
        setFeedbackList(prev => prev.map(f => f.feedbackId === item.feedbackId ? res.feedback : f));
        if (selectedItem?.feedbackId === item.feedbackId) {
          setSelectedItem(res.feedback);
        }
        showAlert('success', 'Testimonial consent withdrawal recorded successfully.');
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to record consent withdrawal.');
    }
  };

  // Archive
  const handleArchive = async (item) => {
    if (!window.confirm(`Archive this feedback record from ${item.learnerName}? Internal audit records will be preserved.`)) {
      return;
    }

    try {
      const res = await archiveAdminFeedback(item.feedbackId, user);
      if (res && res.success) {
        setFeedbackList(prev => prev.filter(f => f.feedbackId !== item.feedbackId));
        if (selectedItem?.feedbackId === item.feedbackId) {
          setDrawerOpen(false);
        }
        showAlert('success', 'Feedback archived successfully.');
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to archive feedback.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              to="/admin"
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
            <div>
              <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-[#23735F]" />
                <span>Beneficiary Feedback</span>
              </h1>
              <p className="text-xs text-gray-500">
                Course evaluations and testimonial permissions (One Community Ely)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/admin/courses"
              className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200"
            >
              Courses
            </Link>
            <Link
              to="/admin/baseline-assessments"
              className="px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200"
            >
              Baseline
            </Link>
            <Link
              to="/admin/after-assessments"
              className="px-3 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg text-xs font-semibold border border-teal-200"
            >
              After Assessment
            </Link>
          </div>
        </div>
      </header>

      {/* Alert */}
      {alertInfo.message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className={`p-4 rounded-xl shadow-xs border flex items-center justify-between ${
            alertInfo.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            <div className="flex items-center space-x-3">
              {alertInfo.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{alertInfo.message}</p>
            </div>
            {alertInfo.message.toLowerCase().includes('administrator') && (
              <Link
                to="/admin-login"
                className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-colors ml-4 flex-shrink-0"
              >
                Sign In as Admin
              </Link>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Feedback</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Recommend %</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.recommendPercent}%</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Named Consent</p>
            <p className="text-2xl font-black text-teal-700 mt-1">{metrics.namedConsent}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Anonymous Consent</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{metrics.anonConsent}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Withdrawn</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{metrics.withdrawnConsent}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by learner name, email, course or feedback content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#23735F] focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 outline-none font-medium max-w-[180px] truncate"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.courseId} value={c.courseId}>{c.title}</option>
              ))}
            </select>

            <select
              value={recommendFilter}
              onChange={(e) => setRecommendFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 outline-none font-medium"
            >
              <option value="all">All Recommendations</option>
              <option value="yes">Recommended (Yes)</option>
              <option value="no">Not Recommended (No)</option>
            </select>

            <select
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 outline-none font-medium"
            >
              <option value="all">All Consents</option>
              <option value="named">Named Permission</option>
              <option value="anonymous">Anonymous Permission</option>
              <option value="none">No Permission</option>
              <option value="withdrawn">Consent Withdrawn</option>
            </select>
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-2xs">
            <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading Beneficiary Feedback...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-900">No Feedback Records Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Learners submit beneficiary feedback once course progress reaches 100% and required reflections are complete.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map((item) => {
              const isNamed = item.testimonialConsent === 'named' && !item.consentWithdrawn;
              const isAnon = item.testimonialConsent === 'anonymous' && !item.consentWithdrawn;
              const isWithdrawn = item.consentWithdrawn;

              return (
                <div
                  key={item.feedbackId}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-sm">{item.learnerName}</span>
                      <span className="text-xs text-gray-400 font-mono">({item.learnerEmail})</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs font-semibold text-[#23735F]">{item.courseTitle}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Recommendation Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${
                        item.wouldRecommend === 'yes'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}>
                        {item.wouldRecommend === 'yes' ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                        <span>{item.wouldRecommend === 'yes' ? 'Recommended' : 'Not Recommended'}</span>
                      </span>

                      {/* Consent Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border ${
                        isWithdrawn
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : isNamed
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : isAnon
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {isWithdrawn
                          ? 'Consent Withdrawn'
                          : isNamed
                          ? 'Named Testimonial'
                          : isAnon
                          ? 'Anonymous Only'
                          : 'No Permission'}
                      </span>
                    </div>
                  </div>

                  {/* Ratings Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Usefulness</span>
                      <p className="font-extrabold text-gray-900">{item.usefulnessRating} / 5 ({item.usefulnessLabel})</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Confidence</span>
                      <p className="font-extrabold text-gray-900">{item.confidenceRating} / 5 ({item.confidenceLabel})</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Submission Date</span>
                      <p className="font-semibold text-gray-700">{new Date(item.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Consent Date</span>
                      <p className="font-semibold text-gray-700">{item.consentGivenAt ? new Date(item.consentGivenAt).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-gray-800">Most Useful Learning:</p>
                    <p className="text-gray-600 line-clamp-2 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                      "{item.mostUsefulLearning}"
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setDrawerOpen(true);
                      }}
                      className="text-xs font-bold text-[#23735F] hover:text-[#1b5b4b] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Full Responses</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {!item.consentWithdrawn && item.testimonialConsent !== 'none' && (
                        <button
                          onClick={() => handleWithdrawConsent(item)}
                          className="px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors"
                          title="Record Consent Withdrawal"
                        >
                          Withdraw Consent
                        </button>
                      )}
                      <button
                        onClick={() => handleArchive(item)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-lg"
                        title="Archive Feedback"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* --- Detail Drawer Modal --- */}
      {drawerOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-6">
            <div className="p-5 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-base font-black text-gray-900">
                  Beneficiary Feedback Details
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedItem.learnerName} • {selectedItem.courseTitle}
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Consent Alert Status */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                selectedItem.consentWithdrawn
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : selectedItem.testimonialConsent === 'named'
                  ? 'bg-teal-50 text-teal-900 border-teal-200'
                  : selectedItem.testimonialConsent === 'anonymous'
                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                <Shield className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-sm">
                    {selectedItem.consentWithdrawn
                      ? 'Testimonial Consent Withdrawn'
                      : selectedItem.testimonialConsent === 'named'
                      ? 'Permission Granted (Named Testimonial)'
                      : selectedItem.testimonialConsent === 'anonymous'
                      ? 'Permission Granted (Anonymous Case-Study Only)'
                      : 'Private Internal Feedback (No Permission)'}
                  </p>
                  <p className="leading-relaxed opacity-90">
                    {selectedItem.consentWithdrawn
                      ? `Learner withdrew consent on ${new Date(selectedItem.consentWithdrawnAt).toLocaleDateString()}. This feedback must NOT be used publicly.`
                      : selectedItem.testimonialConsent === 'named'
                      ? 'Learner gave permission for feedback to be quoted alongside their name.'
                      : selectedItem.testimonialConsent === 'anonymous'
                      ? 'Learner gave permission for anonymised quotes only. Never disclose learner identity.'
                      : 'Learner chose not to grant public testimonial permission.'}
                  </p>
                </div>
              </div>

              {/* Exact 6 Feedback Answers */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div>
                  <span className="font-bold text-gray-500 uppercase text-[10px]">1. How useful was this training?</span>
                  <p className="font-black text-gray-900 text-sm mt-0.5">
                    {selectedItem.usefulnessRating} / 5 — {selectedItem.usefulnessLabel}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-gray-500 uppercase text-[10px]">2. Do you feel more confident?</span>
                  <p className="font-black text-gray-900 text-sm mt-0.5">
                    {selectedItem.confidenceRating} / 5 — {selectedItem.confidenceLabel}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-gray-500 uppercase text-[10px]">3. What was the most useful thing you learned?</span>
                  <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                    {selectedItem.mostUsefulLearning}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-gray-500 uppercase text-[10px]">4. What will you do differently?</span>
                  <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                    {selectedItem.intendedChange}
                  </p>
                </div>

                {selectedItem.nextLearning && (
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">5. What would you like to learn next?</span>
                    <p className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-1 whitespace-pre-wrap leading-relaxed font-medium">
                      {selectedItem.nextLearning}
                    </p>
                  </div>
                )}

                <div>
                  <span className="font-bold text-gray-500 uppercase text-[10px]">6. Would you recommend this training?</span>
                  <p className="font-black text-gray-900 uppercase text-sm mt-0.5">
                    {selectedItem.wouldRecommend}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              {!selectedItem.consentWithdrawn && selectedItem.testimonialConsent !== 'none' ? (
                <button
                  type="button"
                  onClick={() => handleWithdrawConsent(selectedItem)}
                  className="px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors"
                >
                  Record Consent Withdrawal
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBeneficiaryFeedback;
