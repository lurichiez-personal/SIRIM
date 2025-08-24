import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Factura, CodigoModificacionNCF } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

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
  }) => void;
  facturasDisponibles: Factura[];
  facturaAfectadaInicial?: Factura | null;
}

const ITBIS_RATE = 0.18;

const NuevaNotaModal: React.FC<NuevaNotaModalProps> = ({ isOpen, onClose, onSave, facturasDisponibles, facturaAfectadaInicial }) => {
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
    const [isc, setIsc] = useState(0);
    const [propinaLegal, setPropinaLegal] = useState(0);
    
    const [errors, setErrors] = useState<{ factura?: string; fecha?: string; descripcion?: string }>({});

    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const isEditable = useMemo(() => codigoModificacion !== '01', [codigoModificacion]);

    const handleSelectFactura = (factura: Factura) => {
        setFacturaAfectada(factura);
        setSearchTerm('');
        
        // Populate amounts from selected invoice
        setSubtotal(factura.subtotal - (factura.montoDescuento || 0));
        setAplicaITBIS(factura.aplicaITBIS);
        setAplicaISC(factura.aplicaISC || false);
        setIsc(factura.isc || 0);
        setAplicaPropina(factura.aplicaPropina || false);
        setPropinaLegal(factura.propinaLegal || 0);

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
        if (facturaAfectada && !isEditable) {
            // If it's an annulment, lock values to the original invoice
            setSubtotal(facturaAfectada.subtotal - (facturaAfectada.montoDescuento || 0));
            setAplicaITBIS(facturaAfectada.aplicaITBIS);
            setAplicaISC(facturaAfectada.aplicaISC || false);
            setIsc(facturaAfectada.isc || 0);
            setAplicaPropina(facturaAfectada.aplicaPropina || false);
            setPropinaLegal(facturaAfectada.propinaLegal || 0);
        }
    }, [facturaAfectada, isEditable]);

    const totals = useMemo(() => {
        const currentISC = aplicaISC ? (isc || 0) : 0;
        const currentPropina = aplicaPropina ? (propinaLegal || 0) : 0;
        const baseParaITBIS = subtotal + currentISC;
        const itbis = aplicaITBIS ? baseParaITBIS * ITBIS_RATE : 0;
        const montoTotal = baseParaITBIS + itbis + currentPropina;
        return { itbis, montoTotal };
    }, [subtotal, aplicaITBIS, aplicaISC, isc, aplicaPropina, propinaLegal]);


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
            isc: aplicaISC ? isc || 0 : 0,
            itbis: totals.itbis,
            propinaLegal: aplicaPropina ? propinaLegal || 0 : 0,
            montoTotal: totals.montoTotal,
            aplicaITBIS,
            aplicaISC,
            aplicaPropina,
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
        setIsc(0);
        setPropinaLegal(0);
        setAplicaITBIS(true);
        setAplicaISC(false);
        setAplicaPropina(false);
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
                        <ToggleSwitch checked={aplicaITBIS} onChange={setAplicaITBIS} label="Aplica ITBIS" disabled={!isEditable}/>
                        <ToggleSwitch checked={aplicaISC} onChange={setAplicaISC} label="Aplica ISC" disabled={!isEditable}/>
                        <ToggleSwitch checked={aplicaPropina} onChange={setAplicaPropina} label="Aplica Propina" disabled={!isEditable}/>
                    </div>
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <label htmlFor="subtotal-nota" className="font-medium text-secondary-600">Subtotal:</label>
                             <input type="number" id="subtotal-nota" value={subtotal} onChange={e => setSubtotal(parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border border-secondary-300 rounded-md shadow-sm sm:text-sm text-right disabled:bg-secondary-100" disabled={!isEditable}/>
                        </div>
                        {aplicaISC && (
                            <div className="flex justify-between items-center text-sm">
                                <label htmlFor="isc-nota" className="font-medium text-secondary-600">ISC:</label>
                                 <input type="number" id="isc-nota" value={isc} onChange={e => setIsc(parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border border-secondary-300 rounded-md shadow-sm sm:text-sm text-right disabled:bg-secondary-100" disabled={!isEditable}/>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-secondary-600">ITBIS ({ITBIS_RATE * 100}%):</span>
                            <span className="text-secondary-800">{formatCurrency(totals.itbis)}</span>
                        </div>
                        {aplicaPropina && (
                            <div className="flex justify-between items-center text-sm">
                                <label htmlFor="propina-nota" className="font-medium text-secondary-600">Propina Legal:</label>
                                 <input type="number" id="propina-nota" value={propinaLegal} onChange={e => setPropinaLegal(parseFloat(e.target.value) || 0)} className="w-28 px-2 py-1 border border-secondary-300 rounded-md shadow-sm sm:text-sm text-right disabled:bg-secondary-100" disabled={!isEditable} />
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