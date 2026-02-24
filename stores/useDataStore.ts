
// stores/useDataStore.ts
import { create } from 'zustand';
import { db, storage } from '../firebase.ts';
import {
  collection, onSnapshot, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, writeBatch, runTransaction, Unsubscribe, serverTimestamp, arrayUnion, orderBy, limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  Cliente, Factura, Gasto, Item, Ingreso, Cotizacion, NotaCreditoDebito, FacturaRecurrente,
  Credencial, Empleado, Nomina, Desvinculacion, AsientoContable, CierreITBIS, AnticipoISRPago,
  FacturaEstado, CotizacionEstado, NominaStatus, MetodoPago, isNcfConsumidorFinal, Comment, AuditLogEntry, PagedResult, KpiData, ChartDataPoint, PieChartDataPoint, NCFType, ActivoFijo, CalculoFiscalSnapshot, ExcelRow607, ImportLog, DataState, FiscalClosure
} from '../types.ts';
import { useTenantStore } from './useTenantStore.ts';
import { useAuthStore } from './useAuthStore.ts';
import { useAlertStore } from './useAlertStore.ts';
import { useTaskStore } from './useTaskStore.ts';
import {
  generarAsientoFacturaVenta, generarAsientoGasto, generarAsientoIngreso,
  generarAsientoNotaCredito, generarAsientoNomina, generarAsientoDesvinculacion, generarAsientoPago
} from '../utils/accountingUtils.ts';
import { useDGIIDataStore } from './useDGIIDataStore.ts';
import { GoogleGenAI } from "@google/genai";
import * as xlsx from 'xlsx';

const COLLECTIONS_TO_FETCH = [
  'clientes', 'facturas', 'gastos', 'items', 'ingresos', 'cotizaciones', 'notas', 
  'facturasRecurrentes', 'credenciales', 'empleados', 'nominas', 'desvinculaciones', 
  'asientosContables', 'cierresITBIS', 'pagosAnticiposISR', 'activosFijos'
];

const addDocWithId = async <T extends { empresaId: string }>(collectionName: string, data: T, withTimestamp = true) => {
    const fullData = withTimestamp 
      ? { ...data, createdAt: serverTimestamp() }
      : data;
    const docRef = await addDoc(collection(db, collectionName), fullData);
    return { ...fullData, id: docRef.id, createdAt: new Date().toISOString() };
};

const updateDocWithId = (collectionName: string, docId: string, data: any) => {
    return updateDoc(doc(db, collectionName, docId), data);
};

const deleteDocWithId = (collectionName: string, docId: string) => {
    return deleteDoc(doc(db, collectionName, docId));
};

const getFiscalPeriod = () => {
    const tenant = useTenantStore.getState().selectedTenant;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (!tenant) return { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` };

    const cierreMonthMap: Record<string, number> = {
        '31-diciembre': 11, '31-marzo': 2, '30-junio': 5, '30-septiembre': 8,
    };
    const cierreMonth = cierreMonthMap[tenant.cierreFiscal] || 11;

    if (cierreMonth === 11) return { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` };

    if (currentMonth > cierreMonth) {
        return { start: new Date(currentYear, cierreMonth + 1, 1).toISOString().split('T')[0], end: new Date(currentYear + 1, cierreMonth + 1, 0).toISOString().split('T')[0] };
    } else {
        return { start: new Date(currentYear - 1, cierreMonth + 1, 1).toISOString().split('T')[0], end: new Date(currentYear, cierreMonth + 1, 0).toISOString().split('T')[0] };
    }
};

async function generateHash(data: any) {
    const str = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export const useDataStore = create<DataState>((set, get) => ({
  clientes: [],
  facturas: [],
  gastos: [],
  items: [],
  ingresos: [],
  cotizaciones: [],
  notas: [],
  facturasRecurrentes: [],
  credenciales: [],
  empleados: [],
  nominas: [],
  desvinculaciones: [],
  asientosContables: [],
  cierresITBIS: [],
  pagosAnticiposISR: [],
  activosFijos: [],
  isLoading: true,
  unsubscribers: [],

  fetchData: (empresaId: string) => {
    get().clearData();
    set({ isLoading: true });
    
    const unsubscribers: Unsubscribe[] = COLLECTIONS_TO_FETCH.map(collName => {
      const q = query(collection(db, collName), where('empresaId', '==', empresaId));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        set({ [collName]: data });
      }, (error) => {
        console.error(`Error fetching ${collName}:`, error);
      });
    });
    
    set({ unsubscribers, isLoading: false });
  },

  clearData: () => {
    get().unsubscribers.forEach((unsub) => unsub());
    set({ ...COLLECTIONS_TO_FETCH.reduce((acc, name) => ({ ...acc, [name]: [] }), {}), isLoading: true, unsubscribers: [] });
  },

  // ... (Existing CRUD methods remain unchanged) ...
  addCliente: async (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    return addDocWithId('clientes', { ...data, empresaId });
  },
  updateCliente: (data) => updateDocWithId('clientes', data.id, data),
  deleteCliente: async (id) => {
    if (get().facturas.some(f => f.clienteId === id)) {
        useAlertStore.getState().showAlert('Acción Bloqueada', 'No se puede eliminar un cliente con facturas asociadas.');
        throw new Error("Cliente con facturas");
    }
    await deleteDocWithId('clientes', id);
  },
  bulkDeleteClientes: async (ids) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(doc(db, 'clientes', id)));
    await batch.commit();
  },
  bulkUpdateClienteStatus: async (ids, activo) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.update(doc(db, 'clientes', id), { activo }));
    await batch.commit();
  },

  addFactura: async (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    const newFacturaData = { ...data, empresaId, estado: FacturaEstado.Emitida, montoPagado: 0 };
    const newFactura = await addDocWithId('facturas', newFacturaData);
    const asiento = generarAsientoFacturaVenta(newFactura as Factura, get().items);
    const asientoWithId = await addDocWithId('asientosContables', { ...asiento, empresaId }, false);
    await updateDocWithId('facturas', newFactura.id, { asientoId: asientoWithId.id });
  },
  updateFactura: async (data) => {
    await updateDocWithId('facturas', data.id, data);
    if (data.asientoId) {
        const newAsiento = generarAsientoFacturaVenta(data, get().items);
        await updateDocWithId('asientosContables', data.asientoId, newAsiento);
    }
  },
  updateFacturaStatus: (id, status) => updateDocWithId('facturas', id, { estado: status }),
  deleteFactura: async (id) => {
      const factura = get().facturas.find(f => f.id === id);
      await deleteDocWithId('facturas', id);
      if (factura?.asientoId) await deleteDocWithId('asientosContables', factura.asientoId);
  },
  bulkDeleteFacturas: async (ids) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const factura = get().facturas.find(f => f.id === id);
        batch.delete(doc(db, 'facturas', id));
        if (factura?.asientoId) batch.delete(doc(db, 'asientosContables', factura.asientoId));
    });
    await batch.commit();
  },
  bulkUpdateFacturaStatus: async (ids, status) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.update(doc(db, 'facturas', id), { estado: status }));
    await batch.commit();
  },

  addGasto: async (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    const newGasto = await addDocWithId('gastos', { ...data, empresaId, conciliado: false });
    const asiento = generarAsientoGasto(newGasto as Gasto);
    const asientoWithId = await addDocWithId('asientosContables', { ...asiento, empresaId }, false);
    await updateDocWithId('gastos', newGasto.id, { asientoId: asientoWithId.id });
    return newGasto;
  },
  updateGasto: async (data) => {
    await updateDocWithId('gastos', data.id, data);
    if(data.asientoId) {
        const newAsiento = generarAsientoGasto(data);
        await updateDocWithId('asientosContables', data.asientoId, newAsiento);
    }
  },
  deleteGasto: async (id) => {
      const gasto = get().gastos.find(g => g.id === id);
      await deleteDocWithId('gastos', id);
      if (gasto?.asientoId) await deleteDocWithId('asientosContables', gasto.asientoId);
  },
  bulkDeleteGastos: async (ids) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const gasto = get().gastos.find(g => g.id === id);
        batch.delete(doc(db, 'gastos', id));
        if (gasto?.asientoId) batch.delete(doc(db, 'asientosContables', gasto.asientoId));
    });
    await batch.commit();
  },
  pagarGasto: async (id, fechaPago) => {
    const gasto = get().gastos.find(g => g.id === id);
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!gasto || !empresaId) return;
    const asientoPago = generarAsientoPago(empresaId, fechaPago, `Pago de gasto a ${gasto.proveedorNombre}`, gasto.id, 'pago_gasto', gasto.monto, '2101-01');
    const newAsiento = await addDocWithId('asientosContables', {...asientoPago, empresaId}, false);
    await updateDocWithId('gastos', id, { pagado: true, fechaPago, asientoPagoId: newAsiento.id });
  },
  setGastoAuditado: async (id, auditado) => {
    await updateDocWithId('gastos', id, { auditado });
  },

  addIngreso: async (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    const newIngreso = await addDocWithId('ingresos', { ...data, empresaId });
    await runTransaction(db, async (transaction) => {
        const facturaRef = doc(db, 'facturas', newIngreso.facturaId);
        const facturaDoc = await transaction.get(facturaRef);
        if (!facturaDoc.exists()) throw "Factura no encontrada";
        const facturaData = facturaDoc.data() as Factura;
        const nuevoMontoPagado = (facturaData.montoPagado || 0) + newIngreso.monto;
        const nuevoEstado = nuevoMontoPagado >= facturaData.montoTotal ? FacturaEstado.Pagada : FacturaEstado.PagadaParcialmente;
        transaction.update(facturaRef, { montoPagado: nuevoMontoPagado, estado: nuevoEstado });
    });
    const asiento = generarAsientoIngreso(newIngreso as Ingreso);
    const newAsiento = await addDocWithId('asientosContables', { ...asiento, empresaId }, false);
    await updateDocWithId('ingresos', newIngreso.id, { asientoId: newAsiento.id });
  },
  
  addItem: (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    return addDocWithId('items', { ...data, empresaId });
  },
  updateItem: (data) => updateDocWithId('items', data.id, data),

  addCotizacion: (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    return addDocWithId('cotizaciones', { ...data, empresaId, estado: CotizacionEstado.Pendiente });
  },
  updateCotizacion: (data) => updateDocWithId('cotizaciones', data.id, data),
  updateCotizacionStatus: (id, status) => updateDocWithId('cotizaciones', id, { estado: status }),

  addNota: async (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    const newNota = await addDocWithId('notas', { ...data, empresaId });
    const asiento = generarAsientoNotaCredito(newNota as NotaCreditoDebito);
    const newAsiento = await addDocWithId('asientosContables', { ...asiento, empresaId }, false);
    await updateDocWithId('notas', newNota.id, { asientoId: newAsiento.id });
  },
  updateNota: async (data) => {
    await updateDocWithId('notas', data.id, data);
    if (data.asientoId) {
        const newAsiento = generarAsientoNotaCredito(data);
        await updateDocWithId('asientosContables', data.asientoId, newAsiento);
    }
  },

  addFacturaRecurrente: (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    return addDocWithId('facturasRecurrentes', { ...data, empresaId, fechaProxima: data.fechaInicio, activa: true });
  },
  updateFacturaRecurrente: (data) => updateDocWithId('facturasRecurrentes', data.id, data),
  
  addCredencial: async (data, imageFile) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!empresaId) throw new Error("No hay empresa seleccionada.");
    let finalData = { ...data, empresaId };
    if (imageFile) {
        const storageRef = ref(storage, `keycards/${empresaId}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        finalData.keyCardImageUrl = await getDownloadURL(snapshot.ref);
    }
    await addDoc(collection(db, 'credenciales'), finalData);
  },
  updateCredencial: async (data, imageFile, removeImage) => {
    let finalData = { ...data };
    if (imageFile) {
        const storageRef = ref(storage, `keycards/${data.empresaId}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        finalData.keyCardImageUrl = await getDownloadURL(snapshot.ref);
    } else if (removeImage && data.keyCardImageUrl) {
        finalData.keyCardImageUrl = '';
    }
    await updateDocWithId('credenciales', data.id, finalData);
  },
  deleteCredencial: (id) => deleteDocWithId('credenciales', id),

  addEmpleado: (data) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) throw new Error("No hay empresa seleccionada.");
      return addDocWithId('empleados', {...data, empresaId});
  },
  updateEmpleado: (data) => updateDocWithId('empleados', data.id, data),

  addNomina: async (data) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    const user = useAuthStore.getState().user;
    if (!empresaId || !user) throw new Error("No hay empresa o usuario seleccionado.");
    const nominaData = { ...data, empresaId, status: NominaStatus.PendienteAuditoria, generadoPor: { userId: user.id, userName: user.nombre }, fechaGeneracion: new Date().toISOString() };
    await addDoc(collection(db, 'nominas'), nominaData);
  },
  deleteNomina: async (id) => {
    const nomina = get().nominas.find(n => n.id === id);
    if (!nomina) return;
    if(nomina.status === NominaStatus.Pagada) throw new Error("Nomina pagada");
    await deleteDocWithId('nominas', id);
    if (nomina.asientoId) await deleteDocWithId('asientosContables', nomina.asientoId);
  },
  auditarNomina: async (id) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    await updateDocWithId('nominas', id, { status: NominaStatus.Auditada, auditadoPor: { userId: user.id, userName: user.nombre }, fechaAuditoria: new Date().toISOString() });
  },
  pagarNomina: async (id, fechaPago) => {
    const nomina = get().nominas.find(n => n.id === id);
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    if (!nomina || !empresaId) return;
    let asientoId = nomina.asientoId;
    if (!asientoId) {
        const asientoProvision = generarAsientoNomina(nomina, empresaId);
        const newAsiento = await addDocWithId('asientosContables', {...asientoProvision, empresaId}, false);
        asientoId = newAsiento.id;
    }
    const asientoPago = generarAsientoPago(empresaId, fechaPago, `Pago de nómina ${nomina.periodo}`, nomina.id, 'pago_nomina', nomina.totalPagado, '2102-01');
    const newAsientoPago = await addDocWithId('asientosContables', {...asientoPago, empresaId}, false);
    await updateDocWithId('nominas', id, { status: NominaStatus.Pagada, fechaPago: fechaPago, asientoId, asientoPagoId: newAsientoPago.id, contabilizadoPor: { userId: 'system', userName: 'Sistema' }, fechaContabilizacion: new Date().toISOString() });
  },

  addDesvinculacion: async (data) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) throw new Error("No hay empresa seleccionada.");
      const newDesvinculacion = await addDocWithId('desvinculaciones', { ...data, empresaId });
      const asiento = generarAsientoDesvinculacion(newDesvinculacion);
      const asientoWithId = await addDocWithId('asientosContables', { ...asiento, empresaId }, false);
      await updateDocWithId('desvinculaciones', newDesvinculacion.id, { asientoId: asientoWithId.id });
      await updateDocWithId('empleados', data.empleadoId, { activo: false });
  },

  findGastoByNcfAndRnc: (ncf, rnc) => {
      const cleanNCF = ncf.trim().toUpperCase();
      const cleanRNC = rnc.trim().replace(/[^0-9]/g, '');
      return get().gastos.find(g => g.ncf.trim().toUpperCase() === cleanNCF && g.rncProveedor.trim().replace(/[^0-9]/g, '') === cleanRNC);
  },

  importGastosFromExcel: async (file, onProgress) => {
    return { message: "Importado" }; // Placeholder
  },

  importFacturasFromExcel: async (file, onProgress) => {
    const empresaId = useTenantStore.getState().selectedTenant?.id;
    const user = useAuthStore.getState().user;
    if (!empresaId || !user) throw new Error("No hay empresa o usuario seleccionado.");

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows: ExcelRow607[] = xlsx.utils.sheet_to_json(worksheet);

          if (rows.length === 0) throw new Error("El archivo está vacío.");

          const totalRows = rows.length;
          let processedCount = 0;
          let duplicatedCount = 0;
          let errorCount = 0;
          let totalAmount = 0;
          const errorDetails: any[] = [];
          
          const existingInvoicesSnapshot = await getDocs(query(collection(db, 'facturas'), where('empresaId', '==', empresaId)));
          const existingNcfs = new Set(existingInvoicesSnapshot.docs.map(doc => doc.data().ncf));
          
          const batchSize = 100;
          let currentBatch = writeBatch(db);
          let opsInBatch = 0;

          for (let i = 0; i < totalRows; i++) {
            const row = rows[i];
            const rowNumber = i + 2; 

            try {
              if (!row.NUMERO_COMPROBANTE_FISCAL) throw new Error("NCF faltante");
              if (!row.RNC_CEDULA_CLIENTE) throw new Error("RNC Cliente faltante");
              if (!row.FECHA_COMPROBANTE) throw new Error("Fecha faltante");
              
              const ncf = row.NUMERO_COMPROBANTE_FISCAL.toString().trim();
              
              if (existingNcfs.has(ncf)) {
                duplicatedCount++;
                continue; 
              }
              existingNcfs.add(ncf); 

              let fechaIso = '';
              if (typeof row.FECHA_COMPROBANTE === 'number') {
                  fechaIso = new Date((row.FECHA_COMPROBANTE - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
              } else {
                  const rawDate = row.FECHA_COMPROBANTE.toString();
                  if (rawDate.length === 8) {
                      fechaIso = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
                  } else {
                      fechaIso = new Date().toISOString().split('T')[0]; 
                  }
              }

              const montoFacturado = Number(row.MONTO_FACTURADO) || 0;
              const itbisFacturado = Number(row.ITBIS_FACTURADO) || 0;
              const itbisRetenido = Number(row.ITBIS_RETENIDO_TERCEROS) || 0;
              const montoTotal = montoFacturado + itbisFacturado;
              
              const efectivo = Number(row.EFECTIVO) || 0;
              const cheque = Number(row.CHEQUE_TRANSFERENCIA_DEPOSITO) || 0;
              const tarjeta = Number(row.TARJETA_DEBITO_CREDITO) || 0;
              const credito = Number(row.VENTA_A_CREDITO) || 0;
              
              const totalPagadoInstrumentos = efectivo + cheque + tarjeta;
              const esContado = totalPagadoInstrumentos >= (montoTotal - 0.5); 

              const facturaRef = doc(collection(db, 'facturas'));
              const asientoRef = doc(collection(db, 'asientosContables'));

              const facturaData: Factura = {
                  id: facturaRef.id,
                  empresaId,
                  clienteId: 'CLIENTE_GENERICO_IMPORTADO', 
                  clienteNombre: `Cliente ${row.RNC_CEDULA_CLIENTE}`, 
                  ncf: ncf,
                  ncfTipo: NCFType.B02, 
                  fecha: fechaIso,
                  items: [{ 
                      itemId: 'GENERICO',
                      codigo: 'IMP',
                      descripcion: 'Importación de Ventas 607',
                      cantidad: 1,
                      precioUnitario: montoFacturado,
                      subtotal: montoFacturado
                  }],
                  subtotal: montoFacturado,
                  descuentoPorcentaje: 0,
                  montoDescuento: 0,
                  aplicaITBIS: itbisFacturado > 0,
                  aplicaISC: false,
                  isc: 0,
                  itbis: itbisFacturado,
                  itbisRetenido: itbisRetenido,
                  aplicaPropina: false,
                  propinaLegal: 0,
                  montoTotal: montoTotal,
                  montoPagado: esContado ? montoTotal : 0,
                  estado: esContado ? FacturaEstado.Pagada : FacturaEstado.Emitida,
                  conciliado: false,
                  asientoId: asientoRef.id,
                  comments: [],
                  auditLog: [{
                      id: `log-${Date.now()}`,
                      userId: user.id,
                      userName: user.nombre,
                      action: 'Importada desde Excel (607)',
                      timestamp: new Date().toISOString()
                  }],
                  createdAt: new Date().toISOString()
              };

              const asientoData = generarAsientoFacturaVenta(facturaData, []);
              
              currentBatch.set(facturaRef, facturaData);
              currentBatch.set(asientoRef, { ...asientoData, id: asientoRef.id });
              
              processedCount++;
              opsInBatch += 2;
              totalAmount += montoTotal;

              if (opsInBatch >= batchSize) {
                  await currentBatch.commit();
                  currentBatch = writeBatch(db); 
                  opsInBatch = 0;
                  if (onProgress) onProgress((i / totalRows) * 100);
              }

            } catch (err: any) {
              errorCount++;
              errorDetails.push({ fila: rowNumber, ncf: row.NUMERO_COMPROBANTE_FISCAL || 'N/A', error: err.message });
              console.warn(`Error en fila ${rowNumber}:`, err.message);
            }
          }

          if (opsInBatch > 0) {
              await currentBatch.commit();
          }

          const logData: ImportLog = {
              id: `log-${Date.now()}`,
              empresaId,
              fecha: new Date().toISOString(),
              usuarioId: user.id,
              nombreArchivo: file.name,
              totalFilas: totalRows,
              totalProcesadas: processedCount,
              totalDuplicadas: duplicatedCount,
              totalErrores: errorCount,
              erroresDetalle: errorDetails.slice(0, 100), 
              montoTotalProcesado: totalAmount
          };
          await addDoc(collection(db, 'import_logs'), logData);

          resolve({ message: `Proceso completado. Procesadas: ${processedCount}. Duplicadas: ${duplicatedCount}. Errores: ${errorCount}.` });

        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  sincronizarNombresProveedores: async () => {},
  sincronizarAsientosFaltantes: async () => {},
  reconcileWithAI: async (c) => [],
  answerQuestionWithAI: async (q) => "Respuesta IA",
  
  calculateIngresosBrutosForPreviousFiscalYear: () => {
      const prevYear = new Date().getFullYear() - 1;
      const start = `${prevYear}-01-01`;
      const end = `${prevYear}-12-31`;
      return get().ingresos.filter(i => i.fecha >= start && i.fecha <= end).reduce((sum, i) => sum + i.monto, 0);
  },

  getAnexoBData: (periodoFiscal: number) => {
      const start = `${periodoFiscal}-01-01`;
      const end = `${periodoFiscal}-12-31`;
      const asientos = get().asientosContables.filter(a => a.fecha >= start && a.fecha <= end);
      
      let ingresos = 0;
      let costos = 0;
      let gastos = 0;
      
      asientos.forEach(a => {
          a.entradas.forEach(e => {
              if (e.cuentaId.startsWith('4')) ingresos += (e.credito - e.debito);
              if (e.cuentaId.startsWith('5')) costos += (e.debito - e.credito);
              if (e.cuentaId.startsWith('6')) gastos += (e.debito - e.credito);
          });
      });
      
      return { 
          totalIngresos: ingresos, 
          totalCostos: costos, 
          totalGastos: gastos, 
          utilidadBruta: ingresos - costos, 
          utilidadNeta: ingresos - costos - gastos 
      };
  },

  getAnexoAData: (periodoFiscal: number) => {
      const end = `${periodoFiscal}-12-31`;
      const asientos = get().asientosContables.filter(a => a.fecha <= end);
      
      let activos = 0;
      let pasivos = 0;
      let capital = 0;
      
      asientos.forEach(a => {
          a.entradas.forEach(e => {
              if (e.cuentaId.startsWith('1')) activos += (e.debito - e.credito);
              if (e.cuentaId.startsWith('2')) pasivos += (e.credito - e.debito);
              if (e.cuentaId.startsWith('3')) capital += (e.credito - e.debito);
              
              if (['4'].includes(e.cuentaId.charAt(0))) {
                  capital += (e.credito - e.debito);
              }
              if (['5', '6'].includes(e.cuentaId.charAt(0))) {
                  capital -= (e.debito - e.credito);
              }
          });
      });
      return { totalActivos: activos, totalPasivos: pasivos, totalCapital: capital };
  },

  getKpis: () => {
      const { start, end } = getFiscalPeriod();
      const ingresosPeriodo = get().ingresos.filter(i => i.fecha >= start && i.fecha <= end);
      const gastosPeriodo = get().gastos.filter(g => g.fecha >= start && g.fecha <= end);
      
      const totalCobrado = ingresosPeriodo.reduce((sum, i) => sum + i.monto, 0);
      const gastosMes = gastosPeriodo.reduce((sum, g) => sum + g.monto, 0);
      
      const facturasPendientes = get().facturas.filter(f => f.estado !== FacturaEstado.Pagada && f.estado !== FacturaEstado.Anulada);
      const cuentasPorCobrar = facturasPendientes.reduce((sum, f) => sum + (f.montoTotal - (f.montoPagado || 0)), 0);
      
      const inventarioValor = get().items.reduce((sum, i) => sum + ((i.costo || 0) * (i.cantidadDisponible || 0)), 0);
      const activos = cuentasPorCobrar + inventarioValor; 
      
      const totalVentasHist = get().ingresos.reduce((sum, i) => sum + i.monto, 0);
      const totalGastosHist = get().gastos.reduce((sum, g) => sum + g.monto, 0);
      const patrimonio = totalVentasHist - totalGastosHist;

      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const ventasMes = get().facturas.filter(f => f.fecha.startsWith(currentMonthStr) && f.estado !== FacturaEstado.Anulada);
      const comprasMes = get().gastos.filter(g => g.fecha.startsWith(currentMonthStr));
      
      const itbisVentas = ventasMes.reduce((sum, f) => sum + (f.itbis || 0), 0);
      const itbisCompras = comprasMes.reduce((sum, g) => sum + (g.itbis || 0), 0);
      const itbisAPagar = Math.max(0, itbisVentas - itbisCompras);

      const beneficio = totalCobrado - gastosMes;
      const isrProyectado = Math.max(0, beneficio * 0.27);

      const gastosConsumidorFinalList = gastosPeriodo.filter(g => isNcfConsumidorFinal(g.ncf));
      const gastosConsumidorFinal = {
          totalItbis: gastosConsumidorFinalList.reduce((sum, g) => sum + (g.itbis || 0), 0),
          count: gastosConsumidorFinalList.length
      };

      return {
          totalCobrado,
          gastosMes,
          beneficioPerdida: beneficio,
          cuentasPorCobrar,
          activos,
          patrimonio,
          itbisAPagar: { total: itbisAPagar },
          isrProyectado,
          gastosConsumidorFinal
      };
  },

  getSalesVsExpensesChartData: () => {
      const { start, end } = getFiscalPeriod();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const data = months.map(m => ({ name: m, ventas: 0, gastos: 0 }));
      
      get().ingresos.filter(i => i.fecha >= start && i.fecha <= end).forEach(i => {
          const month = new Date(i.fecha).getMonth();
          data[month].ventas += i.monto;
      });
      
      get().gastos.filter(g => g.fecha >= start && g.fecha <= end).forEach(g => {
          const month = new Date(g.fecha).getMonth();
          data[month].gastos += g.monto;
      });
      
      return data;
  },

  getGastosByCategoryChartData: () => {
      const { start, end } = getFiscalPeriod();
      const gastosPeriodo = get().gastos.filter(g => g.fecha >= start && g.fecha <= end);
      const categoryMap: Record<string, number> = {};
      
      gastosPeriodo.forEach(g => {
          const cat = g.categoriaGasto || 'Otros';
          categoryMap[cat] = (categoryMap[cat] || 0) + g.monto;
      });
      
      return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  },

  getMonthlyITBISData: () => {
      const { start, end } = getFiscalPeriod();
      const months: Record<string, any> = {};
      
      get().facturas.filter(f => f.fecha >= start && f.fecha <= end && f.estado !== FacturaEstado.Anulada).forEach(f => {
          const monthKey = f.fecha.substring(0, 7);
          if (!months[monthKey]) months[monthKey] = { itbisVentas: 0, itbisCompras: 0 };
          months[monthKey].itbisVentas += (f.itbis || 0);
      });
      
      get().gastos.filter(g => g.fecha >= start && g.fecha <= end).forEach(g => {
          const monthKey = g.fecha.substring(0, 7);
          if (!months[monthKey]) months[monthKey] = { itbisVentas: 0, itbisCompras: 0 };
          months[monthKey].itbisCompras += (g.itbis || 0);
      });

      return Object.keys(months).sort().map(key => {
          const m = months[key];
          const date = new Date(key + '-01'); 
          const monthName = date.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
          return {
              monthName,
              itbisPayable: m.itbisVentas - m.itbisCompras
          };
      });
  },

  getAnticiposISRData: () => {
      const tenant = useTenantStore.getState().selectedTenant;
      const currentYear = new Date().getFullYear();
      if (!tenant || !tenant.impuestoLiquidadoAnterior) {
          return { 
              isConfigured: false, 
              pagos: [], 
              periodoFiscal: String(currentYear), 
              tet: 0, 
              ruleMessage: '' 
          };
      }

      const impuestoLiquidado = tenant.impuestoLiquidadoAnterior;
      const ingresosBrutos = tenant.ingresosBrutosAnterior || 0;
      const tet = ingresosBrutos > 0 ? impuestoLiquidado / ingresosBrutos : 0;
      
      let baseCalculo = impuestoLiquidado;
      let ruleMessage = "Base: Impuesto Liquidado (TET > 1.5%)";
      
      if (tet <= 0.015 && ingresosBrutos > 0) {
          baseCalculo = ingresosBrutos * 0.015;
          ruleMessage = "Base: 1.5% Ingresos Brutos (TET <= 1.5%)";
      }

      const montoTotalAnticipos = baseCalculo;
      const pagos: any[] = [];
      const cuotas = 12; 
      const montoMensual = montoTotalAnticipos / cuotas;

      for(let i=1; i<=cuotas; i++) {
          const fechaLimite = new Date(currentYear, i - 1, 15).toISOString().split('T')[0];
          const pagoRegistrado = get().pagosAnticiposISR.find(p => p.numeroCuota === i && p.periodoFiscal === String(currentYear));
          
          pagos.push({
              numero: i,
              fechaLimite,
              monto: montoMensual,
              estado: pagoRegistrado ? 'Pagado' : (new Date().toISOString() > fechaLimite ? 'Vencido' : 'Pendiente'),
              pago: pagoRegistrado
          });
      }
      
      const proximoPago = pagos.find(p => p.estado !== 'Pagado');

      return {
          isConfigured: true,
          periodoFiscal: String(currentYear),
          tet,
          ruleMessage,
          pagos,
          proximoPago
      };
  },

  getNominaForPeriodo: (periodo) => get().nominas.find(n => n.periodo === periodo),
  
  getNominaById: (id) => get().nominas.find(n => n.id === id),

  realizarCierreITBIS: async (periodo) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) throw new Error("No hay empresa seleccionada.");
      
      const monthStart = `${periodo}-01`;
      const monthEnd = `${periodo}-31`; 
      
      const ventas = get().facturas.filter(f => f.empresaId === empresaId && f.fecha >= monthStart && f.fecha <= monthEnd && f.estado !== FacturaEstado.Anulada);
      const compras = get().gastos.filter(g => g.empresaId === empresaId && g.fecha >= monthStart && g.fecha <= monthEnd);
      
      const itbisVentas = ventas.reduce((sum, f) => sum + (f.itbis || 0), 0);
      const itbisCompras = compras.reduce((sum, g) => sum + (g.itbis || 0), 0);
      
      const previousClosures = get().cierresITBIS.filter(c => c.periodo < periodo).sort((a,b) => b.periodo.localeCompare(a.periodo));
      const saldoInicial = previousClosures.length > 0 ? (previousClosures[0].saldoFinal < 0 ? Math.abs(previousClosures[0].saldoFinal) : 0) : 0;

      const neto = itbisVentas - itbisCompras - saldoInicial;
      
      const cierreData = {
          empresaId,
          periodo,
          saldoInicial,
          itbisVentasMes: itbisVentas,
          itbisComprasMes: itbisCompras,
          itbisAPagar: Math.max(0, neto),
          saldoFinal: neto < 0 ? Math.abs(neto) : 0, 
          fechaCierre: new Date().toISOString(),
          pagado: false
      };
      
      await addDocWithId('cierresITBIS', cierreData);
  },

  pagarITBIS: async (cierreId, fechaPago) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if(!empresaId) return;
      const cierre = get().cierresITBIS.find(c => c.id === cierreId);
      if(!cierre) return;

      const asientoPago = generarAsientoPago(empresaId, fechaPago, `Pago ITBIS Período ${cierre.periodo}`, cierreId, 'pago_itbis', cierre.itbisAPagar, '2106-01');
      const newAsiento = await addDocWithId('asientosContables', {...asientoPago, empresaId}, false);
      await updateDocWithId('cierresITBIS', cierreId, { pagado: true, fechaPago, asientoPagoId: newAsiento.id });
  },

  marcarAnticipoPagado: async (data) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) throw new Error("Empresa no seleccionada");
      
      const newPago = await addDocWithId('pagosAnticiposISR', { ...data, empresaId });
      
      const asientoPago = generarAsientoPago(empresaId, data.fechaPago, `Pago Anticipo ISR Cuota ${data.numeroCuota} - ${data.periodoFiscal}`, newPago.id, 'pago_anticipo_isr', data.montoPagado, '1104-02'); 
      await addDocWithId('asientosContables', {...asientoPago, empresaId}, false);
  },

  addComment: async (type, id, text) => {
      const user = useAuthStore.getState().user;
      if (!user) return;
      
      const collectionName = type === 'factura' ? 'facturas' : type === 'gasto' ? 'gastos' : 'cotizaciones';
      const comment: Comment = {
          id: `comment-${Date.now()}`,
          userId: user.id,
          userName: user.nombre,
          text,
          timestamp: new Date().toISOString()
      };
      
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
          comments: arrayUnion(comment)
      });
  },

  saveFiscalSnapshot: async (snapshot) => {
       const empresaId = useTenantStore.getState().selectedTenant?.id;
       if (!empresaId) throw new Error("No hay empresa seleccionada.");
       await addDoc(collection(db, 'fiscal_snapshots'), snapshot);
  },

  getGastosFor606: (start, end) => get().gastos.filter(g => g.fecha >= start && g.fecha <= end),
  getVentasFor607: (start, end) => {
      const facturas = get().facturas.filter(f => f.fecha >= start && f.fecha <= end && f.estado !== FacturaEstado.Anulada);
      const notas = get().notas.filter(n => n.fecha >= start && n.fecha <= end);
      return { facturas, notas };
  },
  getAnuladosFor608: (start, end) => {
      const facturasAnuladas = get().facturas.filter(f => f.estado === FacturaEstado.Anulada && f.fecha >= start && f.fecha <= end);
      return facturasAnuladas;
  },
  getFacturasParaPago: () => get().facturas.filter(f => f.estado === FacturaEstado.Emitida || f.estado === FacturaEstado.PagadaParcialmente),
  
  setConciliadoStatus: async (type, id, status) => {
      const collectionName = type === 'ingreso' ? 'ingresos' : 'gastos';
      await updateDocWithId(collectionName, id, { conciliado: status });
  },

  getContabilidadKpis: () => {
      const { start, end } = getFiscalPeriod();
      const asientos = get().asientosContables.filter(a => a.fecha <= end);
      
      let activos = 0;
      let pasivos = 0;
      let capital = 0;
      let ingresos = 0;
      let gastos = 0;
      
      asientos.forEach(a => {
          a.entradas.forEach(e => {
              if (e.cuentaId.startsWith('1')) activos += (e.debito - e.credito);
              if (e.cuentaId.startsWith('2')) pasivos += (e.credito - e.debito);
              if (e.cuentaId.startsWith('3')) capital += (e.credito - e.debito);
              
              if (a.fecha >= start) {
                  if (e.cuentaId.startsWith('4')) ingresos += (e.credito - e.debito);
                  if (e.cuentaId.startsWith('5') || e.cuentaId.startsWith('6')) gastos += (e.debito - e.credito);
              }
          });
      });
      
      return {
          totalActivos: activos,
          totalPasivos: pasivos,
          totalCapital: capital,
          beneficioPerdida: ingresos - gastos
      };
  },

  findDesvinculacionByCedula: (cedula) => {
      const clean = cedula.replace(/[^0-9]/g, '');
      return get().desvinculaciones.find(d => d.empleadoCedula.replace(/[^0-9]/g, '') === clean);
  },

  getFiscalStatus: async (periodo: number) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) return null;
      const q = query(collection(db, 'fiscal_closures'), where('empresaId', '==', empresaId), where('periodoFiscal', '==', periodo));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FiscalClosure;
  },

  // Nueva función para continuidad fiscal
  getLastLockedSnapshot: async (periodo: number) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) return null;
      
      // Buscar el cierre fiscal LOCKED del año anterior
      const qClosure = query(
          collection(db, 'fiscal_closures'),
          where('empresaId', '==', empresaId),
          where('periodoFiscal', '==', periodo), // Should be previous year
          where('status', '==', 'LOCKED')
      );
      const closureSnap = await getDocs(qClosure);
      
      if (closureSnap.empty) return null;

      // Buscar el snapshot asociado a ese periodo.
      // Usamos query simple sin orderBy para evitar necesidad de índices compuestos complejos
      // y filtramos en memoria.
      const qSnapshot = query(
           collection(db, 'fiscal_snapshots'),
           where('empresaId', '==', empresaId)
      );
      const snaps = await getDocs(qSnapshot);
      
      // Filtrar por año y ordenar en memoria por fechaCalculo descendente
      const sortedSnaps = snaps.docs
          .map(d => d.data() as CalculoFiscalSnapshot)
          .filter(s => s.periodoFiscal === periodo) 
          .sort((a, b) => new Date(b.fechaCalculo).getTime() - new Date(a.fechaCalculo).getTime());
      
      return sortedSnaps.length > 0 ? sortedSnaps[0] : null;
  },

  lockFiscalYear: async (periodo: number, data: any, assetUpdates?: any[]) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      const user = useAuthStore.getState().user;
      if (!empresaId || !user) throw new Error("Datos incompletos");

      const hash = await generateHash(data);
      const lockData: Omit<FiscalClosure, 'id'> = {
          empresaId,
          periodoFiscal: periodo,
          status: 'LOCKED',
          dataHash: hash,
          lockedBy: user.nombre,
          lockedAt: new Date().toISOString(),
          version: '2.0'
      };
      
      // Atomic Batch Write: Lock fiscal year AND update all asset values for continuity
      const batch = writeBatch(db);
      
      // 1. Create Lock Document
      const lockRef = doc(collection(db, 'fiscal_closures'));
      batch.set(lockRef, lockData);

      // 2. Save Snapshot
      const snapshotRef = doc(collection(db, 'fiscal_snapshots'));
      batch.set(snapshotRef, data); // Assuming 'data' passed is the snapshot object

      // 3. Update Assets (Continuity)
      if (assetUpdates && assetUpdates.length > 0) {
          assetUpdates.forEach(update => {
              const assetRef = doc(db, 'activosFijos', update.id);
              batch.update(assetRef, {
                  depreciacionAcumuladaFiscal: update.nuevaDepreciacionAcumulada,
                  valorFiscalFinal: update.nuevoValorFiscal,
                  ultimoPeriodoCerrado: periodo
              });
          });
      }

      await batch.commit();
  },

  unlockFiscalYear: async (periodo: number, reason: string) => {
      const empresaId = useTenantStore.getState().selectedTenant?.id;
      if (!empresaId) return;
      const q = query(collection(db, 'fiscal_closures'), where('empresaId', '==', empresaId), where('periodoFiscal', '==', periodo), where('status', '==', 'LOCKED'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { status: 'OPEN', unlockedAt: new Date().toISOString(), unlockReason: reason });
      });
      await batch.commit();
  }
}));
