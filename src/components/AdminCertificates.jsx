import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchAdminCertificates,
  revokeAdminCertificate,
  downloadCertificatePdf,
  fetchCertificateTemplate,
  uploadCertificateTemplate,
  resetCertificateTemplate
} from '../services/certificateService';
import { fetchAdminCourses } from '../services/courseService';
import {
  Award, ArrowLeft, Search, Filter, RefreshCw, Download,
  ExternalLink, ShieldCheck, ShieldAlert, CheckCircle,
  AlertCircle, Trash2, X, Eye, BookOpen, Clock,
  MessageSquare, ClipboardCheck, Ban, Upload, Image,
  FileText, Sparkles, Check, FileCheck
} from 'lucide-react';

const AdminCertificates = () => {
  const { user } = useAuth();

  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Template Upload Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateFile, setTemplateFile] = useState(null);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Revoke Modal
  const [selectedCert, setSelectedCert] = useState(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Notifications
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
  const showAlert = (type, message) => {
    setAlertInfo({ type, message });
    setTimeout(() => setAlertInfo({ type: '', message: '' }), 5000);
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [certsData, coursesData, templateData] = await Promise.all([
        fetchAdminCertificates({}, user),
        fetchAdminCourses({}, user),
        fetchCertificateTemplate(user).catch(() => null)
      ]);
      setCertificates(certsData || []);
      setCourses(coursesData || []);
      setTemplate(templateData || null);
    } catch (err) {
      showAlert('error', err.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const navigate = useNavigate();

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
    const total = certificates.length;
    const active = certificates.filter(c => c.status === 'active').length;
    const revoked = certificates.filter(c => c.status === 'revoked').length;
    return { total, active, revoked };
  }, [certificates]);

  // Filtered List
  const filteredList = useMemo(() => {
    return certificates.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        (c.learnerNameSnapshot || '').toLowerCase().includes(q) ||
        (c.learnerEmail || '').toLowerCase().includes(q) ||
        (c.certificateNumber || '').toLowerCase().includes(q) ||
        (c.courseTitleSnapshot || '').toLowerCase().includes(q);

      const matchesCourse = courseFilter === 'all' || c.courseId === courseFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [certificates, searchQuery, courseFilter, statusFilter]);

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim()) {
      showAlert('error', 'A reason is required to revoke a certificate.');
      return;
    }

    setRevoking(true);
    try {
      const res = await revokeAdminCertificate(selectedCert.certificateId, revokeReason, user);
      if (res && res.success) {
        setCertificates(prev =>
          prev.map(c => c.certificateId === selectedCert.certificateId ? res.certificate : c)
        );
        showAlert('success', `Certificate ${selectedCert.certificateNumber} has been revoked.`);
        setRevokeModalOpen(false);
        setRevokeReason('');
        setSelectedCert(null);
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to revoke certificate.');
    } finally {
      setRevoking(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setTemplatePreviewUrl(reader.result);
      reader.readAsDataURL(file);
    } else {
      setTemplatePreviewUrl(null);
    }
  };

  const handleUploadTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!templateFile) {
      showAlert('error', 'Please select a certificate template image or PDF.');
      return;
    }

    setUploadingTemplate(true);
    try {
      const res = await uploadCertificateTemplate(templateFile, user);
      if (res && res.success) {
        setTemplate(res.template);
        showAlert('success', 'Official certificate template updated successfully! Dynamic details will now be applied.');
        setTemplateModalOpen(false);
        setTemplateFile(null);
        setTemplatePreviewUrl(null);
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to upload certificate template.');
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm('Reset certificate template back to the system default One Community Ely design?')) return;
    try {
      await resetCertificateTemplate(user);
      setTemplate(null);
      showAlert('success', 'Certificate template reset to system default.');
    } catch (err) {
      showAlert('error', err.message || 'Failed to reset certificate template.');
    }
  };

  const handleDownload = async (cert) => {
    try {
      const completionDate = new Date(cert.courseCompletionDate || cert.issuedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const customFileName = `Certificate - ${cert.learnerNameSnapshot || 'Learner'} - ${cert.courseTitleSnapshot || 'Course'} - ${completionDate}`;
      await downloadCertificatePdf(cert.certificateId, customFileName, user);
    } catch (err) {
      showAlert('error', err.message || 'Failed to download certificate.');
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
                <Award className="h-6 w-6 text-[#23735F]" />
                <span>Certificates of Completion</span>
              </h1>
              <p className="text-xs text-gray-500">
                Manage issued certificates and verify official credentials
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
            <Link
              to="/admin/beneficiary-feedback"
              className="px-3 py-2 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-semibold border border-amber-200"
            >
              Feedback
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
        {/* Certificate Template & Demo Banner */}
        <div className="bg-gradient-to-r from-[#1b5b4b] to-[#23735F] text-white p-5 rounded-2xl shadow-sm border border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <h2 className="text-base font-extrabold tracking-wide">Certificate Template & Demo Design</h2>
              <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full ${
                template?.hasCustomTemplate ? 'bg-amber-400 text-amber-950 shadow-xs' : 'bg-white/20 text-white'
              }`}>
                {template?.hasCustomTemplate ? `Custom Uploaded (${template.fileName || template.templateType})` : 'System Default Template'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTemplateModalOpen(true)}
              className="px-4 py-2.5 bg-white text-[#23735F] hover:bg-emerald-50 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Upload className="h-4 w-4 text-[#23735F]" />
              <span>{template?.hasCustomTemplate ? 'Change / Preview Demo' : 'Upload Certificate Demo'}</span>
            </button>
            {template?.hasCustomTemplate && (
              <button
                onClick={handleResetTemplate}
                className="px-3 py-2 bg-black/25 hover:bg-black/40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Reset to default design"
              >
                Reset Default
              </button>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Issued</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.active}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Revoked</p>
            <p className="text-2xl font-black text-red-700 mt-1">{metrics.revoked}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by learner name, email, certificate number or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#23735F] focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 outline-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        {/* Certificates Table */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-2xs">
            <RefreshCw className="h-8 w-8 text-[#23735F] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading Certificates...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <Award className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-900">No Certificates Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Certificates appear here when learners complete 100% of course lessons, pass required quizzes, and submit reflection & feedback.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Certificate No</th>
                    <th className="py-3.5 px-4">Learner</th>
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Completion Date</th>
                    <th className="py-3.5 px-4">Issue Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredList.map((cert) => {
                    const isRevoked = cert.status === 'revoked';
                    return (
                      <tr key={cert.certificateId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-gray-900">
                          {cert.certificateNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-900">{cert.learnerNameSnapshot}</p>
                          <p className="text-[11px] text-gray-400">{cert.learnerEmail}</p>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-800 max-w-[200px] truncate">
                          {cert.courseTitleSnapshot}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {new Date(cert.courseCompletionDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {new Date(cert.issuedAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isRevoked
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {cert.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDownload(cert)}
                              className="p-1.5 text-gray-600 hover:text-[#23735F] hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <Link
                              to={`/verify/${cert.certificateNumber}`}
                              target="_blank"
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Public Verification Link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                            {!isRevoked && (
                              <button
                                onClick={() => {
                                  setSelectedCert(cert);
                                  setRevokeReason('');
                                  setRevokeModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Revoke Certificate"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Revocation Modal */}
      {revokeModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="text-sm font-black">Revoke Certificate</h3>
              </div>
              <button
                onClick={() => setRevokeModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to revoke certificate <strong>{selectedCert.certificateNumber}</strong> for <strong>{selectedCert.learnerNameSnapshot}</strong>?
            </p>

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-900 mb-1">
                  Revocation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this certificate is being revoked (e.g. academic integrity, course curriculum restructuring)..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokeModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revoking || !revokeReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {revoking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  <span>Confirm Revocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Template & Demo Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-[#23735F]">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Certificate Template & Demo Upload</h3>
                  <p className="text-xs text-gray-500">
                    Upload an official template demo in Image (PNG, JPG, SVG), PDF, or Docs format
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTemplateModalOpen(false);
                  setTemplateFile(null);
                  setTemplatePreviewUrl(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadTemplateSubmit} className="space-y-5">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-black text-gray-900 mb-2">
                  Select Certificate Demo / Template File
                </label>
                <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-emerald-50/40 transition-all">
                  <input
                    type="file"
                    id="certificate-template-file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml, application/pdf, .pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, .doc, .docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="certificate-template-file" className="cursor-pointer space-y-2 block">
                    <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-emerald-200 flex items-center justify-center mx-auto text-[#23735F]">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-[#23735F] hover:underline">
                        Click to choose file
                      </span>
                      <span className="text-xs text-gray-500"> or drag and drop</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">
                      PNG, JPG, SVG, WebP, PDF, or Word DOC/DOCX documents (Max 20MB)
                    </p>
                  </label>
                </div>

                {templateFile && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      <span>{templateFile.name} ({(templateFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateFile(null);
                        setTemplatePreviewUrl(null);
                      }}
                      className="text-xs text-red-600 hover:underline font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Live Preview with Dynamic Field Overlay Simulation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Live Certificate Demo Preview (Dynamic Fields)</span>
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    Auto-populates User, Course & Completed Date
                  </span>
                </div>

                <div className="relative rounded-2xl border-2 border-emerald-700 bg-white p-6 shadow-inner overflow-hidden text-center min-h-[200px] flex flex-col justify-between aspect-[16/10]">
                  {/* Background if image template loaded or existing custom image template */}
                  {(templatePreviewUrl || (template?.dataUrl && template?.templateType === 'image')) ? (
                    <img
                      src={templatePreviewUrl || template.dataUrl}
                      alt="Certificate Demo Template"
                      className="absolute inset-0 w-full h-full object-cover opacity-90"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40" />
                  )}

                  {/* Decorative Border */}
                  <div className="absolute inset-2 border border-emerald-800/40 rounded-xl pointer-events-none" />

                  {/* Simulated Dynamic Overlays */}
                  <div className="relative z-10 space-y-1 pt-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#23735F]">
                      ONE COMMUNITY ELY ONLINE TRAINING CENTRE
                    </p>
                    <p className="text-[13px] sm:text-base font-black uppercase text-gray-900 tracking-wide">
                      Certificate of Completion
                    </p>
                  </div>

                  <div className="relative z-10 space-y-1 py-2">
                    <p className="text-[10px] text-gray-500 font-medium">This is to proudly certify that</p>
                    <p className="text-base sm:text-xl font-black text-blue-900 tracking-wide bg-white/70 backdrop-blur-xs py-0.5 px-3 rounded-lg inline-block mx-auto border border-blue-100 shadow-2xs">
                      JEEVA AKASH K
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium">
                      has successfully completed all required training modules and assessments for
                    </p>
                    <p className="text-xs sm:text-sm font-black text-[#23735F] bg-white/70 backdrop-blur-xs py-0.5 px-3 rounded-lg inline-block mx-auto border border-emerald-100 shadow-2xs">
                      Managing Personal Money & Budgets
                    </p>
                  </div>

                  <div className="relative z-10 pt-1 border-t border-gray-200/70 flex items-center justify-between text-[10px] font-semibold text-gray-600 px-2 bg-white/60 backdrop-blur-xs rounded-lg py-1">
                    <span>Completed on: 4 September 2026</span>
                    <span className="font-mono text-gray-800">Cert No: OCE-2026-DEMO-001001</span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-3 border-t">
                {template?.hasCustomTemplate ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleResetTemplate();
                      setTemplateModalOpen(false);
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-bold hover:underline"
                  >
                    Reset to Default Design
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateModalOpen(false);
                      setTemplateFile(null);
                      setTemplatePreviewUrl(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingTemplate || !templateFile}
                    className="px-5 py-2.5 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingTemplate ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>{uploadingTemplate ? 'Uploading...' : 'Save & Apply Template'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificates;
