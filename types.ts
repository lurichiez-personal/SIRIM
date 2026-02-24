
// types.ts

export enum Permission {
    VER_DASHBOARD = 'VER_DASHBOARD',
    GESTIONAR_CLIENTES = 'GESTIONAR_CLIENTES',
    ELIMINAR_CLIENTES = 'ELIMINAR_CLIENTES',
    GESTIONAR_FACTURAS = 'GESTIONAR_FACTURAS',
    ELIMINAR_FACTURAS = 'ELIMINAR_FACTURAS',
    GESTIONAR_COTIZACIONES = 'GESTIONAR_COTIZACIONES',
    GESTIONAR_NOTAS = 'GESTIONAR_NOTAS',
    GESTIONAR_GASTOS = 'GESTIONAR_GASTOS',
    ELIMINAR_GASTOS = 'ELIMINAR_GASTOS',
    GESTIONAR_PAGOS = 'GESTIONAR_PAGOS',
    GESTIONAR_INVENTARIO = 'GESTIONAR_INVENTARIO',
    GESTIONAR_NOMINA = 'GESTIONAR_NOMINA',
    AUDITAR_NOMINA = 'AUDITAR_NOMINA',
    ELIMINAR_NOMINA = 'ELIMINAR_NOMINA',
    GESTIONAR_CONTABILIDAD = 'GESTIONAR_CONTABILIDAD',
    GESTIONAR_CONCILIACION = 'GESTIONAR_CONCILIACION',
    VER_REPORTES_DGII = 'VER_REPORTES_DGII',
    GESTIONAR_CONFIGURACION_EMPRESA = 'GESTIONAR_CONFIGURACION_EMPRESA',
    GESTIONAR_ROLES = 'GESTIONAR_ROLES',
    GESTIONAR_USUARIOS = 'GESTIONAR_USUARIOS',
    ELIMINAR_USUARIOS = 'ELIMINAR_USUARIOS',
    GESTIONAR_EMPRESAS = 'GESTIONAR_EMPRESAS',
    GESTIONAR_MARKETING = 'GESTIONAR_MARKETING',
    GESTIONAR_CREDENCIALES_EMPRESA = 'GESTIONAR_CREDENCIALES_EMPRESA',
    GESTIONAR_BASE_DATOS_RNC = 'GESTIONAR_BASE_DATOS_RNC',
    GESTIONAR_DESVINCULACIONES = 'GESTIONAR_DESVINCULACIONES',
    VER_HISTORIAL_DESVINCULACIONES = 'VER_HISTORIAL_DESVINCULACIONES',
    GESTIONAR_CATALOGO_CUENTAS = 'GESTIONAR_CATALOGO_CUENTAS',
    VER_REPORTES_FINANCIEROS = 'VER_REPORTES_FINANCIEROS',
    GESTIONAR_CIERRE_ITBIS = 'GESTIONAR_CIERRE_ITBIS',
    GESTIONAR_ANTICIPOS_ISR = 'GESTIONAR_ANTICIPOS_ISR',
    GESTIONAR_DECLARACION_IR2 = 'GESTIONAR_DECLARACION_IR2',
}

export enum Role {
    Admin = 'Admin',
    Contador = 'Contador',
    Operaciones = 'Operaciones',
    Aprobador = 'Aprobador',
    Usuario = 'Usuario',
    GerenteRRHH = 'GerenteRRHH',
    AuditorNomina = 'AuditorNomina',
}

export enum NotificationType {
    FACTURA_VENCIDA = 'FACTURA_VENCIDA',
    STOCK_BAJO = 'STOCK_BAJO',
    NCF_BAJO = 'NCF_BAJO',
    NCF_EXPIRADO = 'NCF_EXPIRADO',
    NOMINA_PARA_AUDITORIA = 'NOMINA_PARA_AUDITORIA',
    COTIZACION_APROBADA = 'COTIZACION_APROBADA',
    COTIZACION_RECHAZADA = 'COTIZACION_RECHAZADA',
}

export interface Notificacion {
    id: string;
    empresaId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

export interface User {
    id: string;
    nombre: string;
    email: string;
    roles: Role[];
    empresaId?: string;
    activo: boolean;
    authMethod: 'local' | 'microsoft';
    tempPassword?: boolean;
    photoURL?: string;
}

export type CierreFiscal = '31-diciembre' | '31-marzo' | '30-junio' | '30-septiembre';

export const CierreFiscalOptions: Record<string, string> = {
    '31-diciembre': '31 de Diciembre',
    '31-marzo': '31 de Marzo',
    '30-junio': '30 de Junio',
    '30-septiembre': '30 de Septiembre',
};

export interface Empresa {
    id: string;
    nombre: string;
    rnc: string;
    cierreFiscal: CierreFiscal;
    logoUrl?: string;
    accentColor?: string;
    footerText?: string;
    trialEndsAt?: string;
    createdAt?: string;
    impuestoLiquidadoAnterior?: number;
    ingresosBrutosAnterior?: number;
    capitalSocialInicial?: number; // Nuevo campo para el registro de capital
}

export interface Cliente {
    id: string;
    empresaId: string;
    nombre: string;
    rnc?: string;
    email?: string;
    telefono?: string;
    condicionesPago?: string;
    activo: boolean;
    estadoDGII?: string;
    createdAt: string;
}

export enum FacturaEstado {
    Emitida = 'Emitida',
    Pagada = 'Pagada',
    PagadaParcialmente = 'Pagada Parcialmente',
    Vencida = 'Vencida',
    Anulada = 'Anulada',
}

export enum NCFType {
    B01 = 'B01 - Crédito Fiscal',
    B02 = 'B02 - Consumo',
    B03 = 'B03 - Nota de Débito',
    B04 = 'B04 - Nota de Crédito',
    B11 = 'B11 - Proveedor Informal',
    B12 = 'B12 - Registro Único Ingresos',
    B13 = 'B13 - Gastos Menores',
    B14 = 'B14 - Regímenes Especiales',
    B15 = 'B15 - Gubernamental',
    E31 = 'E31 - Crédito Fiscal Electrónico',
    E32 = 'E32 - Consumo Electrónico',
    E33 = 'E33 - Nota de Débito Electrónica',
    E34 = 'E34 - Nota de Crédito Electrónica',
    E41 = 'E41 - Compras Electrónico',
    E44 = 'E44 - Regímenes Especiales Electrónico',
    E45 = 'E45 - Gubernamental Electrónico',
}

export interface FacturaItem {
    itemId: string;
    codigo: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    stock?: number;
    key?: number; // for UI list
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: string;
}

export interface AuditLogEntry {
    id: string;
    userId: string;
    userName: string;
    action: string;
    timestamp: string;
}

export interface Factura {
    id: string;
    empresaId: string;
    clienteId: string;
    clienteNombre: string;
    fecha: string;
    ncf?: string;
    ncfTipo: NCFType;
    ncfModificado?: string; // For B04 referencing a B01/B02
    items: FacturaItem[];
    subtotal: number;
    descuentoPorcentaje: number;
    montoDescuento: number;
    aplicaITBIS: boolean;
    itbis: number;
    aplicaISC?: boolean;
    isc?: number;
    aplicaPropina?: boolean;
    propinaLegal?: number;
    itbisRetenido?: number;
    montoTotal: number;
    montoPagado: number;
    estado: FacturaEstado;
    conciliado: boolean;
    asientoId?: string;
    comments: Comment[];
    auditLog: AuditLogEntry[];
    createdAt?: string;
    cotizacionId?: string;
    facturaRecurrenteId?: string;
}

export interface Item {
    id: string;
    empresaId: string;
    codigo: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    costo?: number;
    cantidadDisponible?: number;
    isVariablePrice?: boolean;
}

export enum CotizacionEstado {
    Pendiente = 'Pendiente',
    Aprobada = 'Aprobada',
    Rechazada = 'Rechazada',
    Facturada = 'Facturada',
    Anulada = 'Anulada',
}

export interface Cotizacion {
    id: string;
    empresaId: string;
    clienteId: string;
    clienteNombre: string;
    clienteRNC?: string;
    fecha: string;
    items: FacturaItem[];
    subtotal: number;
    descuentoPorcentaje: number;
    montoDescuento: number;
    aplicaITBIS: boolean;
    itbis: number;
    aplicaISC?: boolean;
    isc?: number;
    aplicaPropina?: boolean;
    propinaLegal?: number;
    montoTotal: number;
    estado: CotizacionEstado;
    comments: Comment[];
    auditLog: AuditLogEntry[];
}

export interface FacturaRecurrente {
    id: string;
    empresaId: string;
    clienteId: string;
    clienteNombre: string;
    descripcion: string;
    frecuencia: 'diaria' | 'semanal' | 'mensual' | 'anual';
    fechaInicio: string;
    fechaProxima: string;
    activa: boolean;
    items: FacturaItem[];
    subtotal: number;
    descuentoPorcentaje: number;
    montoDescuento: number;
    aplicaITBIS: boolean;
    itbis: number;
    aplicaISC?: boolean;
    isc?: number;
    aplicaPropina?: boolean;
    propinaLegal?: number;
    montoTotal: number;
}

export enum MetodoPago {
    '01-EFECTIVO' = '01-EFECTIVO',
    '02-CHEQUES/TRANSFERENCIAS/DEPOSITO' = '02-CHEQUES/TRANSFERENCIAS/DEPOSITO',
    '03-TARJETA CREDITO/DEBITO' = '03-TARJETA CREDITO/DEBITO',
    '04-COMPRA A CREDITO' = '04-COMPRA A CREDITO',
    '05-PERMUTA' = '05-PERMUTA',
    '06-NOTAS DE CREDITO' = '06-NOTAS DE CREDITO',
    '07-MIXTO' = '07-MIXTO',
}

export interface Gasto {
    id: string;
    empresaId: string;
    proveedorNombre: string;
    rncProveedor: string;
    fecha: string;
    ncf: string;
    categoriaGasto: string; // 01 - Gastos de Personal, etc.
    descripcion: string;
    subtotal: number;
    itbis: number;
    isc?: number;
    propinaLegal?: number;
    descuentoPorcentaje?: number;
    montoDescuento?: number;
    monto: number;
    metodoPago: MetodoPago | string;
    conciliado: boolean;
    asientoId?: string;
    aplicaITBIS?: boolean;
    aplicaISC?: boolean;
    aplicaPropina?: boolean;
    pagado?: boolean;
    fechaPago?: string;
    asientoPagoId?: string;
    auditado?: boolean;
    comments: Comment[];
    auditLog: AuditLogEntry[];
    imageUrl?: string;
}

export interface Ingreso {
    id: string;
    empresaId: string;
    facturaId: string;
    clienteId: string;
    clienteNombre: string;
    fecha: string;
    monto: number;
    metodoPago: MetodoPago | string;
    notas?: string;
    asientoId?: string;
    conciliado: boolean;
}

export enum NotaType {
    Credito = 'Credito',
    Debito = 'Debito'
}

export const CodigoModificacionNCF = {
    '01': '01 - Deterioro de factura vencida',
    '02': '02 - Errores en factura (Nombres, conceptos)',
    '03': '03 - Corrección de montos',
    '04': '04 - Devoluciones de productos',
    '05': '05 - Descuentos y bonificaciones'
};

export interface NotaCreditoDebito {
    id: string;
    empresaId: string;
    tipo: NotaType;
    ncf: string;
    facturaAfectadaId: string;
    facturaAfectadaNCF: string;
    clienteId: string;
    clienteNombre: string;
    fecha: string;
    codigoModificacion: keyof typeof CodigoModificacionNCF;
    descripcion: string;
    subtotal: number;
    itbis: number;
    isc?: number;
    propinaLegal?: number;
    montoTotal: number;
    aplicaITBIS: boolean;
    aplicaISC: boolean;
    aplicaPropina: boolean;
    asientoId?: string;
}

export interface NCFSequence {
    id: string;
    empresaId: string;
    tipo: NCFType;
    prefijo: string;
    secuenciaDesde: number;
    secuenciaHasta: number;
    secuenciaActual: number;
    fechaSolicitud: string;
    fechaVencimiento: string;
    numeroSolicitud: string;
    activa: boolean;
    alertaActiva: boolean;
}

export interface KeyCardEntry {
    position: string;
    code: string;
}

export interface Credencial {
    id: string;
    empresaId: string;
    plataforma: string;
    usuario: string;
    contrasena: string;
    url?: string;
    notas?: string;
    keyCardImageUrl?: string;
    keyCardData?: KeyCardEntry[];
}

export interface Empleado {
    id: string;
    empresaId: string;
    nombre: string;
    cedula: string;
    puesto: string;
    salarioBrutoMensual: number;
    salarioRealMensual?: number;
    fechaIngreso: string;
    activo: boolean;
}

export enum TipoNomina {
    TSS = 'TSS',
    Interna = 'Interna',
}

export enum FrecuenciaNomina {
    Mensual = 'Mensual',
    Quincenal = 'Quincenal',
}

export enum NominaStatus {
    PendienteAuditoria = 'Pendiente Auditoria',
    Auditada = 'Auditada',
    Pagada = 'Pagada',
}

export interface NominaEmpleado {
    empleadoId: string;
    nombre: string;
    salarioBruto: number;
    afp: number;
    sfs: number;
    isr: number;
    totalDeduccionesEmpleado: number;
    sfsEmpleador: number;
    srlEmpleador: number;
    afpEmpleador: number;
    infotep: number;
    totalAportesEmpleador: number;
    salarioNeto: number;
}

export interface Nomina {
    id: string;
    empresaId: string;
    periodo: string; // YYYY-MM
    tipo: TipoNomina;
    frecuencia: FrecuenciaNomina;
    empleados: NominaEmpleado[];
    totalPagado: number;
    totalCostoEmpresa: number;
    status: NominaStatus;
    generadoPor: { userId: string, userName: string };
    fechaGeneracion: string;
    auditadoPor?: { userId: string, userName: string };
    fechaAuditoria?: string;
    asientoId?: string;
    fechaPago?: string;
    asientoPagoId?: string;
    contabilizadoPor?: { userId: string, userName: string };
    fechaContabilizacion?: string;
}

export enum CausaDesvinculacion {
    Desahucio = 'Desahucio',
    Despido = 'Despido',
    Dimision = 'Dimision',
    Contrato = 'Contrato',
}

export interface Desvinculacion {
    id: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    empleadoCedula: string;
    fechaSalida: string;
    causa: CausaDesvinculacion;
    prestaciones: {
        preaviso: number;
        cesantia: number;
        vacaciones: number;
        salarioNavidad: number;
        total: number;
    };
    asientoId?: string;
}

export type AccountType = 'Activo' | 'Pasivo' | 'Capital' | 'Ingreso' | 'Costo' | 'Gasto';

export interface CuentaContable {
    id: string;
    nombre: string;
    tipo: AccountType;
    permiteMovimientos: boolean;
    padreId?: string;
    categoriaDGII?: string; // Mapeo a IR-2 (e.g., 'A1_1_1')
    nivel: number;
    esPrestamoRelacionado?: boolean;
    tratamientoFiscal?: 'DEDUCIBLE' | 'NO_DEDUCIBLE' | 'SUJETO_LIMITE' | 'DEDUCIBLE_PARCIAL';
    tipoAjusteAnexoG?: string; // 'IMPUESTO_NO_DEDUCIBLE', 'MULTA', etc.
    porcentajeDeducible?: number;
}

export interface AsientoEntrada {
    cuentaId: string;
    descripcion: string;
    debito: number;
    credito: number;
}

export interface AsientoContable {
    id: string;
    empresaId: string;
    fecha: string;
    descripcion: string;
    transaccionId: string;
    transaccionTipo: string;
    entradas: AsientoEntrada[];
}

export interface CierreITBIS {
    id: string;
    empresaId: string;
    periodo: string; // YYYY-MM
    saldoInicial: number;
    itbisVentasMes: number;
    itbisComprasMes: number;
    itbisAPagar: number;
    saldoFinal: number;
    fechaCierre: string;
    pagado: boolean;
    fechaPago?: string;
    asientoPagoId?: string;
}

export interface AnticipoISRPago {
    id: string;
    empresaId: string;
    periodoFiscal: string; // YYYY
    numeroCuota: number;
    montoPagado: number;
    fechaPago: string;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface KpiData {
    totalCobrado: number;
    gastosMes: number;
    beneficioPerdida: number;
    cuentasPorCobrar: number;
    activos: number;
    patrimonio: number;
    itbisAPagar: { total: number };
    isrProyectado: number;
    gastosConsumidorFinal: { totalItbis: number, count: number };
}

export interface ChartDataPoint {
    name: string;
    ventas: number;
    gastos: number;
}

export interface PieChartDataPoint {
    name: string;
    value: number;
}

export interface ActivoFijo {
    id: string;
    empresaId: string;
    nombre: string;
    categoria: '1' | '2' | '3'; // 1: Edificaciones, 2: Equipos, 3: Otros
    fechaAdquisicion: string;
    costoAdquisicion: number;
    valorLibros?: number;
    fechaRetiro?: string;
    // Campos para continuidad fiscal (Anexo D/D1)
    depreciacionAcumuladaFiscal?: number;
    valorFiscalFinal?: number;
    ultimoPeriodoCerrado?: number; // Año fiscal del último cierre procesado
}

export interface ClientUser {
    id: string;
    clienteId: string;
    nombre: string;
    email: string;
}

export type RolePermissions = {
    [role in Role]: Permission[];
};

export interface OfflineAction {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
}

export interface BankTransaction {
    id: string;
    fecha: string;
    descripcion: string;
    monto: number;
    tipo: 'credito' | 'debito';
    line: number;
}

export interface MatchableRecord {
    id: string;
    type: 'ingreso' | 'gasto';
    fecha: string;
    monto: number;
    conciliado: boolean;
    descripcion?: string;
    clienteNombre?: string;
    proveedorNombre?: string;
}

export type NivelConfianza = 'ALTO' | 'MEDIO' | 'BAJO';

export interface FiscalWarning {
    type: string;
    message: string;
}

export interface BlockingError {
    code: string;
    message: string;
    severity: 'BLOCKING' | 'WARNING';
}

export interface EvaluacionActividad {
   huboActividadComercial: boolean;
   huboActividadContable: boolean;
   soloArrastreHistorico: boolean;
   tieneActivosVigentes: boolean;
   estadoGeneral: 'OPERATIVA' | 'SOLO_PATRIMONIAL' | 'SIN_ACTIVIDAD';
}

export interface PerdidaPendiente {
    year: string;
    perdidaInicial: number;
    indiceInflacion: number;
    periodosPorCompensar: number;
    porcentajeRenta: number;
    perdidaPendiente: number; // Monto restante por compensar
}

export interface CalculoFiscalSnapshot {
    empresaId: string;
    fechaCalculo: string;
    periodoFiscal: number; // Año
    versionMotor: string;
    inputSnapshot: any;
    outputSnapshot: any;
    actividadFiscal?: EvaluacionActividad; 
    // Continuity Fields
    continuityData?: {
        d2: {
            patrimonioFiscalFinal: number;
            ajusteInflacionAplicado: number;
        };
        anexoE: {
            perdidasPendientes: PerdidaPendiente[];
        };
    };
}

export interface FiscalClosure {
    id: string;
    empresaId: string;
    periodoFiscal: number;
    status: 'OPEN' | 'LOCKED';
    dataHash: string; // SHA-256 of critical data
    lockedBy: string;
    lockedAt: string;
    version: string;
}

export interface DataState {
    clientes: Cliente[];
    facturas: Factura[];
    gastos: Gasto[];
    items: Item[];
    ingresos: Ingreso[];
    cotizaciones: Cotizacion[];
    notas: NotaCreditoDebito[];
    facturasRecurrentes: FacturaRecurrente[];
    credenciales: Credencial[];
    empleados: Empleado[];
    nominas: Nomina[];
    desvinculaciones: Desvinculacion[];
    asientosContables: AsientoContable[];
    cierresITBIS: CierreITBIS[];
    pagosAnticiposISR: AnticipoISRPago[];
    activosFijos: ActivoFijo[];
    isLoading: boolean;
    unsubscribers: import('firebase/firestore').Unsubscribe[];
    fetchData: (empresaId: string) => void;
    clearData: () => void;
    addCliente: (data: Omit<Cliente, 'id' | 'empresaId' | 'createdAt'>) => Promise<Cliente>;
    updateCliente: (data: Cliente) => Promise<void>;
    deleteCliente: (id: string) => Promise<void>;
    bulkDeleteClientes: (ids: string[]) => Promise<void>;
    bulkUpdateClienteStatus: (ids: string[], activo: boolean) => Promise<void>;
    addFactura: (data: Omit<Factura, 'id' | 'empresaId' | 'estado' | 'montoPagado' | 'createdAt'>) => Promise<void>;
    updateFactura: (data: Factura) => Promise<void>;
    updateFacturaStatus: (id: string, status: FacturaEstado) => Promise<void>;
    deleteFactura: (id: string) => Promise<void>;
    bulkDeleteFacturas: (ids: string[]) => Promise<void>;
    bulkUpdateFacturaStatus: (ids: string[], status: FacturaEstado) => Promise<void>;
    addGasto: (data: Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>) => Promise<Gasto>;
    updateGasto: (data: Gasto) => Promise<void>;
    deleteGasto: (id: string) => Promise<void>;
    bulkDeleteGastos: (ids: string[]) => Promise<void>;
    pagarGasto: (id: string, fechaPago: string) => Promise<void>;
    setGastoAuditado: (id: string, auditado: boolean) => Promise<void>;
    addIngreso: (data: Omit<Ingreso, 'id' | 'empresaId'>) => Promise<void>;
    addItem: (data: Omit<Item, 'id' | 'empresaId'>) => Promise<any>;
    updateItem: (data: Item) => Promise<void>;
    addCotizacion: (data: Omit<Cotizacion, 'id' | 'empresaId' | 'estado'>) => Promise<any>;
    updateCotizacion: (data: Cotizacion) => Promise<void>;
    updateCotizacionStatus: (id: string, status: CotizacionEstado) => Promise<void>;
    addNota: (data: Omit<NotaCreditoDebito, 'id' | 'empresaId'>) => Promise<void>;
    updateNota: (data: NotaCreditoDebito) => Promise<void>;
    addFacturaRecurrente: (data: Omit<FacturaRecurrente, 'id' | 'empresaId' | 'fechaProxima' | 'activa'>) => Promise<any>;
    updateFacturaRecurrente: (data: FacturaRecurrente) => Promise<void>;
    addCredencial: (data: Omit<Credencial, 'id' | 'empresaId'>, imageFile?: File | null) => Promise<void>;
    updateCredencial: (data: Credencial, imageFile?: File | null, removeImage?: boolean) => Promise<void>;
    deleteCredencial: (id: string) => Promise<void>;
    addEmpleado: (data: Omit<Empleado, 'id' | 'empresaId'>) => Promise<any>;
    updateEmpleado: (data: Empleado) => Promise<void>;
    addNomina: (data: Omit<Nomina, 'id' | 'empresaId' | 'status' | 'generadoPor' | 'fechaGeneracion'>) => Promise<void>;
    deleteNomina: (id: string) => Promise<void>;
    auditarNomina: (id: string) => Promise<void>;
    pagarNomina: (id: string, fechaPago: string) => Promise<void>;
    addDesvinculacion: (data: Omit<Desvinculacion, 'id' | 'empresaId' | 'asientoId'>) => Promise<void>;
    findGastoByNcfAndRnc: (ncf: string, rnc: string) => Gasto | undefined;
    importGastosFromExcel: (file: File, onProgress: (p: number) => void) => Promise<{ message: string }>;
    importFacturasFromExcel: (file: File, onProgress: (p: number) => void) => Promise<{ message: string }>;
    sincronizarNombresProveedores: () => Promise<void>;
    sincronizarAsientosFaltantes: () => Promise<void>;
    reconcileWithAI: (content: string) => Promise<any[]>;
    answerQuestionWithAI: (q: string) => Promise<string>;
    calculateIngresosBrutosForPreviousFiscalYear: () => number;
    getAnexoBData: (periodo: number) => any;
    getAnexoAData: (periodo: number) => any;
    getKpis: () => KpiData;
    getSalesVsExpensesChartData: () => ChartDataPoint[];
    getGastosByCategoryChartData: () => PieChartDataPoint[];
    getMonthlyITBISData: () => any[];
    getAnticiposISRData: () => any;
    getNominaForPeriodo: (periodo: string) => Nomina | undefined;
    getNominaById: (id: string) => Nomina | undefined;
    realizarCierreITBIS: (periodo: string) => Promise<void>;
    pagarITBIS: (cierreId: string, fechaPago: string) => Promise<void>;
    marcarAnticipoPagado: (data: { periodoFiscal: string, numeroCuota: number, montoPagado: number, fechaPago: string }) => Promise<void>;
    addComment: (type: string, id: string, text: string) => Promise<void>;
    saveFiscalSnapshot: (snapshot: CalculoFiscalSnapshot) => Promise<void>;
    getGastosFor606: (start: string, end: string) => Gasto[];
    getVentasFor607: (start: string, end: string) => { facturas: Factura[], notas: NotaCreditoDebito[] };
    getAnuladosFor608: (start: string, end: string) => (Factura | NotaCreditoDebito)[];
    getFacturasParaPago: () => Factura[];
    setConciliadoStatus: (type: 'ingreso' | 'gasto', id: string, status: boolean) => Promise<void>;
    getContabilidadKpis: () => any;
    findDesvinculacionByCedula: (cedula: string) => Desvinculacion | undefined;
    getFiscalStatus: (periodo: number) => Promise<FiscalClosure | null>;
    lockFiscalYear: (periodo: number, data: any, assetUpdates?: any[]) => Promise<void>;
    unlockFiscalYear: (periodo: number, reason: string) => Promise<void>;
    getLastLockedSnapshot: (periodo: number) => Promise<CalculoFiscalSnapshot | null>;
}

// Helpers
export const isNcfConsumidorFinal = (ncf?: string) => ncf?.startsWith('B02') || ncf?.startsWith('E32');
export const isNcfNotaCredito = (tipo: NCFType) => tipo === NCFType.B04 || tipo === NCFType.E34;

export interface ImportLog {
    id: string;
    empresaId: string;
    fecha: string;
    usuarioId: string;
    nombreArchivo: string;
    totalFilas: number;
    totalProcesadas: number;
    totalDuplicadas: number;
    totalErrores: number;
    erroresDetalle: Array<{ fila: number; ncf: string; error: string }>;
    montoTotalProcesado: number;
}

export interface ExcelRow607 {
    RNC_CEDULA_CLIENTE: string;
    TIPO_IDENTIFICACION: string;
    NUMERO_COMPROBANTE_FISCAL: string;
    NUMERO_COMPROBANTE_MODIFICADO?: string;
    TIPO_INGRESO: number;
    FECHA_COMPROBANTE: string; // YYYYMMDD
    FECHA_RETENCION?: string;
    MONTO_FACTURADO: number;
    ITBIS_FACTURADO: number;
    ITBIS_RETENIDO_TERCEROS?: number;
    ITBIS_PERCIBIDO?: number;
    RETENCION_RENTA_TERCEROS?: number;
    IMPUESTO_SELECTIVO_CONSUMO?: number;
    OTROS_IMPUESTOS_TASAS?: number;
    MONTO_PROPINA_LEGAL?: number;
    EFECTIVO?: number;
    CHEQUE_TRANSFERENCIA_DEPOSITO?: number;
    TARJETA_DEBITO_CREDITO?: number;
    VENTA_A_CREDITO?: number;
    BONOS_CERTIFICADOS_REGALO?: number;
    PERMUTA?: number;
    OTRAS_FORMAS_VENTAS?: number;
}
