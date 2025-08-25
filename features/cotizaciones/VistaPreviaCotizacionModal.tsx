
import React, { useState } from 'react';
import { Cotizacion } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import Comments from '../../components/ui/Comments';
import AuditTrail from '../../components/ui/AuditTrail';

interface VistaPreviaCotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion: Cotizacion | null;
}

const VistaPreviaCotizacionModal: React.FC<VistaPreviaCotizacionModalProps> = ({ isOpen, onClose, cotizacion }) => {
    const { selectedTenant } = useTenantStore();
    const { clientes } = useDataStore();
    const { settings } = useSettingsStore();
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');

    if (!isOpen || !cotizacion) return null;

    const tenantSettings = settings[selectedTenant?.id || 0];
    const accentColor = tenantSettings?.accentColor || '#005A9C';

    const handlePrint = () => { /* ... print logic ... */ };
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const TabButton: React.FC<{tab: 'details' | 'comments' | 'history', label: string}> = ({tab, label}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === tab ? 'border-b-2 text-primary' : 'text-secondary-500 hover:text-secondary-700'}`}
            style={activeTab === tab ? {borderColor: accentColor} : {}}
        >
            {label}
        </button>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vista Previa: Cotización #${cotizacion.id}`} footer={
            <>
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                <Button onClick={handlePrint} style={{ backgroundColor: accentColor }}>Imprimir</Button>
            </>
        }>
             <div className="border-b border-secondary-200 mb-4">
                <nav className="-mb-px flex space-x-4">
                    <TabButton tab="details" label="Detalles" />
                    <TabButton tab="comments" label="Comentarios Internos" />
                    <TabButton tab="history" label="Historial de Cambios" />
                </nav>
            </div>

            {activeTab === 'details' && (
                <div id="quote-preview-content" className="text-secondary-800 animate-fade-in">
                    {/* ... content as before ... */}
                </div>
            )}
             {activeTab === 'comments' && (
                <div className="animate-fade-in">
                    <Comments comments={cotizacion.comments} documentId={cotizacion.id} documentType="cotizacion" />
                </div>
            )}
            {activeTab === 'history' && (
                 <div className="animate-fade-in">
                    <AuditTrail auditLog={cotizacion.auditLog} />
                </div>
            )}
        </Modal>
    );
};

export default VistaPreviaCotizacionModal;
