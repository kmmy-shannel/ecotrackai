import React, { useContext } from 'react';
import { NotificationContext } from '../../context/NotificationContext';

const typeStyles = {
  success: 'border-emerald-700 bg-emerald-950/40 text-emerald-100',
  error: 'border-red-800 bg-red-950/40 text-red-100',
  warning: 'border-amber-700 bg-amber-950/40 text-amber-100',
  info: 'border-[var(--surface-700)] bg-[var(--bg-900)] text-[var(--text-100)]',
};

export const NotificationCenter = () => {
  const { notifications, removeNotification } = useContext(NotificationContext);

  if (!notifications?.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[1000] w-full max-w-sm space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-lg border px-4 py-3 shadow-lg ${typeStyles[notification.type] || typeStyles.info}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm">{notification.message}</p>
            <button
              className="text-xs uppercase tracking-wide opacity-80 hover:opacity-100"
              onClick={() => removeNotification(notification.id)}
              aria-label="Close notification"
            >
              close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;
