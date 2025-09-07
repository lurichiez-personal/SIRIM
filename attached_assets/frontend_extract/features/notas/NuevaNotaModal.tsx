

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Factura, CodigoModificacionNCF } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import { useTenantStore } from '../../stores/useTenantStore';
import { useRatesStore } from '../../stores/useRatesStore';

interface NuevaNotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    facturaAfectada: Factura;
    codigoModificacion: keyof typeof CodigoModificacionNCF;
    fecha: string;
    descripcion: string;
    subtotal: number;
    itbis: number;
    isc: number;
    propinaLegal: number;
    montoTotal: number;
    aplicaITBIS: boolean;
    aplicaISC: boolean;
    aplicaPropina: boolean;
    descuentoPorcentaje?: number;
    montoDescuento?: number;
  }) => void;
  facturasDisponibles: Factura[];
  facturaAfectadaInicial?: Factura | null;
}

const NuevaNotaModal: React.FC<NuevaNotaModalProps> = ({ isOpen, onClose, onSave, facturasDisponibles, facturaAfectadaInicial }) => {
    const { selectedTenant } = useTenantStore();
    const { getRatesForTenant } = useRatesStore();
    const rates = useMemo(() => selectedTenant ? getRatesForTenant(selectedTenant.id) : { itbis: 0.18, isc: 0.16, propina: 0.10 }, [selectedTenant, getRatesForTenant]);

    const [facturaAfectada, setFacturaAfectada] = useState<Factura | null>(null);
    const [codigoModificacion, setCodigoModificacion] = useState<keyof typeof CodigoModificacionNCF>('01');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [descripcion, setDescripcion] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Amounts state
    const [subtotal, setSubtotal] = useState(0);
    const [aplicaITBIS, setAplicaITBIS] = useState(true);
    const [aplicaISC, setAplicaISC] = useState(false);
    const [aplicaPropina, setAplicaPropina] = useState(false);
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
    
    const [errors, setErrors] = useState<{ factura?: string; fecha?: string; descripcion?: string }>({});

    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const isEditable = useMemo(() => codigoModificacion !== '01', [codigoModificacion]);

    const handleSelectFactura = (factura: Factura) => {
        setFacturaAfectada(factura);
        setSearchTerm('');
        
        setSubtotal(factura.subtotal - (factura.montoDescuento || 0));
        setAplicaITBIS(factura.aplicaITBIS);
        setAplicaISC(factura.aplicaISC || false);
        setAplicaPropina(factura.aplicaPropina || false);

        if (codigoModificacion === '01') {
            setDescripcion(`Anulación de factura ${factura.ncf}`);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            resetForm();
            return;
        }
        if (facturaAfectadaInicial) {
            handleSelectFactura(facturaAfectadaInicial);
        }
    }, [isOpen, facturaAfectadaInicial]);


    useEffect(() => {
        if (facturaAfectada && codigoModificacion === '03') {
            const originalSubtotal = facturaAfectada.subtotal - (facturaAfectada.montoDescuento || 0);
            const newSubtotalForNota = originalSubtotal * (descuentoPorcentaje / 100);
            setSubtotal(newSubtotalForNota);
        } else {
            setDescuentoPorcentaje(0);
            if(facturaAfectada && codigoModificacion !== '01') {
                setSubtotal(facturaAfectada.subtotal - (facturaAfectada.montoDescuento || 0));
            }
        }
    }, [facturaAfectada, codigoModificacion, descuentoPorcentaje]);

    useEffect(() => {
        if (facturaAfectada && codigoModificacion === '01') { // Is anullment
            setSubtotal(facturaAfectada.subtotal - (facturaAfectada.montoDescuento || 0));
            setAplicaITBIS(facturaAfectada.aplicaITBIS);
            setAplicaISC(facturaAfectada.aplicaISC || false);
            setAplicaPropina(facturaAfectada.aplicaPropina || false);
        }
    }, [facturaAfectada, codigoModificacion]);


    const totals = useMemo(() => {
        const itbis = aplicaITBIS ? subtotal * rates.itbis : 0;
        const isc = aplicaISC ? subtotal * rates.isc : 0;
        const propinaLegal = aplicaPropina ? subtotal * rates.propina : 0;
        const montoTotal = subtotal + itbis + isc + propinaLegal;
        return { itbis, isc, propinaLegal, montoTotal };
    }, [subtotal, aplicaITBIS, aplicaISC, aplicaPropina, rates]);


    const filteredFacturas = useMemo(() => {
        if (!searchTerm) return [];
        return facturasDisponibles.filter(f => 
            f.ncf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5); // Limit results for performance
    }, [searchTerm, facturasDisponibles]);

    const validate = () => {
        const newErrors: { factura?: string; fecha?: string; descripcion?: string } = {};
        if (!facturaAfectada) newErrors.factura = "Debe seleccionar una factura a afectar.";
        if (!fecha) newErrors.fecha = "La fecha es obligatoria.";
        if (!descripcion.trim()) newErrors.descripcion = "La descripción es obligatoria.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        onSave({
            facturaAfectada: facturaAfectada!,
            codigoModificacion,
            fecha,
            descripcion,
            subtotal,
            isc: totals.isc,
            itbis: totals.itbis,
            propinaLegal: totals.propinaLegal,
            montoTotal: totals.montoTotal,
            aplicaITBIS,
            aplicaISC,
            aplicaPropina,
            descuentoPorcentaje: codigoModificacion === '03' ? descuentoPorcentaje : undefined,
            montoDescuento: codigoModificacion === '03' ? (facturaAfectada!.subtotal * (descuentoPorcentaje / 100)) : undefined,
        });
        onClose();
    };
    
    const resetForm = () => {
        setFacturaAfectada(null);
        setCodigoModificacion('01');
        setFecha(new Date().toISOString().split('T')[0]);
        setDescripcion('');
        setSearchTerm('');
        setSubtotal(0);
        setAplicaITBIS(true);
        setAplicaISC(false);
        setAplicaPropina(false);
        setDescuentoPorcentaje(0);
        setErrors({});
    };
    
    const handleClose = () => {
        resetForm();
        onClose();
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Emitir Nueva Nota de Crédito"
        >
          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="p-6 space-y-4">
                {/* Search for Invoice */}
                {!facturaAfectada && (
                    <div>
                        <label htmlFor="searchFactura" className="block text-sm font-medium text-secondary-700">Buscar Factura Afectada *</label>
                        <div className="relative">
                            <input
                                type="text"
                                id="searchFactura"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`mt-1 block w-full px-3 py-2 border ${errors.factura ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                                placeholder="Buscar por NCF o nombre de cliente..."
                            />
                            {searchTerm && filteredFacturas.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white border border-secondary-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                                    {filteredFacturas.map(f => (
                                        <li key={f.id} onClick={() => handleSelectFactura(f)} className="px-3 py-2 cursor-pointer hover:bg-secondary-100">
                                            <p className="font-semibold">{f.ncf}</p>
                                            <p className="text-sm text-secondary-600">{f.clienteNombre} - {formatCurrency(f.montoTotal)}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {errors.factura && <p className="mt-1 text-sm text-red-600">{errors.factura}</p>}
                    </div>
                )}


                {facturaAfectada && (
                    <div className="p-3 bg-primary-50 rounded-md border border-primary-200 space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-primary-800">Factura Seleccionada</h4>
                            {!facturaAfectadaInicial && <Button type="button" variant="secondary" onClick={() => { setFacturaAfectada(null); resetForm(); }}>Cambiar</Button>}
                        </div>
                        <p className="text-sm"><span className="font-semibold text-secondary-700">NCF:</span> {facturaAfectada.ncf}</p>
                        <p className="text-sm"><span className="font-semibold text-secondary-700">Cliente:</span> {facturaAfectada.clienteNombre}</p>
                        <p className="text-sm"><span className="font-semibold text-secondary-700">Monto Original:</span> {formatCurrency(facturaAfectada.montoTotal)}</p>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="fecha" className="block text-sm font-medium text-secondary-700">Fecha de Emisión *</label>
                        <input type="date" id="fecha" value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 block w-full px-3 py-2 border ${errors.fecha ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm`} />
                        {errors.fecha && <p className="mt-1 text-sm text-red-600">{errors.fecha}</p>}
                    </div>
                    <div>
                        <label htmlFor="codigoModificacion" className="block text-sm font-medium text-secondary-700">Motivo (Código DGII) *</label>
                        <select
                            id="codigoModificacion"
                            value={codigoModificacion}
                            onChange={e => setCodigoModificacion(e.target.value as keyof typeof CodigoModificacionNCF)}
                            className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                           {Object.entries(CodigoModificacionNCF).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                           ))}
                        </select>
                    </div>
                </div>
                
                {codigoModificacion === '03' && facturaAfectada && (
                    <div>
                        <label htmlFor="descuentoPorcentaje" className="block text-sm font-medium text-secondary-700">Porcentaje de Descuento (%)</label>
                        <input
                            type="number"
                            id="descuentoPorcentaje"
                            value={descuentoPorcentaje}
                            onChange={e => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="Ej: 10"
                        />
                    </div>
                )}
                
                <div>
                    <label htmlFor="descripcion" className="block text-sm font-medium text-secondary-700">Descripción *</label>
                    <textarea 
                        id="descripcion" 
                        rows={2}
                        value={descripcion} 
                        onChange={e => setDescripcion(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border ${errors.descripcion ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm`}
                        placeholder="Escriba una breve descripción del motivo de la nota."
                    />
                    {errors.descripcion && <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>}
                </div>

                {/* Totals */}
                <div className="flex justify-between pt-4 border-t">
                     <div className="space-y-3">
                        <ToggleSwitch id="toggle-itbis-nota" checked={aplicaITBIS} onChange={setAplicaITBIS} label="Aplica ITBIS" disabled={!isEditable}/>
                        <ToggleSwitch id="toggle-isc-nota" checked={aplicaISC} onChange={setAplicaISC} label="Aplica ISC" disabled={!isEditable}/>
                        <ToggleSwitch id="toggle-propina-nota" checked={aplicaPropina} onChange={setAplicaPropina} label="Aplica Propina" disabled={!isEditable}/>
                    </div>
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <label htmlFor="subtotal-nota" className="font-medium text-secondary-600">Subtotal:</label>
                             <input type="number" id="subtotal-nota" value={subtotal} onChange={e => setSubtotal(parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border border-secondary-300 rounded-md shadow-sm sm:text-sm text-right disabled:bg-secondary-100" disabled={!isEditable || codigoModificacion === '03'}/>
                        </div>
                        {aplicaISC && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-secondary-600">ISC ({rates.isc * 100}%):</span>
                                <span className="font-medium text-secondary-800">{formatCurrency(totals.isc)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-secondary-600">ITBIS ({rates.itbis * 100}%):</span>
                            <span className="text-secondary-800">{formatCurrency(totals.itbis)}</span>
                        </div>
                        {aplicaPropina && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-secondary-600">Propina Legal ({rates.propina * 100}%):</span>
                                <span className="font-medium text-secondary-800">{formatCurrency(totals.propinaLegal)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                            <span className="text-secondary-800">Total Nota:</span>
                            <span className="text-primary">{formatCurrency(totals.montoTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>
             <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={!facturaAfectada}>Emitir Nota</Button>
            </div>
          </form>
        </Modal>
    );
};

export default NuevaNotaModal;