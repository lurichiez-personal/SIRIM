
import { create } from 'zustand';
import { NCFSequence, NCFType } from '../types';

interface NCFState {
  sequences: NCFSequence[];
  fetchSequences: (empresaId: number) => Promise<void>;
  addSequence: (sequence: Omit<NCFSequence, 'id' | 'secuenciaActual' | 'activa' | 'alertaActiva'>) => Promise<void>;
  getSequencesForTenant: (empresaId: number) => NCFSequence[];
  getAvailableTypes: (empresaId: number) => NCFType[];
  getNextNCF: (empresaId: number, tipo: NCFType) => Promise<string | null>;
  checkAlerts: (empresaId: number) => void;
}

// Las secuencias NCF ahora vienen exclusivamente de la base de datos PostgreSQL

const pad = (num: number, size: number) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
}

export const useNCFStore = create<NCFState>((set, get) => ({
  sequences: [], // Las secuencias NCF se cargan dinámicamente desde la BD
  
  fetchSequences: async (empresaId: number) => {
    try {
      const response = await fetch(`/api/ncf/sequences?empresaId=${empresaId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const sequences = await response.json();
        set({ sequences });
      } else {
        console.error('Error obteniendo secuencias NCF:', response.statusText);
      }
    } catch (error) {
      console.error('Error de conexión obteniendo secuencias NCF:', error);
    }
  },

  addSequence: async (sequenceData) => {
    try {
      const response = await fetch('/api/ncf/sequences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(sequenceData)
      });

      if (response.ok) {
        const newSequence = await response.json();
        set(state => ({
          sequences: [...state.sequences, newSequence]
        }));
        get().checkAlerts(sequenceData.empresaId);
      } else {
        console.error('Error creando secuencia NCF:', response.statusText);
        
        // Fallback: crear localmente (temporal)
        const newSequence: NCFSequence = {
          ...sequenceData,
          id: Date.now(),
          secuenciaActual: sequenceData.secuenciaDesde,
          activa: true,
          alertaActiva: false
        };
        set(state => ({
          sequences: [...state.sequences, newSequence]
        }));
        get().checkAlerts(sequenceData.empresaId);
      }
    } catch (error) {
      console.error('Error de conexión creando secuencia NCF:', error);
      
      // Fallback: crear localmente (temporal)
      const newSequence: NCFSequence = {
        ...sequenceData,
        id: Date.now(),
        secuenciaActual: sequenceData.secuenciaDesde,
        activa: true,
        alertaActiva: false
      };
      set(state => ({
        sequences: [...state.sequences, newSequence]
      }));
      get().checkAlerts(sequenceData.empresaId);
    }
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
    try {
      const response = await fetch('/api/ncf/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ empresaId, tipo })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Actualizar la secuencia local incrementando secuenciaActual
        set(state => ({
          sequences: state.sequences.map(s => 
            s.empresaId === empresaId && s.tipo === tipo 
              ? { ...s, secuenciaActual: s.secuenciaActual + 1 }
              : s
          )
        }));
        
        get().checkAlerts(empresaId);
        return result.ncf;
      } else {
        console.error('Error obteniendo siguiente NCF:', response.statusText);
        
        // Fallback: usar lógica local
        let ncfCompleto: string | null = null;
        set(state => {
          const sequences = state.sequences.map(s => {
            if (s.empresaId === empresaId && s.tipo === tipo && s.activa && s.secuenciaActual <= s.secuenciaHasta) {
              if (!ncfCompleto) {
                const ncfNumber = s.secuenciaActual;
                ncfCompleto = s.prefijo + pad(ncfNumber, (s.prefijo === 'B02' || s.prefijo === 'B16') ? 10 : 8);
                return { ...s, secuenciaActual: s.secuenciaActual + 1 };
              }
            }
            return s;
          });
          return { sequences };
        });
        
        get().checkAlerts(empresaId);
        return ncfCompleto;
      }
    } catch (error) {
      console.error('Error de conexión obteniendo siguiente NCF:', error);
      
      // Fallback: usar lógica local
      let ncfCompleto: string | null = null;
      set(state => {
        const sequences = state.sequences.map(s => {
          if (s.empresaId === empresaId && s.tipo === tipo && s.activa && s.secuenciaActual <= s.secuenciaHasta) {
            if (!ncfCompleto) {
              const ncfNumber = s.secuenciaActual;
              ncfCompleto = s.prefijo + pad(ncfNumber, (s.prefijo === 'B02' || s.prefijo === 'B16') ? 10 : 8);
              return { ...s, secuenciaActual: s.secuenciaActual + 1 };
            }
          }
          return s;
        });
        return { sequences };
      });
      
      get().checkAlerts(empresaId);
      return ncfCompleto;
    }
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
