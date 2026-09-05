import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ExternalLink, X, HelpCircle, Award, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../services/notificationService';

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  const prevNotifIdsRef = useRef(new Set());
  const dropdownRef = useRef(null);

  // Load notifications
  const loadNotifications = async (isInitial = false) => {
    if (!user || user.userType === 'teacher' || user.role === 'admin') return;

    try {
      const data = await fetchMyNotifications(user);
      const list = data.notifications || [];
      setNotifications(list);
      setUnreadCount(data.unreadCount || 0);

      // Check if a new unread notification arrived for a toast
      if (!isInitial) {
        const newUnread = list.find(n => !n.read && !prevNotifIdsRef.current.has(n.notificationId));
        if (newUnread) {
          setToastNotification(newUnread);
        }
      }

      const idSet = new Set(list.map(n => n.notificationId));
      prevNotifIdsRef.current = idSet;
    } catch (err) {
      // Ignore background notification fetch errors
    }
  };

  // Initial load and periodic safe polling (every 45s)
  useEffect(() => {
    loadNotifications(true);
    const interval = setInterval(() => {
      loadNotifications(false);
    }, 45000);

    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.read) {
        await markNotificationAsRead(notif.notificationId, user);
        setNotifications(prev => prev.map(n => n.notificationId === notif.notificationId ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setIsOpen(false);
      setToastNotification(null);

      // Clear session cache so dashboard loads freshest state
      if (user?.email) {
        try { sessionStorage.removeItem(`dashboard_cache_${user.email}`); } catch {}
      }

      if (notif.actionUrl) {
        navigate(notif.actionUrl);
      }
    } catch (err) {
      console.error('Failed to handle notification click:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(user);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  if (!user || user.userType === 'teacher' || user.role === 'admin') {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-3 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#23735F]" />
              <h4 className="text-xs font-black text-gray-900">Notifications</h4>
              {unreadCount > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-[#23735F] hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                <CheckCircle2 className="h-8 w-8 text-gray-300 mx-auto mb-1.5" />
                <p className="font-semibold text-gray-600">No notifications yet</p>
                <p className="text-[11px]">When content you request is published, you'll be notified here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isQuiz = n.contentType === 'quiz';
                return (
                  <div
                    key={n.notificationId}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 items-start ${
                      !n.read ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isQuiz ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-[#23735F]'
                      }`}
                    >
                      {isQuiz ? <HelpCircle className="h-4 w-4" /> : <Award className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className={`text-xs font-bold leading-tight ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </h5>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#23735F] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-gray-400 block mt-1">
                        {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Real-time Non-blocking Toast Popup */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-emerald-200 p-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-[#23735F] shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-gray-900">{toastNotification.title}</h4>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{toastNotification.message}</p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => handleNotificationClick(toastNotification)}
                  className="px-3 py-1 bg-[#23735F] hover:bg-[#1b5b4b] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  View Now
                </button>
                <button
                  type="button"
                  onClick={() => setToastNotification(null)}
                  className="px-2.5 py-1 text-gray-500 hover:text-gray-800 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
