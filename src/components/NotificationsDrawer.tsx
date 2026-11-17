import { AlertTriangle, CheckCircle2, Info, X, XOctagon } from 'lucide-react';
import type { NotificationItem } from '../types/finance';

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => Promise<void>;
  onMarkOneRead: (id: number) => Promise<void>;
}

export function NotificationsDrawer({
  open,
  onClose,
  notifications,
  onMarkAllRead,
  onMarkOneRead,
}: NotificationsDrawerProps) {
  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderIcon = (type: string) => {
    if (type === 'exceeded') return <XOctagon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />;
    if (type === 'warning' || type === 'monthly_warning') {
      return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
    }
    if (type === 'savings' || type === 'monthly_summary') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    return <Info className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">Notifications</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-3 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No alerts yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Budget warnings, daily limit alerts, and savings milestones will appear here as you
                log expenses.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.isRead) void onMarkOneRead(item.id);
                }}
                className={`p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                  item.isRead
                    ? 'bg-white dark:bg-slate-900 opacity-75'
                    : 'bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                <div className="mt-0.5">{renderIcon(item.type)}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </p>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {item.date}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
