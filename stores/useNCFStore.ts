import { create } from 'zustand';
import { NCFSequence, NCFType, isNcfNotaCredito } from '../types.ts';
import { db } from '../firebase.ts';
import { collection, addDoc, onSnapshot, Unsubscribe, query, where, runTransaction, doc, getDocs } from 'firebase/firestore';
import { useTenantStore } from './useTenantStore.ts';
import { useAlertStore } from './useAlertStore.ts';

interface NCFState {
  sequences: NCFSequence[];
  loading: boolean;
  subscribeToSequences: (empresaId: string) => Unsubscribe;
  addSequence: (sequence: Omit<NCFSequence, 'id' | 'empresaId' | 'secuenciaActual' | 'activa' | 'alertaActiva'>) => Promise<void>;
  getNextNCF: (empresaId: string, tipo: NCFType) => Promise<string | null>;
  checkAlerts: (sequences: NCFSequence[]) => NCFSequence[];
}

const pad = (num: number, size: number) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
}

export const useNCFStore = create<NCFState>((set, get) => ({
  sequences: [],
  loading: true,
  
  subscribeToSequences: (empresaId: string) => {
    set({ loading: true });
    const q = query(collection(db, 'ncf_sequences'), where('empresaId', '==', empresaId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let sequences: NCFSequence[] = [];
        snapshot.forEach(doc => {
            sequences.push({ id: doc.id, ...doc.data() } as NCFSequence);
        });
        const sequencesWithAlerts = get().checkAlerts(sequences);
        set({ sequences: sequencesWithAlerts, loading: false });
    },
    (error) => {
        console.error(`Error fetching NCF sequences for company ${empresaId}:`, error);
        useAlertStore.getState().showAlert('Error de Sincronización', 'No se pudieron cargar las secuencias de NCF. Verifique su conexión y permisos.');
        set({ sequences: [], loading: false });
    });
    
    return unsubscribe;
  },
  
  addSequence: async (sequenceData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) {
      console.error("No tenant selected, cannot add NCF sequence");
      return;
    }
    await addDoc(collection(db, 'ncf_sequences'), {
        ...sequenceData,
        empresaId,
        secuenciaActual: sequenceData.secuenciaDesde,
        activa: true,
        alertaActiva: false
    });
  },
  
  getNextNCF: async (empresaId: string, tipo: NCFType) => {
    const today = new Date().toISOString().split('T')[0];
    const isNota = isNcfNotaCredito(tipo);
    
    // 1. Try local state first with conditional validity check
    let sequence = get().sequences.find(s => 
        s.tipo === tipo && 
        s.activa && 
        s.secuenciaActual <= s.secuenciaHasta &&
        (isNota || s.fechaVencimiento >= today) // VALIDACIÓN CONDICIONAL
    );

    // 2. If not found, fetch directly from Firestore
    if (!sequence) {
        try {
            const q = query(
                collection(db, 'ncf_sequences'), 
                where('empresaId', '==', empresaId)
            );
            const snapshot = await getDocs(q);
            const validDoc = snapshot.docs.find(d => {
                const data = d.data() as NCFSequence;
                return data.tipo === tipo && 
                       data.activa && 
                       data.secuenciaActual <= data.secuenciaHasta &&
                       (isNota || data.fechaVencimiento >= today);
            });
            
            if (validDoc) {
                sequence = { id: validDoc.id, ...validDoc.data() } as NCFSequence;
            }
        } catch (error) {
            console.error("Error fetching NCF sequence directly:", error);
        }
    }

    if (!sequence) {
        console.error(`No active or valid NCF sequence found for type ${tipo}`);
        return null;
    }
    
    const seqRef = doc(db, 'ncf_sequences', sequence.id);

    try {
        const ncfCompleto = await runTransaction(db, async (transaction) => {
            const seqDoc = await transaction.get(seqRef);
            if (!seqDoc.exists()) {
                throw "Sequence document does not exist!";
            }
            
            const data = seqDoc.data() as NCFSequence;
            const currentSeqNum = data.secuenciaActual;
            
            if (currentSeqNum > data.secuenciaHasta) {
                console.warn(`NCF sequence ${tipo} is exhausted.`);
                return null;
            }

            if (!isNota && data.fechaVencimiento < today) {
                console.warn(`NCF sequence ${tipo} is expired.`);
                transaction.update(seqRef, { activa: false });
                return null;
            }
            
            transaction.update(seqRef, { secuenciaActual: currentSeqNum + 1 });
            
            let ncfSequenceLength = 8; // Default
            if (data.prefijo.startsWith('B')) {
                ncfSequenceLength = 11 - data.prefijo.length;
            } else if (data.prefijo.startsWith('E')) {
                ncfSequenceLength = 13 - data.prefijo.length;
            }

            return data.prefijo + pad(currentSeqNum, ncfSequenceLength);
        });

        return ncfCompleto;

    } catch (e) {
        console.error("NCF Transaction failed: ", e);
        return null;
    }
  },
  
  checkAlerts: (sequences) => {
    const today = new Date().toISOString().split('T')[0];
    return sequences.map(s => {
        const totalComprobantes = s.secuenciaHasta - s.secuenciaDesde + 1;
        const comprobantesUsados = s.secuenciaActual - s.secuenciaDesde;
        const porcentajeUsado = (comprobantesUsados / totalComprobantes) * 100;
        
        const isNota = isNcfNotaCredito(s.tipo);
        const isExpired = !isNota && s.fechaVencimiento < today;
        const alertaActiva = porcentajeUsado >= 90 || isExpired;
        
        return { ...s, alertaActiva };
    });
  }
}));