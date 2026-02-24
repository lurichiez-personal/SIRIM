import React, { useState, useRef, useEffect } from 'react';
import { NCFSequence, NCFType, isNcfNotaCredito } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

interface NCFSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sequenceData: Omit<NCFSequence, 'id' | 'empresaId' | 'secuenciaActual' | 'activa' | 'alertaActiva'>) => void;
}

const NCFSequenceModal: React.FC<NCFSequenceModalProps> = ({ isOpen, onClose, onSave }) => {
    const [tipo, setTipo] = useState<NCFType>(NCFType.B01);
    const [prefijo, setPrefijo] = useState('B01');
    const [secuenciaDesde, setSecuenciaDesde] = useState('');
    const [secuenciaHasta, setSecuenciaHasta] = useState('');
    const [fechaSolicitud, setFechaSolicitud] = useState(new Date().toISOString().split('T')[0]);
    const [fechaVencimiento, setFechaVencimiento] = useState('');
    const [numeroSolicitud, setNumeroSolicitud] = useState('');
    const [errors, setErrors] = useState<any>({});
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const isNota = isNcfNotaCredito(tipo);

    // Efecto para calcular fecha de vencimiento por default al 31/12 del año de solicitud
    useEffect(() => {
        if (fechaSolicitud) {
            const year = new Date(fechaSolicitud + 'T00:00:00').getFullYear();
            setFechaVencimiento(`${year}-12-31`);
        }
    }, [fechaSolicitud]);

    const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTipo = e.target.value as NCFType;
        setTipo(newTipo);
        setPrefijo(newTipo.split(' - ')[0]);
    };

    const validate = () => {
        const newErrors: any = {};
        if (!tipo) newErrors.tipo = "Debe seleccionar un tipo de NCF.";
        
        const desdeNum = Number(secuenciaDesde);
        const hastaNum = Number(secuenciaHasta);

        if (desdeNum <= 0) newErrors.secuenciaDesde = "Debe ser mayor a 0.";
        if (hastaNum <= desdeNum) newErrors.secuenciaHasta = "Debe ser mayor que la secuencia inicial.";
        
        if (!fechaSolicitud) newErrors.fechaSolicitud = "La fecha de solicitud es obligatoria.";
        
        if (!isNota && !fechaVencimiento) {
            newErrors.fechaVencimiento = "La fecha de vencimiento es obligatoria.";
        }
        
        if (!numeroSolicitud.trim()) newErrors.numeroSolicitud = "El número de solicitud/autorización es obligatorio.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        onSave({
            tipo,
            prefijo,
            secuenciaDesde: parseInt(secuenciaDesde),
            secuenciaHasta: parseInt(secuenciaHasta),
            fechaSolicitud,
            // Para Notas de Crédito, enviamos una fecha remota para evitar bloqueos
            fechaVencimiento: isNota ? '9999-12-31' : fechaVencimiento,
            numeroSolicitud
        });
        onClose();
        resetForm();
    };
    
    const resetForm = () => {
        setTipo(NCFType.B01);
        setPrefijo('B01');
        setSecuenciaDesde('');
        setSecuenciaHasta('');
        setFechaSolicitud(new Date().toISOString().split('T')[0]);
        setFechaVencimiento('');
        setNumeroSolicitud('');
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const renderInput = (label: string, id: string, type: string, value: string, onChange: (value: string) => void, error?: string, readOnly = false, onBlur?: () => void) => (
         <div>
            <label htmlFor={id} className="block text-sm font-medium text-secondary-700">{label}</label>
            <input
                type={type}
                id={id}
                value={value}
                readOnly={readOnly}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${readOnly ? 'bg-secondary-100' : ''}`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Añadir Nueva Secuencia NCF"
            size="2xl"
        >
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="tipo" className="block text-sm font-medium text-secondary-700">Tipo de Comprobante *</label>
                        <select
                            id="tipo"
                            value={tipo}
                            onChange={handleTipoChange}
                            className={`mt-1 block w-full px-3 py-2 border ${errors.tipo ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                        >
                            {Object.values(NCFType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {errors.tipo && <p className="mt-1 text-sm text-red-600">{errors.tipo}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput('Número de Solicitud/Autorización *', 'numeroSolicitud', 'text', numeroSolicitud, setNumeroSolicitud, errors.numeroSolicitud)}
                        {renderInput('Prefijo', 'prefijo', 'text', prefijo, () => {}, undefined, true)}
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput('Fecha de Solicitud *', 'fechaSolicitud', 'date', fechaSolicitud, setFechaSolicitud, errors.fechaSolicitud)}
                        {!isNota ? (
                            renderInput('Fecha de Vencimiento *', 'fechaVencimiento', 'date', fechaVencimiento, setFechaVencimiento, errors.fechaVencimiento)
                        ) : (
                            <div className="flex flex-col justify-center">
                                <span className="text-xs font-bold text-secondary-500 uppercase">Vigencia</span>
                                <span className="text-sm font-semibold text-green-600">No aplica para Notas de Crédito</span>
                            </div>
                        )}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput('Secuencia Desde *', 'secuenciaDesde', 'text', secuenciaDesde, setSecuenciaDesde, errors.secuenciaDesde, false, () => setSecuenciaDesde(String(Number(secuenciaDesde))))}
                        {renderInput('Secuencia Hasta *', 'secuenciaHasta', 'text', secuenciaHasta, setSecuenciaHasta, errors.secuenciaHasta, false, () => setSecuenciaHasta(String(Number(secuenciaHasta))))}
                    </div>
                </div>
                 <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit">Guardar Secuencia</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NCFSequenceModal;