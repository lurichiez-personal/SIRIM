import { db } from '../firebase';
import { doc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { FiscalAnnualClosure, PeriodoMensual } from '../types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

// Helper to log fiscal events
const logFiscalEvent = async (transaction: any | null, empresaId: string, eventType: string, añoFiscal: number, usuarioId: string, metadata: any = {}, periodo: string | null = null) => {
    try {
        const functions = getFunctions(app, 'us-east1');
        const logEvent = httpsCallable(functions, 'logFiscalEventSecure');
        await logEvent({
            empresaId,
            eventType,
            añoFiscal,
            usuarioId,
            metadata,
            periodo
        });
    } catch (error) {
        console.error("Error logging fiscal event via secure function:", error);
    }
};

// --- 1. Control Mensual ---

export const validarEscrituraFiscal = async (empresaId: string, fechaMovimiento: string, usuarioId: string) => {
    const date = new Date(fechaMovimiento);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const periodoId = `${year}-${String(month).padStart(2, '0')}`;

    // Check Annual Closure
    const annualClosureRef = doc(db, 'fiscalAnnualClosure', `${empresaId}_${year}`);
    const annualClosureSnap = await getDoc(annualClosureRef);

    if (annualClosureSnap.exists()) {
        const closureData = annualClosureSnap.data() as FiscalAnnualClosure;
        if (closureData.estado === 'IR2_PRESENTADO') {
            await logFiscalEvent(null, empresaId, 'INTENTO_MODIFICACION_AÑO_SELLADO', year, usuarioId, { fechaMovimiento });
            throw new Error(`El año fiscal ${year} está sellado (IR-2 Presentado). No se pueden realizar modificaciones.`);
        }
    }

    // Check Monthly Closure
    const monthlyPeriodRef = doc(db, 'periodosMensuales', `${empresaId}_${periodoId}`);
    const monthlyPeriodSnap = await getDoc(monthlyPeriodRef);

    if (monthlyPeriodSnap.exists()) {
        const periodData = monthlyPeriodSnap.data() as PeriodoMensual;
        if (periodData.estado === 'CERRADO') {
            await logFiscalEvent(null, empresaId, 'INTENTO_MODIFICACION_PERIODO_CERRADO', year, usuarioId, { periodoId, fechaMovimiento }, periodoId);
            throw new Error(`El periodo ${periodoId} está cerrado. No se pueden realizar modificaciones.`);
        }
    }
};

// --- 2. Cierre Anual IR-2 ---

export const presentarIR2 = async (empresaId: string, añoFiscal: number, numeroAcuseDGII: string, usuarioId: string, snapshotData: any) => {
    const functions = getFunctions(app, 'us-east1');
    const presentar = httpsCallable(functions, 'presentarDeclaracionFiscal');
    
    await presentar({
        empresaId,
        añoFiscal,
        tipo: 'IR-2',
        numeroAcuseDGII,
        snapshotData,
        usuarioId
    });
};

// --- 5. Rectificativas ---

export const generarRectificativa = async (empresaId: string, añoFiscal: number, numeroAcuseDGII: string, usuarioId: string, newSnapshotData: any) => {
    const functions = getFunctions(app, 'us-east1');
    const presentar = httpsCallable(functions, 'presentarDeclaracionFiscal');
    
    await presentar({
        empresaId,
        añoFiscal,
        tipo: 'IR-2',
        subtipo: 'RECTIFICATIVA',
        numeroAcuseDGII,
        snapshotData: newSnapshotData,
        usuarioId
    });
};

// --- 6. Continuidad Interanual ---

export const recalculoContinuidadInteranual = async (empresaId: string, añoFiscal: number, usuarioId: string) => {
    // This logic is now handled by the backend within 'presentarDeclaracionFiscal'.
    // We keep the function signature for compatibility but it delegates to backend or is a no-op here.
    console.log("Continuidad interanual delegada al backend secure.");
};

