
import React, { useState, useEffect } from 'react';
import { Gasto, Nomina, CierreITBIS } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';

type PayableItem = Gasto | Nomina | CierreITBIS;
type PayableType = 'gasto' | 'nomina' | 'itbis';

interface RegistrarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fechaPago: string) => Promise<void>;
  itemToPay: { item: PayableItem; type: PayableType } | null;
}

const RegistrarPagoModal: React.FC<RegistrarPagoModalProps> = ({ isOpen, onClose, onSave, itemToPay }) => {
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFechaPago(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSave(fechaPago);
        setIsLoading(false);
        onClose();
    };

    if (!itemToPay) return null;

    const { item, type } = itemToPay;
    let title = 'Registrar Pago';
    let beneficiary = '';
    let amount = 0;

    if (type === 'gasto') {
        const gasto = item as Gasto;
        title = `Pagar Gasto a ${gasto.proveedorNombre}`;
        beneficiary = gasto.proveedorNombre || 'N/A';
        amount = gasto.monto;
    } else if (type === 'nomina') {
        const nomina = item as Nomina;
        title = `Pagar Nómina del Período ${nomina.periodo}`;
        beneficiary = 'Empleados';
        amount = nomina.totalPagado;
    } else if (type === 'itbis') {
        const itbis = item as CierreITBIS;
        title = `Pagar ITBIS del Período ${itbis.periodo}`;
        beneficiary = 'DGII';
        amount = itbis.itbisAPagar;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div className="p-4 bg-secondary-50 rounded-md">
                        <p className="text-sm">Beneficiario: <span className="font-semibold">{beneficiary}</span></p>
                        <p className="text-lg">Monto a Pagar: <span className="font-bold text-primary">{formatCurrency(amount)}</span></p>
                    </div>
                    <div>
                        <label htmlFor="fecha-pago-modal" className="block text-sm font-medium text-secondary-700">Fecha de Pago</label>
                        <input
                            type="date"
                            id="fecha-pago-modal"
                            value={fechaPago}
                            onChange={e => setFechaPago(e.target.value)}
                            required
                            className="mt-1 w-full border-secondary-300 rounded-md"
                        />
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Confirmar Pago'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default RegistrarPagoModal;
