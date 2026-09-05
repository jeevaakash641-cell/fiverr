import React from 'react';
import { X, CheckCircle, AlertCircle, Gift, Flame } from 'lucide-react';

const AutomationNotifications = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  const getIcon = (title) => {
    if (title.includes('Streak')) return Flame;
    if (title.includes('Reward')) return Gift;
    if (title.includes('Risk')) return AlertCircle;
    return CheckCircle;
  };

  const getColor = (title) => {
    if (title.includes('Risk')) return 'bg-red-500';
    if (title.includes('Reward')) return 'bg-green-500';
    if (title.includes('Streak')) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => {
        const Icon = getIcon(notification.title);
        const colorClass = getColor(notification.title);

        return (
          <div
            key={notification.timestamp}
            className="bg-white rounded-lg shadow-lg border p-4 animate-slide-in-right"
          >
            <div className="flex items-start space-x-3">
              <div className={`${colorClass} p-2 rounded-lg flex-shrink-0`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {notification.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => onDismiss(notification.timestamp)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AutomationNotifications;
