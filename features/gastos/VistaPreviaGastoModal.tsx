
import React, { useState } from 'react';
import { Gasto } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useTenantStore } from '../../stores/useTenantStore';
import { LogoIcon } from '../../components/icons/Icons';
import Comments from '../../components/ui/Comments';
import AuditTrail from '../../components/ui/AuditTrail';

interface VistaPreviaGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasto: Gasto | null;
}

const VistaPreviaGastoModal: React.FC<VistaPreviaGastoModalProps> = ({ isOpen, onClose, gasto }) => {
    const { selectedTenant } = useTenantStore();
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');

    if (!isOpen || !gasto) return null;

    const handlePrint = () => { /* ... print logic ... */ };
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const TabButton: React.FC<{tab: 'details' | 'comments' | 'history', label: string}> = ({tab, label}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-secondary-500 hover:text-secondary-700'}`}
        >
            {label}
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Gasto`} footer={
            <>
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                <Button onClick={handlePrint}>Imprimir</Button>
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
                <div id="expense-preview-content" className="text-secondary-800 space-y-6 animate-fade-in">
                    {/* ... content as before ... */}
                </div>
            )}
             {activeTab === 'comments' && (
                <div className="animate-fade-in">
                    <Comments comments={gasto.comments} documentId={gasto.id} documentType="gasto" />
                </div>
            )}
            {activeTab === 'history' && (
                 <div className="animate-fade-in">
                    <AuditTrail auditLog={gasto.auditLog} />
                </div>
            )}
        </Modal>
    );
};

export default VistaPreviaGastoModal;
