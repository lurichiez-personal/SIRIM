

export enum Role {
  Admin = 'Admin',
  Operaciones = 'Operaciones',
  Aprobador = 'Aprobador',
  Contador = 'Contador',
  Usuario = 'Usuario'
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  roles: Role[];
  empresaId?: number; 
  authMethod: 'microsoft' | 'local';
  password?: string;
  activo: boolean;
}

export interface Empresa {
  id: number;
  nombre: string;
  rnc: string;
}

export interface Cliente {
  id: number;
  empresaId: number;
  nombre:string;
  rnc?: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  condicionesPago?: string;
  createdAt: string;
  estadoDGII?: string;
}

export enum FacturaEstado {
  Emitida = 'emitida',
  PagadaParcialmente = 'pagada parcialmente',
  Pagada = 'pagada',
  Vencida = 'vencida',
  Anulada = 'anulada'
}

export interface FacturaItem {
    itemId: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number; 
}

export interface Factura {
  id: number;
  empresaId: number;
  clienteId: number;
  clienteNombre: string;
  fecha: string;
  items: FacturaItem[];
  subtotal: number;
  descuentoPorcentaje?: number;
  montoDescuento?: number;
  aplicaITBIS: boolean;
  aplicaISC?: boolean;
  isc?: number;
  itbis: number;
  aplicaPropina?: boolean;
  propinaLegal?: number;
  montoTotal: number;
  montoPagado: number;
  ncf?: string;
  estado: FacturaEstado;
  cotizacionId?: number;
  facturaRecurrenteId?: number;
  conciliado: boolean;
  comments: Comment[];
  auditLog: AuditLogEntry[];
  asientoId?: string;
}

export interface Gasto {
    id: number;
    empresaId: number;
    proveedorNombre?: string;
    rncProveedor?: string;
    categoriaGasto?: string;
    fecha: string;
    subtotal: number;
    itbis: number;
    isc?: number;
    propinaLegal?: number;
    monto: number; 
    ncf?: string;
    descripcion: string;
    conciliado: boolean;
    aplicaITBIS: boolean;
    metodoPago?: string;
    comments: Comment[];
    auditLog: AuditLogEntry[];
    asientoId?: string;
}

export enum MetodoPago {
    '01-EFECTIVO' = '01 - Efectivo',
    '02-CHEQUES/TRANSFERENCIAS/DEPOSITO' = '02 - Cheques/Transferencias/Depósito',
    '03-TARJETA CREDITO/DEBITO' = '03 - Tarjeta Crédito/Débito',
    '04-VENTA A CREDITO' = '04 - Venta a Crédito',
    '05-BONOS O CERTIFICADOS DE REGALO' = '05 - Bonos o Certificados de Regalo',
    '06-PERMUTA' = '06 - Permuta',
    '07-OTRAS FORMAS DE VENTA' = '07 - Otras Formas de Venta',
}


export interface Ingreso {
    id: number;
    empresaId: number;
    clienteId: number;
    clienteNombre?: string;
    facturaId: number;
    fecha: string;
    monto: number;
    metodoPago: MetodoPago;
    notas?: string;
    conciliado: boolean;
    asientoId?: string;
}

export interface Item {
    id: number;
    empresaId: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    costo?: number;
    cantidadDisponible?: number; 
}

export enum CotizacionEstado {
  Pendiente = 'pendiente',
  Aprobada = 'aprobada',
  Rechazada = 'rechazada',
  Facturada = 'facturada',
  Anulada = 'anulada',
}

export interface Cotizacion {
  id: number;
  empresaId: number;
  clienteId: number;
  clienteNombre: string;
  clienteRNC?: string;
  fecha: string;
  items: FacturaItem[];
  subtotal: number;
  descuentoPorcentaje?: number;
  montoDescuento?: number;
  aplicaITBIS: boolean;
  aplicaISC?: boolean;
  isc?: number;
  itbis: number;
  aplicaPropina?: boolean;
  propinaLegal?: number;
  montoTotal: number;
  estado: CotizacionEstado;
  comments: Comment[];
  auditLog: AuditLogEntry[];
}

export enum NCFType {
    // Comprobantes Fiscales (Serie B)
    B01 = 'B01 - Crédito Fiscal',
    B02 = 'B02 - Consumidor Final',
    B03 = 'B03 - Nota de Débito',
    B04 = 'B04 - Nota de Crédito',
    B11 = 'B11 - Régimen Especial de Tributación',
    B12 = 'B12 - Gubernamental',
    B13 = 'B13 - Comprobantes para Zonas Francas',
    B14 = 'B14 - Comprobante para Exportaciones',
    B15 = 'B15 - Pagos al Exterior',
    B16 = 'B16 - Gastos Menores',
    B17 = 'B17 - Comprobante para Regímenes Especiales (Ley 253-12)',

    // Comprobantes Fiscales Electrónicos (Serie E)
    E31 = 'E31 - e-CF de Crédito Fiscal',
    E32 = 'E32 - e-CF de Consumidor Final',
    E33 = 'E33 - e-CF de Nota de Débito',
    E34 = 'E34 - e-CF de Nota de Crédito',
    E41 = 'E41 - e-CF de Compras',
    E43 = 'E43 - e-CF para Regímenes Especiales',
    E44 = 'E44 - e-CF Gubernamental',
    E45 = 'E45 - e-CF para Pagos al Exterior',
    E46 = 'E46 - e-CF para Gastos Menores',
    E47 = 'E47 - e-CF para Exportación',
}

export interface NCFSequence {
    id: number;
    empresaId: number;
    tipo: NCFType;
    prefijo: string;
    secuenciaDesde: number;
    secuenciaHasta: number;
    secuenciaActual: number;
    fechaVencimiento: string;
    activa: boolean;
    alertaActiva: boolean;
}

export enum NotaType {
    Credito = 'credito',
    Debito = 'debito',
}

export enum CodigoModificacionNCF {
    '01' = '01 - Anulación de Factura',
    '02' = '02 - Devolución de Mercancías',
    '03' = '03 - Descuento Aplicado',
    '04' = '04 - Corrección de Precio',
    '05' = '05 - Ajuste de ITBIS',
    '06' = '06 - Cualquier otra modificación',
}

export interface NotaCreditoDebito {
    id: number;
    empresaId: number;
    tipo: NotaType;
    facturaAfectadaId: number;
    facturaAfectadaNCF: string;
    ncf: string; 
    fecha: string;
    clienteId: number;
    clienteNombre: string;
    subtotal: number;
    descuentoPorcentaje?: number;
    montoDescuento?: number;
    aplicaITBIS: boolean;
    aplicaISC: boolean;
    isc: number;
    itbis: number;
    aplicaPropina: boolean;
    propinaLegal: number;
    montoTotal: number;
    codigoModificacion: keyof typeof CodigoModificacionNCF;
    descripcion: string;
    asientoId?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface FacturaRecurrente {
    id: number;
    empresaId: number;
    clienteId: number;
    clienteNombre: string;
    items: FacturaItem[];
    subtotal: number;
    descuentoPorcentaje?: number;
    montoDescuento?: number;
    aplicaITBIS: boolean;
    aplicaISC?: boolean;
    isc?: number;
    itbis: number;
    aplicaPropina?: boolean;
    propinaLegal?: number;
    montoTotal: number;
    frecuencia: 'diaria' | 'semanal' | 'mensual' | 'anual';
    fechaInicio: string;
    fechaProxima: string;
    descripcion: string;
    activa: boolean;
}

export enum NotificationType {
    NCF_BAJO = 'NCF_BAJO',
    FACTURA_VENCIDA = 'FACTURA_VENCIDA',
    STOCK_BAJO = 'STOCK_BAJO',
    RECURRENTE_LISTA = 'RECURRENTE_LISTA',
    COTIZACION_APROBADA = 'COTIZACION_APROBADA',
    COTIZACION_RECHAZADA = 'COTIZACION_RECHAZADA'
}

export interface Notificacion {
    id: string;
    empresaId: number;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

export interface CustomizationSettings {
    empresaId: number;
    logoUrl?: string;
    accentColor: string;
    footerText?: string;
}

export interface KpiData {
    totalFacturado: number;
    totalCobrado: number;
    gastosMes: number;
    facturasPendientes: number;
    beneficioPerdida: number;
    cuentasPorCobrar: number;
    itbisAPagar: {
        total: number;
        itbisVentas: number;
        itbisCompras: number;
    };
    activos: number;
    patrimonio: number;
    isrProyectado: number;
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

export interface BankTransaction {
    fecha: string;
    descripcion: string;
    monto: number;
    tipo: 'credito' | 'debito';
    id: string; 
}

export type MatchableRecord =
    | (Factura & { type: 'factura' })
    | (Gasto & { type: 'gasto' })
    | (Ingreso & { type: 'ingreso' });

export interface ReconciliationMatch {
    bankTransactionId: string;
    recordId: number;
    recordType: 'factura' | 'gasto' | 'ingreso';
    status: 'sugerido' | 'confirmado';
}

// --- Pilar 3: Tipos de Colaboración ---
export interface ClientUser {
    id: string;
    clienteId: number;
    nombre: string;
    email: string;
    password?: string;
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

// --- Pilar 4: Tipos de Seguridad y Offline ---
export enum Permission {
    VER_DASHBOARD = 'ver_dashboard',
    GESTIONAR_CLIENTES = 'gestionar_clientes',
    GESTIONAR_FACTURAS = 'gestionar_facturas',
    GESTIONAR_COTIZACIONES = 'gestionar_cotizaciones',
    GESTIONAR_NOTAS = 'gestionar_notas',
    GESTIONAR_GASTOS = 'gestionar_gastos',
    GESTIONAR_PAGOS = 'gestionar_pagos',
    GESTIONAR_INVENTARIO = 'gestionar_inventario',
    GESTIONAR_CONCILIACION = 'gestionar_conciliacion',
    VER_REPORTES_DGII = 'ver_reportes_dgii',
    GESTIONAR_CONFIGURACION_EMPRESA = 'gestionar_configuracion_empresa',
    GESTIONAR_ROLES = 'gestionar_roles',
    GESTIONAR_USUARIOS = 'gestionar_usuarios',
    GESTIONAR_EMPRESAS = 'gestionar_empresas',
    GESTIONAR_NOMINA = 'gestionar_nomina',
    GESTIONAR_DESVINCULACIONES = 'gestionar_desvinculaciones',
    VER_HISTORIAL_DESVINCULACIONES = 'ver_historial_desvinculaciones',
    GESTIONAR_CONTABILIDAD = 'gestionar_contabilidad',
    GESTIONAR_CATALOGO_CUENTAS = 'gestionar_catalogo_cuentas',
    VER_REPORTES_FINANCIEROS = 'ver_reportes_financieros',
}

export type RolePermissions = {
    [key in Role]?: Permission[];
};

export interface OfflineAction {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
}

// --- Nómina ---
export interface Empleado {
  id: number;
  empresaId: number;
  nombre: string;
  cedula: string;
  puesto: string;
  salarioBrutoMensual: number;
  fechaIngreso: string;
  activo: boolean;
}

export interface NominaEmpleado {
  empleadoId: number;
  nombre: string;
  salarioBruto: number;
  // Deducciones Empleado
  afp: number;
  sfs: number;
  isr: number;
  totalDeduccionesEmpleado: number;
  // Aportes Empleador
  sfsEmpleador: number;
  srlEmpleador: number;
  afpEmpleador: number;
  infotep: number;
  totalAportesEmpleador: number;
  // Totales
  salarioNeto: number;
}

export interface Nomina {
  id: string; // YYYY-MM
  empresaId: number;
  fecha: string;
  periodo: string; // 'YYYY-MM'
  empleados: NominaEmpleado[];
  totalPagado: number;
  totalCostoEmpresa: number;
  asientoId?: string;
}

export enum CausaDesvinculacion {
    Desahucio = 'desahucio',
    Despido = 'despido',
    Dimision = 'dimision',
    Contrato = 'terminacion_contrato'
}

export interface Desvinculacion {
    id: number;
    empresaId: number;
    empleadoId: number;
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

// Contabilidad
export interface AsientoContable {
    id: string;
    empresaId: number;
    fecha: string;
    descripcion: string;
    transaccionId: string; 
    transaccionTipo: string; 
    entradas: { cuentaId: string, descripcion: string, debito: number, credito: number }[];
}

export type AccountType = 'Activo' | 'Pasivo' | 'Capital' | 'Ingreso' | 'Costo' | 'Gasto';

export interface CuentaContable {
  id: string; // e.g., '1101-01'
  nombre: string;
  tipo: AccountType;
  permiteMovimientos: boolean;
  padreId?: string | null;
}