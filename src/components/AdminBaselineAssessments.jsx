import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchAdminAssessments,
  createAssessment,
  updateAssessment,
  updateAssessmentStatus,
  deleteAssessment,
  fetchAssessmentResponsesAdmin
} from '../services/baselineAssessmentService';
import { fetchAdminCourses } from '../services/courseService';
import {
  BookOpen, Plus, Search, Filter, RefreshCw, ArrowLeft,
  Edit, Globe, EyeOff, Archive, CheckCircle, AlertTriangle,
  Clock, ArrowUp, ArrowDown, Trash2, X, Shield,
  Layers, AlertCircle, Check, Copy, HelpCircle,
  FileText, Play, CheckSquare, ListOrdered, ChevronRight, Eye,
  Users, MessageSquare, Star, Sliders, ClipboardCheck
} from 'lucide-react';

const CONFIDENCE_LABELS = {
  1: '1 — Not confident',
  2: '2 — Slightly confident',
  3: '3 — Moderately confident',
  4: '4 — Confident',
  5: '5 — Very confident'
};

const AdminBaselineAssessments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [assessments, setAssessments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState(searchParams.get('courseId') || 'all');

  // Notifications
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
  const showAlert = (type, message) => {
    setAlertInfo({ type, message });
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 5000);
  };

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Submissions Modal State
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');

  // Assessment Form
  const [formData, setFormData] = useState({
    title: '',
    courseId: '',
    instructions: 'This short assessment helps us understand your starting point. It is not a test, and there are no pass or fail results.',
    status: 'draft',
    questions: []
  });

  // Load Data
  const loadData = async () => {
    setRefreshing(true);
    try {
      const [assessmentsData, coursesData] = await Promise.all([
        fetchAdminAssessments({}, user),
        fetchAdminCourses({}, user)
      ]);
      setAssessments(assessmentsData || []);
      setCourses(coursesData || []);
    } catch (err) {
      showAlert('error', err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL query parameters for courseId and create trigger
  useEffect(() => {
    const targetCourseId = searchParams.get('courseId');
    const shouldCreate = searchParams.get('create') === 'true';
    if (courses.length > 0 && targetCourseId && targetCourseId !== 'all') {
      setCourseFilter(targetCourseId);
      if (shouldCreate) {
        const foundCourse = courses.find(c => c.courseId === targetCourseId);
        setEditingAssessment(null);
        setFormData({
          title: `Baseline Assessment - ${foundCourse?.title || ''}`,
          courseId: targetCourseId,
          instructions: 'This short assessment helps us understand your starting point. It is not a test, and there are no pass or fail results.',
          status: 'draft',
          questions: [
            {
              questionId: `q_${Date.now()}_1`,
              type: 'short_text',
              questionText: 'What would you most like to learn from this course?',
              placeholder: 'Share your goals or topics of interest...',
              required: true
            }
          ]
        });
        setEditorOpen(true);
      }
    }
  }, [courses, searchParams]);

  // Metrics
  const metrics = useMemo(() => {
    const total = assessments.length;
    const published = assessments.filter(a => a.status === 'published').length;
    const draft = assessments.filter(a => a.status === 'draft').length;
    const archived = assessments.filter(a => a.status === 'archived').length;
    return { total, published, draft, archived };
  }, [assessments]);

  // Filtered Assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      const matchesSearch =
        (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.courseTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchesCourse = courseFilter === 'all' || a.courseId === courseFilter;
      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [assessments, searchQuery, statusFilter, courseFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAssessment(null);
    setFormData({
      title: '',
      courseId: courses[0]?.courseId || '',
      instructions: 'This short assessment helps us understand your starting point. It is not a test, and there are no pass or fail results.',
      status: 'draft',
      questions: [
        {
          questionId: `q_${Date.now()}_1`,
          type: 'short_text',
          questionText: 'What would you most like to learn from this course?',
          placeholder: 'Share your goals or topics of interest...',
          required: true,
          order: 0
        },
        {
          questionId: `q_${Date.now()}_2`,
          type: 'confidence_rating',
          questionText: 'How confident do you feel about this subject right now?',
          required: true,
          order: 1
        }
      ]
    });
    setFormErrors({});
    setEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (assessment) => {
    setEditingAssessment(assessment);
    setFormData({
      title: assessment.title || '',
      courseId: assessment.courseId || '',
      instructions: assessment.instructions || '',
      status: assessment.status || 'draft',
      questions: JSON.parse(JSON.stringify(assessment.questions || []))
    });
    setFormErrors({});
    setEditorOpen(true);
  };

  // Question Management
  const addQuestion = (type) => {
    const newQ = {
      questionId: `q_${Date.now()}_${formData.questions.length + 1}`,
      type,
      questionText: type === 'confidence_rating'
        ? 'How confident are you with this topic?'
        : 'What prior experience do you have with this topic?',
      placeholder: type === 'short_text' ? 'Enter your thoughts here...' : undefined,
      required: true,
      order: formData.questions.length
    };
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }));
  };

  const updateQuestion = (index, updates) => {
    setFormData(prev => {
      const updated = [...prev.questions];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, questions: updated };
    });
  };

  const duplicateQuestion = (index) => {
    setFormData(prev => {
      const target = prev.questions[index];
      const dup = {
        ...JSON.parse(JSON.stringify(target)),
        questionId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        questionText: `${target.questionText} (Copy)`,
        order: index + 1
      };
      const updated = [...prev.questions];
      updated.splice(index + 1, 0, dup);
      return {
        ...prev,
        questions: updated.map((q, idx) => ({ ...q, order: idx }))
      };
    });
  };

  const moveQuestion = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= formData.questions.length) return;
    setFormData(prev => {
      const list = [...prev.questions];
      const [moved] = list.splice(index, 1);
      list.splice(targetIndex, 0, moved);
      return {
        ...prev,
        questions: list.map((q, idx) => ({ ...q, order: idx }))
      };
    });
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index).map((q, idx) => ({ ...q, order: idx }))
    }));
  };

  // Save Assessment
  const handleSaveAssessment = async (targetStatus) => {
    setSaving(true);
    setFormErrors({});

    const errors = {};
    if (!formData.title.trim()) errors.title = 'Assessment title is required.';
    if (!formData.courseId) errors.courseId = 'Please select an associated course.';

    if (targetStatus === 'published') {
      if (formData.questions.length === 0) {
        errors.questions = 'At least one question is required to publish.';
      }
      formData.questions.forEach((q, idx) => {
        if (!q.questionText.trim()) {
          errors[`q_${idx}`] = `Question #${idx + 1} requires question text.`;
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSaving(false);
      showAlert('error', 'Please resolve the errors highlighted below.');
      return;
    }

    try {
      const payload = {
        ...formData,
        status: targetStatus
      };

      if (editingAssessment) {
        const updated = await updateAssessment(editingAssessment.assessmentId, payload, user);
        setAssessments(prev => prev.map(a => a.assessmentId === updated.assessmentId ? updated : a));
        showAlert('success', `Baseline assessment "${updated.title}" updated successfully!`);
      } else {
        const created = await createAssessment(payload, user);
        setAssessments(prev => [created, ...prev]);
        showAlert('success', `Baseline assessment "${created.title}" created successfully!`);
      }
      setEditorOpen(false);
      loadData();
    } catch (err) {
      showAlert('error', err.message || 'Failed to save baseline assessment.');
    } finally {
      setSaving(false);
    }
  };

  // Status Change
  const handleStatusChange = async (assessment, newStatus) => {
    try {
      const updated = await updateAssessmentStatus(assessment.assessmentId, newStatus, user);
      setAssessments(prev => prev.map(a => a.assessmentId === updated.assessmentId ? updated : a));
      showAlert('success', `Status updated to ${newStatus}.`);
      loadData();
    } catch (err) {
      showAlert('error', err.message || 'Failed to update status.');
    }
  };

  // Archive
  const handleArchive = async (assessment) => {
    if (!window.confirm(`Are you sure you want to archive "${assessment.title}"? Historical responses will be preserved.`)) return;
    try {
      const archived = await deleteAssessment(assessment.assessmentId, user);
      setAssessments(prev => prev.map(a => a.assessmentId === archived.assessmentId ? archived : a));
      showAlert('success', 'Assessment archived successfully.');
    } catch (err) {
      showAlert('error', err.message || 'Failed to archive assessment.');
    }
  };

  // View Submissions
  const handleViewSubmissions = async (assessment) => {
    setSelectedAssessment(assessment);
    setSubmissionsOpen(true);
    setSubmissionsLoading(true);
    try {
      const data = await fetchAssessmentResponsesAdmin(assessment.assessmentId, {}, user);
      setSubmissions(data || []);
    } catch (err) {
      showAlert('error', err.message || 'Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (!submissionSearch.trim()) return submissions;
    const q = submissionSearch.toLowerCase().trim();
    return submissions.filter(s =>
      (s.learnerName || '').toLowerCase().includes(q) ||
      (s.learnerEmail || '').toLowerCase().includes(q)
    );
  }, [submissions, submissionSearch]);

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
                <ClipboardCheck className="h-6 w-6 text-[#23735F]" />
                <span>Baseline Assessments</span>
              </h1>
              <p className="text-xs text-gray-500">
                Pre-course knowledge and confidence benchmarks (One Community Ely)
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
              to="/admin/quizzes"
              className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold border border-purple-200"
            >
              Quizzes
            </Link>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Baseline Assessment</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alert */}
      {alertInfo.message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className={`p-4 rounded-xl shadow-xs border flex items-center space-x-3 ${
            alertInfo.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {alertInfo.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{alertInfo.message}</p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Assessments</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Published</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.published}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Draft</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{metrics.draft}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Archived</p>
            <p className="text-2xl font-black text-gray-600 mt-1">{metrics.archived}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by assessment or course title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#23735F] focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 outline-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="unpublished">Unpublished</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 outline-none font-medium max-w-[200px] truncate"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.courseId} value={c.courseId}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assessments List */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-2xs">
            <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading Baseline Assessments...</p>
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-900">No baseline assessments found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Baseline assessments enable adult learners to capture starting knowledge and confidence prior to starting a course.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#23735F] text-white text-xs font-bold rounded-lg hover:bg-[#1b5b4b] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Baseline Assessment</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssessments.map(assessment => {
              const qCount = assessment.questions?.length || 0;
              const isPub = assessment.status === 'published';

              return (
                <div
                  key={assessment.assessmentId}
                  className="bg-white rounded-xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5 space-y-3">
                    {/* Status & Version Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border ${
                        isPub
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : assessment.status === 'draft'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}>
                        {assessment.status}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400">
                        v{assessment.version || 1}
                      </span>
                    </div>

                    {/* Title & Course */}
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 line-clamp-1 leading-snug">
                        {assessment.title}
                      </h3>
                      <p className="text-xs font-semibold text-[#23735F] mt-1 flex items-center gap-1 truncate">
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{assessment.courseTitle || 'Associated Course'}</span>
                      </p>
                    </div>

                    {/* Meta info */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                      <span>{qCount} Question{qCount !== 1 ? 's' : ''}</span>
                      <span>Updated {new Date(assessment.updatedAt || assessment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="bg-gray-50/80 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleViewSubmissions(assessment)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#23735F] hover:text-[#1b5b4b]"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Submissions</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(assessment)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Edit Assessment"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {isPub ? (
                        <button
                          onClick={() => handleStatusChange(assessment, 'unpublished')}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Unpublish"
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(assessment, 'published')}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Publish"
                        >
                          <Globe className="h-4 w-4" />
                        </button>
                      )}

                      {assessment.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(assessment)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* --- Assessment Editor Modal --- */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {editingAssessment ? 'Edit Baseline Assessment' : 'New Baseline Assessment'}
                </h2>
                <p className="text-xs text-gray-500">
                  Pre-course knowledge and starting confidence benchmark
                </p>
              </div>
              <button
                onClick={() => setEditorOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Basic Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Assessment Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Digital Foundations — Starting Point Assessment"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#23735F]"
                  />
                  {formErrors.title && <p className="text-xs text-red-600 mt-1">{formErrors.title}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Target Course *
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#23735F] bg-white"
                  >
                    <option value="">Select a course...</option>
                    {courses.map(c => (
                      <option key={c.courseId} value={c.courseId}>
                        {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                  {formErrors.courseId && <p className="text-xs text-red-600 mt-1">{formErrors.courseId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Learner Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Reinforces friendly, non-graded purpose to adult community learners.
                  </p>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">Questions ({formData.questions.length})</h3>
                    <p className="text-xs text-gray-500">Short-text reflection or 1–5 confidence ratings</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addQuestion('short_text')}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Short-Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuestion('confidence_rating')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>1–5 Confidence</span>
                    </button>
                  </div>
                </div>

                {formErrors.questions && (
                  <p className="text-xs text-red-600 font-semibold">{formErrors.questions}</p>
                )}

                {/* Question List */}
                <div className="space-y-3">
                  {formData.questions.map((q, idx) => {
                    const isConfidence = q.type === 'confidence_rating';

                    return (
                      <div
                        key={q.questionId || idx}
                        className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#23735F] text-white text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                              isConfidence ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isConfidence ? '1–5 Confidence Rating' : 'Short-Text Reflection'}
                            </span>
                            <label className="flex items-center gap-1 text-xs text-gray-600 ml-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={q.required !== false}
                                onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                                className="rounded text-[#23735F] focus:ring-0"
                              />
                              <span>Required</span>
                            </label>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveQuestion(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(idx, 1)}
                              disabled={idx === formData.questions.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateQuestion(idx)}
                              className="p-1 text-gray-400 hover:text-gray-700"
                              title="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(idx)}
                              className="p-1 text-red-400 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div>
                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                            placeholder={isConfidence ? 'e.g. How confident are you using online search?' : 'e.g. What would you like to achieve in this course?'}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                          />
                          {formErrors[`q_${idx}`] && (
                            <p className="text-[11px] text-red-600 mt-1">{formErrors[`q_${idx}`]}</p>
                          )}
                        </div>

                        {/* Question Specific Controls */}
                        {isConfidence ? (
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-[11px] font-bold text-gray-500 mb-2">Learner Preview Scale (1 to 5):</p>
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                              {[1, 2, 3, 4, 5].map(val => (
                                <div
                                  key={val}
                                  className="text-center p-2 rounded-md bg-emerald-50/60 border border-emerald-200 text-emerald-900"
                                >
                                  <div className="text-xs font-black">{val}</div>
                                  <div className="text-[10px] text-emerald-800 font-medium line-clamp-1">
                                    {CONFIDENCE_LABELS[val].split('—')[1]?.trim()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="text"
                              value={q.placeholder || ''}
                              onChange={(e) => updateQuestion(idx, { placeholder: e.target.value })}
                              placeholder="Optional helpful placeholder for the learner..."
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] outline-none text-gray-600"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveAssessment('draft')}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveAssessment('published')}
                  className="px-5 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Publish Assessment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Submissions Drawer / Modal --- */}
      {submissionsOpen && selectedAssessment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-6">
            <div className="p-5 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#23735F]" />
                  <span>Learner Submissions: {selectedAssessment.title}</span>
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedAssessment.courseTitle} • {submissions.length} total submissions
                </p>
              </div>
              <button
                onClick={() => setSubmissionsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b bg-white">
              <input
                type="text"
                placeholder="Search by learner name or email..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
              />
            </div>

            {/* Submissions List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {submissionsLoading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="h-6 w-6 text-[#23735F] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading submissions...</p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No submissions match your search.</p>
                </div>
              ) : (
                filteredSubmissions.map((sub, sIdx) => (
                  <div
                    key={sub.responseId || sIdx}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-gray-900">{sub.learnerName}</span>
                        <span className="text-gray-500 ml-2 font-mono">({sub.learnerEmail})</span>
                      </div>
                      <div className="text-gray-400">
                        Submitted: {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Answers Table */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-2.5">
                      {Object.values(sub.answers || {}).map((ans, aIdx) => (
                        <div key={aIdx} className="text-xs border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                          <p className="font-bold text-gray-800">{ans.questionText}</p>
                          {ans.type === 'confidence_rating' ? (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                                {ans.ratingLabel || `Rating: ${ans.ratingValue}/5`}
                              </span>
                            </div>
                          ) : (
                            <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded text-xs whitespace-pre-wrap">
                              {ans.answerText || '(No text provided)'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 text-right">
              <button
                type="button"
                onClick={() => setSubmissionsOpen(false)}
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

export default AdminBaselineAssessments;
