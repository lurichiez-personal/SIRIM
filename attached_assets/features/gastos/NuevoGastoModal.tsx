import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Gasto, MetodoPago } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { InformationCircleIcon } from '../../components/icons/Icons';

interface NuevoGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newGasto: Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>) => void;
  gastoParaEditar?: Gasto | null;
  initialData?: Partial<Gasto> | null;
}

const GASTO_CATEGORIAS_606 = [
    '01 - GASTOS DE PERSONAL', '02 - GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS', '03 - ARRENDAMIENTOS',
    '04 - GASTOS DE ACTIVOS FIJOS', '05 - GASTOS DE REPRESENTACIÓN', '06 - OTRAS DEDUCCIONES ADMITIDAS',
    '07 - GASTOS FINANCIEROS', '08 - GASTOS EXTRAORDINARIOS', '09 - COMPRAS Y GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA',
    '10 - ADQUISICIONES DE ACTIVOS', '11 - GASTOS DE SEGUROS',
];

const NuevoGastoModal: React.FC<NuevoGastoModalProps> = ({ isOpen, onClose, onSave, gastoParaEditar, initialData }) => {
    const { lookupRNC, loading: isLookingUpRNC } = useDGIIDataStore();
    const isEditMode = !!gastoParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const [rncProveedor, setRncProveedor] = useState('');
    const [proveedorNombre, setProveedorNombre] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [ncf, setNcf] = useState('');
    const [categoriaGasto, setCategoriaGasto] = useState(GASTO_CATEGORIAS_606[1]);
    const [descripcion, setDescripcion] = useState('');
    const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago['01-EFECTIVO']);
    
    const [subtotal, setSubtotal] = useState(0);
    const [itbis, setItbis] = useState(0);
    const [aplicaISC, setAplicaISC] = useState(false);
    const [isc, setIsc] = useState(0);
    const [aplicaPropina, setAplicaPropina] = useState(false);
    const [propinaLegal, setPropinaLegal] = useState(0);
    const [monto, setMonto] = useState(0);

    const [proveedorNotFound, setProveedorNotFound] = useState(false);
    const [errors, setErrors] = useState<any>({});

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

            const initialSubtotal = dataToLoad.subtotal ?? 0;
            const initialItbis = dataToLoad.itbis ?? 0;
            const initialIsc = dataToLoad.isc ?? 0;
            const initialPropina = dataToLoad.propinaLegal ?? 0;
            const initialMonto = dataToLoad.monto ?? 0;

            // Smart calculation from OCR
            if (initialData) {
                if (initialMonto > 0 && initialItbis > 0 && initialSubtotal === 0) {
                    setSubtotal(initialMonto - initialItbis - initialIsc - initialPropina);
                } else {
                    setSubtotal(initialSubtotal);
                }
            } else {
                 setSubtotal(initialSubtotal);
            }
            
            setItbis(initialItbis);
            setIsc(initialIsc);
            setAplicaISC(initialIsc > 0);
            setPropinaLegal(initialPropina);
            setAplicaPropina(initialPropina > 0);
            setMonto(initialMonto);
        }

    }, [isOpen, gastoParaEditar, initialData]);
    
    const calculatedTotal = useMemo(() => {
        const iscAmount = aplicaISC ? isc : 0;
        const propinaAmount = aplicaPropina ? propinaLegal : 0;
        return subtotal + itbis + iscAmount + propinaAmount;
    }, [subtotal, itbis, aplicaISC, isc, aplicaPropina, propinaLegal]);

    const totalMismatch = useMemo(() => {
        return monto > 0 && Math.abs(calculatedTotal - monto) > 0.01;
    }, [calculatedTotal, monto]);

    const handleRNCKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmedRNC = rncProveedor.trim();
            if (trimmedRNC) {
                const result = await lookupRNC(trimmedRNC);
                if (result) {
                    setProveedorNombre(result.nombre);
                    setProveedorNotFound(false);
                    formRef.current?.querySelector<HTMLInputElement>('#proveedorNombre')?.focus();
                } else {
                    setProveedorNotFound(true);
                }
            }
        }
    };

    const handleNcfBlur = () => {
        const cleaned = ncf.toUpperCase().replace(/^0+/, '');
        if (cleaned.startsWith('B') || cleaned.startsWith('E')) {
            setNcf(cleaned);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            rncProveedor,
            proveedorNombre,
            fecha,
            ncf,
            categoriaGasto,
            descripcion,
            metodoPago,
            subtotal,
            itbis,
            isc: aplicaISC ? isc : 0,
            propinaLegal: aplicaPropina ? propinaLegal : 0,
            monto,
            aplicaITBIS: itbis > 0,
            comments: [],
            auditLog: []
        });
        onClose();
    };

    const resetForm = () => {
        setRncProveedor(''); setProveedorNombre('');
        setFecha(new Date().toISOString().split('T')[0]);
        setNcf(''); setCategoriaGasto(GASTO_CATEGORIAS_606[1]);
        setDescripcion(''); setMetodoPago(MetodoPago['01-EFECTIVO']);
        setSubtotal(0); setItbis(0); setIsc(0); setPropinaLegal(0); setMonto(0);
        setAplicaISC(false); setAplicaPropina(false);
        setErrors({}); setProveedorNotFound(false);
    };

    const modalFooter = (
      <>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="gasto-form">{isEditMode ? 'Actualizar Gasto' : 'Guardar Gasto'}</Button>
      </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Editar Gasto" : "Registrar Nuevo Gasto"} footer={modalFooter} size="2xl">
            <form ref={formRef} id="gasto-form" onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="rncProveedor" className="block text-sm font-medium text-secondary-700">RNC / Cédula</label>
                        <input type="text" id="rncProveedor" value={rncProveedor} onChange={e => setRncProveedor(e.target.value)} onKeyDown={handleRNCKeyDown} className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="proveedorNombre" className="block text-sm font-medium text-secondary-700">Nombre / Razón Social</label>
                        <input type="text" id="proveedorNombre" value={proveedorNombre} onChange={e => setProveedorNombre(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" />
                         {proveedorNotFound && <p className="text-xs text-blue-600 mt-1">Proveedor no encontrado en la base de datos local. Por favor, ingrese el nombre manualmente.</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label htmlFor="fecha" className="block text-sm font-medium text-secondary-700">Fecha</label>
                        <input type="date" id="fecha" value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="ncf" className="block text-sm font-medium text-secondary-700">NCF</label>
                        <input type="text" id="ncf" value={ncf} onChange={e => setNcf(e.target.value)} onBlur={handleNcfBlur} className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="metodoPago" className="block text-sm font-medium text-secondary-700">Método de Pago</label>
                        <select id="metodoPago" value={metodoPago} onChange={e => setMetodoPago(e.target.value as MetodoPago)} className="mt-1 w-full border-secondary-300 rounded-md">
                            {Object.values(MetodoPago).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="categoriaGasto" className="block text-sm font-medium text-secondary-700">Categoría (Formato 606)</label>
                    <select id="categoriaGasto" value={categoriaGasto} onChange={e => setCategoriaGasto(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md">
                        {GASTO_CATEGORIAS_606.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="descripcion" className="block text-sm font-medium text-secondary-700">Descripción</label>
                    <textarea id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="mt-1 w-full border-secondary-300 rounded-md" />
                </div>
                
                 <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <ToggleSwitch id="toggle-isc-gasto" checked={aplicaISC} onChange={setAplicaISC} label="Aplica ISC" />
                        <ToggleSwitch id="toggle-propina-gasto" checked={aplicaPropina} onChange={setAplicaPropina} label="Aplica Propina Legal" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <label htmlFor="subtotal-gasto" className="font-medium text-secondary-600">Subtotal:</label>
                             <input type="number" id="subtotal-gasto" value={subtotal} onChange={e => setSubtotal(parseFloat(e.target.value) || 0)} className="w-28 text-right p-1 border rounded-md" step="0.01"/>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <label htmlFor="itbis-gasto" className="font-medium text-secondary-600">ITBIS:</label>
                             <input type="number" id="itbis-gasto" value={itbis} onChange={e => setItbis(parseFloat(e.target.value) || 0)} className="w-28 text-right p-1 border rounded-md" step="0.01"/>
                        </div>
                        {aplicaISC && (
                            <div className="flex justify-between items-center text-sm">
                                <label htmlFor="isc-gasto" className="font-medium text-secondary-600">ISC:</label>
                                 <input type="number" id="isc-gasto" value={isc} onChange={e => setIsc(parseFloat(e.target.value) || 0)} className="w-28 text-right p-1 border rounded-md" step="0.01"/>
                            </div>
                        )}
                        {aplicaPropina && (
                            <div className="flex justify-between items-center text-sm">
                                <label htmlFor="propina-gasto" className="font-medium text-secondary-600">Propina Legal:</label>
                                 <input type="number" id="propina-gasto" value={propinaLegal} onChange={e => setPropinaLegal(parseFloat(e.target.value) || 0)} className="w-28 text-right p-1 border rounded-md" step="0.01"/>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                            <label htmlFor="monto-gasto" className="text-secondary-800">Total:</label>
                            <input type="number" id="monto-gasto" value={monto} onChange={e => setMonto(parseFloat(e.target.value) || 0)} className="w-32 text-right p-1 border rounded-md font-bold text-primary" step="0.01"/>
                        </div>
                        {totalMismatch && (
                            <div className="flex items-center text-xs text-red-600 p-2 bg-red-50 rounded-md">
                                <InformationCircleIcon className="h-4 w-4 mr-2" />
                                La suma de los montos ({calculatedTotal.toFixed(2)}) no coincide con el total de la factura ({monto.toFixed(2)}).
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default NuevoGastoModal;
