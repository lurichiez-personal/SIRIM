import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';

interface Cuota {
    numero: number;
    fechaLimite: string;
    monto: number;
    estado: string;
}

interface MarcarPagoAnticipoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fechaPago: string, montoPagado: number) => void;
  cuota: Cuota | null;
}

const MarcarPagoAnticipoModal: React.FC<MarcarPagoAnticipoModalProps> = ({ isOpen, onClose, onSave, cuota }) => {
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
    const [montoPagado, setMontoPagado] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && cuota) {
            setFechaPago(new Date().toISOString().split('T')[0]);
            setMontoPagado(cuota.monto.toString());
        }
    }, [isOpen, cuota]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSave(fechaPago, parseFloat(montoPagado));
        setIsLoading(false);
        onClose();
    };

    if (!cuota) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Pago - Cuota #${cuota.numero}`}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <p>Está registrando el pago para la cuota de anticipo con fecha límite el <strong>{new Date(cuota.fechaLimite + 'T00:00:00').toLocaleDateString('es-DO')}</strong>.</p>
                    <div>
                        <label htmlFor="monto-pagado" className="block text-sm font-medium">Monto Pagado</label>
                        <input
                            type="number"
                            id="monto-pagado"
                            value={montoPagado}
                            onChange={(e) => setMontoPagado(e.target.value)}
                            required
                            className="mt-1 w-full border-secondary-300 rounded-md"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label htmlFor="fecha-pago" className="block text-sm font-medium">Fecha de Pago</label>
                        <input
                            type="date"
                            id="fecha-pago"
                            value={fechaPago}
                            onChange={(e) => setFechaPago(e.target.value)}
                            required
                            className="mt-1 w-full border-secondary-300 rounded-md"
                        />
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar Pago'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default MarcarPagoAnticipoModal;