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
  empresaId?: number; // Para usuarios de una sola empresa
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
    subtotal: number; // cantidad * precioUnitario
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
    monto: number; // monto = subtotal + itbis
    ncf?: string;
    descripcion: string;
    conciliado: boolean;
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
    cantidadDisponible?: number; // Para control de stock
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
}

// Nuevos tipos para NCF Management
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

// Nuevos tipos para Notas de Crédito/Débito
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
    ncf: string; // NCF de la nota (e.g., B04)
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

// --- Nuevos Tipos para Super App ---
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

// --- Pilar 1: Tipos de Dashboard ---
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

// --- Pilar 2: Tipos de Conciliación ---
export interface BankTransaction {
    fecha: string;
    descripcion: string;
    monto: number;
    tipo: 'credito' | 'debito';
    id: string; // Unique ID for the transaction line
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