import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FacturaRecurrente, Cliente, Item, FacturaItem } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { PlusIcon, TrashIcon } from '../../components/icons/Icons';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

interface NuevaFacturaRecurrenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<FacturaRecurrente, 'id' | 'empresaId' | 'fechaProxima' | 'activa'> | FacturaRecurrente) => void;
  clientes: Cliente[];
  itemsDisponibles: Item[];
  onCreateCliente: (newClientData: { nombre: string; rnc?: string }) => Cliente;
  plantillaParaEditar?: FacturaRecurrente | null;
}

const ITBIS_RATE = 0.18;

const NuevaFacturaRecurrenteModal: React.FC<NuevaFacturaRecurrenteModalProps> = ({ isOpen, onClose, onSave, clientes, itemsDisponibles, onCreateCliente, plantillaParaEditar }) => {
    const [clienteId, setClienteId] = useState<number | null>(null);
    const [clienteNombre, setClienteNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
    const [frecuencia, setFrecuencia] = useState<'diaria' | 'semanal' | 'mensual' | 'anual'>('mensual');
    const [lineItems, setLineItems] = useState<Partial<FacturaItem & { key: number }>[]>([{ key: Date.now() }]);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    const [aplicaITBIS, setAplicaITBIS] = useState(true);
    const [aplicaISC, setAplicaISC] = useState(false);
    const [aplicaPropina, setAplicaPropina] = useState(false);
    const [isc, setIsc] = useState(0);
    const [propinaLegal, setPropinaLegal] = useState(0);
    const [activa, setActiva] = useState(true);
    const [errors, setErrors] = useState<{ cliente?: string; fecha?: string; items?: string; descripcion?: string }>({});

    const isEditMode = !!plantillaParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen && plantillaParaEditar) {
            setClienteId(plantillaParaEditar.clienteId);
            setClienteNombre(plantillaParaEditar.clienteNombre);
            setDescripcion(plantillaParaEditar.descripcion);
            setFechaInicio(plantillaParaEditar.fechaInicio);
            setFrecuencia(plantillaParaEditar.frecuencia);
            setLineItems(plantillaParaEditar.items.map(item => ({ ...item, key: Math.random() })));
            setDescuentoPorcentaje(plantillaParaEditar.descuentoPorcentaje || 0);
            setAplicaITBIS(plantillaParaEditar.aplicaITBIS);
            setAplicaISC(plantillaParaEditar.aplicaISC || false);
            setIsc(plantillaParaEditar.isc || 0);
            setAplicaPropina(plantillaParaEditar.aplicaPropina || false);
            setPropinaLegal(plantillaParaEditar.propinaLegal || 0);
            setActiva(plantillaParaEditar.activa);
        } else {
            resetForm();
        }
    }, [isOpen, plantillaParaEditar]);

    const totals = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);
        const montoDescuento = subtotal * ((descuentoPorcentaje || 0) / 100);
        const baseImponible = subtotal - montoDescuento;
        const currentISC = aplicaISC ? (isc || 0) : 0;
        const currentPropina = aplicaPropina ? (propinaLegal || 0) : 0;
        const baseParaITBIS = baseImponible + currentISC;
        const itbis = aplicaITBIS ? baseParaITBIS * ITBIS_RATE : 0;
        const montoTotal = baseParaITBIS + itbis + currentPropina;
        return { subtotal, montoDescuento, itbis, montoTotal };
    }, [lineItems, descuentoPorcentaje, aplicaITBIS, aplicaISC, isc, aplicaPropina, propinaLegal]);
    
    const validate = () => {
        const newErrors: any = {};
        if (!clienteId) newErrors.cliente = 'Debe seleccionar un cliente existente.';
        if (!fechaInicio) newErrors.fecha = 'La fecha de inicio es obligatoria.';
        if (!descripcion.trim()) newErrors.descripcion = 'La descripción es obligatoria.';
        if (lineItems.length === 0 || lineItems.some(item => !item.itemId || !(item.cantidad! > 0) || !(item.precioUnitario! >= 0))) {
            newErrors.items = 'Debe agregar al menos un ítem válido.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        const data = {
            clienteId: clienteId!,
            clienteNombre,
            descripcion,
            fechaInicio,
            frecuencia,
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
            activa
        };
        
        if (isEditMode) {
            onSave({ ...plantillaParaEditar, ...data });
        } else {
            onSave(data as Omit<FacturaRecurrente, 'id' | 'empresaId' | 'fechaProxima' | 'activa'>);
        }
        onClose();
    };
    
    const resetForm = () => {
        setClienteId(null);
        setClienteNombre('');
        setDescripcion('');
        setFechaInicio(new Date().toISOString().split('T')[0]);
        setFrecuencia('mensual');
        setLineItems([{ key: Date.now() }]);
        setDescuentoPorcentaje(0);
        setAplicaITBIS(true);
        setAplicaISC(false);
        setIsc(0);
        setAplicaPropina(false);
        setPropinaLegal(0);
        setActiva(true);
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isEditMode ? "Editar Plantilla Recurrente" : "Nueva Plantilla Recurrente"}
        >
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="cliente" className="block text-sm font-medium text-secondary-700">Cliente *</label>
                            <select id="cliente" value={clienteId || ''} onChange={e => {
                                const c = clientes.find(cl => cl.id === Number(e.target.value));
                                if (c) { setClienteId(c.id); setClienteNombre(c.nombre); }
                            }} className={`mt-1 block w-full border ${errors.cliente ? 'border-red-500' : 'border-secondary-300'} rounded-md`}>
                                <option value="">Seleccione un cliente</option>
                                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            {errors.cliente && <p className="text-sm text-red-600">{errors.cliente}</p>}
                        </div>
                        <div>
                            <label htmlFor="descripcion" className="block text-sm font-medium text-secondary-700">Descripción *</label>
                            <input type="text" id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} className={`mt-1 block w-full border ${errors.descripcion ? 'border-red-500' : 'border-secondary-300'} rounded-md`} placeholder="Ej: Iguala de servicios contables"/>
                            {errors.descripcion && <p className="text-sm text-red-600">{errors.descripcion}</p>}
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="frecuencia" className="block text-sm font-medium text-secondary-700">Frecuencia</label>
                                <select id="frecuencia" value={frecuencia} onChange={e => setFrecuencia(e.target.value as any)} className="mt-1 block w-full border border-secondary-300 rounded-md">
                                    <option value="mensual">Mensual</option>
                                    <option value="anual">Anual</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="diaria">Diaria</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="fechaInicio" className="block text-sm font-medium text-secondary-700">Fecha de Inicio *</label>
                                <input type="date" id="fechaInicio" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className={`mt-1 block w-full border ${errors.fecha ? 'border-red-500' : 'border-secondary-300'} rounded-md`} />
                                {errors.fecha && <p className="text-sm text-red-600">{errors.fecha}</p>}
                            </div>
                        </div>
                         {isEditMode && <div> <label className="block text-sm font-medium text-secondary-700">Estado</label> <ToggleSwitch checked={activa} onChange={setActiva} label={activa ? 'Activa' : 'Inactiva'} /></div>}
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <h4 className="text-md font-medium text-secondary-800">Ítems</h4>
                        {lineItems.map((item) => (
                            <div key={item.key} className="grid grid-cols-12 gap-2 items-center">
                                <select value={item.itemId || ''} onChange={e => handleItemChange(item.key!, 'itemId', e.target.value)} className="col-span-5 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md">
                                    <option value="">Seleccionar ítem</option>
                                    {itemsDisponibles.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                                </select>
                                <input type="number" placeholder="Cant." min="0" value={item.cantidad || ''} onChange={e => handleItemChange(item.key!, 'cantidad', parseFloat(e.target.value))} className="col-span-2 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md" />
                                <input type="number" placeholder="Precio" min="0" value={item.precioUnitario ?? ''} onChange={e => handleItemChange(item.key!, 'precioUnitario', parseFloat(e.target.value))} className="col-span-2 mt-1 block w-full px-2 py-2 border border-secondary-300 rounded-md" />
                                <span className="col-span-2 text-sm text-right pr-2">{formatCurrency(item.subtotal || 0)}</span>
                                <button type="button" onClick={() => removeItemLine(item.key!)} className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-50" disabled={lineItems.length <= 1}> <TrashIcon className="h-5 w-5" /> </button>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addNewItemLine} leftIcon={<PlusIcon />}>Agregar Ítem</Button>
                        {errors.items && <p className="mt-1 text-sm text-red-600">{errors.items}</p>}
                    </div>

                    <div className="flex justify-between pt-4 border-t">
                         <div className="space-y-3">
                            <ToggleSwitch checked={aplicaITBIS} onChange={setAplicaITBIS} label="Aplica ITBIS"/>
                            <ToggleSwitch checked={aplicaISC} onChange={setAplicaISC} label="Aplica ISC"/>
                            <ToggleSwitch checked={aplicaPropina} onChange={setAplicaPropina} label="Aplica Propina Legal"/>
                        </div>
                        <div className="w-full max-w-sm space-y-2">
                            <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatCurrency(totals.subtotal)}</span></div>
                             <div className="flex justify-between items-center text-sm">
                                <label htmlFor="descuento" className="font-medium text-secondary-600">Descuento (%):</label>
                                <input type="number" id="descuento" value={descuentoPorcentaje} onChange={e => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 border rounded-md" />
                            </div>
                            {aplicaISC && <div className="flex justify-between items-center text-sm"> <label htmlFor="isc-rec">ISC:</label> <input type="number" id="isc-rec" value={isc} onChange={e => setIsc(parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border rounded-md" /> </div>}
                            <div className="flex justify-between text-sm"><span>ITBIS ({ITBIS_RATE * 100}%):</span><span>{formatCurrency(totals.itbis)}</span></div>
                            {aplicaPropina && <div className="flex justify-between items-center text-sm"> <label htmlFor="propina-rec">Propina:</label> <input type="number" id="propina-rec" value={propinaLegal} onChange={e => setPropinaLegal(parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border rounded-md" /> </div>}
                            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Total:</span><span className="text-primary">{formatCurrency(totals.montoTotal)}</span></div>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">{isEditMode ? "Actualizar" : "Guardar"}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NuevaFacturaRecurrenteModal;