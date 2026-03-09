import React, { createContext, useReducer, useCallback } from 'react';

/**
 * NotificationContext - Global notification state
 * Manages toast notifications, alerts, and confirmations
 */
export const NotificationContext = createContext();

const initialState = {
  notifications: [],
};

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };

    case 'CLEAR_ALL':
      return { notifications: [] };

    default:
      return state;
  }
};

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const addNotification = useCallback((notification) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notif = {
      id,
      type: 'info', // 'info', 'success', 'warning', 'error'
      duration: 5000,
      ...notification,
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: notif });

    // Auto-dismiss if duration specified
    if (notif.duration) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, notif.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const showSuccess = useCallback(
    (message, duration = 5000) => {
      return addNotification({ message, type: 'success', duration });
    },
    [addNotification]
  );

  const showError = useCallback(
    (message, duration = 5000) => {
      return addNotification({ message, type: 'error', duration });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (message, duration = 5000) => {
      return addNotification({ message, type: 'warning', duration });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (message, duration = 5000) => {
      return addNotification({ message, type: 'info', duration });
    },
    [addNotification]
  );

  const value = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
};

export default NotificationContext;
