import React, { useState } from 'react';
import { Nomina } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { DownloadIcon } from '../../components/icons/Icons';
import { generarVoucherPago } from '../../utils/documentUtils';

interface HistorialNominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  nominas: Nomina[];
}

const HistorialNominaModal: React.FC<HistorialNominaModalProps> = ({ isOpen, onClose, nominas }) => {
    const [selectedNomina, setSelectedNomina] = useState<Nomina | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    
    const handleDownloadVoucher = (empleadoId: number) => {
        const empleado = selectedNomina?.empleados.find(e => e.empleadoId === empleadoId);
        if(empleado && selectedNomina) {
            generarVoucherPago(empleado, selectedNomina.periodo);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Historial de Nóminas Procesadas"
            size="4xl"
            footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
        >
            <div className="p-6">
                {selectedNomina ? (
                    <div>
                        <Button variant="secondary" onClick={() => setSelectedNomina(null)} className="mb-4">
                            &larr; Volver al Historial
                        </Button>
                        <h3 className="text-lg font-bold">Detalle de Nómina - {selectedNomina.periodo}</h3>
                        <div className="overflow-x-auto max-h-[50vh] mt-4">
                            <table className="min-w-full divide-y divide-secondary-200 text-sm">
                                <thead className="bg-secondary-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-secondary-500">Empleado</th>
                                        <th className="px-3 py-2 text-right font-medium text-secondary-500">Salario Neto</th>
                                        <th className="px-3 py-2 text-center font-medium text-secondary-500">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {selectedNomina.empleados.map(emp => (
                                        <tr key={emp.empleadoId}>
                                            <td className="px-3 py-2 font-medium">{emp.nombre}</td>
                                            <td className="px-3 py-2 text-right font-bold text-primary">{formatCurrency(emp.salarioNeto)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <Button size="sm" variant="secondary" leftIcon={<DownloadIcon/>} onClick={() => handleDownloadVoucher(emp.empleadoId)}>Voucher</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[60vh]">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Período</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Total Pagado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase"># Empleados</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {nominas.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4">No hay nóminas en el historial.</td></tr>
                                ) : (
                                    nominas.map(nomina => (
                                        <tr key={nomina.id}>
                                            <td className="px-6 py-4 font-medium">{nomina.periodo}</td>
                                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(nomina.totalPagado)}</td>
                                            <td className="px-6 py-4 text-right">{nomina.empleados.length}</td>
                                            <td className="px-6 py-4 text-center">
                                                <Button size="sm" onClick={() => setSelectedNomina(nomina)}>Ver Detalles</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default HistorialNominaModal;
