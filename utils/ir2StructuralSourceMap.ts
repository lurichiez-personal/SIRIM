import { IR2_FIELD_MAP } from './ir2FieldMap.ts';

const STRUCTURAL_SOURCE_MAP: Record<string, string> = {
    // --- IR-2 ---
    exencionLeyIncentivos: "Deducción. Exenciones por leyes de incentivo (Turismo, Cine, Zona Franca).",
    dividendosGanados: "Deducción. Dividendos recibidos de otras empresas (ya tributaron).",
    deduccionInversion: "Deducción. Inversión en capital permitida por ley.",
    anticiposPagados: "Crédito. Anticipos de ISR pagados durante el año.",
    retencionesEstado: "Crédito. Retenciones sufridas por pagos del Estado u otros.",
    saldoFavorAnterior: "Crédito. Saldo a favor proveniente de la declaración anterior.",
    perdidaAnosAnteriores: "Deducción. Pérdidas fiscales de ejercicios anteriores (hasta 5 años).",
    moraDeclaracionTardia: "Recargo. Mora por presentación tardía (10% + 4%).",
    interesIndemnizatorioTardia: "Interés. Indemnizatorio por retraso en el pago (1.10%).",

    // --- IMPUESTO SOBRE LOS ACTIVOS (ACT) ---
    totalActivosA1: "Fuente Automática: Anexo A-1 (Casilla Total Activos). Base inicial de activos netos.",
    activosExentos: "Deducción. Activos rurales, inmuebles exentos, inversiones en títulos valores, etc.",
    baseImponibleActivos: "Cálculo. Total Activos menos Activos Exentos.",
    impuestoActivosCalculado: "Tasa. 1% aplicado sobre la Base Imponible de Activos.",
    creditoISRLiquidado: "Crédito Automático: IR-2 (Casilla Impuesto Liquidado). El ISR sirve como crédito contra el Impuesto de Activos.",
    impuestoActivosPagar: "Resultado. Si el Impuesto de Activos es mayor que el ISR, se paga la diferencia.",
    pagosCuentaActivos: "Crédito. Pagos a cuenta realizados específicamente para el Impuesto sobre Activos.",
    creditosAutorizadosActivos: "Crédito. Otros créditos autorizados por la DGII aplicables a Activos."
};

export function getFieldStructuralSource(field: string): string | undefined {
    // Check direct map
    if (STRUCTURAL_SOURCE_MAP[field]) {
        return STRUCTURAL_SOURCE_MAP[field];
    }
    // Check via DGII code map if not found directly
    const dgiiCode = IR2_FIELD_MAP[field];
    if (dgiiCode) {
        return `Casilla DGII: ${dgiiCode}. Valor calculado o ingresado manualmente.`;
    }
    return undefined;
}