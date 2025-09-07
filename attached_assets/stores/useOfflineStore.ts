
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OfflineAction } from '../types';
import { useDataStore } from './useDataStore';

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  actionQueue: OfflineAction[];
  setIsOnline: (status: boolean) => void;
  queueAction: (type: string, payload: any) => void;
  processQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      isSyncing: false,
      actionQueue: [],
      
      setIsOnline: (status) => {
        set({ isOnline: status });
        if (status) {
          get().processQueue();
        }
      },

      queueAction: (type, payload) => {
        const action: OfflineAction = {
          id: `${Date.now()}-${Math.random()}`,
          type,
          payload,
          timestamp: Date.now(),
        };
        set(state => ({ actionQueue: [...state.actionQueue, action] }));
      },
      
      processQueue: async () => {
        if (get().isSyncing || !get().isOnline) return;

        set({ isSyncing: true });
        
        const queue = get().actionQueue;
        if (queue.length === 0) {
            set({ isSyncing: false });
            return;
        }

        const dataStore = useDataStore.getState();

        for (const action of queue) {
          try {
            // In a real app, this would be an API call. Here we call the central data store.
            // @ts-ignore
            if (typeof dataStore[action.type] === 'function') {
                // @ts-ignore
                dataStore[action.type](action.payload);
                // Simulate network latency
                await new Promise(res => setTimeout(res, 50));
            } else {
                console.error(`Action type "${action.type}" not found in dataStore.`);
            }
          } catch (error) {
            console.error(`Failed to process action ${action.id}:`, error);
            // In a real app, handle failed actions (e.g., move to a failed queue)
          }
        }

        set({ actionQueue: [], isSyncing: false });
      },
    }),
    {
      name: 'sirim-offline-storage',
      partialize: (state) => ({ actionQueue: state.actionQueue }), // Only persist the action queue
    }
  )
);

// Listen to online/offline events
window.addEventListener('online', () => useOfflineStore.getState().setIsOnline(true));
window.addEventListener('offline', () => useOfflineStore.getState().setIsOnline(false));

// Initial check
useOfflineStore.getState().setIsOnline(navigator.onLine);
