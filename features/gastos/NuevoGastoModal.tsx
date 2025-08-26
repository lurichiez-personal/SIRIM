
import React, { useState, useEffect, useRef } from 'react';
import { Gasto } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { ErrorMessages, isValidRNC } from '../../utils/validationUtils';

interface NuevoGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newGasto: Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>) => void;
  gastoParaEditar?: Gasto | null;
  initialData?: Partial<Gasto> | null;
}

const ITBIS_RATE = 0.18;
const ISC_RATE = 0.16;

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

const NuevoGastoModal: React.FC<NuevoGastoModalProps> = ({ isOpen, onClose, onSave, gastoParaEditar, initialData }) => {
    const [proveedorNombre, setProveedorNombre] = useState('');
    const [rncProveedor, setRncProveedor] = useState('');
    const [ncf, setNcf] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [categoriaGasto, setCategoriaGasto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [subtotal, setSubtotal] = useState('');
    const [aplicaITBIS, setAplicaITBIS] = useState(true);
    const [aplicaISC, setAplicaISC] = useState(false);
    const [itbis, setItbis] = useState('0.00');
    const [isc, setIsc] = useState('0.00');
    const [monto, setMonto] = useState('0.00');
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    const [propinaLegal, setPropinaLegal] = useState(0);
    const [errors, setErrors] = useState<{ fecha?: string; subtotal?: string, descripcion?: string, categoriaGasto?: string, rncProveedor?: string, proveedorNombre?: string, ncf?: string }>({});
    
    const { lookupRNC, loading: isLookingUpRNC } = useDGIIDataStore();
    const isEditMode = !!gastoParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen) {
            if (gastoParaEditar) {
                setProveedorNombre(gastoParaEditar.proveedorNombre || '');
                setRncProveedor(gastoParaEditar.rncProveedor || '');
                setNcf(gastoParaEditar.ncf || '');
                setFecha(gastoParaEditar.fecha);
                setCategoriaGasto(gastoParaEditar.categoriaGasto || '');
                setDescripcion(gastoParaEditar.descripcion);
                setSubtotal(gastoParaEditar.subtotal.toString());
                setAplicaITBIS(gastoParaEditar.aplicaITBIS);
            } else if (initialData) {
                setProveedorNombre(initialData.proveedorNombre || '');
                setRncProveedor(initialData.rncProveedor || '');
                setNcf(initialData.ncf || '');
                setFecha(initialData.fecha || new Date().toISOString().split('T')[0]);
                
                // NUEVA LÓGICA: Configurar automáticamente toggles y montos basándose en datos detectados por OCR
                const montoNum = initialData.monto || 0;
                const subtotalFromOCR = (initialData as any).subtotal;
                const itbisFromOCR = (initialData as any).itbis || 0;
                const iscFromOCR = (initialData as any).iscMonto || 0;
                const descuentoFromOCR = (initialData as any).descuentoPorcentaje || 0;
                const propinaFromOCR = (initialData as any).propinaLegal || 0;
                
                // Configurar montos principales
                setMonto(montoNum.toFixed(2));
                setDescuentoPorcentaje(descuentoFromOCR);
                setPropinaLegal(propinaFromOCR);
                
                // ITBIS: Habilitar toggle y colocar monto si se detectó
                if (itbisFromOCR > 0) {
                    setAplicaITBIS(true);
                    setItbis(itbisFromOCR.toFixed(2));
                } else {
                    setAplicaITBIS((initialData as any).aplicaITBIS ?? true);
                }
                
                // ISC: Habilitar toggle y colocar monto si se detectó
                if (iscFromOCR > 0) {
                    setAplicaISC(true);
                    setIsc(iscFromOCR.toFixed(2));
                }
                
                // Subtotal: Usar detectado o calcular inteligentemente
                if (subtotalFromOCR > 0) {
                    setSubtotal(subtotalFromOCR.toFixed(2));
                } else {
                    // Calcular subtotal: Total - todos los impuestos
                    const impuestosTotales = itbisFromOCR + iscFromOCR + propinaFromOCR;
                    const subtotalCalc = montoNum - impuestosTotales;
                    setSubtotal(Math.max(0, subtotalCalc).toFixed(2));
                }
                
                // Auto-lookup de RNC si se detectó
                if (initialData.rncProveedor) {
                    handleRNCProveedorBlur(initialData.rncProveedor);
                }
            } else {
                resetForm();
            }
        }
    }, [isOpen, gastoParaEditar, initialData]);

    useEffect(() => {
        const subtotalNum = parseFloat(subtotal);
        if (!isNaN(subtotalNum) && subtotalNum >= 0) {
            const montoDescuento = subtotalNum * (descuentoPorcentaje / 100);
            const baseImponible = subtotalNum - montoDescuento;
            const itbisCalculado = aplicaITBIS ? baseImponible * ITBIS_RATE : 0;
            const iscCalculado = aplicaISC ? baseImponible * ISC_RATE : 0;
            const totalCalculado = baseImponible + itbisCalculado + iscCalculado + propinaLegal;
            
            setItbis(itbisCalculado.toFixed(2));
            setIsc(iscCalculado.toFixed(2));
            setMonto(totalCalculado.toFixed(2));
        } else {
            setItbis('0.00');
            setIsc('0.00');
            setMonto('0.00');
        }
    }, [subtotal, aplicaITBIS, aplicaISC, descuentoPorcentaje, propinaLegal]);
    
    const validate = () => {
        const newErrors: { fecha?: string; subtotal?: string, descripcion?: string, categoriaGasto?: string, rncProveedor?: string, proveedorNombre?: string, ncf?: string } = {};
        
        // Validar fecha
        if (!fecha) {
            newErrors.fecha = ErrorMessages.FECHA_REQUERIDA;
        } else {
            const fechaGasto = new Date(fecha);
            const hoy = new Date();
            const hace5Anos = new Date();
            hace5Anos.setFullYear(hoy.getFullYear() - 5);
            
            if (fechaGasto > hoy) {
                newErrors.fecha = ErrorMessages.FECHA_FUTURA;
            } else if (fechaGasto < hace5Anos) {
                newErrors.fecha = ErrorMessages.FECHA_MUY_ANTIGUA;
            }
        }
        
        // Validar descripción
        if (!descripcion.trim()) {
            newErrors.descripcion = ErrorMessages.DESCRIPCION_REQUERIDA;
        } else if (descripcion.trim().length < 5) {
            newErrors.descripcion = ErrorMessages.TEXTO_MUY_CORTO('La descripción', 5);
        }
        
        // Validar categoría
        if (!categoriaGasto) {
            newErrors.categoriaGasto = ErrorMessages.CATEGORIA_REQUERIDA;
        }
        
        // Validar subtotal
        const subtotalNum = parseFloat(subtotal);
        if (isNaN(subtotalNum) || subtotalNum <= 0) {
            newErrors.subtotal = ErrorMessages.SUBTOTAL_INVALIDO;
        } else if (subtotalNum > 99999999) {
            newErrors.subtotal = ErrorMessages.SUBTOTAL_EXCEDE_LIMITE;
        }
        
        // Validar proveedor (opcional pero si se proporciona debe ser válido)
        if (proveedorNombre.trim() && proveedorNombre.trim().length < 2) {
            newErrors.proveedorNombre = ErrorMessages.TEXTO_MUY_CORTO('El nombre del proveedor', 2);
        }
        // Validar RNC del proveedor
        if (rncProveedor.trim() && !isValidRNC(rncProveedor)) {
            newErrors.rncProveedor = ErrorMessages.RNC_FORMATO_INVALIDO;
        }
        
        // Validar NCF (opcional pero si se proporciona debe tener formato válido)
        if (ncf.trim() && (ncf.trim().length < 11 || ncf.trim().length > 19)) {
            newErrors.ncf = ErrorMessages.NCF_FORMATO_INVALIDO;
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
            aplicaITBIS,
            aplicaISC,
            subtotal: parseFloat(subtotal),
            itbis: parseFloat(itbis),
            isc: parseFloat(isc),
            monto: parseFloat(monto),
            descuentoPorcentaje,
            propinaLegal,
            comments: [],
            auditLog: [],
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
        setAplicaITBIS(true);
        setAplicaISC(false);
        setIsc('0.00');
        setDescuentoPorcentaje(0);
        setPropinaLegal(0);
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleRNCProveedorBlur = async (rnc: string = rncProveedor) => {
        if (rnc && rnc.trim() !== '') {
            try {
                const result = await lookupRNC(rnc);
                if (result) {
                    setProveedorNombre(result.nombre);
                } else {
                    setErrors(prev => ({ ...prev, rncProveedor: 'No se encontró el RNC en DGII.' }));
                }
            } catch (error: any) {
                setErrors(prev => ({ ...prev, rncProveedor: error?.message || 'Error al buscar el RNC. Intente nuevamente.' }));
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
                                    {errors.rncProveedor && (
                                        <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{errors.rncProveedor}</div>
                                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput('Proveedor', 'proveedor', 'text', proveedorNombre, setProveedorNombre, undefined, 'Nombre del proveedor')}
                        {renderInput('RNC Proveedor', 'rncProveedor', 'text', rncProveedor, setRncProveedor, undefined, 'Ej: 130123456', false, () => handleRNCProveedorBlur())}
                        {renderInput('NCF', 'ncfGasto', 'text', ncf, setNcf, undefined, 'Ej: B0100000001')}
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
                    
                    <div className="border-t pt-4 mt-4 space-y-4">
                        {/* Toggles para impuestos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <ToggleSwitch 
                                    id="toggle-itbis-gasto" 
                                    checked={aplicaITBIS} 
                                    onChange={setAplicaITBIS} 
                                    label="Este gasto incluye ITBIS deducible (18%)" 
                                />
                            </div>
                            <div>
                                <ToggleSwitch 
                                    id="toggle-isc-gasto" 
                                    checked={aplicaISC} 
                                    onChange={setAplicaISC} 
                                    label="Este gasto incluye ISC (16%)" 
                                />
                            </div>
                        </div>
                        
                        {/* Sección de montos y cálculos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Columna izquierda: Inputs */}
                            <div className="space-y-4">
                                {renderInput('Subtotal *', 'subtotalGasto', 'number', subtotal, setSubtotal, errors.subtotal, '0.00')}
                                
                                <div>
                                    <label htmlFor="descuentoPorcentaje" className="block text-sm font-medium text-secondary-700">Descuento (%)</label>
                                    <input
                                        type="number"
                                        id="descuentoPorcentaje"
                                        value={descuentoPorcentaje}
                                        onChange={(e) => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
                                        className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="propinaLegal" className="block text-sm font-medium text-secondary-700">Propina Legal (RD$)</label>
                                    <input
                                        type="number"
                                        id="propinaLegal"
                                        value={propinaLegal}
                                        onChange={(e) => setPropinaLegal(parseFloat(e.target.value) || 0)}
                                        className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            
                            {/* Columna derecha: Resumen de cálculos */}
                            <div className="space-y-2 border-l pl-6">
                                <h4 className="text-sm font-medium text-secondary-700 mb-3">📊 Resumen de Cálculos</h4>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Subtotal:</span>
                                    <span className="text-secondary-800">RD$ {parseFloat(subtotal || '0').toFixed(2)}</span>
                                </div>
                                
                                {descuentoPorcentaje > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary-600">Descuento ({descuentoPorcentaje}%):</span>
                                        <span className="text-red-600">- RD$ {(parseFloat(subtotal || '0') * (descuentoPorcentaje / 100)).toFixed(2)}</span>
                                    </div>
                                )}
                                
                                {aplicaITBIS && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary-600">ITBIS (18%):</span>
                                        <span className="text-secondary-800">RD$ {itbis}</span>
                                    </div>
                                )}
                                
                                {aplicaISC && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary-600">ISC (16%):</span>
                                        <span className="text-secondary-800">RD$ {isc}</span>
                                    </div>
                                )}
                                
                                {propinaLegal > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary-600">Propina Legal:</span>
                                        <span className="text-secondary-800">RD$ {propinaLegal.toFixed(2)}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                    <span className="text-secondary-800">💰 Total:</span>
                                    <span className="text-primary">RD$ {monto}</span>
                                </div>
                            </div>
                        </div>
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