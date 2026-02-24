// src/features/facturas/IncompleteNotesModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Factura } from '../../types';
import { useDataStore } from '../../stores/useDataStore';
import { formatCurrency } from '../../utils/formatters';
import { InformationCircleIcon, CheckIcon } from '../../components/icons/Icons';

interface IncompleteNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    notes: Factura[];
}

const IncompleteNotesModal: React.FC<IncompleteNotesModalProps> = ({ isOpen, onClose, notes }) => {
    const { updateFactura } = useDataStore();
    const [localNotes, setLocalNotes] = useState<{[id: string]: string}>({});
    const [isSaving, setIsSaving] = useState(false);
    const [successCount, setSuccessCount] = useState(0);

    useEffect(() => {
        if (isOpen) {
            const initial: {[id: string]: string} = {};
            notes.forEach(n => {
                initial[n.id] = n.ncfModificado || '';
            });
            setLocalNotes(initial);
            setSuccessCount(0);
        }
    }, [isOpen, notes]);

    const handleInputChange = (id: string, value: string) => {
        setLocalNotes(prev => ({ ...prev, [id]: value.toUpperCase() }));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        let count = 0;
        try {
            for (const note of notes) {
                const newValue = localNotes[note.id];
                if (newValue && newValue.trim() !== '') {
                    await updateFactura({ ...note, ncfModificado: newValue.trim() });
                    count++;
                }
            }
            setSuccessCount(count);
            // If everything is fixed, close after a delay
            if (count === notes.length) {
                setTimeout(onClose, 1500);
            }
        } catch (error) {
            console.error("Error updating notes:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const allCompleted = notes.every(n => localNotes[n.id] && localNotes[n.id].trim() !== '');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Validación Obligatoria: Notas de Crédito"
            size="3xl"
            footer={
                <div className="flex justify-between items-center w-full">
                    <p className="text-xs text-secondary-500 italic">
                        {successCount > 0 && `✓ ${successCount} registros actualizados.`}
                    </p>
                    <div className="flex space-x-2">
                        <Button variant="secondary" onClick={onClose}>Omitir por ahora</Button>
                        <Button 
                            onClick={handleSaveAll} 
                            disabled={isSaving || !allCompleted}
                            leftIcon={successCount === notes.length ? <CheckIcon /> : undefined}
                        >
                            {isSaving ? 'Guardando...' : 'Finalizar y Guardar'}
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="p-6">
                <div className="bg-blue-50 p-4 rounded-lg flex items-start mb-6 border border-blue-100">
                    <InformationCircleIcon className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-blue-900 uppercase text-sm tracking-tight">Información Requerida por la DGII</h4>
                        <p className="text-sm text-blue-800 mt-1">
                            Toda Nota de Crédito (B04) debe tener asociado el NCF de la factura que está afectando. Por favor, complete los campos a continuación para que su reporte 607 sea válido.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-[10px] font-black text-secondary-500 uppercase">Detalle de la Nota</th>
                                <th className="px-4 py-2 text-left text-[10px] font-black text-primary-700 uppercase bg-primary-50">NCF que Modifica (REQUERIDO)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-100">
                            {notes.map(note => (
                                <tr key={note.id} className="hover:bg-secondary-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            <span className="font-mono font-bold text-secondary-800 mr-2">{note.ncf}</span>
                                            <span className="bg-purple-100 text-purple-700 text-[9px] px-1 rounded font-black">N.C.</span>
                                        </div>
                                        <p className="text-xs text-secondary-500 mt-1">{note.clienteNombre}</p>
                                        <p className="text-[10px] text-secondary-400">{new Date(note.fecha).toLocaleDateString('es-DO')} • {formatCurrency(note.montoTotal)}</p>
                                    </td>
                                    <td className="px-4 py-3 bg-primary-50/20">
                                        <input 
                                            type="text"
                                            value={localNotes[note.id] || ''}
                                            onChange={(e) => handleInputChange(note.id, e.target.value)}
                                            placeholder="B0100000..."
                                            className={`w-full px-3 py-2 border rounded-md font-mono text-sm shadow-sm focus:ring-2 focus:ring-primary ${!localNotes[note.id] ? 'border-red-300 bg-red-50/30' : 'border-primary-300'}`}
                                            autoFocus={notes.indexOf(note) === 0}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};

export default IncompleteNotesModal;