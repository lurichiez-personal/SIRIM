
import { create } from 'zustand';
import { Empresa, Role, CierreFiscal, AsientoContable } from '../types.ts';
import { useAuthStore } from './useAuthStore.ts';
import { useDataStore } from './useDataStore.ts';
import { db } from '../firebase.ts';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.ts';

// Helper to convert Firestore Timestamps to ISO strings to prevent serialization errors
const serializeDoc = (docData: any) => {
    const data = { ...docData };
    for (const key in data) {
        if (data[key] && typeof data[key].toDate === 'function') {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return data;
};

interface TenantState {
  selectedTenant: Empresa | null;
  availableTenants: Empresa[];
  setTenant: (tenantId: string) => void;
  fetchAvailableTenants: () => Promise<void>;
  getTenantById: (tenantId: string) => Empresa | undefined;
  clearTenants: () => void;
  addEmpresa: (empresaData: Omit<Empresa, 'id' | 'createdAt' | 'trialEndsAt' | 'logoUrl' | 'accentColor' | 'footerText' >) => Promise<Empresa>;
  updateTenant: (empresaData: Empresa) => Promise<void>;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  selectedTenant: null,
  availableTenants: [],

  setTenant: (tenantId: string) => {
    const newTenant = get().availableTenants.find((t) => t.id === tenantId) || null;
    if (newTenant) {
      set({ selectedTenant: newTenant });
      useDataStore.getState().fetchData(newTenant.id);
      console.log(`Tenant cambiado a: ${newTenant?.nombre}`);
    }
  },

  fetchAvailableTenants: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ availableTenants: [], selectedTenant: null });
      return;
    }

    try {
      const functions = getFunctions(app, 'us-east1');
      const getUserEmpresas = httpsCallable(functions, 'getUserEmpresasSecure');
      const response = await getUserEmpresas({});
      
      const data = (response.data || {}) as { empresas: Empresa[] };
      const tenants = data.empresas || [];
      
      set({ availableTenants: tenants });

      if (tenants.length > 0) {
        const currentSelected = get().selectedTenant;
        if (!currentSelected || !tenants.some((t) => t.id === currentSelected.id)) {
          const defaultTenantId = user.empresaId || tenants[0].id;
          get().setTenant(defaultTenantId);
        } else {
          get().setTenant(currentSelected.id);
        }
      } else {
          set({ selectedTenant: null });
      }
    } catch (error) {
      console.error("Error fetching available tenants:", error);
      set({ availableTenants: [], selectedTenant: null });
    }
  },

  getTenantById: (tenantId: string) => {
    return get().availableTenants.find((t) => t.id === tenantId);
  },

  clearTenants: () => {
    set({ selectedTenant: null, availableTenants: [] });
    useDataStore.getState().clearData();
  },

  addEmpresa: async (empresaData) => {
    try {
      const functions = getFunctions(app, 'us-east1');
      const createEmpresa = httpsCallable(functions, 'createEmpresaSecure');
      
      const response = await createEmpresa({
        nombreEmpresa: empresaData.nombre,
        rnc: empresaData.rnc,
        cierreFiscal: empresaData.cierreFiscal,
        capitalSocialInicial: empresaData.capitalSocialInicial
      });

      const newEmpresa = (response.data as any).empresa as Empresa;

      set(state => ({
          availableTenants: [...state.availableTenants, newEmpresa]
      }));
      
      // Auto-seleccionar la nueva empresa creada
      get().setTenant(newEmpresa.id);
      
      return newEmpresa;
    } catch (error) {
      console.error("Error creating company:", error);
      throw error;
    }
  },

  updateTenant: async (empresaData: Empresa) => {
    const { id, ...dataToUpdate } = empresaData;
    const docRef = doc(db, 'empresas', id);
    await updateDoc(docRef, dataToUpdate);

    // Lógica para empresas existentes: Verificar y crear asiento de apertura si falta
    if (empresaData.capitalSocialInicial && empresaData.capitalSocialInicial > 0) {
        try {
            // Verificar si ya existe un asiento de APERTURA para esta empresa
            const q = query(
                collection(db, 'asientosContables'),
                where('empresaId', '==', id),
                where('transaccionId', '==', 'APERTURA')
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.log("Generando asiento de apertura faltante para empresa existente...");
                // Usamos la fecha de creación de la empresa si existe, sino hoy
                let fechaAsiento = new Date().toISOString().split('T')[0];
                if (empresaData.createdAt) {
                    fechaAsiento = new Date(empresaData.createdAt).toISOString().split('T')[0];
                }

                const asientoApertura: Omit<AsientoContable, 'id'> = {
                    empresaId: id,
                    fecha: fechaAsiento,
                    descripcion: 'Asiento de Apertura - Capital Suscrito y Pagado (Regularización)',
                    transaccionId: 'APERTURA',
                    transaccionTipo: 'asiento_diario',
                    entradas: [
                        { 
                            cuentaId: '1101-02', // Bancos
                            descripcion: 'Bancos', 
                            debito: empresaData.capitalSocialInicial, 
                            credito: 0 
                        },
                        { 
                            cuentaId: '31', // Capital Social
                            descripcion: 'Capital Social', 
                            debito: 0, 
                            credito: empresaData.capitalSocialInicial 
                        }
                    ]
                };
                
                await addDoc(collection(db, 'asientosContables'), {
                    ...asientoApertura,
                    createdAt: serverTimestamp()
                });
                
                // Forzar recarga de datos en dataStore si es la empresa actual
                if (get().selectedTenant?.id === id) {
                    useDataStore.getState().fetchData(id);
                }
            }
        } catch (error) {
            console.error("Error verificando/creando asiento de apertura:", error);
        }
    }

    set(state => ({
      availableTenants: state.availableTenants.map(t => t.id === id ? empresaData : t),
      selectedTenant: state.selectedTenant?.id === id ? empresaData : state.selectedTenant
    }));
  },
}));
