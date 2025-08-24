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

const NuevaFacturaModal: React.FC<NuevaFacturaModalProps> = ({ isOpen, onClose, onSave, clientes, itemsDisponibles, onCreateCliente, cotizacionParaFacturar, facturaRecurrenteParaFacturar, facturaParaEditar }) => {
    const { selectedTenant } = useTenantStore();
    const { getAvailableTypes } = useNCFStore();
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const [clienteId, setClienteId] = useState<number | null>(null);
    const [clienteRNC, setClienteRNC] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [ncfTipo, setNcfTipo] = useState<NCFType>(NCFType.B02);
    const [ncfNumero, setNcfNumero] = useState('');
    const [lineItems, setLineItems] = useState<Partial<FacturaItem & { key: number, stock?: number }>[]>([{ key: Date.now() }]);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    
    const [aplicaITBIS, setAplicaITBIS] = useState(true);
    const [aplicaISC, setAplicaISC] = useState(false);
    const [aplicaPropina, setAplicaPropina] = useState(false);
    const [isc, setIsc] = useState(0);
    const [propinaLegal, setPropinaLegal] = useState(0);

    const [errors, setErrors] = useState<{ cliente?: string; fecha?: string; items?: string, lineItemStock?: {[key: number]: string} }>({});
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
        const currentISC = aplicaISC ? (isc || 0) : 0;
        const currentPropina = aplicaPropina ? (propinaLegal || 0) : 0;
        const baseParaITBIS = baseImponible + currentISC;
        const itbis = aplicaITBIS ? baseParaITBIS * ITBIS_RATE : 0;
        const montoTotal = baseParaITBIS + itbis + currentPropina;
        return { subtotal, montoDescuento, baseImponible, itbis, montoTotal };
    }, [lineItems, descuentoPorcentaje, aplicaITBIS, aplicaISC, isc, aplicaPropina, propinaLegal]);
    
    const validate = () => {
        const newErrors: any = { lineItemStock: {} };
        if (!clienteNombre.trim()) newErrors.cliente = 'Debe especificar un cliente.';
        if (!fecha) newErrors.fecha = 'La fecha es obligatoria.';
        
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        let finalClientId = clienteId;
        
        if (!isEditMode && finalClientId === null && clienteNombre) {
            const newClient = onCreateCliente({ nombre: clienteNombre, rnc: clienteRNC });
            finalClientId = newClient.id;
        }

        if (!finalClientId) {
            setErrors(prev => ({ ...prev, cliente: 'Se requiere un cliente válido para guardar la factura.' }));
            return;
        }

        onSave({
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
            isc: aplicaISC ? isc || 0 : 0,
            itbis: totals.itbis,
            aplicaPropina,
            propinaLegal: aplicaPropina ? propinaLegal || 0 : 0,
            montoTotal: totals.montoTotal,
            cotizacionId: sourceCotizacionId,
            facturaRecurrenteId: sourceFacturaRecurrenteId,
        });
        
        onClose(); 
    };
    
    const resetForm = () => {
        setClienteId(null);
        setClienteRNC('');
        setClienteNombre('');
        setFecha(new Date().toISOString().split('T')[0]);
        setNcfTipo(NCFType.B02);
        setNcfNumero('');
        setLineItems([{ key: Date.now() }]);
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

    const handleRNCBlur = async () => { /* ... */ };

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
            title={isEditMode ? "Editar Factura" : "Crear Nueva Factura"}
        >
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                {/* Header Section */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ... client and date inputs */}
                </div>
                {/* Items Section */}
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
                {/* Totals Section */}
                <div className="flex justify-between pt-4 border-t">
                   {/* ... totals ... */}
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