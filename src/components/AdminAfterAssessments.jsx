import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchAdminAfterAssessments,
  createAfterAssessment,
  createDraftFromBaseline,
  updateAfterAssessment,
  updateAfterAssessmentStatus,
  deleteAfterAssessment,
  fetchAfterAssessmentResponsesAdmin
} from '../services/afterAssessmentService';
import { fetchAdminAssessments as fetchAdminBaselines } from '../services/baselineAssessmentService';
import { fetchAdminCourses } from '../services/courseService';
import {
  BookOpen, Plus, Search, Filter, RefreshCw, ArrowLeft,
  Edit, Globe, EyeOff, Archive, CheckCircle, AlertTriangle,
  Clock, ArrowUp, ArrowDown, Trash2, X, Shield,
  Layers, AlertCircle, Check, Copy, HelpCircle,
  FileText, Play, CheckSquare, ListOrdered, ChevronRight, Eye,
  Users, MessageSquare, Star, Sliders, ClipboardCheck, Award,
  Sparkles, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowRight
} from 'lucide-react';

const CONFIDENCE_LABELS = {
  1: '1 — Not confident',
  2: '2 — Slightly confident',
  3: '3 — Moderately confident',
  4: '4 — Confident',
  5: '5 — Very confident'
};

const AdminAfterAssessments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [assessments, setAssessments] = useState([]);
  const [baselines, setBaselines] = useState([]);
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

  // Auto-create from baseline modal
  const [fromBaselineModalOpen, setFromBaselineModalOpen] = useState(false);
  const [selectedBaselineId, setSelectedBaselineId] = useState('');
  const [creatingFromBaseline, setCreatingFromBaseline] = useState(false);

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
    baselineAssessmentId: '',
    instructions: 'This short assessment helps you and One Community Ely understand what changed during your training. It is not a pass-or-fail test.',
    status: 'draft',
    questions: []
  });

  // Load Data
  const loadData = async () => {
    setRefreshing(true);
    try {
      const [afterData, baselinesData, coursesData] = await Promise.all([
        fetchAdminAfterAssessments({}, user),
        fetchAdminBaselines({}, user),
        fetchAdminCourses({}, user)
      ]);
      setAssessments(afterData || []);
      setBaselines(baselinesData || []);
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

  // Track if create query param was already handled
  const createTriggeredRef = useRef(false);

  // Handle URL query parameters for courseId and create trigger
  useEffect(() => {
    const targetCourseId = searchParams.get('courseId');
    const shouldCreate = searchParams.get('create') === 'true';
    if (courses.length > 0 && targetCourseId && targetCourseId !== 'all') {
      setCourseFilter(targetCourseId);
      if (shouldCreate && !createTriggeredRef.current) {
        createTriggeredRef.current = true;
        const foundCourse = courses.find(c => c.courseId === targetCourseId);
        const matchedBaseline = baselines.find(b => b.courseId === targetCourseId && b.status === 'published');
        setEditingAssessment(null);
        setFormData({
          title: `After Course Assessment - ${foundCourse?.title || ''}`,
          courseId: targetCourseId,
          baselineAssessmentId: matchedBaseline?.assessmentId || '',
          instructions: 'This short assessment helps you and One Community Ely understand what changed during your training. It is not a pass-or-fail test.',
          status: 'draft',
          questions: [
            {
              questionId: `q_${Date.now()}_1`,
              type: 'short_text',
              questionText: 'What was the most valuable thing you learned or achieved in this course?',
              placeholder: 'Share your feedback or takeaways...',
              required: true
            }
          ]
        });
        setEditorOpen(true);
      }
    }
  }, [courses, baselines, searchParams]);

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

  // Associated baseline questions for current course in editor
  const currentCourseBaselines = useMemo(() => {
    if (!formData.courseId) return [];
    return baselines.filter(b => b.courseId === formData.courseId);
  }, [baselines, formData.courseId]);

  const availableBaselineQuestions = useMemo(() => {
    const matching = baselines.find(b => b.assessmentId === formData.baselineAssessmentId) || currentCourseBaselines[0];
    return matching?.questions || [];
  }, [baselines, formData.baselineAssessmentId, currentCourseBaselines]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const defaultCourseId = courses[0]?.courseId || '';
    const courseBaseline = baselines.find(b => b.courseId === defaultCourseId);

    setEditingAssessment(null);
    setFormData({
      title: '',
      courseId: defaultCourseId,
      baselineAssessmentId: courseBaseline?.assessmentId || '',
      instructions: 'This short assessment helps you and One Community Ely understand what changed during your training. It is not a pass-or-fail test.',
      status: 'draft',
      questions: [
        {
          questionId: `q_after_${Date.now()}_1`,
          type: 'confidence_rating',
          questionText: 'How confident are you now about this subject after completing your training?',
          baselineQuestionId: courseBaseline?.questions?.find(q => q.type === 'confidence_rating')?.questionId || '',
          required: true,
          order: 0
        },
        {
          questionId: `q_after_${Date.now()}_2`,
          type: 'short_text',
          questionText: 'What was the most valuable thing you learned from this course?',
          baselineQuestionId: '',
          placeholder: 'Share what stood out to you...',
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
      baselineAssessmentId: assessment.baselineAssessmentId || '',
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
      questionId: `q_after_${Date.now()}_${formData.questions.length + 1}`,
      type,
      questionText: type === 'confidence_rating'
        ? 'How confident are you now with this topic?'
        : 'How will you use what you learned in your daily life or work?',
      baselineQuestionId: '',
      placeholder: type === 'short_text' ? 'Enter your reflections here...' : undefined,
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
        questionId: `q_after_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
        const updated = await updateAfterAssessment(editingAssessment.assessmentId, payload, user);
        setAssessments(prev => prev.map(a => a.assessmentId === updated.assessmentId ? updated : a));
        showAlert('success', `After-assessment "${updated.title}" updated successfully!`);
      } else {
        const created = await createAfterAssessment(payload, user);
        setAssessments(prev => [created, ...prev]);
        showAlert('success', `After-assessment "${created.title}" created successfully!`);
      }
      setEditorOpen(false);
      loadData();
    } catch (err) {
      showAlert('error', err.message || 'Failed to save after-assessment.');
    } finally {
      setSaving(false);
    }
  };

  // Status Change
  const handleStatusChange = async (assessment, newStatus) => {
    try {
      const updated = await updateAfterAssessmentStatus(assessment.assessmentId, newStatus, user);
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
      const archived = await deleteAfterAssessment(assessment.assessmentId, user);
      setAssessments(prev => prev.map(a => a.assessmentId === archived.assessmentId ? archived : a));
      showAlert('success', 'Assessment archived successfully.');
    } catch (err) {
      showAlert('error', err.message || 'Failed to archive assessment.');
    }
  };

  // 1-Click Create from Baseline
  const handleCreateFromBaseline = async () => {
    if (!selectedBaselineId) {
      showAlert('error', 'Please select a baseline assessment.');
      return;
    }
    setCreatingFromBaseline(true);
    try {
      const draft = await createDraftFromBaseline(selectedBaselineId, user);
      setAssessments(prev => [draft, ...prev]);
      setFromBaselineModalOpen(false);
      showAlert('success', `Draft created from baseline: "${draft.title}". You can now review and publish.`);
      handleOpenEdit(draft);
      loadData();
    } catch (err) {
      showAlert('error', err.message || 'Failed to create draft from baseline.');
    } finally {
      setCreatingFromBaseline(false);
    }
  };

  // View Submissions & Outcomes
  const handleViewSubmissions = async (assessment) => {
    setSelectedAssessment(assessment);
    setSubmissionsOpen(true);
    setSubmissionsLoading(true);
    try {
      const data = await fetchAfterAssessmentResponsesAdmin(assessment.assessmentId, {}, user);
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
                <Award className="h-6 w-6 text-[#23735F]" />
                <span>After Assessments & Outcome Comparison</span>
              </h1>
              <p className="text-xs text-gray-500">
                Post-course knowledge & confidence benchmarks (One Community Ely)
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
            <button
              onClick={() => {
                setSelectedBaselineId(baselines[0]?.assessmentId || '');
                setFromBaselineModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Create from Baseline</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New After Assessment</span>
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Final Assessments</p>
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
              placeholder="Search by final assessment or course title..."
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
            <p className="text-sm font-semibold text-gray-700">Loading After Assessments...</p>
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <Award className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-900">No After Assessments Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              After Assessments measure learner confidence gains and starting-to-final shifts once course progress reaches 100%.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedBaselineId(baselines[0]?.assessmentId || '');
                  setFromBaselineModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Create from Baseline</span>
              </button>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#23735F] text-white text-xs font-bold rounded-lg hover:bg-[#1b5b4b] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create New</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssessments.map(assessment => {
              const qCount = assessment.questions?.length || 0;
              const isPub = assessment.status === 'published';
              const linkedCount = assessment.questions?.filter(q => q.baselineQuestionId)?.length || 0;

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
                    <div className="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500 font-medium">
                      <div className="flex items-center justify-between">
                        <span>{qCount} Questions ({linkedCount} linked to baseline)</span>
                        <span>Updated {new Date(assessment.updatedAt || assessment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="bg-gray-50/80 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleViewSubmissions(assessment)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#23735F] hover:text-[#1b5b4b]"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Outcomes</span>
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

      {/* --- Auto-create from Baseline Modal --- */}
      {fromBaselineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span>Create from Baseline Assessment</span>
              </h3>
              <button
                onClick={() => setFromBaselineModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              This will create a new After Assessment draft based on the selected Baseline Assessment. Question links and 1–5 confidence ratings will be preserved and worded for post-course reflection.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Baseline Assessment
              </label>
              <select
                value={selectedBaselineId}
                onChange={(e) => setSelectedBaselineId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-[#23735F]"
              >
                <option value="">Select an assessment...</option>
                {baselines.map(b => (
                  <option key={b.assessmentId} value={b.assessmentId}>
                    {b.title} ({b.courseTitle})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFromBaselineModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFromBaseline}
                disabled={creatingFromBaseline || !selectedBaselineId}
                className="flex-1 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {creatingFromBaseline ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Create Draft</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Assessment Editor Modal --- */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
            <div className="p-5 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {editingAssessment ? 'Edit After Assessment' : 'New After Assessment'}
                </h2>
                <p className="text-xs text-gray-500">
                  Post-training confidence shifts and learner reflections
                </p>
              </div>
              <button
                onClick={() => setEditorOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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
                    placeholder="e.g. Digital Foundations — Final Outcome Assessment"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#23735F]"
                  />
                  {formErrors.title && <p className="text-xs text-red-600 mt-1">{formErrors.title}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      Associated Baseline Assessment
                    </label>
                    <select
                      value={formData.baselineAssessmentId}
                      onChange={(e) => setFormData({ ...formData, baselineAssessmentId: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#23735F] bg-white"
                    >
                      <option value="">None (Standalone)</option>
                      {currentCourseBaselines.map(b => (
                        <option key={b.assessmentId} value={b.assessmentId}>
                          {b.title} (v{b.version})
                        </option>
                      ))}
                    </select>
                  </div>
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
                    Reinforces friendly, non-graded purpose: "This short assessment helps you and One Community Ely understand what changed during your training. It is not a pass-or-fail test."
                  </p>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">Questions ({formData.questions.length})</h3>
                    <p className="text-xs text-gray-500">Confidence ratings can link to baseline questions for outcome comparison</p>
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
                            placeholder={isConfidence ? 'e.g. How confident are you now using online search?' : 'e.g. What was the most important thing you learned?'}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                          />
                          {formErrors[`q_${idx}`] && (
                            <p className="text-[11px] text-red-600 mt-1">{formErrors[`q_${idx}`]}</p>
                          )}
                        </div>

                        {/* Baseline Linker for Confidence Questions */}
                        {isConfidence && availableBaselineQuestions.length > 0 && (
                          <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-gray-700">
                              Link to Baseline Question for Outcome Comparison:
                            </span>
                            <select
                              value={q.baselineQuestionId || ''}
                              onChange={(e) => updateQuestion(idx, { baselineQuestionId: e.target.value || null })}
                              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-800 outline-none max-w-xs truncate font-medium"
                            >
                              <option value="">No baseline link (Standalone)</option>
                              {availableBaselineQuestions.map(bq => (
                                <option key={bq.questionId} value={bq.questionId}>
                                  {bq.questionText} ({bq.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

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
                  <span>Publish Final Assessment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Submissions & Outcomes Modal --- */}
      {submissionsOpen && selectedAssessment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden my-6">
            <div className="p-5 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#23735F]" />
                  <span>Learner Outcomes: {selectedAssessment.title}</span>
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedAssessment.courseTitle} • {submissions.length} completed outcome reflections
                </p>
              </div>
              <button
                onClick={() => setSubmissionsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b bg-white">
              <input
                type="text"
                placeholder="Search by learner name or email..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
              />
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {submissionsLoading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="h-6 w-6 text-[#23735F] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading outcomes...</p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Award className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No submissions match your search.</p>
                </div>
              ) : (
                filteredSubmissions.map((sub, sIdx) => {
                  const comp = sub.comparison || {};
                  const avgBase = comp.averageBaseline;
                  const avgFin = comp.averageFinal;
                  const avgChg = comp.averageChange;

                  return (
                    <div
                      key={sub.responseId || sIdx}
                      className="p-5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-4 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-extrabold text-gray-900 text-sm">{sub.learnerName}</span>
                          <span className="text-gray-500 ml-2 font-mono">({sub.learnerEmail})</span>
                        </div>
                        <div className="text-gray-400">
                          Submitted: {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Summary Metrics Pill Bar */}
                      {comp.hasValidComparison && (
                        <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-gray-200 text-center">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-gray-500">Baseline Avg</p>
                            <p className="text-base font-black text-gray-800">{avgBase} / 5</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-gray-500">Final Avg</p>
                            <p className="text-base font-black text-[#23735F]">{avgFin} / 5</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-gray-500">Confidence Shift</p>
                            <p className={`text-base font-black ${
                              avgChg > 0 ? 'text-emerald-700' : avgChg === 0 ? 'text-blue-700' : 'text-gray-700'
                            }`}>
                              {avgChg > 0 ? `+${avgChg}` : avgChg}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Question Breakdown */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Question Reflections & Comparisons
                        </h4>
                        {(comp.questionComparisons || []).map((qc, qIdx) => (
                          <div key={qIdx} className="text-xs border-b border-gray-100 last:border-b-0 pb-3 last:pb-0 space-y-1.5">
                            <p className="font-bold text-gray-800">{qc.questionText}</p>

                            {qc.type === 'confidence_rating' ? (
                              qc.status === 'compared' ? (
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-[11px]">
                                    Before: {qc.baselineRating}/5
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-gray-400" />
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                    After: {qc.finalRating}/5
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                    qc.change > 0
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : qc.change === 0
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}>
                                    {qc.change > 0 ? `+${qc.change} Improved` : qc.change === 0 ? '0 Maintained' : `${qc.change} Lower`}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                    Rating: {qc.finalRating}/5
                                  </span>
                                  <span className="text-gray-400 text-[11px] italic">
                                    (Comparison unavailable — no linked baseline rating)
                                  </span>
                                </div>
                              )
                            ) : (
                              <p className="text-gray-600 bg-gray-50 p-2.5 rounded text-xs whitespace-pre-wrap">
                                {qc.answerText || '(No text provided)'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
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

export default AdminAfterAssessments;
