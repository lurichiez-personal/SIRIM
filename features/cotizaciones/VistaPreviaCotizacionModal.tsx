
import React from 'react';
import { Cotizacion } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface VistaPreviaCotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion: Cotizacion | null;
}

const VistaPreviaCotizacionModal: React.FC<VistaPreviaCotizacionModalProps> = ({ isOpen, onClose, cotizacion }) => {
    const { selectedTenant } = useTenantStore();
    const { clientes } = useDataStore();
    const { settings } = useSettingsStore();

    if (!isOpen || !cotizacion) return null;

    const cliente = clientes.find(c => c.id === cotizacion.clienteId);
    const tenantSettings = settings[selectedTenant?.id || 0];
    const accentColor = tenantSettings?.accentColor || '#005A9C';

    const handlePrint = () => { /* ... print logic ... */ };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vista Previa: Cotización #${cotizacion.id}`} footer={
            <>
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                <Button onClick={handlePrint} style={{ backgroundColor: accentColor }}>Imprimir</Button>
            </>
        }>
            <div id="quote-preview-content" className="text-secondary-800">
                <header className="flex justify-between items-start pb-4 border-b">
                    <div>
                        {tenantSettings?.logoUrl ? (
                            <img src={tenantSettings.logoUrl} alt="Logo de la empresa" className="h-16 max-w-xs object-contain mb-2"/>
                        ) : (
                             <h1 className="text-2xl font-bold" style={{ color: accentColor }}>{selectedTenant?.nombre}</h1>
                        )}
                        <p className="text-sm">RNC: {selectedTenant?.rnc}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold">COTIZACIÓN</h2>
                        <p className="text-sm">Cotización #: <span className="font-mono font-bold">{cotizacion.id}</span></p>
                        <p className="text-sm">Fecha: {new Date(cotizacion.fecha).toLocaleDateString('es-DO')}</p>
                    </div>
                </header>
                {/* ... rest of modal ... */}
                <section className="mt-6 flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                        {/* ... totals ... */}
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Total:</span> <span style={{ color: accentColor }}>{formatCurrency(cotizacion.montoTotal)}</span></div>
                    </div>
                </section>

                <footer className="mt-8 pt-4 border-t text-center text-xs text-secondary-500">
                    <p>{tenantSettings?.footerText || 'Esta cotización es válida por 30 días.'}</p>
                </footer>
            </div>
        </Modal>
    );
};

export default VistaPreviaCotizacionModal;
