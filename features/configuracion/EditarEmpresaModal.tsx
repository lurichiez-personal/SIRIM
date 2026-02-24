
import React, { useState, useEffect, useRef } from 'react';
import { Empresa, CierreFiscal, CierreFiscalOptions } from '../../types.ts';
import Modal from '../../components/ui/Modal.tsx';
import Button from '../../components/ui/Button.tsx';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate.ts';
import { useDataStore } from '../../stores/useDataStore.ts';

interface EditarEmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Empresa) => Promise<void>;
  empresaParaEditar: Empresa | null;
}

const EditarEmpresaModal: React.FC<EditarEmpresaModalProps> = ({ isOpen, onClose, onSave, empresaParaEditar }) => {
    const { calculateIngresosBrutosForPreviousFiscalYear } = useDataStore();
    const [nombre, setNombre] = useState('');
    const [rnc, setRnc] = useState('');
    const [cierreFiscal, setCierreFiscal] = useState<CierreFiscal>('31-diciembre');
    const [impuestoLiquidadoAnterior, setImpuestoLiquidadoAnterior] = useState('');
    const [ingresosBrutosAnterior, setIngresosBrutosAnterior] = useState('');
    const [capitalSocialInicial, setCapitalSocialInicial] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen && empresaParaEditar) {
            setNombre(empresaParaEditar.nombre);
            setRnc(empresaParaEditar.rnc);
            setCierreFiscal(empresaParaEditar.cierreFiscal || '31-diciembre');
            setImpuestoLiquidadoAnterior(String(empresaParaEditar.impuestoLiquidadoAnterior || ''));
            setCapitalSocialInicial(empresaParaEditar.capitalSocialInicial ? String(empresaParaEditar.capitalSocialInicial) : '');
            
            // Auto-calculate previous gross income if not already set by the user
            if (!empresaParaEditar.ingresosBrutosAnterior || empresaParaEditar.ingresosBrutosAnterior === 0) {
                const calculatedIngresos = calculateIngresosBrutosForPreviousFiscalYear();
                setIngresosBrutosAnterior(calculatedIngresos > 0 ? calculatedIngresos.toFixed(2) : '');
            } else {
                setIngresosBrutosAnterior(String(empresaParaEditar.ingresosBrutosAnterior || ''));
            }
        }
    }, [isOpen, empresaParaEditar, calculateIngresosBrutosForPreviousFiscalYear]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim() || !rnc.trim()) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        if (!empresaParaEditar) return;

        setIsLoading(true);
        await onSave({ 
            ...empresaParaEditar, 
            nombre, 
            rnc, 
            cierreFiscal, 
            capitalSocialInicial: parseFloat(capitalSocialInicial) || 0,
            impuestoLiquidadoAnterior: parseFloat(impuestoLiquidadoAnterior) || 0,
            ingresosBrutosAnterior: parseFloat(ingresosBrutosAnterior) || 0
        });
        setIsLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Empresa">
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                     <div>
                        <label htmlFor="edit-nombre-empresa" className="block text-sm font-medium">Nombre de la Empresa *</label>
                        <input type="text" id="edit-nombre-empresa" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="edit-rnc-empresa" className="block text-sm font-medium">RNC *</label>
                        <input type="text" id="edit-rnc-empresa" value={rnc} onChange={e => setRnc(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="edit-capital-social" className="block text-sm font-medium text-green-700">Capital Suscrito y Pagado</label>
                        <input 
                            type="number" 
                            id="edit-capital-social" 
                            value={capitalSocialInicial} 
                            onChange={e => setCapitalSocialInicial(e.target.value)} 
                            className="mt-1 w-full border-green-300 rounded-md focus:ring-green-500 focus:border-green-500" 
                            placeholder="0.00"
                            step="0.01"
                        />
                        <p className="text-xs text-secondary-500 mt-1">Si actualiza este valor, el sistema verificará y creará el asiento de apertura si no existe.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-cierre-fiscal" className="block text-sm font-medium">Cierre Fiscal *</label>
                            <select id="edit-cierre-fiscal" value={cierreFiscal} onChange={e => setCierreFiscal(e.target.value as CierreFiscal)} required className="mt-1 w-full border-secondary-300 rounded-md">
                                {Object.entries(CierreFiscalOptions).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="edit-ingresos-brutos" className="block text-sm font-medium">Ingresos Brutos (IR-2) Anterior</label>
                            <input type="number" id="edit-ingresos-brutos" value={ingresosBrutosAnterior} onChange={e => setIngresosBrutosAnterior(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" placeholder="0.00" step="0.01"/>
                            <p className="text-xs text-secondary-500 mt-1">Sugerencia calculada desde SIRIM. Ajuste al valor de su declaración IR-2.</p>
                        </div>
                        <div>
                            <label htmlFor="edit-impuesto-liquidado" className="block text-sm font-medium">Impuesto Liquidado (IR-2) Anterior</label>
                            <input type="number" id="edit-impuesto-liquidado" value={impuestoLiquidadoAnterior} onChange={e => setImpuestoLiquidadoAnterior(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" placeholder="0.00" step="0.01"/>
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Actualizar Empresa'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default EditarEmpresaModal;
