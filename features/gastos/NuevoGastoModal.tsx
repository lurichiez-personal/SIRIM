import React, { useState, useEffect, useRef } from 'react';
import { Gasto } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

interface NuevoGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newGasto: Omit<Gasto, 'id' | 'empresaId'>) => void;
  gastoParaEditar?: Gasto | null;
}

const ITBIS_RATE = 0.18;

// Categorías de Gastos según Formato 606 de la DGII
const GASTO_CATEGORIAS_606 = [
    '01 - GASTOS DE PERSONAL',
    '02 - GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS',
    '03 - ARRENDAMIENTOS',
    '04 - GASTOS DE ACTIVOS FIJOS',
    '05 - GASTOS DE REPRESENTACIÓN',
    '06 - OTRAS DEDUCCIONES ADMITIDAS',
    '07 - GASTOS FINANCIEROS',
    '08 - GASTOS EXTRAORDINARIOS',
    '09 - COMPRAS Y GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA',
    '10 - ADQUISICIONES DE ACTIVOS',
    '11 - GASTOS DE SEGUROS',
];

const NuevoGastoModal: React.FC<NuevoGastoModalProps> = ({ isOpen, onClose, onSave, gastoParaEditar }) => {
    const [proveedorNombre, setProveedorNombre] = useState('');
    const [rncProveedor, setRncProveedor] = useState('');
    const [ncf, setNcf] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [categoriaGasto, setCategoriaGasto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [subtotal, setSubtotal] = useState('');
    const [itbis, setItbis] = useState('0.00');
    const [monto, setMonto] = useState('0.00');
    const [errors, setErrors] = useState<{ fecha?: string; subtotal?: string, descripcion?: string, categoriaGasto?: string }>({});
    
    const { lookupRNC, loading: isLookingUpRNC } = useDGIIDataStore();
    const isEditMode = !!gastoParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen && gastoParaEditar) {
            setProveedorNombre(gastoParaEditar.proveedorNombre || '');
            setRncProveedor(gastoParaEditar.rncProveedor || '');
            setNcf(gastoParaEditar.ncf || '');
            setFecha(gastoParaEditar.fecha);
            setCategoriaGasto(gastoParaEditar.categoriaGasto || '');
            setDescripcion(gastoParaEditar.descripcion);
            setSubtotal(gastoParaEditar.subtotal.toString());
        } else {
            resetForm();
        }
    }, [isOpen, gastoParaEditar]);

    useEffect(() => {
        const subtotalNum = parseFloat(subtotal);
        if (!isNaN(subtotalNum) && subtotalNum >= 0) {
            const itbisCalculado = subtotalNum * ITBIS_RATE;
            const totalCalculado = subtotalNum + itbisCalculado;
            setItbis(itbisCalculado.toFixed(2));
            setMonto(totalCalculado.toFixed(2));
        } else {
            setItbis('0.00');
            setMonto('0.00');
        }
    }, [subtotal]);
    
    const validate = () => {
        const newErrors: { fecha?: string; subtotal?: string, descripcion?: string, categoriaGasto?: string } = {};
        if (!fecha) newErrors.fecha = 'La fecha es obligatoria.';
        if (!descripcion) newErrors.descripcion = 'La descripción es obligatoria.';
        if (!categoriaGasto) newErrors.categoriaGasto = 'Debe seleccionar una categoría.';
        if (parseFloat(subtotal) <= 0 || isNaN(parseFloat(subtotal))) {
            newErrors.subtotal = 'El subtotal debe ser un número mayor a cero.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        onSave({
            proveedorNombre,
            rncProveedor,
            ncf,
            fecha,
            categoriaGasto,
            descripcion,
            subtotal: parseFloat(subtotal),
            itbis: parseFloat(itbis),
            monto: parseFloat(monto),
        });
        resetForm();
        onClose();
    };
    
    const resetForm = () => {
        setProveedorNombre('');
        setRncProveedor('');
        setNcf('');
        setFecha(new Date().toISOString().split('T')[0]);
        setCategoriaGasto('');
        setDescripcion('');
        setSubtotal('');
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleRNCProveedorBlur = async () => {
        if (rncProveedor && rncProveedor.trim() !== '') {
            const result = await lookupRNC(rncProveedor);
            if (result) {
                setProveedorNombre(result.nombre);
            }
        }
    };

    const renderInput = (label: string, id: string, type: string, value: string, onChange: (value: string) => void, error?: string, placeholder?: string, readOnly = false, onBlur?: () => void, disabled = false) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-secondary-700">{label}</label>
            <div className="relative mt-1">
                <input
                    type={type}
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    readOnly={readOnly}
                    onBlur={onBlur}
                    disabled={disabled}
                    className={`block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${readOnly || disabled ? 'bg-secondary-100' : ''}`}
                    placeholder={placeholder}
                />
                 {id === 'rncProveedor' && isLookingUpRNC && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isEditMode ? "Editar Gasto" : "Registrar Nuevo Gasto"}
        >
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput('Proveedor', 'proveedor', 'text', proveedorNombre, setProveedorNombre, undefined, 'Nombre del proveedor', false, undefined, isEditMode)}
                        {renderInput('RNC Proveedor', 'rncProveedor', 'text', rncProveedor, setRncProveedor, undefined, 'Ej: 130123456', false, handleRNCProveedorBlur, isEditMode)}
                        {renderInput('NCF', 'ncfGasto', 'text', ncf, setNcf, undefined, 'Ej: B0200000001')}
                        {renderInput('Fecha *', 'fechaGasto', 'date', fecha, setFecha, errors.fecha)}
                    </div>
                    
                    <div>
                        <label htmlFor="categoriaGasto" className="block text-sm font-medium text-secondary-700">Categoría (Formato 606) *</label>
                         <select
                            id="categoriaGasto"
                            value={categoriaGasto}
                            onChange={(e) => setCategoriaGasto(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border ${errors.categoriaGasto ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                        >
                            <option value="">Seleccione una categoría</option>
                            {GASTO_CATEGORIAS_606.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        {errors.categoriaGasto && <p className="mt-1 text-sm text-red-600">{errors.categoriaGasto}</p>}
                    </div>

                    <div>
                        <label htmlFor="descripcion" className="block text-sm font-medium text-secondary-700">Descripción *</label>
                        <textarea 
                            id="descripcion" 
                            rows={2}
                            value={descripcion} 
                            onChange={(e) => setDescripcion(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border ${errors.descripcion ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                            placeholder="Detalles del gasto"
                        />
                         {errors.descripcion && <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-2">
                        {renderInput('Subtotal *', 'subtotalGasto', 'number', subtotal, setSubtotal, errors.subtotal, '0.00')}
                        {renderInput('ITBIS', 'itbisGasto', 'number', itbis, setItbis, undefined, '0.00', true)}
                        {renderInput('Monto Total', 'montoGasto', 'number', monto, setMonto, undefined, '0.00', true)}
                    </div>
                </div>
                 <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit">{isEditMode ? "Actualizar Gasto" : "Guardar Gasto"}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NuevoGastoModal;