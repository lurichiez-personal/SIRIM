
import { create } from 'zustand';
import { Factura, Cliente, Item, Gasto, Ingreso, Cotizacion, NotaCreditoDebito, FacturaEstado, CotizacionEstado, MetodoPago, NotaType, FacturaRecurrente, PagedResult, CodigoModificacionNCF, KpiData, ChartDataPoint, PieChartDataPoint, Comment, AuditLogEntry } from '../types';
import { useTenantStore } from './useTenantStore';
import { useNotificationStore } from './useNotificationStore';
import { useAuthStore } from './useAuthStore';

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
    { id: 1001, empresaId: 1, codigo: 'SERV-CONS', nombre: 'Servicio de Consultoría', precio: 5000.00, cantidadDisponible: undefined },
    { id: 1002, empresaId: 1, codigo: 'SERV-WEB', nombre: 'Desarrollo Web', precio: 8000.00, cantidadDisponible: undefined },
    { id: 1003, empresaId: 1, codigo: 'PROD-A', nombre: 'Producto A', precio: 750.00, cantidadDisponible: 100 },
    { id: 1004, empresaId: 1, codigo: 'PROD-B', nombre: 'Producto B', precio: 1200.00, cantidadDisponible: 4 },
];

let allCotizaciones: Cotizacion[] = [
    { id: 201, empresaId: 1, clienteId: 1, clienteNombre: 'Cliente A Corp', clienteRNC: '130123456', fecha: '2024-05-10', items: [], subtotal: 50000, aplicaITBIS: true, montoTotal: 59000, estado: CotizacionEstado.Pendiente, itbis: 9000, comments: [], auditLog: [] },
    { id: 202, empresaId: 1, clienteId: 2, clienteNombre: 'Cliente B Industrial', clienteRNC: '131987654', fecha: '2024-04-25', items: [], subtotal: 120000, aplicaITBIS: true, montoTotal: 141600, estado: CotizacionEstado.Facturada, itbis: 21600, comments: [], auditLog: [] },
];

let allGastos: Gasto[] = [
    { id: 301, empresaId: 1, proveedorNombre: 'Proveedor de Oficina S.A.', rncProveedor: '130999888', categoriaGasto: '09 - COMPRAS Y GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA', fecha: '2024-05-18', subtotal: 15000, itbis: 2700, monto: 17700, ncf: 'B0100003456', descripcion: 'Compra de papelería y suministros de oficina', conciliado: false, aplicaITBIS: true, comments: [], auditLog: [] },
];

let allIngresos: Ingreso[] = [
    { id: 401, empresaId: 1, clienteId: 2, clienteNombre: 'Cliente B Industrial', facturaId: 102, fecha: '2024-05-22', monto: 40000, metodoPago: MetodoPago['02-CHEQUES/TRANSFERENCIAS/DEPOSITO'], conciliado: false },
    { id: 402, empresaId: 1, clienteId: 1, clienteNombre: 'Cliente A Corp', facturaId: 101, fecha: '2024-05-20', monto: 150000.00, metodoPago: MetodoPago['02-CHEQUES/TRANSFERENCIAS/DEPOSITO'], conciliado: false },
];

let allNotas: NotaCreditoDebito[] = [];
let allFacturasRecurrentes: FacturaRecurrente[] = [];

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
  bulkUpdateClienteStatus: (clienteIds: number[], activo: boolean) => void;
  
  addIngreso: (ingresoData: Omit<Ingreso, 'id' | 'empresaId' | 'conciliado'>) => void;
  getFacturasParaPago: () => Factura[];

  addItem: (itemData: Omit<Item, 'id' | 'empresaId'>) => void;
  updateItem: (item: Item) => void;

  addGasto: (gastoData: Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>) => void;
  updateGasto: (gasto: Gasto) => void;
  bulkDeleteGastos: (gastoIds: number[]) => void;

  addCotizacion: (cotizacionData: Omit<Cotizacion, 'id' | 'empresaId' | 'estado'>) => void;
  updateCotizacion: (cotizacion: Cotizacion) => void;
  updateCotizacionStatus: (cotizacionId: number, status: CotizacionEstado) => void;

  addNota: (notaData: Omit<NotaCreditoDebito, 'id' | 'empresaId'>) => void;

  addFacturaRecurrente: (data: Omit<FacturaRecurrente, 'id' | 'empresaId' | 'fechaProxima' | 'activa'>) => void;
  updateFacturaRecurrente: (data: FacturaRecurrente) => void;
  
  addComment: (documentType: 'factura' | 'gasto' | 'cotizacion', documentId: number, text: string) => void;
  addAuditLog: (documentType: 'factura' | 'gasto' | 'cotizacion', documentId: number, action: string) => void;

  // --- Pilar 2: Conciliación Mutators ---
  setConciliadoStatus: (recordType: 'factura' | 'gasto' | 'ingreso', recordId: number, status: boolean) => void;
}

const applyPagination = <T,>(items: T[], page: number, pageSize: number): PagedResult<T> => {
    const totalCount = items.length;
    const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: pagedItems, totalCount, page, pageSize };
}

export const useDataStore = create<DataState>((set, get) => ({
  // --- STATE ---
  clientes: [],
  facturas: [],
  items: [],
  cotizaciones: [],
  notas: [],
  gastos: [],
  ingresos: [],
  facturasRecurrentes: [],

  // --- ACTIONS ---
  fetchData: (empresaId) => {
    // In a real app, this would be an API call. Here we filter mock data.
    set({
        clientes: [...allClientes.filter(c => c.empresaId === empresaId)],
        facturas: [...allFacturas.filter(f => f.empresaId === empresaId)],
        items: [...allItems.filter(i => i.empresaId === empresaId)],
        cotizaciones: [...allCotizaciones.filter(c => c.empresaId === empresaId)],
        notas: [...allNotas.filter(n => n.empresaId === empresaId)],
        gastos: [...allGastos.filter(g => g.empresaId === empresaId)],
        ingresos: [...allIngresos.filter(i => i.empresaId === empresaId)],
        facturasRecurrentes: [...allFacturasRecurrentes.filter(fr => fr.empresaId === empresaId)],
    });
  },
  clearData: () => {
    set({ clientes: [], facturas: [], items: [], cotizaciones: [], notas: [], gastos: [], ingresos: [], facturasRecurrentes: [] });
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
    
    const facturasPendientes = get().facturas.filter(f => f.estado === FacturaEstado.Emitida || f.estado === FacturaEstado.PagadaParcialmente || f.estado === FacturaEstado.Vencida).length;
    
    const totalFacturadoHistorico = get().facturas.filter(f => f.estado !== FacturaEstado.Anulada).reduce((acc, f) => acc + f.montoTotal, 0);
    const totalCobradoHistorico = get().ingresos.reduce((acc, i) => acc + i.monto, 0);

    // ITBIS Calculation (simplified from Anexo A)
    const itbisVentas = facturasMes.reduce((acc, f) => acc + f.itbis, 0);
    const itbisCompras = gastosMes.reduce((acc, g) => acc + g.itbis, 0);

    return {
        totalFacturado,
        totalCobrado,
        gastosMes: totalGastos,
        facturasPendientes,
        beneficioPerdida: totalCobrado - totalGastos,
        cuentasPorCobrar: totalFacturadoHistorico - totalCobradoHistorico,
        itbisAPagar: {
            total: itbisVentas - itbisCompras,
            itbisVentas,
            itbisCompras,
        }
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
    get().addAuditLog('factura', newFactura.id, `creó la factura con NCF ${newFactura.ncf}.`);
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
    useNotificationStore.getState().fetchNotifications(empresaId); 
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

  addCliente: (clienteData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No tenant selected");
    const newCliente: Cliente = {
        ...clienteData,
        id: Date.now(),
        empresaId,
        createdAt: new Date().toISOString(),
        activo: true,
        estadoDGII: 'ACTIVO', // Mock value
    };
    allClientes.unshift(newCliente);
    get().fetchData(empresaId);
    return newCliente;
  },
  updateCliente: (cliente) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allClientes.findIndex(c => c.id === cliente.id);
    if (index > -1) {
        allClientes[index] = cliente;
    }
    get().fetchData(empresaId);
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
  
  addIngreso: (ingresoData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;

    const newIngreso: Ingreso = { ...ingresoData, id: Date.now(), empresaId, conciliado: false };
    allIngresos.unshift(newIngreso);
    
    // Update invoice status
    const facturaIndex = allFacturas.findIndex(f => f.id === ingresoData.facturaId);
    if (facturaIndex > -1) {
        const factura = allFacturas[facturaIndex];
        factura.montoPagado += ingresoData.monto;
        const newStatus = factura.montoPagado >= factura.montoTotal ? FacturaEstado.Pagada : FacturaEstado.PagadaParcialmente;
        if(factura.estado !== newStatus) {
            factura.estado = newStatus;
            get().addAuditLog('factura', factura.id, `registró un pago de ${ingresoData.monto} y cambió el estado a ${newStatus}.`);
        } else {
            get().addAuditLog('factura', factura.id, `registró un pago de ${ingresoData.monto}.`);
        }
    }
    get().fetchData(empresaId);
  },
  getFacturasParaPago: () => {
    return get().facturas.filter(f => f.estado !== FacturaEstado.Anulada && f.estado !== FacturaEstado.Pagada);
  },

  addItem: (itemData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const newItem: Item = { ...itemData, id: Date.now(), empresaId };
    allItems.unshift(newItem);
    get().fetchData(empresaId);
  },
  updateItem: (item) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allItems.findIndex(i => i.id === item.id);
    if (index > -1) {
        allItems[index] = item;
    }
    get().fetchData(empresaId);
    useNotificationStore.getState().fetchNotifications(empresaId);
  },

  addGasto: (gastoData) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const newGasto: Gasto = { ...gastoData, id: Date.now(), empresaId, conciliado: false, comments: [], auditLog: [] };
    get().addAuditLog('gasto', newGasto.id, `registró el gasto.`);
    allGastos.unshift(newGasto);
    get().fetchData(empresaId);
  },
  updateGasto: (gasto) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) return;
    const index = allGastos.findIndex(g => g.id === gasto.id);
    if (index > -1) {
        allGastos[index] = gasto;
        get().addAuditLog('gasto', gasto.id, `actualizó el gasto.`);
    }
    get().fetchData(empresaId);
  },
  bulkDeleteGastos: (gastoIds) => {
    allGastos = allGastos.filter(g => !gastoIds.includes(g.id));
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (empresaId) get().fetchData(empresaId);
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
}));
