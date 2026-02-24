
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Gasto, MetodoPago, isNcfConsumidorFinal } from '../../types.ts';
import Modal from '../../components/ui/Modal.tsx';
import Button from '../../components/ui/Button.tsx';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore.ts';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate.ts';
import ToggleSwitch from '../../components/ui/ToggleSwitch.tsx';
import { InformationCircleIcon, CalculatorIcon } from '../../components/icons/Icons.tsx';
import { useAlertStore } from '../../stores/useAlertStore.ts';
import { parseLocaleNumber } from '../../utils/formatters.ts';

interface NuevoGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newGasto: Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>) => Promise<void>;
  gastoParaEditar?: Gasto | null;
  initialData?: Partial<Gasto> | null;
}

const GASTO_CATEGORIAS_606 = [
    '01 - GASTOS DE PERSONAL', '02 - GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS', '03 - ARRENDAMIENTOS',
    '04 - GASTOS DE ACTIVOS FIJOS', '05 - GASTOS DE REPRESENTACIÓN', '06 - OTRAS DEDUCCIONES ADMITIDAS',
    '07 - GASTOS FINANCIEROS', '08 - GASTOS EXTRAORDINARIOS', '09 - COMPRAS Y GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA',
    '10 - ADQUISICIONES DE ACTIVOS', '11 - GASTOS DE SEGUROS',
];

const TAX_RATES = {
    itbis: 0.18,
    isc: 0.16,
    propina: 0.10
};

const NuevoGastoModal: React.FC<NuevoGastoModalProps> = ({ isOpen, onClose, onSave, gastoParaEditar, initialData }) => {
    const { lookupRNC, loading: isLookingUpRNC } = useDGIIDataStore();
    const { showAlert } = useAlertStore();
    const isEditMode = !!gastoParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const [isSaving, setIsSaving] = useState(false);
    const [rncProveedor, setRncProveedor] = useState('');
    const [proveedorNombre, setProveedorNombre] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [ncf, setNcf] = useState('');
    const [categoriaGasto, setCategoriaGasto] = useState(GASTO_CATEGORIAS_606[1]);
    const [descripcion, setDescripcion] = useState('');
    const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago['01-EFECTIVO']);
    
    const [subtotal, setSubtotal] = useState(0);
    const [subtotalStr, setSubtotalStr] = useState('');
    const [itbis, setItbis] = useState(0);
    const [itbisStr, setItbisStr] = useState('');
    const [aplicaISC, setAplicaISC] = useState(false);
    const [isc, setIsc] = useState(0);
    const [iscStr, setIscStr] = useState('');
    const [aplicaPropina, setAplicaPropina] = useState(false);
    const [propinaLegal, setPropinaLegal] = useState(0);
    const [propinaLegalStr, setPropinaLegalStr] = useState('');
    const [monto, setMonto] = useState(0);
    const [montoStr, setMontoStr] = useState('');

    const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
    const [discountValue, setDiscountValue] = useState(0);
    const [discountValueStr, setDiscountValueStr] = useState('');

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    const formatCurrencyForDisplay = (value: number) => new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

    useEffect(() => {
        if (!isOpen) {
            resetForm();
            return;
        }

        const dataToLoad = gastoParaEditar || initialData;
        if (dataToLoad) {
            setRncProveedor(dataToLoad.rncProveedor || '');
            setProveedorNombre(dataToLoad.proveedorNombre || '');
            setFecha(dataToLoad.fecha || new Date().toISOString().split('T')[0]);
            setNcf(dataToLoad.ncf || '');
            setCategoriaGasto(dataToLoad.categoriaGasto || GASTO_CATEGORIAS_606[1]);
            setDescripcion(dataToLoad.descripcion || '');
            setMetodoPago(dataToLoad.metodoPago as MetodoPago || MetodoPago['01-EFECTIVO']);
            
            if (dataToLoad.descuentoPorcentaje && dataToLoad.descuentoPorcentaje > 0) {
                setDiscountType('percentage');
                setDiscountValue(dataToLoad.descuentoPorcentaje);
                setDiscountValueStr(String(dataToLoad.descuentoPorcentaje));
            } else if (dataToLoad.montoDescuento && dataToLoad.montoDescuento > 0) {
                setDiscountType('amount');
                setDiscountValue(dataToLoad.montoDescuento);
                setDiscountValueStr(String(dataToLoad.montoDescuento));
            }

            const initialSubtotal = dataToLoad.subtotal ?? 0;
            const initialItbis = dataToLoad.itbis ?? 0;
            const initialIsc = dataToLoad.isc ?? 0;
            const initialPropina = dataToLoad.propinaLegal ?? 0;
            const initialMonto = dataToLoad.monto ?? 0;

            setSubtotal(initialSubtotal);
            setSubtotalStr(initialSubtotal > 0 ? initialSubtotal.toFixed(2) : '');
            setItbis(initialItbis);
            setItbisStr(initialItbis > 0 ? initialItbis.toFixed(2) : '');
            setIsc(initialIsc);
            setIscStr(initialIsc > 0 ? initialIsc.toFixed(2) : '');
            setAplicaISC(initialIsc > 0);
            setPropinaLegal(initialPropina);
            setPropinaLegalStr(initialPropina > 0 ? initialPropina.toFixed(2) : '');
            setAplicaPropina(initialPropina > 0);
            setMonto(initialMonto);
            setMontoStr(initialMonto > 0 ? initialMonto.toFixed(2) : '');
        }

    }, [isOpen, gastoParaEditar, initialData]);
    
    // Cálculos derivados para la UI
    const currentMontoDescuento = useMemo(() => {
        if (subtotal <= 0 || discountValue <= 0) return 0;
        return discountType === 'percentage' ? (subtotal * (discountValue / 100)) : discountValue;
    }, [discountType, discountValue, subtotal]);

    const totalCalculado = useMemo(() => {
        const subtotalNeto = subtotal - currentMontoDescuento;
        return subtotalNeto + itbis + (aplicaISC ? isc : 0) + (aplicaPropina ? propinaLegal : 0);
    }, [subtotal, currentMontoDescuento, itbis, aplicaISC, isc, aplicaPropina, propinaLegal]);

    const totalMismatch = useMemo(() => {
        return monto > 0 && Math.abs(totalCalculado - monto) > 0.05;
    }, [totalCalculado, monto]);

    // Función unificada para actualizar el total
    const updateAutoTotal = (newSub: number, newItbis: number, newIsc: number, newProp: number, discVal: number, discTyp: 'percentage' | 'amount') => {
        const actualDisc = discTyp === 'percentage' ? (newSub * (discVal / 100)) : discVal;
        const newTotal = (newSub - actualDisc) + newItbis + newIsc + newProp;
        setMonto(newTotal);
        setMontoStr(newTotal.toFixed(2));
    };

    // Manejador del cambio de subtotal con auto-cálculos
    const handleSubtotalChange = (val: string) => {
        const num = parseLocaleNumber(val);
        setSubtotalStr(val);
        setSubtotal(num);

        const newItbis = num * TAX_RATES.itbis;
        const newIsc = aplicaISC ? num * TAX_RATES.isc : 0;
        const newPropina = aplicaPropina ? num * TAX_RATES.propina : 0;

        setItbis(newItbis);
        setItbisStr(newItbis.toFixed(2));
        
        if (aplicaISC) {
            setIsc(newIsc);
            setIscStr(newIsc.toFixed(2));
        }
        if (aplicaPropina) {
            setPropinaLegal(newPropina);
            setPropinaLegalStr(newPropina.toFixed(2));
        }

        updateAutoTotal(num, newItbis, aplicaISC ? newIsc : 0, aplicaPropina ? newPropina : 0, discountValue, discountType);
    };

    const solveForSubtotal = () => {
        if (monto <= 0) {
            showAlert('Error de Cálculo', 'Debe ingresar el Total de la factura primero.');
            return;
        }

        const impuestosTotal = itbis + (aplicaISC ? isc : 0) + (aplicaPropina ? propinaLegal : 0);
        const subtotalNetoDeseado = monto - impuestosTotal;

        let calculatedGrossSubtotal = 0;
        if (discountValue > 0) {
            if (discountType === 'amount') {
                calculatedGrossSubtotal = subtotalNetoDeseado + discountValue;
            } else {
                const rate = discountValue / 100;
                if (rate < 1) {
                    calculatedGrossSubtotal = subtotalNetoDeseado / (1 - rate);
                }
            }
        } else {
            calculatedGrossSubtotal = subtotalNetoDeseado;
        }

        if (calculatedGrossSubtotal >= 0) {
            setSubtotal(calculatedGrossSubtotal);
            setSubtotalStr(calculatedGrossSubtotal.toFixed(2));
            const check = (calculatedGrossSubtotal - (discountType === 'percentage' ? calculatedGrossSubtotal * (discountValue/100) : discountValue)) + impuestosTotal;
            setMonto(check);
            setMontoStr(check.toFixed(2));
        }
    };

    const handleRNCKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmedRNC = rncProveedor.trim();
            if (trimmedRNC) {
                const result = await lookupRNC(trimmedRNC);
                if (result) {
                    setProveedorNombre(result.nombre);
                    formRef.current?.querySelector<HTMLInputElement>('#ncf')?.focus();
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!proveedorNombre.trim()) { setErrors({ proveedorNombre: 'El nombre es obligatorio.' }); return; }
        if (monto <= 0) { setErrors({ monto: 'El monto total debe ser mayor a cero.' }); return; }

        setIsSaving(true);
        try {
            await onSave({
                rncProveedor, 
                proveedorNombre, 
                fecha, 
                ncf, 
                categoriaGasto, 
                descripcion, 
                metodoPago,
                subtotal, 
                descuentoPorcentaje: discountType === 'percentage' ? discountValue : 0,
                montoDescuento: currentMontoDescuento, 
                itbis, 
                isc: aplicaISC ? isc : 0,
                propinaLegal: aplicaPropina ? propinaLegal : 0, 
                monto, 
                aplicaITBIS: itbis > 0,
                // Add required fields
                aplicaISC,
                aplicaPropina,
                comments: gastoParaEditar ? gastoParaEditar.comments : [],
                auditLog: gastoParaEditar ? gastoParaEditar.auditLog : [],
                pagado: gastoParaEditar ? gastoParaEditar.pagado : false,
            });
            onClose();
        } catch (error) {
            console.error(error);
            showAlert('Error', 'No se pudo guardar el gasto.');
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setRncProveedor(''); setProveedorNombre(''); setNcf(''); setDescripcion('');
        setSubtotal(0); setSubtotalStr(''); setItbis(0); setItbisStr('');
        setIsc(0); setIscStr(''); setPropinaLegal(0); setPropinaLegalStr('');
        setMonto(0); setMontoStr(''); setDiscountValue(0); setDiscountValueStr('');
        setAplicaISC(false); setAplicaPropina(false); setErrors({});
    };

    const modalFooter = (
      <>
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
        <Button type="submit" form="gasto-form" disabled={isSaving}>
            {isSaving ? 'Guardando...' : (isEditMode ? 'Actualizar Gasto' : 'Guardar Gasto')}
        </Button>
      </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Editar Gasto" : "Registrar Nuevo Gasto"} footer={modalFooter} size="2xl">
            <form ref={formRef} id="gasto-form" onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="rncProveedor" className="block text-sm font-medium text-secondary-700">RNC / Cédula</label>
                        <input type="text" id="rncProveedor" value={rncProveedor} onChange={e => setRncProveedor(e.target.value)} onKeyDown={handleRNCKeyDown} className="mt-1 w-full border-secondary-300 rounded-md" placeholder="Presione Enter para buscar" />
                    </div>
                    <div>
                        <label htmlFor="proveedorNombre" className="block text-sm font-medium text-secondary-700">Nombre / Razón Social</label>
                        <input type="text" id="proveedorNombre" value={proveedorNombre} onChange={e => setProveedorNombre(e.target.value)} className={`mt-1 w-full border-secondary-300 rounded-md ${errors.proveedorNombre ? 'border-red-500' : ''}`} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label htmlFor="fecha" className="block text-sm font-medium text-secondary-700">Fecha</label>
                        <input type="date" id="fecha" value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="ncf" className="block text-sm font-medium text-secondary-700">NCF</label>
                        <input type="text" id="ncf" value={ncf} onChange={e => setNcf(e.target.value.toUpperCase())} className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="metodoPago" className="block text-sm font-medium text-secondary-700">Método de Pago</label>
                        <select id="metodoPago" value={metodoPago} onChange={e => setMetodoPago(e.target.value as MetodoPago)} className="mt-1 w-full border-secondary-300 rounded-md">
                            {Object.values(MetodoPago).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="categoriaGasto" className="block text-sm font-medium text-secondary-700">Categoría (Formato 606)</label>
                        <select id="categoriaGasto" value={categoriaGasto} onChange={e => setCategoriaGasto(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md">
                            {GASTO_CATEGORIAS_606.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="descripcion" className="block text-sm font-medium text-secondary-700">Descripción</label>
                        {/* Fix: use correct state setter setDescripcion instead of setDescription */}
                        <input type="text" id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                </div>
                
                 <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <ToggleSwitch 
                            id="toggle-isc-gasto" 
                            checked={aplicaISC} 
                            onChange={v => { 
                                setAplicaISC(v); 
                                const val = v ? subtotal * TAX_RATES.isc : 0;
                                setIsc(val);
                                setIscStr(val.toFixed(2));
                                updateAutoTotal(subtotal, itbis, val, aplicaPropina ? propinaLegal : 0, discountValue, discountType); 
                            }} 
                            label="Aplica ISC (16%)" 
                        />
                        <ToggleSwitch 
                            id="toggle-propina-gasto" 
                            checked={aplicaPropina} 
                            onChange={v => { 
                                setAplicaPropina(v); 
                                const val = v ? subtotal * TAX_RATES.propina : 0;
                                setPropinaLegal(val);
                                setPropinaLegalStr(val.toFixed(2));
                                updateAutoTotal(subtotal, itbis, aplicaISC ? isc : 0, val, discountValue, discountType); 
                            }} 
                            label="Aplica Propina Legal (10%)" 
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center space-x-2">
                                <label htmlFor="subtotal-gasto" className="font-medium text-secondary-600">Subtotal:</label>
                                <button type="button" onClick={solveForSubtotal} className="p-1.5 text-primary hover:bg-primary-50 border border-primary/20 rounded-md transition-all active:scale-95 shadow-sm" title="Calcular subtotal desde el total (Ingresa Total e ITBIS primero)">
                                    <CalculatorIcon className="h-4 w-4" />
                                </button>
                            </div>
                             <input type="text" inputMode="decimal" id="subtotal-gasto" value={subtotalStr} onChange={e => handleSubtotalChange(e.target.value)} className="w-32 text-right p-1.5 border border-secondary-300 rounded-md font-mono" />
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <label className="font-medium text-secondary-600">Descuento:</label>
                            <div className="flex items-center">
                                <input type="text" inputMode="decimal" value={discountValueStr} onChange={e => { 
                                        const val = e.target.value; const num = parseLocaleNumber(val);
                                        setDiscountValueStr(val); setDiscountValue(num);
                                        updateAutoTotal(subtotal, itbis, aplicaISC ? isc : 0, aplicaPropina ? propinaLegal : 0, num, discountType);
                                    }} className="w-20 text-right p-1.5 border border-secondary-300 rounded-l-md font-mono border-r-0" />
                                <button type="button" onClick={() => { setDiscountType('percentage'); updateAutoTotal(subtotal, itbis, aplicaISC ? isc : 0, aplicaPropina ? propinaLegal : 0, discountValue, 'percentage'); }} className={`px-2 py-1.5 border text-xs ${discountType === 'percentage' ? 'bg-primary text-white border-primary z-10 shadow-sm' : 'bg-secondary-100 border-secondary-300'}`}>%</button>
                                <button type="button" onClick={() => { setDiscountType('amount'); updateAutoTotal(subtotal, itbis, aplicaISC ? isc : 0, aplicaPropina ? propinaLegal : 0, discountValue, 'amount'); }} className={`px-2 py-1.5 border border-l-0 rounded-r-md text-xs ${discountType === 'amount' ? 'bg-primary text-white border-primary z-10 shadow-sm' : 'bg-secondary-100 border-secondary-300'}`}>DOP</button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <label htmlFor="itbis-gasto" className="font-medium text-secondary-600">ITBIS (18%):</label>
                             <input type="text" inputMode="decimal" id="itbis-gasto" value={itbisStr} onChange={e => { 
                                 const val = e.target.value; const num = parseLocaleNumber(val);
                                 setItbisStr(val); setItbis(num); 
                                 updateAutoTotal(subtotal, num, aplicaISC ? isc : 0, aplicaPropina ? propinaLegal : 0, discountValue, discountType);
                             }} className="w-32 text-right p-1.5 border border-secondary-300 rounded-md font-mono" />
                        </div>
                        
                        {aplicaISC && (
                            <div className="flex justify-between items-center text-sm">
                                <label className="font-medium text-secondary-600">ISC (16%):</label>
                                 <input type="text" inputMode="decimal" value={iscStr} onChange={e => { 
                                     const val = e.target.value; const num = parseLocaleNumber(val);
                                     setIscStr(val); setIsc(num); 
                                     updateAutoTotal(subtotal, itbis, num, aplicaPropina ? propinaLegal : 0, discountValue, discountType);
                                 }} className="w-32 text-right p-1.5 border border-secondary-300 rounded-md font-mono" />
                            </div>
                        )}
                        {aplicaPropina && (
                            <div className="flex justify-between items-center text-sm">
                                <label className="font-medium text-secondary-600">Propina Legal (10%):</label>
                                 <input type="text" inputMode="decimal" value={propinaLegalStr} onChange={e => { 
                                     const val = e.target.value; const num = parseLocaleNumber(val);
                                     setPropinaLegalStr(val); setPropinaLegal(num); 
                                     updateAutoTotal(subtotal, itbis, aplicaISC ? isc : 0, num, discountValue, discountType);
                                 }} className="w-32 text-right p-1.5 border border-secondary-300 rounded-md font-mono" />
                            </div>
                        )}
                        <div className="flex justify-between items-center text-lg font-bold border-t border-secondary-200 pt-3 mt-2">
                            <label htmlFor="monto-gasto" className="text-secondary-800">Total Facturado:</label>
                            <input type="text" inputMode="decimal" id="monto-gasto" value={montoStr} onChange={e => { 
                                const val = e.target.value; setMontoStr(val); setMonto(parseLocaleNumber(val)); 
                            }} className={`w-40 text-right p-1.5 border rounded-md font-bold text-primary bg-secondary-50 ${errors.monto || totalMismatch ? 'border-red-500 ring-1 ring-red-200' : 'border-secondary-300 shadow-inner'}`} />
                        </div>

                        {totalMismatch && (
                            <div className="flex items-center text-xs text-red-600 p-2 bg-red-50 rounded-md border border-red-100">
                                <InformationCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span>La suma de los componentes ({formatCurrencyForDisplay(totalCalculado)}) no coincide con el total por {formatCurrencyForDisplay(Math.abs(totalCalculado - monto))}.</span>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default NuevoGastoModal;
