import React, { useState, useMemo, useEffect } from 'react';
import { Empleado, Nomina, NominaEmpleado } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { procesarNominaEmpleado } from '../../utils/payrollUtils';

interface ProcesarNominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nomina: Omit<Nomina, 'empresaId'>) => void;
  empleados: Empleado[];
}

const ProcesarNominaModal: React.FC<ProcesarNominaModalProps> = ({ isOpen, onClose, onSave, empleados }) => {
    const [periodo, setPeriodo] = useState('');

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            setPeriodo(`${year}-${month}`);
        }
    }, [isOpen]);

    const nominaCalculada = useMemo(() => {
        if (!isOpen) return [];
        return empleados.map(procesarNominaEmpleado);
    }, [isOpen, empleados]);

    const totals = useMemo(() => {
        return nominaCalculada.reduce((acc, emp) => ({
            salarioNeto: acc.salarioNeto + emp.salarioNeto,
            costoEmpresa: acc.costoEmpresa + emp.salarioBruto + emp.totalAportesEmpleador,
        }), { salarioNeto: 0, costoEmpresa: 0 });
    }, [nominaCalculada]);

    const handleSubmit = () => {
        const nominaData: Omit<Nomina, 'empresaId'> = {
            id: periodo,
            fecha: new Date().toISOString().split('T')[0],
            periodo,
            empleados: nominaCalculada,
            totalPagado: totals.salarioNeto,
            totalCostoEmpresa: totals.costoEmpresa,
        };
        onSave(nominaData);
        onClose();
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Procesar Nómina - ${periodo}`}
            size="5xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit}>Guardar y Contabilizar Nómina</Button>
                </>
            }
        >
            <div className="p-6">
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="min-w-full divide-y divide-secondary-200 text-xs">
                        <thead className="bg-secondary-50 sticky top-0">
                            <tr>
                                <th rowSpan={2} className="px-2 py-2 text-left font-medium text-secondary-500 align-bottom">Empleado</th>
                                <th rowSpan={2} className="px-2 py-2 text-right font-medium text-secondary-500 align-bottom">Salario Bruto</th>
                                <th colSpan={4} className="px-2 py-2 text-center font-medium text-secondary-500 border-b">Deducciones Empleado</th>
                                <th rowSpan={2} className="px-2 py-2 text-right font-bold text-secondary-700 align-bottom">Salario Neto</th>
                                <th colSpan={4} className="px-2 py-2 text-center font-medium text-secondary-500 border-b">Aportes Empleador</th>
                            </tr>
                            <tr>
                                <th className="px-2 py-2 text-right font-medium text-secondary-500">SFS</th>
                                <th className="px-2 py-2 text-right font-medium text-secondary-500">AFP</th>
                                <th className="px-2 py-2 text-right font-medium text-secondary-500">ISR</th>
                                <th className="px-2 py-2 text-right font-medium text-red-700">Total</th>
                                <th className="px-2 py-2 text-right font-medium text-secondary-500">SFS</th>
                                <th className="px-2 py-2 text-right font-medium text-secondary-500">SRL</th>
                                <th className="px-2 py-2 text-right font-medium text-secondary-500">INFOTEP</th>
                                <th className="px-2 py-2 text-right font-medium text-blue-700">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {nominaCalculada.map(emp => (
                                <tr key={emp.empleadoId}>
                                    <td className="px-2 py-2 font-medium">{emp.nombre}</td>
                                    <td className="px-2 py-2 text-right">{formatCurrency(emp.salarioBruto)}</td>
                                    <td className="px-2 py-2 text-right text-red-600">({formatCurrency(emp.sfs)})</td>
                                    <td className="px-2 py-2 text-right text-red-600">({formatCurrency(emp.afp)})</td>
                                    <td className="px-2 py-2 text-right text-red-600">({formatCurrency(emp.isr)})</td>
                                    <td className="px-2 py-2 text-right font-semibold text-red-700">({formatCurrency(emp.totalDeduccionesEmpleado)})</td>
                                    <td className="px-2 py-2 text-right font-bold text-primary">{formatCurrency(emp.salarioNeto)}</td>
                                    <td className="px-2 py-2 text-right text-blue-600">{formatCurrency(emp.sfsEmpleador)}</td>
                                    <td className="px-2 py-2 text-right text-blue-600">{formatCurrency(emp.srlEmpleador)}</td>
                                    <td className="px-2 py-2 text-right text-blue-600">{formatCurrency(emp.infotep)}</td>
                                    <td className="px-2 py-2 text-right font-semibold text-blue-700">{formatCurrency(emp.totalAportesEmpleador)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="grid grid-cols-2 gap-4 text-right font-bold text-lg mt-4 pr-4">
                    <span>Costo Total para la Empresa: <span className="text-red-700">{formatCurrency(totals.costoEmpresa)}</span></span>
                    <span>Total a Pagar a Empleados: <span className="text-primary">{formatCurrency(totals.salarioNeto)}</span></span>
                </div>
            </div>
        </Modal>
    );
};

export default ProcesarNominaModal;