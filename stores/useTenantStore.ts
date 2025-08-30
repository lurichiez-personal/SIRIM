
import { create } from 'zustand';
import { Empresa } from '../types';
import { useAuthStore } from './useAuthStore';
import { useDataStore } from './useDataStore';
import { apiFetch } from '../utils/api';

interface TenantState {
  selectedTenant: Empresa | null;
  availableTenants: Empresa[];
  setTenant: (tenantId: number) => void;
  fetchAvailableTenants: () => void;
  getTenantById: (tenantId: number) => Empresa | undefined;
  clearTenants: () => void;
}

const mockEmpresas: Empresa[] = [
    { id: 1, nombre: 'Empresa A S.R.L.', rnc: '101000001' },
    { id: 2, nombre: 'Consultores B & Asociados', rnc: '102000002' },
    { id: 3, nombre: 'Constructora C por A', rnc: '103000003' }
];

const fetchTenantsFromApi = async (userId: string | undefined): Promise<Empresa[]> => {
    if (userId) {
        try {
            return await apiFetch<Empresa[]>(`/usuarios/${userId}/empresas`);
        } catch (error) {
            console.error('Error fetching tenants', error);
        }
    }
    const user = useAuthStore.getState().user;
    if (user?.empresaId) {
        return mockEmpresas.filter(e => e.id === user.empresaId);
    }
    return mockEmpresas;
};


export const useTenantStore = create<TenantState>((set, get) => ({
  selectedTenant: null,
  availableTenants: [],
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
    const tenants = await fetchTenantsFromApi(user?.id);
    set({ availableTenants: tenants });
    if (user && tenants.length > 0) {
        const defaultTenantId = user.empresaId || tenants[0].id;
        const defaultTenant = tenants.find(t => t.id === defaultTenantId);
        set({ selectedTenant: defaultTenant });
        if (defaultTenant) {
            useDataStore.getState().fetchData(defaultTenant.id);
        }
    }
  },
  getTenantById: (tenantId: number) => {
    const { availableTenants } = get();
    return availableTenants.find(t => t.id === tenantId);
  },
  clearTenants: () => {
    set({ selectedTenant: null, availableTenants: [] });
  }
}));
