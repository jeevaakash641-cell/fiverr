import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, Plus, Search, Filter, RefreshCw, Eye, Edit2, Archive,
  RotateCcw, Trash2, X, Check, AlertCircle, FileText, Image as ImageIcon,
  Video, Link as LinkIcon, ExternalLink, Calendar, Users, MapPin,
  ShieldCheck, ShieldAlert, Sparkles, Download, Upload, Clock,
  FileCheck, ChevronLeft, ChevronRight, Lock, MessageSquare, Award,
  GraduationCap, BookOpen, CheckCircle, BarChart3, TrendingUp, HelpCircle, Star, ThumbsUp
} from 'lucide-react';
import {
  fetchEvidenceList,
  fetchEvidenceById,
  createEvidence,
  updateEvidence,
  updateEvidenceStatus,
  deleteEvidence,
  deleteAllEvidence,
  bulkDeleteEvidence,
  uploadEvidenceAttachment,
  deleteEvidenceAttachment,
  downloadEvidenceAttachment,
  generateAutomaticEvidence,
  refreshAutomaticEvidence,
  updateAutomaticEvidenceNotes,
  downloadAutomaticEvidenceExport,
  fetchPlatformActivityDetails,
  downloadPlatformActivityExport,
  EVIDENCE_CATEGORIES,
  EVIDENCE_STATUSES,
  CONSENT_STATUS_OPTIONS,
  formatUKDate
} from '../services/evidenceService';
import { verifyCertificatePublic, downloadCertificatePdf } from '../services/certificateService';

const AdminEvidenceLibrary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [evidenceList, setEvidenceList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Notification Banner
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
  const showAlert = (type, message) => {
    setAlertInfo({ type, message });
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 5000);
  };

  // Create / Edit Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const defaultFormData = {
    activityTitle: '',
    category: 'Community Event',
    customCategory: '',
    activityDate: new Date().toISOString().split('T')[0],
    location: '',
    attendanceCount: '',
    status: 'draft',
    description: '',
    outcomeSummary: '',
    beneficiaryStories: '',
    caseStudies: '',
    consentStatus: 'No public-use permission',
    consentWithdrawalReason: '',
    notes: '',
    socialLinks: [],
    podcastLinks: [],
    videoLinks: []
  };

  const [formData, setFormData] = useState(defaultFormData);

  // Link input helper states
  const [newSocialLink, setNewSocialLink] = useState('');
  const [newPodcastLink, setNewPodcastLink] = useState('');
  const [newVideoLink, setNewVideoLink] = useState('');

  // Attachment upload helper states
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentDesc, setAttachmentDesc] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // View Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null);

  // Archive / Delete Confirmation Modals
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetRecord, setTargetRecord] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Multi-Selection and Bulk Deletion State
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Dual-source Dashboard Tab ('all' | 'automatic' | 'manual' | 'archived')
  const [sourceTab, setSourceTab] = useState('all');

  // Automatic Evidence Review Modal State
  const [autoReviewModalOpen, setAutoReviewModalOpen] = useState(false);
  const [autoRecord, setAutoRecord] = useState(null);
  const [autoNotes, setAutoNotes] = useState('');
  const [autoOutcome, setAutoOutcome] = useState('');
  const [autoStatus, setAutoStatus] = useState('draft');
  const [savingAutoNotes, setSavingAutoNotes] = useState(false);
  const [refreshingAutoRecord, setRefreshingAutoRecord] = useState(false);

  // Platform Activity (Learner Progress & Sub-tabs) States
  const [platformSubTab, setPlatformSubTab] = useState('overview');
  const [platformData, setPlatformData] = useState({
    overview: {},
    coursePerformance: [],
    selectionsList: [],
    progressList: [],
    completionsList: [],
    quizResultsList: [],
    assessmentsList: [],
    feedbackList: [],
    certificatesList: [],
    courses: []
  });
  const [loadingPlatform, setLoadingPlatform] = useState(false);
  const [platformFilters, setPlatformFilters] = useState({
    search: '',
    courseId: 'all',
    category: 'all',
    quickDate: 'all',
    startDate: '',
    endDate: ''
  });
  const [exportingCsv, setExportingCsv] = useState(false);

  // Drill-Down Modal State
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownItems, setDrillDownItems] = useState([]);
  const [drillDownType, setDrillDownType] = useState('');
  const [drillDownSearch, setDrillDownSearch] = useState('');

  // Certificate Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyInputNumber, setVerifyInputNumber] = useState('');
  const [verifyingCert, setVerifyingCert] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  // Load Platform Activity Data
  const loadPlatformData = async (customFilters = platformFilters) => {
    setLoadingPlatform(true);
    try {
      const data = await fetchPlatformActivityDetails({
        search: customFilters.search,
        courseId: customFilters.courseId !== 'all' ? customFilters.courseId : undefined,
        category: customFilters.category !== 'all' ? customFilters.category : undefined,
        startDate: customFilters.startDate || undefined,
        endDate: customFilters.endDate || undefined
      }, user);
      if (data) {
        setPlatformData(data);
      }
    } catch (err) {
      showAlert('error', 'Failed to load platform activity: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingPlatform(false);
    }
  };

  // Quick Date Filter Handler
  const handleQuickDateChange = (range) => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().split('T')[0];

    if (range === '7d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (range === '30d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (range === 'quarter') {
      const d = new Date(today);
      d.setDate(d.getDate() - 90);
      start = d.toISOString().split('T')[0];
    } else if (range === 'year') {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - 1);
      start = d.toISOString().split('T')[0];
    } else if (range === 'all') {
      start = '';
      end = '';
    }

    const updated = { ...platformFilters, quickDate: range, startDate: start, endDate: end };
    setPlatformFilters(updated);
    loadPlatformData(updated);
  };

  // Export CSV for Platform Activity tab
  const handleExportPlatformCsv = async (tabType = platformSubTab) => {
    setExportingCsv(true);
    try {
      await downloadPlatformActivityExport(
        tabType,
        {
          search: platformFilters.search,
          courseId: platformFilters.courseId !== 'all' ? platformFilters.courseId : undefined,
          category: platformFilters.category !== 'all' ? platformFilters.category : undefined,
          startDate: platformFilters.startDate || undefined,
          endDate: platformFilters.endDate || undefined
        },
        `one-community-ely-${tabType}-${new Date().toISOString().split('T')[0]}.csv`,
        user
      );
      showAlert('success', `Exported ${tabType} report as CSV.`);
    } catch (err) {
      showAlert('error', 'Failed to export CSV: ' + (err.message || 'Error'));
    } finally {
      setExportingCsv(false);
    }
  };

  // Certificate Verification Actions
  const handleVerifyCertificateAction = async (certNum) => {
    const numToVerify = (certNum || verifyInputNumber || '').trim();
    if (!numToVerify) return;
    setVerifyingCert(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const res = await verifyCertificatePublic(numToVerify);
      setVerifyResult(res?.verification || null);
    } catch (err) {
      setVerifyError(err.message || 'Failed to verify certificate.');
    } finally {
      setVerifyingCert(false);
    }
  };

  const handleOpenVerifyModal = (certNum = '') => {
    setVerifyInputNumber(certNum);
    setVerifyResult(null);
    setVerifyError(null);
    setVerifyModalOpen(true);
    if (certNum) {
      handleVerifyCertificateAction(certNum);
    }
  };

  // Open Drill-Down Modal
  const handleOpenDrillDown = (title, items, type) => {
    setDrillDownTitle(title);
    setDrillDownItems(items || []);
    setDrillDownType(type || 'generic');
    setDrillDownSearch('');
    setDrillDownOpen(true);
  };

  // Load Data
  const loadData = async (page = currentPage) => {
    setRefreshing(true);
    try {
      const querySource = sourceTab === 'archived' ? 'all' : sourceTab;
      const queryStatus = sourceTab === 'archived' ? 'archived' : (statusFilter === 'archived' ? 'all' : statusFilter);
      const res = await fetchEvidenceList({
        source: querySource,
        search: searchQuery,
        category: categoryFilter,
        status: queryStatus,
        startDate: startDateFilter,
        endDate: endDateFilter,
        sort: sortOrder,
        page,
        limit: 10
      }, user);

      setEvidenceList(res.records || []);
      setPagination(res.pagination || { page, limit: 10, totalCount: (res.records || []).length, totalPages: 1 });
    } catch (err) {
      showAlert('error', err.message || 'Failed to load evidence records');
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
      navigate('/admin-login');
      return;
    }
    if (sourceTab === 'automatic') {
      loadPlatformData();
    }
    loadData(currentPage);
  }, [user, sourceTab, categoryFilter, statusFilter, sortOrder, currentPage]);

  // Handle Search Trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
    setSortOrder('newest');
    setCurrentPage(1);
    setTimeout(() => loadData(1), 50);
  };

  // Automatic Evidence Handlers
  const handleOpenAutoReview = async (record) => {
    try {
      const fullRecord = await fetchEvidenceById(record.evidenceId, user);
      setAutoRecord(fullRecord);
      setAutoNotes(fullRecord.adminNotes || fullRecord.notes || '');
      setAutoOutcome(fullRecord.outcomeSummary || '');
      setAutoStatus(fullRecord.status || 'draft');
      setAutoReviewModalOpen(true);
    } catch (err) {
      showAlert('error', 'Could not open automatic evidence review: ' + err.message);
    }
  };

  const handleSaveAutoReview = async () => {
    if (!autoRecord) return;
    setSavingAutoNotes(true);
    try {
      const updated = await updateAutomaticEvidenceNotes(autoRecord.evidenceId, {
        adminNotes: autoNotes,
        outcomeSummary: autoOutcome,
        status: autoStatus
      }, user);
      setAutoRecord(updated);
      showAlert('success', 'Platform evidence review notes and status saved successfully.');
      loadData(currentPage);
    } catch (err) {
      showAlert('error', 'Failed to save review: ' + err.message);
    } finally {
      setSavingAutoNotes(false);
    }
  };

  const handleRecalculateAutoRecord = async () => {
    if (!autoRecord) return;
    setRefreshingAutoRecord(true);
    try {
      const res = await refreshAutomaticEvidence(autoRecord.evidenceId, user);
      const refreshed = res.evidence || res;
      setAutoRecord(refreshed);
      showAlert('success', 'Platform metrics recalculated successfully. Admin notes and interpretations were preserved.');
      loadData(currentPage);
    } catch (err) {
      showAlert('error', 'Failed to recalculate platform metrics: ' + err.message);
    } finally {
      setRefreshingAutoRecord(false);
    }
  };

  const handleRefreshAllPlatformEvidence = async () => {
    setRefreshing(true);
    try {
      const res = await generateAutomaticEvidence({}, user);
      showAlert('success', res.message || 'Platform activity scanned and evidence summaries updated.');
      loadData(1);
    } catch (err) {
      showAlert('error', 'Failed to refresh platform evidence: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportAutoCsv = async () => {
    if (!autoRecord) return;
    try {
      await downloadAutomaticEvidenceExport(autoRecord.evidenceId, `automatic-evidence-${autoRecord.evidenceId}.csv`, user);
      showAlert('success', 'Platform evidence summary CSV downloaded.');
    } catch (err) {
      showAlert('error', 'Failed to export CSV: ' + err.message);
    }
  };

  // Metrics (computed from currently loaded / full summary)
  const metrics = useMemo(() => {
    const total = pagination.totalCount || evidenceList.length;
    const published = evidenceList.filter(e => e.status === 'published').length;
    const draft = evidenceList.filter(e => e.status === 'draft').length;
    const archived = evidenceList.filter(e => e.status === 'archived').length;
    const autoCount = evidenceList.filter(e => e.source === 'automatic').length;
    const manualCount = evidenceList.filter(e => e.source !== 'automatic').length;
    const recordedAttendance = evidenceList.reduce((acc, curr) => {
      return acc + (typeof curr.attendanceCount === 'number' ? curr.attendanceCount : 0);
    }, 0);
    return { total, published, draft, archived, autoCount, manualCount, recordedAttendance };
  }, [evidenceList, pagination]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormData(defaultFormData);
    setFormErrors({});
    setNewSocialLink('');
    setNewPodcastLink('');
    setNewVideoLink('');
    setAttachmentFile(null);
    setAttachmentDesc('');
    setFormModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = async (record) => {
    if (record.source === 'automatic') {
      return handleOpenAutoReview(record);
    }

    try {
      const fullRecord = await fetchEvidenceById(record.evidenceId, user);
      setEditingRecord(fullRecord);
      setFormData({
        activityTitle: fullRecord.activityTitle || '',
        category: fullRecord.category || 'Community Event',
        customCategory: fullRecord.customCategory || '',
        activityDate: fullRecord.activityDate || new Date().toISOString().split('T')[0],
        location: fullRecord.location || '',
        attendanceCount: fullRecord.attendanceCount !== null && fullRecord.attendanceCount !== undefined ? String(fullRecord.attendanceCount) : '',
        status: fullRecord.status || 'draft',
        description: fullRecord.description || '',
        outcomeSummary: fullRecord.outcomeSummary || '',
        beneficiaryStories: fullRecord.beneficiaryStories || '',
        caseStudies: fullRecord.caseStudies || '',
        consentStatus: fullRecord.consentStatus || 'No public-use permission',
        consentWithdrawalReason: '',
        notes: fullRecord.notes || '',
        socialLinks: Array.isArray(fullRecord.socialLinks) ? [...fullRecord.socialLinks] : [],
        podcastLinks: Array.isArray(fullRecord.podcastLinks) ? [...fullRecord.podcastLinks] : [],
        videoLinks: Array.isArray(fullRecord.videoLinks) ? [...fullRecord.videoLinks] : []
      });
      setFormErrors({});
      setNewSocialLink('');
      setNewPodcastLink('');
      setNewVideoLink('');
      setAttachmentFile(null);
      setAttachmentDesc('');
      setFormModalOpen(true);
    } catch (err) {
      showAlert('error', 'Could not open record for editing: ' + err.message);
    }
  };

  // Open View Modal
  const handleOpenView = async (record) => {
    if (record.source === 'automatic') {
      return handleOpenAutoReview(record);
    }

    try {
      const fullRecord = await fetchEvidenceById(record.evidenceId, user);
      setViewingRecord(fullRecord);
      setViewModalOpen(true);
    } catch (err) {
      showAlert('error', 'Could not load record details: ' + err.message);
    }
  };

  // Form Validation
  const validateForm = (isSubmittingDraft = false) => {
    const errors = {};
    const title = (formData.activityTitle || '').trim();
    if (!title || title.length < 3) {
      errors.activityTitle = 'Activity title is required (minimum 3 characters).';
    } else if (title.length > 150) {
      errors.activityTitle = 'Title cannot exceed 150 characters.';
    }

    if (!isSubmittingDraft) {
      const desc = (formData.description || '').trim();
      if (!desc) {
        errors.description = 'Description is required for published records.';
      } else if (desc.length > 3000) {
        errors.description = 'Description cannot exceed 3000 characters.';
      }
    }

    if (!formData.activityDate) {
      errors.activityDate = 'Activity date is required.';
    }

    if (formData.category === 'Other' && !formData.customCategory.trim()) {
      errors.customCategory = 'Please specify the custom category.';
    }

    if (formData.attendanceCount !== '') {
      const num = Number(formData.attendanceCount);
      if (isNaN(num) || !Number.isInteger(num) || num < 0) {
        errors.attendanceCount = 'Attendance must be a positive whole number or left blank.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Record (Draft or Published)
  const handleSaveRecord = async (targetStatus = null) => {
    const desiredStatus = targetStatus || formData.status || 'draft';
    const isDraft = desiredStatus === 'draft';

    if (!validateForm(isDraft)) {
      showAlert('error', 'Please resolve the highlighted validation errors.');
      return;
    }

    setSavingRecord(true);
    try {
      const payload = {
        activityTitle: formData.activityTitle.trim(),
        category: formData.category,
        customCategory: formData.category === 'Other' ? formData.customCategory.trim() : '',
        activityDate: formData.activityDate,
        location: formData.location.trim(),
        attendanceCount: formData.attendanceCount !== '' ? Number(formData.attendanceCount) : null,
        status: desiredStatus,
        description: formData.description.trim(),
        outcomeSummary: formData.outcomeSummary.trim(),
        beneficiaryStories: formData.beneficiaryStories.trim(),
        caseStudies: formData.caseStudies.trim(),
        consentStatus: formData.consentStatus,
        consentWithdrawalReason: formData.consentWithdrawalReason.trim(),
        notes: formData.notes.trim(),
        socialLinks: formData.socialLinks,
        podcastLinks: formData.podcastLinks,
        videoLinks: formData.videoLinks
      };

      let saved;
      if (editingRecord) {
        payload.version = editingRecord.version;
        saved = await updateEvidence(editingRecord.evidenceId, payload, user);
        showAlert('success', `Evidence record "${saved.activityTitle}" updated successfully.`);
      } else {
        saved = await createEvidence(payload, user);
        showAlert('success', `Evidence record "${saved.activityTitle}" created.`);
      }

      // If there was an attachment selected during edit/create, upload it now
      if (attachmentFile && saved?.evidenceId) {
        try {
          await uploadEvidenceAttachment(saved.evidenceId, attachmentFile, attachmentDesc, user);
          showAlert('success', 'Attachment linked successfully.');
        } catch (attErr) {
          showAlert('error', 'Record saved, but attachment upload failed: ' + attErr.message);
        }
      }

      setFormModalOpen(false);
      loadData(currentPage);
    } catch (err) {
      showAlert('error', err.message || 'Failed to save evidence record.');
    } finally {
      setSavingRecord(false);
    }
  };

  // Link Helpers
  const addLink = (type) => {
    let url = '';
    let setter = null;
    let field = '';

    if (type === 'social') { url = newSocialLink; setter = setNewSocialLink; field = 'socialLinks'; }
    else if (type === 'podcast') { url = newPodcastLink; setter = setNewPodcastLink; field = 'podcastLinks'; }
    else if (type === 'video') { url = newVideoLink; setter = setNewVideoLink; field = 'videoLinks'; }

    const clean = (url || '').trim();
    if (!clean) return;

    if (!clean.startsWith('https://')) {
      showAlert('error', 'Only secure https:// URLs are permitted.');
      return;
    }

    try {
      new URL(clean);
    } catch {
      showAlert('error', 'Invalid URL format.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], clean]
    }));
    setter('');
  };

  const removeLink = (type, index) => {
    const field = type === 'social' ? 'socialLinks' : type === 'podcast' ? 'podcastLinks' : 'videoLinks';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Attachment upload directly on editing record
  const handleUploadAttachmentDirect = async () => {
    if (!editingRecord || !attachmentFile) return;
    setUploadingAttachment(true);
    try {
      const newAtt = await uploadEvidenceAttachment(
        editingRecord.evidenceId,
        attachmentFile,
        attachmentDesc,
        user
      );
      setEditingRecord(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAtt]
      }));
      setAttachmentFile(null);
      setAttachmentDesc('');
      showAlert('success', `Attachment "${newAtt.originalFilename}" attached.`);
      loadData(currentPage);
    } catch (err) {
      showAlert('error', 'Attachment upload failed: ' + err.message);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachmentDirect = async (attachmentId) => {
    if (!editingRecord) return;
    if (!window.confirm('Remove this attachment? The file will be removed permanently.')) return;

    try {
      await deleteEvidenceAttachment(editingRecord.evidenceId, attachmentId, user);
      setEditingRecord(prev => ({
        ...prev,
        attachments: (prev.attachments || []).filter(a => a.attachmentId !== attachmentId)
      }));
      showAlert('success', 'Attachment removed.');
      loadData(currentPage);
    } catch (err) {
      showAlert('error', 'Failed to remove attachment: ' + err.message);
    }
  };

  // Archive Action (Default action)
  const handleConfirmArchive = async () => {
    if (!targetRecord) return;
    setActionProcessing(true);
    try {
      const isArchived = targetRecord.status === 'archived';
      const targetStatus = isArchived ? 'published' : 'archived';
      await updateEvidenceStatus(targetRecord.evidenceId, targetStatus, user);
      showAlert('success', `Evidence record "${targetRecord.activityTitle}" ${isArchived ? 'restored' : 'archived'}.`);
      setArchiveModalOpen(false);
      setTargetRecord(null);
      loadData(currentPage);
    } catch (err) {
      showAlert('error', 'Status change failed: ' + err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Permanent Delete Action (Requires confirmation text)
  const handleConfirmDelete = async () => {
    if (!targetRecord) return;
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') {
      showAlert('error', 'Please type DELETE to confirm permanent deletion.');
      return;
    }

    setActionProcessing(true);
    try {
      await deleteEvidence(targetRecord.evidenceId, user);
      showAlert('success', `Evidence record "${targetRecord.activityTitle}" permanently deleted.`);
      setDeleteModalOpen(false);
      setTargetRecord(null);
      setDeleteConfirmText('');
      loadData(currentPage);
    } catch (err) {
      showAlert('error', 'Deletion failed: ' + err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === evidenceList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(evidenceList.map(e => e.evidenceId));
    }
  };

  // Bulk Delete Action
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeletingBulk(true);
    try {
      const res = await bulkDeleteEvidence(selectedIds, user);
      showAlert('success', `Successfully deleted ${res.deletedCount || selectedIds.length} selected evidence records.`);
      setBulkDeleteModalOpen(false);
      setSelectedIds([]);
      loadData(currentPage);
    } catch (err) {
      showAlert('error', 'Bulk deletion failed: ' + err.message);
    } finally {
      setDeletingBulk(false);
    }
  };

  // Delete All Records Action
  const handleConfirmDeleteAll = async () => {
    if (deleteAllConfirmText.trim().toLowerCase() !== 'delete') {
      showAlert('error', 'Please type DELETE to confirm permanent deletion.');
      return;
    }
    setDeletingAll(true);
    try {
      const res = await deleteAllEvidence(user);
      showAlert('success', `Successfully purged ${res.deletedCount} evidence records.`);
      setDeleteAllModalOpen(false);
      setDeleteAllConfirmText('');
      setSelectedIds([]);
      loadData(1);
    } catch (err) {
      showAlert('error', 'Delete all evidence failed: ' + err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                <span>Evidence Library</span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#23735F] border border-emerald-200 uppercase">
                  Community Impact
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                One Community Ely CIC • Activity Evidence, Attendance & Beneficiary Stories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadData(currentPage)}
              disabled={refreshing}
              className="p-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh records"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-[#23735F]' : ''}`} />
            </button>

            <button
              onClick={handleRefreshAllPlatformEvidence}
              disabled={refreshing}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Scan and calculate platform learner progress, quizzes, completions, and feedback into automatic evidence"
            >
              <Sparkles className={`h-4 w-4 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Platform Evidence</span>
            </button>

            <Link
              to="/admin/impact-reports"
              className="px-3.5 py-2 border border-emerald-300 text-[#23735F] hover:bg-emerald-50 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <Award className="h-4 w-4" />
              <span>Impact Reports</span>
            </Link>

            <button
              onClick={() => { setDeleteAllConfirmText(''); setDeleteAllModalOpen(true); }}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Permanently delete all evidence records and purge storage"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
              <span>Delete All</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-black rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Evidence Record</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Notification Alert */}
        {alertInfo.message && (
          <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
            alertInfo.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}>
            <div className="flex items-center gap-2">
              {alertInfo.type === 'error' ? <AlertCircle className="h-4 w-4 text-red-600" /> : <Check className="h-4 w-4 text-emerald-600" />}
              <span>{alertInfo.message}</span>
            </div>
            <button onClick={() => setAlertInfo({ type: '', message: '' })} className="p-1 hover:opacity-75">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Records</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Published / Internal</p>
            <p className="text-2xl font-black text-emerald-800 mt-1">{metrics.published}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Drafts</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{metrics.draft}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Recorded Attendance</p>
            <p className="text-2xl font-black text-blue-900 mt-1">{metrics.recordedAttendance}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Archived</p>
            <p className="text-2xl font-black text-gray-600 mt-1">{metrics.archived}</p>
          </div>
        </div>

        {/* Dual-Source Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-2 overflow-x-auto bg-white px-4 pt-3 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => { setSourceTab('all'); setCurrentPage(1); }}
            className={`pb-3 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              sourceTab === 'all'
                ? 'border-[#23735F] text-[#23735F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>All Evidence</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 font-black">
              {metrics.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSourceTab('automatic'); setCurrentPage(1); }}
            className={`pb-3 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              sourceTab === 'automatic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>Automatically Generated</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-black border border-blue-200">
              Verified Platform
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSourceTab('manual'); setCurrentPage(1); }}
            className={`pb-3 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              sourceTab === 'manual'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4 text-emerald-600" />
            <span>Manual Community Evidence</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-800 font-black border border-emerald-200">
              Manual Form
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSourceTab('archived'); setCurrentPage(1); }}
            className={`pb-3 px-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              sourceTab === 'archived'
                ? 'border-gray-800 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>Archived</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 font-black">
              {metrics.archived}
            </span>
          </button>
        </div>

        {/* CONDITIONAL RENDERING: AUTOMATIC (PLATFORM ACTIVITY) vs MANUAL / ALL / ARCHIVED */}
        {sourceTab === 'automatic' ? (
          <div className="space-y-6">
            {/* Platform Activity Sub-Tabs Navigation */}
            <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview & Metrics', icon: BarChart3 },
                { id: 'selections', label: 'Course Selections', icon: BookOpen, count: platformData.selectionsList?.length },
                { id: 'progress', label: 'Course Progress', icon: TrendingUp, count: platformData.progressList?.length },
                { id: 'completions', label: 'Course Completions', icon: CheckCircle, count: platformData.completionsList?.length },
                { id: 'quizzes', label: 'Quiz Results', icon: HelpCircle, count: platformData.quizResultsList?.length },
                { id: 'assessments', label: 'Assessments (Before/After)', icon: Sparkles, count: platformData.assessmentsList?.length },
                { id: 'feedback', label: 'Beneficiary Feedback', icon: MessageSquare, count: platformData.feedbackList?.length },
                { id: 'certificates', label: 'Certificates & Verification', icon: ShieldCheck, count: platformData.certificatesList?.length },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = platformSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPlatformSubTab(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {typeof tab.count === 'number' && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Platform Activity Filter & Export Toolbar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search learner name, email, or course..."
                    value={platformFilters.search}
                    onChange={(e) => {
                      const updated = { ...platformFilters, search: e.target.value };
                      setPlatformFilters(updated);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        loadPlatformData(platformFilters);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => loadPlatformData(platformFilters)}
                    disabled={loadingPlatform}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportPlatformCsv(platformSubTab)}
                    disabled={exportingCsv}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="Export currently visible platform data as CSV"
                  >
                    <Download className={`h-3.5 w-3.5 ${exportingCsv ? 'animate-bounce' : ''}`} />
                    <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenVerifyModal('')}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Verify Certificate</span>
                  </button>
                </div>
              </div>

              {/* Detailed Filter Dropdowns & Quick Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                {/* Course Filter */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Course Filter
                  </label>
                  <select
                    value={platformFilters.courseId}
                    onChange={(e) => {
                      const updated = { ...platformFilters, courseId: e.target.value };
                      setPlatformFilters(updated);
                      loadPlatformData(updated);
                    }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="all">All Courses</option>
                    {(platformData.courses || []).map((c) => (
                      <option key={c.courseId} value={c.courseId}>{c.title}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Category Filter
                  </label>
                  <select
                    value={platformFilters.category}
                    onChange={(e) => {
                      const updated = { ...platformFilters, category: e.target.value };
                      setPlatformFilters(updated);
                      loadPlatformData(updated);
                    }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="all">All Categories</option>
                    {EVIDENCE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Quick Date Filters */}
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Quick Date Range
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: '7d', label: 'Last 7 Days' },
                      { id: '30d', label: 'Last 30 Days' },
                      { id: 'quarter', label: 'This Quarter' },
                      { id: 'year', label: 'This Year' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleQuickDateChange(q.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          platformFilters.quickDate === q.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Activity Content Section */}
            {loadingPlatform ? (
              <div className="py-20 bg-white rounded-2xl border border-gray-200 text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-gray-500">Calculating authoritative platform activity metrics...</p>
              </div>
            ) : (
              <div>
                {/* 1. OVERVIEW & METRICS SUB-TAB */}
                {platformSubTab === 'overview' && (
                  <div className="space-y-6">
                    {/* 16 Metric Summary Cards (Interactive Drill-Down) */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <span>Platform Health & Engagement Metrics (Click for Learner Details)</span>
                        </h3>
                        <span className="text-[10px] text-gray-400 font-semibold">
                          Authoritative Platform Subsystems • One Community Ely
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {/* 1. Total Enrolled Learners */}
                        <div
                          onClick={() => handleOpenDrillDown('All Enrolled Learners', platformData.selectionsList || [], 'learners')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-gray-400 group-hover:text-blue-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Total Enrolled Learners</span>
                            <Users className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-gray-900 mt-1">{platformData.overview?.totalLearners ?? 0}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Unique adult learners on platform</p>
                        </div>

                        {/* 2. Active Learners (Past 30 Days) */}
                        <div
                          onClick={() => handleOpenDrillDown('Active Learners (Past 30 Days)', platformData.progressList || [], 'progress')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-emerald-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Active Learners (30d)</span>
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-emerald-800 mt-1">{platformData.overview?.activeLearners ?? 0}</p>
                          <p className="text-[10px] text-emerald-600 mt-1">Learners active in past 30 days</p>
                        </div>

                        {/* 3. Total Course Selections */}
                        <div
                          onClick={() => setPlatformSubTab('selections')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-gray-400 group-hover:text-blue-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Course Selections</span>
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-gray-900 mt-1">{platformData.overview?.totalSelections ?? 0}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Total course enrolments</p>
                        </div>

                        {/* 4. Learners Started */}
                        <div
                          onClick={() => setPlatformSubTab('progress')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-blue-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Learners Started</span>
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-blue-900 mt-1">{platformData.overview?.learnersStarted ?? 0}</p>
                          <p className="text-[10px] text-blue-600 mt-1">Completed at least 1 lesson</p>
                        </div>

                        {/* 5. In Progress Courses */}
                        <div
                          onClick={() => handleOpenDrillDown('Courses In Progress', (platformData.progressList || []).filter(p => p.continueStatus === 'In Progress'), 'progress')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-amber-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-amber-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Courses In Progress</span>
                            <Clock className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-amber-800 mt-1">{platformData.overview?.coursesInProgress ?? 0}</p>
                          <p className="text-[10px] text-amber-600 mt-1">Actively learning</p>
                        </div>

                        {/* 6. Completed Courses */}
                        <div
                          onClick={() => setPlatformSubTab('completions')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-emerald-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Courses Completed</span>
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-emerald-900 mt-1">{platformData.overview?.totalCompletions ?? 0}</p>
                          <p className="text-[10px] text-emerald-600 mt-1">Completed all lessons & requirements</p>
                        </div>

                        {/* 7. Overall Completion Rate */}
                        <div
                          onClick={() => setPlatformSubTab('completions')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-blue-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Completion Rate</span>
                            <Award className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-blue-900 mt-1">
                            {platformData.overview?.learnersStarted > 0
                              ? `${((platformData.overview.learnersCompleted / platformData.overview.learnersStarted) * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                          <p className="text-[10px] text-blue-600 mt-1">Completions ÷ Started learners</p>
                        </div>

                        {/* 8. Quiz Attempts */}
                        <div
                          onClick={() => setPlatformSubTab('quizzes')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-purple-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-purple-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Quiz Attempts</span>
                            <HelpCircle className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-purple-900 mt-1">
                            {platformData.quizResultsList?.reduce((s, q) => s + (q.attemptCount || 1), 0) ?? 0}
                          </p>
                          <p className="text-[10px] text-purple-600 mt-1">Across all courses</p>
                        </div>

                        {/* 9. Learners Attempted Quizzes */}
                        <div
                          onClick={() => handleOpenDrillDown('Learners Attempted Quizzes', platformData.quizResultsList || [], 'quizzes')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-purple-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-purple-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Quiz Participants</span>
                            <Users className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-purple-900 mt-1">{platformData.overview?.learnersAttemptedQuiz ?? 0}</p>
                          <p className="text-[10px] text-purple-600 mt-1">Unique learners attempted quizzes</p>
                        </div>

                        {/* 10. Learners Passed Quizzes */}
                        <div
                          onClick={() => handleOpenDrillDown('Learners Passed Quizzes', (platformData.quizResultsList || []).filter(q => q.isPassed), 'quizzes')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-emerald-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Quizzes Passed</span>
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-emerald-900 mt-1">{platformData.overview?.learnersPassedQuiz ?? 0}</p>
                          <p className="text-[10px] text-emerald-600 mt-1">Achieved passing score</p>
                        </div>

                        {/* 11. Baseline Assessments */}
                        <div
                          onClick={() => setPlatformSubTab('assessments')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-teal-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-teal-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Baseline Assessments</span>
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-teal-900 mt-1">{platformData.overview?.baselineCompleted ?? 0}</p>
                          <p className="text-[10px] text-teal-600 mt-1">Initial knowledge logged</p>
                        </div>

                        {/* 12. Final Assessments */}
                        <div
                          onClick={() => setPlatformSubTab('assessments')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-teal-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-teal-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Final Assessments</span>
                            <Check className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-teal-900 mt-1">{platformData.overview?.afterCompleted ?? 0}</p>
                          <p className="text-[10px] text-teal-600 mt-1">Post-course knowledge logged</p>
                        </div>

                        {/* 13. Linked Outcome Pairs */}
                        <div
                          onClick={() => handleOpenDrillDown('Linked Assessment Pairs', (platformData.assessmentsList || []).filter(a => a.comparisonStatus === 'Complete'), 'assessments')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-teal-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-teal-700">
                            <span className="text-[10px] font-black uppercase tracking-wider">Linked Outcome Pairs</span>
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-teal-950 mt-1">
                            {platformData.assessmentsList?.filter(a => a.comparisonStatus === 'Complete').length ?? 0}
                          </p>
                          <p className="text-[10px] text-teal-700 mt-1">Verified before vs after pairs</p>
                        </div>

                        {/* 14. Feedback Submissions */}
                        <div
                          onClick={() => setPlatformSubTab('feedback')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-amber-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-amber-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Feedback Submissions</span>
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-amber-900 mt-1">{platformData.overview?.feedbackSubmissions ?? 0}</p>
                          <p className="text-[10px] text-amber-600 mt-1">Beneficiary evaluations</p>
                        </div>

                        {/* 15. Total Certificates Issued */}
                        <div
                          onClick={() => setPlatformSubTab('certificates')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-emerald-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Certificates Issued</span>
                            <Award className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-emerald-900 mt-1">{platformData.overview?.certificatesIssued ?? 0}</p>
                          <p className="text-[10px] text-emerald-600 mt-1">Official Certificates of Completion</p>
                        </div>

                        {/* 16. Verified Active Certificates */}
                        <div
                          onClick={() => handleOpenDrillDown('Valid Active Certificates', (platformData.certificatesList || []).filter(c => c.status === 'Valid'), 'certificates')}
                          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between text-blue-600">
                            <span className="text-[10px] font-black uppercase tracking-wider">Active & Valid Certs</span>
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <p className="text-2xl font-black text-blue-900 mt-1">{platformData.overview?.validCertificates ?? 0}</p>
                          <p className="text-[10px] text-blue-600 mt-1">Verified authentic & non-revoked</p>
                        </div>
                      </div>
                    </div>

                    {/* Course Performance Breakdown Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                            Course Performance Breakdown
                          </h4>
                          <p className="text-[11px] text-gray-400">
                            Authoritative summary per course • Completion rate = completed ÷ started × 100
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExportPlatformCsv('overview')}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Export Summary</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Course Title</th>
                              <th className="py-3 px-4">Category</th>
                              <th className="py-3 px-4 text-center">Selected</th>
                              <th className="py-3 px-4 text-center">Started</th>
                              <th className="py-3 px-4 text-center">In Progress</th>
                              <th className="py-3 px-4 text-center">Completed</th>
                              <th className="py-3 px-4 text-center">Completion Rate</th>
                              <th className="py-3 px-4 text-center">Quizzes Passed</th>
                              <th className="py-3 px-4 text-center">Baseline</th>
                              <th className="py-3 px-4 text-center">Final</th>
                              <th className="py-3 px-4 text-center">Feedback</th>
                              <th className="py-3 px-4 text-center">Certificates</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(platformData.coursePerformance || []).length === 0 ? (
                              <tr>
                                <td colSpan={12} className="py-8 text-center text-gray-400 font-semibold">
                                  No courses found matching filter criteria.
                                </td>
                              </tr>
                            ) : (
                              (platformData.coursePerformance || []).map((cp) => (
                                <tr key={cp.courseId} className="hover:bg-gray-50/70 transition-colors">
                                  <td className="py-3 px-4 font-bold text-gray-900">{cp.courseTitle}</td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700">
                                      {cp.category}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-semibold text-gray-700">{cp.selectedCount}</td>
                                  <td className="py-3 px-4 text-center font-semibold text-blue-700">{cp.startedCount}</td>
                                  <td className="py-3 px-4 text-center font-semibold text-amber-700">{cp.inProgressCount}</td>
                                  <td className="py-3 px-4 text-center font-bold text-emerald-800">{cp.completedCount}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                      {cp.completionRate}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-medium text-gray-700">{cp.quizzesPassed}</td>
                                  <td className="py-3 px-4 text-center font-medium text-gray-700">{cp.baselineSubmissions}</td>
                                  <td className="py-3 px-4 text-center font-medium text-gray-700">{cp.finalAssessmentSubmissions}</td>
                                  <td className="py-3 px-4 text-center font-medium text-gray-700">{cp.feedbackSubmissions}</td>
                                  <td className="py-3 px-4 text-center font-bold text-emerald-700">{cp.certificatesIssued}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. COURSE SELECTIONS SUB-TAB */}
                {platformSubTab === 'selections' && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Learner Course Selections ({platformData.selectionsList?.length ?? 0})
                        </h4>
                        <p className="text-[11px] text-gray-400">All registered enrolments across One Community Ely courses</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportPlatformCsv('selections')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Learner Name</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Course Title</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Selection Date</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Last Activity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(platformData.selectionsList || []).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">
                                No course selections recorded yet.
                              </td>
                            </tr>
                          ) : (
                            (platformData.selectionsList || []).map((s, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                <td className="py-3 px-4 font-bold text-gray-900">{s.learnerName}</td>
                                <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">{s.learnerEmail}</td>
                                <td className="py-3 px-4 font-bold text-gray-800">{s.courseTitle}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700">
                                    {s.courseCategory}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-700">{s.selectionDateUK}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    s.status === 'Completed'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : s.status === 'In Progress'
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {s.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-500">{s.lastActivityUK}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. COURSE PROGRESS SUB-TAB */}
                {platformSubTab === 'progress' && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Detailed Learner Course Progress ({platformData.progressList?.length ?? 0})
                        </h4>
                        <p className="text-[11px] text-gray-400">One row per learner & course with lesson and module breakdown</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportPlatformCsv('progress')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Learner</th>
                            <th className="py-3 px-4">Course</th>
                            <th className="py-3 px-4 text-center">Lessons Completed</th>
                            <th className="py-3 px-4">Progress (%)</th>
                            <th className="py-3 px-4">Current Module / Lesson</th>
                            <th className="py-3 px-4">Quiz Status</th>
                            <th className="py-3 px-4">Started Date</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(platformData.progressList || []).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                                No course progress records found.
                              </td>
                            </tr>
                          ) : (
                            (platformData.progressList || []).map((p, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <p className="font-bold text-gray-900">{p.learnerName}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{p.learnerEmail}</p>
                                </td>
                                <td className="py-3 px-4 font-bold text-gray-800">{p.courseTitle}</td>
                                <td className="py-3 px-4 text-center font-bold text-gray-800">
                                  {p.completedLessons} / {p.totalLessons}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-2 rounded-full ${
                                          p.progressPercent >= 100 ? 'bg-emerald-600' : p.progressPercent > 0 ? 'bg-blue-600' : 'bg-gray-300'
                                        }`}
                                        style={{ width: `${Math.min(100, p.progressPercent)}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-gray-700 text-[11px]">{p.progressPercent}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-medium text-gray-800">{p.currentModule}</p>
                                  <p className="text-[10px] text-gray-400">{p.currentLesson}</p>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    p.requiredQuizStatus === 'Passed'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : p.requiredQuizStatus === 'Attempted'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {p.requiredQuizStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-600">{p.startedDateUK}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    p.continueStatus === 'Completed'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : p.continueStatus === 'In Progress'
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {p.continueStatus}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. COURSE COMPLETIONS SUB-TAB */}
                {platformSubTab === 'completions' && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Course Completions & Requirements Audit ({platformData.completionsList?.length ?? 0})
                        </h4>
                        <p className="text-[11px] text-gray-400">All verified course completion records with requirements checklist</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportPlatformCsv('completions')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Learner</th>
                            <th className="py-3 px-4">Course Completed</th>
                            <th className="py-3 px-4">Completion Date</th>
                            <th className="py-3 px-4">Time Taken</th>
                            <th className="py-3 px-4 text-center">Quiz</th>
                            <th className="py-3 px-4 text-center">Baseline</th>
                            <th className="py-3 px-4 text-center">Final</th>
                            <th className="py-3 px-4 text-center">Feedback</th>
                            <th className="py-3 px-4 text-center">Certificate Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(platformData.completionsList || []).length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-12 text-center text-gray-400 font-semibold">
                                No course completions logged yet.
                              </td>
                            </tr>
                          ) : (
                            (platformData.completionsList || []).map((c, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <p className="font-bold text-gray-900">{c.learnerName}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{c.learnerEmail}</p>
                                </td>
                                <td className="py-3 px-4 font-bold text-gray-800">{c.courseTitle}</td>
                                <td className="py-3 px-4 text-gray-700 font-medium">{c.completionDateUK}</td>
                                <td className="py-3 px-4 text-gray-500">{c.timeTaken}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.requiredQuizStatus === 'Passed' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {c.requiredQuizStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.baselineStatus === 'Completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {c.baselineStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.finalAssessmentStatus === 'Completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {c.finalAssessmentStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.feedbackStatus === 'Submitted' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {c.feedbackStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                    c.certificateStatus === 'Issued'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}>
                                    {c.certificateStatus}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. QUIZ RESULTS SUB-TAB */}
                {platformSubTab === 'quizzes' && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Quiz Results & Assessment Scores ({platformData.quizResultsList?.length ?? 0})
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          Confidential quiz performance • Question answers are kept private per test integrity policy
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportPlatformCsv('quizzes')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Learner</th>
                            <th className="py-3 px-4">Quiz Title</th>
                            <th className="py-3 px-4">Course</th>
                            <th className="py-3 px-4">Module / Lesson</th>
                            <th className="py-3 px-4 text-center">Attempts</th>
                            <th className="py-3 px-4 text-center">Latest Score</th>
                            <th className="py-3 px-4 text-center">Best Score</th>
                            <th className="py-3 px-4 text-center">Passing Mark</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4">Last Attempt Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(platformData.quizResultsList || []).length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-12 text-center text-gray-400 font-semibold">
                                No quiz attempts recorded yet.
                              </td>
                            </tr>
                          ) : (
                            (platformData.quizResultsList || []).map((q, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <p className="font-bold text-gray-900">{q.learnerName}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{q.learnerEmail}</p>
                                </td>
                                <td className="py-3 px-4 font-bold text-gray-800">{q.quizTitle}</td>
                                <td className="py-3 px-4 text-gray-600">{q.courseTitle}</td>
                                <td className="py-3 px-4 text-gray-500 text-[11px]">{q.moduleLesson}</td>
                                <td className="py-3 px-4 text-center font-bold text-gray-800">{q.attemptCount}</td>
                                <td className="py-3 px-4 text-center font-semibold text-gray-800">{q.latestScore}%</td>
                                <td className="py-3 px-4 text-center font-black text-blue-700">{q.bestScore}%</td>
                                <td className="py-3 px-4 text-center text-gray-400">{q.passingScore}%</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                    q.isPassed
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-red-50 text-red-800 border border-red-200'
                                  }`}>
                                    {q.isPassed ? 'PASSED' : 'NOT PASSED'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-500">{q.lastAttemptDateUK}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. ASSESSMENTS (BEFORE / AFTER) SUB-TAB */}
                {platformSubTab === 'assessments' && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Baseline & After Assessment Confidence Outcomes ({platformData.assessmentsList?.length ?? 0})
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          Distance travelled outcome evaluation • Confidence change = final rating - baseline rating
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportPlatformCsv('assessments')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Learner</th>
                            <th className="py-3 px-4">Course Title</th>
                            <th className="py-3 px-4">Baseline Date</th>
                            <th className="py-3 px-4 text-center">Baseline Confidence</th>
                            <th className="py-3 px-4">Final Date</th>
                            <th className="py-3 px-4 text-center">Final Confidence</th>
                            <th className="py-3 px-4 text-center">Confidence Change</th>
                            <th className="py-3 px-4">Comparison Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(platformData.assessmentsList || []).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                                No assessment submissions logged yet.
                              </td>
                            </tr>
                          ) : (
                            (platformData.assessmentsList || []).map((a, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <p className="font-bold text-gray-900">{a.learnerName}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{a.learnerEmail}</p>
                                </td>
                                <td className="py-3 px-4 font-bold text-gray-800">{a.courseTitle}</td>
                                <td className="py-3 px-4 text-gray-600">{a.baselineDateUK}</td>
                                <td className="py-3 px-4 text-center">
                                  {a.baselineConfidence ? (
                                    <span className="font-bold text-gray-700">{a.baselineConfidence}/5</span>
                                  ) : (
                                    <span className="text-gray-400 italic">N/A</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-gray-600">{a.finalDateUK}</td>
                                <td className="py-3 px-4 text-center">
                                  {a.finalConfidence ? (
                                    <span className="font-bold text-gray-900">{a.finalConfidence}/5</span>
                                  ) : (
                                    <span className="text-gray-400 italic">N/A</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {a.confidenceChange !== 'N/A' && a.confidenceChange !== undefined ? (
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                      Number(a.confidenceChange) > 0
                                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                        : Number(a.confidenceChange) === 0
                                        ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                                    }`}>
                                      {Number(a.confidenceChange) > 0 ? `+${a.confidenceChange}` : a.confidenceChange}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-[10px]">Unlinked</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    a.comparisonStatus === 'Complete'
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {a.comparisonStatus}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. BENEFICIARY FEEDBACK SUB-TAB */}
                {platformSubTab === 'feedback' && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                          Beneficiary Feedback & Testimonials ({platformData.feedbackList?.length ?? 0})
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          Quality and satisfaction responses • Learner privacy respected based on consent status
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportPlatformCsv('feedback')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Learner</th>
                            <th className="py-3 px-4">Course Title</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4 text-center">Usefulness</th>
                            <th className="py-3 px-4 text-center">Confidence</th>
                            <th className="py-3 px-4 text-center">Recommend</th>
                            <th className="py-3 px-4">Consent Status</th>
                            <th className="py-3 px-4">Testimonial Quote</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(platformData.feedbackList || []).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                                No beneficiary feedback submissions recorded yet.
                              </td>
                            </tr>
                          ) : (
                            (platformData.feedbackList || []).map((f, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                <td className="py-3 px-4 font-bold text-gray-900">{f.learnerName}</td>
                                <td className="py-3 px-4 font-bold text-gray-800">{f.courseTitle}</td>
                                <td className="py-3 px-4 text-gray-600">{f.submissionDateUK}</td>
                                <td className="py-3 px-4 text-center font-bold text-gray-800">{f.usefulnessRating}/5</td>
                                <td className="py-3 px-4 text-center font-bold text-gray-800">{f.confidenceRating}/5</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    f.wouldRecommend === 'Yes'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {f.wouldRecommend}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                                    {f.testimonialConsent}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-700 italic max-w-xs truncate">
                                  {f.testimonialConsent === 'No public-use permission' || f.consentWithdrawn ? (
                                    <span className="text-gray-400 text-[10px] not-italic">[Internal only - consent restricted]</span>
                                  ) : (
                                    `"${f.testimonial || 'No written testimonial'}"`
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. CERTIFICATES & VERIFICATION SUB-TAB */}
                {platformSubTab === 'certificates' && (
                  <div className="space-y-6">
                    {/* Top Verification Action Header */}
                    <div className="bg-gradient-to-r from-emerald-800 to-[#23735F] rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                          <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-wider">
                            Certificate Verification System
                          </h4>
                          <p className="text-xs text-emerald-100">
                            Verify authenticity and status of official Certificates of Completion issued by One Community Ely CIC.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenVerifyModal('')}
                          className="px-4 py-2 bg-white text-emerald-900 text-xs font-black rounded-xl shadow-xs hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Search className="h-3.5 w-3.5" />
                          <span>Verify Any Certificate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPlatformCsv('certificates')}
                          className="px-3.5 py-2 bg-emerald-900/60 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Export List</span>
                        </button>
                      </div>
                    </div>

                    {/* Certificates Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                            Issued Certificates ({platformData.certificatesList?.length ?? 0})
                          </h4>
                          <p className="text-[11px] text-gray-400">All issued completion credentials with live verification status</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Certificate Number</th>
                              <th className="py-3 px-4">Learner Name</th>
                              <th className="py-3 px-4">Learner Email</th>
                              <th className="py-3 px-4">Course Title</th>
                              <th className="py-3 px-4">Completion Date</th>
                              <th className="py-3 px-4">Issue Date</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(platformData.certificatesList || []).length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                                  No certificates issued yet.
                                </td>
                              </tr>
                            ) : (
                              (platformData.certificatesList || []).map((c) => (
                                <tr key={c.certificateId || c.certificateNumber} className="hover:bg-gray-50/70 transition-colors">
                                  <td className="py-3 px-4 font-mono font-bold text-gray-900">{c.certificateNumber}</td>
                                  <td className="py-3 px-4 font-bold text-gray-900">{c.learnerName}</td>
                                  <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">{c.learnerEmail}</td>
                                  <td className="py-3 px-4 font-bold text-gray-800">{c.courseTitle}</td>
                                  <td className="py-3 px-4 text-gray-600">{c.completionDateUK}</td>
                                  <td className="py-3 px-4 text-gray-600">{c.issueDateUK}</td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                      c.status === 'Valid'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}>
                                      {c.status === 'Valid' ? 'VALID' : 'REVOKED'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenVerifyModal(c.certificateNumber)}
                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                        title="Verify Certificate Authenticity"
                                      >
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        <span>Verify</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await downloadCertificatePdf(c.certificateId, `Certificate-${c.certificateNumber}`, user);
                                            showAlert('success', `Certificate ${c.certificateNumber} PDF downloaded.`);
                                          } catch (err) {
                                            showAlert('error', 'Download failed: ' + err.message);
                                          }
                                        }}
                                        className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                        title="Download PDF"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* MANUAL / ALL / ARCHIVED EVIDENCE TABLE */
          <div className="space-y-6">
            {/* Filters and Search Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search activity title, location, description, or notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F] focus:bg-white transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full md:w-auto px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Detailed Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                  >
                    <option value="all">All Categories</option>
                    {EVIDENCE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                  >
                    <option value="all">Active (Non-Archived)</option>
                    <option value="draft">Drafts Only</option>
                    <option value="published">Published / Internal</option>
                    <option value="archived">Archived Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                      Sort
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                    >
                      <option value="newest">Newest Activity</option>
                      <option value="oldest">Oldest Activity</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="p-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors"
                    title="Reset Filters"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Selection Action Bar */}
            {selectedIds.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{selectedIds.length} record(s) selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-emerald-100/60 rounded-lg cursor-pointer transition-colors"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteModalOpen(true)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Selected ({selectedIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Evidence Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-gray-500">Loading evidence records...</p>
                </div>
              ) : evidenceList.length === 0 ? (
                <div className="py-16 text-center space-y-3 px-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#23735F] flex items-center justify-center mx-auto">
                    <Award className="h-7 w-7" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900">No Evidence Records Found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    No activity records matched your active filter criteria. Clear filters or create a new evidence record.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={handleOpenCreate}
                      className="px-4 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-black rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Evidence Record</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                      <tr>
                        <th className="py-3.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === evidenceList.length && evidenceList.length > 0}
                            onChange={handleToggleSelectAll}
                            className="rounded border-gray-300 text-[#23735F] focus:ring-[#23735F] cursor-pointer"
                            title="Select/Deselect All"
                          />
                        </th>
                        <th className="py-3.5 px-4">Activity Title</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Activity Date</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-4 text-center">Attending</th>
                        <th className="py-3.5 px-4 text-center">Evidence</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {evidenceList.map((item) => {
                        const isArchived = item.status === 'archived';
                        const attCount = (item.attachments || []).length;
                        const linksCount = (item.socialLinks || []).length + (item.podcastLinks || []).length + (item.videoLinks || []).length;
                        const isSelected = selectedIds.includes(item.evidenceId);

                        return (
                          <tr key={item.evidenceId} className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item.evidenceId)}
                                className="rounded border-gray-300 text-[#23735F] focus:ring-[#23735F] cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 mb-1">
                                {item.source === 'automatic' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200" title="Automatically generated from verified platform activity">
                                    <Sparkles className="h-3 w-3 text-blue-500" />
                                    <span>Platform Activity</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200" title="Entered manually by Admin">
                                    <Users className="h-3 w-3 text-emerald-600" />
                                    <span>Manual Entry</span>
                                  </span>
                                )}
                                {item.mainResult && (
                                  <span className="text-[10px] font-bold text-gray-500 truncate max-w-[220px]">
                                    • {item.mainResult}
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-gray-900 line-clamp-1">{item.activityTitle}</p>
                              <p className="text-[11px] text-gray-400 line-clamp-1">{item.description}</p>
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-200">
                                {item.category === 'Other' && item.customCategory ? item.customCategory : item.category}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-gray-700 font-medium whitespace-nowrap">
                              {formatUKDate(item.activityDate)}
                            </td>

                            <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">
                              {item.location || <span className="text-gray-400 italic">Not specified</span>}
                            </td>

                            <td className="py-3 px-4 text-center font-bold text-gray-800">
                              {item.attendanceCount !== null && item.attendanceCount !== undefined ? (
                                <span className="inline-flex items-center gap-1 text-[#23735F]">
                                  <Users className="h-3.5 w-3.5" />
                                  <span>{item.attendanceCount}</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[10px] italic">Not recorded</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 text-gray-500 text-[11px] font-semibold">
                                {attCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-50 text-[#23735F] border border-emerald-200" title={`${attCount} file attachment(s)`}>
                                    <FileCheck className="h-3 w-3" />
                                    <span>{attCount}</span>
                                  </span>
                                )}
                                {linksCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200" title={`${linksCount} external link(s)`}>
                                    <LinkIcon className="h-3 w-3" />
                                    <span>{linksCount}</span>
                                  </span>
                                )}
                                {attCount === 0 && linksCount === 0 && (
                                  <span className="text-gray-300 text-[10px]">None</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                item.status === 'published'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : item.status === 'archived'
                                  ? 'bg-gray-100 text-gray-600 border-gray-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {item.status === 'published' ? 'Published' : item.status === 'archived' ? 'Archived' : 'Draft'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenView(item)}
                                  className="p-1.5 text-gray-600 hover:text-[#23735F] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title={item.source === 'automatic' ? 'Review platform evidence' : 'View full evidence details'}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title={item.source === 'automatic' ? 'Review notes & outcome' : 'Edit evidence record'}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    setTargetRecord(item);
                                    setArchiveModalOpen(true);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isArchived
                                      ? 'text-emerald-700 hover:bg-emerald-50'
                                      : 'text-gray-400 hover:text-amber-700 hover:bg-amber-50'
                                  }`}
                                  title={isArchived ? 'Restore evidence record' : 'Archive evidence record (Default action)'}
                                >
                                  {isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                </button>

                                <button
                                  onClick={() => {
                                    setTargetRecord(item);
                                    setDeleteConfirmText('');
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Permanently delete record"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Footer */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalCount} records)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CREATE / EDIT EVIDENCE RECORD MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-[#23735F]">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingRecord ? 'Edit Evidence Record' : 'Create Evidence Record'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    One Community Ely CIC • Community Activity & Impact Evidence
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveRecord(); }} className="space-y-6">
              {/* SECTION 1: Core Activity Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-[#23735F] uppercase tracking-wider">
                  1. Activity Details
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-800">
                      Activity Title <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {(formData.activityTitle || '').length}/150
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    placeholder="e.g. Ely Digital Inclusion & Financial Skills Workshop"
                    value={formData.activityTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, activityTitle: e.target.value }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F] ${
                      formErrors.activityTitle ? 'border-red-500 bg-red-50/20' : 'border-gray-200'
                    }`}
                  />
                  {formErrors.activityTitle && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.activityTitle}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Activity Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                    >
                      {EVIDENCE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {formData.category === 'Other' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Specify Custom Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        placeholder="e.g. Peer Support Network"
                        value={formData.customCategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                      />
                      {formErrors.customCategory && (
                        <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.customCategory}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Activity Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.activityDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, activityDate: e.target.value }))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Ely Community Centre, High St"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Number Attending
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 18 (leave blank if unrecorded)"
                      value={formData.attendanceCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, attendanceCount: e.target.value }))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                    {formErrors.attendanceCount && (
                      <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.attendanceCount}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-800">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {(formData.description || '').length}/3000
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={3000}
                    placeholder="Describe what occurred, goals of the activity, community partner involvement, and overall highlights..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full p-3 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F] ${
                      formErrors.description ? 'border-red-500 bg-red-50/20' : 'border-gray-200'
                    }`}
                  />
                  {formErrors.description && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.description}</p>
                  )}
                </div>
              </div>

              {/* SECTION 2: Impact, Outcomes & Beneficiary Privacy */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black text-[#23735F] uppercase tracking-wider">
                  2. Impact, Beneficiary Stories & Consent
                </h4>

                {/* Privacy Warning Notice */}
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Privacy & Data Protection Notice</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Beneficiary stories and case studies must respect privacy. Ensure consent is obtained and documented. Do not upload unnecessary sensitive personal information.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Beneficiary Testimonial & Case Study Consent Status
                  </label>
                  <select
                    value={formData.consentStatus}
                    onChange={(e) => setFormData(prev => ({ ...prev, consentStatus: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                  >
                    {CONSENT_STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {formData.consentStatus === 'Consent withdrawn' && (
                  <div>
                    <label className="block text-xs font-bold text-red-700 mb-1">
                      Reason for Consent Withdrawal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Beneficiary requested removal of quotes on 04/09/2026"
                      value={formData.consentWithdrawalReason}
                      onChange={(e) => setFormData(prev => ({ ...prev, consentWithdrawalReason: e.target.value }))}
                      className="w-full p-2.5 bg-red-50/30 border border-red-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Outcome & Impact Summary
                  </label>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    placeholder="Key tangible outcomes (e.g. 14 participants gained confidence in online banking, 3 registered for further training)..."
                    value={formData.outcomeSummary}
                    onChange={(e) => setFormData(prev => ({ ...prev, outcomeSummary: e.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Beneficiary Stories & Quotes
                    </label>
                    <textarea
                      rows={3}
                      maxLength={4000}
                      placeholder="Quotes and stories shared by community members..."
                      value={formData.beneficiaryStories}
                      onChange={(e) => setFormData(prev => ({ ...prev, beneficiaryStories: e.target.value }))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Case Studies
                    </label>
                    <textarea
                      rows={3}
                      maxLength={4000}
                      placeholder="Detailed case studies demonstrating social value and personal progression..."
                      value={formData.caseStudies}
                      onChange={(e) => setFormData(prev => ({ ...prev, caseStudies: e.target.value }))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Internal Notes & Context
                  </label>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    placeholder="Internal team notes, follow-up actions, grant reporting references..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                  />
                </div>
              </div>

              {/* SECTION 3: External Verified Links */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black text-[#23735F] uppercase tracking-wider">
                  3. External Verified Links (HTTPS Only)
                </h4>

                {/* Social Media Links */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Facebook & Social Media Links
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://facebook.com/onecommunityely/posts/..."
                      value={newSocialLink}
                      onChange={(e) => setNewSocialLink(e.target.value)}
                      className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                    <button
                      type="button"
                      onClick={() => addLink('social')}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Add Link
                    </button>
                  </div>
                  {formData.socialLinks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {formData.socialLinks.map((link, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-md">
                            {link}
                          </a>
                          <button type="button" onClick={() => removeLink('social', idx)} className="text-red-500 hover:text-red-700 ml-2">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Podcast Links */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Podcast Links
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://open.spotify.com/episode/... or https://podcasts.apple.com/..."
                      value={newPodcastLink}
                      onChange={(e) => setNewPodcastLink(e.target.value)}
                      className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                    <button
                      type="button"
                      onClick={() => addLink('podcast')}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Add Link
                    </button>
                  </div>
                  {formData.podcastLinks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {formData.podcastLinks.map((link, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline truncate max-w-md">
                            {link}
                          </a>
                          <button type="button" onClick={() => removeLink('podcast', idx)} className="text-red-500 hover:text-red-700 ml-2">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video Links */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Video Links (YouTube, Vimeo)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      value={newVideoLink}
                      onChange={(e) => setNewVideoLink(e.target.value)}
                      className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                    <button
                      type="button"
                      onClick={() => addLink('video')}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Add Link
                    </button>
                  </div>
                  {formData.videoLinks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {formData.videoLinks.map((link, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline truncate max-w-md">
                            {link}
                          </a>
                          <button type="button" onClick={() => removeLink('video', idx)} className="text-red-500 hover:text-red-700 ml-2">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Attachments */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black text-[#23735F] uppercase tracking-wider">
                  4. Attachments (Photos, Reports, Documents)
                </h4>

                {/* Already linked attachments (if editing) */}
                {editingRecord && Array.isArray(editingRecord.attachments) && editingRecord.attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-700">Currently Linked Attachments:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {editingRecord.attachments.map(att => (
                        <div key={att.attachmentId} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            {att.type === 'image' ? <ImageIcon className="h-4 w-4 text-emerald-600 shrink-0" /> : <FileText className="h-4 w-4 text-blue-600 shrink-0" />}
                            <div className="truncate">
                              <p className="text-xs font-bold text-gray-900 truncate">{att.originalFilename}</p>
                              <p className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => downloadEvidenceAttachment(editingRecord.evidenceId, att.attachmentId, att.originalFilename, user)}
                              className="p-1 text-gray-500 hover:text-gray-900"
                              title="Download"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachmentDirect(att.attachmentId)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Delete attachment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New attachment dropzone */}
                <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-4 text-center bg-gray-50/50 transition-all">
                  <input
                    type="file"
                    id="evidence-file-input"
                    accept="image/png, image/jpeg, image/webp, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, video/mp4, video/webm"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="evidence-file-input" className="cursor-pointer space-y-1 block">
                    <Upload className="h-6 w-6 text-[#23735F] mx-auto" />
                    <p className="text-xs font-bold text-gray-800">
                      {attachmentFile ? attachmentFile.name : 'Choose photo, document, or video'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      PNG, JPEG, WebP (15MB) • PDF, DOC, DOCX (25MB) • MP4, WebM (50MB)
                    </p>
                  </label>
                </div>

                {attachmentFile && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Optional attachment caption/description..."
                      value={attachmentDesc}
                      onChange={(e) => setAttachmentDesc(e.target.value)}
                      className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                    />
                    {editingRecord && (
                      <button
                        type="button"
                        disabled={uploadingAttachment}
                        onClick={handleUploadAttachmentDirect}
                        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {uploadingAttachment ? 'Uploading...' : 'Upload Now'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setAttachmentFile(null); setAttachmentDesc(''); }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={savingRecord}
                    onClick={() => handleSaveRecord('draft')}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-xl disabled:opacity-50"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    disabled={savingRecord}
                    onClick={() => handleSaveRecord('published')}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {savingRecord ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>{editingRecord ? 'Save Changes' : 'Publish Record'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW EVIDENCE RECORD MODAL */}
      {viewModalOpen && viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    viewingRecord.status === 'published'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : viewingRecord.status === 'archived'
                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {viewingRecord.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                    {viewingRecord.category === 'Other' && viewingRecord.customCategory ? viewingRecord.customCategory : viewingRecord.category}
                  </span>
                </div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  {viewingRecord.activityTitle}
                </h3>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Activity Date</span>
                <p className="font-bold text-gray-800">{formatUKDate(viewingRecord.activityDate)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Location</span>
                <p className="font-bold text-gray-800">{viewingRecord.location || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Attendance</span>
                <p className="font-bold text-[#23735F]">
                  {viewingRecord.attendanceCount !== null && viewingRecord.attendanceCount !== undefined
                    ? viewingRecord.attendanceCount
                    : 'Not recorded'}
                </p>
              </div>
            </div>

            {/* Privacy Consent Badge */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Beneficiary Consent Status:</span>
              <span className="font-black text-[#23735F]">{viewingRecord.consentStatus}</span>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Description</h4>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-3.5 rounded-xl">
                {viewingRecord.description}
              </p>
            </div>

            {/* Outcome Summary */}
            {viewingRecord.outcomeSummary && (
              <div className="space-y-1">
                <h4 className="text-xs font-black text-[#23735F] uppercase tracking-wider">Outcome & Impact Summary</h4>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                  {viewingRecord.outcomeSummary}
                </p>
              </div>
            )}

            {/* Beneficiary Stories & Case Studies */}
            {(viewingRecord.beneficiaryStories || viewingRecord.caseStudies) && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                {viewingRecord.beneficiaryStories && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Beneficiary Story</h4>
                    <p className="text-xs text-gray-700 italic bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 leading-relaxed">
                      "{viewingRecord.beneficiaryStories}"
                    </p>
                  </div>
                )}
                {viewingRecord.caseStudies && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Case Study</h4>
                    <p className="text-xs text-gray-700 whitespace-pre-line bg-gray-50 p-3.5 rounded-xl leading-relaxed">
                      {viewingRecord.caseStudies}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Attachments Gallery / List */}
            {Array.isArray(viewingRecord.attachments) && viewingRecord.attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Attachments ({viewingRecord.attachments.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {viewingRecord.attachments.map(att => (
                    <div key={att.attachmentId} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        {att.type === 'image' ? (
                          <ImageIcon className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="text-xs font-bold text-gray-900 truncate">{att.originalFilename}</p>
                          <p className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(1)} KB • {att.type}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadEvidenceAttachment(viewingRecord.evidenceId, att.attachmentId, att.originalFilename, user)}
                        className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-700 inline-flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            {((viewingRecord.socialLinks || []).length > 0 || (viewingRecord.podcastLinks || []).length > 0 || (viewingRecord.videoLinks || []).length > 0) && (
              <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">External Links</h4>
                <div className="space-y-1.5">
                  {(viewingRecord.socialLinks || []).map((link, idx) => (
                    <a
                      key={`soc-${idx}`}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-50 text-blue-700 hover:underline rounded-lg flex items-center justify-between"
                    >
                      <span className="truncate">{link}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 ml-2" />
                    </a>
                  ))}
                  {(viewingRecord.podcastLinks || []).map((link, idx) => (
                    <a
                      key={`pod-${idx}`}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-purple-50 text-purple-700 hover:underline rounded-lg flex items-center justify-between"
                    >
                      <span className="truncate">{link}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 ml-2" />
                    </a>
                  ))}
                  {(viewingRecord.videoLinks || []).map((link, idx) => (
                    <a
                      key={`vid-${idx}`}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-50 text-[#23735F] hover:underline rounded-lg flex items-center justify-between"
                    >
                      <span className="truncate">{link}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Notes & Audit Info */}
            <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 space-y-0.5">
              <p>Created by: {viewingRecord.createdBy} on {formatUKDate(viewingRecord.createdAt)}</p>
              <p>Last updated by: {viewingRecord.updatedBy || viewingRecord.createdBy} on {formatUKDate(viewingRecord.updatedAt)}</p>
              {viewingRecord.archivedAt && (
                <p className="text-amber-600 font-bold">Archived at: {formatUKDate(viewingRecord.archivedAt)}</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATIC PLATFORM EVIDENCE REVIEW MODAL */}
      {autoReviewModalOpen && autoRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-gray-100 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    <span>Automatically generated from verified platform activity</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    autoStatus === 'published'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : autoStatus === 'archived'
                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {autoStatus === 'published' ? 'Published / Internal' : autoStatus === 'archived' ? 'Archived' : 'Draft'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                    {autoRecord.courseTitle || 'All Courses'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">
                  {autoRecord.activityTitle}
                </h3>
                <p className="text-xs text-gray-500">
                  Reporting Period: <strong className="text-gray-700">{autoRecord.reportingPeriod || 'All-Time'}</strong> • Last Refreshed: <strong className="text-gray-700">{formatUKDate(autoRecord.lastRefreshedAt || autoRecord.generatedAt)}</strong>
                </p>
              </div>
              <button
                onClick={() => setAutoReviewModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Headline Result Banner */}
            {autoRecord.mainResult && (
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Authoritative Platform Result</p>
                    <p className="text-sm font-black text-blue-950">{autoRecord.mainResult}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportAutoCsv}
                  className="px-3 py-1.5 bg-white hover:bg-blue-100 border border-blue-300 text-blue-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            )}

            {/* SECTION 1: System-Calculated Metrics (STRICTLY READ-ONLY) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-gray-500" />
                  <span>Verified System-Calculated Metrics (Read-Only)</span>
                </h4>
                <span className="text-[10px] text-gray-500 italic">
                  Protected against manual editing • Values match Impact Reporting
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Registered Learners</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">{autoRecord.systemMetrics?.registeredLearnersCount ?? 0}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Learners</span>
                  <p className="text-lg font-black text-blue-800 mt-0.5">{autoRecord.systemMetrics?.activeLearnersCount ?? 0}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Courses Started</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">{autoRecord.systemMetrics?.coursesStartedCount ?? 0}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Courses Completed</span>
                  <p className="text-lg font-black text-emerald-800 mt-0.5">{autoRecord.systemMetrics?.coursesCompletedCount ?? 0}</p>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Completion Rate</span>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">
                    {autoRecord.systemMetrics?.overallCompletionRate !== undefined ? `${autoRecord.systemMetrics.overallCompletionRate}%` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lessons Completed</span>
                  <p className="text-lg font-black text-gray-900 mt-0.5">{autoRecord.systemMetrics?.lessonsCompletedCount ?? 0}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quiz Pass Rate</span>
                  <p className="text-lg font-black text-purple-800 mt-0.5">
                    {autoRecord.systemMetrics?.quizPassRate !== undefined ? `${autoRecord.systemMetrics.quizPassRate}%` : 'N/A'}
                  </p>
                  <span className="text-[9px] text-gray-400">Score avg: {autoRecord.systemMetrics?.averageQuizScore ?? 0}%</span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Certificates Issued</span>
                  <p className="text-lg font-black text-amber-700 mt-0.5">{autoRecord.systemMetrics?.certificatesIssuedCount ?? 0}</p>
                </div>
              </div>

              {/* Outcomes & Feedback Pair Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Confidence Outcome Card */}
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-800">Confidence Outcome (Before vs After)</span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {autoRecord.systemMetrics?.validComparisonCount ?? 0} verified pairs
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 bg-white p-2 rounded-lg border border-emerald-100 text-center">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Baseline Avg</span>
                      <span className="text-sm font-black text-gray-800">
                        {autoRecord.systemMetrics?.averageBaselineConfidence !== null && autoRecord.systemMetrics?.averageBaselineConfidence !== undefined ? `${autoRecord.systemMetrics.averageBaselineConfidence}/5` : 'N/A'}
                      </span>
                    </div>
                    <span className="text-emerald-700 font-black text-sm">→</span>
                    <div className="flex-1 bg-white p-2 rounded-lg border border-emerald-100 text-center">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Final Avg</span>
                      <span className="text-sm font-black text-gray-800">
                        {autoRecord.systemMetrics?.averageFinalConfidence !== null && autoRecord.systemMetrics?.averageFinalConfidence !== undefined ? `${autoRecord.systemMetrics.averageFinalConfidence}/5` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex-1 bg-emerald-100 p-2 rounded-lg text-center">
                      <span className="text-[9px] font-extrabold text-emerald-800 uppercase block">Confidence Change</span>
                      <span className="text-sm font-black text-emerald-900">
                        {autoRecord.systemMetrics?.averageConfidenceChange !== null && autoRecord.systemMetrics?.averageConfidenceChange !== undefined ? (autoRecord.systemMetrics.averageConfidenceChange >= 0 ? `+${autoRecord.systemMetrics.averageConfidenceChange}` : autoRecord.systemMetrics.averageConfidenceChange) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Beneficiary Feedback Card */}
                <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-800">Beneficiary Satisfaction & Quality</span>
                    <span className="text-[10px] font-bold text-blue-700">
                      {autoRecord.systemMetrics?.feedbackSubmissionsCount ?? 0} verified responses
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Usefulness</span>
                      <span className="text-sm font-black text-gray-800">
                        {autoRecord.systemMetrics?.averageUsefulnessRating !== null && autoRecord.systemMetrics?.averageUsefulnessRating !== undefined ? `${autoRecord.systemMetrics.averageUsefulnessRating}/5` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Confidence</span>
                      <span className="text-sm font-black text-gray-800">
                        {autoRecord.systemMetrics?.averageConfidenceRating !== null && autoRecord.systemMetrics?.averageConfidenceRating !== undefined ? `${autoRecord.systemMetrics.averageConfidenceRating}/5` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <span className="text-[9px] font-extrabold text-blue-800 uppercase block">Recommend</span>
                      <span className="text-sm font-black text-blue-900">
                        {autoRecord.systemMetrics?.recommendationPercentage !== undefined ? `${autoRecord.systemMetrics.recommendationPercentage}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Sources and Formula Metadata */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">Authoritative Subsystems:</span>
                  <span className="font-mono text-[10px] text-gray-500">{autoRecord.calculationMetadata?.dataSources?.join(' • ')}</span>
                </div>
                <p className="text-[10px] text-gray-500">
                  <strong>Calculation Formula:</strong> {autoRecord.calculationMetadata?.formula}
                </p>
                <p className="text-[10px] text-emerald-800 font-semibold">
                  ✓ Individual learner emails and quiz answers are protected by GDPR privacy boundary and never exposed in summaries.
                </p>
              </div>
            </div>

            {/* SECTION 2: Admin Interpretation & Outcome Review (EDITABLE BY ADMIN) */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit2 className="h-3.5 w-3.5 text-[#23735F]" />
                  <span>Admin Review & Qualitative Impact Interpretation</span>
                </h4>
                <span className="text-[10px] text-emerald-700 font-bold">
                  ✓ Notes are strictly preserved across platform refreshes
                </span>
              </div>

              {/* Review Status Selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Evidence Review Status
                </label>
                <select
                  value={autoStatus}
                  onChange={(e) => setAutoStatus(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#23735F]"
                >
                  <option value="draft">Internal Draft (Under Review by Ely Admin)</option>
                  <option value="published">Published / Internal (Approved for Impact Reporting & Funders)</option>
                  <option value="archived">Archived (Hide from active reporting)</option>
                </select>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Administrator Notes & Delivery Observations
                </label>
                <textarea
                  rows={3}
                  value={autoNotes}
                  onChange={(e) => setAutoNotes(e.target.value)}
                  placeholder="Enter context, partner engagement milestones, learner cohort notes, or delivery observations..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Admin notes provide narrative clarity for Trustees, funding bodies, and annual impact reporting.
                </p>
              </div>

              {/* Outcome Summary */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Outcome Interpretation & Community Value Summary
                </label>
                <textarea
                  rows={3}
                  value={autoOutcome}
                  onChange={(e) => setAutoOutcome(e.target.value)}
                  placeholder="Explain how this verified platform activity demonstrates digital inclusion and community empowerment for One Community Ely CIC..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#23735F]"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                disabled={refreshingAutoRecord}
                onClick={handleRecalculateAutoRecord}
                className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Recalculate numbers from recent platform activity without overwriting your notes"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-gray-600 ${refreshingAutoRecord ? 'animate-spin' : ''}`} />
                <span>{refreshingAutoRecord ? 'Recalculating...' : 'Recalculate Platform Numbers'}</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setAutoReviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={savingAutoNotes}
                  onClick={handleSaveAutoReview}
                  className="px-5 py-2 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingAutoNotes ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Save Review</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE / RESTORE MODAL (Default removal action) */}
      {archiveModalOpen && targetRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <Archive className="h-5 w-5" />
              <h3 className="text-sm font-black text-gray-900">
                {targetRecord.status === 'archived' ? 'Restore Evidence Record' : 'Archive Evidence Record'}
              </h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {targetRecord.status === 'archived'
                ? `Restore "${targetRecord.activityTitle}" back to active status? It will reappear in active impact reports.`
                : `Are you sure you want to archive "${targetRecord.activityTitle}"? Archiving hides the record from active reporting while preserving all attachments and data.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => { setArchiveModalOpen(false); setTargetRecord(null); }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={actionProcessing}
                onClick={handleConfirmArchive}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {actionProcessing ? 'Processing...' : targetRecord.status === 'archived' ? 'Confirm Restore' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETION MODAL (High-risk action with double confirmation) */}
      {deleteModalOpen && targetRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-red-500">
            <div className="flex items-center gap-2.5 text-red-600">
              <Trash2 className="h-5 w-5" />
              <h3 className="text-sm font-black text-red-700">Permanently Delete Record</h3>
            </div>

            <p className="text-xs text-red-800 leading-relaxed font-semibold">
              Warning: This will permanently delete "{targetRecord.activityTitle}" and remove all attached files from S3 storage. This action cannot be undone.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Type <strong>DELETE</strong> below to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full p-2.5 border border-red-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => { setDeleteModalOpen(false); setTargetRecord(null); setDeleteConfirmText(''); }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={actionProcessing || deleteConfirmText.trim().toLowerCase() !== 'delete'}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-40 cursor-pointer"
              >
                {actionProcessing ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETION MODAL */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-red-500">
            <div className="flex items-center gap-2.5 text-red-600">
              <Trash2 className="h-5 w-5" />
              <h3 className="text-sm font-black text-red-700">Delete Selected Records ({selectedIds.length})</h3>
            </div>

            <p className="text-xs text-red-800 leading-relaxed font-semibold">
              Warning: This will permanently delete <strong>{selectedIds.length} selected evidence record(s)</strong> and all associated attachments from storage. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deletingBulk}
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {deletingBulk ? 'Deleting Selected...' : `Delete ${selectedIds.length} Records`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRILL-DOWN LEARNER LIST MODAL */}
      {drillDownOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">{drillDownTitle}</h3>
                  <p className="text-xs text-gray-500">
                    {drillDownItems.length} matching learner record(s) • One Community Ely Online Training Centre
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrillDownOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* In-Modal Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by learner name, email, or course..."
                value={drillDownSearch}
                onChange={(e) => setDrillDownSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {/* Records List Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[50vh] overflow-y-auto">
              {(() => {
                const searchLow = drillDownSearch.trim().toLowerCase();
                const filtered = drillDownItems.filter(item => {
                  if (!searchLow) return true;
                  const name = String(item.learnerName || '').toLowerCase();
                  const email = String(item.learnerEmail || '').toLowerCase();
                  const course = String(item.courseTitle || '').toLowerCase();
                  return name.includes(searchLow) || email.includes(searchLow) || course.includes(searchLow);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-gray-400 text-xs font-semibold">
                      No records match the search filter.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider sticky top-0">
                      <tr>
                        <th className="py-3 px-4">Learner</th>
                        <th className="py-3 px-4">Course / Activity</th>
                        <th className="py-3 px-4">Date / Milestone</th>
                        <th className="py-3 px-4">Status / Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70">
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{item.learnerName || 'Learner'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{item.learnerEmail || ''}</p>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">
                            {item.courseTitle || item.quizTitle || item.activityTitle || 'Training Course'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {item.completionDateUK || item.selectionDateUK || item.startedDateUK || item.lastAttemptDateUK || item.submissionDateUK || item.issueDateUK || 'Recorded'}
                          </td>
                          <td className="py-3 px-4">
                            {item.certificateNumber ? (
                              <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {item.certificateNumber}
                              </span>
                            ) : item.latestScore !== undefined ? (
                              <span className="font-bold text-blue-800">
                                Score: {item.latestScore}% ({item.isPassed ? 'Passed' : 'Attempted'})
                              </span>
                            ) : item.progressPercent !== undefined ? (
                              <span className="font-bold text-blue-800">
                                {item.progressPercent}% ({item.completedLessons}/{item.totalLessons} lessons)
                              </span>
                            ) : item.confidenceChange !== undefined ? (
                              <span className="font-bold text-emerald-800">
                                Change: {item.confidenceChange > 0 ? `+${item.confidenceChange}` : item.confidenceChange}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700">
                                {item.status || item.continueStatus || 'Active'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                Individual data processed according to One Community Ely CIC Privacy & Data Protection Policy.
              </span>
              <button
                type="button"
                onClick={() => setDrillDownOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATE VERIFICATION MODAL */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Certificate Authenticity Verification
                </h3>
              </div>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyCertificateAction(); }} className="space-y-3">
              <label className="block text-xs font-black text-gray-900">
                Certificate Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. OCE-2026-DIGI-001001"
                  value={verifyInputNumber}
                  onChange={(e) => setVerifyInputNumber(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono uppercase tracking-wider outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={verifyingCert || !verifyInputNumber.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#23735F] text-white rounded-lg text-xs font-bold hover:bg-[#1b5b4b] disabled:opacity-50 cursor-pointer"
                >
                  {verifyingCert ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
                </button>
              </div>
            </form>

            {/* Error Display */}
            {verifyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Verification Result Card */}
            {verifyResult && (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                verifyResult.status === 'active'
                  ? 'bg-emerald-50/40 border-emerald-300'
                  : verifyResult.status === 'revoked'
                  ? 'bg-red-50/40 border-red-300'
                  : 'bg-gray-50 border-gray-300'
              }`}>
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="font-mono text-xs font-black text-gray-800">
                    {verifyResult.certificateNumber}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    verifyResult.status === 'active'
                      ? 'bg-emerald-100 text-emerald-900'
                      : verifyResult.status === 'revoked'
                      ? 'bg-red-100 text-red-900'
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {verifyResult.status === 'active'
                      ? '✓ VALID & AUTHENTIC'
                      : verifyResult.status === 'revoked'
                      ? '✗ REVOKED'
                      : 'NOT FOUND'}
                  </span>
                </div>

                {verifyResult.status !== 'not_found' ? (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-gray-200/80">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400">Learner</span>
                        <p className="font-black text-gray-900 mt-0.5">{verifyResult.learnerName}</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400">Issuing Body</span>
                        <p className="font-bold text-[#23735F] mt-0.5">{verifyResult.issuingOrganisation}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-200/80 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-gray-400">Course Title</span>
                      <p className="font-bold text-gray-900">{verifyResult.courseTitle}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-gray-600 text-[11px] pt-1">
                      <p><strong>Completed:</strong> {verifyResult.completionDate}</p>
                      <p><strong>Issued:</strong> {verifyResult.issuedAt}</p>
                    </div>

                    {verifyResult.status === 'revoked' && (
                      <div className="p-2.5 bg-red-100 border border-red-200 rounded-xl text-red-900 text-[11px] font-semibold">
                        This credential was revoked on {verifyResult.revokedAt || 'record'}.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 text-center py-2">
                    No certificate was found for this number in One Community Ely records.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <a
                href={`/verify-certificate${verifyInputNumber ? `?number=${encodeURIComponent(verifyInputNumber)}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Public Verification Page</span>
              </a>
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURGE ALL EVIDENCE RECORDS MODAL */}
      {deleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-red-500">
            <div className="flex items-center gap-2.5 text-red-600">
              <Trash2 className="h-5 w-5" />
              <h3 className="text-sm font-black text-red-700">Delete All Evidence Records</h3>
            </div>

            <p className="text-xs text-red-800 leading-relaxed font-semibold">
              CRITICAL: This will permanently wipe <strong>all manual entries, verified platform activities, and file attachments</strong> across the Evidence Library. This action cannot be undone.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Type <strong>DELETE</strong> below to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                className="w-full p-2.5 border border-red-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => { setDeleteAllModalOpen(false); setDeleteAllConfirmText(''); }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deletingAll || deleteAllConfirmText.trim().toLowerCase() !== 'delete'}
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-40 cursor-pointer"
              >
                {deletingAll ? 'Purging Evidence...' : 'Permanently Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvidenceLibrary;
