
import { db } from '../firebase.ts';
import { 
    collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, 
    Transaction, doc, getDoc, runTransaction 
} from 'firebase/firestore';

// --- Interfaces ---

export interface ContableEvent {
    id?: string;
    empresaId: string;
    eventIndex: number; // Sequential index for hash chaining
    tipoEvento: string; // 'FACTURA', 'GASTO', 'NOMINA', 'PAGO', 'AJUSTE', 'REVERSO'
    subtipo: string;    // 'VENTA', 'COMPRA', 'NOMINA_MENSUAL', 'PAGO_PROVEEDOR', etc.
    documentoOrigenId: string;
    documentoVersion: number;
    periodoId: string; // YYYY-MM
    fechaContable: string; // YYYY-MM-DD
    timestampSistema?: any; // serverTimestamp
    moneda: "DOP";
    entradas: ContableEntry[];
    totalDebitos: number;
    totalCreditos: number;
    reversaEventoId: string | null;
    eventoRevertido: boolean;
    hashAnterior: string;
    hashActual: string;
    creadoPor: string;
    rolCreador: "OPERATIVO" | "CONTADOR";
}

export interface ContableEntry {
    cuentaId: string;
    descripcion?: string; 
    debito: number;
    credito: number;
}

// --- Helper Functions ---

const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const validateDoubleEntry = (entradas: ContableEntry[]): { valid: boolean; diff: number; totalDebitos: number; totalCreditos: number } => {
    let totalDebitos = 0;
    let totalCreditos = 0;

    if (entradas && Array.isArray(entradas)) {
        entradas.forEach(e => {
            totalDebitos += e.debito;
            totalCreditos += e.credito;
        });
    }

    totalDebitos = round(totalDebitos);
    totalCreditos = round(totalCreditos);
    const diff = round(Math.abs(totalDebitos - totalCreditos));

    return {
        valid: diff === 0,
        diff,
        totalDebitos,
        totalCreditos
    };
};

export const generateEventHash = async (eventData: Omit<ContableEvent, 'id' | 'hashActual' | 'timestampSistema'>, previousHash: string): Promise<string> => {
    // Sort entries by cuentaId to ensure deterministic hashing
    const sortedEntradas = [...eventData.entradas].sort((a, b) => a.cuentaId.localeCompare(b.cuentaId));

    const dataToHash = {
        empresaId: eventData.empresaId,
        eventIndex: eventData.eventIndex,
        periodoId: eventData.periodoId,
        tipoEvento: eventData.tipoEvento,
        documentoOrigenId: eventData.documentoOrigenId,
        documentoVersion: eventData.documentoVersion,
        entradas: sortedEntradas.map(e => ({ c: e.cuentaId, d: e.debito, h: e.credito })), 
        hashAnterior: previousHash
    };

    const str = JSON.stringify(dataToHash);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// --- Core Engine Functions ---

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.ts';

/**
 * Creates a new accounting event within a transaction to ensure hash chain integrity.
 * If an external transaction is provided, it uses it. Otherwise, it starts a new transaction.
 */
export const createContableEvent = async (
    externalTransaction: Transaction | null,
    eventData: Omit<ContableEvent, 'id' | 'hashActual' | 'hashAnterior' | 'timestampSistema' | 'totalDebitos' | 'totalCreditos' | 'eventoRevertido' | 'eventIndex'>
): Promise<string> => {
    
    // 1. Validate Double Entry
    const validation = validateDoubleEntry(eventData.entradas);
    if (!validation.valid) {
        throw new Error(`Asiento desbalanceado. Diferencia: ${validation.diff}`);
    }

    try {
        const functions = getFunctions(app, 'us-east1');
        const createEvento = httpsCallable(functions, 'createEventoContableSecure');
        
        const response = await createEvento({ eventData });
        const data = response.data as any;
        return data.eventId;
    } catch (error) {
        console.error("Error creating contable event via function:", error);
        throw error;
    }
};

/**
 * Creates a reversal event for a specific existing event.
 */
export const createReversalEvent = async (
    transaction: Transaction | null,
    eventIdToReverse: string,
    usuarioId: string,
    rol: "OPERATIVO" | "CONTADOR"
): Promise<string> => {
    
    // 1. Get Original Event
    // We need to read it. If inside transaction, use it.
    const eventRef = doc(db, 'eventosContables', eventIdToReverse);
    
    // Helper to read doc
    const readDoc = async (t: Transaction | null) => {
        if (t) return await t.get(eventRef);
        const snap = await getDoc(eventRef);
        return snap;
    };

    const eventSnap = await readDoc(transaction);

    if (!eventSnap.exists()) {
        throw new Error(`Evento a revertir no encontrado: ${eventIdToReverse}`);
    }

    const originalEvent = eventSnap.data() as ContableEvent;

    // 2. Invert Entries
    const invertedEntradas = originalEvent.entradas.map(e => ({
        ...e,
        debito: e.credito,
        credito: e.debito
    }));

    // 3. Create Reversal Event Data
    const reversalEventData: Omit<ContableEvent, 'id' | 'hashActual' | 'hashAnterior' | 'timestampSistema' | 'totalDebitos' | 'totalCreditos' | 'eventoRevertido' | 'eventIndex'> = {
        empresaId: originalEvent.empresaId,
        tipoEvento: 'REVERSO',
        subtipo: originalEvent.tipoEvento,
        documentoOrigenId: originalEvent.documentoOrigenId,
        documentoVersion: originalEvent.documentoVersion + 1, // Reversal is a new action on the doc timeline
        periodoId: originalEvent.periodoId, // Keep original period for matching? Or current? Usually current for audit. Let's stick to original for now to zero out period.
        fechaContable: new Date().toISOString().split('T')[0],
        moneda: "DOP",
        entradas: invertedEntradas,
        reversaEventoId: eventIdToReverse,
        creadoPor: usuarioId,
        rolCreador: rol
    };

    // 4. Create Event
    return await createContableEvent(transaction, reversalEventData);
};

// --- Ledger Construction ---

export const getLibroMayor = async (empresaId: string, fechaHasta: string) => {
    const q = query(
        collection(db, 'eventosContables'),
        where('empresaId', '==', empresaId),
        where('fechaContable', '<=', fechaHasta),
        orderBy('fechaContable', 'asc'),
        orderBy('eventIndex', 'asc')
    );

    const snapshot = await getDocs(q);
    const ledger: Record<string, { debito: number, credito: number, saldo: number }> = {};

    snapshot.docs.forEach(doc => {
        const event = doc.data() as ContableEvent;
        if (event.entradas && Array.isArray(event.entradas)) {
            event.entradas.forEach(entry => {
                if (!ledger[entry.cuentaId]) {
                    ledger[entry.cuentaId] = { debito: 0, credito: 0, saldo: 0 };
                }
                ledger[entry.cuentaId].debito += entry.debito;
                ledger[entry.cuentaId].credito += entry.credito;
            });
        }
    });

    Object.keys(ledger).forEach(cuentaId => {
        ledger[cuentaId].saldo = round(ledger[cuentaId].debito - ledger[cuentaId].credito);
        ledger[cuentaId].debito = round(ledger[cuentaId].debito);
        ledger[cuentaId].credito = round(ledger[cuentaId].credito);
    });

    return ledger;
};
