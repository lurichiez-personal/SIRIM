
import { create } from 'zustand';
import { Notificacion, NotificationType } from '../types';
import { useDataStore } from './useDataStore';
import { useNCFStore } from './useNCFStore';

interface NotificationState {
  notifications: Notificacion[];
  fetchNotifications: (empresaId: number) => void;
  markAsRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  fetchNotifications: (empresaId) => {
    const { facturas, items } = useDataStore.getState();
    const { sequences } = useNCFStore.getState();
    const newNotifications: Notificacion[] = [];

    // Facturas Vencidas
    const today = new Date();
    facturas.forEach(f => {
      if (f.estado === 'vencida') {
        newNotifications.push({
          id: `factura-vencida-${f.id}`, empresaId, type: NotificationType.FACTURA_VENCIDA,
          title: 'Factura Vencida', message: `La factura ${f.ncf} para ${f.clienteNombre} está vencida.`,
          link: '/facturas', read: false, createdAt: new Date().toISOString()
        });
      }
    });

    // Stock Bajo
    items.forEach(i => {
      if (i.cantidadDisponible !== undefined && i.cantidadDisponible <= 5) {
        newNotifications.push({
          id: `stock-bajo-${i.id}`, empresaId, type: NotificationType.STOCK_BAJO,
          title: 'Stock Bajo', message: `El ítem ${i.nombre} (${i.codigo}) tiene solo ${i.cantidadDisponible} unidades.`,
          link: '/inventario', read: false, createdAt: new Date().toISOString()
        });
      }
    });
    
    // NCF Bajo
    sequences.forEach(s => {
        if (s.empresaId === empresaId && s.alertaActiva) {
             newNotifications.push({
                id: `ncf-bajo-${s.id}`, empresaId, type: NotificationType.NCF_BAJO,
                title: 'Alerta de NCF Bajo', message: `La secuencia ${s.tipo} está por agotarse.`,
                link: '/configuracion/ncf', read: false, createdAt: new Date().toISOString()
             });
        }
    });

    set({ notifications: newNotifications });
  },
  markAsRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  }
}));
