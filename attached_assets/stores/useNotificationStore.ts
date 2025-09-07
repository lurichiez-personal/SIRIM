
import { create } from 'zustand';
import { Notificacion, NotificationType } from '../types';
import { useDataStore } from './useDataStore';
import { useNCFStore } from './useNCFStore';

interface NotificationState {
  notifications: Notificacion[];
  checkSystemAlerts: (empresaId: number) => void;
  addNotification: (notificationData: Omit<Notificacion, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  
  addNotification: (notificationData) => {
    const newNotification: Notificacion = {
        ...notificationData,
        id: `event-${Date.now()}`,
        read: false,
        createdAt: new Date().toISOString(),
    };
    
    const linkExists = get().notifications.some(n => 
        n.link === newNotification.link && 
        n.type === newNotification.type &&
        !n.read
    );

    if (linkExists) return;

    set(state => ({ notifications: [newNotification, ...state.notifications] }));
  },

  checkSystemAlerts: (empresaId) => {
    const eventDrivenTypes = [
        NotificationType.COTIZACION_APROBADA,
        NotificationType.COTIZACION_RECHAZADA,
        NotificationType.NOMINA_PARA_AUDITORIA
    ];
    
    const persistentNotifications = get().notifications.filter(n => eventDrivenTypes.includes(n.type));

    const { facturas, items } = useDataStore.getState();
    const { sequences } = useNCFStore.getState();
    const newSystemNotifications: Notificacion[] = [];

    // Facturas Vencidas
    facturas.forEach(f => {
      if (f.estado === 'vencida') {
        newSystemNotifications.push({
          id: `factura-vencida-${f.id}`, empresaId, type: NotificationType.FACTURA_VENCIDA,
          title: 'Factura Vencida', message: `La factura ${f.ncf} para ${f.clienteNombre} está vencida.`,
          link: '/facturas', read: false, createdAt: new Date().toISOString()
        });
      }
    });

    // Stock Bajo
    items.forEach(i => {
      if (i.cantidadDisponible !== undefined && i.cantidadDisponible <= 5) {
        newSystemNotifications.push({
          id: `stock-bajo-${i.id}`, empresaId, type: NotificationType.STOCK_BAJO,
          title: 'Stock Bajo', message: `El ítem ${i.nombre} (${i.codigo}) tiene solo ${i.cantidadDisponible} unidades.`,
          link: '/inventario', read: false, createdAt: new Date().toISOString()
        });
      }
    });
    
    // NCF Bajo
    sequences.forEach(s => {
        if (s.empresaId === empresaId && s.alertaActiva) {
             newSystemNotifications.push({
                id: `ncf-bajo-${s.id}`, empresaId, type: NotificationType.NCF_BAJO,
                title: 'Alerta de NCF Bajo', message: `La secuencia ${s.tipo} está por agotarse.`,
                link: '/configuracion/ncf', read: false, createdAt: new Date().toISOString()
             });
        }
    });

    set({ notifications: [...persistentNotifications, ...newSystemNotifications] });
  },

  markAsRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  }
}));
