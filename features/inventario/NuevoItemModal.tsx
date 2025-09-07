import React, { useState, useEffect, useRef } from 'react';
import { Item } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

interface NuevoItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newItem: Omit<Item, 'id' | 'empresaId'>) => void;
  itemParaEditar?: Item | null;
}

const NuevoItemModal: React.FC<NuevoItemModalProps> = ({ isOpen, onClose, onSave, itemParaEditar }) => {
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState('');
    const [costo, setCosto] = useState('');
    const [cantidadDisponible, setCantidadDisponible] = useState<string>('');
    const [noManejaStock, setNoManejaStock] = useState(false);
    const [errors, setErrors] = useState<{ nombre?: string, precio?: string, cantidad?: string, costo?: string }>({});
    const isEditMode = !!itemParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen && itemParaEditar) {
            setCodigo(itemParaEditar.codigo || '');
            setNombre(itemParaEditar.nombre || '');
            setDescripcion(itemParaEditar.descripcion || '');
            setPrecio(itemParaEditar.precio ? itemParaEditar.precio.toString() : '');
            setCosto(itemParaEditar.costo ? itemParaEditar.costo.toString() : '');
            const stock = itemParaEditar.cantidadDisponible;
            setNoManejaStock(stock === undefined || stock === null);
            setCantidadDisponible(stock === undefined || stock === null ? '' : stock.toString());
        } else {
            resetForm();
        }
    }, [isOpen, itemParaEditar]);

    const validate = () => {
        const newErrors: any = {};
        if (!nombre.trim()) newErrors.nombre = 'El nombre es obligatorio.';
        if (parseFloat(precio) <= 0 || isNaN(parseFloat(precio))) newErrors.precio = 'El precio debe ser un número mayor a cero.';
        if (!noManejaStock && (parseInt(cantidadDisponible) < 0 || isNaN(parseInt(cantidadDisponible)))) {
            newErrors.cantidad = 'La cantidad debe ser un número igual o mayor a cero.';
        }
        if (!noManejaStock && (parseFloat(costo) < 0 || isNaN(parseFloat(costo)))) {
            newErrors.costo = 'El costo debe ser un número igual o mayor a cero.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        onSave({
            codigo,
            nombre,
            descripcion,
            precio: parseFloat(precio),
            costo: noManejaStock ? undefined : parseFloat(costo),
            cantidadDisponible: noManejaStock ? undefined : parseInt(cantidadDisponible)
        });
        resetForm();
        onClose();
    };
    
    const resetForm = () => {
        setCodigo('');
        setNombre('');
        setDescripcion('');
        setPrecio('');
        setCosto('');
        setCantidadDisponible('');
        setNoManejaStock(false);
        setErrors({});
    }

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isEditMode ? "Editar Ítem" : "Crear Nuevo Ítem"}
        >
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="nombre" className="block text-sm font-medium text-secondary-700">Nombre *</label>
                            <input type="text" id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} className={`mt-1 block w-full border ${errors.nombre ? 'border-red-500' : 'border-secondary-300'} rounded-md`}/>
                            {errors.nombre && <p className="text-sm text-red-600">{errors.nombre}</p>}
                        </div>
                        <div>
                            <label htmlFor="codigo" className="block text-sm font-medium text-secondary-700">Código / SKU</label>
                            <input type="text" id="codigo" value={codigo} onChange={e => setCodigo(e.target.value)} className="mt-1 block w-full border border-secondary-300 rounded-md"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="precio" className="block text-sm font-medium text-secondary-700">Precio de Venta *</label>
                            <input type="number" id="precio" value={precio} onChange={e => setPrecio(e.target.value)} className={`mt-1 block w-full border ${errors.precio ? 'border-red-500' : 'border-secondary-300'} rounded-md`}/>
                            {errors.precio && <p className="text-sm text-red-600">{errors.precio}</p>}
                        </div>
                         <div>
                            <label htmlFor="costo" className="block text-sm font-medium text-secondary-700">Costo</label>
                            <input type="number" id="costo" value={costo} onChange={e => setCosto(e.target.value)} disabled={noManejaStock} className={`mt-1 block w-full border ${errors.costo ? 'border-red-500' : 'border-secondary-300'} rounded-md disabled:bg-secondary-100`}/>
                            {errors.costo && <p className="text-sm text-red-600">{errors.costo}</p>}
                        </div>
                    </div>
                     <div className="flex items-center">
                        <input type="checkbox" id="no-stock" checked={noManejaStock} onChange={e => setNoManejaStock(e.target.checked)} className="h-4 w-4 text-primary border-secondary-300 rounded"/>
                        <label htmlFor="no-stock" className="ml-2 block text-sm text-secondary-900">Este ítem no maneja stock (es un servicio)</label>
                     </div>
                     <div>
                        <label htmlFor="cantidad" className="block text-sm font-medium text-secondary-700">Cantidad Disponible</label>
                        <input type="number" id="cantidad" value={cantidadDisponible} onChange={e => setCantidadDisponible(e.target.value)} disabled={noManejaStock} className={`mt-1 block w-full border ${errors.cantidad ? 'border-red-500' : 'border-secondary-300'} rounded-md disabled:bg-secondary-100`}/>
                        {errors.cantidad && <p className="text-sm text-red-600">{errors.cantidad}</p>}
                    </div>
                     <div>
                        <label htmlFor="descripcion-item" className="block text-sm font-medium text-secondary-700">Descripción</label>
                        <textarea id="descripcion-item" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} className="mt-1 block w-full border border-secondary-300 rounded-md" />
                    </div>
                </div>
                 <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit">{isEditMode ? "Actualizar Ítem" : "Guardar Ítem"}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NuevoItemModal;
