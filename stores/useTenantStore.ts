
import { create } from 'zustand';
import { Empresa } from '../types';
import { useAuthStore } from './useAuthStore';
import { useDataStore } from './useDataStore';

interface TenantState {
  selectedTenant: Empresa | null;
  availableTenants: Empresa[];
  isLoadingTenants: boolean;
  setTenant: (tenantId: number) => void;
  fetchAvailableTenants: () => void;
  getTenantById: (tenantId: number) => Empresa | undefined;
  clearTenants: () => void;
  addEmpresa: (empresaData: Omit<Empresa, 'id' | 'trialEndsAt'>) => Promise<Empresa>;
}

// Las empresas ahora vienen exclusivamente de la base de datos PostgreSQL

// Función para obtener empresas desde la base de datos
const fetchTenantsFromApi = async (userId: string | undefined): Promise<Empresa[]> => {
    try {
        const response = await fetch('/api/empresas', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const empresas = await response.json();
            return empresas;
        }
        
        console.error('Error obteniendo empresas:', response.statusText);
        return [];
    } catch (error) {
        console.error('Error de conexión obteniendo empresas:', error);
        return [];
    }
};


export const useTenantStore = create<TenantState>((set, get) => ({
  selectedTenant: null,
  availableTenants: [], // Las empresas se cargan dinámicamente desde la BD
  isLoadingTenants: false,
  setTenant: (tenantId: number) => {
    const { availableTenants } = get();
    const newTenant = availableTenants.find(t => t.id === tenantId) || null;
    set({ selectedTenant: newTenant });
    if (newTenant) {
        useDataStore.getState().fetchData(newTenant.id);
    }
  },
  fetchAvailableTenants: async () => {
    const { isLoadingTenants, availableTenants } = get();
    
    // Evitar llamadas concurrentes
    if (isLoadingTenants) return;
    
    // Si ya tenemos datos y no ha pasado mucho tiempo, no recargar
    if (availableTenants.length > 0) return;
    
    set({ isLoadingTenants: true });
    
    try {
      const user = useAuthStore.getState().user;
      const tenants = await fetchTenantsFromApi(user?.id);
      
      // Actualizar la lista de tenants disponibles
      set({ availableTenants: tenants });
      
      if (user && tenants.length > 0) {
          const currentSelected = get().selectedTenant;
          // Si no hay selección, establecer un default (sin fetchData para evitar loops)
          if (!currentSelected) {
              const defaultTenantId = user.empresaId || tenants[0].id;
              const defaultTenant = tenants.find(t => t.id === defaultTenantId);
              set({ selectedTenant: defaultTenant });
          }
      }
    } finally {
      set({ isLoadingTenants: false });
    }
  },
  getTenantById: (tenantId: number) => {
    const { availableTenants } = get();
    return availableTenants.find(t => t.id === tenantId);
  },
  clearTenants: () => {
    set({ selectedTenant: null });
  },
  addEmpresa: async (empresaData) => {
    try {
        const response = await fetch('/api/empresas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(empresaData)
        });

        if (response.ok) {
            const newEmpresa = await response.json();
            
            // Agregar a la lista local
            set(state => ({
                availableTenants: [...state.availableTenants, newEmpresa]
            }));
            
            return newEmpresa;
        } else {
            console.error('Error creando empresa:', response.statusText);
            
            // Fallback: crear localmente (temporal)
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30);
            
            const newEmpresa: Empresa = {
                ...empresaData,
                id: Date.now(),
                trialEndsAt: trialEndDate.toISOString(),
            };
            
            set(state => ({
                availableTenants: [...state.availableTenants, newEmpresa]
            }));
            
            return newEmpresa;
        }
    } catch (error) {
        console.error('Error de conexión creando empresa:', error);
        
        // Fallback: crear localmente (temporal)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        const newEmpresa: Empresa = {
            ...empresaData,
            id: Date.now(),
            trialEndsAt: trialEndDate.toISOString(),
        };
        
        set(state => ({
            availableTenants: [...state.availableTenants, newEmpresa]
        }));
        
        return newEmpresa;
    }
  }
}));
