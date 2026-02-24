
import React, { useState, useRef } from 'react';
import { Empresa, CierreFiscal, CierreFiscalOptions } from '../../types.ts';
import Modal from '../../components/ui/Modal.tsx';
import Button from '../../components/ui/Button.tsx';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate.ts';

interface NuevaEmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Empresa, 'id' | 'createdAt' | 'trialEndsAt' | 'logoUrl' | 'accentColor' | 'footerText' >) => Promise<void>;
}

const NuevaEmpresaModal: React.FC<NuevaEmpresaModalProps> = ({ isOpen, onClose, onSave }) => {
    const [nombre, setNombre] = useState('');
    const [rnc, setRnc] = useState('');
    const [capitalSocialInicial, setCapitalSocialInicial] = useState('');
    const [cierreFiscal, setCierreFiscal] = useState<CierreFiscal>('31-diciembre');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim() || !rnc.trim()) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        
        const capital = parseFloat(capitalSocialInicial);
        if (isNaN(capital) || capital <= 0) {
            setError('El Capital Social debe ser un monto válido mayor a 0.');
            return;
        }

        setIsLoading(true);
        await onSave({ 
            nombre, 
            rnc, 
            cierreFiscal,
            capitalSocialInicial: capital 
        });
        setIsLoading(false);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setNombre(''); setRnc(''); setError(''); setCierreFiscal('31-diciembre'); setCapitalSocialInicial('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nueva Empresa">
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                     <div>
                        <label htmlFor="nombre-empresa" className="block text-sm font-medium">Nombre de la Empresa *</label>
                        <input type="text" id="nombre-empresa" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="rnc-empresa" className="block text-sm font-medium">RNC *</label>
                        <input type="text" id="rnc-empresa" value={rnc} onChange={e => setRnc(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="capital-social" className="block text-sm font-medium text-green-700">Capital Suscrito y Pagado *</label>
                        <input 
                            type="number" 
                            id="capital-social" 
                            value={capitalSocialInicial} 
                            onChange={e => setCapitalSocialInicial(e.target.value)} 
                            required 
                            className="mt-1 w-full border-green-300 rounded-md focus:ring-green-500 focus:border-green-500" 
                            placeholder="0.00"
                            step="0.01"
                        />
                        <p className="text-xs text-secondary-500 mt-1">Este monto generará el Asiento de Apertura automáticamente (Débito a Bancos / Crédito a Capital Social).</p>
                    </div>
                    <div>
                        <label htmlFor="cierre-fiscal" className="block text-sm font-medium">Cierre Fiscal *</label>
                        <select id="cierre-fiscal" value={cierreFiscal} onChange={e => setCierreFiscal(e.target.value as CierreFiscal)} required className="mt-1 w-full border-secondary-300 rounded-md">
                            {Object.entries(CierreFiscalOptions).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                            ))}
                        </select>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar Empresa'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NuevaEmpresaModal;
