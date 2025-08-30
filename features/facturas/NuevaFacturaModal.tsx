
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Factura, Cliente, Item, FacturaItem, Cotizacion, NCFType, FacturaRecurrente } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { PlusIcon, TrashIcon } from '../../components/icons/Icons';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import { useNCFStore } from '../../stores/useNCFStore';
import { useTenantStore } from '../../stores/useTenantStore';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import { useToastStore } from '../../stores/useToastStore';
import { ErrorMessages, isValidRNC } from '../../utils/validationUtils';

interface NuevaFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (facturaData: Omit<Factura, 'id' | 'empresaId' | 'estado' | 'ncf' | 'montoPagado'> & { ncfTipo: NCFType }) => void;
  clientes: Cliente[];
  itemsDisponibles: Item[];
  onCreateCliente: (newClientData: { nombre: string; rnc?: string }) => Cliente;
  cotizacionParaFacturar?: Cotizacion | null;
  facturaRecurrenteParaFacturar?: FacturaRecurrente | null;
  facturaParaEditar?: Factura | null;
}

const ITBIS_RATE = 0.18;
const ISC_RATE = 0.16; // Tasa de referencia
const PROPINA_RATE = 0.10; // Tasa de referencia

const NuevaFacturaModal: React.FC<NuevaFacturaModalProps> = ({ isOpen, onClose, onSave, clientes, itemsDisponibles, onCreateCliente, cotizacionParaFacturar, facturaRecurrenteParaFacturar, facturaParaEditar }) => {
    const { selectedTenant } = useTenantStore();
    const { getAvailableTypes } = useNCFStore();
    const { showError } = useToastStore();
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const [clienteId, setClienteId] = useState<number | null>(null);
    const [clienteRNC, setClienteRNC] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [ncfTipo, setNcfTipo] = useState<NCFType>(NCFType.B02);
    const [ncfNumero, setNcfNumero] = useState('');
    const [lineItems, setLineItems] = useState<Partial<FacturaItem & { key: number, stock?: number }>[]>([{ 
        key: Date.now(),
        cantidad: 1,
        precioUnitario: 0,
        subtotal: 0
    }]);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    
    const [aplicaITBIS, setAplicaITBIS] = useState(true);
    const [aplicaISC, setAplicaISC] = useState(false);
    const [aplicaPropina, setAplicaPropina] = useState(false);
    const [isc, setIsc] = useState(0);
    const [propinaLegal, setPropinaLegal] = useState(0);

    const [errors, setErrors] = useState<{ cliente?: string; fecha?: string; items?: string, lineItemStock?: {[key: number]: string}, clienteRNC?: string }>({});
    const [sourceCotizacionId, setSourceCotizacionId] = useState<number | undefined>(undefined);
    const [sourceFacturaRecurrenteId, setSourceFacturaRecurrenteId] = useState<number | undefined>(undefined);

    const { lookupRNC, loading: isLookingUpRNC } = useDGIIDataStore();
    const isEditMode = !!facturaParaEditar;
    const availableNCFTypes = useMemo(() => selectedTenant ? getAvailableTypes(selectedTenant.id) : [], [selectedTenant, getAvailableTypes]);


    useEffect(() => {
        if (!isOpen) {
            resetForm();
            return;
        }

        const dataToLoad = facturaParaEditar || cotizacionParaFacturar || facturaRecurrenteParaFacturar;

        if (dataToLoad) {
            const clienteAsociado = clientes.find(c => c.id === dataToLoad.clienteId);
            setClienteId(dataToLoad.clienteId);
            setClienteNombre(dataToLoad.clienteNombre);
            setClienteRNC(clienteAsociado?.rnc || (dataToLoad as Cotizacion).clienteRNC || '');
            setFecha(new Date().toISOString().split('T')[0]); // Default to today for new invoices from templates
            if(facturaParaEditar) {
                setFecha(facturaParaEditar.fecha);
                setNcfNumero(facturaParaEditar.ncf || ''); 
            }
            setLineItems(dataToLoad.items.map(item => ({...item, key: Math.random(), stock: itemsDisponibles.find(i => i.id === item.itemId)?.cantidadDisponible })));
            setSourceCotizacionId((dataToLoad as Factura).cotizacionId || (dataToLoad as Cotizacion).id);
            setSourceFacturaRecurrenteId((dataToLoad as Factura).facturaRecurrenteId || (dataToLoad as FacturaRecurrente).id);
            setDescuentoPorcentaje(dataToLoad.descuentoPorcentaje || 0);
            setAplicaITBIS(dataToLoad.aplicaITBIS);
            setAplicaISC(dataToLoad.aplicaISC || false);
            setIsc(dataToLoad.isc || 0);
            setAplicaPropina(dataToLoad.aplicaPropina || false);
            setPropinaLegal(dataToLoad.propinaLegal || 0);
        } else {
            resetForm();
        }
    }, [isOpen, facturaParaEditar, cotizacionParaFacturar, facturaRecurrenteParaFacturar, clientes, itemsDisponibles]);

    const totals = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);
        const montoDescuento = subtotal * ((descuentoPorcentaje || 0) / 100);
        const baseImponible = subtotal - montoDescuento;
        
        // Calcular ISC automáticamente si está aplicado
        const currentISC = aplicaISC ? baseImponible * ISC_RATE : 0;
        
        // Base para ITBIS incluye el ISC
        const baseParaITBIS = baseImponible + currentISC;
        const itbis = aplicaITBIS ? baseParaITBIS * ITBIS_RATE : 0;
        
        // Calcular propina automáticamente si está aplicada (sobre subtotal + ISC + ITBIS)
        const baseMasTributos = baseParaITBIS + itbis;
        const currentPropina = aplicaPropina ? baseMasTributos * PROPINA_RATE : 0;
        
        const montoTotal = baseMasTributos + currentPropina;
        
        return { subtotal, montoDescuento, baseImponible, itbis, montoTotal, currentISC, currentPropina };
    }, [lineItems, descuentoPorcentaje, aplicaITBIS, aplicaISC, aplicaPropina]);

    // Efecto para actualizar automáticamente ISC y propina cuando cambien los totales
    useEffect(() => {
        if (totals.currentISC !== undefined) {
            setIsc(totals.currentISC);
        }
        if (totals.currentPropina !== undefined) {
            setPropinaLegal(totals.currentPropina);
        }
    }, [totals.currentISC, totals.currentPropina]);
    
    const validate = () => {
        const newErrors: any = { lineItemStock: {} };
        if (!clienteNombre.trim()) newErrors.cliente = 'Debe especificar un cliente.';
        if (!fecha) newErrors.fecha = 'La fecha es obligatoria.';
        
        let hasInvalidItem = false;
        let invalidItemMessages: string[] = [];
        
        lineItems.forEach((item, index) => {
            const itemNum = index + 1;
            if (!item.itemId) {
                hasInvalidItem = true;
                invalidItemMessages.push(`Item ${itemNum}: Debe seleccionar un producto/servicio`);
            }
            if (!(item.cantidad! > 0)) {
                hasInvalidItem = true;
                invalidItemMessages.push(`Item ${itemNum}: La cantidad debe ser mayor a 0`);
            }
            if (!(item.precioUnitario! >= 0)) {
                hasInvalidItem = true;
                invalidItemMessages.push(`Item ${itemNum}: El precio debe ser mayor o igual a 0`);
            }
            if (item.stock !== undefined && item.cantidad! > item.stock) {
                newErrors.lineItemStock[item.key!] = `Stock insuficiente (Disp: ${item.stock})`;
                hasInvalidItem = true;
            }
        });

        if (lineItems.length === 0) {
            newErrors.items = 'Debe agregar al menos un ítem a la factura.';
        } else if (hasInvalidItem) {
            newErrors.items = invalidItemMessages.join('; ');
        }

        setErrors(newErrors);
        
        // Validación corregida: retorna true cuando NO hay errores
        const hasClienteError = newErrors.cliente;
        const hasFechaError = newErrors.fecha;
        const hasItemsError = newErrors.items;
        const hasStockErrors = Object.keys(newErrors.lineItemStock).length > 0;
        
        console.log('🔍 Estado de validación:', {
            hasClienteError,
            hasFechaError,
            hasItemsError,
            hasStockErrors,
            lineItemsCount: lineItems.length,
            lineItems: lineItems
        });
        
        return !hasClienteError && !hasFechaError && !hasItemsError && !hasStockErrors;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            console.log('🔍 Iniciando validación de factura...');
            
            if (!validate()) {
                console.log('❌ Validación falló, errores:', errors);
                showError('Por favor, corrige los errores en el formulario antes de guardar.');
                return;
            }
            
            console.log('✅ Validación exitosa, procediendo a guardar...');
            
            let finalClientId = clienteId;
            
            if (!isEditMode && finalClientId === null && clienteNombre) {
                console.log('🆕 Creando nuevo cliente...');
                const newClient = onCreateCliente({ nombre: clienteNombre, rnc: clienteRNC });
                finalClientId = newClient.id;
                console.log('✅ Cliente creado con ID:', finalClientId);
            }

            if (!finalClientId) {
                console.log('❌ No se pudo obtener ID de cliente');
                setErrors(prev => ({ ...prev, cliente: 'Se requiere un cliente válido para guardar la factura.' }));
                return;
            }

            const facturaData = {
                clienteId: finalClientId,
                clienteNombre: clienteNombre,
                fecha,
                ncfTipo,
                items: lineItems.filter(item => item.itemId).map(item => ({...item, itemId: item.itemId! , codigo: item.codigo!, descripcion: item.descripcion!, cantidad: item.cantidad!, precioUnitario: item.precioUnitario!, subtotal: item.subtotal! })),
                subtotal: totals.subtotal,
                descuentoPorcentaje,
                montoDescuento: totals.montoDescuento,
                aplicaITBIS,
                aplicaISC,
                isc: totals.currentISC,
                itbis: totals.itbis,
                aplicaPropina,
                propinaLegal: totals.currentPropina,
                montoTotal: totals.montoTotal,
                cotizacionId: sourceCotizacionId,
                facturaRecurrenteId: sourceFacturaRecurrenteId,
                conciliado: false,
                comments: [],
                auditLog: [],
            };
            
            console.log('📄 Datos de factura preparados:', facturaData);
            console.log('🚀 Llamando onSave...');
            
            onSave(facturaData);
            
            console.log('✅ onSave ejecutado exitosamente');
            onClose(); 
            
        } catch (error: any) {
            console.error('💥 Error en handleSubmit:', error);
            showError(`Error al procesar la factura: ${error.message || 'Error desconocido'}`);
        }
    };
    
    const resetForm = () => {
        setClienteId(null);
        setClienteRNC('');
        setClienteNombre('');
        setFecha(new Date().toISOString().split('T')[0]);
        setNcfTipo(NCFType.B02);
        setNcfNumero('');
        setLineItems([{ 
            key: Date.now(),
            cantidad: 1,
            precioUnitario: 0,
            subtotal: 0
        }]);
        setErrors({});
        setSourceCotizacionId(undefined);
        setSourceFacturaRecurrenteId(undefined);
        setDescuentoPorcentaje(0);
        setAplicaITBIS(true);
        setAplicaISC(false);
        setIsc(0);
        setAplicaPropina(false);
        setPropinaLegal(0);
    };

    const handleRNCBlur = async () => {
        if (isEditMode) return;
        const trimmedRNC = clienteRNC.trim();
        if (trimmedRNC === '') return;
        if (!isValidRNC(trimmedRNC)) {
            setErrors(prev => ({ ...prev, clienteRNC: ErrorMessages.RNC_FORMATO_INVALIDO }));
            return;
        }
        setErrors(prev => ({ ...prev, clienteRNC: undefined }));

        const existingClient = clientes.find(c => c.rnc === trimmedRNC);
        if (existingClient) {
            setClienteId(existingClient.id);
            setClienteNombre(existingClient.nombre);
            return;
        }

        try {
            const result = await lookupRNC(trimmedRNC);
            if (result) {
                setClienteNombre(result.nombre);
                setClienteId(null); // Es un cliente nuevo
            } else {
                setErrors(prev => ({ ...prev, clienteRNC: 'No se encontró el RNC en DGII.' }));
            }
        } catch (error: any) {
            setErrors(prev => ({ ...prev, clienteRNC: error?.message || 'Error al buscar el RNC. Intente nuevamente.' }));
        }
    };

    const handleItemChange = (key: number, field: keyof FacturaItem, value: any) => {
        setLineItems(currentItems => 
            currentItems.map(item => {
                if (item.key === key) {
                    const updatedItem = { ...item, [field]: value };

                    if (field === 'itemId') {
                        const selectedItem = itemsDisponibles.find(i => i.id === Number(value));
                        if (selectedItem) {
                            updatedItem.descripcion = selectedItem.nombre;
                            updatedItem.precioUnitario = selectedItem.precio;
                            updatedItem.codigo = selectedItem.codigo;
                            updatedItem.stock = selectedItem.cantidadDisponible;
                            if (updatedItem.cantidad === undefined) {
                                updatedItem.cantidad = 1;
                            }
                        }
                    }

                    if (updatedItem.cantidad != null && updatedItem.precioUnitario != null) {
                        updatedItem.subtotal = updatedItem.cantidad * updatedItem.precioUnitario;
                    }
                    
                    return updatedItem;
                }
                return item;
            })
        );
    };

    const addNewItemLine = () => {
        setLineItems(prev => [...prev, { key: Date.now(), cantidad: 1, precioUnitario: 0, subtotal: 0 }]);
    };

    const removeItemLine = (key: number) => {
        setLineItems(prev => prev.filter(item => item.key !== key));
    };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? `Editar Factura ${ncfNumero}` : "Crear Nueva Factura"}
        >
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto pr-3">
                {errors.clienteRNC && (
                    <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{errors.clienteRNC}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="clienteRNC" className="block text-sm font-medium text-secondary-700">RNC / Cédula</label>
                        <div className="relative mt-1">
                            <input
                                type="text"
                                id="clienteRNC"
                                value={clienteRNC}
                                onChange={(e) => setClienteRNC(e.target.value)}
                                onBlur={handleRNCBlur}
                                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm disabled:bg-secondary-100"
                                placeholder="Buscar o introducir RNC"
                                disabled={isEditMode || !!cotizacionParaFacturar || !!facturaRecurrenteParaFacturar}
                            />
                             {isLookingUpRNC && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </div>
                            )}
                        </div>
                    </div>
                     <div>
                        <label htmlFor="clienteNombre" className="block text-sm font-medium text-secondary-700">Nombre / Razón Social *</label>
                        <input
                            type="text"
                            id="clienteNombre"
                            value={clienteNombre}
                            onChange={(e) => { setClienteNombre(e.target.value); if (clienteId) setClienteId(null); }}
                            className={`mt-1 block w-full px-3 py-2 border ${errors.cliente ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm disabled:bg-secondary-100`}
                            disabled={isEditMode || !!cotizacionParaFacturar || !!facturaRecurrenteParaFacturar}
                        />
                         {errors.cliente && <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>}
                    </div>
                    <div>
                        <label htmlFor="fecha" className="block text-sm font-medium text-secondary-700">Fecha *</label>
                        <input type="date" id="fecha" value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 block w-full px-3 py-2 border ${errors.fecha ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm`} />
                        {errors.fecha && <p className="mt-1 text-sm text-red-600">{errors.fecha}</p>}
                    </div>
                    {!isEditMode && (
                        <div>
                            <label htmlFor="ncfTipo" className="block text-sm font-medium text-secondary-700">Tipo de NCF *</label>
                            <select id="ncfTipo" value={ncfTipo} onChange={e => setNcfTipo(e.target.value as NCFType)} className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm">
                                {availableNCFTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                
                <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-md font-medium text-secondary-800">Ítems</h4>
                    {lineItems.map((item) => (
                        <div key={item.key} className="p-2 rounded-md border border-secondary-200">
                             <div className="grid grid-cols-12 gap-2 items-center">
                                <select value={item.itemId || ''} onChange={e => handleItemChange(item.key!, 'itemId', e.target.value)} className="col-span-5 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md">
                                    <option value="">Seleccionar ítem</option>
                                    {itemsDisponibles.map(i => <option key={i.id} value={i.id}>{i.codigo} - {i.nombre}</option>)}
                                </select>
                                <input type="number" placeholder="Cant." min="0" value={item.cantidad || ''} onChange={e => handleItemChange(item.key!, 'cantidad', parseFloat(e.target.value))} className="col-span-2 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md" />
                                <input type="number" placeholder="Precio" min="0" value={item.precioUnitario ?? ''} onChange={e => handleItemChange(item.key!, 'precioUnitario', parseFloat(e.target.value))} className="col-span-2 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md" />
                                <span className="col-span-2 text-sm text-right pr-2 text-secondary-600">{formatCurrency(item.subtotal || 0)}</span>
                                <button type="button" onClick={() => removeItemLine(item.key!)} className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-50" disabled={lineItems.length <= 1}>
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                            {errors.lineItemStock?.[item.key!] && <p className="mt-1 text-xs text-red-600">{errors.lineItemStock[item.key!]}</p>}
                        </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={addNewItemLine} leftIcon={<PlusIcon />}>Agregar Ítem</Button>
                    {errors.items && <p className="mt-1 text-sm text-red-600">{errors.items}</p>}
                </div>
                
                <div className="pt-4 border-t mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <ToggleSwitch id="toggle-itbis-factura" checked={aplicaITBIS} onChange={setAplicaITBIS} label="Aplica ITBIS (18%)" />
                        <ToggleSwitch id="toggle-isc-factura" checked={aplicaISC} onChange={setAplicaISC} label="Aplica ISC (16% - cálculo automático)" />
                        <ToggleSwitch id="toggle-propina-factura" checked={aplicaPropina} onChange={setAplicaPropina} label="Aplica Propina Legal (10% - cálculo automático)" />
                    </div>
                    <div className="space-y-2 border-l-0 md:border-l md:pl-8">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-secondary-600">Subtotal:</span>
                            <span className="text-secondary-800">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <label htmlFor="descuento" className="font-medium text-secondary-600">Descuento (%):</label>
                            <input
                                type="number"
                                id="descuento"
                                value={descuentoPorcentaje}
                                onChange={e => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-secondary-300 rounded-md shadow-sm sm:text-sm text-right"
                            />
                        </div>
                        {totals.montoDescuento > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-secondary-600">Monto Descuento:</span>
                                <span className="text-red-600">- {formatCurrency(totals.montoDescuento)}</span>
                            </div>
                        )}
                        {aplicaISC && (
                             <div className="flex justify-between text-sm">
                                <span className="font-medium text-secondary-600">ISC ({ISC_RATE * 100}%):</span>
                                <span className="text-secondary-800">{formatCurrency(totals.currentISC)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-secondary-600">ITBIS ({ITBIS_RATE * 100}%):</span>
                            <span className="text-secondary-800">{formatCurrency(totals.itbis)}</span>
                        </div>
                        {aplicaPropina && (
                             <div className="flex justify-between text-sm">
                                <span className="font-medium text-secondary-600">Propina ({PROPINA_RATE * 100}%):</span>
                                <span className="text-secondary-800">{formatCurrency(totals.currentPropina)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                            <span className="text-secondary-800">Total:</span>
                            <span className="text-primary">{formatCurrency(totals.montoTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>
             <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">{isEditMode ? "Actualizar Factura" : "Guardar Factura"}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NuevaFacturaModal;