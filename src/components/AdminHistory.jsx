import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, RefreshCw, Download, Filter, Search, Calendar,
  Shield, CheckCircle, AlertTriangle, XCircle, Clock, Users,
  BookOpen, Layers, Award, MessageSquare, HelpCircle, Eye,
  FileText, Activity, Key, LogOut, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import {
  fetchAdminAuditLogs,
  fetchAdminAuditStats,
  exportAdminAuditCsv
} from '../services/adminAuditService';

const CATEGORY_OPTIONS = [
  'All Activities',
  'Learner Management',
  'Courses & Lessons',
  'Resources',
  'Quizzes',
  'Assessments',
  'Feedback',
  'Certificates',
  'Reports',
  'Evidence Library',
  'Admins & Settings',
  'Security'
];

/** Format ISO timestamp to UK date & time */
function formatUKDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

export default function AdminHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Summary stats state
  const [stats, setStats] = useState({
    totalActions: 0,
    actionsToday: 0,
    activeAdminsCount: 0,
    securitySensitiveActions: 0,
    failedOrDeniedActions: 0
  });
  const [adminEmailsList, setAdminEmailsList] = useState([]);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('All Activities');
  const [selectedAdmin, setSelectedAdmin] = useState('all');
  const [selectedResult, setSelectedResult] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rangePreset, setRangePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination & data states
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 15;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const res = await fetchAdminAuditStats();
      if (res && res.stats) {
        setStats(res.stats);
        if (res.uniqueAdminEmails) {
          setAdminEmailsList(res.uniqueAdminEmails);
        }
      }
    } catch (err) {
      console.warn('Failed to load audit stats:', err);
    }
  }, []);

  // Load audit logs
  const loadLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage('');

    try {
      const catParam = selectedCategory === 'All Activities' ? 'all' : selectedCategory;
      const res = await fetchAdminAuditLogs({
        category: catParam,
        adminEmail: selectedAdmin,
        result: selectedResult,
        search: searchTerm,
        rangePreset,
        startDate,
        endDate,
        sortBy,
        page: currentPage,
        limit: pageSize
      });

      if (res && res.success) {
        setLogs(res.logs || []);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setErrorMessage(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedAdmin, selectedResult, searchTerm, rangePreset, startDate, endDate, sortBy, currentPage]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Handle CSV Export
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const catParam = selectedCategory === 'All Activities' ? 'all' : selectedCategory;
      await exportAdminAuditCsv({
        category: catParam,
        adminEmail: selectedAdmin,
        result: selectedResult,
        search: searchTerm,
        rangePreset,
        startDate,
        endDate
      });
      loadStats(); // refresh stats as export is logged
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategory('All Activities');
    setSelectedAdmin('all');
    setSelectedResult('all');
    setSearchTerm('');
    setRangePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Render Result Badge
  const renderResultBadge = (result) => {
    if (result === 'Success') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Success
        </span>
      );
    }
    if (result === 'Denied') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Denied
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
        <XCircle className="w-3 h-3 text-red-600" />
        Failed
      </span>
    );
  };

  // Render Category Tag
  const renderCategoryTag = (cat) => {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
        {cat}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin-panel"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              title="Return to Admin Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="One Community Ely Logo"
                style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
                className="shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-gray-900">Admin Activity History</h1>
                  <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-200">
                    Audit Log
                  </span>
                </div>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Review administrative actions and changes across the platform
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadStats(); loadLogs(true); }}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#23735F]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={exporting || logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#23735F] hover:bg-[#1b5c4c] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Export filtered audit logs as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Total Actions</span>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{stats.totalActions}</div>
            <p className="text-[11px] text-gray-500 mt-0.5">Recorded platform events</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Actions Today</span>
              <Clock className="w-4 h-4 text-[#23735F]" />
            </div>
            <div className="text-2xl font-black text-[#23735F] mt-2">{stats.actionsToday}</div>
            <p className="text-[11px] text-gray-500 mt-0.5">Since midnight (UK)</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Active Admins</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-900 mt-2">{stats.activeAdminsCount}</div>
            <p className="text-[11px] text-gray-500 mt-0.5">Distinct operators</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Security Actions</span>
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900 mt-2">{stats.securitySensitiveActions}</div>
            <p className="text-[11px] text-gray-500 mt-0.5">Roles, bans, keys</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Failed / Denied</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-black text-red-600 mt-2">{stats.failedOrDeniedActions}</div>
            <p className="text-[11px] text-gray-500 mt-0.5">Security alerts</p>
          </div>
        </section>

        {/* Category Filter Tabs */}
        <section className="bg-white rounded-2xl border border-gray-200 p-2 shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORY_OPTIONS.map(category => (
              <button
                key={category}
                onClick={() => { setSelectedCategory(category); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-[#23735F] text-white shadow-2xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* Secondary Filter Controls */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search admin, action, target, ID..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#23735F]"
              />
            </div>

            {/* Admin Filter */}
            <div>
              <select
                value={selectedAdmin}
                onChange={(e) => { setSelectedAdmin(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#23735F]"
              >
                <option value="all">All Administrators</option>
                {adminEmailsList.map(email => (
                  <option key={email} value={email}>{email}</option>
                ))}
              </select>
            </div>

            {/* Result Filter */}
            <div>
              <select
                value={selectedResult}
                onChange={(e) => { setSelectedResult(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#23735F]"
              >
                <option value="all">All Results (Success/Failed/Denied)</option>
                <option value="Success">Success Only</option>
                <option value="Failed">Failed Only</option>
                <option value="Denied">Denied Only</option>
              </select>
            </div>

            {/* Date Range Preset */}
            <div>
              <select
                value={rangePreset}
                onChange={(e) => { setRangePreset(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#23735F]"
              >
                <option value="all">Time Range: All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Custom Date Pickers & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-500">Custom Dates:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                placeholder="Start Date"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                placeholder="End Date"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-500">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </section>

        {/* Audit Log Table */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-[#23735F] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-semibold text-gray-600">Loading administrative audit records...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-900">{errorMessage}</p>
              <button
                onClick={() => loadLogs()}
                className="mt-3 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold"
              >
                Try Again
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900">No audit events match your filters</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Try adjusting your search keywords, category tabs, or date range.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-1.5 bg-[#23735F] text-white rounded-xl text-xs font-bold hover:bg-[#1b5c4c]"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold">
                    <th className="py-3 px-4">Date & Time (UK)</th>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Action & Category</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {logs.map((item) => (
                    <tr key={item.auditId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                        {formatUKDateTime(item.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{item.adminNameSnapshot || 'Admin'}</div>
                        <div className="text-[11px] text-gray-500">{item.adminEmailSnapshot}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{item.action}</div>
                        <div className="mt-0.5">{renderCategoryTag(item.category)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800 line-clamp-1">{item.targetNameSnapshot || '—'}</div>
                        <div className="text-[11px] text-gray-500">{item.targetType}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderResultBadge(item.result)}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-gray-600">{item.description}</p>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#23735F] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {!loading && logs.length > 0 && (
            <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
              <div>
                Showing <span className="font-bold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-bold">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                <span className="font-bold">{totalCount}</span> records
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* View Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#23735F]" />
                <h3 className="font-bold text-gray-900 text-sm">Audit Record Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Event Header Summary */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-900 text-sm">{selectedLog.action}</span>
                  {renderResultBadge(selectedLog.result)}
                </div>
                <p className="text-emerald-800">{selectedLog.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block text-[11px]">Administrator</span>
                  <div className="font-bold text-gray-900 mt-0.5">{selectedLog.adminNameSnapshot}</div>
                  <div className="text-gray-600 text-[11px]">{selectedLog.adminEmailSnapshot}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block text-[11px]">Date & Time (UK)</span>
                  <div className="font-bold text-gray-900 mt-0.5">{formatUKDateTime(selectedLog.timestamp)}</div>
                  <div className="text-gray-500 text-[11px] font-mono">{selectedLog.timestamp}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block text-[11px]">Category</span>
                  <div className="font-bold text-gray-900 mt-0.5">{selectedLog.category}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block text-[11px]">Target Affected</span>
                  <div className="font-bold text-gray-900 mt-0.5">{selectedLog.targetNameSnapshot || 'System'}</div>
                  <div className="text-gray-500 text-[11px]">Type: {selectedLog.targetType} {selectedLog.targetId ? `(${selectedLog.targetId})` : ''}</div>
                </div>
              </div>

              {selectedLog.changedFields && selectedLog.changedFields.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block text-[11px] mb-1">Changed Field Names</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedLog.changedFields.map(f => (
                      <span key={f} className="px-2 py-0.5 bg-white border border-gray-200 rounded-md font-mono text-[11px] text-gray-800">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block text-[11px] mb-1">Event Metadata</span>
                  <pre className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-gray-200 overflow-x-auto text-gray-800">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">Request / Correlation ID:</span>
                  <div className="font-mono text-gray-800">{selectedLog.requestId || '—'}</div>
                </div>
                <div>
                  <span className="text-gray-500">Audit ID:</span>
                  <div className="font-mono text-gray-800">{selectedLog.auditId}</div>
                </div>
                {selectedLog.route && (
                  <div>
                    <span className="text-gray-500">Route & Method:</span>
                    <div className="font-mono text-gray-800">{selectedLog.httpMethod} {selectedLog.route}</div>
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-gray-500">Client IP:</span>
                    <div className="font-mono text-gray-800">{selectedLog.ipAddress}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-900 transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
