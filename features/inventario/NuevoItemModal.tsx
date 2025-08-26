import React, { useState, useEffect, useRef } from 'react';
import { Item } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import { ErrorMessages, formatNumber } from '../../utils/validationUtils';

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
    const [cantidadDisponible, setCantidadDisponible] = useState<string>('');
    const [noManejaStock, setNoManejaStock] = useState(false);
    const [errors, setErrors] = useState<{ nombre?: string, precio?: string, cantidad?: string, codigo?: string }>({});
    const isEditMode = !!itemParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen && itemParaEditar) {
            setCodigo(itemParaEditar.codigo);
            setNombre(itemParaEditar.nombre);
            setDescripcion(itemParaEditar.descripcion || '');
            setPrecio(itemParaEditar.precio.toString());
            const stock = itemParaEditar.cantidadDisponible;
            setNoManejaStock(stock === undefined);
            setCantidadDisponible(stock === undefined ? '' : stock.toString());
        } else {
            resetForm();
        }
    }, [isOpen, itemParaEditar]);

    const validate = () => {
        const newErrors: { nombre?: string, precio?: string, cantidad?: string, codigo?: string } = {};
        
        // Validar nombre
        if (!nombre.trim()) {
            newErrors.nombre = ErrorMessages.NOMBRE_REQUERIDO;
        } else if (nombre.trim().length < 2) {
            newErrors.nombre = ErrorMessages.TEXTO_MUY_CORTO('El nombre', 2);
        }
        
        // Validar código (si se proporciona)
        if (codigo.trim()) {
            if (codigo.trim().length < 2) {
                newErrors.codigo = ErrorMessages.TEXTO_MUY_CORTO('El código', 2);
            } else if (/\s/.test(codigo.trim())) {
                newErrors.codigo = ErrorMessages.CODIGO_INVALIDO;
            }
        }
        
        // Validar precio
        const precioNum = parseFloat(precio);
        if (isNaN(precioNum) || precioNum < 0) {
            newErrors.precio = ErrorMessages.PRECIO_INVALIDO;
        } else if (precioNum > 999999999) {
            newErrors.precio = ErrorMessages.PRECIO_EXCEDE_LIMITE;
        }
        
        // Validar cantidad si maneja stock
        if (!noManejaStock) {
            const cantidadNum = parseInt(cantidadDisponible);
            if (isNaN(cantidadNum) || cantidadNum < 0) {
                newErrors.cantidad = ErrorMessages.CANTIDAD_INVALIDA;
            } else if (cantidadNum > 999999999) {
                newErrors.cantidad = ErrorMessages.CANTIDAD_EXCEDE_LIMITE;
            }
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
                            <label htmlFor="precio" className="block text-sm font-medium text-secondary-700">Precio Unitario *</label>
                            <input type="number" id="precio" value={precio} onChange={e => setPrecio(e.target.value)} className={`mt-1 block w-full border ${errors.precio ? 'border-red-500' : 'border-secondary-300'} rounded-md`}/>
                            {errors.precio && <p className="text-sm text-red-600">{errors.precio}</p>}
                        </div>
                         <div>
                            <label htmlFor="cantidad" className="block text-sm font-medium text-secondary-700">Cantidad Disponible</label>
                            <input type="number" id="cantidad" value={cantidadDisponible} onChange={e => setCantidadDisponible(e.target.value)} disabled={noManejaStock} className={`mt-1 block w-full border ${errors.cantidad ? 'border-red-500' : 'border-secondary-300'} rounded-md disabled:bg-secondary-100`}/>
                            {errors.cantidad && <p className="text-sm text-red-600">{errors.cantidad}</p>}
                        </div>
                    </div>
                     <div className="flex items-center">
                        <input type="checkbox" id="no-stock" checked={noManejaStock} onChange={e => setNoManejaStock(e.target.checked)} className="h-4 w-4 text-primary border-secondary-300 rounded"/>
                        <label htmlFor="no-stock" className="ml-2 block text-sm text-secondary-900">Este ítem no maneja stock (es un servicio)</label>
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