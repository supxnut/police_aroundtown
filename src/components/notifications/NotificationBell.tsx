import React, { useState } from 'react';
import { Bell, Megaphone, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { formatDate } from '../../utils/constants';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { announcements, unreadCount, markAllRead } = useNotification();

  const handleToggle = () => {
    if (!isOpen) {
      markAllRead();
    }
    setIsOpen(!isOpen);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'activity':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'system':
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <Megaphone className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
            <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <span>Broadcasts & Alerts</span>
            </h4>
            <span className="text-xs text-slate-400">{announcements.length} Messages</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {announcements.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No recent announcements or notifications.
              </div>
            ) : (
              announcements.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="p-1.5 rounded-md bg-slate-800 border border-slate-700/60 shrink-0 mt-0.5">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-200 truncate">{item.title}</p>
                        <span className="text-[10px] text-slate-500">{formatDate(item.created_at || '')}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
