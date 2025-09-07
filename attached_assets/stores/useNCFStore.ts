
import { create } from 'zustand';
import { NCFSequence, NCFType } from '../types';

interface NCFState {
  sequences: NCFSequence[];
  addSequence: (sequence: Omit<NCFSequence, 'id' | 'secuenciaActual' | 'activa' | 'alertaActiva'>) => void;
  getSequencesForTenant: (empresaId: number) => NCFSequence[];
  getAvailableTypes: (empresaId: number) => NCFType[];
  getNextNCF: (empresaId: number, tipo: NCFType) => Promise<string | null>;
  checkAlerts: (empresaId: number) => void;
}

const mockNCFSequences: NCFSequence[] = [
    { id: 1, empresaId: 1, tipo: NCFType.B01, prefijo: 'B01', secuenciaDesde: 1, secuenciaHasta: 1000, secuenciaActual: 58, fechaVencimiento: '2025-12-31', activa: true, alertaActiva: false },
    { id: 2, empresaId: 1, tipo: NCFType.B02, prefijo: 'B02', secuenciaDesde: 1, secuenciaHasta: 5000, secuenciaActual: 4980, fechaVencimiento: '2025-12-31', activa: true, alertaActiva: false },
    { id: 3, empresaId: 1, tipo: NCFType.B04, prefijo: 'B04', secuenciaDesde: 1, secuenciaHasta: 100, secuenciaActual: 5, fechaVencimiento: '2025-12-31', activa: true, alertaActiva: false },
    { id: 4, empresaId: 2, tipo: NCFType.B01, prefijo: 'B01', secuenciaDesde: 1, secuenciaHasta: 200, secuenciaActual: 195, fechaVencimiento: '2024-08-31', activa: true, alertaActiva: false },
];

const pad = (num: number, size: number) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
}

export const useNCFStore = create<NCFState>((set, get) => ({
  sequences: mockNCFSequences,
  addSequence: (sequenceData) => {
    set(state => {
        const newSequence: NCFSequence = {
            ...sequenceData,
            id: Date.now(),
            secuenciaActual: sequenceData.secuenciaDesde,
            activa: true,
            alertaActiva: false
        };
        const updatedSequences = [...state.sequences, newSequence];
        return { sequences: updatedSequences };
    });
    get().checkAlerts(sequenceData.empresaId);
  },
  getSequencesForTenant: (empresaId: number) => {
    return get().sequences.filter(s => s.empresaId === empresaId);
  },
  getAvailableTypes: (empresaId: number) => {
    const tenantSequences = get().sequences.filter(s => s.empresaId === empresaId && s.activa);
    const availableTypes = tenantSequences.map(s => s.tipo);
    return [...new Set(availableTypes)]; // Devuelve tipos únicos
  },
  getNextNCF: async (empresaId: number, tipo: NCFType) => {
    let ncfCompleto: string | null = null;
    set(state => {
        const sequences = state.sequences.map(s => {
            if (s.empresaId === empresaId && s.tipo === tipo && s.activa && s.secuenciaActual <= s.secuenciaHasta) {
                if (!ncfCompleto) { // Asegurarse de tomar solo uno
                    const ncfNumber = s.secuenciaActual;
                    ncfCompleto = s.prefijo + pad(ncfNumber, (s.prefijo === 'B02' || s.prefijo === 'B16') ? 10 : 8);
                    return { ...s, secuenciaActual: s.secuenciaActual + 1 };
                }
            }
            return s;
        });
        return { sequences };
    });
    
    // Simular guardado y luego verificar alertas
    await new Promise(resolve => setTimeout(resolve, 100)); 
    get().checkAlerts(empresaId);

    return ncfCompleto;
  },
  checkAlerts: (empresaId) => {
    set(state => ({
        sequences: state.sequences.map(s => {
            if (s.empresaId !== empresaId) return s;
            
            const totalComprobantes = s.secuenciaHasta - s.secuenciaDesde + 1;
            const comprobantesUsados = s.secuenciaActual - s.secuenciaDesde;
            const porcentajeUsado = (comprobantesUsados / totalComprobantes) * 100;
            
            const alertaActiva = porcentajeUsado >= 90;

            return { ...s, alertaActiva };
        })
    }));
  }
}));

// Comprobar alertas al inicio
const initialTenantId = 1; // Simular tenant inicial
useNCFStore.getState().checkAlerts(initialTenantId);
