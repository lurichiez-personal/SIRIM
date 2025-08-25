
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Cotizacion, Cliente, Item, FacturaItem } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { PlusIcon, TrashIcon } from '../../components/icons/Icons';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

interface NuevaCotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCotizacion: Omit<Cotizacion, 'id' | 'empresaId' | 'estado'>) => void;
  clientes: Cliente[];
  itemsDisponibles: Item[];
  onCreateCliente: (newClientData: { nombre: string; rnc?: string }) => Cliente;
  cotizacionParaEditar?: Cotizacion | null;
}

const ITBIS_RATE = 0.18;
const ISC_RATE = 0.16;
const PROPINA_RATE = 0.10;

const NuevaCotizacionModal: React.FC<NuevaCotizacionModalProps> = ({ isOpen, onClose, onSave, clientes, itemsDisponibles, onCreateCliente, cotizacionParaEditar }) => {
    const [clienteId, setClienteId] = useState<number | null>(null);
    const [clienteRNC, setClienteRNC] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [lineItems, setLineItems] = useState<Partial<FacturaItem & { key: number }>[]>([{ key: Date.now() }]);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    const [aplicaITBIS, setAplicaITBIS] = useState(true);
    const [aplicaISC, setAplicaISC] = useState(false);
    const [aplicaPropina, setAplicaPropina] = useState(false);
    const [isc, setIsc] = useState(0);
    const [propinaLegal, setPropinaLegal] = useState(0);
    const [errors, setErrors] = useState<{ cliente?: string; fecha?: string; items?: string }>({});

    const { lookupRNC, loading: isLookingUpRNC } = useDGIIDataStore();
    const isEditMode = !!cotizacionParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen && cotizacionParaEditar) {
            setClienteId(cotizacionParaEditar.clienteId);
            setClienteNombre(cotizacionParaEditar.clienteNombre);
            setClienteRNC(cotizacionParaEditar.clienteRNC || '');
            setFecha(cotizacionParaEditar.fecha);
            setLineItems(cotizacionParaEditar.items.map(item => ({ ...item, key: Math.random() })));
            setDescuentoPorcentaje(cotizacionParaEditar.descuentoPorcentaje || 0);
            setAplicaITBIS(cotizacionParaEditar.aplicaITBIS);
            setAplicaISC(cotizacionParaEditar.aplicaISC || false);
            setIsc(cotizacionParaEditar.isc || 0);
            setAplicaPropina(cotizacionParaEditar.aplicaPropina || false);
            setPropinaLegal(cotizacionParaEditar.propinaLegal || 0);
        } else {
            resetForm();
        }
    }, [isOpen, cotizacionParaEditar]);

    const totals = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);
        const montoDescuento = subtotal * ((descuentoPorcentaje || 0) / 100);
        const baseImponible = subtotal - montoDescuento;
        const currentISC = aplicaISC ? (isc || 0) : 0;
        const currentPropina = aplicaPropina ? (propinaLegal || 0) : 0;
        const baseParaITBIS = baseImponible + currentISC;
        const itbis = aplicaITBIS ? baseParaITBIS * ITBIS_RATE : 0;
        const montoTotal = baseParaITBIS + itbis + currentPropina;
        return { subtotal, montoDescuento, baseImponible, itbis, montoTotal };
    }, [lineItems, descuentoPorcentaje, aplicaITBIS, aplicaISC, isc, aplicaPropina, propinaLegal]);
    
    const validate = () => {
        const newErrors: { cliente?: string; fecha?: string; items?: string } = {};
        if (!clienteNombre.trim()) newErrors.cliente = 'Debe especificar un cliente.';
        if (!fecha) newErrors.fecha = 'La fecha es obligatoria.';
        if (lineItems.length === 0 || lineItems.some(item => !item.itemId || !(item.cantidad! > 0) || !(item.precioUnitario! >= 0))) {
            newErrors.items = 'Debe agregar al menos un ítem válido con cantidad y precio.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        let finalClientId = clienteId;
        
        if (!isEditMode && finalClientId === null && clienteNombre) {
            const newClient = onCreateCliente({ nombre: clienteNombre, rnc: clienteRNC });
            finalClientId = newClient.id;
        }

        if (!finalClientId) {
            setErrors(prev => ({ ...prev, cliente: 'Se requiere un cliente válido para guardar la cotización.' }));
            return;
        }

        onSave({
            clienteId: finalClientId,
            clienteNombre: clienteNombre,
            clienteRNC,
            fecha,
            items: lineItems.filter(item => item.itemId).map(item => ({...item, itemId: item.itemId! , codigo: item.codigo!, descripcion: item.descripcion!, cantidad: item.cantidad!, precioUnitario: item.precioUnitario!, subtotal: item.subtotal! })),
            subtotal: totals.subtotal,
            descuentoPorcentaje,
            montoDescuento: totals.montoDescuento,
            aplicaITBIS,
            aplicaISC,
            isc: aplicaISC ? isc || 0 : 0,
            itbis: totals.itbis,
            aplicaPropina,
            propinaLegal: aplicaPropina ? propinaLegal || 0 : 0,
            montoTotal: totals.montoTotal,
            comments: [],
            auditLog: [],
        });
        resetForm();
        onClose();
    };
    
    const resetForm = () => {
        setClienteId(null);
        setClienteRNC('');
        setClienteNombre('');
        setFecha(new Date().toISOString().split('T')[0]);
        setLineItems([{ key: Date.now() }]);
        setDescuentoPorcentaje(0);
        setAplicaITBIS(true);
        setAplicaISC(false);
        setIsc(0);
        setAplicaPropina(false);
        setPropinaLegal(0);
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleRNCBlur = async () => {
        if (isEditMode) return;
        const trimmedRNC = clienteRNC.trim();
        if (trimmedRNC === '') return;
    
        const existingClient = clientes.find(c => c.rnc === trimmedRNC);
        if (existingClient) {
            setClienteId(existingClient.id);
            setClienteNombre(existingClient.nombre);
            return;
        }
    
        const result = await lookupRNC(trimmedRNC);
        if (result) {
            setClienteNombre(result.nombre);
            setClienteId(null); 
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
            onClose={handleClose}
            title={isEditMode ? "Editar Cotización" : "Crear Nueva Cotización"}
        >
          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                {/* Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="clienteRNC-cot" className="block text-sm font-medium text-secondary-700">RNC / Cédula</label>
                        <div className="relative mt-1">
                            <input
                                type="text"
                                id="clienteRNC-cot"
                                value={clienteRNC}
                                onChange={(e) => setClienteRNC(e.target.value)}
                                onBlur={handleRNCBlur}
                                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-secondary-100"
                                placeholder="Buscar o introducir RNC"
                                disabled={isEditMode}
                            />
                            {isLookingUpRNC && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                     <div>
                        <label htmlFor="clienteNombre-cot" className="block text-sm font-medium text-secondary-700">Nombre / Razón Social *</label>
                        <input
                            type="text"
                            id="clienteNombre-cot"
                            value={clienteNombre}
                            onChange={(e) => {
                                setClienteNombre(e.target.value);
                                if (clienteId) setClienteId(null);
                            }}
                            className={`mt-1 block w-full px-3 py-2 border ${errors.cliente ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-secondary-100`}
                            disabled={isEditMode}
                        />
                         {errors.cliente && <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>}
                    </div>

                     <div>
                        <label htmlFor="fecha-cot" className="block text-sm font-medium text-secondary-700">Fecha *</label>
                        <input type="date" id="fecha-cot" value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 block w-full px-3 py-2 border ${errors.fecha ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`} />
                        {errors.fecha && <p className="mt-1 text-sm text-red-600">{errors.fecha}</p>}
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-md font-medium text-secondary-800">Ítems</h4>
                    {lineItems.map((item) => (
                        <div key={item.key} className="grid grid-cols-12 gap-2 items-center">
                            <select
                                value={item.itemId || ''}
                                onChange={e => handleItemChange(item.key!, 'itemId', e.target.value)}
                                className="col-span-5 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            >
                                <option value="">Seleccionar ítem</option>
                                {itemsDisponibles.map(i => <option key={i.id} value={i.id}>{i.codigo} - {i.nombre}</option>)}
                            </select>
                            <input type="number" placeholder="Cant." min="0" value={item.cantidad || ''} onChange={e => handleItemChange(item.key!, 'cantidad', parseFloat(e.target.value))} className="col-span-2 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md shadow-sm sm:text-sm" />
                            <input type="number" placeholder="Precio" min="0" value={item.precioUnitario ?? ''} onChange={e => handleItemChange(item.key!, 'precioUnitario', parseFloat(e.target.value))} className="col-span-2 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md shadow-sm sm:text-sm" />
                            <span className="col-span-2 text-sm text-right pr-2 text-secondary-600">{formatCurrency(item.subtotal || 0)}</span>
                            <button type="button" onClick={() => removeItemLine(item.key!)} className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-50" disabled={lineItems.length <= 1}>
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={addNewItemLine} leftIcon={<PlusIcon />}>Agregar Ítem</Button>
                    {errors.items && <p className="mt-1 text-sm text-red-600">{errors.items}</p>}
                </div>

                {/* Totals */}
                <div className="pt-4 border-t mt-4 flex justify-between">
                    <div className="w-1/2 space-y-3 pr-4">
                        <ToggleSwitch id="toggle-itbis-cot" checked={aplicaITBIS} onChange={setAplicaITBIS} label="Aplica ITBIS" />
                        <ToggleSwitch id="toggle-isc-cot" checked={aplicaISC} onChange={setAplicaISC} label="Aplica ISC" />
                        <ToggleSwitch id="toggle-propina-cot" checked={aplicaPropina} onChange={setAplicaPropina} label="Aplica Propina Legal" />
                    </div>
                    <div className="w-1/2 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-secondary-600">Subtotal:</span>
                            <span className="text-secondary-800">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <label htmlFor="descuento-cot" className="font-medium text-secondary-600">Descuento (%):</label>
                            <input
                                type="number"
                                id="descuento-cot"
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
                             <div className="flex justify-between items-center text-sm">
                                <label htmlFor="isc-input-cot" className="font-medium text-secondary-600">ISC ({ISC_RATE * 100}%):</label>
                                <input type="number" id="isc-input-cot" value={isc} onChange={e => setIsc(parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border border-secondary-300 rounded-md shadow-sm sm:text-sm text-right" />
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-secondary-600">ITBIS ({ITBIS_RATE * 100}%):</span>
                            <span className="text-secondary-800">{formatCurrency(totals.itbis)}</span>
                        </div>
                        {aplicaPropina && (
                            <div className="flex justify-between items-center text-sm">
                                <label htmlFor="propina-input-cot" className="font-medium text-secondary-600">Propina ({PROPINA_RATE * 100}%):</label>
                                <input type="number" id="propina-input-cot" value={propinaLegal} onChange={e => setPropinaLegal(parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border border-secondary-300 rounded-md shadow-sm sm:text-sm text-right" />
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
                <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button type="submit">{isEditMode ? "Actualizar Cotización" : "Guardar Cotización"}</Button>
            </div>
          </form>
        </Modal>
    );
};

export default NuevaCotizacionModal;
