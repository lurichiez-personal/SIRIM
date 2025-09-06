
import { create } from 'zustand';
import { Empresa } from '../types';
import { useAuthStore } from './useAuthStore';
import { useDataStore } from './useDataStore';

interface TenantState {
  selectedTenant: Empresa | null;
  availableTenants: Empresa[];
  setTenant: (tenantId: number) => void;
  fetchAvailableTenants: () => void;
  getTenantById: (tenantId: number) => Empresa | undefined;
  clearTenants: () => void;
  addEmpresa: (empresaData: Omit<Empresa, 'id' | 'trialEndsAt'>) => Empresa;
}

const mockEmpresas: Empresa[] = [
    { id: 1, nombre: 'Empresa A S.R.L.', rnc: '101000001' },
    { id: 2, nombre: 'Consultores B & Asociados', rnc: '102000002' },
    { id: 3, nombre: 'Constructora C por A', rnc: '103000003' }
];

// Función para simular una llamada a la API
const fetchTenantsFromApi = async (userId: string | undefined, allTenants: Empresa[]): Promise<Empresa[]> => {
    console.log(`Fetching tenants for user ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = useAuthStore.getState().user;
    if (user?.empresaId) {
        return allTenants.filter(e => e.id === user.empresaId);
    }
    return allTenants; // El contador ve todas
};


export const useTenantStore = create<TenantState>((set, get) => ({
  selectedTenant: null,
  availableTenants: mockEmpresas,
  setTenant: (tenantId: number) => {
    const { availableTenants } = get();
    const newTenant = availableTenants.find(t => t.id === tenantId) || null;
    set({ selectedTenant: newTenant });
    if (newTenant) {
        useDataStore.getState().fetchData(newTenant.id);
    }
    console.log(`Tenant cambiado a: ${newTenant?.nombre}`);
  },
  fetchAvailableTenants: async () => {
    const user = useAuthStore.getState().user;
    const allTenants = get().availableTenants;
    const tenants = await fetchTenantsFromApi(user?.id, allTenants);
    
    // Do not set availableTenants here again as it's the source of truth now.
    // Only determine the selected one.
    
    if (user && tenants.length > 0) {
        const currentSelected = get().selectedTenant;
        // If there's no selection or the current selection is not in the available list, set a default.
        if (!currentSelected || !tenants.some(t => t.id === currentSelected.id)) {
            const defaultTenantId = user.empresaId || tenants[0].id;
            const defaultTenant = tenants.find(t => t.id === defaultTenantId);
            set({ selectedTenant: defaultTenant });
            if (defaultTenant) {
                useDataStore.getState().fetchData(defaultTenant.id);
            }
        }
    }
  },
  getTenantById: (tenantId: number) => {
    const { availableTenants } = get();
    return availableTenants.find(t => t.id === tenantId);
  },
  clearTenants: () => {
    set({ selectedTenant: null });
  },
  addEmpresa: (empresaData) => {
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
}));
