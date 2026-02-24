
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { useDataStore } from '../../stores/useDataStore.ts';
import { useChartOfAccountsStore } from '../../stores/useChartOfAccountsStore.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { PlusIcon, SparklesIcon, InformationCircleIcon, ShieldCheckIcon, DocumentChartBarIcon, KeyIcon, ArrowPathIcon, TrashIcon } from '../../components/icons/Icons.tsx';
import { formatCurrency } from '../../utils/formatters.ts';
import { calcularMotorFiscal } from '../../services/fiscalEngine.ts';
import { NivelConfianza, FiscalWarning, FacturaEstado, BlockingError, FiscalClosure, EvaluacionActividad, CalculoFiscalSnapshot } from '../../types.ts';
import { useAlertStore } from '../../stores/useAlertStore.ts';
import DetalleOrigenDatosModal from './DetalleOrigenDatosModal.tsx';
import { useConfirmationStore } from '../../stores/useConfirmationStore.ts';
import ToggleSwitch from '../../components/ui/ToggleSwitch.tsx';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase.ts';
import { IR2_FIELD_MAP } from '../../utils/ir2FieldMap.ts';
import { getFieldStructuralSource } from '../../utils/ir2StructuralSourceMap.ts';

// --- TIPOS D1 ---
interface ActivoDetalle {
    id: string;
    fecha: string;
    valor: number;
    baseDepreciable: number;
    proporcionNoDepreciada: number;
    depreciacion: number;
    costoFinal: number;
}

interface AnexoD1Data {
    balanceInicial: number;
    ajusteFiscal: number;
    retirosAjuste: number;
    adquisiciones: ActivoDetalle[];
    mejoras: ActivoDetalle[];
    retiros: ActivoDetalle[];
}

// --- TIPOS D2 ---
interface AnexoD2Data {
    // 1. Activos
    totalActivosLibros: number;
    provisionesReservas: number;
    impuestoDiferidoActivo: number;
    cuentasPorCobrarNoGiro: number;
    costoTerrenosLibros: number;
    costoAccionesLibros: number;
    costoEdificioLibros: number;
    costoConstrProcesoLibros: number;
    costoActivoConstrLibros: number;
    costoCat2Libros: number;
    costoCat3Libros: number;
    costoCat2ArrendLibros: number;
    costoCat3ArrendLibros: number;
    otrosActivosLibros: number;
    
    // Fiscales (Adiciones)
    costoFiscalCat1: number;
    costoFiscalCat2: number;
    costoFiscalActivoConstr: number;
    costoFiscalCat3: number;
    costoFiscalCat2Arrend: number;
    costoFiscalCat3Arrend: number;
    costoFiscalTerrenos: number;
    costoFiscalAcciones: number;
    reevaluacionActivos: number;
    mejorasPropArrendadas: number;
    costoFiscalOtrosActivos: number;

    // 2. Pasivos
    totalPasivosLibros: number;
    impuestoDiferidoPasivo: number;
    provisionesReservasPasivo: number;
    otrosPasivos: number;

    // 3. Ajuste
    multiplicadorAjuste: number;
    
    // 4. Activos No Monetarios
    inventario: number;
}

// --- TIPOS ANEXO D ---
interface SeccionDepreciacion {
    cat2: { balanceInicial: number; ajusteFiscal: number; totalAdiciones: number; retiros: number };
    cat3: { balanceInicial: number; ajusteFiscal: number; totalAdiciones: number; retiros: number };
}

interface AnexoDData {
    // I. Empresa
    numFuncionarios: number;
    sueldoPromedioFuncionarios: number;
    numEmpleados: number;
    sueldoPromedioEmpleados: number;
    
    // II. Local
    superficieTotal: number;
    localesPropios: number;
    establecimientos: number;
    alquilerAnual: number;

    // III. Depreciación
    usoPropio: SeccionDepreciacion;
    arrendamiento: SeccionDepreciacion;
    ley392: SeccionDepreciacion;

    tipoInventario: '1' | '2' | '3';

    // IV. Costo Venta (Comercio)
    cv_inventarioInicial: number;
    cv_comprasLocales: number;
    cv_comprasExterior: number;
    cv_itbisCosto: number;
    cv_inventarioFinal: number;

    // V. Costo Venta (Manufactura) - Desglose completo
    cm_invInicialMateriaPrima: number;
    cm_invInicialProdProceso: number;
    cm_comprasMateriaPrimaLocal: number;
    cm_comprasMateriaPrimaExterior: number;
    cm_sueldosSalarios: number;
    cm_depreciacion: number;
    cm_otrosGastos: number;
    cm_invFinalMateriaPrima: number;
    cm_invFinalProdProceso: number;
    // Produccion terminada
    cm_invInicialProdTerminados: number;
    cm_invFinalProdTerminados: number;
}

// --- TIPOS ANEXO A-1 ---
interface AnexoA1Data {
    // 1. ACTIVOS CORRIENTES
    cajaBancos: number;
    cxcClientes: number;
    cxcRelacionados: number;
    otrasCxC: number;
    invMercancias: number;
    invMateriaPrima: number;
    invProductosProceso: number;
    otrosInventarios: number;
    mercanciasTransito: number;
    gastosPagadosAdelantado: number;
    otrosActivosCorrientes: number;
    dividendosEntregados: number;

    // 2. ACTIVOS FIJOS
    edificacionesCat1: number;
    edificacionesAgro: number;
    automovilesEquiposCat2: number;
    otrosActivosCat3: number;
    activosNoDeprecUrbano: number;
    activosNoDeprecRural: number;
    revaluacionActivos: number;

    // 3. INVERSIONES
    depositos: number;
    acciones: number;
    otrasInversiones: number;

    // 4. OTROS ACTIVOS
    otrosActivosNoAmortizables: number;
    isrDiferidoAnticipado: number;
    otrosActivosAmortizables: number;

    // 5. PROVISIONES (Se restan del activo total)
    deprecAcumCat1: number;
    deprecAcumAgro: number;
    deprecAcumCat2: number;
    deprecAcumCat3: number;
    provCuentasIncobrables: number;
    provInventario: number;
    otrasProvisiones: number;

    // 7. ACREEDORES CORTO PLAZO
    prestamosCorto: number;
    cxp: number;
    impuestosPorPagar: number;
    otrasCxp: number;
    cobrosAnticipados: number;
    aportesFuturaCap: number;

    // 8. ACREEDORES LARGO PLAZO
    prestamosHipotecarios: number;
    prestamosLocales: number;
    prestamosExterior: number;
    prestamosRelacionadosLocales: number;
    prestamosRelacionadosExterior: number;
    prestamosRegimenesEspeciales: number;
    prestamosOrgIntl: number;
    prestamosAccionistas: number;

    // 9. OTROS PASIVOS
    otrosPasivos: number;

    // 10. PATRIMONIO
    capitalSuscritoPagado: number;
    reservaLegal: number;
    superavitRevaluacion: number;
    beneficiosEjerciciosAnteriores: number;
    beneficioEjercicioActual: number;
    otrasReservas: number;
}

// --- TIPOS ANEXO B-1 ---
interface AnexoB1Data {
    // 1. Ingresos Operaciones
    ingVentasLocales: number;
    ingExportaciones: number;
    devolucionesVenta: number; // (-)
    descuentoVenta: number; // (-)
    otrosIngresos: number;

    // 2. Ingresos Financieros
    intFinancierosRegulados: number;
    intFinancierosNoRegulados: number;
    porDividendos: number;
    intPrestamosRelacionadas: number;
    intPrestamosNoRelacionadas: number;
    otrosIngresosFinancieros: number;

    // 3. Ingresos Extraordinarios
    ventasActivosDepreciables: number;
    ventasBienesCapital: number;
    diferenciasCambiariasPositivas: number;
    ingresosOtrosEjercicios: number;
    otrosIngresosExtraordinarios: number;

    // 5. Costo Venta
    costoVenta: number;

    // 6. Gastos Personal
    sueldosSalarios: number;
    retribucionesComplementarias: number;
    seguros: number;
    aportacionSeguridadSocial: number;
    aporteInfotep: number;
    otrosGastosPersonal: number;
    itbisPagadoProporcionalidadPersonal: number;

    // 7. Gastos Trabajos, Suministros
    honorariosFisicas: number;
    honorariosMorales: number;
    honorariosExterior392: number;
    honorariosExteriorFisicasMorales: number;
    seguridadMensajeriaFisicas: number;
    seguridadMensajeriaMorales: number;
    otrosGastosTrabajos: number;
    itbisPagadoProporcionalidadTrabajos: number;

    // 8. Arrendamientos
    arrendamientoFisicas: number;
    arrendamientoMorales: number;
    otrosArrendamientos: number;
    itbisPagadoProporcionalidadArrend: number;

    // 9. Gastos Activos Fijos
    deprecCat1: number;
    deprecCat2: number;
    deprecCat3: number;
    reparacionesCat1: number;
    reparacionesCat2y3: number;
    mantenimientoActivos: number;
    amortizacionIntangibles: number;
    amortizacionMejoras: number;
    itbisPagadoProporcionalidadActivos: number;

    // 10. Gastos Representación
    relacionesPublicas: number;
    publicidad: number;
    viajes: number;
    donaciones: number;
    donacionesProindustria: number;
    otrosGastosRepresentacion: number;
    promociones: number;
    itbisPagadoProporcionalidadRep: number;

    // 11. Otras Deducciones
    primasSeguros: number;
    cuotasContribuciones: number;
    destruccionInventario: number;

    // 12. Gastos Financieros
    finInstLocales: number;
    finEntExterior: number;
    finRelacionadasLocales: number;
    finRelacionadasExterior: number;
    finPersonasFisicas: number;
    finFisicasRelacionadasLocales: number;
    finFisicasRelacionadasExterior: number;
    retencionChequesTransferencias: number;
    finRegimenesEspeciales: number;
    otrosGastosFinancieros: number;

    // 13. Gastos Extraordinarios
    perdidaVentaActivos: number;
    perdidaVentaCapital: number;
    perdidaCuentasIncobrables: number;
    provisionCuentasIncobrables: number;
    diferenciasCambiariasNegativas: number;
    otrosGastosExtraordinarios: number;
    provisionInventario: number;
    otrasProvisiones: number;
}

// --- TIPOS ANEXO E ---
interface PerdidaArrastrable {
    id: string;
    year: string; // Col A
    perdidaInicial: number; // Col B
    indiceInflacion: number; // Col C (%)
    periodosPorCompensar: number; // Col F
    porcentajeRenta: number; // Col I (Default 20%)
}

interface AnexoEData {
    // A. PERDIDAS
    perdidas: PerdidaArrastrable[];
    
    // B. DISTRIBUCION BENEFICIOS
    dividendos: number; // 7
    reservas: number; // 8
    utilidadesNoDistribuidas: number; // 9

    // C. PERDIDAS DE CAPITAL
    perdidaCapitalAnterior: number; // 11
    gananciaCapitalCompensar: number; // 12
    perdidaCapitalEjercicio: number; // 13

    // D. INGRESOS BRUTOS ANTICIPOS
    // 15 = Total Ingresos (Auto from B1)
    gananciaCapitalLibros: number; // 16 (-)
    gananciaBienesDepreciablesLibros: number; // 17 (-)
    dividendosExentos: number; // 18 (-)
    interesesExentos: number; // 19 (-)
    costoVentaComisiones: number; // 21 (-)
}

// --- TIPOS ANEXO G ---
interface DistribucionAjuste {
    pos: number;
    neg: number;
}

interface AnexoGData {
    // 1. Positivos
    impuestosNoDeducibles: number; // 1.1
    excesoDepreciacion: number; // 1.2
    ajustesFiscalizacion: number; // 1.3
    excesoProvisionIncobrables: number; // 1.4
    excesoDonaciones: number; // 1.5
    perdidaCapitalNoCompensable: number; // 1.6
    diferenciaCambiariaPositiva: number; // 1.7
    ajustesReembolsos: number; // 1.8
    ajustesPreciosTransferencia: number; // 1.9
    gastosInteresesNoDeducibles: number; // 1.10
    otrosGastosNoAdmitidos: number; // 1.11
    ajustesInventariosPositivos: number; // 1.12
    gastosSinComprobantes: number; // 1.13
    isrDiferido: number; // 1.14
    provisionesNoAdmitidas: number; // 1.15
    pasivoNoSustentado: number; // 1.16
    otrosAjustesPositivos: number; // 1.17

    // 2. Negativos
    deficienciaDepreciacion: number; // 2.1
    // 2.2 Viene de D2 (Calculado)
    diferenciaCambiariaNegativa: number; // 2.3
    otrosAjustesNegativos: number; // 2.4

    // II. Distribucion (3.1 - 3.13)
    distribucion: {
        ingresosOperaciones: DistribucionAjuste;
        ingresosFinancieros: DistribucionAjuste;
        ingresosExtraordinarios: DistribucionAjuste;
        otrosIngresos: DistribucionAjuste;
        costoVenta: DistribucionAjuste;
        gastosPersonal: DistribucionAjuste;
        gastosTrabajos: DistribucionAjuste;
        arrendamientos: DistribucionAjuste;
        gastosActivosFijos: DistribucionAjuste;
        gastosRepresentacion: DistribucionAjuste;
        gastosFinancieros: DistribucionAjuste;
        gastosExtraordinarios: DistribucionAjuste;
        otrosGastos: DistribucionAjuste;
    }
}

// --- TIPOS ANEXO H-1 ---
interface ContactoSociedad {
    telefono1: string;
    telefono2: string;
    correoElectronico: string;
    calle: string;
    numero: string;
    edificioApto: string;
    sector: string;
    municipio: string;
    provincia: string;
    referencia: string;
}

interface Accionista {
    id: string;
    identificacion: string; // CEDULA/ PASAPORTE/ IDENTIFICACION TRIBUTARIA
    nombreRazonSocial: string;
    domicilioFiscal: string;
    participacionAccionaria: number; // %
    cargoConsejo: string;
}

interface BeneficiarioFinal {
    id: string;
    identificacion: string;
    nombre: string;
    nacionalidad: string;
    domicilioFiscal: string;
    telefono: string;
    participacionAccionaria: number; // % (Form says $)
}

interface AnexoH1Data {
    datosContacto: ContactoSociedad;
    accionistas: Accionista[];
    beneficiariosFinales: BeneficiarioFinal[];
}

// --- TIPOS ANEXO H-2 ---
interface AnexoH2Data {
    sinCambios: boolean;
    actividadEconomica: string;
    telefono: string;
    direccion: string;
    representante: string;
}

// --- TIPOS ANEXO J ---
interface ResumenNCF {
    cantidad: number;
    monto: number;
}

interface AnexoJData {
    // 1. Ventas (607)
    creditoFiscal: ResumenNCF; // 1.1
    consumidorFinal: ResumenNCF; // 1.2
    notaDebito: ResumenNCF; // 1.3
    notaCredito: ResumenNCF; // 1.4
    registroUnico: ResumenNCF; // 1.5
    regimenesEspeciales: ResumenNCF; // 1.6
    gubernamentales: ResumenNCF; // 1.7
    otrasOperaciones: ResumenNCF; // 1.8
    
    // 2. Compras (606)
    cp_creditoFiscal: ResumenNCF; // 2.1
    cp_notaDebito: ResumenNCF; // 2.2
    cp_notaCredito: ResumenNCF; // 2.3
    cp_gubernamentales: ResumenNCF; // 2.4
    cp_regimenesEspeciales: ResumenNCF; // 2.5
    cp_informales: ResumenNCF; // 2.7
    cp_gastosMenores: ResumenNCF; // 2.8
}

// --- TIPOS IR-2 ---
interface IR2Data {
    exencionLeyIncentivos: number; // 3
    dividendosGanados: number; // 4
    deduccionInversion: number; // 10
    anticiposPagados: number; // 13
    retencionesEstado: number; // 14
    creditoInversion: number; // 15
    creditoEnergiaRenovable: number; // 16
    creditoRetencionesInteres: number; // 17
    creditoRetencionesGananciaCapital: number; // 18
    creditoImpuestosExterior: number; // 19
    creditoFiscalLey253_12: number; // 20
    compensacionesAutorizadas: number; // 21
    saldoFavorAnterior: number; // 22
    moraDeclaracionTardia: number; // 25 (amount)
    moraAnticipos: number; // 26
    sanciones: number; // 28
    interesIndemnizatorioTardia: number; // 29
    interesIndemnizatorioAnticipos: number; // 30
    saldoCompensarActivo: number; // 32
    perdidaAnosAnteriores: number; // 8 (Manual editable)
}

// --- TIPOS IMPUESTO ACTIVOS (Nuevo Anexo) ---
interface ActivosData {
    activosExentos: number;
    pagosCuentaActivos: number;
    creditosAutorizadosActivos: number;
}

const DeclaracionIR2Page: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { facturas, notas, gastos, asientosContables, activosFijos, saveFiscalSnapshot, isLoading: isDataLoading, sincronizarAsientosFaltantes, getFiscalStatus, lockFiscalYear, unlockFiscalYear, getLastLockedSnapshot } = useDataStore();
    const { cuentas } = useChartOfAccountsStore();
    const { showAlert } = useAlertStore();
    const { showConfirmation } = useConfirmationStore();
    
    // Control de Pasos
    const [currentStep, setCurrentStep] = useState<'D2' | 'D1' | 'D' | 'A1' | 'B1' | 'E' | 'G' | 'H1' | 'H2' | 'J' | 'IR2' | 'ACTIVOS'>('D2');
    const [periodoFiscal, setPeriodoFiscal] = useState(new Date().getFullYear() - 1);
    const [isLoadingAccounting, setIsLoadingAccounting] = useState(false);
    const [isFiscalEngineLoading, setIsFiscalEngineLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [confidenceLevel, setConfidenceLevel] = useState<NivelConfianza | null>(null);
    const [fiscalWarnings, setFiscalWarnings] = useState<FiscalWarning[]>([]);
    const [blockingErrors, setBlockingErrors] = useState<BlockingError[]>([]);
    const [evaluacionActividad, setEvaluacionActividad] = useState<EvaluacionActividad | null>(null);
    
    // Estado de Cierre Fiscal
    const [fiscalStatus, setFiscalStatus] = useState<FiscalClosure | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [calculatedAssetsForLock, setCalculatedAssetsForLock] = useState<any[]>([]);
    const [prevSnapshot, setPrevSnapshot] = useState<CalculoFiscalSnapshot | null>(null);

    // Auditoría
    const [auditData, setAuditData] = useState<any>({});
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

    // --- ESTADO D1 ---
    const [d1Data, setD1Data] = useState<AnexoD1Data>({
        balanceInicial: 0, ajusteFiscal: 0, retirosAjuste: 0, adquisiciones: [], mejoras: [], retiros: [],
    });

    // --- ESTADO D2 ---
    const [d2Data, setD2Data] = useState<AnexoD2Data>({
        totalActivosLibros: 0, provisionesReservas: 0, impuestoDiferidoActivo: 0, cuentasPorCobrarNoGiro: 0,
        costoTerrenosLibros: 0, costoAccionesLibros: 0, costoEdificioLibros: 0, costoConstrProcesoLibros: 0,
        costoActivoConstrLibros: 0, costoCat2Libros: 0, costoCat3Libros: 0, costoCat2ArrendLibros: 0,
        costoCat3ArrendLibros: 0, otrosActivosLibros: 0,
        costoFiscalCat1: 0, costoFiscalCat2: 0, costoFiscalActivoConstr: 0, costoFiscalCat3: 0,
        costoFiscalCat2Arrend: 0, costoFiscalCat3Arrend: 0, costoFiscalTerrenos: 0, costoFiscalAcciones: 0,
        reevaluacionActivos: 0, mejorasPropArrendadas: 0, costoFiscalOtrosActivos: 0,
        totalPasivosLibros: 0, impuestoDiferidoPasivo: 0, provisionesReservasPasivo: 0, otrosPasivos: 0,
        multiplicadorAjuste: 28.74, inventario: 0,
    });

    // --- ESTADO D ---
    const initialSeccionDep = { cat2: { balanceInicial: 0, ajusteFiscal: 0, totalAdiciones: 0, retiros: 0 }, cat3: { balanceInicial: 0, ajusteFiscal: 0, totalAdiciones: 0, retiros: 0 } };
    const [dData, setDData] = useState<AnexoDData>({
        numFuncionarios: 0, sueldoPromedioFuncionarios: 0, numEmpleados: 0, sueldoPromedioEmpleados: 0,
        superficieTotal: 0, localesPropios: 0, establecimientos: 0, alquilerAnual: 0,
        usoPropio: JSON.parse(JSON.stringify(initialSeccionDep)),
        arrendamiento: JSON.parse(JSON.stringify(initialSeccionDep)),
        ley392: JSON.parse(JSON.stringify(initialSeccionDep)),
        tipoInventario: '1',
        cv_inventarioInicial: 0, cv_comprasLocales: 0, cv_comprasExterior: 0, cv_itbisCosto: 0, cv_inventarioFinal: 0,
        cm_invInicialMateriaPrima: 0, cm_invInicialProdProceso: 0, cm_comprasMateriaPrimaLocal: 0, cm_comprasMateriaPrimaExterior: 0, cm_sueldosSalarios: 0, cm_depreciacion: 0, cm_otrosGastos: 0, cm_invFinalMateriaPrima: 0, cm_invFinalProdProceso: 0, cm_invInicialProdTerminados: 0, cm_invFinalProdTerminados: 0,
    });

    // --- ESTADO A-1 ---
    const [a1Data, setA1Data] = useState<AnexoA1Data>({
        cajaBancos: 0, cxcClientes: 0, cxcRelacionados: 0, otrasCxC: 0, invMercancias: 0, invMateriaPrima: 0, invProductosProceso: 0, otrosInventarios: 0, mercanciasTransito: 0, gastosPagadosAdelantado: 0, otrosActivosCorrientes: 0, dividendosEntregados: 0,
        edificacionesCat1: 0, edificacionesAgro: 0, automovilesEquiposCat2: 0, otrosActivosCat3: 0, activosNoDeprecUrbano: 0, activosNoDeprecRural: 0, revaluacionActivos: 0,
        depositos: 0, acciones: 0, otrasInversiones: 0,
        otrosActivosNoAmortizables: 0, isrDiferidoAnticipado: 0, otrosActivosAmortizables: 0,
        deprecAcumCat1: 0, deprecAcumAgro: 0, deprecAcumCat2: 0, deprecAcumCat3: 0, provCuentasIncobrables: 0, provInventario: 0, otrasProvisiones: 0,
        prestamosCorto: 0, cxp: 0, impuestosPorPagar: 0, otrasCxp: 0, cobrosAnticipados: 0, aportesFuturaCap: 0,
        prestamosHipotecarios: 0, prestamosLocales: 0, prestamosExterior: 0, prestamosRelacionadosLocales: 0, prestamosRelacionadosExterior: 0, prestamosRegimenesEspeciales: 0, prestamosOrgIntl: 0, prestamosAccionistas: 0,
        otrosPasivos: 0,
        capitalSuscritoPagado: 0, reservaLegal: 0, superavitRevaluacion: 0, beneficiosEjerciciosAnteriores: 0, beneficioEjercicioActual: 0, otrasReservas: 0
    });

    // --- ESTADO B-1 ---
    const [b1Data, setB1Data] = useState<AnexoB1Data>({
        ingVentasLocales: 0, ingExportaciones: 0, devolucionesVenta: 0, descuentoVenta: 0, otrosIngresos: 0,
        intFinancierosRegulados: 0, intFinancierosNoRegulados: 0, porDividendos: 0, intPrestamosRelacionadas: 0, intPrestamosNoRelacionadas: 0, otrosIngresosFinancieros: 0,
        ventasActivosDepreciables: 0, ventasBienesCapital: 0, diferenciasCambiariasPositivas: 0, ingresosOtrosEjercicios: 0, otrosIngresosExtraordinarios: 0,
        costoVenta: 0,
        sueldosSalarios: 0, retribucionesComplementarias: 0, seguros: 0, aportacionSeguridadSocial: 0, aporteInfotep: 0, otrosGastosPersonal: 0, itbisPagadoProporcionalidadPersonal: 0,
        honorariosFisicas: 0, honorariosMorales: 0, honorariosExterior392: 0, honorariosExteriorFisicasMorales: 0, seguridadMensajeriaFisicas: 0, seguridadMensajeriaMorales: 0, otrosGastosTrabajos: 0, itbisPagadoProporcionalidadTrabajos: 0,
        arrendamientoFisicas: 0, arrendamientoMorales: 0, otrosArrendamientos: 0, itbisPagadoProporcionalidadArrend: 0,
        deprecCat1: 0, deprecCat2: 0, deprecCat3: 0, reparacionesCat1: 0, reparacionesCat2y3: 0, mantenimientoActivos: 0, amortizacionIntangibles: 0, amortizacionMejoras: 0, itbisPagadoProporcionalidadActivos: 0,
        relacionesPublicas: 0, publicidad: 0, viajes: 0, donaciones: 0, donacionesProindustria: 0, otrosGastosRepresentacion: 0, promociones: 0, itbisPagadoProporcionalidadRep: 0,
        primasSeguros: 0, cuotasContribuciones: 0, destruccionInventario: 0,
        finInstLocales: 0, finEntExterior: 0, finRelacionadasLocales: 0, finRelacionadasExterior: 0, finPersonasFisicas: 0, finFisicasRelacionadasLocales: 0, finFisicasRelacionadasExterior: 0, retencionChequesTransferencias: 0, finRegimenesEspeciales: 0, otrosGastosFinancieros: 0,
        perdidaVentaActivos: 0, perdidaVentaCapital: 0, perdidaCuentasIncobrables: 0, provisionCuentasIncobrables: 0, diferenciasCambiariasNegativas: 0, otrosGastosExtraordinarios: 0, provisionInventario: 0, otrasProvisiones: 0
    });

    // --- ESTADO ANEXO E ---
    const [eData, setEData] = useState<AnexoEData>({
        perdidas: Array.from({ length: 5 }, (_, i) => ({ id: `p-${i}`, year: '', perdidaInicial: 0, indiceInflacion: 0, periodosPorCompensar: 5, porcentajeRenta: 20 })),
        dividendos: 0,
        reservas: 0,
        utilidadesNoDistribuidas: 0,
        perdidaCapitalAnterior: 0,
        gananciaCapitalCompensar: 0,
        perdidaCapitalEjercicio: 0,
        gananciaCapitalLibros: 0,
        gananciaBienesDepreciablesLibros: 0,
        dividendosExentos: 0,
        interesesExentos: 0,
        costoVentaComisiones: 0
    });

    // --- ESTADO ANEXO G ---
    const [gData, setGData] = useState<AnexoGData>({
        impuestosNoDeducibles: 0, excesoDepreciacion: 0, ajustesFiscalizacion: 0, excesoProvisionIncobrables: 0, excesoDonaciones: 0,
        perdidaCapitalNoCompensable: 0, diferenciaCambiariaPositiva: 0, ajustesReembolsos: 0, ajustesPreciosTransferencia: 0, gastosInteresesNoDeducibles: 0,
        otrosGastosNoAdmitidos: 0, ajustesInventariosPositivos: 0, gastosSinComprobantes: 0, isrDiferido: 0, provisionesNoAdmitidas: 0,
        pasivoNoSustentado: 0, otrosAjustesPositivos: 0,
        deficienciaDepreciacion: 0, diferenciaCambiariaNegativa: 0, otrosAjustesNegativos: 0,
        distribucion: {
            ingresosOperaciones: { pos: 0, neg: 0 }, ingresosFinancieros: { pos: 0, neg: 0 }, ingresosExtraordinarios: { pos: 0, neg: 0 },
            otrosIngresos: { pos: 0, neg: 0 }, costoVenta: { pos: 0, neg: 0 }, gastosPersonal: { pos: 0, neg: 0 }, gastosTrabajos: { pos: 0, neg: 0 },
            arrendamientos: { pos: 0, neg: 0 }, gastosActivosFijos: { pos: 0, neg: 0 }, gastosRepresentacion: { pos: 0, neg: 0 },
            gastosFinancieros: { pos: 0, neg: 0 }, gastosExtraordinarios: { pos: 0, neg: 0 }, otrosGastos: { pos: 0, neg: 0 }
        }
    });

    // --- ESTADO ANEXO H-1 ---
    const [h1Data, setH1Data] = useState<AnexoH1Data>({
        datosContacto: { telefono1: '', telefono2: '', correoElectronico: '', calle: '', numero: '', edificioApto: '', sector: '', municipio: '', provincia: '', referencia: '' },
        accionistas: [],
        beneficiariosFinales: []
    });

    // --- ESTADO ANEXO H-2 ---
    const [h2Data, setH2Data] = useState<AnexoH2Data>({
        sinCambios: false,
        actividadEconomica: '',
        telefono: '',
        direccion: '',
        representante: ''
    });

    // --- ESTADO ANEXO J ---
    // (J calculado automáticamente)

    // --- ESTADO IR-2 ---
    const [ir2Data, setIr2Data] = useState<IR2Data>({
        exencionLeyIncentivos: 0,
        dividendosGanados: 0,
        deduccionInversion: 0,
        anticiposPagados: 0,
        retencionesEstado: 0,
        creditoInversion: 0,
        creditoEnergiaRenovable: 0,
        creditoRetencionesInteres: 0,
        creditoRetencionesGananciaCapital: 0,
        creditoImpuestosExterior: 0,
        creditoFiscalLey253_12: 0,
        compensacionesAutorizadas: 0,
        saldoFavorAnterior: 0,
        moraDeclaracionTardia: 0,
        moraAnticipos: 0,
        sanciones: 0,
        interesIndemnizatorioTardia: 0,
        interesIndemnizatorioAnticipos: 0,
        saldoCompensarActivo: 0,
        perdidaAnosAnteriores: 0,
    });
    
    // --- ESTADO IMPUESTO ACTIVOS ---
    const [activosData, setActivosData] = useState<ActivosData>({
        activosExentos: 0,
        pagosCuentaActivos: 0,
        creditosAutorizadosActivos: 0
    });

    // Helper para Tooltips de Auditoría (Legacy for Audit Modal, kept for compatibility if needed elsewhere, replaced by structural tooltip in main view)
    const getAuditTooltip = (fieldKey: string): string | undefined => {
        const dgiiCode = IR2_FIELD_MAP[fieldKey];
        if (!dgiiCode || !auditData[dgiiCode]) return undefined;

        const audit = auditData[dgiiCode];
        const breakdown = audit.accounts.map((acc: any) => `• ${acc.code} ${acc.name}: ${formatCurrency(acc.amount)}`).join('\n');
        
        return `Casilla DGII: ${dgiiCode}\nTotal: ${formatCurrency(audit.total)}\n\nDesglose:\n${breakdown}`;
    };

    // --- DETECCIÓN DE DATOS FALTANTES ---
    const hasMissingAccountingEntries = useMemo(() => {
        // Verificar si hay facturas en el año pero 0 ingresos en el reporte
        const yearStr = periodoFiscal.toString();
        const hasFacturas = facturas.some(f => f.fecha.startsWith(yearStr) && f.estado !== FacturaEstado.Anulada);
        const hasZeroIncome = b1Data.ingVentasLocales === 0 && b1Data.ingExportaciones === 0;
        
        return hasFacturas && hasZeroIncome;
    }, [facturas, b1Data, periodoFiscal]);

    // Check Fiscal Status and Continuity
    useEffect(() => {
        if (selectedTenant && periodoFiscal) {
            setIsLoadingStatus(true);
            getFiscalStatus(periodoFiscal).then(status => {
                setFiscalStatus(status);
                setIsLoadingStatus(false);
            });

            // Continuity Logic: Fetch previous year's Data
            const loadContinuityData = async () => {
                const prevYear = periodoFiscal - 1;
                const snapshot = await getLastLockedSnapshot(prevYear);
                
                if (snapshot) {
                    setPrevSnapshot(snapshot);
                    
                    // --- HYDRATION D2 (GAP 2) ---
                    // Note: DGII D2 works mostly on current period changes, but if we track cumulative inflation adjustment
                    // we would inject it here. For strict compliance, we ensure the 'Patrimonio Fiscal' starts aligned.
                    // This logic implies D2 calculations might need to account for previous year's final equity if not derived from A1.
                    
                    // --- HYDRATION ANNEX E (GAP 3) ---
                    if (snapshot.continuityData?.anexoE?.perdidasPendientes) {
                        const importedLosses = snapshot.continuityData.anexoE.perdidasPendientes.map((p: any, index: number) => ({
                            id: `p-imp-${index}`,
                            year: p.year,
                            perdidaInicial: p.perdidaPendiente, // Carry forward remaining amount
                            indiceInflacion: 0, // Reset for new period calculation
                            periodosPorCompensar: p.periodosPorCompensar - 1, // Decrement remaining years
                            porcentajeRenta: 20
                        })).filter((p: any) => p.periodosPorCompensar > 0);
                        
                        // Fill remaining slots
                        const filledLosses = [
                            ...importedLosses,
                            ...Array.from({ length: 5 - importedLosses.length }, (_, i) => ({ id: `p-new-${i}`, year: '', perdidaInicial: 0, indiceInflacion: 0, periodosPorCompensar: 5, porcentajeRenta: 20 }))
                        ].slice(0, 5);

                        setEData(prev => ({ ...prev, perdidas: filledLosses }));
                    }
                } else {
                     setPrevSnapshot(null);
                     // Optional: Warn user that no previous fiscal data was found for continuity
                }
            };
            loadContinuityData();
        }
    }, [selectedTenant, periodoFiscal, getFiscalStatus, getLastLockedSnapshot]);

    // --- CARGA AUTOMATICA DE CONTABILIDAD ---
    const handleCargarContabilidad = useCallback(() => {
        if (fiscalStatus?.status === 'LOCKED') return; // Cannot reload if locked

        setIsLoadingAccounting(true);
        setTimeout(() => {
            // Filtrar asientos del periodo fiscal
            const start = `${periodoFiscal}-01-01`;
            const end = `${periodoFiscal}-12-31`;
            const asientosDelPeriodo = asientosContables.filter(a => a.fecha >= start && a.fecha <= end);
            const asientosBalanceGeneral = asientosContables.filter(a => a.fecha <= end); // Balance es acumulativo

            // Agrupar saldos por CategoriaDGII
            const saldosA1: Record<string, number> = {};
            const saldosB1: Record<string, number> = {};
            
            // Auditoría
            const newAuditData: any = {};
            const addAuditEntry = (category: string, description: string, accountCode: string, accountName: string, amount: number, source?: string) => {
                if (!newAuditData[category]) {
                    newAuditData[category] = { description, total: 0, accounts: [] };
                }
                newAuditData[category].total += amount;
                newAuditData[category].accounts.push({ code: accountCode, name: accountName, amount, source });
            };

            // 1. Calcular saldos para Balance General (A1)
            asientosBalanceGeneral.forEach(asiento => {
                asiento.entradas.forEach(entrada => {
                    const cuenta = cuentas.find(c => c.id === entrada.cuentaId);
                    if (cuenta && cuenta.categoriaDGII && cuenta.categoriaDGII.startsWith('A1')) {
                        const categoria = cuenta.categoriaDGII;
                        // Para activos: Debito suma, Credito resta
                        // Para pasivos/capital: Credito suma, Debito resta
                        let movimiento = 0;
                        if (cuenta.tipo === 'Activo') {
                            movimiento = entrada.debito - entrada.credito;
                        } else {
                            movimiento = entrada.credito - entrada.debito;
                        }
                        if (movimiento !== 0) {
                            saldosA1[categoria] = (saldosA1[categoria] || 0) + movimiento;
                            addAuditEntry(categoria, `Saldo cuenta ${cuenta.nombre}`, cuenta.id, cuenta.nombre, movimiento);
                        }
                    }
                });
            });

            // 2. Calcular saldos para Estado de Resultados (B1)
            asientosDelPeriodo.forEach(asiento => {
                asiento.entradas.forEach(entrada => {
                    const cuenta = cuentas.find(c => c.id === entrada.cuentaId);
                    if (cuenta && cuenta.categoriaDGII && cuenta.categoriaDGII.startsWith('B1')) {
                         const categoria = cuenta.categoriaDGII;
                         // Para ingresos: Credito suma
                         // Para gastos/costos: Debito suma
                         let movimiento = 0;
                         if (cuenta.tipo === 'Ingreso') {
                             movimiento = entrada.credito - entrada.debito;
                         } else {
                             movimiento = entrada.debito - entrada.credito;
                         }
                         if (movimiento !== 0) {
                             saldosB1[categoria] = (saldosB1[categoria] || 0) + movimiento;
                             addAuditEntry(categoria, `Movimientos cuenta ${cuenta.nombre}`, cuenta.id, cuenta.nombre, movimiento);
                         }
                    }
                });
            });

            const capitalContable = saldosA1['A1_10_1'] || 0;
            const capitalFinal = capitalContable !== 0 ? capitalContable : (selectedTenant?.capitalSocialInicial || 0);

            if (capitalContable === 0 && selectedTenant?.capitalSocialInicial) {
                addAuditEntry('A1_10_1', 'Capital Suscrito y Pagado', 'N/A', 'Configuración de Empresa', selectedTenant.capitalSocialInicial, 'Valor por Defecto');
            }

            setAuditData(newAuditData);

            // 3. Mapear saldos a los estados A1 y B1
            setA1Data(prev => ({
                ...prev,
                cajaBancos: saldosA1['A1_1_1'] || 0,
                cxcClientes: saldosA1['A1_1_2'] || 0,
                cxcRelacionados: saldosA1['A1_1_3'] || 0,
                otrasCxC: saldosA1['A1_1_4'] || 0,
                invMercancias: saldosA1['A1_1_5'] || 0,
                invMateriaPrima: saldosA1['A1_1_6'] || 0,
                invProductosProceso: saldosA1['A1_1_7'] || 0,
                otrosInventarios: saldosA1['A1_1_8'] || 0,
                mercanciasTransito: saldosA1['A1_1_9'] || 0,
                gastosPagadosAdelantado: saldosA1['A1_1_10'] || 0,
                otrosActivosCorrientes: saldosA1['A1_1_11'] || 0,
                dividendosEntregados: saldosA1['A1_1_12'] || 0,

                edificacionesCat1: saldosA1['A1_2_1'] || 0,
                edificacionesAgro: saldosA1['A1_2_2'] || 0,
                automovilesEquiposCat2: saldosA1['A1_2_3'] || 0,
                otrosActivosCat3: saldosA1['A1_2_4'] || 0,
                activosNoDeprecUrbano: saldosA1['A1_2_5'] || 0,
                activosNoDeprecRural: saldosA1['A1_2_6'] || 0,
                revaluacionActivos: saldosA1['A1_2_7'] || 0,
                
                depositos: saldosA1['A1_3_1'] || 0,
                acciones: saldosA1['A1_3_2'] || 0,
                otrasInversiones: saldosA1['A1_3_3'] || 0,

                otrosActivosNoAmortizables: saldosA1['A1_4_1'] || 0,
                isrDiferidoAnticipado: saldosA1['A1_4_2'] || 0,
                otrosActivosAmortizables: saldosA1['A1_4_3'] || 0,

                deprecAcumCat1: Math.abs(saldosA1['A1_5_1'] || 0),
                deprecAcumAgro: Math.abs(saldosA1['A1_5_2'] || 0),
                deprecAcumCat2: Math.abs(saldosA1['A1_5_3'] || 0),
                deprecAcumCat3: Math.abs(saldosA1['A1_5_4'] || 0),
                provCuentasIncobrables: Math.abs(saldosA1['A1_5_5'] || 0),
                provInventario: Math.abs(saldosA1['A1_5_6'] || 0),
                otrasProvisiones: Math.abs(saldosA1['A1_5_7'] || 0),

                prestamosCorto: saldosA1['A1_7_1'] || 0,
                cxp: saldosA1['A1_7_2'] || 0,
                impuestosPorPagar: saldosA1['A1_7_3'] || 0,
                otrasCxp: saldosA1['A1_7_4'] || 0,
                cobrosAnticipados: saldosA1['A1_7_5'] || 0,
                aportesFuturaCap: saldosA1['A1_7_6'] || 0,

                prestamosHipotecarios: saldosA1['A1_8_1'] || 0,
                prestamosLocales: saldosA1['A1_8_2'] || 0,
                prestamosExterior: saldosA1['A1_8_3'] || 0,
                prestamosRelacionadosLocales: saldosA1['A1_8_4'] || 0,
                prestamosRelacionadosExterior: saldosA1['A1_8_5'] || 0,
                prestamosRegimenesEspeciales: saldosA1['A1_8_6'] || 0,
                prestamosOrgIntl: saldosA1['A1_8_7'] || 0,
                prestamosAccionistas: saldosA1['A1_8_8'] || 0,

                otrosPasivos: saldosA1['A1_9_1'] || 0,

                capitalSuscritoPagado: capitalFinal,
                reservaLegal: saldosA1['A1_10_2'] || 0,
                superavitRevaluacion: saldosA1['A1_10_3'] || 0,
                beneficiosEjerciciosAnteriores: saldosA1['A1_10_4'] || 0,
                beneficioEjercicioActual: saldosA1['A1_10_5'] || 0,
                otrasReservas: saldosA1['A1_10_6'] || 0,
            }));

            setB1Data(prev => ({
                ...prev,
                ingVentasLocales: saldosB1['B1_1_1'] || 0,
                ingExportaciones: saldosB1['B1_1_2'] || 0,
                devolucionesVenta: Math.abs(saldosB1['B1_1_3'] || 0),
                descuentoVenta: Math.abs(saldosB1['B1_1_4'] || 0),
                otrosIngresos: saldosB1['B1_1_5'] || 0,

                intFinancierosRegulados: saldosB1['B1_2_1'] || 0,
                intFinancierosNoRegulados: saldosB1['B1_2_2'] || 0,
                porDividendos: saldosB1['B1_2_3'] || 0,
                intPrestamosRelacionadas: saldosB1['B1_2_4'] || 0,
                intPrestamosNoRelacionadas: saldosB1['B1_2_5'] || 0,
                otrosIngresosFinancieros: saldosB1['B1_2_6'] || 0,

                ventasActivosDepreciables: saldosB1['B1_3_1'] || 0,
                ventasBienesCapital: saldosB1['B1_3_2'] || 0,
                diferenciasCambiariasPositivas: saldosB1['B1_3_3'] || 0,
                ingresosOtrosEjercicios: saldosB1['B1_3_4'] || 0,
                otrosIngresosExtraordinarios: saldosB1['B1_3_5'] || 0,

                costoVenta: saldosB1['B1_5_1'] || 0,

                sueldosSalarios: saldosB1['B1_6_1'] || 0,
                retribucionesComplementarias: saldosB1['B1_6_2'] || 0,
                seguros: saldosB1['B1_6_3'] || 0,
                aportacionSeguridadSocial: saldosB1['B1_6_4'] || 0,
                aporteInfotep: saldosB1['B1_6_5'] || 0,
                otrosGastosPersonal: saldosB1['B1_6_6'] || 0,
                itbisPagadoProporcionalidadPersonal: saldosB1['B1_6_7'] || 0,

                honorariosFisicas: saldosB1['B1_7_1'] || 0,
                honorariosMorales: saldosB1['B1_7_2'] || 0,
                honorariosExterior392: saldosB1['B1_7_3'] || 0,
                honorariosExteriorFisicasMorales: saldosB1['B1_7_4'] || 0,
                seguridadMensajeriaFisicas: saldosB1['B1_7_5'] || 0,
                seguridadMensajeriaMorales: saldosB1['B1_7_6'] || 0,
                otrosGastosTrabajos: saldosB1['B1_7_7'] || 0,
                itbisPagadoProporcionalidadTrabajos: saldosB1['B1_7_8'] || 0,

                arrendamientoFisicas: saldosB1['B1_8_1'] || 0,
                arrendamientoMorales: saldosB1['B1_8_2'] || 0,
                otrosArrendamientos: saldosB1['B1_8_3'] || 0,
                itbisPagadoProporcionalidadArrend: saldosB1['B1_8_4'] || 0,

                deprecCat1: saldosB1['B1_9_1'] || 0,
                deprecCat2: saldosB1['B1_9_2'] || 0,
                deprecCat3: saldosB1['B1_9_3'] || 0,
                reparacionesCat1: saldosB1['B1_9_4'] || 0,
                reparacionesCat2y3: saldosB1['B1_9_5'] || 0,
                mantenimientoActivos: saldosB1['B1_9_6'] || 0,
                amortizacionIntangibles: saldosB1['B1_9_7'] || 0,
                amortizacionMejoras: saldosB1['B1_9_8'] || 0,
                itbisPagadoProporcionalidadActivos: saldosB1['B1_9_9'] || 0,

                relacionesPublicas: saldosB1['B1_10_1'] || 0,
                publicidad: saldosB1['B1_10_2'] || 0,
                viajes: saldosB1['B1_10_3'] || 0,
                donaciones: saldosB1['B1_10_4'] || 0,
                donacionesProindustria: saldosB1['B1_10_5'] || 0,
                otrosGastosRepresentacion: saldosB1['B1_10_6'] || 0,
                promociones: saldosB1['B1_10_7'] || 0,
                itbisPagadoProporcionalidadRep: saldosB1['B1_10_8'] || 0,

                primasSeguros: saldosB1['B1_11_1'] || 0,
                cuotasContribuciones: saldosB1['B1_11_2'] || 0,
                destruccionInventario: saldosB1['B1_11_4'] || 0,

                finInstLocales: saldosB1['B1_12_1'] || 0,
                finEntExterior: saldosB1['B1_12_2'] || 0,
                finRelacionadasLocales: saldosB1['B1_12_3'] || 0,
                finRelacionadasExterior: saldosB1['B1_12_4'] || 0,
                finPersonasFisicas: saldosB1['B1_12_5'] || 0,
                finFisicasRelacionadasLocales: saldosB1['B1_12_6'] || 0,
                finFisicasRelacionadasExterior: saldosB1['B1_12_7'] || 0,
                retencionChequesTransferencias: saldosB1['B1_12_8'] || 0,
                finRegimenesEspeciales: saldosB1['B1_12_9'] || 0,
                otrosGastosFinancieros: saldosB1['B1_12_10'] || 0,

                perdidaVentaActivos: saldosB1['B1_13_1'] || 0,
                perdidaVentaCapital: saldosB1['B1_13_2'] || 0,
                perdidaCuentasIncobrables: saldosB1['B1_13_3'] || 0,
                provisionCuentasIncobrables: saldosB1['B1_13_4'] || 0,
                diferenciasCambiariasNegativas: saldosB1['B1_13_5'] || 0,
                otrosGastosExtraordinarios: saldosB1['B1_13_6'] || 0,
                provisionInventario: saldosB1['B1_13_7'] || 0,
                otrasProvisiones: saldosB1['B1_13_8'] || 0,
            }));

            setIsLoadingAccounting(false);
        }, 500);
    }, [periodoFiscal, asientosContables, cuentas, selectedTenant, fiscalStatus]);

    // Ejecutar carga automática al entrar al módulo o cambiar periodo/empresa
    useEffect(() => {
        if (!isDataLoading) {
            handleCargarContabilidad();
        }
    }, [periodoFiscal, selectedTenant, isDataLoading, handleCargarContabilidad]);
    
    
    // --- MANEJAR SINCRONIZACIÓN DE ASIENTOS ---
    const handleSincronizarAsientos = async () => {
        if (fiscalStatus?.status === 'LOCKED') {
            showAlert('Ejercicio Cerrado', 'No se pueden sincronizar asientos en un período fiscal cerrado.');
            return;
        }
        setIsSyncing(true);
        try {
            await sincronizarAsientosFaltantes();
            showAlert('Sincronización Exitosa', 'Se han generado los asientos contables faltantes. Los datos del reporte se actualizarán automáticamente.');
            // El useEffect reaccionará al cambio en asientosContables y actualizará el reporte
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Hubo un problema al sincronizar los asientos.');
        } finally {
            setIsSyncing(false);
        }
    };


    // --- EJECUTAR MOTOR FISCAL ---
    const handleRecalcularMotorFiscal = async () => {
        setIsFiscalEngineLoading(true);
        try {
            const balanza: Record<string, number> = {};
            const start = `${periodoFiscal}-01-01`;
            const end = `${periodoFiscal}-12-31`;
            const asientosDelPeriodo = asientosContables.filter(a => a.fecha >= start && a.fecha <= end);
            
            asientosDelPeriodo.forEach(asiento => {
                asiento.entradas.forEach(entrada => {
                    if (entrada.cuentaId.startsWith('6') || entrada.cuentaId.startsWith('4') || entrada.cuentaId.startsWith('1') || entrada.cuentaId.startsWith('2') || entrada.cuentaId.startsWith('3')) {
                         // Need full balance for validations
                         if (entrada.cuentaId.startsWith('1')) balanza[entrada.cuentaId] = (balanza[entrada.cuentaId] || 0) + (entrada.debito - entrada.credito);
                         if (entrada.cuentaId.startsWith('2') || entrada.cuentaId.startsWith('3') || entrada.cuentaId.startsWith('4')) balanza[entrada.cuentaId] = (balanza[entrada.cuentaId] || 0) + (entrada.credito - entrada.debito); // Acreedoras
                         if (entrada.cuentaId.startsWith('5') || entrada.cuentaId.startsWith('6')) balanza[entrada.cuentaId] = (balanza[entrada.cuentaId] || 0) + (entrada.debito - entrada.credito);
                    }
                });
            });
            const resultadoMotor = calcularMotorFiscal({
                empresaId: selectedTenant?.id || '',
                balanzaComprobacion: balanza,
                catalogoCuentas: cuentas,
                activosFijos: activosFijos,
                periodoFiscal: periodoFiscal,
                asientosPeriodo: asientosDelPeriodo,
                snapshotAnterior: prevSnapshot
            });
            
            setFiscalWarnings(resultadoMotor.analisisRiesgo.advertencias);
            setConfidenceLevel(resultadoMotor.analisisRiesgo.nivelConfianza);
            setBlockingErrors(resultadoMotor.validations);
            setEvaluacionActividad(resultadoMotor.evaluacionActividad);
            setCalculatedAssetsForLock(resultadoMotor.calculatedAssets); // Store calculated assets for locking

            setGData(prev => ({
                ...prev,
                impuestosNoDeducibles: resultadoMotor.anexoG.ajustesPositivos['impuestosNoDeducibles'] || 0,
                gastosInteresesNoDeducibles: resultadoMotor.anexoG.ajustesPositivos['gastosInteresesNoDeducibles'] || 0,
                otrosGastosNoAdmitidos: resultadoMotor.anexoG.ajustesPositivos['otrosGastosNoAdmitidos'] || 0,
                excesoDonaciones: resultadoMotor.anexoG.ajustesPositivos['excesoDonaciones'] || 0,
                gastosSinComprobantes: resultadoMotor.anexoG.ajustesPositivos['gastosSinComprobantes'] || 0,
            }));
            setDData(prev => ({
                ...prev,
                usoPropio: {
                    cat2: { ...prev.usoPropio.cat2, ...resultadoMotor.anexoD.cat2 },
                    cat3: { ...prev.usoPropio.cat3, ...resultadoMotor.anexoD.cat3 }
                }
            }));
            if (resultadoMotor.anexoD1.activos.length > 0) {
                 const newAdquisiciones = resultadoMotor.anexoD1.activos.map(a => ({
                     id: a.id,
                     fecha: a.fecha,
                     valor: a.costo,
                     baseDepreciable: a.costo,
                     proporcionNoDepreciada: 0,
                     depreciacion: a.depreciacion,
                     costoFinal: a.costo - a.depreciacion
                 }));
                 setD1Data(prev => ({ ...prev, adquisiciones: newAdquisiciones }));
            }
            if (resultadoMotor.validations.length > 0) {
                showAlert('Errores de Validación', `Se han detectado ${resultadoMotor.validations.length} errores críticos. Debe corregirlos antes del Cierre Fiscal.`);
            } else if (resultadoMotor.analisisRiesgo.advertencias.length > 0) {
                showAlert('Advertencia Fiscal', `Se han detectado ${resultadoMotor.analisisRiesgo.advertencias.length} riesgos potenciales en el cálculo. Revise la sección de advertencias.`);
            }
        } catch (error) {
            console.error("Error en motor fiscal:", error);
            showAlert('Error', 'No se pudo completar el cálculo fiscal.');
        } finally {
            setIsFiscalEngineLoading(false);
        }
    };

    // --- MANEJO DE CIERRE FISCAL ---
    const handleCierreFiscal = () => {
        if (blockingErrors.length > 0) {
            showAlert('Cierre Bloqueado', 'No se puede cerrar el ejercicio fiscal porque existen errores de validación críticos. Corrija las inconsistencias primero.');
            return;
        }
        
        // --- 3. VALIDACIÓN BLOQUEANTE PÉRDIDAS ANEXO E (GAP 3) ---
        const deduccionAplicada = eCalculated.totalesA.totalCompensablePeriodo;
        const rentaNetaImponibleAntesPerdida = ir2Calculated.rentaNetaAntesPerdida;
        if (deduccionAplicada > rentaNetaImponibleAntesPerdida * 0.20 + 0.01) { // 0.01 tolerance
             showAlert('Cierre Bloqueado', `La deducción de pérdidas (${formatCurrency(deduccionAplicada)}) excede el 20% de la Renta Neta Imponible (${formatCurrency(rentaNetaImponibleAntesPerdida * 0.20)}). Ajuste el Anexo E.`);
             return;
        }
        
        // --- VALIDACION BLOQUEANTE IMPUESTO ACTIVOS (NUEVO) ---
        if (activosCalculated.baseImponible < 0) {
            showAlert('Cierre Bloqueado', `La Base Imponible del Impuesto sobre los Activos es negativa (${formatCurrency(activosCalculated.baseImponible)}). Verifique los Activos Exentos.`);
            return;
        }

        showConfirmation(
            'Confirmar Cierre Fiscal Formal',
            `¿Está seguro de que desea bloquear el período fiscal ${periodoFiscal}? Una vez cerrado, no se podrán modificar facturas, gastos ni asientos de este año. Se generará un hash de integridad.`,
            async () => {
                const rawData = {
                    d2Data, d1Data, dData, a1Data, b1Data, eData, gData, ir2Data, activosData,
                    // Optionally include calculatedAssets if part of snapshot integrity
                    continuityData: {
                        d2: {
                            patrimonioFiscalFinal: d2Calculated.patrimonioFiscal,
                            ajusteInflacionAplicado: d2Calculated.ajusteFiscalPatrimonial
                        },
                        anexoE: {
                            perdidasPendientes: eCalculated.perdidasCalculadas.map(p => ({
                                year: p.year || String(periodoFiscal), // If new loss, assign current year
                                perdidaInicial: p.perdidaInicial,
                                indiceInflacion: p.indiceInflacion,
                                periodosPorCompensar: p.periodosPorCompensar,
                                porcentajeRenta: p.porcentajeRenta,
                                perdidaPendiente: p.perdidaPendiente
                            }))
                        },
                        activos: {
                            baseImponible: activosCalculated.baseImponible,
                            impuestoActivos: activosCalculated.impuestoActivosCalculado,
                            creditoISR: activosCalculated.creditoISRLiquidado,
                            diferenciaPagar: activosCalculated.diferenciaPagar
                        }
                    }
                };

                // Helper to sanitize data and remove circular references
                const sanitize = (obj: any) => {
                    const cache = new Set();
                    return JSON.parse(JSON.stringify(obj, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (cache.has(value)) {
                                return; // Circular reference found, discard key
                            }
                            // Defensive check against minified objects often associated with circular errors (e.g. Google Maps)
                            if (value.constructor && (value.constructor.name === 'Y' || value.constructor.name === 'Ka')) {
                                return; 
                            }
                            cache.add(value);
                        }
                        return value;
                    }));
                };

                const dataToHash = sanitize(rawData);

                try {
                    // Pass calculatedAssetsForLock to ensure assets are updated for continuity
                    await lockFiscalYear(periodoFiscal, dataToHash, calculatedAssetsForLock);
                    const status = await getFiscalStatus(periodoFiscal);
                    setFiscalStatus(status);
                    showAlert('Ejercicio Cerrado', 'El período fiscal ha sido cerrado correctamente.');
                } catch (e) {
                    console.error(e);
                    showAlert('Error', 'No se pudo cerrar el ejercicio fiscal.');
                }
            }
        );
    };

    const handleReapertura = () => {
        showConfirmation(
            'Reapertura de Ejercicio Fiscal',
            'ADVERTENCIA: Reabrir un ejercicio fiscal cerrado es una acción auditada. Se registrará la fecha y usuario. ¿Desea continuar?',
            async () => {
                const reason = prompt("Ingrese el motivo de la reapertura:");
                if (reason) {
                    await unlockFiscalYear(periodoFiscal, reason);
                    const status = await getFiscalStatus(periodoFiscal);
                    setFiscalStatus(status);
                    showAlert('Ejercicio Reabierto', 'El período fiscal está abierto para ediciones.');
                }
            }
        );
    }

    // --- CALCULOS D1 ---
    const TASA_DEP_CAT1 = 0.05;
    const calcularDepreciacionProporcional = (valor: number, fechaStr: string) => {
        if (!fechaStr || valor <= 0) return 0;
        const fechaActivo = new Date(fechaStr);
        const finPeriodo = new Date(periodoFiscal, 11, 31);
        if (fechaActivo > finPeriodo) return 0;
        let mesesUso = 12 - fechaActivo.getMonth(); 
        if (fechaActivo.getFullYear() < periodoFiscal) mesesUso = 12;
        return Number((valor * TASA_DEP_CAT1 * (mesesUso / 12)).toFixed(2));
    };

    const d1Calculated = useMemo(() => {
        const balanceInicialAjustado = d1Data.balanceInicial + d1Data.ajusteFiscal;
        const baseDepreciableI = balanceInicialAjustado - d1Data.retirosAjuste;
        const depreciacionI = baseDepreciableI * TASA_DEP_CAT1;
        const costoFiscalFinalI = baseDepreciableI - depreciacionI;
        const sumAdquisiciones = d1Data.adquisiciones.reduce((acc: { valor: number, depreciacion: number, costoFinal: number }, item) => ({ valor: acc.valor + item.valor, depreciacion: acc.depreciacion + item.depreciacion, costoFinal: acc.costoFinal + item.costoFinal }), { valor: 0, depreciacion: 0, costoFinal: 0 });
        const sumMejoras = d1Data.mejoras.reduce((acc: { valor: number, depreciacion: number, costoFinal: number }, item) => ({ valor: acc.valor + item.valor, depreciacion: acc.depreciacion + item.depreciacion, costoFinal: acc.costoFinal + item.costoFinal }), { valor: 0, depreciacion: 0, costoFinal: 0 });
        const totalDepreciacion = depreciacionI + sumAdquisiciones.depreciacion + sumMejoras.depreciacion;
        const totalCostoFiscalFinal = costoFiscalFinalI + sumAdquisiciones.costoFinal + sumMejoras.costoFinal;
        return { balanceInicialAjustado, baseDepreciableI, depreciacionI, costoFiscalFinalI, sumAdquisiciones, sumMejoras, totalDepreciacion, totalCostoFiscalFinal };
    }, [d1Data, periodoFiscal]);

    // --- CALCULOS D2 ---
    const d2Calculated = useMemo(() => {
        const costoFiscalCat1 = d1Calculated.totalCostoFiscalFinal > 0 ? d1Calculated.totalCostoFiscalFinal : d2Data.costoFiscalCat1;
        const totalActivosFiscales = d2Data.totalActivosLibros + d2Data.provisionesReservas + d2Data.impuestoDiferidoActivo - d2Data.cuentasPorCobrarNoGiro - d2Data.costoTerrenosLibros - d2Data.costoAccionesLibros - d2Data.costoEdificioLibros - d2Data.costoConstrProcesoLibros - d2Data.costoActivoConstrLibros - d2Data.costoCat2Libros - d2Data.costoCat3Libros - d2Data.costoCat2ArrendLibros - d2Data.costoCat3ArrendLibros - d2Data.otrosActivosLibros + costoFiscalCat1 + d2Data.costoFiscalCat2 + d2Data.costoFiscalActivoConstr + d2Data.costoFiscalCat3 + d2Data.costoFiscalCat2Arrend + d2Data.costoFiscalCat3Arrend + d2Data.costoFiscalTerrenos + d2Data.costoFiscalAcciones - d2Data.reevaluacionActivos + d2Data.mejorasPropArrendadas + d2Data.costoFiscalOtrosActivos;
        const saldoPasivos = d2Data.totalPasivosLibros - d2Data.impuestoDiferidoPasivo - d2Data.provisionesReservasPasivo - d2Data.otrosPasivos;
        const patrimonioFiscal = totalActivosFiscales - saldoPasivos;
        const totalActivosNoMonetarios = d2Data.inventario + costoFiscalCat1 + d2Data.costoFiscalCat2 + d2Data.costoFiscalCat3 + d2Data.costoFiscalCat2Arrend + d2Data.costoFiscalCat3Arrend + d2Data.costoFiscalTerrenos + d2Data.mejorasPropArrendadas + d2Data.costoConstrProcesoLibros + d2Data.costoFiscalActivoConstr + d2Data.costoFiscalAcciones + d2Data.costoFiscalOtrosActivos;
        const baseAjuste = Math.min(patrimonioFiscal, totalActivosNoMonetarios);
        const ajusteFiscalPatrimonial = baseAjuste * (d2Data.multiplicadorAjuste / 100);
        
        // Ajuste de Inventario Especifico
        const ajusteInventario = totalActivosNoMonetarios > 0 ? (d2Data.inventario / totalActivosNoMonetarios) * ajusteFiscalPatrimonial : 0;

        return { costoFiscalCat1, totalActivosFiscales, saldoPasivos, patrimonioFiscal, totalActivosNoMonetarios, baseAjuste, ajusteFiscalPatrimonial, ajusteInventario };
    }, [d2Data, d1Calculated]);

    // --- CALCULOS D ---
    const calcDepreciacionConjunta = (data: { balanceInicial: number, ajusteFiscal: number, totalAdiciones: number, retiros: number }, tasa: number) => {
        const adicionesImponibles = data.totalAdiciones * 0.50; // 50% de adiciones
        const baseAjustada = data.balanceInicial + data.ajusteFiscal + adicionesImponibles - data.retiros;
        const depreciacion = baseAjustada > 0 ? baseAjustada * tasa : 0;
        const adicionNoDepreciada = data.totalAdiciones * 0.50; // El otro 50%
        const costoFiscalFinal = baseAjustada - depreciacion + adicionNoDepreciada;
        return { adicionesImponibles, baseAjustada, depreciacion, adicionNoDepreciada, costoFiscalFinal };
    };

    const dCalculated = useMemo(() => {
        // III. A) Uso Propio
        const usoPropioCat2 = calcDepreciacionConjunta(dData.usoPropio.cat2, 0.25);
        const usoPropioCat3 = calcDepreciacionConjunta(dData.usoPropio.cat3, 0.15);
        // III. B) Arrendamiento
        const arrendCat2 = calcDepreciacionConjunta(dData.arrendamiento.cat2, 0.25);
        const arrendCat3 = calcDepreciacionConjunta(dData.arrendamiento.cat3, 0.15);
        // III. C) Ley 392-07
        const leyCat2 = calcDepreciacionConjunta(dData.ley392.cat2, 0.25);
        const leyCat3 = calcDepreciacionConjunta(dData.ley392.cat3, 0.15);

        // Totales Costo Fiscal
        const totalCostoFiscal = usoPropioCat2.costoFiscalFinal + usoPropioCat3.costoFiscalFinal +
                                 arrendCat2.costoFiscalFinal + arrendCat3.costoFiscalFinal +
                                 leyCat2.costoFiscalFinal + leyCat3.costoFiscalFinal;

        // IV. Costo Venta (Comercio)
        const costoVentaComercial = dData.cv_inventarioInicial + dData.cv_comprasLocales + dData.cv_comprasExterior + dData.cv_itbisCosto - dData.cv_inventarioFinal;

        // V. Costo Manufactura
        const costosProduccion = (dData.cm_invInicialMateriaPrima + dData.cm_invInicialProdProceso + dData.cm_comprasMateriaPrimaLocal + dData.cm_comprasMateriaPrimaExterior + dData.cm_sueldosSalarios + dData.cm_depreciacion + dData.cm_otrosGastos) - (dData.cm_invFinalMateriaPrima + dData.cm_invFinalProdProceso);
        const costoVentaManufactura = (costosProduccion + dData.cm_invInicialProdTerminados) - dData.cm_invFinalProdTerminados;

        return {
            usoPropioCat2, usoPropioCat3, 
            arrendamientoCat2: arrendCat2, arrendamientoCat3: arrendCat3, 
            ley392Cat2: leyCat2, ley392Cat3: leyCat3, 
            totalCostoFiscal,
            costoVentaComercial, costosProduccion, costoVentaManufactura
        };
    }, [dData]);

    // --- CALCULOS A-1 ---
    const a1Calculated = useMemo(() => {
        const totalActivosCorrientes = a1Data.cajaBancos + a1Data.cxcClientes + a1Data.cxcRelacionados + a1Data.otrasCxC + a1Data.invMercancias + a1Data.invMateriaPrima + a1Data.invProductosProceso + a1Data.otrosInventarios + a1Data.mercanciasTransito + a1Data.gastosPagadosAdelantado + a1Data.otrosActivosCorrientes + a1Data.dividendosEntregados;
        const totalActivosFijos = a1Data.edificacionesCat1 + a1Data.edificacionesAgro + a1Data.automovilesEquiposCat2 + a1Data.otrosActivosCat3 + a1Data.activosNoDeprecUrbano + a1Data.activosNoDeprecRural + a1Data.revaluacionActivos;
        const totalInversiones = a1Data.depositos + a1Data.acciones + a1Data.otrasInversiones;
        const totalOtrosActivos = a1Data.otrosActivosNoAmortizables + a1Data.isrDiferidoAnticipado + a1Data.otrosActivosAmortizables;
        const totalProvisiones = a1Data.deprecAcumCat1 + a1Data.deprecAcumAgro + a1Data.deprecAcumCat2 + a1Data.deprecAcumCat3 + a1Data.provCuentasIncobrables + a1Data.provInventario + a1Data.otrasProvisiones;
        const totalActivos = (totalActivosCorrientes + totalActivosFijos + totalInversiones + totalOtrosActivos) - totalProvisiones;

        const totalAcreedoresCortoPlazo = a1Data.prestamosCorto + a1Data.cxp + a1Data.impuestosPorPagar + a1Data.otrasCxp + a1Data.cobrosAnticipados + a1Data.aportesFuturaCap;
        const totalAcreedoresLargoPlazo = a1Data.prestamosHipotecarios + a1Data.prestamosLocales + a1Data.prestamosExterior + a1Data.prestamosRelacionadosLocales + a1Data.prestamosRelacionadosExterior + a1Data.prestamosRegimenesEspeciales + a1Data.prestamosOrgIntl + a1Data.prestamosAccionistas;
        const totalPatrimonio = a1Data.capitalSuscritoPagado + a1Data.reservaLegal + a1Data.superavitRevaluacion + a1Data.beneficiosEjerciciosAnteriores + a1Data.beneficioEjercicioActual + a1Data.otrasReservas;
        const totalPasivosYPatrimonio = totalAcreedoresCortoPlazo + totalAcreedoresLargoPlazo + a1Data.otrosPasivos + totalPatrimonio;

        return { totalActivosCorrientes, totalActivosFijos, totalInversiones, totalOtrosActivos, totalProvisiones, totalActivos, totalAcreedoresCortoPlazo, totalAcreedoresLargoPlazo, totalPatrimonio, totalPasivosYPatrimonio };
    }, [a1Data]);

    // --- CALCULOS B-1 ---
    const b1Calculated = useMemo(() => {
        const totalIngresosOperaciones = b1Data.ingVentasLocales + b1Data.ingExportaciones - b1Data.devolucionesVenta - b1Data.descuentoVenta + b1Data.otrosIngresos;
        const totalIngresosFinancieros = b1Data.intFinancierosRegulados + b1Data.intFinancierosNoRegulados + b1Data.porDividendos + b1Data.intPrestamosRelacionadas + b1Data.intPrestamosNoRelacionadas + b1Data.otrosIngresosFinancieros;
        const totalIngresosExtraordinarios = b1Data.ventasActivosDepreciables + b1Data.ventasBienesCapital + b1Data.diferenciasCambiariasPositivas + b1Data.ingresosOtrosEjercicios + b1Data.otrosIngresosExtraordinarios;
        const totalIngresos = totalIngresosOperaciones + totalIngresosFinancieros + totalIngresosExtraordinarios;

        const totalGastosPersonal = b1Data.sueldosSalarios + b1Data.retribucionesComplementarias + b1Data.seguros + b1Data.aportacionSeguridadSocial + b1Data.aporteInfotep + b1Data.otrosGastosPersonal + b1Data.itbisPagadoProporcionalidadPersonal;
        const totalGastosTrabajos = b1Data.honorariosFisicas + b1Data.honorariosMorales + b1Data.honorariosExterior392 + b1Data.honorariosExteriorFisicasMorales + b1Data.seguridadMensajeriaFisicas + b1Data.seguridadMensajeriaMorales + b1Data.otrosGastosTrabajos + b1Data.itbisPagadoProporcionalidadTrabajos;
        const totalArrendamientos = b1Data.arrendamientoFisicas + b1Data.arrendamientoMorales + b1Data.otrosArrendamientos + b1Data.itbisPagadoProporcionalidadArrend;
        const totalGastosActivosFijos = b1Data.deprecCat1 + b1Data.deprecCat2 + b1Data.deprecCat3 + b1Data.reparacionesCat1 + b1Data.reparacionesCat2y3 + b1Data.mantenimientoActivos + b1Data.amortizacionIntangibles + b1Data.amortizacionMejoras + b1Data.itbisPagadoProporcionalidadActivos;
        const totalGastosRepresentacion = b1Data.relacionesPublicas + b1Data.publicidad + b1Data.viajes + b1Data.donaciones + b1Data.donacionesProindustria + b1Data.otrosGastosRepresentacion + b1Data.promociones + b1Data.itbisPagadoProporcionalidadRep;
        const totalOtrasDeducciones = b1Data.primasSeguros + b1Data.cuotasContribuciones + b1Data.destruccionInventario;
        const totalGastosFinancieros = b1Data.finInstLocales + b1Data.finEntExterior + b1Data.finRelacionadasLocales + b1Data.finRelacionadasExterior + b1Data.finPersonasFisicas + b1Data.finFisicasRelacionadasLocales + b1Data.finFisicasRelacionadasExterior + b1Data.retencionChequesTransferencias + b1Data.finRegimenesEspeciales + b1Data.otrosGastosFinancieros;
        const totalGastosExtraordinarios = b1Data.perdidaVentaActivos + b1Data.perdidaVentaCapital + b1Data.perdidaCuentasIncobrables + b1Data.provisionCuentasIncobrables + b1Data.diferenciasCambiariasNegativas + b1Data.otrosGastosExtraordinarios + b1Data.provisionInventario + b1Data.otrasProvisiones;

        // El Anexo B-1 suma Costo de Venta + Todos los Gastos en la casilla 15 (Total)
        const totalCostosYGastos = b1Data.costoVenta + totalGastosPersonal + totalGastosTrabajos + totalArrendamientos + totalGastosActivosFijos + totalGastosRepresentacion + totalOtrasDeducciones + totalGastosFinancieros + totalGastosExtraordinarios;
        const beneficioPerdida = totalIngresos - totalCostosYGastos;

        return {
            totalIngresosOperaciones, totalIngresosFinancieros, totalIngresosExtraordinarios, totalIngresos,
            totalGastosPersonal, totalGastosTrabajos, totalArrendamientos, totalGastosActivosFijos, totalGastosRepresentacion,
            totalOtrasDeducciones, totalGastosFinancieros, totalGastosExtraordinarios,
            totalCostosYGastos, beneficioPerdida
        };
    }, [b1Data]);

    // --- CALCULOS ANEXO E ---
    const eCalculated = useMemo(() => {
        // A. Perdidas
        // La Renta Neta Imponible antes de pérdida viene idealmente del B-1 (beneficio/pérdida) o del IR-2 casilla 17.
        // Aquí usaremos el beneficio del B-1 como base tentativa para todas las filas para simplificar visualización
        const rentaNetaTentativa = Math.max(0, b1Calculated.beneficioPerdida); // Solo si hay beneficio se compensa

        let totalPerdidaInicial = 0;
        let totalAjusteInflacion = 0;
        let totalPerdidaAjustada = 0;
        let totalPerdidaCompensar = 0;
        let totalLimiteCompensar = 0;
        let totalCompensablePeriodo = 0;
        let totalPendiente = 0;

        const perdidasCalculadas = eData.perdidas.map(p => {
            const cantidadAjuste = p.perdidaInicial * (p.indiceInflacion / 100);
            const perdidaAjustada = p.perdidaInicial + cantidadAjuste;
            const perdidaACompensar = p.periodosPorCompensar > 0 ? (perdidaAjustada / 5) : 0; // Ley 11-92 permite 20% anual (5 años)
            const limiteCompensar = rentaNetaTentativa * (p.porcentajeRenta / 100);
            const compensablePeriodo = Math.min(perdidaACompensar, limiteCompensar);
            const perdidaPendiente = perdidaAjustada - compensablePeriodo; // Casillas E - K (Forma dice G, pero logica es lo compensado)

            // Acumuladores
            totalPerdidaInicial += p.perdidaInicial;
            totalAjusteInflacion += cantidadAjuste;
            totalPerdidaAjustada += perdidaAjustada;
            totalPerdidaCompensar += perdidaACompensar;
            totalLimiteCompensar += limiteCompensar;
            totalCompensablePeriodo += compensablePeriodo;
            totalPendiente += perdidaPendiente;

            return {
                ...p,
                cantidadAjuste,
                perdidaAjustada,
                perdidaACompensar,
                rentaNeta: rentaNetaTentativa,
                limiteCompensar,
                compensablePeriodo,
                perdidaPendiente
            };
        });

        // B. Beneficios
        const totalDistribucion = eData.dividendos + eData.reservas + eData.utilidadesNoDistribuidas;

        // C. Capital
        const saldoPerdidaCapitalFuturo = (eData.perdidaCapitalAnterior + eData.perdidaCapitalEjercicio) - eData.gananciaCapitalCompensar;

        // D. Ingresos Anticipos
        const totalIngresos = b1Calculated.totalIngresos; // Viene de B-1
        const totalNoImputables = eData.gananciaCapitalLibros + eData.gananciaBienesDepreciablesLibros + eData.dividendosExentos + eData.interesesExentos;
        const baseImponibleAnticipos = totalIngresos - totalNoImputables - eData.costoVentaComisiones;

        return {
            perdidasCalculadas,
            totalesA: { totalPerdidaInicial, totalAjusteInflacion, totalPerdidaAjustada, totalPerdidaCompensar, totalLimiteCompensar, totalCompensablePeriodo, totalPendiente },
            totalDistribucion,
            saldoPerdidaCapitalFuturo,
            totalIngresos,
            totalNoImputables,
            baseImponibleAnticipos
        };
    }, [eData, b1Calculated]);

    // --- CALCULOS ANEXO G ---
    const gCalculated = useMemo(() => {
        const totalAjustesPositivos = gData.impuestosNoDeducibles + gData.excesoDepreciacion + gData.ajustesFiscalizacion + gData.excesoProvisionIncobrables +
            gData.excesoDonaciones + gData.perdidaCapitalNoCompensable + gData.diferenciaCambiariaPositiva + gData.ajustesReembolsos + gData.ajustesPreciosTransferencia +
            gData.gastosInteresesNoDeducibles + gData.otrosGastosNoAdmitidos + gData.ajustesInventariosPositivos + gData.gastosSinComprobantes + gData.isrDiferido +
            gData.provisionesNoAdmitidas + gData.pasivoNoSustentado + gData.otrosAjustesPositivos;

        // La casilla 2.2 viene automáticamente de D2
        const ajusteInventarioD2 = d2Calculated.ajusteInventario;
        const totalAjustesNegativos = gData.deficienciaDepreciacion + ajusteInventarioD2 + gData.diferenciaCambiariaNegativa + gData.otrosAjustesNegativos;

        const totalDistribucionPositiva = Object.values(gData.distribucion).reduce((sum: number, item: unknown) => sum + (item as DistribucionAjuste).pos, 0);
        const totalDistribucionNegativa = Object.values(gData.distribucion).reduce((sum: number, item: unknown) => sum + (item as DistribucionAjuste).neg, 0);

        return { totalAjustesPositivos, totalAjustesNegativos, ajusteInventarioD2, totalDistribucionPositiva, totalDistribucionNegativa };
    }, [gData, d2Calculated]);

    // --- CALCULOS ANEXO J ---
    const jCalculated = useMemo(() => {
        const year = periodoFiscal.toString();
        
        // 1. VENTAS (607)
        const ventasData: AnexoJData = {
            creditoFiscal: { cantidad: 0, monto: 0 }, consumidorFinal: { cantidad: 0, monto: 0 }, notaDebito: { cantidad: 0, monto: 0 },
            notaCredito: { cantidad: 0, monto: 0 }, registroUnico: { cantidad: 0, monto: 0 }, regimenesEspeciales: { cantidad: 0, monto: 0 },
            gubernamentales: { cantidad: 0, monto: 0 }, otrasOperaciones: { cantidad: 0, monto: 0 },
            cp_creditoFiscal: { cantidad: 0, monto: 0 }, cp_notaDebito: { cantidad: 0, monto: 0 }, cp_notaCredito: { cantidad: 0, monto: 0 },
            cp_gubernamentales: { cantidad: 0, monto: 0 }, cp_regimenesEspeciales: { cantidad: 0, monto: 0 }, cp_informales: { cantidad: 0, monto: 0 },
            cp_gastosMenores: { cantidad: 0, monto: 0 }
        };

        const invoicesAndNotes = [...facturas, ...notas].filter(f => f.fecha.startsWith(year) && f.ncf && f.ncf.length > 0);

        invoicesAndNotes.forEach(f => {
            const prefix = f.ncf.toUpperCase().substring(0, 3);
            const monto = Math.abs(f.montoTotal || (f as any).monto || 0); // Always positive for summary, except NC logic later

            if (prefix === 'B01' || prefix === 'E31') {
                ventasData.creditoFiscal.cantidad++; ventasData.creditoFiscal.monto += monto;
            } else if (prefix === 'B02' || prefix === 'E32') {
                ventasData.consumidorFinal.cantidad++; ventasData.consumidorFinal.monto += monto;
            } else if (prefix === 'B03' || prefix === 'E33') {
                ventasData.notaDebito.cantidad++; ventasData.notaDebito.monto += monto;
            } else if (prefix === 'B04' || prefix === 'E34') {
                ventasData.notaCredito.cantidad++; ventasData.notaCredito.monto += monto;
            } else if (prefix === 'B12') {
                ventasData.registroUnico.cantidad++; ventasData.registroUnico.monto += monto;
            } else if (prefix === 'B14' || prefix === 'E44') {
                ventasData.regimenesEspeciales.cantidad++; ventasData.regimenesEspeciales.monto += monto;
            } else if (prefix === 'B15' || prefix === 'E45') {
                ventasData.gubernamentales.cantidad++; ventasData.gubernamentales.monto += monto;
            }
        });

        // Total Ingresos = (1.1 + 1.2 + 1.3 - 1.4 + 1.5 + 1.6 + 1.7 + 1.8)
        const totalVentas = ventasData.creditoFiscal.monto + ventasData.consumidorFinal.monto + ventasData.notaDebito.monto 
                            - ventasData.notaCredito.monto + ventasData.registroUnico.monto + ventasData.regimenesEspeciales.monto 
                            + ventasData.gubernamentales.monto + ventasData.otrasOperaciones.monto;

        // 2. COMPRAS (606)
        const comprasList = gastos.filter(g => g.fecha.startsWith(year) && g.ncf && g.ncf.length > 0);

        comprasList.forEach(g => {
            const prefix = g.ncf.toUpperCase().substring(0, 3);
            const monto = Math.abs(g.monto);

            if (prefix === 'B01' || prefix === 'E31') {
                ventasData.cp_creditoFiscal.cantidad++; ventasData.cp_creditoFiscal.monto += monto;
            } else if (prefix === 'B03' || prefix === 'E33') {
                ventasData.cp_notaDebito.cantidad++; ventasData.cp_notaDebito.monto += monto;
            } else if (prefix === 'B04' || prefix === 'E34') {
                ventasData.cp_notaCredito.cantidad++; ventasData.cp_notaCredito.monto += monto;
            } else if (prefix === 'B15' || prefix === 'E45') { // Assuming B15 received as supplier NCF
                ventasData.cp_gubernamentales.cantidad++; ventasData.cp_gubernamentales.monto += monto;
            } else if (prefix === 'B14' || prefix === 'E44') {
                ventasData.cp_regimenesEspeciales.cantidad++; ventasData.cp_regimenesEspeciales.monto += monto;
            } else if (prefix === 'B11') {
                ventasData.cp_informales.cantidad++; ventasData.cp_informales.monto += monto;
            } else if (prefix === 'B13') {
                ventasData.cp_gastosMenores.cantidad++; ventasData.cp_gastosMenores.monto += monto;
            }
        });

        // Total Sustentados (2.6) = (2.1 + 2.2 - 2.3 + 2.4 + 2.5)
        const totalSustentados = ventasData.cp_creditoFiscal.monto + ventasData.cp_notaDebito.monto 
                                 - ventasData.cp_notaCredito.monto + ventasData.cp_gubernamentales.monto 
                                 + ventasData.cp_regimenesEspeciales.monto;
        
        // Total Operaciones Gastos (2.9) = (2.7 + 2.8)
        const totalOtrosGastos = ventasData.cp_informales.monto + ventasData.cp_gastosMenores.monto;

        return {
            data: ventasData,
            totalVentas,
            totalSustentados,
            totalOtrosGastos
        };
    }, [facturas, notas, gastos, periodoFiscal]);

    // --- CALCULOS IR-2 ---
    
    // Sync Perdidas from Anexo E to IR-2 state automatically
    useEffect(() => {
        setIr2Data(prev => ({
            ...prev,
            perdidaAnosAnteriores: eCalculated.totalesA.totalCompensablePeriodo
        }));
    }, [eCalculated.totalesA.totalCompensablePeriodo]);

    const ir2Calculated = useMemo(() => {
        // II. DETERMINACION RENTA NETA
        const ingresosA = b1Calculated.totalIngresos; // Auto from B-1
        const ingresosB = eCalculated.baseImponibleAnticipos; // Auto from Anexo E
        const beneficioNeto = b1Calculated.beneficioPerdida; // Casilla 1 (Auto from B-1)
        const ajustesPositivos = gCalculated.totalAjustesPositivos; // Casilla 2 (Auto from G)
        const ajustesNegativos = gCalculated.totalAjustesNegativos; // Casilla 5 (Auto from G)
        
        // 6. TOTAL AJUSTES FISCALES (2 - 3 - 4 - 5)
        const totalAjustesFiscales = ajustesPositivos - ir2Data.exencionLeyIncentivos - ir2Data.dividendosGanados - ajustesNegativos;

        // 7. RENTA NETA IMPONIBLE ANTES DE PERDIDA (1 +/- 6)
        const rentaNetaAntesPerdida = beneficioNeto + totalAjustesFiscales;

        // 8. PERDIDAS AÑOS ANTERIORES (Manual Editable, defaults to Anexo E value via useEffect)
        const perdidaCompensable = ir2Data.perdidaAnosAnteriores;

        // 9. RENTA NETA DESPUES DE PERDIDA (7 - 8)
        const rentaDespuesPerdida = rentaNetaAntesPerdida - perdidaCompensable;

        // 11. RENTA NETA IMPONIBLE FINAL (9 - 10)
        const rentaNetaImponible = rentaDespuesPerdida - ir2Data.deduccionInversion;
        const baseImponible = Math.max(0, rentaNetaImponible); // No puede ser negativo para el impuesto

        // III. LIQUIDACION
        // 12. IMPUESTO LIQUIDADO (27%)
        const impuestoLiquidado = baseImponible * 0.27;

        // Total Creditos (Sum 13 to 22)
        const totalCreditos = ir2Data.anticiposPagados + ir2Data.retencionesEstado + ir2Data.creditoInversion +
                              ir2Data.creditoEnergiaRenovable + ir2Data.creditoRetencionesInteres + 
                              ir2Data.creditoRetencionesGananciaCapital + ir2Data.creditoImpuestosExterior +
                              ir2Data.creditoFiscalLey253_12 + ir2Data.compensacionesAutorizadas + 
                              ir2Data.saldoFavorAnterior;

        // 23. DIFERENCIA A PAGAR
        const balanceOperacion = impuestoLiquidado - totalCreditos;
        const diferenciaPagar = balanceOperacion > 0 ? balanceOperacion : 0;
        
        // 24. SALDO A FAVOR
        const saldoFavor = balanceOperacion < 0 ? Math.abs(balanceOperacion) : 0;

        // Recargos
        const totalRecargos = ir2Data.moraDeclaracionTardia + ir2Data.moraAnticipos;

        // 31. TOTAL A PAGAR
        const totalPagar = diferenciaPagar + totalRecargos + ir2Data.sanciones + ir2Data.interesIndemnizatorioTardia + ir2Data.interesIndemnizatorioAnticipos;

        // 33. NUEVO SALDO A FAVOR
        // Formula: Casillas 24-27-28-30-32 si es negativa. Si es positivo es valor a pagar (pero aqui solo mostramos saldo a favor)
        // Interpretación lógica: Saldo a Favor Original - Penalidades - Compensaciones
        const penalidadesYCompensaciones = totalRecargos + ir2Data.sanciones + ir2Data.interesIndemnizatorioTardia + ir2Data.interesIndemnizatorioAnticipos + ir2Data.saldoCompensarActivo;
        let nuevoSaldoFavor = 0;
        if (saldoFavor > 0) {
            nuevoSaldoFavor = Math.max(0, saldoFavor - penalidadesYCompensaciones);
        }

        return {
            ingresosA, ingresosB, beneficioNeto, ajustesPositivos, ajustesNegativos, totalAjustesFiscales,
            rentaNetaAntesPerdida, perdidaCompensable, rentaDespuesPerdida, rentaNetaImponible, baseImponible,
            impuestoLiquidado, totalCreditos, diferenciaPagar, saldoFavor, totalRecargos, totalPagar, nuevoSaldoFavor
        };
    }, [b1Calculated, eCalculated, gCalculated, ir2Data]);

    // --- CÁLCULOS IMPUESTO ACTIVOS (NUEVO ANEXO) ---
    const activosCalculated = useMemo(() => {
        const totalActivosA1 = a1Calculated.totalActivos; // Fuente Automática de A1
        const activosExentos = activosData.activosExentos;
        
        // Casilla: Base Imponible
        const baseImponible = Math.max(0, totalActivosA1 - activosExentos);
        
        // Casilla: Impuesto Liquidado (1%)
        const impuestoActivosCalculado = baseImponible * 0.01;
        
        // Casilla: Crédito ISR (Viene de IR-2)
        const creditoISRLiquidado = ir2Calculated.impuestoLiquidado;
        
        // Casilla: Diferencia a Pagar
        // Si ISR > Activos, no se paga Activos. Si Activos > ISR, se paga la diferencia.
        const diferenciaPagar = Math.max(0, impuestoActivosCalculado - creditoISRLiquidado);
        
        // Total a Pagar
        const totalPagar = Math.max(0, diferenciaPagar - activosData.pagosCuentaActivos - activosData.creditosAutorizadosActivos);

        return {
            totalActivosA1,
            baseImponible,
            impuestoActivosCalculado,
            creditoISRLiquidado,
            diferenciaPagar,
            totalPagar
        };
    }, [a1Calculated, activosData, ir2Calculated]);

    // Handlers
    const handleD1InputChange = (field: keyof AnexoD1Data, value: string) => setD1Data(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    const handleD2InputChange = (field: keyof AnexoD2Data, value: string) => setD2Data(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    const handleDInputChange = (field: keyof AnexoDData, value: string) => {
        setDData(prev => ({ ...prev, [field]: field === 'tipoInventario' ? value : (parseFloat(value) || 0) }));
    };
    const handleDDeepInputChange = (section: 'usoPropio' | 'arrendamiento' | 'ley392', cat: 'cat2' | 'cat3', field: string, value: string) => {
        setDData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [cat]: {
                    ...prev[section][cat],
                    [field]: parseFloat(value) || 0
                }
            }
        }));
    };
    const handleA1InputChange = (field: keyof AnexoA1Data, value: string) => setA1Data(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    const handleB1InputChange = (field: keyof AnexoB1Data, value: string) => setB1Data(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    
    // Handlers Anexo E
    const handleEInputChange = (field: keyof AnexoEData, value: string) => setEData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    const handleEPerdidaChange = (id: string, field: keyof PerdidaArrastrable, value: string) => {
        setEData(prev => ({
            ...prev,
            perdidas: prev.perdidas.map(p => p.id === id ? { ...p, [field]: field === 'year' ? value : (parseFloat(value) || 0) } : p)
        }));
    };

    // Handlers Anexo G
    const handleGInputChange = (field: keyof AnexoGData, value: string) => setGData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    const handleGDistribucionChange = (field: keyof typeof gData.distribucion, type: 'pos' | 'neg', value: string) => {
        setGData(prev => ({
            ...prev,
            distribucion: {
                ...prev.distribucion,
                [field]: { ...prev.distribucion[field], [type]: parseFloat(value) || 0 }
            }
        }));
    };
    
    // Handlers IR-2
    const handleIR2InputChange = (field: keyof IR2Data, value: string) => {
        setIr2Data(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    // Handlers Activos
    const handleActivosInputChange = (field: keyof ActivosData, value: string) => {
        setActivosData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    // Handlers Anexo H-1
    const handleH1ContactoChange = (field: keyof ContactoSociedad, value: string) => {
        setH1Data(prev => ({ ...prev, datosContacto: { ...prev.datosContacto, [field]: value } }));
    };

    const addAccionista = () => setH1Data(prev => ({
        ...prev, 
        accionistas: [...prev.accionistas, { id: Date.now().toString(), identificacion: '', nombreRazonSocial: '', domicilioFiscal: '', participacionAccionaria: 0, cargoConsejo: '' }] 
    }));
    const removeAccionista = (id: string) => setH1Data(prev => ({ ...prev, accionistas: prev.accionistas.filter(a => a.id !== id) }));
    const updateAccionista = (id: string, field: keyof Accionista, value: string) => setH1Data(prev => ({
        ...prev,
        accionistas: prev.accionistas.map(a => a.id === id ? { ...a, [field]: field === 'participacionAccionaria' ? (parseFloat(value) || 0) : value } : a)
    }));

    const addBeneficiario = () => setH1Data(prev => ({
        ...prev,
        beneficiariosFinales: [...prev.beneficiariosFinales, { id: Date.now().toString(), identificacion: '', nombre: '', nacionalidad: '', domicilioFiscal: '', telefono: '', participacionAccionaria: 0 }]
    }));
    const removeBeneficiario = (id: string) => setH1Data(prev => ({ ...prev, beneficiariosFinales: prev.beneficiariosFinales.filter(b => b.id !== id) }));
    const updateBeneficiario = (id: string, field: keyof BeneficiarioFinal, value: string) => setH1Data(prev => ({
        ...prev,
        beneficiariosFinales: prev.beneficiariosFinales.map(b => b.id === id ? { ...b, [field]: field === 'participacionAccionaria' ? (parseFloat(value) || 0) : value } : b)
    }));
    
    // Handlers Anexo H-2
    const handleH2Change = (field: keyof AnexoH2Data, value: any) => {
        setH2Data(prev => ({ ...prev, [field]: value }));
    };


    // Helpers UI
    const addD1Row = (type: any) => setD1Data(prev => ({ ...prev, [type]: [...prev[type], { id: Date.now().toString(), fecha: '', valor: 0, baseDepreciable: 0, proporcionNoDepreciada: 0, depreciacion: 0, costoFinal: 0 }] }));
    const removeD1Row = (type: any, id: string) => setD1Data(prev => ({ ...prev, [type]: prev[type].filter((i: any) => i.id !== id) }));
    const updateD1Row = (type: any, id: string, field: string, value: any) => {
        setD1Data(prev => ({
            ...prev, [type]: prev[type].map((item: any) => {
                if (item.id === id) {
                    const u = { ...item, [field]: value };
                    if (field === 'valor' || field === 'fecha') {
                        const val = field === 'valor' ? parseFloat(value) || 0 : item.valor;
                        const date = field === 'fecha' ? value : item.fecha;
                        u.valor = val; u.baseDepreciable = val;
                        if (type !== 'retiros') {
                            u.depreciacion = calcularDepreciacionProporcional(val, date);
                            u.costoFinal = val - u.depreciacion;
                        }
                    }
                    return u;
                }
                return item;
            })
        }));
    };

    const renderInputD2 = (label: string, field: keyof AnexoD2Data, sign: string = '') => (
        <div className="flex justify-between items-center py-1 text-sm border-b border-secondary-100 last:border-0" title={getFieldStructuralSource(field)}>
            <label className="text-secondary-600 flex-1 mr-2">{label}</label>
            <div className="flex items-center">
                {sign && <span className="font-bold text-secondary-400 mr-2 w-4 text-center">{sign}</span>}
                <input 
                    type="number" 
                    value={d2Data[field]} 
                    onChange={e => handleD2InputChange(field, e.target.value)} 
                    className="w-28 text-right border-secondary-200 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                    disabled={fiscalStatus?.status === 'LOCKED'}
                />
            </div>
        </div>
    );

    const renderCalculatedD2 = (label: string, value: number, isResult: boolean = false) => (
        <div className={`flex justify-between items-center py-2 ${isResult ? 'bg-primary-50 px-2 rounded font-bold border border-primary-200' : ''}`}>
            <label className={`${isResult ? 'text-primary-900' : 'text-secondary-700'}`}>{label}</label>
            <span className={`${isResult ? 'text-primary-800 text-lg' : 'text-secondary-900 font-mono'}`}>{formatCurrency(value)}</span>
        </div>
    );

    const renderD1Table = (title: string, type: 'adquisiciones' | 'mejoras' | 'retiros', items: ActivoDetalle[]) => (
        <div className="mt-4 border rounded-md p-3">
            <h4 className="font-bold text-xs uppercase mb-2">{title}</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                    <thead><tr className="bg-gray-50"><th className="text-left p-1">Fecha</th><th className="text-right p-1">Valor</th><th className="text-right p-1">Deprec.</th><th className="text-right p-1">Costo Final</th><th></th></tr></thead>
                    <tbody>
                        {items.map(i => (
                            <tr key={i.id}>
                                <td className="p-1"><input type="date" value={i.fecha} onChange={e=>updateD1Row(type, i.id, 'fecha', e.target.value)} className="w-full border-none p-0 text-xs" disabled={fiscalStatus?.status === 'LOCKED'}/></td>
                                <td className="p-1"><input type="number" value={i.valor} onChange={e=>updateD1Row(type, i.id, 'valor', e.target.value)} className="w-full text-right border-none p-0 text-xs" disabled={fiscalStatus?.status === 'LOCKED'}/></td>
                                <td className="p-1 text-right">{formatCurrency(i.depreciacion)}</td>
                                <td className="p-1 text-right font-bold">{formatCurrency(i.costoFinal)}</td>
                                <td className="p-1 text-center"><button onClick={()=>removeD1Row(type, i.id)} className="text-red-500" disabled={fiscalStatus?.status === 'LOCKED'}>x</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Button size="sm" variant="secondary" className="mt-1" onClick={() => addD1Row(type)} disabled={fiscalStatus?.status === 'LOCKED'}>+ Fila</Button>
            </div>
        </div>
    );

    const renderDistribucionRow = (label: string, monto: number, totalMonto: number, totalAjuste: number) => {
        const percent = totalMonto > 0 ? (monto / totalMonto) * 100 : 0;
        const ajuste = totalMonto > 0 ? (percent / 100) * totalAjuste : 0;
        return (
            <tr className="border-b border-secondary-100 last:border-0 hover:bg-secondary-50">
                <td className="py-1.5 pl-2 text-sm text-secondary-700">{label}</td>
                <td className="py-1.5 text-right font-mono text-sm pr-4">{formatCurrency(monto)}</td>
                <td className="py-1.5 text-right font-mono text-sm text-secondary-500 pr-4">{percent.toFixed(2)}%</td>
                <td className="py-1.5 text-right font-mono text-sm font-bold text-primary-700 pr-2">{formatCurrency(ajuste)}</td>
            </tr>
        );
    };

    // --- RENDERIZADO ANEXO D ---
    const renderDepreciationRow = (label: string, section: 'usoPropio' | 'arrendamiento' | 'ley392', field: string, calculated?: any) => (
        <tr className="border-b border-secondary-100 hover:bg-secondary-50">
            <td className="py-2 pl-2 text-sm text-secondary-700">{label}</td>
            <td className="py-2 pr-2 text-right">
                {calculated ? <span className="font-mono bg-gray-100 px-2 py-1 rounded">{formatCurrency(calculated[section + 'Cat2'][field])}</span> :
                <input type="number" value={dData[section].cat2[field as keyof typeof dData.usoPropio.cat2]} onChange={e => handleDDeepInputChange(section, 'cat2', field, e.target.value)} className="w-24 text-right border p-1 rounded text-sm" disabled={fiscalStatus?.status === 'LOCKED'}/>}
            </td>
            <td className="py-2 pr-2 text-right">
                {calculated ? <span className="font-mono bg-gray-100 px-2 py-1 rounded">{formatCurrency(calculated[section + 'Cat3'][field])}</span> :
                <input type="number" value={dData[section].cat3[field as keyof typeof dData.usoPropio.cat3]} onChange={e => handleDDeepInputChange(section, 'cat3', field, e.target.value)} className="w-24 text-right border p-1 rounded text-sm" disabled={fiscalStatus?.status === 'LOCKED'}/>}
            </td>
        </tr>
    );

    // --- RENDERIZADO ANEXO A-1 ---
    const renderA1Row = (label: string, field: keyof AnexoA1Data) => (
        <div className="flex justify-between items-center py-1 text-sm border-b border-secondary-100 last:border-0 hover:bg-secondary-50" title={getFieldStructuralSource(field)}>
            <label className="text-secondary-600 flex-1 mr-2">{label}</label>
            <input 
                type="number" 
                value={a1Data[field]} 
                onChange={e => handleA1InputChange(field, e.target.value)} 
                className="w-32 text-right border-secondary-200 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                disabled={fiscalStatus?.status === 'LOCKED'}
            />
        </div>
    );

    const renderA1Total = (label: string, value: number, isGrandTotal = false) => (
        <div className={`flex justify-between items-center py-2 ${isGrandTotal ? 'bg-primary-100 text-primary-900 border-t-2 border-primary-500 mt-2' : 'bg-secondary-100 text-secondary-900 font-bold mt-1'} px-2 rounded`}>
            <label className={`${isGrandTotal ? 'text-base font-bold' : 'text-sm'}`}>{label}</label>
            <span className={`${isGrandTotal ? 'text-lg' : 'text-base'} font-mono font-bold`}>{formatCurrency(value)}</span>
        </div>
    );

    // --- RENDERIZADO ANEXO B-1 ---
    const renderB1Row = (label: string, field: keyof AnexoB1Data, sign = '') => (
        <div className="flex justify-between items-center py-1 text-sm border-b border-secondary-100 last:border-0 hover:bg-secondary-50" title={getFieldStructuralSource(field)}>
            <label className="text-secondary-600 flex-1 mr-2">{label}</label>
            {sign && <span className="text-secondary-400 font-bold mr-2 w-4 text-center">{sign}</span>}
            <input 
                type="number" 
                value={b1Data[field]} 
                onChange={e => handleB1InputChange(field, e.target.value)} 
                className="w-32 text-right border-secondary-200 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                disabled={fiscalStatus?.status === 'LOCKED'}
            />
        </div>
    );

    // --- RENDERIZADO ANEXO E ---
    const renderERow = (label: string, field: keyof AnexoEData | string, isTotal = false, sign = '') => (
        <div className={`flex justify-between items-center py-1 text-sm ${isTotal ? 'bg-secondary-100 font-bold px-2 rounded mt-1' : 'border-b border-secondary-100 last:border-0'}`} title={isTotal ? undefined : getFieldStructuralSource(field)}>
            <label className={`${isTotal ? 'text-secondary-900' : 'text-secondary-600'} flex-1 mr-2`}>{label}</label>
            <div className="flex items-center">
                {sign && <span className="font-bold text-secondary-400 mr-2 w-4 text-center">{sign}</span>}
                {isTotal ? (
                    <span className="text-lg font-mono">{formatCurrency(
                        field === 'baseImponibleAnticipos' ? eCalculated.baseImponibleAnticipos : 
                        field === 'totalIngresos' ? eCalculated.totalIngresos : 0
                    )}</span>
                ) : (
                    <input 
                        type="number" 
                        value={eData[field as keyof AnexoEData] as number} 
                        onChange={e => handleEInputChange(field as keyof AnexoEData, e.target.value)} 
                        className="w-32 text-right border-secondary-200 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                        disabled={fiscalStatus?.status === 'LOCKED'}
                    />
                )}
            </div>
        </div>
    );

    // --- RENDERIZADO ANEXO G ---
    const renderGInput = (label: string, field: keyof AnexoGData) => (
        <div className="flex justify-between items-center py-1 text-sm border-b border-secondary-100 last:border-0 hover:bg-secondary-50" title={getFieldStructuralSource(field)}>
            <label className="text-secondary-600 flex-1 mr-2">{label}</label>
            <input 
                type="number" 
                value={gData[field] as number} 
                onChange={e => handleGInputChange(field, e.target.value)} 
                className="w-32 text-right border-secondary-200 rounded p-1 text-sm focus:ring-primary focus:border-primary"
                disabled={fiscalStatus?.status === 'LOCKED'}
            />
        </div>
    );

    const renderGDistribucionRow = (label: string, field: keyof typeof gData.distribucion) => (
        <div className="flex justify-between items-center py-1 text-sm border-b border-secondary-100 last:border-0 hover:bg-secondary-50">
            <label className="text-secondary-600 flex-1 mr-2">{label}</label>
            <div className="flex space-x-2">
                <input 
                    type="number" 
                    placeholder="Positivo"
                    value={(gData.distribucion[field] as DistribucionAjuste).pos} 
                    onChange={e => handleGDistribucionChange(field, 'pos', e.target.value)} 
                    className="w-24 text-right border-secondary-200 rounded p-1 text-sm focus:ring-primary focus:border-primary text-green-700 font-medium"
                    disabled={fiscalStatus?.status === 'LOCKED'}
                />
                <input 
                    type="number" 
                    placeholder="Negativo"
                    value={(gData.distribucion[field] as DistribucionAjuste).neg} 
                    onChange={e => handleGDistribucionChange(field, 'neg', e.target.value)} 
                    className="w-24 text-right border-secondary-200 rounded p-1 text-sm focus:ring-primary focus:border-primary text-red-700 font-medium"
                    disabled={fiscalStatus?.status === 'LOCKED'}
                />
            </div>
        </div>
    );

    // --- RENDERIZADO ANEXO J ---
    const renderJRow = (label: string, dataKey: keyof AnexoJData) => {
        const item = jCalculated.data[dataKey];
        return (
            <tr className="border-b border-secondary-100 last:border-0 hover:bg-secondary-50">
                <td className="py-1.5 pl-2 text-sm text-secondary-700">{label}</td>
                <td className="py-1.5 text-center font-mono text-sm">{item.cantidad}</td>
                <td className="py-1.5 text-right font-mono text-sm pr-2">{formatCurrency(item.monto)}</td>
            </tr>
        );
    };

    // --- RENDERIZADO IR-2 ---
    const renderIR2Row = (label: string, field: keyof IR2Data | null, valueOverride?: number, sign: string = '', isTotal: boolean = false, isHeader: boolean = false) => (
        <div className={`flex justify-between items-center py-1 text-sm ${isHeader ? 'bg-primary-50 px-2 rounded mb-1 font-bold text-primary-900 border border-primary-200' : (isTotal ? 'bg-secondary-200 px-2 rounded mt-1 font-bold text-secondary-900' : 'border-b border-secondary-100 last:border-0 hover:bg-secondary-50')}`} title={field ? getFieldStructuralSource(field) : undefined}>
            <label className={`flex-1 mr-2 ${isTotal || isHeader ? '' : 'text-secondary-700'}`}>{label}</label>
            <div className="flex items-center">
                {sign && <span className="font-bold text-secondary-400 mr-2 w-4 text-center">{sign}</span>}
                {field ? (
                     <input 
                        type="number" 
                        value={ir2Data[field]} 
                        onChange={e => handleIR2InputChange(field, e.target.value)} 
                        className="w-36 text-right border-secondary-300 rounded p-1 text-sm focus:ring-primary focus:border-primary font-mono"
                        disabled={fiscalStatus?.status === 'LOCKED'}
                    />
                ) : (
                    <span className={`w-36 text-right p-1 font-mono ${isTotal ? 'text-lg' : 'text-base'} ${valueOverride && valueOverride < 0 ? 'text-red-600' : 'text-secondary-900'}`}>
                        {formatCurrency(valueOverride || 0)}
                    </span>
                )}
            </div>
        </div>
    );
    
    // --- RENDERIZADO IMPUESTO ACTIVOS ---
    const renderActivosRow = (label: string, field: keyof ActivosData | null, valueOverride?: number, sign: string = '', isTotal: boolean = false, isHeader: boolean = false, isCalculated: boolean = false) => (
        <div className={`flex justify-between items-center py-1 text-sm ${isHeader ? 'bg-primary-50 px-2 rounded mb-1 font-bold text-primary-900 border border-primary-200' : (isTotal ? 'bg-secondary-200 px-2 rounded mt-1 font-bold text-secondary-900' : 'border-b border-secondary-100 last:border-0 hover:bg-secondary-50')}`} title={field ? getFieldStructuralSource(field) : (valueOverride !== undefined ? getFieldStructuralSource(label) : undefined)}>
            <label className={`flex-1 mr-2 ${isTotal || isHeader ? '' : 'text-secondary-700'}`}>{label}</label>
            <div className="flex items-center">
                {sign && <span className="font-bold text-secondary-400 mr-2 w-4 text-center">{sign}</span>}
                {field ? (
                     <input 
                        type="number" 
                        value={activosData[field]} 
                        onChange={e => handleActivosInputChange(field, e.target.value)} 
                        className="w-36 text-right border-secondary-300 rounded p-1 text-sm focus:ring-primary focus:border-primary font-mono"
                        disabled={fiscalStatus?.status === 'LOCKED'}
                    />
                ) : (
                    <span className={`w-36 text-right p-1 font-mono ${isTotal ? 'text-lg' : 'text-base'} ${isCalculated ? 'bg-gray-100 rounded text-secondary-800' : (valueOverride && valueOverride < 0 ? 'text-red-600' : 'text-secondary-900')}`}>
                        {formatCurrency(valueOverride || 0)}
                    </span>
                )}
            </div>
        </div>
    );

    const getConfidenceBadge = (level: NivelConfianza) => {
        switch (level) {
            case 'ALTO':
                return <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded flex items-center"><ShieldCheckIcon className="h-4 w-4 mr-1"/>CONFIANZA ALTA</span>;
            case 'MEDIO':
                return <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded flex items-center"><InformationCircleIcon className="h-4 w-4 mr-1"/>CONFIANZA MEDIA</span>;
            case 'BAJO':
                return <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded flex items-center"><InformationCircleIcon className="h-4 w-4 mr-1"/>CONFIANZA BAJA</span>;
            default:
                return null;
        }
    };
    
    const getActivityBadge = () => {
        if (!evaluacionActividad) return null;
        const { estadoGeneral } = evaluacionActividad;
        
        switch (estadoGeneral) {
            case 'OPERATIVA':
                return <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center ml-2">ACT. COMERCIAL</span>;
            case 'SOLO_PATRIMONIAL':
                return <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center ml-2">ACT. PATRIMONIAL</span>;
            case 'SIN_ACTIVIDAD':
                return <span className="bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center ml-2">SIN ACTIVIDAD</span>;
            default:
                return null;
        }
    };

    const renderInput = (label: string, field: string, value: string, onChange: (val: string) => void) => (
        <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">{label}</label>
            <input 
                type="text" 
                value={value} 
                onChange={e => onChange(e.target.value)}
                className="w-full border-secondary-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                disabled={fiscalStatus?.status === 'LOCKED'}
            />
        </div>
    );

    return (
        <div className="pb-10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Declaración Jurada Anual (IR-2)</h1>
                    <p className="text-secondary-600 text-sm">Empresa: {selectedTenant?.nombre} | RNC: {selectedTenant?.rnc}</p>
                </div>
                <div className="flex items-center space-x-4">
                    {fiscalStatus?.status === 'LOCKED' ? (
                        <div className="flex items-center space-x-2">
                            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-sm"><KeyIcon className="h-4 w-4 mr-1"/> EJERCICIO CERRADO</span>
                            <Button size="sm" variant="secondary" onClick={handleReapertura}>Reabrir</Button>
                        </div>
                    ) : (
                        <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white" 
                            leftIcon={<KeyIcon className="h-4 w-4" />}
                            onClick={handleCierreFiscal}
                        >
                            Cerrar Ejercicio Fiscal
                        </Button>
                    )}
                    {confidenceLevel && getConfidenceBadge(confidenceLevel)}
                    {getActivityBadge()}
                    <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<DocumentChartBarIcon className="h-5 w-5" />}
                        onClick={() => setIsAuditModalOpen(true)}
                    >
                        Ver Desglose Contable
                    </Button>
                    <div className="flex items-center space-x-2 bg-white p-2 rounded shadow-sm border border-secondary-200">
                        <span className="text-sm font-semibold text-secondary-700">Año Fiscal:</span>
                        <input type="number" value={periodoFiscal} onChange={(e) => setPeriodoFiscal(parseInt(e.target.value))} className="w-20 p-1 border rounded font-bold text-center"/>
                    </div>
                </div>
            </div>
            
            {evaluacionActividad && (
                <div className="mb-6 bg-white p-4 rounded shadow-sm border-l-4 border-blue-500">
                    <h3 className="font-bold text-secondary-800 mb-2">Evaluación del Período Fiscal</h3>
                    <div className="flex space-x-6 text-sm">
                        <div className="flex items-center">
                            <span className={`h-3 w-3 rounded-full mr-2 ${evaluacionActividad.huboActividadComercial ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            <span className="text-secondary-600">Actividad Comercial (Ingresos/Gastos)</span>
                        </div>
                        <div className="flex items-center">
                            <span className={`h-3 w-3 rounded-full mr-2 ${evaluacionActividad.huboActividadContable ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            <span className="text-secondary-600">Movimientos Contables</span>
                        </div>
                         <div className="flex items-center">
                            <span className={`h-3 w-3 rounded-full mr-2 ${evaluacionActividad.tieneActivosVigentes ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                            <span className="text-secondary-600">Activos Vigentes</span>
                        </div>
                        <div className="flex items-center">
                            <span className={`h-3 w-3 rounded-full mr-2 ${evaluacionActividad.soloArrastreHistorico ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
                            <span className="text-secondary-600">Arrastre Histórico</span>
                        </div>
                    </div>
                </div>
            )}
            
            {blockingErrors.length > 0 && (
                <div className="mb-6 bg-red-100 border-l-4 border-red-600 p-4 rounded shadow-md animate-fade-in">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <InformationCircleIcon className="h-5 w-5 text-red-700" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-red-900 uppercase tracking-wide">IMPOSIBLE CERRAR EJERCICIO: ERRORES CRÍTICOS DETECTADOS</h3>
                            <div className="mt-2 text-sm text-red-800">
                                <ul className="list-disc pl-5 space-y-1">
                                    {blockingErrors.map((err, idx) => (
                                        <li key={idx} className="font-medium">{err.message}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {fiscalWarnings.length > 0 && blockingErrors.length === 0 && (
                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded shadow-sm animate-fade-in">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <InformationCircleIcon className="h-5 w-5 text-yellow-600" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-yellow-800 uppercase tracking-wide">Atención: Riesgo Fiscal Detectado</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {fiscalWarnings.map((w, idx) => (
                                        <li key={idx}>{w.message}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <DetalleOrigenDatosModal 
                isOpen={isAuditModalOpen} 
                onClose={() => setIsAuditModalOpen(false)} 
                auditData={auditData} 
            />

            <div className="flex space-x-1 overflow-x-auto pb-4 mb-4 border-b border-secondary-200">
                {['D2', 'D1', 'D', 'A1', 'B1', 'E', 'G', 'H1', 'H2', 'J', 'IR2', 'ACTIVOS'].map(step => (
                    <button
                        key={step}
                        onClick={() => setCurrentStep(step as any)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${currentStep === step ? 'bg-primary text-white shadow-md' : 'bg-white text-secondary-600 hover:bg-secondary-100 border'}`}
                    >
                        {step === 'IR2' ? 'IR-2 FINAL' : step === 'ACTIVOS' ? 'IMPUESTO ACTIVOS' : `ANEXO ${step}`}
                    </button>
                ))}
            </div>
            
            {/* --- VISTAS PREVIAS D2 & D1 --- */}
            {/* ... (Existing code for D2) ... */}
            {currentStep === 'D2' && (
                <div className="animate-fade-in space-y-6">
                    <Card className="border-t-4 border-blue-600">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div><CardTitle>ANEXO D2 - DETERMINACIÓN AJUSTE FISCAL</CardTitle></div>
                                <div className="flex items-center space-x-2">
                                    <Button 
                                        size="sm" 
                                        variant="secondary" 
                                        onClick={handleRecalcularMotorFiscal} 
                                        disabled={isFiscalEngineLoading || fiscalStatus?.status === 'LOCKED'}
                                        leftIcon={<SparklesIcon className={isFiscalEngineLoading ? "animate-spin" : "text-purple-500"} />}
                                    >
                                        {isFiscalEngineLoading ? 'Calculando...' : 'Recalcular con Motor Fiscal'}
                                    </Button>
                                    <p className="text-xs font-bold text-secondary-400">DGII FORM D-2</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-secondary-50 p-4 rounded border">
                                        <h3 className="font-bold text-primary-800 border-b pb-2 mb-3">1. Activos Fiscales</h3>
                                        {renderInputD2('1.- Total Activos (Libros)', 'totalActivosLibros')}
                                        {renderInputD2('2.- Provisiones y Reservas (no admitidas)', 'provisionesReservas', '+')}
                                        {renderInputD2('3.- ISR Diferido', 'impuestoDiferidoActivo', '+')}
                                        {renderInputD2('4.- CxC no giro negocio', 'cuentasPorCobrarNoGiro', '-')}
                                        {renderInputD2('5.- Costo Terrenos (Libros)', 'costoTerrenosLibros', '-')}
                                        {renderInputD2('6.- Costo Acciones (Libros)', 'costoAccionesLibros', '-')}
                                        {renderInputD2('7.- Costo Edificio (Libros)', 'costoEdificioLibros', '-')}
                                        {renderInputD2('8.- Costo Constr. Proceso (Libros)', 'costoConstrProcesoLibros', '-')}
                                        {renderInputD2('9.- Costo Activo Constr. (Libros)', 'costoActivoConstrLibros', '-')}
                                        {renderInputD2('10.- Costo Cat. 2 (Libros)', 'costoCat2Libros', '-')}
                                        {renderInputD2('11.- Costo Cat. 3 (Libros)', 'costoCat3Libros', '-')}
                                        {renderInputD2('12.- Costo Cat. 2 Arrend. (Libros)', 'costoCat2ArrendLibros', '-')}
                                        {renderInputD2('13.- Costo Cat. 3 Arrend. (Libros)', 'costoCat3ArrendLibros', '-')}
                                        {renderInputD2('14.- Otros Activos (Libros)', 'otrosActivosLibros', '-')}
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded border">
                                        <h3 className="font-bold text-primary-800 border-b pb-2 mb-3">2. Adiciones Fiscales</h3>
                                        {renderCalculatedD2('15.- Costo Fiscal Cat. 1', d2Calculated.costoFiscalCat1)}
                                        {renderInputD2('16.- Costo Fiscal Cat. 2', 'costoFiscalCat2', '+')}
                                        {renderInputD2('17.- Costo Fiscal Activo Constr.', 'costoFiscalActivoConstr', '+')}
                                        {renderInputD2('18.- Costo Fiscal Cat. 3', 'costoFiscalCat3', '+')}
                                        {renderInputD2('19.- Costo Fiscal Cat. 2 Arrend.', 'costoFiscalCat2Arrend', '+')}
                                        {renderInputD2('20.- Costo Fiscal Cat. 3 Arrend.', 'costoFiscalCat3Arrend', '+')}
                                        {renderInputD2('21.- Costo Fiscal Terrenos', 'costoFiscalTerrenos', '+')}
                                        {renderInputD2('22.- Costo Fiscal Acciones', 'costoFiscalAcciones', '+')}
                                        {renderInputD2('23.- Reevaluación Activos', 'reevaluacionActivos', '-')}
                                        {renderInputD2('24.- Mejoras Prop. Arrendadas', 'mejorasPropArrendadas', '+')}
                                        {renderInputD2('25.- Costo Fiscal Otros Activos', 'costoFiscalOtrosActivos', '+')}
                                    </div>
                                    {renderCalculatedD2('TOTAL ACTIVOS (Ajustado)', d2Calculated.totalActivosFiscales, true)}
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="bg-red-50 p-4 rounded border">
                                        <h3 className="font-bold text-red-800 border-b pb-2 mb-3">3. Pasivos y Patrimonio</h3>
                                        {renderInputD2('26.- Total Pasivos (Libros)', 'totalPasivosLibros')}
                                        {renderInputD2('27.- ISR Diferido Pasivo', 'impuestoDiferidoPasivo', '-')}
                                        {renderInputD2('28.- Provisiones Pasivo', 'provisionesReservasPasivo', '-')}
                                        {renderInputD2('29.- Otros Pasivos', 'otrosPasivos', '-')}
                                        {renderCalculatedD2('TOTAL PASIVOS (Ajustado)', d2Calculated.saldoPasivos)}
                                    </div>
                                    
                                    <div className="bg-green-50 p-4 rounded border border-green-200">
                                        <h3 className="font-bold text-green-800 border-b pb-2 mb-3">4. Ajuste por Inflación</h3>
                                        {renderCalculatedD2('30.- Patrimonio Fiscal (Activo - Pasivo)', d2Calculated.patrimonioFiscal)}
                                        {renderCalculatedD2('31.- Total Activos No Monetarios', d2Calculated.totalActivosNoMonetarios)}
                                        {renderCalculatedD2('32.- Base de Cálculo Ajuste', d2Calculated.baseAjuste)}
                                        {renderInputD2('33.- Multiplicador Ajuste (%)', 'multiplicadorAjuste')}
                                        {renderCalculatedD2('34.- AJUSTE FISCAL PATRIMONIAL', d2Calculated.ajusteFiscalPatrimonial, true)}
                                    </div>

                                    <div className="p-4 rounded border bg-yellow-50/50">
                                        <h3 className="font-bold text-yellow-800 border-b pb-2 mb-3">5. Inventario</h3>
                                        {renderInputD2('Inventario Final (Libros)', 'inventario')}
                                        {renderCalculatedD2('Ajuste por Inflación Inventario', d2Calculated.ajusteInventario)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {currentStep === 'D1' && (
                <div className="animate-fade-in space-y-6">
                    <Card>
                        <CardHeader><CardTitle>ANEXO D1 - DATOS INFORMATIVOS DEP. CAT 1</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-primary">I. Base Depreciable</h3>
                                    <div className="flex justify-between items-center"><label>Balance Depreciable Inicial:</label><input type="number" value={d1Data.balanceInicial} onChange={e => handleD1InputChange('balanceInicial', e.target.value)} className="w-32 border rounded p-1 text-right" disabled={fiscalStatus?.status === 'LOCKED'}/></div>
                                    <div className="flex justify-between items-center"><label>Ajuste Fiscal (D-2):</label><input type="number" value={d1Data.ajusteFiscal} onChange={e => handleD1InputChange('ajusteFiscal', e.target.value)} className="w-32 border rounded p-1 text-right" disabled={fiscalStatus?.status === 'LOCKED'}/></div>
                                    <div className="flex justify-between items-center"><label>Retiros (Ajustados):</label><input type="number" value={d1Data.retirosAjuste} onChange={e => handleD1InputChange('retirosAjuste', e.target.value)} className="w-32 border rounded p-1 text-right" disabled={fiscalStatus?.status === 'LOCKED'}/></div>
                                    <div className="border-t pt-2 font-bold flex justify-between"><span>Base Depreciable Ajustada:</span><span>{formatCurrency(d1Calculated.baseDepreciableI)}</span></div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-primary">Resumen</h3>
                                    <div className="flex justify-between"><span>Depreciación Activos Existentes:</span><span>{formatCurrency(d1Calculated.depreciacionI)}</span></div>
                                    <div className="flex justify-between"><span>Depreciación Adiciones:</span><span>{formatCurrency(d1Calculated.sumAdquisiciones.depreciacion)}</span></div>
                                    <div className="flex justify-between"><span>Depreciación Mejoras:</span><span>{formatCurrency(d1Calculated.sumMejoras.depreciacion)}</span></div>
                                    <div className="border-t pt-2 font-bold text-lg flex justify-between bg-gray-100 p-2 rounded"><span>TOTAL DEPRECIACIÓN:</span><span>{formatCurrency(d1Calculated.totalDepreciacion)}</span></div>
                                    <div className="font-bold text-lg flex justify-between bg-primary-100 p-2 rounded text-primary-900"><span>COSTO FISCAL AL CIERRE:</span><span>{formatCurrency(d1Calculated.totalCostoFiscalFinal)}</span></div>
                                </div>
                            </div>

                            {renderD1Table('II. Adiciones de Activos', 'adquisiciones', d1Data.adquisiciones)}
                            {renderD1Table('III. Mejoras Capitalizables', 'mejoras', d1Data.mejoras)}
                        </CardContent>
                    </Card>
                </div>
            )}

            {currentStep === 'D' && (
                <div className="animate-fade-in space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between">
                                <CardTitle>ANEXO D - COSTO DE VENTA Y DEPRECIACIÓN</CardTitle>
                                <p className="text-xs font-bold text-secondary-400">DGII FORM D</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-primary mb-4 border-b pb-2">III. Cálculo Depreciación (Categorías 2 y 3)</h3>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-100"><th className="text-left p-2">Concepto</th><th className="text-right p-2">Categoría 2 (25%)</th><th className="text-right p-2">Categoría 3 (15%)</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr className="font-bold bg-gray-50"><td colSpan={3} className="p-2 text-xs uppercase text-gray-500">A) Activos en Propiedad</td></tr>
                                            {renderDepreciationRow('14. Balance Inicial', 'usoPropio', 'balanceInicial')}
                                            {renderDepreciationRow('15. Ajuste Fiscal (D2)', 'usoPropio', 'ajusteFiscal')}
                                            {renderDepreciationRow('16. Adiciones', 'usoPropio', 'totalAdiciones')}
                                            {renderDepreciationRow('17. Adic. Sujetas Deprec. (50%)', 'usoPropio', 'adicionesImponibles', dCalculated)}
                                            {renderDepreciationRow('18. Retiros', 'usoPropio', 'retiros')}
                                            {renderDepreciationRow('19. Base Depreciable', 'usoPropio', 'baseAjustada', dCalculated)}
                                            {renderDepreciationRow('20. Depreciación', 'usoPropio', 'depreciacion', dCalculated)}
                                            {renderDepreciationRow('21. Adic. No Sujetas (50%)', 'usoPropio', 'adicionNoDepreciada', dCalculated)}
                                            {renderDepreciationRow('22. Costo Fiscal Final', 'usoPropio', 'costoFiscalFinal', dCalculated)}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-secondary-50 p-4 rounded border">
                                        <h3 className="font-bold text-primary mb-4 border-b pb-2">IV. Costo de Venta</h3>
                                        <div className="flex space-x-4 mb-4">
                                            <label className="flex items-center"><input type="radio" name="tipoInv" value="1" checked={dData.tipoInventario === '1'} onChange={e => handleDInputChange('tipoInventario', e.target.value)} className="mr-2"/> Comerciante</label>
                                            <label className="flex items-center"><input type="radio" name="tipoInv" value="2" checked={dData.tipoInventario === '2'} onChange={e => handleDInputChange('tipoInventario', e.target.value)} className="mr-2"/> Industrial</label>
                                            <label className="flex items-center"><input type="radio" name="tipoInv" value="3" checked={dData.tipoInventario === '3'} onChange={e => handleDInputChange('tipoInventario', e.target.value)} className="mr-2"/> Agro</label>
                                        </div>
                                        
                                        {dData.tipoInventario === '1' ? (
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center"><label>Inventario Inicial:</label><input type="number" value={dData.cv_inventarioInicial} onChange={e=>handleDInputChange('cv_inventarioInicial', e.target.value)} className="w-28 text-right border rounded p-1" disabled={fiscalStatus?.status === 'LOCKED'}/></div>
                                                <div className="flex justify-between items-center"><label>Compras Locales:</label><input type="number" value={dData.cv_comprasLocales} onChange={e=>handleDInputChange('cv_comprasLocales', e.target.value)} className="w-28 text-right border rounded p-1" disabled={fiscalStatus?.status === 'LOCKED'}/></div>
                                                <div className="flex justify-between items-center"><label>Compras Exterior:</label><input type="number" value={dData.cv_comprasExterior} onChange={e=>handleDInputChange('cv_comprasExterior', e.target.value)} className="w-28 text-right border rounded p-1" disabled={fiscalStatus?.status === 'LOCKED'}/></div>
                                                <div className="flex justify-between items-center"><label>(-) Inventario Final:</label><input type="number" value={dData.cv_inventarioFinal} onChange={e=>handleDInputChange('cv_inventarioFinal', e.target.value)} className="w-28 text-right border rounded p-1" disabled={fiscalStatus?.status === 'LOCKED'}/></div>
                                                <div className="flex justify-between font-bold pt-2 border-t mt-2"><span>COSTO DE VENTA:</span><span>{formatCurrency(dCalculated.costoVentaComercial)}</span></div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-500 py-8 italic">Seleccione 'Comerciante' para esta versión simplificada.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* --- VISTAS PREVIAS A-1 & B-1 --- */}
            {currentStep === 'A1' && (
                <div className="animate-fade-in space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div><CardTitle>ANEXO A-1 - BALANCE GENERAL</CardTitle></div>
                                <div className="flex items-center space-x-2">
                                    <Button 
                                        size="sm" 
                                        variant="secondary" 
                                        onClick={handleSincronizarAsientos} 
                                        disabled={isSyncing || fiscalStatus?.status === 'LOCKED'}
                                        leftIcon={<ArrowPathIcon className={isSyncing ? "animate-spin" : ""} />}
                                    >
                                        {isSyncing ? 'Sincronizando...' : 'Sincronizar Asientos'}
                                    </Button>
                                    <p className="text-xs font-bold text-secondary-400">DGII FORM A-1</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-primary mb-3">ACTIVOS</h3>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-secondary-500 uppercase mt-2">Corrientes</h4>
                                        {renderA1Row('Efectivo en Caja y Banco', 'cajaBancos')}
                                        {renderA1Row('Cuentas por Cobrar Clientes', 'cxcClientes')}
                                        {renderA1Row('Inventarios', 'invMercancias')}
                                        {renderA1Row('Gastos Pagados por Adelantado', 'gastosPagadosAdelantado')}
                                        {renderA1Row('Impuestos Adelantados', 'otrosActivosCorrientes')}
                                        {renderA1Total('TOTAL ACTIVOS CORRIENTES', a1Calculated.totalActivosCorrientes)}

                                        <h4 className="text-xs font-bold text-secondary-500 uppercase mt-4">Fijos</h4>
                                        {renderA1Row('Edificaciones (Cat 1)', 'edificacionesCat1')}
                                        {renderA1Row('Automóviles y Equipos (Cat 2)', 'automovilesEquiposCat2')}
                                        {renderA1Row('Otros Activos (Cat 3)', 'otrosActivosCat3')}
                                        {renderA1Row('Terrenos', 'activosNoDeprecUrbano')}
                                        {renderA1Total('TOTAL ACTIVOS FIJOS', a1Calculated.totalActivosFijos)}
                                        
                                        <h4 className="text-xs font-bold text-secondary-500 uppercase mt-4 text-red-600">Menos: Provisiones</h4>
                                        {renderA1Row('Depreciación Acumulada', 'deprecAcumCat1')}
                                        {renderA1Total('TOTAL ACTIVOS', a1Calculated.totalActivos, true)}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary mb-3">PASIVOS Y CAPITAL</h3>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-secondary-500 uppercase mt-2">Pasivos</h4>
                                        {renderA1Row('Préstamos Corto Plazo', 'prestamosCorto')}
                                        {renderA1Row('Cuentas por Pagar Proveedores', 'cxp')}
                                        {renderA1Row('Impuestos por Pagar', 'impuestosPorPagar')}
                                        {renderA1Row('Otras Cuentas por Pagar', 'otrasCxp')}
                                        {renderA1Total('TOTAL PASIVOS CORRIENTES', a1Calculated.totalAcreedoresCortoPlazo)}
                                        
                                        {renderA1Row('Préstamos Largo Plazo', 'prestamosLocales')}
                                        {renderA1Total('TOTAL PASIVOS LARGO PLAZO', a1Calculated.totalAcreedoresLargoPlazo)}

                                        <h4 className="text-xs font-bold text-secondary-500 uppercase mt-4">Capital</h4>
                                        {renderA1Row('Capital Suscrito y Pagado', 'capitalSuscritoPagado')}
                                        {renderA1Row('Reserva Legal', 'reservaLegal')}
                                        {renderA1Row('Resultados Acumulados', 'beneficiosEjerciciosAnteriores')}
                                        {renderA1Row('Resultado del Ejercicio', 'beneficioEjercicioActual')}
                                        {renderA1Total('TOTAL CAPITAL', a1Calculated.totalPatrimonio)}

                                        {renderA1Total('TOTAL PASIVO Y CAPITAL', a1Calculated.totalPasivosYPatrimonio, true)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {currentStep === 'B1' && (
                <div className="animate-fade-in space-y-6">
                    <Card>
                        <CardHeader><CardTitle>ANEXO B-1 - ESTADO DE RESULTADOS</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-primary mb-3">INGRESOS</h3>
                                    {renderB1Row('Ventas Locales', 'ingVentasLocales')}
                                    {renderB1Row('Exportaciones', 'ingExportaciones')}
                                    {renderB1Row('Devoluciones', 'devolucionesVenta', '-')}
                                    {renderB1Row('Otros Ingresos', 'otrosIngresos')}
                                    {renderA1Total('TOTAL INGRESOS', b1Calculated.totalIngresos, true)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary mb-3">COSTOS Y GASTOS</h3>
                                    {renderB1Row('Costo de Venta', 'costoVenta')}
                                    {renderB1Row('Gastos de Personal', 'sueldosSalarios')}
                                    {renderB1Row('Seguridad Social', 'aportacionSeguridadSocial')}
                                    {renderB1Row('Servicios / Honorarios', 'otrosGastosTrabajos')}
                                    {renderB1Row('Arrendamientos', 'arrendamientoFisicas')}
                                    {renderB1Row('Depreciación', 'deprecCat1')}
                                    {renderB1Row('Combustibles y Lubricantes', 'otrosGastosExtraordinarios')}
                                    {renderB1Row('Gastos Financieros', 'finInstLocales')}
                                    {renderA1Total('TOTAL COSTOS Y GASTOS', b1Calculated.totalCostosYGastos, true)}
                                </div>
                            </div>
                            <div className="mt-6 flex justify-center">
                                <div className="bg-primary-50 p-4 rounded border border-primary-200 text-center w-full max-w-md">
                                    <h4 className="text-sm uppercase font-bold text-primary-900">Resultado del Ejercicio</h4>
                                    <p className={`text-3xl font-black font-mono ${b1Calculated.beneficioPerdida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(b1Calculated.beneficioPerdida)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {currentStep === 'E' && (
                <div className="animate-fade-in space-y-6">
                    <Card>
                        <CardHeader><CardTitle>ANEXO E - DATOS COMPLEMENTARIOS</CardTitle></CardHeader>
                        <CardContent>
                            <h3 className="font-bold text-primary mb-3">A. Arrastre de Pérdidas</h3>
                            <div className="overflow-x-auto mb-6">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-secondary-100">
                                            <th className="p-2 text-left">Año</th>
                                            <th className="p-2 text-right">Pérdida Inicial</th>
                                            <th className="p-2 text-center">% Inflación</th>
                                            <th className="p-2 text-right">Ajuste</th>
                                            <th className="p-2 text-right">Perdida Ajustada</th>
                                            <th className="p-2 text-center">% Renta</th>
                                            <th className="p-2 text-right">Compensable</th>
                                            <th className="p-2 text-right font-bold bg-yellow-50">Pendiente</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eCalculated.perdidasCalculadas.map((p) => (
                                            <tr key={p.id} className="border-b">
                                                <td className="p-1"><input className="w-16 border rounded p-1" value={p.year} onChange={e=>handleEPerdidaChange(p.id, 'year', e.target.value)} disabled={fiscalStatus?.status === 'LOCKED'}/></td>
                                                <td className="p-1"><input type="number" className="w-24 text-right border rounded p-1" value={p.perdidaInicial} onChange={e=>handleEPerdidaChange(p.id, 'perdidaInicial', e.target.value)} disabled={fiscalStatus?.status === 'LOCKED'}/></td>
                                                <td className="p-1"><input type="number" className="w-16 text-center border rounded p-1" value={p.indiceInflacion} onChange={e=>handleEPerdidaChange(p.id, 'indiceInflacion', e.target.value)} disabled={fiscalStatus?.status === 'LOCKED'}/></td>
                                                <td className="p-1 text-right text-xs">{formatCurrency(p.cantidadAjuste)}</td>
                                                <td className="p-1 text-right font-mono">{formatCurrency(p.perdidaAjustada)}</td>
                                                <td className="p-1"><input type="number" className="w-12 text-center border rounded p-1" value={p.porcentajeRenta} onChange={e=>handleEPerdidaChange(p.id, 'porcentajeRenta', e.target.value)} disabled={fiscalStatus?.status === 'LOCKED'}/></td>
                                                <td className="p-1 text-right font-bold text-green-700">{formatCurrency(p.compensablePeriodo)}</td>
                                                <td className="p-1 text-right font-bold bg-yellow-50">{formatCurrency(p.perdidaPendiente)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 font-bold">
                                            <td colSpan={6} className="p-2 text-right">Total Compensable Período:</td>
                                            <td className="p-2 text-right text-green-700">{formatCurrency(eCalculated.totalesA.totalCompensablePeriodo)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-primary mb-3">B. Distribución de Beneficios</h3>
                                    {renderERow('7. Dividendos Pagados', 'dividendos')}
                                    {renderERow('8. Reservas Voluntarias', 'reservas')}
                                    {renderERow('9. Utilidades No Distribuidas', 'utilidadesNoDistribuidas')}
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary mb-3">D. Base Cálculo Anticipos</h3>
                                    {renderERow('15. Total Ingresos (B-1)', 'totalIngresos', true)}
                                    {renderERow('16. Ganancia Capital (Libros)', 'gananciaCapitalLibros', false, '-')}
                                    {renderERow('17. Ganancia Bienes Deprec.', 'gananciaBienesDepreciablesLibros', false, '-')}
                                    {renderERow('18. Dividendos Exentos', 'dividendosExentos', false, '-')}
                                    {renderERow('19. Intereses Exentos', 'interesesExentos', false, '-')}
                                    {renderERow('BASE IMPONIBLE ANTICIPOS', 'baseImponibleAnticipos', true)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {currentStep === 'G' && (
                <div className="animate-fade-in space-y-6">
                    <Card>
                        <CardHeader><CardTitle>ANEXO G - AJUSTES FISCALES</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <h3 className="font-bold text-red-700 border-b border-red-200 pb-2 mb-3">1. Ajustes Positivos (Aumentan Renta)</h3>
                                    {renderGInput('1.1 Impuestos s/Renta no deducibles', 'impuestosNoDeducibles')}
                                    {renderGInput('1.2 Exceso Depreciación', 'excesoDepreciacion')}
                                    {renderGInput('1.4 Exceso Prov. Incobrables', 'excesoProvisionIncobrables')}
                                    {renderGInput('1.5 Exceso Donaciones', 'excesoDonaciones')}
                                    {renderGInput('1.10 Intereses no Deducibles', 'gastosInteresesNoDeducibles')}
                                    {renderGInput('1.13 Gastos sin Comprobantes', 'gastosSinComprobantes')}
                                    {renderGInput('1.17 Otros Ajustes Positivos', 'otrosAjustesPositivos')}
                                    <div className="font-bold pt-2 mt-2 flex justify-between bg-red-50 p-2 rounded"><span>TOTAL POSITIVOS:</span><span>{formatCurrency(gCalculated.totalAjustesPositivos)}</span></div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-green-700 border-b border-green-200 pb-2 mb-3">2. Ajustes Negativos (Disminuyen Renta)</h3>
                                    {renderGInput('2.1 Deficiencia Depreciación', 'deficienciaDepreciacion')}
                                    <div className="flex justify-between items-center py-1 text-sm border-b border-secondary-100"><label>2.2 Ajuste Inflación Inventario (D-2)</label><span className="font-mono bg-gray-100 px-2 rounded">{formatCurrency(gCalculated.ajusteInventarioD2)}</span></div>
                                    {renderGInput('2.4 Otros Ajustes Negativos', 'otrosAjustesNegativos')}
                                    <div className="font-bold pt-2 mt-2 flex justify-between bg-green-50 p-2 rounded"><span>TOTAL NEGATIVOS:</span><span>{formatCurrency(gCalculated.totalAjustesNegativos)}</span></div>
                                </div>
                            </div>
                            
                            <div className="mt-8">
                                <h3 className="font-bold text-primary border-b pb-2 mb-4">II. Distribución de Ajustes por Cuenta (Informativo)</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="bg-secondary-100 text-left"><th className="p-2">Concepto</th><th className="p-2 text-right">Ajuste Positivo</th><th className="p-2 text-right">Ajuste Negativo</th></tr></thead>
                                        <tbody>
                                            {Object.keys(gData.distribucion).map(key => (
                                                <tr key={key} className="border-b">
                                                    <td className="p-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                                                    <td className="p-2 text-right text-red-600 font-mono">{(gData.distribucion as any)[key].pos > 0 ? formatCurrency((gData.distribucion as any)[key].pos) : '-'}</td>
                                                    <td className="p-2 text-right text-green-600 font-mono">{(gData.distribucion as any)[key].neg > 0 ? formatCurrency((gData.distribucion as any)[key].neg) : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {currentStep === 'H1' && (
                <div className="animate-fade-in space-y-6">
                    <Card>
                        <CardHeader><CardTitle>ANEXO H-1 - DATOS INFORMATIVOS</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {renderInput('Teléfono 1', 'telefono1', h1Data.datosContacto.telefono1, v => handleH1ContactoChange('telefono1', v))}
                                {renderInput('Correo Electrónico', 'correoElectronico', h1Data.datosContacto.correoElectronico, v => handleH1ContactoChange('correoElectronico', v))}
                                {renderInput('Calle y Número', 'calle', h1Data.datosContacto.calle, v => handleH1ContactoChange('calle', v))}
                                {renderInput('Sector', 'sector', h1Data.datosContacto.sector, v => handleH1ContactoChange('sector', v))}
                            </div>
                            
                            <h3 className="font-bold text-primary mb-2">Accionistas Principales</h3>
                            {h1Data.accionistas.map((acc, i) => (
                                <div key={acc.id} className="flex gap-2 mb-2 items-center">
                                    <input placeholder="Nombre / Razón Social" value={acc.nombreRazonSocial} onChange={e => updateAccionista(acc.id, 'nombreRazonSocial', e.target.value)} className="flex-1 border rounded p-1 text-sm"/>
                                    <input placeholder="RNC/Cédula" value={acc.identificacion} onChange={e => updateAccionista(acc.id, 'identificacion', e.target.value)} className="w-32 border rounded p-1 text-sm"/>
                                    <input type="number" placeholder="%" value={acc.participacionAccionaria} onChange={e => updateAccionista(acc.id, 'participacionAccionaria', e.target.value)} className="w-16 border rounded p-1 text-sm"/>
                                    <button onClick={() => removeAccionista(acc.id)} className="text-red-500"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            ))}
                            <Button size="sm" variant="secondary" onClick={addAccionista}>+ Agregar Accionista</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {currentStep === 'J' && (
                <div className="animate-fade-in space-y-6">
                    <Card>
                        <CardHeader><CardTitle>ANEXO J - RESUMEN NCF</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-primary mb-3 border-b pb-1">I. Ventas por Tipo de NCF</h3>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {renderJRow('Facturas de Crédito Fiscal (01)', 'creditoFiscal')}
                                            {renderJRow('Facturas de Consumo (02)', 'consumidorFinal')}
                                            {renderJRow('Notas de Débito (03)', 'notaDebito')}
                                            {renderJRow('Notas de Crédito (04)', 'notaCredito')}
                                            {renderJRow('Regímenes Especiales (14)', 'regimenesEspeciales')}
                                            {renderJRow('Gubernamentales (15)', 'gubernamentales')}
                                            <tr className="bg-primary-50 font-bold border-t-2 border-primary-200">
                                                <td className="py-2 pl-2">TOTAL VENTAS</td>
                                                <td></td>
                                                <td className="py-2 text-right pr-2">{formatCurrency(jCalculated.totalVentas)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <h3 className="font-bold text-primary mb-3 border-b pb-1">II. Compras por Tipo de NCF</h3>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {renderJRow('Compras Crédito Fiscal (01)', 'cp_creditoFiscal')}
                                            {renderJRow('Compras Regímenes Esp. (14)', 'cp_regimenesEspeciales')}
                                            {renderJRow('Compras Informales (11)', 'cp_informales')}
                                            {renderJRow('Gastos Menores (13)', 'cp_gastosMenores')}
                                            <tr className="bg-secondary-100 font-bold border-t border-secondary-300">
                                                <td className="py-2 pl-2">TOTAL SUSTENTADOS</td>
                                                <td></td>
                                                <td className="py-2 text-right pr-2">{formatCurrency(jCalculated.totalSustentados)}</td>
                                            </tr>
                                            <tr className="bg-secondary-100 font-bold border-t border-secondary-300">
                                                <td className="py-2 pl-2">TOTAL OTROS GASTOS</td>
                                                <td></td>
                                                <td className="py-2 text-right pr-2">{formatCurrency(jCalculated.totalOtrosGastos)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {currentStep === 'IR2' && (
                <div className="animate-fade-in space-y-6">
                    <Card className="border-t-4 border-green-600 shadow-lg">
                        <CardHeader className="bg-green-50/50">
                            <CardTitle className="text-green-900">DECLARACIÓN JURADA ANUAL IR-2</CardTitle>
                            <p className="text-green-700 text-sm">Liquidación Final del Impuesto Sobre la Renta</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 max-w-3xl mx-auto">
                                {/* SECCION RENTA */}
                                <div className="border rounded-lg p-4 bg-white shadow-sm">
                                    <h3 className="font-bold text-lg text-primary-800 mb-4 border-b pb-2">I. Determinación de Renta Neta</h3>
                                    {renderIR2Row('1. Beneficio o Pérdida Neta (Anexo B-1)', null, ir2Calculated.beneficioNeto)}
                                    {renderIR2Row('2. Total Ajustes Positivos (Anexo G)', null, ir2Calculated.ajustesPositivos, '+')}
                                    {renderIR2Row('3. Exenciones Leyes Incentivo', 'exencionLeyIncentivos', undefined, '-')}
                                    {renderIR2Row('4. Dividendos Ganados', 'dividendosGanados', undefined, '-')}
                                    {renderIR2Row('5. Total Ajustes Negativos (Anexo G)', null, ir2Calculated.ajustesNegativos, '-')}
                                    {renderIR2Row('7. Renta Neta antes de Pérdidas', null, ir2Calculated.rentaNetaAntesPerdida, '=', true)}
                                    {renderIR2Row('8. Pérdidas de Años Anteriores (Anexo E)', 'perdidaAnosAnteriores', undefined, '-')}
                                    {renderIR2Row('11. RENTA NETA IMPONIBLE', null, ir2Calculated.rentaNetaImponible, '=', true)}
                                </div>

                                {/* SECCION LIQUIDACION */}
                                <div className="border rounded-lg p-4 bg-white shadow-sm border-l-4 border-l-primary-600">
                                    <h3 className="font-bold text-lg text-primary-800 mb-4 border-b pb-2">II. Liquidación</h3>
                                    {renderIR2Row('12. IMPUESTO LIQUIDADO (27%)', null, ir2Calculated.impuestoLiquidado, '', true)}
                                    
                                    <div className="bg-gray-50 p-3 rounded my-2 border border-gray-200">
                                        <h4 className="text-xs font-bold text-secondary-500 uppercase mb-2">Créditos y Pagos Computables</h4>
                                        {renderIR2Row('13. Anticipos Pagados', 'anticiposPagados')}
                                        {renderIR2Row('14. Retenciones del Estado', 'retencionesEstado')}
                                        {renderIR2Row('22. Saldo a Favor Anterior', 'saldoFavorAnterior')}
                                        {renderIR2Row('TOTAL CRÉDITOS', null, ir2Calculated.totalCreditos, '=', true)}
                                    </div>

                                    {renderIR2Row('23. DIFERENCIA A PAGAR', null, ir2Calculated.diferenciaPagar, '', true)}
                                    {renderIR2Row('24. SALDO A FAVOR', null, ir2Calculated.saldoFavor, '', true)}
                                </div>

                                {/* SECCION RECARGOS */}
                                {(ir2Calculated.diferenciaPagar > 0) && (
                                    <div className="border rounded-lg p-4 bg-red-50 border-red-200 shadow-sm">
                                        <h3 className="font-bold text-red-800 mb-4 border-b border-red-200 pb-2">III. Recargos y Sanciones (Si aplica)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {renderIR2Row('25. Mora Declaración Tardía', 'moraDeclaracionTardia')}
                                            {renderIR2Row('29. Int. Indemnizatorio', 'interesIndemnizatorioTardia')}
                                        </div>
                                    </div>
                                )}

                                {/* TOTAL FINAL */}
                                <div className="bg-primary-900 text-white p-6 rounded-lg shadow-lg text-center">
                                    <h2 className="text-xl font-medium opacity-90 mb-2">RESULTADO FINAL A PAGAR</h2>
                                    <p className="text-5xl font-black tracking-tight">{formatCurrency(ir2Calculated.totalPagar)}</p>
                                    {ir2Calculated.nuevoSaldoFavor > 0 && (
                                        <div className="mt-4 pt-4 border-t border-primary-700">
                                            <p className="text-lg font-bold text-green-300">NUEVO SALDO A FAVOR: {formatCurrency(ir2Calculated.nuevoSaldoFavor)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {/* --- IMPUESTO ACTIVOS --- */}
            {currentStep === 'ACTIVOS' && (
                <div className="animate-fade-in space-y-6">
                     <Card className="border-t-4 border-orange-600 shadow-lg">
                        <CardHeader className="bg-orange-50/50">
                            <CardTitle className="text-orange-900">IMPUESTO SOBRE LOS ACTIVOS (ACT)</CardTitle>
                            <p className="text-orange-700 text-sm">Declaración Jurada Anual de Activos</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 max-w-3xl mx-auto">
                                <div className="border rounded-lg p-4 bg-white shadow-sm border-l-4 border-l-orange-400">
                                    <h3 className="font-bold text-lg text-secondary-800 mb-4 border-b pb-2">Liquidación Impuesto Activos</h3>
                                    
                                    {renderActivosRow('1. Total de Activos (Anexo A-1)', null, activosCalculated.totalActivosA1, '', false, false, true)}
                                    {renderActivosRow('2. Activos Exentos (Fincas, Inmuebles, Títulos)', 'activosExentos', undefined, '-')}
                                    {renderActivosRow('3. Activos Imponibles', null, activosCalculated.baseImponible, '=', true, false, true)}
                                    
                                    <div className="my-4 border-t border-dashed"></div>

                                    {renderActivosRow('4. Tasa Impuesto', null, 0, '1%', false, false, true)}
                                    {renderActivosRow('5. Impuesto Liquidado (1% sobre Activos)', null, activosCalculated.impuestoActivosCalculado, '=', true)}
                                    {renderActivosRow('6. Crédito por Impuesto Sobre la Renta (IR-2)', null, activosCalculated.creditoISRLiquidado, '-', false, false, true)}
                                    
                                    {renderActivosRow('7. Diferencia a Pagar', null, activosCalculated.diferenciaPagar, '=', true)}
                                    
                                    <div className="bg-gray-50 p-3 rounded my-2 border border-gray-200">
                                        <h4 className="text-xs font-bold text-secondary-500 uppercase mb-2">Pagos Computables</h4>
                                        {renderActivosRow('8. Pagos a Cuenta (Activos)', 'pagosCuentaActivos')}
                                        {renderActivosRow('9. Créditos Autorizados', 'creditosAutorizadosActivos')}
                                    </div>
                                </div>
                                
                                <div className="bg-orange-900 text-white p-6 rounded-lg shadow-lg text-center">
                                    <h2 className="text-xl font-medium opacity-90 mb-2">TOTAL A PAGAR (ACTIVOS)</h2>
                                    <p className="text-5xl font-black tracking-tight">{formatCurrency(activosCalculated.totalPagar)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

// Helper: Mapea el Enum TipoAjuste al nombre de la propiedad del estado en React
function mapTipoAjusteToField(tipo: string): string {
    switch (tipo) {
        case 'IMPUESTO_NO_DEDUCIBLE': return 'impuestosNoDeducibles';
        case 'MULTA': return 'otrosGastosNoAdmitidos';
        case 'REPRESENTACION': return 'otrosGastosNoAdmitidos';
        case 'INTERES': return 'gastosInteresesNoDeducibles';
        case 'DONACION': return 'excesoDonaciones';
        case 'SIN_COMPROBANTE': return 'gastosSinComprobantes';
        default: return 'otrosGastosNoAdmitidos';
    }
}

export default DeclaracionIR2Page;
