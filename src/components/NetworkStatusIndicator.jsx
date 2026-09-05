import React from 'react';
import { Wifi, WifiOff, Signal } from 'lucide-react';
import { NETWORK_STATUS } from '../services/networkMonitor';

/**
 * Network Status Indicator
 * Shows current network status with color coding
 */
const NetworkStatusIndicator = ({ status, pendingDoubts = 0, onClick }) => {
  const getStatusConfig = () => {
    switch (status) {
      case NETWORK_STATUS.ONLINE:
        return {
          icon: <Wifi className="h-4 w-4" />,
          text: 'Online Mode',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          emoji: '🟢'
        };
      case NETWORK_STATUS.LOW_NETWORK:
        return {
          icon: <Signal className="h-4 w-4" />,
          text: 'Low Network Mode',
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          emoji: '🟡'
        };
      case NETWORK_STATUS.OFFLINE:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Offline AI Lite Mode',
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          emoji: '🔴'
        };
      default:
        return {
          icon: <Wifi className="h-4 w-4" />,
          text: 'Checking...',
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          emoji: '⚪'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${config.bgColor} ${config.borderColor} shadow-lg transition-all hover:shadow-xl`}>
        <div className={`${config.color} rounded-full p-1.5 animate-pulse`}>
          {config.icon}
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${config.textColor}`}>
            {config.emoji} {config.text}
          </span>
          {pendingDoubts > 0 && (
            <span className="text-xs text-gray-600">
              {pendingDoubts} doubt{pendingDoubts > 1 ? 's' : ''} pending sync
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkStatusIndicator;
