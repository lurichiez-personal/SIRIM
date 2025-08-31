import React from 'react';
import { Desvinculacion } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

interface HistorialDesvinculacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  desvinculaciones: Desvinculacion[];
}

const HistorialDesvinculacionesModal: React.FC<HistorialDesvinculacionesModalProps> = ({ isOpen, onClose, desvinculaciones }) => {
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Historial de Desvinculaciones"
            size="3xl"
            footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
        >
            <div className="p-6">
                 <div className="overflow-x-auto max-h-[60vh]">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Empleado</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Cédula</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha Salida</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Causa</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Prestaciones Pagadas</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                           {desvinculaciones.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-4">No hay desvinculaciones en el historial.</td></tr>
                           ) : (
                               desvinculaciones.map(d => (
                                   <tr key={d.id}>
                                        <td className="px-4 py-3 font-medium">{d.empleadoNombre}</td>
                                        <td className="px-4 py-3">{d.empleadoCedula}</td>
                                        <td className="px-4 py-3">{new Date(d.fechaSalida + 'T00:00:00').toLocaleDateString('es-DO')}</td>
                                        <td className="px-4 py-3 capitalize">{d.causa.replace('_', ' ')}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(d.prestaciones.total)}</td>
                                   </tr>
                               ))
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};

export default HistorialDesvinculacionesModal;
