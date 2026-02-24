
// src/features/facturas/NuevaFacturaModal.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Factura, Cliente, Item, FacturaItem, Cotizacion, NCFType, FacturaRecurrente, FacturaEstado } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { PlusIcon, TrashIcon } from '../../components/icons/Icons';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import { useNCFStore } from '../../stores/useNCFStore';
import { useTenantStore } from '../../stores/useTenantStore';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import { useRatesStore } from '../../stores/useRatesStore';

interface NuevaFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (facturaData: any) => void;
  clientes: Cliente[];
  itemsDisponibles: Item[];
  facturas: Factura[];
  onCreateCliente: (newClientData: { nombre: string; rnc?: string, estadoDGII?: string }) => Promise<Cliente>;
  cotizacionParaFacturar?: Cotizacion | null;
  facturaRecurrenteParaFacturar?: FacturaRecurrente | null;
  facturaParaEditar?: Factura | null;
}

const NuevaFacturaModal: React.FC<NuevaFacturaModalProps> = ({ isOpen, onClose, onSave, clientes, itemsDisponibles, facturas, onCreateCliente, cotizacionParaFacturar, facturaRecurrenteParaFacturar, facturaParaEditar }) => {
    const { selectedTenant } = useTenantStore();
    const { getRatesForTenant } = useRatesStore();
    const { sequences } = useNCFStore();
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const [clienteId, setClienteId] = useState<string | null>(null);
    const [clienteRNC, setClienteRNC] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteEstadoDGII, setClienteEstadoDGII] = useState<string | null>(null);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [ncfTipo, setNcfTipo] = useState<NCFType>(NCFType.B02);
    const [ncfNumero, setNcfNumero] = useState('');
    const [ncfModificado, setNcfModificado] = useState('');
    const [lineItems, setLineItems] = useState<(Partial<FacturaItem> & { key: number, stock?: number })[]>([{ key: Date.now() }]);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    
    const [aplicaITBIS, setAplicaITBIS] = useState(true);
    const [aplicaISC, setAplicaISC] = useState(false);
    const [aplicaPropina, setAplicaPropina] = useState(false);
    const [itbisRetenido, setItbisRetenido] = useState(0);

    const [errors, setErrors] = useState<{ cliente?: string; fecha?: string; items?: string, ncfModificado?: string, lineItemStock?: {[key: number]: string} }>({});
    const [sourceCotizacionId, setSourceCotizacionId] = useState<string | undefined>(undefined);
    const [sourceFacturaRecurrenteId, setSourceFacturaRecurrenteId] = useState<string | undefined>(undefined);

    const { lookupRNC, loading: isLookingUpRNC } = useDGIIDataStore();
    const isEditMode = !!facturaParaEditar;
    const rates = useMemo(() => selectedTenant ? getRatesForTenant(selectedTenant.id) : { itbis: 0.18, isc: 0.16, propina: 0.10 }, [selectedTenant, getRatesForTenant]);

    // Efecto para calcular el NCF de turno (Preview) cuando cambia el tipo
    useEffect(() => {
        if (!isEditMode && selectedTenant && sequences.length > 0) {
            const sequence = sequences.find(s => s.tipo === ncfTipo && s.empresaId === selectedTenant.id && s.activa);
            if (sequence) {
                // Lógica de visualización: Prefijo + Padding(SecuenciaActual)
                // Nota: SecuenciaActual en DB suele ser el número que toca usar.
                let ncfLength = 8;
                if (sequence.prefijo.startsWith('B')) ncfLength = 11 - sequence.prefijo.length;
                else if (sequence.prefijo.startsWith('E')) ncfLength = 13 - sequence.prefijo.length;
                
                const nextNcf = sequence.prefijo + String(sequence.secuenciaActual).padStart(ncfLength, '0');
                setNcfNumero(nextNcf);
            } else {
                setNcfNumero(''); // No hay secuencia configurada
            }
        }
    }, [ncfTipo, sequences, selectedTenant, isEditMode]);

    // Efecto para sincronizar ncfTipo con el prefijo del ncfNumero manual si el usuario lo cambia
    useEffect(() => {
        if (ncfNumero.length >= 3 && isEditMode) { // Solo en edit mode auto-detectamos tipo al escribir, en create mode confiamos en el select
            const prefix = ncfNumero.substring(0, 3).toUpperCase();
            const foundType = Object.values(NCFType).find(t => t.startsWith(prefix));
            if (foundType && foundType !== ncfTipo) {
                setNcfTipo(foundType as NCFType);
            }
        }
    }, [ncfNumero, ncfTipo, isEditMode]);

    const nombreInputClass = useMemo(() => {
        if (errors.cliente) return 'border-red-500'; 
        if (!clienteEstadoDGII) return 'border-secondary-300'; 
        
        if (clienteEstadoDGII.toUpperCase() === 'ACTIVO') {
            return 'bg-green-100 border-green-500 text-green-800 focus:ring-green-500 focus:border-green-500';
        }
        return 'bg-red-100 border-red-500 text-red-800 focus:ring-red-500 focus:border-red-500';
    }, [clienteEstadoDGII, errors.cliente]);


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
            setClienteEstadoDGII(clienteAsociado?.estadoDGII || null);
            setFecha(new Date().toISOString().split('T')[0]); 
            if(facturaParaEditar) {
                setFecha(facturaParaEditar.fecha);
                setNcfNumero(facturaParaEditar.ncf || ''); 
                setItbisRetenido(facturaParaEditar.itbisRetenido || 0);
                setNcfModificado(facturaParaEditar.ncfModificado || (facturaParaEditar as any).facturaAfectadaNCF || '');
                setNcfTipo(facturaParaEditar.ncfTipo);
            }
            setLineItems(dataToLoad.items.map(item => ({...item, key: Math.random(), stock: itemsDisponibles.find(i => i.id === item.itemId)?.cantidadDisponible })));
            if ('cotizacionId' in dataToLoad && (dataToLoad as any).cotizacionId) {
                setSourceCotizacionId((dataToLoad as any).cotizacionId);
            } else if (!('cotizacionId' in dataToLoad) && 'id' in dataToLoad && 'items' in dataToLoad && !('frecuencia' in dataToLoad)) {
                setSourceCotizacionId(dataToLoad.id);
            }
            if ('facturaRecurrenteId' in dataToLoad && (dataToLoad as any).facturaRecurrenteId) {
                setSourceFacturaRecurrenteId((dataToLoad as any).facturaRecurrenteId);
            } else if ('frecuencia' in dataToLoad) {
                setSourceFacturaRecurrenteId(dataToLoad.id);
            }
            setDescuentoPorcentaje(dataToLoad.descuentoPorcentaje || 0);
            setAplicaITBIS(dataToLoad.aplicaITBIS);
            setAplicaISC(dataToLoad.aplicaISC || false);
            setAplicaPropina(dataToLoad.aplicaPropina || false);
        } else {
            resetForm();
        }
    }, [isOpen, facturaParaEditar, cotizacionParaFacturar, facturaRecurrenteParaFacturar, clientes, itemsDisponibles]);

    const totals = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);
        const montoDescuento = subtotal * ((descuentoPorcentaje || 0) / 100);
        const subtotalConDescuento = subtotal - montoDescuento;
        const itbis = aplicaITBIS ? subtotalConDescuento * rates.itbis : 0;
        const isc = aplicaISC ? subtotal * rates.isc : 0;
        const propinaLegal = aplicaPropina ? subtotal * rates.propina : 0;
        const montoTotal = subtotalConDescuento + itbis + isc + propinaLegal;
        return { subtotal, montoDescuento, itbis, isc, propinaLegal, montoTotal };
    }, [lineItems, descuentoPorcentaje, aplicaITBIS, aplicaISC, aplicaPropina, rates]);
    
    const isNota = useMemo(() => ncfTipo === NCFType.B04 || ncfTipo === NCFType.E34 || ncfTipo === NCFType.B03 || ncfTipo === NCFType.E33, [ncfTipo]);

    const validate = () => {
        const newErrors: any = { lineItemStock: {} };
        if (!clienteNombre.trim()) newErrors.cliente = 'Debe especificar un cliente.';
        if (!fecha) newErrors.fecha = 'La fecha es obligatoria.';
        if (isNota && !ncfModificado) newErrors.ncfModificado = 'Debe seleccionar la factura que se modifica.';
        
        let hasInvalidItem = false;
        lineItems.forEach(item => {
            if (!item.itemId || !(item.cantidad! > 0) || !(item.precioUnitario! >= 0)) {
                hasInvalidItem = true;
            }
            if (item.stock !== undefined && item.cantidad! > item.stock) {
                newErrors.lineItemStock[item.key!] = `Stock insuficiente (Disp: ${item.stock})`;
                hasInvalidItem = true;
            }
        });

        if (lineItems.length === 0 || hasInvalidItem) {
            newErrors.items = 'Debe agregar al menos un ítem válido y con stock suficiente.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 1 && Object.keys(newErrors.lineItemStock).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        let finalClientId = clienteId;
        
        if (!isEditMode && finalClientId === null && clienteNombre) {
            try {
                const newClient = await onCreateCliente({ nombre: clienteNombre, rnc: clienteRNC, estadoDGII: clienteEstadoDGII || undefined });
                finalClientId = newClient.id;
            } catch (error) {
                return;
            }
        }

        if (!finalClientId) {
            setErrors(prev => ({ ...prev, cliente: 'Se requiere un cliente válido para guardar la factura.' }));
            return;
        }

        const saveData: any = {
            clienteId: finalClientId,
            clienteNombre: clienteNombre,
            fecha,
            ncfTipo,
            ncf: ncfNumero, // Enviamos el NCF (manual o sugerido)
            items: lineItems.filter(item => item.itemId).map(item => ({
                itemId: item.itemId!,
                codigo: item.codigo || '',
                descripcion: item.descripcion || '',
                cantidad: item.cantidad || 0,
                precioUnitario: item.precioUnitario || 0,
                subtotal: item.subtotal || 0,
            })),
            subtotal: totals.subtotal,
            descuentoPorcentaje,
            montoDescuento: totals.montoDescuento,
            aplicaITBIS,
            aplicaISC,
            isc: totals.isc,
            itbis: totals.itbis,
            itbisRetenido,
            aplicaPropina,
            propinaLegal: totals.propinaLegal,
            montoTotal: totals.montoTotal,
            conciliado: false,
        };

        if (isNota) {
            saveData.ncfModificado = ncfModificado;
        } else {
            saveData.ncfModificado = null;
        }

        if (sourceCotizacionId) saveData.cotizacionId = sourceCotizacionId;
        if (sourceFacturaRecurrenteId) saveData.facturaRecurrenteId = sourceFacturaRecurrenteId;
        
        if (isEditMode) {
            saveData.comments = facturaParaEditar?.comments || [];
            saveData.auditLog = facturaParaEditar?.auditLog || [];
        } else {
            saveData.comments = [];
            saveData.auditLog = [];
        }
        
        onSave(saveData);
        onClose(); 
    };
    
    const resetForm = () => {
        setClienteId(null);
        setClienteRNC('');
        setClienteNombre('');
        setClienteEstadoDGII(null);
        setFecha(new Date().toISOString().split('T')[0]);
        setNcfTipo(NCFType.B02);
        setNcfNumero('');
        setNcfModificado('');
        setLineItems([{ key: Date.now() }]);
        setErrors({});
        setSourceCotizacionId(undefined);
        setSourceFacturaRecurrenteId(undefined);
        setDescuentoPorcentaje(0);
        setAplicaITBIS(true);
        setAplicaISC(false);
        setAplicaPropina(false);
        setItbisRetenido(0);
    };

    const handleRNCBlur = async () => {
        if (isEditMode) return;
        const trimmedRNC = clienteRNC.trim();
        if (trimmedRNC === '') {
            setClienteEstadoDGII(null);
            return;
        }

        const existingClient = clientes.find(c => c.rnc === trimmedRNC);
        if (existingClient) {
            setClienteId(existingClient.id);
            setClienteNombre(existingClient.nombre);
            setClienteEstadoDGII(existingClient.estadoDGII || null);
            return;
        }

        const result = await lookupRNC(trimmedRNC);
        if (result) {
            setClienteNombre(result.nombre);
            setClienteEstadoDGII(result.status);
            setClienteId(null); 
        } else {
            setClienteEstadoDGII(null);
        }
    };

    const handleRNCKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRNCBlur();
            formRef.current?.querySelector<HTMLInputElement>('#clienteNombre')?.focus();
        }
    };

    const handleItemChange = (key: number, field: keyof FacturaItem, value: any) => {
        setLineItems(currentItems => 
            currentItems.map(item => {
                if (item.key === key) {
                    const updatedItem = { ...item, [field]: value };
                    if (field === 'itemId') {
                        const selectedItem = itemsDisponibles.find(i => i.id === value);
                        if (selectedItem) {
                            updatedItem.descripcion = selectedItem.nombre;
                            updatedItem.precioUnitario = selectedItem.precio;
                            updatedItem.codigo = selectedItem.codigo;
                            updatedItem.stock = selectedItem.cantidadDisponible;
                            if (updatedItem.cantidad === undefined) updatedItem.cantidad = 1;
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

    const addNewItemLine = () => setLineItems(prev => [...prev, { key: Date.now(), cantidad: 1, precioUnitario: 0, subtotal: 0 }]);
    const removeItemLine = (key: number) => setLineItems(prev => prev.filter(item => item.key !== key));
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

    const modalFooter = (
      <>
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="factura-form">{isEditMode ? "Actualizar Factura" : "Guardar Factura"}</Button>
      </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? `Editar Factura ${ncfNumero}` : "Crear Nueva Factura"}
            size="5xl"
            footer={modalFooter}
        >
            <form ref={formRef} onSubmit={handleSubmit} noValidate id="factura-form">
              <div className="p-6">
                <div className="space-y-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <div>
                            <label htmlFor="clienteRNC" className="block text-sm font-medium text-secondary-700">RNC / Cédula</label>
                            <div className="relative mt-1">
                                <input
                                    type="text"
                                    id="clienteRNC"
                                    value={clienteRNC}
                                    onChange={(e) => setClienteRNC(e.target.value)}
                                    onKeyDown={handleRNCKeyDown}
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
                                onChange={(e) => setClienteNombre(e.target.value)}
                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm disabled:bg-secondary-100 ${nombreInputClass}`}
                                disabled={isEditMode || !!cotizacionParaFacturar || !!facturaRecurrenteParaFacturar}
                            />
                            <div className="mt-2 min-h-[22px]">
                                {clienteEstadoDGII && (
                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        clienteEstadoDGII.toUpperCase() === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {clienteEstadoDGII}
                                    </span>
                                )}
                            </div>
                            {errors.cliente && <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                        <div>
                            <label htmlFor="fecha" className="block text-sm font-medium text-secondary-700">Fecha *</label>
                            <input type="date" id="fecha" value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 block w-full px-3 py-2 border ${errors.fecha ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm`} />
                            {errors.fecha && <p className="mt-1 text-sm text-red-600">{errors.fecha}</p>}
                        </div>
                        <div>
                            <label htmlFor="ncfTipo" className="block text-sm font-medium text-secondary-700">Tipo de NCF *</label>
                            <select id="ncfTipo" value={ncfTipo} onChange={e => setNcfTipo(e.target.value as NCFType)} className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm">
                                {Object.values(NCFType).map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="ncfNumero" className="block text-sm font-medium text-secondary-700">NCF (Editable)</label>
                            <input
                                type="text"
                                id="ncfNumero"
                                value={ncfNumero}
                                onChange={e => setNcfNumero(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm font-mono font-bold text-primary"
                                placeholder="Se generará autom."
                            />
                        </div>
                    </div>
                     {isNota && (
                        <div>
                            <label htmlFor="ncfModificado" className="block text-sm font-medium text-secondary-700">NCF que Modifica *</label>
                            <select
                                id="ncfModificado"
                                value={ncfModificado}
                                onChange={e => setNcfModificado(e.target.value)}
                                className={`mt-1 block w-full px-3 py-2 border ${errors.ncfModificado ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm`}
                                required={isNota}
                                disabled={!clienteId}
                            >
                                <option value="">{clienteId ? "Seleccione la factura a modificar..." : "Seleccione un cliente primero"}</option>
                                {facturas
                                    .filter(f => f.clienteId === clienteId && f.estado !== FacturaEstado.Anulada && !f.ncf?.startsWith('B04'))
                                    .map(f => (
                                        <option key={f.id} value={f.ncf}>{f.ncf} - {f.fecha} - {formatCurrency(f.montoTotal)}</option>
                                    ))
                                }
                            </select>
                             {errors.ncfModificado && <p className="mt-1 text-sm text-red-600">{errors.ncfModificado}</p>}
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
                
                <div className="pt-4 border-t mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <ToggleSwitch id="toggle-itbis-factura" checked={aplicaITBIS} onChange={setAplicaITBIS} label="Aplica ITBIS" />
                        <ToggleSwitch id="toggle-isc-factura" checked={aplicaISC} onChange={setAplicaISC} label="Aplica ISC" />
                        <ToggleSwitch id="toggle-propina-factura" checked={aplicaPropina} onChange={setAplicaPropina} label="Aplica Propina Legal" />
                    </div>
                    <div className="space-y-2 border-l-0 md:border-l md:pl-8">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-secondary-600">Subtotal:</span>
                            <span className="text-secondary-800 font-mono">{formatCurrency(totals.subtotal)}</span>
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
                                <span className="text-red-600 font-mono">- {formatCurrency(totals.montoDescuento)}</span>
                            </div>
                        )}
                        {aplicaISC && (
                             <div className="flex justify-between text-sm">
                                <span className="font-medium text-secondary-600">ISC ({rates.isc * 100}%):</span>
                                <span className="text-secondary-800 font-mono">{formatCurrency(totals.isc)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-secondary-600">ITBIS ({rates.itbis * 100}%):</span>
                            <span className="text-secondary-800 font-mono">{formatCurrency(totals.itbis)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <label htmlFor="itbisRetenido" className="font-medium text-secondary-600">ITBIS Retenido por Tercero:</label>
                            <input
                                type="number"
                                id="itbisRetenido"
                                value={itbisRetenido}
                                onChange={e => setItbisRetenido(parseFloat(e.target.value) || 0)}
                                className="w-28 px-2 py-1 border border-secondary-300 rounded-md shadow-sm sm:text-sm text-right font-mono"
                                step="0.01"
                            />
                        </div>
                        {aplicaPropina && (
                             <div className="flex justify-between text-sm">
                                <span className="font-medium text-secondary-600">Propina ({rates.propina * 100}%):</span>
                                <span className="text-secondary-800 font-mono">{formatCurrency(totals.propinaLegal)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                            <span className="text-secondary-800">Total:</span>
                            <span className="text-primary font-mono">{formatCurrency(totals.montoTotal)}</span>
                        </div>
                    </div>
                </div>
              </div>
            </form>
        </Modal>
    );
};

export default NuevaFacturaModal;
