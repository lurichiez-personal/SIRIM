
import { create } from 'zustand';
import { Factura, Cliente, Item, Gasto, Ingreso, Cotizacion, NotaCreditoDebito, FacturaEstado, CotizacionEstado, MetodoPago, NotaType, FacturaRecurrente, PagedResult, CodigoModificacionNCF, KpiData, ChartDataPoint, PieChartDataPoint, Comment, AuditLogEntry, Empleado, Nomina, Desvinculacion, AsientoContable, NominaStatus, NotificationType } from '../types';
import { useTenantStore } from './useTenantStore';
import { useNotificationStore } from './useNotificationStore';
import { useAuthStore } from './useAuthStore';
import { generarAsientoNomina, generarAsientoFacturaVenta, generarAsientoGasto, generarAsientoIngreso, generarAsientoNotaCredito, generarAsientoDesvinculacion } from '../utils/accountingUtils';
import { apiClient } from '../services/apiClient';

// --- MOCK DATA SOURCE ---

let allClientes: Cliente[] = [
    { id: 1, empresaId: 1, nombre: 'Cliente A Corp', rnc: '130123456', email: 'contact@clientea.com', telefono: '809-555-0001', activo: true, createdAt: '2023-01-15T00:00:00Z', estadoDGII: 'ACTIVO', condicionesPago: 'Neto 30' },
    { id: 2, empresaId: 1, nombre: 'Cliente B Industrial', rnc: '131987654', email: 'info@clienteb.com', telefono: '809-555-0002', activo: true, createdAt: '2023-02-20T00:00:00Z', estadoDGII: 'ACTIVO', condicionesPago: 'Neto 15' },
    { id: 3, empresaId: 2, nombre: 'Asociados de Consultoría XYZ', rnc: '132112233', email: 'info@consultores.com', telefono: '809-555-0003', activo: true, createdAt: '2023-03-10T00:00:00Z', estadoDGII: 'ACTIVO', condicionesPago: 'Neto 30' },
    { id: 4, empresaId: 1, nombre: 'Comercial C & D', rnc: '130778899', email: 'ventas@comercialcd.com', telefono: '809-555-0004', activo: false, createdAt: '2023-04-05T00:00:00Z', estadoDGII: 'SUSPENDIDO', condicionesPago: 'Al contado' },
    { id: 5, empresaId: 3, nombre: 'Constructora Principal', rnc: '132555666', email: 'proyectos@constructorap.com', telefono: '809-555-0005', activo: true, createdAt: '2023-05-12T00:00:00Z', estadoDGII: 'ACTIVO', condicionesPago: 'Neto 60' },
];

let allFacturas: Factura[] = [
    { id: 101, empresaId: 1, clienteId: 1, clienteNombre: 'Cliente A Corp', fecha: '2024-05-20', items: [{itemId: 1001, codigo: 'SERV-CONS', descripcion: 'Servicio de Consultoría', cantidad: 25, precioUnitario: 5000, subtotal: 125000}], subtotal: 125000, aplicaITBIS: true, aplicaISC: true, isc: 2118.64, itbis: 22881.36, aplicaPropina: false, propinaLegal: 0, montoTotal: 150000.00, montoPagado: 150000.00, ncf: 'B0100000101', estado: FacturaEstado.Pagada, conciliado: false, comments: [], auditLog: [] },
    { id: 102, empresaId: 1, clienteId: 2, clienteNombre: 'Cliente B Industrial', fecha: '2024-05-15', items: [], subtotal: 70000.00, descuentoPorcentaje: 5, montoDescuento: 3500, aplicaITBIS: true, aplicaISC: false, isc: 0, itbis: 11970, aplicaPropina: false, propinaLegal: 0, montoTotal: 78470, montoPagado: 40000, ncf: 'B0100000102', estado: FacturaEstado.PagadaParcialmente, conciliado: false, comments: [], auditLog: [] },
    { id: 103, empresaId: 1, clienteId: 4, clienteNombre: 'Comercial C & D', fecha: '2024-04-10', items: [], subtotal: 25000.00, aplicaITBIS: true, itbis: 4500, montoTotal: 29500.00, montoPagado: 0, ncf: 'B0100000103', estado: FacturaEstado.Vencida, conciliado: false, comments: [], auditLog: [] },
];
let allItems: Item[] = [
    { id: 1001, empresaId: 1, codigo: 'SERV-CONS', nombre: 'Servicio de Consultoría', precio: 5000.00, costo: 2000, cantidadDisponible: undefined },
    { id: 1002, empresaId: 1, codigo: 'SERV-WEB', nombre: 'Desarrollo Web', precio: 8000.00, costo: 3000, cantidadDisponible: undefined },
    { id: 1003, empresaId: 1, codigo: 'PROD-A', nombre: 'Producto A', precio: 750.00, costo: 400, cantidadDisponible: 100 },
    { id: 1004, empresaId: 1, codigo: 'PROD-B', nombre: 'Producto B', precio: 1200.00, costo: 700, cantidadDisponible: 4 },
];

let allCotizaciones: Cotizacion[] = [
    { id: 201, empresaId: 1, clienteId: 1, clienteNombre: 'Cliente A Corp', clienteRNC: '130123456', fecha: '2024-05-10', items: [], subtotal: 50000, aplicaITBIS: true, montoTotal: 59000, estado: CotizacionEstado.Pendiente, itbis: 9000, comments: [], auditLog: [] },
    { id: 202, empresaId: 1, clienteId: 2, clienteNombre: 'Cliente B Industrial', clienteRNC: '131987654', fecha: '2024-04-25', items: [], subtotal: 120000, aplicaITBIS: true, montoTotal: 141600, estado: CotizacionEstado.Facturada, itbis: 21600, comments: [], auditLog: [] },
];

let allGastos: Gasto[] = [
    { id: 301, empresaId: 1, proveedorNombre: 'Proveedor de Oficina S.A.', rncProveedor: '130999888', categoriaGasto: '09 - COMPRAS Y GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA', fecha: '2024-05-18', subtotal: 15000, itbis: 2700, isc: 500, propinaLegal: 150, monto: 18350, ncf: 'B0100003456', descripcion: 'Compra de papelería y suministros de oficina', conciliado: false, aplicaITBIS: true, comments: [], auditLog: [], metodoPago: MetodoPago['02-CHEQUES/TRANSFERENCIAS/DEPOSITO'] },
];

let allIngresos: Ingreso[] = [
    { id: 401, empresaId: 1, clienteId: 2, clienteNombre: 'Cliente B Industrial', facturaId: 102, fecha: '2024-05-22', monto: 40000, metodoPago: MetodoPago['02-CHEQUES/TRANSFERENCIAS/DEPOSITO'], conciliado: false },
    { id: 402, empresaId: 1, clienteId: 1, clienteNombre: 'Cliente A Corp', facturaId: 101, fecha: '2024-05-20', monto: 150000.00, metodoPago: MetodoPago['02-CHEQUES/TRANSFERENCIAS/DEPOSITO'], conciliado: false },
];

let allNotas: NotaCreditoDebito[] = [];
let allFacturasRecurrentes: FacturaRecurrente[] = [];
let allEmpleados: Empleado[] = [
    { id: 1, empresaId: 1, nombre: 'Juan Perez', cedula: '001-1234567-8', puesto: 'Gerente General', salarioBrutoMensual: 150000, fechaIngreso: '2020-01-15', activo: true },
    { id: 2, empresaId: 1, nombre: 'Maria Rodriguez', cedula: '001-8765432-1', puesto: 'Analista Contable', salarioBrutoMensual: 75000, fechaIngreso: '2021-06-01', activo: true },
];
let allNominas: Nomina[] = [];
let allDesvinculaciones: Desvinculacion[] = [];
let allAsientosContables: AsientoContable[] = [];


const calculateNextDate = (currentDate: string, frequency: 'diaria' | 'semanal' | 'mensual' | 'anual'): string => {
    const date = new Date(currentDate + 'T00:00:00'); // Ensure correct date parsing
    switch (frequency) {
        case 'diaria': date.setDate(date.getDate() + 1); break;
        case 'semanal': date.setDate(date.getDate() + 7); break;
        case 'mensual': date.setMonth(date.getMonth() + 1); break;
        case 'anual': date.setFullYear(date.getFullYear() + 1); break;
    }
    return date.toISOString().split('T')[0];
};

// --- STORE DEFINITION ---
interface DataState {
  // Raw data (simulating DB tables)
  clientes: Cliente[]; facturas: Factura[]; items: Item[]; cotizaciones: Cotizacion[]; notas: NotaCreditoDebito[]; gastos: Gasto[]; ingresos: Ingreso[]; facturasRecurrentes: FacturaRecurrente[];
  empleados: Empleado[]; nominas: Nomina[]; desvinculaciones: Desvinculacion[]; asientosContables: AsientoContable[];
  // Actions
  fetchData: (empresaId: number) => void;
  clearData: () => void;
  // Paged Getters
  getPagedClientes: (options: { page: number, pageSize: number, searchTerm?: string, status?: 'todos' | 'activo' | 'inactivo' }) => PagedResult<Cliente>;
  getPagedFacturas: (options: { page: number, pageSize: number, searchTerm?: string, status?: string, startDate?: string, endDate?: string }) => PagedResult<Factura>;
  getPagedGastos: (options: { page: number, pageSize: number, searchTerm?: string, category?: string }) => PagedResult<Gasto>;
  getPagedItems: (options: { page: number, pageSize: number, searchTerm?: string }) => PagedResult<Item>;
  getPagedIngresos: (options: { page: number, pageSize: number, searchTerm?: string, startDate?: string, endDate?: string, metodoPago?: string }) => PagedResult<Ingreso>;
  getPagedCotizaciones: (options: { page: number, pageSize: number, searchTerm?: string, status?: string, startDate?: string, endDate?: string }) => PagedResult<Cotizacion>;
  getPagedNotas: (options: { page: number, pageSize: number, searchTerm?: string, startDate?: string, endDate?: string }) => PagedResult<NotaCreditoDebito>;
  getPagedFacturasRecurrentes: (options: { page: number, pageSize: number, searchTerm?: string, status?: 'todos' | 'activa' | 'inactiva' }) => PagedResult<FacturaRecurrente>;
  
  // DGII Report Getters
  getGastosFor606: (startDate: string, endDate: string) => Gasto[];
  getVentasFor607: (startDate: string, endDate: string) => { facturas: Factura[], notas: NotaCreditoDebito[] };
  getAnuladosFor608: (startDate: string, endDate: string) => { ncf: string, fecha: string }[];
  getNominaForPeriodo: (periodo: string) => Nomina | undefined;
  getNominaById: (nominaId: string) => Nomina | undefined;

  // --- Pilar 1: Dashboard Getters ---
  getKpis: () => KpiData;
  getSalesVsExpensesData: (period: 'year' | '30days') => ChartDataPoint[];
  getGastosByCategoryData: () => PieChartDataPoint[];
  getIngresosByClientData: () => PieChartDataPoint[];

  // Mutators
  addFactura: (facturaData: Omit<Factura, 'id' | 'empresaId' | 'conciliado'>) => void;
  updateFactura: (factura: Factura) => void;
  updateFacturaStatus: (facturaId: number, status: FacturaEstado) => void;
  bulkUpdateFacturaStatus: (facturaIds: number[], status: FacturaEstado) => void;

  addCliente: (clienteData: Omit<Cliente, 'id'|'empresaId'|'createdAt'|'activo'>) => Cliente;
  updateCliente: (cliente: Cliente) => void;
  deleteCliente: (clienteId: number) => Promise<void>;
  bulkDeleteClientes: (clienteIds: number[]) => Promise<void>;
  bulkUpdateClienteStatus: (clienteIds: number[], activo: boolean) => void;
  
  addIngreso: (ingresoData: Omit<Ingreso, 'id' | 'empresaId' | 'conciliado'>) => void;
  getFacturasParaPago: () => Factura[];

  addItem: (itemData: Omit<Item, 'id' | 'empresaId'>) => Promise<void>;
  updateItem: (item: Item) => void;

  addGasto: (gastoData: Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>) => Promise<void>;
  updateGasto: (gasto: Gasto) => void;
  bulkDeleteGastos: (gastoIds: number[]) => void;

  addCotizacion: (cotizacionData: Omit<Cotizacion, 'id' | 'empresaId' | 'estado'>) => void;
  updateCotizacion: (cotizacion: Cotizacion) => void;
  updateCotizacionStatus: (cotizacionId: number, status: CotizacionEstado) => void;

  addNota: (notaData: Omit<NotaCreditoDebito, 'id' | 'empresaId'>) => void;

  addFacturaRecurrente: (data: Omit<FacturaRecurrente, 'id' | 'empresaId' | 'fechaProxima' | 'activa'>) => void;
  updateFacturaRecurrente: (data: FacturaRecurrente) => void;
  
  addComment: (documentType: 'factura' | 'gasto' | 'cotizacion', documentId: number, text: string) => void;
  addAuditLog: (documentType: 'factura' | 'gasto' | 'cotizacion' | 'nomina', documentId: number | string, action: string) => void;

  // --- Pilar 2: Conciliación Mutators ---
  setConciliadoStatus: (recordType: 'factura' | 'gasto' | 'ingreso', recordId: number, status: boolean) => void;

  // --- Nómina Mutators ---
  addEmpleado: (empleadoData: Omit<Empleado, 'id' | 'empresaId'>) => Promise<void>;
  updateEmpleado: (empleado: Empleado) => Promise<void>;
  deleteEmpleado: (empleadoId: number) => Promise<void>;
  bulkDeleteEmpleados: (empleadoIds: number[]) => Promise<void>;
  addNomina: (nominaData: Omit<Nomina, 'empresaId' | 'status' | 'generadoPor' | 'fechaGeneracion'>) => void;
  auditarNomina: (nominaId: string) => void;
  contabilizarNomina: (nominaId: string) => void;
  addDesvinculacion: (desvinculacion: Omit<Desvinculacion, 'id' | 'empresaId'>) => void;
  findDesvinculacionByCedula: (cedula: string) => Desvinculacion | undefined;
}

const applyPagination = <T,>(items: T[], page: number, pageSize: number): PagedResult<T> => {
    const totalCount = items.length;
    const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: pagedItems, totalCount, page, pageSize };
}

export const useDataStore = create<DataState>((set, get) => ({
  // --- STATE ---
  clientes: [], facturas: [], items: [], cotizaciones: [], notas: [], gastos: [], ingresos: [], facturasRecurrentes: [],
  empleados: [], nominas: [], desvinculaciones: [], asientosContables: [],

  // --- ACTIONS ---
  fetchData: async (empresaId) => {
    try {
      console.log(`Fetching data for empresa ${empresaId}...`);
      
      // Fetch all business data from API
      const [
        clientesRes,
        facturasRes,
        itemsRes,
        gastosRes,
        empleadosRes
      ] = await Promise.all([
        apiClient.getClientes(empresaId),
        apiClient.getFacturas(empresaId),
        apiClient.getItems(empresaId),
        apiClient.getGastos(empresaId),
        apiClient.getEmpleados(empresaId)
      ]);

      // Update store with real API data
      set({
        clientes: (clientesRes.rows as Cliente[]) || [],
        facturas: (facturasRes.rows as Factura[]) || [],
        items: (itemsRes.rows as Item[]) || [],
        gastos: (gastosRes.rows as Gasto[]) || [],
        empleados: (empleadosRes.rows as Empleado[]) || [],
        // For now, keep mock data for features not yet migrated
        cotizaciones: [...allCotizaciones.filter(c => c.empresaId === empresaId)],
        notas: [...allNotas.filter(n => n.empresaId === empresaId)],
        ingresos: [...allIngresos.filter(i => i.empresaId === empresaId)],
        facturasRecurrentes: [...allFacturasRecurrentes.filter(fr => fr.empresaId === empresaId)],
        nominas: [...allNominas.filter(n => n.empresaId === empresaId)],
        desvinculaciones: [...allDesvinculaciones.filter(d => d.empresaId === empresaId)],
        asientosContables: [...allAsientosContables.filter(a => a.empresaId === empresaId)],
      });

      console.log(`Data loaded: ${clientesRes.rows?.length || 0} clients, ${facturasRes.rows?.length || 0} invoices, ${itemsRes.rows?.length || 0} items, ${gastosRes.rows?.length || 0} expenses`);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to mock data if API fails
      set({
        clientes: [...allClientes.filter(c => c.empresaId === empresaId)],
        facturas: [...allFacturas.filter(f => f.empresaId === empresaId)],
        items: [...allItems.filter(i => i.empresaId === empresaId)],
        gastos: [...allGastos.filter(g => g.empresaId === empresaId)],
        empleados: [...allEmpleados.filter(e => e.empresaId === empresaId)],
        cotizaciones: [...allCotizaciones.filter(c => c.empresaId === empresaId)],
        notas: [...allNotas.filter(n => n.empresaId === empresaId)],
        ingresos: [...allIngresos.filter(i => i.empresaId === empresaId)],
        facturasRecurrentes: [...allFacturasRecurrentes.filter(fr => fr.empresaId === empresaId)],
        nominas: [...allNominas.filter(n => n.empresaId === empresaId)],
        desvinculaciones: [...allDesvinculaciones.filter(d => d.empresaId === empresaId)],
        asientosContables: [...allAsientosContables.filter(a => a.empresaId === empresaId)],
      });
    }
  },
  clearData: () => {
    set({ clientes: [], facturas: [], items: [], cotizaciones: [], notas: [], gastos: [], ingresos: [], facturasRecurrentes: [], empleados: [], nominas: [], desvinculaciones: [], asientosContables: [] });
  },
    
  // --- PAGED GETTERS ---
  getPagedClientes: ({ page, pageSize, searchTerm = '', status = 'todos' }) => {
    let filtered = get().clientes;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(c => c.nombre.toLowerCase().includes(lowerTerm) || c.rnc?.toLowerCase().includes(lowerTerm));
    }
    if (status !== 'todos') {
        const isActive = status === 'activo';
        filtered = filtered.filter(c => c.activo === isActive);
    }
    return applyPagination(filtered, page, pageSize);
  },
  getPagedFacturas: ({ page, pageSize, searchTerm, status, startDate, endDate }) => {
    let filtered = get().facturas;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(f => f.clienteNombre.toLowerCase().includes(lowerTerm) || f.ncf?.toLowerCase().includes(lowerTerm));
    }
    if (status && status !== 'todos') {
        filtered = filtered.filter(f => f.estado === status);
    }
    if (startDate) {
        filtered = filtered.filter(f => f.fecha >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(f => f.fecha <= endDate);
    }
    return applyPagination(filtered.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()), page, pageSize);
  },
  getPagedGastos: ({ page, pageSize, searchTerm = '', category = 'todos' }) => {
      let filtered = get().gastos;
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          filtered = filtered.filter(g =>
              g.proveedorNombre?.toLowerCase().includes(lowerTerm) ||
              g.ncf?.toLowerCase().includes(lowerTerm) ||
              g.descripcion.toLowerCase().includes(lowerTerm)
          );
      }
      if (category !== 'todos') {
          filtered = filtered.filter(g => g.categoriaGasto === category);
      }
      return applyPagination(filtered.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()), page, pageSize);
  },
  getPagedItems: ({ page, pageSize, searchTerm = '' }) => {
      let filtered = get().items;
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          filtered = filtered.filter(i =>
              i.nombre.toLowerCase().includes(lowerTerm) ||
              i.codigo.toLowerCase().includes(lowerTerm)
          );
      }
      return applyPagination(filtered, page, pageSize);
  },
  getPagedIngresos: ({ page, pageSize, searchTerm, startDate, endDate, metodoPago }) => {
      let filtered = get().ingresos;
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(i => i.clienteNombre?.toLowerCase().includes(lowerTerm));
      }
      if (startDate) {
          filtered = filtered.filter(f => f.fecha >= startDate);
      }
      if (endDate) {
          filtered = filtered.filter(f => f.fecha <= endDate);
      }
      if (metodoPago && metodoPago !== 'todos') {
          filtered = filtered.filter(i => i.metodoPago === metodoPago);
      }
      return applyPagination(filtered.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()), page, pageSize);
  },
  getPagedCotizaciones: ({ page, pageSize, searchTerm, status, startDate, endDate }) => {
    let filtered = get().cotizaciones;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(c => c.clienteNombre.toLowerCase().includes(lowerTerm) || c.id.toString().includes(lowerTerm));
    }
    if (status && status !== 'todos') {
        filtered = filtered.filter(c => c.estado === status);
    }
    if (startDate) {
        filtered = filtered.filter(c => c.fecha >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(c => c.fecha <= endDate);
    }
    return applyPagination(filtered.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()), page, pageSize);
  },
  getPagedNotas: ({ page, pageSize, searchTerm, startDate, endDate }) => {
    let filtered = get().notas;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(n => n.clienteNombre.toLowerCase().includes(lowerTerm) || n.ncf.toLowerCase().includes(lowerTerm) || n.facturaAfectadaNCF.toLowerCase().includes(lowerTerm));
    }
    if (startDate) {
        filtered = filtered.filter(n => n.fecha >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(n => n.fecha <= endDate);
    }
    return applyPagination(filtered.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()), page, pageSize);
  },
   getPagedFacturasRecurrentes: ({ page, pageSize, searchTerm = '', status = 'todos' }) => {
    let filtered = get().facturasRecurrentes;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(f => f.clienteNombre.toLowerCase().includes(lowerTerm) || f.descripcion.toLowerCase().includes(lowerTerm));
    }
    if (status !== 'todos') {
        const isActive = status === 'activa';
        filtered = filtered.filter(f => f.activa === isActive);
    }
    return applyPagination(filtered, page, pageSize);
  },
  
  // --- DGII GETTERS ---
  getGastosFor606: (startDate, endDate) => {
    return get().gastos.filter(g => {
        if (!g.ncf) return false;
        // Robust string comparison, immune to timezone issues.
        return g.fecha >= startDate && g.fecha <= endDate;
    });
  },
  getVentasFor607: (startDate, endDate) => {
      const facturas = get().facturas.filter(f => {
          if (!f.ncf || f.estado === FacturaEstado.Anulada) return false;
          return f.fecha >= startDate && f.fecha <= endDate;
      });
      const notas = get().notas.filter(n => {
          if (n.tipo !== NotaType.Credito) return false;
          return n.fecha >= startDate && n.fecha <= endDate;
      });
      return { facturas, notas };
  },
  getAnuladosFor608: (startDate, endDate) => {
      const anulados: { ncf: string, fecha: string }[] = [];
      
      get().facturas.forEach(f => {
          if (f.estado === FacturaEstado.Anulada && f.ncf) {
                if (f.fecha >= startDate && f.fecha <= endDate) {
                  anulados.push({ ncf: f.ncf, fecha: f.fecha });
                }
          }
      });
      
      get().notas.forEach(n => {
          if (n.codigoModificacion === '01' && n.facturaAfectadaNCF) {
              if (n.fecha >= startDate && n.fecha <= endDate) {
                  if (!anulados.some(a => a.ncf === n.facturaAfectadaNCF)) {
                      anulados.push({ ncf: n.facturaAfectadaNCF, fecha: n.fecha });
                  }
              }
          }
      });

      return anulados;
  },
  getNominaForPeriodo: (periodo: string) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return undefined;
    return get().nominas.find(n => n.periodo === periodo && n.empresaId === empresaId);
  },
  getNominaById: (nominaId: string) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return undefined;
    return get().nominas.find(n => n.id === nominaId && n.empresaId === empresaId);
  },
  
  // --- Pilar 1: Dashboard Getters ---
  getKpis: () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const facturasMes = get().facturas.filter(f => f.fecha >= firstDay && f.fecha <= lastDay && f.estado !== FacturaEstado.Anulada);
    const ingresosMes = get().ingresos.filter(i => i.fecha >= firstDay && i.fecha <= lastDay);
    const gastosMes = get().gastos.filter(g => g.fecha >= firstDay && g.fecha <= lastDay);
    
    const totalFacturado = facturasMes.reduce((acc, f) => acc + f.montoTotal, 0);
    const totalCobrado = ingresosMes.reduce((acc, i) => acc + i.monto, 0);
    const totalGastos = gastosMes.reduce((acc, g) => acc + g.monto, 0);
    const beneficioPerdida = totalCobrado - totalGastos;
    
    const facturasPendientes = get().facturas.filter(f => f.estado === FacturaEstado.Emitida || f.estado === FacturaEstado.PagadaParcialmente || f.estado === FacturaEstado.Vencida).length;
    
    const totalFacturadoHistorico = get().facturas.filter(f => f.estado !== FacturaEstado.Anulada).reduce((acc, f) => acc + f.montoTotal, 0);
    const totalCobradoHistorico = get().ingresos.reduce((acc, i) => acc + i.monto, 0);
    const cuentasPorCobrar = totalFacturadoHistorico - totalCobradoHistorico;

    // ITBIS Calculation (simplified from Anexo A)
    const itbisVentas = facturasMes.reduce((acc, f) => acc + f.itbis, 0);
    const itbisCompras = gastosMes.reduce((acc, g) => acc + g.itbis, 0);
    
    // Financial Statement Simplified
    const valorInventario = get().items.reduce((acc, item) => acc + ((item.cantidadDisponible || 0) * (item.costo || item.precio)), 0);
    const activos = cuentasPorCobrar + valorInventario; // Simplified
    const totalGastadoHistorico = allGastos.filter(g => g.empresaId === useTenantStore.getState().selectedTenant?.id).reduce((acc, g) => acc + g.monto, 0);
    const patrimonio = totalCobradoHistorico - totalGastadoHistorico; // Simplified Equity

    const ISR_RATE = 0.27; // 27%
    const isrProyectado = beneficioPerdida > 0 ? beneficioPerdida * ISR_RATE : 0;

    return {
        totalFacturado,
        totalCobrado,
        gastosMes: totalGastos,
        facturasPendientes,
        beneficioPerdida,
        cuentasPorCobrar,
        itbisAPagar: {
            total: itbisVentas - itbisCompras,
            itbisVentas,
            itbisCompras,
        },
        activos,
        patrimonio,
        isrProyectado,
    };
  },
  getSalesVsExpensesData: (period) => { return []; },
  getGastosByCategoryData: () => { return []; },
  getIngresosByClientData: () => { return []; },

  // --- MUTATORS ---
  addAuditLog: (documentType, documentId, action) => {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const newLog: AuditLogEntry = {
          id: `${Date.now()}`,
          userId: user.id,
          userName: user.nombre,
          action,
          timestamp: new Date().toISOString()
      };

      let targetArray;
      switch (documentType) {
          case 'factura': targetArray = allFacturas; break;
          case 'gasto': targetArray = allGastos; break;
          case 'cotizacion': targetArray = allCotizaciones; break;
          // Nomina uses string ID, so we handle it separately if needed, though this structure is simple
          default: return;
      }
      
      const docIndex = targetArray.findIndex(doc => doc.id === documentId);
      if (docIndex > -1) {
          targetArray[docIndex].auditLog.push(newLog);
      }
  },
  
  addComment: (documentType, documentId, text) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    const newComment: Comment = {
      id: `${Date.now()}`,
      userId: user.id,
      userName: user.nombre,
      text,
      timestamp: new Date().toISOString()
    };
    
    let targetArray;
      switch (documentType) {
          case 'factura': targetArray = allFacturas; break;
          case 'gasto': targetArray = allGastos; break;
          case 'cotizacion': targetArray = allCotizaciones; break;
          default: return;
      }
      
      const docIndex = targetArray.findIndex(doc => doc.id === documentId);
      if (docIndex > -1) {
          targetArray[docIndex].comments.push(newComment);
      }
      
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if(empresaId) get().fetchData(empresaId);
  },

  addFactura: (facturaData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;

    const newFactura: Factura = { ...facturaData, id: Date.now(), empresaId, conciliado: false };
    
    // Automatic Accounting Entry
    const asiento = generarAsientoFacturaVenta(newFactura, get().items);
    newFactura.asientoId = asiento.id;
    allAsientosContables.unshift(asiento);

    get().addAuditLog('factura', newFactura.id, `creó y contabilizó la factura con NCF ${newFactura.ncf}.`);
    allFacturas.unshift(newFactura);
    
    newFactura.items.forEach(itemFacturado => {
        const itemIndex = allItems.findIndex(i => i.id === itemFacturado.itemId);
        if (itemIndex > -1 && allItems[itemIndex].cantidadDisponible !== undefined) {
            allItems[itemIndex].cantidadDisponible! -= itemFacturado.cantidad;
        }
    });
    
    if (newFactura.facturaRecurrenteId) {
        const recurrenteIndex = allFacturasRecurrentes.findIndex(f => f.id === newFactura.facturaRecurrenteId);
        if (recurrenteIndex > -1) {
            const recurrente = allFacturasRecurrentes[recurrenteIndex];
            recurrente.fechaProxima = calculateNextDate(recurrente.fechaProxima, recurrente.frecuencia);
            get().addAuditLog('factura', newFactura.id, `fue generada desde la plantilla recurrente #${recurrente.id}.`);
        }
    }

    get().fetchData(empresaId);
    useNotificationStore.getState().checkSystemAlerts(empresaId); 
  },
  updateFactura: (factura) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allFacturas.findIndex(f => f.id === factura.id);
    if (index > -1) {
        allFacturas[index] = factura;
        get().addAuditLog('factura', factura.id, `actualizó la factura.`);
    }
    get().fetchData(empresaId);
  },
  updateFacturaStatus: (facturaId, status) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allFacturas.findIndex(f => f.id === facturaId);
    if (index > -1) {
        allFacturas[index].estado = status;
        get().addAuditLog('factura', facturaId, `cambió el estado a ${status}.`);
    }
    get().fetchData(empresaId);
  },
  bulkUpdateFacturaStatus: (facturaIds, status) => {
    facturaIds.forEach(id => get().updateFacturaStatus(id, status));
  },

  addCliente: async (clienteData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No tenant selected");
    
    try {
      const newClienteData = { ...clienteData, empresaId };
      const response = await apiClient.createCliente(newClienteData);
      
      if (response.error) {
        console.error('Error creating cliente:', response.error);
        throw new Error(response.error);
      }
      
      // Refresh data from API
      await get().fetchData(empresaId);
      return response.data;
    } catch (error) {
      console.error('Error adding cliente:', error);
      throw error;
    }
  },
  updateCliente: async (cliente) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Actualizar cliente usando API real
      await apiClient.updateCliente(cliente.id, cliente);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      throw error;
    }
  },

  deleteCliente: async (clienteId) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Eliminar cliente usando API real
      await apiClient.deleteCliente(clienteId);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      throw error;
    }
  },

  bulkDeleteClientes: async (clienteIds) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Eliminar clientes usando API real
      await apiClient.bulkDeleteClientes(clienteIds);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error eliminando clientes:', error);
      throw error;
    }
  },
   bulkUpdateClienteStatus: (clienteIds, activo) => {
    allClientes.forEach((cliente, index) => {
        if (clienteIds.includes(cliente.id)) {
            allClientes[index].activo = activo;
        }
    });
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (empresaId) get().fetchData(empresaId);
  },
  
  addIngreso: async (ingresoData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Crear ingreso en la base de datos usando API real
      const ingresoConEmpresa = { ...ingresoData, empresaId };
      await apiClient.createIngreso(ingresoConEmpresa);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error creando ingreso:', error);
      throw error;
    }
  },
  getFacturasParaPago: () => {
    return get().facturas.filter(f => f.estado !== FacturaEstado.Anulada && f.estado !== FacturaEstado.Pagada);
  },

  addItem: async (itemData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Crear item en la base de datos usando API real
      const itemConEmpresa = { ...itemData, empresaId };
      await apiClient.createItem(itemConEmpresa);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error creando item:', error);
      throw error;
    }
  },
  updateItem: (item) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allItems.findIndex(i => i.id === item.id);
    if (index > -1) {
        allItems[index] = item;
    }
    get().fetchData(empresaId);
    useNotificationStore.getState().checkSystemAlerts(empresaId);
  },

  addGasto: async (gastoData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Crear gasto en la base de datos usando API real
      const gastoConEmpresa = { ...gastoData, empresaId };
      await apiClient.createGasto(gastoConEmpresa);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error creando gasto:', error);
      throw error;
    }
  },
  updateGasto: async (gasto) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Actualizar gasto usando API real
      await apiClient.updateGasto(gasto.id, gasto);
      
      // Agregar log de auditoría
      get().addAuditLog('gasto', gasto.id, `actualizó el gasto.`);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error actualizando gasto:', error);
      throw error;
    }
  },
  bulkDeleteGastos: async (gastoIds) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Eliminar gastos usando API real
      await apiClient.bulkDeleteGastos(gastoIds);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error eliminando gastos:', error);
      throw error;
    }
  },

  addCotizacion: (cotizacionData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const newCotizacion: Cotizacion = { ...cotizacionData, id: Date.now(), empresaId, estado: CotizacionEstado.Pendiente };
    get().addAuditLog('cotizacion', newCotizacion.id, `creó la cotización.`);
    allCotizaciones.unshift(newCotizacion);
    get().fetchData(empresaId);
  },
  updateCotizacion: (cotizacion) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allCotizaciones.findIndex(c => c.id === cotizacion.id);
    if (index > -1) {
        allCotizaciones[index] = cotizacion;
        get().addAuditLog('cotizacion', cotizacion.id, `actualizó la cotización.`);
    }
    get().fetchData(empresaId);
  },
  updateCotizacionStatus: (cotizacionId, status) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allCotizaciones.findIndex(c => c.id === cotizacionId);
    if (index > -1) {
        allCotizaciones[index].estado = status;
        get().addAuditLog('cotizacion', cotizacionId, `cambió el estado a ${status}.`);
    }
    get().fetchData(empresaId);
  },

  addNota: (notaData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;

    const newNota: NotaCreditoDebito = { ...notaData, id: Date.now(), empresaId };
    
    const asiento = generarAsientoNotaCredito(newNota);
    newNota.asientoId = asiento.id;
    allAsientosContables.unshift(asiento);
    
    allNotas.unshift(newNota);
    get().fetchData(empresaId);
  },

  addFacturaRecurrente: (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const newRecurrente: FacturaRecurrente = {
        ...data,
        id: Date.now(),
        empresaId,
        fechaProxima: data.fechaInicio,
        activa: true
    };
    allFacturasRecurrentes.unshift(newRecurrente);
    get().fetchData(empresaId);
  },
  updateFacturaRecurrente: (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allFacturasRecurrentes.findIndex(f => f.id === data.id);
    if (index > -1) {
        allFacturasRecurrentes[index] = data;
    }
    get().fetchData(empresaId);
  },
  // --- Pilar 2: Conciliación Mutators ---
  setConciliadoStatus: (recordType, recordId, status) => {
     const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;

    let targetArray: (Factura | Gasto | Ingreso)[];
    switch (recordType) {
        case 'factura': targetArray = allFacturas; break;
        case 'gasto': targetArray = allGastos; break;
        case 'ingreso': targetArray = allIngresos; break;
    }

    const recordIndex = targetArray.findIndex(r => r.id === recordId);
    if (recordIndex > -1) {
        targetArray[recordIndex].conciliado = status;
    }

    get().fetchData(empresaId);
  },
  // --- Nómina Mutators ---
  addEmpleado: async (empleadoData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Crear empleado en la base de datos usando API real
      const empleadoConEmpresa = { ...empleadoData, empresaId };
      await apiClient.createEmpleado(empleadoConEmpresa);
      
      // Refrescar datos desde la base de datos para obtener el ID real
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error creando empleado:', error);
      throw error;
    }
  },
  updateEmpleado: async (empleado) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Actualizar empleado en la base de datos usando API real
      await apiClient.updateEmpleado(empleado.id, empleado);
      
      // Refrescar datos desde la base de datos para obtener datos actualizados
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error actualizando empleado:', error);
      throw error;
    }
  },

  deleteEmpleado: async (empleadoId) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Eliminar empleado usando API real
      await apiClient.deleteEmpleado(empleadoId);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error eliminando empleado:', error);
      throw error;
    }
  },

  bulkDeleteEmpleados: async (empleadoIds) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    
    try {
      // Eliminar empleados usando API real
      await apiClient.bulkDeleteEmpleados(empleadoIds);
      
      // Refrescar datos desde la base de datos
      await get().fetchData(empresaId);
    } catch (error) {
      console.error('Error eliminando empleados:', error);
      throw error;
    }
  },
  addNomina: (nominaData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    const user = useAuthStore.getState().user;
    if (!empresaId || !user) return;
    
    const newNomina: Nomina = {
      ...nominaData,
      empresaId,
      status: NominaStatus.PendienteAuditoria,
      generadoPor: { userId: user.id, userName: user.nombre },
      fechaGeneracion: new Date().toISOString(),
    };
    
    allNominas.unshift(newNomina);
    get().addAuditLog('nomina', newNomina.id, `generó la nómina para el período ${newNomina.periodo}.`);
    
    // Send notification to auditors
    useNotificationStore.getState().addNotification({
        empresaId,
        type: NotificationType.NOMINA_PARA_AUDITORIA,
        title: 'Nómina Pendiente de Auditoría',
        message: `La nómina para el período ${newNomina.periodo} está lista para ser auditada.`,
        link: `/nomina/historial`,
    });
    
    get().fetchData(empresaId);
  },
  auditarNomina: (nominaId: string) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    const user = useAuthStore.getState().user;
    if (!empresaId || !user) return;

    const nominaIndex = allNominas.findIndex(n => n.id === nominaId && n.empresaId === empresaId);
    if (nominaIndex > -1) {
      allNominas[nominaIndex].status = NominaStatus.Auditada;
      allNominas[nominaIndex].auditadoPor = { userId: user.id, userName: user.nombre };
      allNominas[nominaIndex].fechaAuditoria = new Date().toISOString();
      get().addAuditLog('nomina', nominaId, `auditó y aprobó la nómina.`);
      get().fetchData(empresaId);
    }
  },
  contabilizarNomina: (nominaId: string) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    const user = useAuthStore.getState().user;
    if (!empresaId || !user) return;

    const nominaIndex = allNominas.findIndex(n => n.id === nominaId && n.empresaId === empresaId);
    if (nominaIndex > -1) {
      const nomina = allNominas[nominaIndex];
      nomina.status = NominaStatus.Contabilizada;
      nomina.contabilizadoPor = { userId: user.id, userName: user.nombre };
      nomina.fechaContabilizacion = new Date().toISOString();
      
      const asiento = generarAsientoNomina(nomina, empresaId);
      nomina.asientoId = asiento.id;
      allAsientosContables.unshift(asiento);
      
      get().addAuditLog('nomina', nominaId, `ejecutó y contabilizó la nómina.`);
      get().fetchData(empresaId);
    }
  },
  addDesvinculacion: (desvinculacionData) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) return;
      const newDesvinculacion: Desvinculacion = { ...desvinculacionData, id: Date.now(), empresaId };

      const asiento = generarAsientoDesvinculacion(newDesvinculacion);
      newDesvinculacion.asientoId = asiento.id;
      allAsientosContables.unshift(asiento);

      allDesvinculaciones.unshift(newDesvinculacion);

      // Make employee inactive
      const empIndex = allEmpleados.findIndex(e => e.id === desvinculacionData.empleadoId);
      if (empIndex > -1) {
          allEmpleados[empIndex].activo = false;
      }
      
      get().fetchData(empresaId);
  },
  findDesvinculacionByCedula: (cedula: string) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) return undefined;
      // Find the most recent desvinculacion for that cedula
      return [...allDesvinculaciones]
          .filter(d => d.empresaId === empresaId && d.empleadoCedula === cedula)
          .sort((a, b) => new Date(b.fechaSalida).getTime() - new Date(a.fechaSalida).getTime())[0];
  },
}));
