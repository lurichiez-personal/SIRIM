
import { create } from 'zustand';
import { Empresa } from '../types';
import { useAuthStore } from './useAuthStore';

interface TenantState {
  selectedTenant: Empresa | null;
  availableTenants: Empresa[];
  setTenant: (tenantId: number) => void;
  fetchAvailableTenants: () => void;
}

const mockEmpresas: Empresa[] = [
    { id: 1, nombre: 'Empresa A S.R.L.', rnc: '101000001' },
    { id: 2, nombre: 'Consultores B & Asociados', rnc: '102000002' },
    { id: 3, nombre: 'Constructora C por A', rnc: '103000003' }
];

// Función para simular una llamada a la API
const fetchTenantsFromApi = async (userId: string | undefined): Promise<Empresa[]> => {
    console.log(`Fetching tenants for user ${userId}`);
    // En una app real, aquí se llamaría a GET /api/usuarios/empresas
    // El backend devolvería las empresas asociadas al usuario.
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = useAuthStore.getState().user;
    if (user?.empresaId) {
        return mockEmpresas.filter(e => e.id === user.empresaId);
    }
    return mockEmpresas; // El contador ve todas
};


export const useTenantStore = create<TenantState>((set, get) => ({
  selectedTenant: null,
  availableTenants: [],
  setTenant: (tenantId: number) => {
    const { availableTenants } = get();
    const newTenant = availableTenants.find(t => t.id === tenantId) || null;
    set({ selectedTenant: newTenant });
    // TODO: Al cambiar de tenant, invalidar queries de React Query para recargar datos.
    console.log(`Tenant cambiado a: ${newTenant?.nombre}`);
  },
  fetchAvailableTenants: async () => {
    const user = useAuthStore.getState().user;
    if (user) {
        const tenants = await fetchTenantsFromApi(user.id);
        set({ availableTenants: tenants });
        if (tenants.length > 0) {
            // Seleccionar la primera empresa por defecto o la asociada al usuario
            const defaultTenantId = user.empresaId || tenants[0].id;
            const defaultTenant = tenants.find(t => t.id === defaultTenantId);
            set({ selectedTenant: defaultTenant });
        }
    }
  },
}));

// Sincronizar el tenant cuando el usuario se loguea
useAuthStore.subscribe((state, prevState) => {
    if (state.isAuthenticated && !prevState.isAuthenticated) {
        useTenantStore.getState().fetchAvailableTenants();
    }
    if (!state.isAuthenticated && prevState.isAuthenticated) {
        useTenantStore.setState({ selectedTenant: null, availableTenants: [] });
    }
});