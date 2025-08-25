
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
    monto: number; 
    ncf?: string;
    descripcion: string;
    conciliado: boolean;
    aplicaITBIS: boolean;
    comments: Comment[];
    auditLog: AuditLogEntry[];
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
}

export interface Item {
    id: number;
    empresaId: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    precio: number;
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
    B01 = 'B01 - Crédito Fiscal',
    B02 = 'B02 - Consumidor Final',
    B04 = 'B04 - Nota de Crédito',
    B11 = 'B11 - Régimen Especial de Tributación',
    B12 = 'B12 - Gubernamental',
    B14 = 'B14 - Comprobante para Exportaciones',
    B15 = 'B15 - Pagos al Exterior',
    B16 = 'B16 - Gastos Menores',
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
    aplicaITBIS: boolean;
    aplicaISC: boolean;
    isc: number;
    itbis: number;
    aplicaPropina: boolean;
    propinaLegal: number;
    montoTotal: number;
    codigoModificacion: keyof typeof CodigoModificacionNCF;
    descripcion: string;
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
