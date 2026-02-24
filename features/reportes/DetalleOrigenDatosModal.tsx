
import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';

interface AccountDetail {
    code: string;
    name: string;
    amount: number;
    source?: string;
}

interface AuditData {
    [categoryCode: string]: {
        description: string;
        total: number;
        accounts: AccountDetail[];
    };
}

interface DetalleOrigenDatosModalProps {
    isOpen: boolean;
    onClose: () => void;
    auditData: AuditData;
}

const DetalleOrigenDatosModal: React.FC<DetalleOrigenDatosModalProps> = ({ isOpen, onClose, auditData }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const entries = Object.entries(auditData) as [string, AuditData[string]][];
    const filteredData = entries.filter(([key, data]) => {
        const term = searchTerm.toLowerCase();
        return (
            key.toLowerCase().includes(term) ||
            data.description.toLowerCase().includes(term) ||
            data.accounts.some(acc => acc.name.toLowerCase().includes(term) || acc.code.toLowerCase().includes(term))
        );
    }).sort((a, b) => a[0].localeCompare(b[0]));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Auditoría de Origen de Datos (IR-2)" size="4xl">
            <div className="p-6 h-[70vh] flex flex-col">
                <div className="mb-4">
                    <input 
                        type="text" 
                        placeholder="Buscar por código DGII o nombre de cuenta..." 
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {filteredData.length === 0 ? (
                        <p className="text-center text-secondary-500 py-8">No se encontraron registros contables para los criterios de búsqueda.</p>
                    ) : (
                        filteredData.map(([categoryCode, data]) => (
                            <div key={categoryCode} className="border border-secondary-200 rounded-lg overflow-hidden shadow-sm">
                                <div className="bg-secondary-50 px-4 py-2 border-b border-secondary-200 flex justify-between items-center">
                                    <div>
                                        <span className="font-mono font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded text-xs mr-2">{categoryCode}</span>
                                        <span className="font-semibold text-secondary-800 text-sm">{data.description}</span>
                                    </div>
                                    <span className="font-bold text-secondary-900">{formatCurrency(data.total)}</span>
                                </div>
                                <div className="bg-white">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-1.5 text-left text-secondary-500 font-medium w-24">Cuenta</th>
                                                <th className="px-4 py-1.5 text-left text-secondary-500 font-medium">Descripción</th>
                                                <th className="px-4 py-1.5 text-right text-secondary-500 font-medium">Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {data.accounts.map((acc, idx) => (
                                                <tr key={`${categoryCode}-${idx}`} className="hover:bg-gray-50">
                                                    <td className="px-4 py-1.5 font-mono text-secondary-600">{acc.code}</td>
                                                    <td className="px-4 py-1.5 text-secondary-700">
                                                        {acc.name}
                                                        {acc.source && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">{acc.source}</span>}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-right font-mono text-secondary-800">{formatCurrency(acc.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-secondary-200 flex justify-end">
                    <Button onClick={onClose}>Cerrar Auditoría</Button>
                </div>
            </div>
        </Modal>
    );
};

export default DetalleOrigenDatosModal;
