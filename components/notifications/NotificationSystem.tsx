import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { InformationCircleIcon, CheckCircleIcon, XMarkIcon } from '../icons/Icons';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // En milisegundos, null para persistente
  actions?: NotificationAction[];
  timestamp: Date;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showSuccess: (title: string, message?: string, actions?: NotificationAction[]) => string;
  showError: (title: string, message?: string, actions?: NotificationAction[]) => string;
  showWarning: (title: string, message?: string, actions?: NotificationAction[]) => string;
  showInfo: (title: string, message?: string, actions?: NotificationAction[]) => string;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe ser usado dentro de NotificationProvider');
  }
  return context;
};

// Componente individual de notificación
const NotificationItem: React.FC<{ 
  notification: Notification; 
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XMarkIcon className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-400" />;
      case 'info':
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTitleColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  const getMessageColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      case 'info':
      default:
        return 'text-blue-700';
    }
  };

  return (
    <div className={`max-w-sm w-full border rounded-md p-4 shadow-lg ${getBackgroundColor()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className={`text-sm font-medium ${getTitleColor()}`}>
            {notification.title}
          </p>
          {notification.message && (
            <p className={`mt-1 text-sm ${getMessageColor()}`}>
              {notification.message}
            </p>
          )}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="inline-flex text-secondary-400 hover:text-secondary-600"
            onClick={() => onRemove(notification.id)}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Contenedor de notificaciones
const NotificationContainer: React.FC<{
  notifications: Notification[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 pointer-events-none">
      <div className="space-y-4 pointer-events-auto">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
};

// Provider del sistema de notificaciones
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? 5000 // Default 5 segundos
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remover después del duration especificado
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
    return addNotification({
      type: 'success',
      title,
      message: message || '',
      actions
    });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
    return addNotification({
      type: 'error',
      title,
      message: message || '',
      actions,
      duration: 0 // Los errores persisten hasta ser cerrados manualmente
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
    return addNotification({
      type: 'warning',
      title,
      message: message || '',
      actions,
      duration: 7000 // Advertencias duran más
    });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
    return addNotification({
      type: 'info',
      title,
      message: message || '',
      actions
    });
  }, [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

// Hook para manejar errores con notificaciones
export const useErrorHandler = () => {
  const { showError } = useNotifications();

  const handleError = useCallback((error: Error | string, context?: string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const title = context ? `Error en ${context}` : 'Ha ocurrido un error';
    
    console.error('[ErrorHandler]', { error, context });
    
    showError(title, errorMessage, [
      {
        label: 'Reportar',
        onClick: () => {
          // TODO: Implementar reporte de errores
          console.log('Reportar error:', { error, context });
        },
        variant: 'primary'
      }
    ]);
  }, [showError]);

  const handleAsyncError = useCallback((errorPromise: Promise<any>, context?: string) => {
    errorPromise.catch((error) => handleError(error, context));
  }, [handleError]);

  return { handleError, handleAsyncError };
};