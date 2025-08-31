import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useTenantStore } from '../stores/useTenantStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { Role, Notificacion, NotificationType } from '../types';
import TenantSelector from './TenantSelector';
import { LogOutIcon, UserCircleIcon, BellIcon, FacturasIcon, InventarioIcon, ConfiguracionIcon, ClipboardDocumentCheckIcon } from './icons/Icons';
import OfflineIndicator from './ui/OfflineIndicator';
import { useUIStore } from '../stores/useUIStore';

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    switch (type) {
        case NotificationType.FACTURA_VENCIDA: return <FacturasIcon className="h-5 w-5 text-red-500" />;
        case NotificationType.STOCK_BAJO: return <InventarioIcon className="h-5 w-5 text-yellow-600" />;
        case NotificationType.NCF_BAJO: return <ConfiguracionIcon className="h-5 w-5 text-red-600" />;
        case NotificationType.NOMINA_PARA_AUDITORIA: return <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-500" />;
        default: return <BellIcon className="h-5 w-5 text-secondary-500" />;
    }
}

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { selectedTenant } = useTenantStore();
  const { notifications, checkSystemAlerts, markAsRead } = useNotificationStore();
  const { toggleSidebar } = useUIStore();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const isContador = user?.roles.includes(Role.Contador);

  const unreadNotifications = useMemo(() => {
    if (!selectedTenant) return [];
    return notifications.filter(n => n.empresaId === selectedTenant.id && !n.read);
  }, [notifications, selectedTenant]);

  useEffect(() => {
    if (selectedTenant) {
      checkSystemAlerts(selectedTenant.id);
    }
  }, [selectedTenant, checkSystemAlerts]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification: Notificacion) => {
      markAsRead(notification.id);
      setIsNotificationsOpen(false);
  }

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-secondary-200">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="md:hidden p-2 mr-2 rounded-md text-secondary-600 hover:bg-secondary-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        {isContador && (
            <TenantSelector />
        )}
        {!isContador && selectedTenant && (
            <h1 className="text-md md:text-lg font-semibold text-secondary-700 truncate">{selectedTenant.nombre}</h1>
        )}
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="hidden sm:block"><OfflineIndicator /></div>
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-full text-secondary-600 hover:bg-secondary-100 hover:text-primary transition-colors duration-200"
            aria-label="Notificaciones"
          >
            <BellIcon className="h-6 w-6" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
          </button>
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-20 border border-secondary-200">
              <div className="p-3 border-b font-semibold text-secondary-800">
                Notificaciones
              </div>
              <ul className="py-1 max-h-80 overflow-y-auto">
                {unreadNotifications.length === 0 ? (
                  <li className="px-4 py-2 text-sm text-secondary-500">No hay notificaciones nuevas.</li>
                ) : (
                  unreadNotifications.map(notification => (
                    <li key={notification.id}>
                      <Link to={notification.link || '#'} onClick={() => handleNotificationClick(notification)} className="flex items-start px-4 py-3 text-sm text-secondary-700 hover:bg-secondary-100">
                        <div className="flex-shrink-0 mr-3 mt-1">
                           <NotificationIcon type={notification.type} />
                        </div>
                        <div>
                          <p className="font-semibold">{notification.title}</p>
                          <p className="text-xs">{notification.message}</p>
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        <div className="hidden md:flex items-center space-x-2">
            <UserCircleIcon className="h-8 w-8 text-secondary-500" />
            <div className="text-right">
                <div className="text-sm font-medium text-secondary-800">{user?.nombre}</div>
                <div className="text-xs text-secondary-500">{user?.email}</div>
            </div>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-full text-secondary-600 hover:bg-secondary-100 hover:text-primary transition-colors duration-200"
          aria-label="Cerrar sesión"
        >
          <LogOutIcon className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;
