import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Ingreso, Factura, MetodoPago } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

interface NuevoPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pagoData: Omit<Ingreso, 'id' | 'empresaId'>) => void;
  facturasDisponibles: Factura[];
}

const NuevoPagoModal: React.FC<NuevoPagoModalProps> = ({ isOpen, onClose, onSave, facturasDisponibles }) => {
    const [facturaId, setFacturaId] = useState<number | null>(null);
    const [monto, setMonto] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago['01-EFECTIVO']);
    const [notas, setNotas] = useState('');
    const [errors, setErrors] = useState<any>({});
    
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const selectedFactura = useMemo(() => {
        return facturasDisponibles.find(f => f.id === facturaId) || null;
    }, [facturaId, facturasDisponibles]);

    useEffect(() => {
        if (!isOpen) {
            resetForm();
            return;
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedFactura) {
            const balancePendiente = selectedFactura.montoTotal - selectedFactura.montoPagado;
            setMonto(balancePendiente.toFixed(2));
        }
    }, [selectedFactura]);

    const validate = () => {
        const newErrors: any = {};
        if (!facturaId) newErrors.factura = "Debe seleccionar una factura.";
        if (parseFloat(monto) <= 0) newErrors.monto = "El monto debe ser mayor a cero.";
        if (selectedFactura && parseFloat(monto) > (selectedFactura.montoTotal - selectedFactura.montoPagado)) {
            newErrors.monto = "El monto no puede ser mayor al balance pendiente.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        onSave({
            facturaId: facturaId!,
            clienteId: selectedFactura!.clienteId,
            clienteNombre: selectedFactura!.clienteNombre,
            monto: parseFloat(monto),
            fecha,
            metodoPago,
            notas,
        });
        onClose();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const resetForm = () => {
        setFacturaId(null);
        setMonto('');
        setFecha(new Date().toISOString().split('T')[0]);
        setMetodoPago(MetodoPago['01-EFECTIVO']);
        setNotas('');
        setErrors({});
    };
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Nuevo Pago">
          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="factura" className="block text-sm font-medium text-secondary-700">Factura a Pagar *</label>
                    <select id="factura" value={facturaId || ''} onChange={e => setFacturaId(Number(e.target.value))} className={`mt-1 block w-full border ${errors.factura ? 'border-red-500' : 'border-secondary-300'} rounded-md`}>
                        <option value="">Seleccione una factura...</option>
                        {facturasDisponibles.map(f => (
                            <option key={f.id} value={f.id}>{f.ncf} - {f.clienteNombre} (Pendiente: {(f.montoTotal - f.montoPagado).toFixed(2)})</option>
                        ))}
                    </select>
                    {errors.factura && <p className="text-sm text-red-600">{errors.factura}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="fecha-pago" className="block text-sm font-medium text-secondary-700">Fecha del Pago</label>
                        <input type="date" id="fecha-pago" value={fecha} onChange={e => setFecha(e.target.value)} className="mt-1 block w-full border border-secondary-300 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="monto-pago" className="block text-sm font-medium text-secondary-700">Monto *</label>
                        <input type="number" id="monto-pago" value={monto} onChange={e => setMonto(e.target.value)} className={`mt-1 block w-full border ${errors.monto ? 'border-red-500' : 'border-secondary-300'} rounded-md`} />
                        {errors.monto && <p className="text-sm text-red-600">{errors.monto}</p>}
                    </div>
                </div>
                 <div>
                    <label htmlFor="metodo-pago" className="block text-sm font-medium text-secondary-700">Método de Pago</label>
                    <select id="metodo-pago" value={metodoPago} onChange={e => setMetodoPago(e.target.value as MetodoPago)} className="mt-1 block w-full border border-secondary-300 rounded-md">
                       {Object.values(MetodoPago).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="notas-pago" className="block text-sm font-medium text-secondary-700">Notas</label>
                    <textarea id="notas-pago" value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="mt-1 block w-full border border-secondary-300 rounded-md" />
                </div>
            </div>
             <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button type="submit">Guardar Pago</Button>
            </div>
          </form>
        </Modal>
    );
};

export default NuevoPagoModal;