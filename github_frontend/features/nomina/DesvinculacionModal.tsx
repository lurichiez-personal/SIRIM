import React, { useState, useMemo, useEffect } from 'react';
import { Empleado, CausaDesvinculacion, Desvinculacion } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { calcularPrestaciones } from '../../utils/payrollUtils';
import { generarCartaDescargo } from '../../utils/documentUtils';
import { useConfirmationStore } from '../../stores/useConfirmationStore';

interface DesvinculacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (desvinculacion: Omit<Desvinculacion, 'id' | 'empresaId' | 'asientoId'>) => void;
  empleados: Empleado[];
}

const DesvinculacionModal: React.FC<DesvinculacionModalProps> = ({ isOpen, onClose, onSave, empleados }) => {
    const { showConfirmation } = useConfirmationStore();
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [causa, setCausa] = useState<CausaDesvinculacion>(CausaDesvinculacion.Desahucio);
    const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split('T')[0]);
    const [step, setStep] = useState(1);
    const [savedDesvinculacion, setSavedDesvinculacion] = useState<(Omit<Desvinculacion, 'id' | 'empresaId' | 'asientoId'> & {id: number, empresaId: number}) | null>(null);

    const prestaciones = useMemo(() => {
        if (!empleado) return null;
        return calcularPrestaciones(empleado, fechaSalida, causa);
    }, [empleado, fechaSalida, causa]);
    
    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const handleConfirmAndSave = () => {
        if (!empleado || !prestaciones) return;
        
        showConfirmation(
            'Confirmar Desvinculación',
            `¿Está seguro de que desea procesar la salida de ${empleado.nombre}? Esta acción marcará al empleado como inactivo y generará el asiento contable.`,
            () => {
                const desvinculacionData: Omit<Desvinculacion, 'id' | 'empresaId' | 'asientoId'> = {
                    empleadoId: empleado.id,
                    empleadoNombre: empleado.nombre,
                    empleadoCedula: empleado.cedula,
                    fechaSalida,
                    causa,
                    prestaciones,
                };
                onSave(desvinculacionData);
                // We need an ID for the letter, so let's simulate it. In a real app, onSave would return the created object.
                setSavedDesvinculacion({ ...desvinculacionData, id: Date.now(), empresaId: empleado.empresaId });
                setStep(2);
            }
        );
    };

    const resetForm = () => {
        setEmpleado(null);
        setCausa(CausaDesvinculacion.Desahucio);
        setFechaSalida(new Date().toISOString().split('T')[0]);
        setStep(1);
        setSavedDesvinculacion(null);
    };
    
    const handleDownloadCarta = () => {
        if (savedDesvinculacion && empleado) {
            generarCartaDescargo(savedDesvinculacion, empleado);
        }
    };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const CausaLabelMap: Record<CausaDesvinculacion, string> = {
        [CausaDesvinculacion.Desahucio]: "Desahucio (ejercido por el empleador)",
        [CausaDesvinculacion.Despido]: "Despido (con justa causa)",
        [CausaDesvinculacion.Dimision]: "Dimisión (renuncia del empleado)",
        [CausaDesvinculacion.Contrato]: "Terminación de Contrato",
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Registrar Desvinculación de Empleado"
            size="2xl"
            footer={ step === 1 ?
                <>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirmAndSave} disabled={!empleado}>Calcular y Guardar</Button>
                </> : <>
                    <Button variant="secondary" onClick={handleDownloadCarta}>Descargar Carta de Descargo</Button>
                    <Button onClick={onClose}>Finalizar</Button>
                </>
            }
        >
            <div className="p-6">
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Empleado a Desvincular</label>
                            <select onChange={(e) => setEmpleado(empleados.find(emp => emp.id === parseInt(e.target.value)) || null)} className="mt-1 w-full border-secondary-300 rounded-md">
                                <option>Seleccione un empleado...</option>
                                {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.cedula})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Fecha de Salida</label>
                                <input type="date" value={fechaSalida} onChange={e => setFechaSalida(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Causa de la Terminación</label>
                                <select value={causa} onChange={e => setCausa(e.target.value as CausaDesvinculacion)} className="mt-1 w-full border-secondary-300 rounded-md">
                                    {Object.entries(CausaLabelMap).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {prestaciones && (
                             <div className="pt-4 border-t mt-4">
                                <h3 className="font-semibold text-lg">Cálculo Preliminar de Prestaciones</h3>
                                <div className="space-y-1 text-sm mt-2">
                                    <div className="flex justify-between"><span>Preaviso:</span> <span>{formatCurrency(prestaciones.preaviso)}</span></div>
                                    <div className="flex justify-between"><span>Auxilio de Cesantía:</span> <span>{formatCurrency(prestaciones.cesantia)}</span></div>
                                    <div className="flex justify-between"><span>Vacaciones:</span> <span>{formatCurrency(prestaciones.vacaciones)}</span></div>
                                    <div className="flex justify-between"><span>Salario de Navidad (Regalía):</span> <span>{formatCurrency(prestaciones.salarioNavidad)}</span></div>
                                    <div className="flex justify-between font-bold text-base mt-2 border-t pt-2"><span>Total a Pagar:</span> <span className="text-primary">{formatCurrency(prestaciones.total)}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {step === 2 && (
                    <div className="text-center">
                         <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-secondary-900">Desvinculación Guardada</h3>
                        <p className="mt-1 text-sm text-secondary-500">
                            El empleado ha sido marcado como inactivo. Ahora puede descargar la carta de descargo para la firma.
                        </p>
                        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold">Total a Pagar: {formatCurrency(savedDesvinculacion?.prestaciones.total || 0)}</h4>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default DesvinculacionModal;