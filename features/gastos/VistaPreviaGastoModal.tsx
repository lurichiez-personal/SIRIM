import React, { useState } from 'react';
import { Gasto } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useTenantStore } from '../../stores/useTenantStore';
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

    const DetailRow: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
      <div className="grid grid-cols-3 gap-4 py-2 border-b border-secondary-100">
          <dt className="text-sm font-medium text-secondary-500">{label}</dt>
          <dd className="mt-1 text-sm text-secondary-900 sm:mt-0 sm:col-span-2">{value}</dd>
      </div>
    );

    const modalFooter = (
      <>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button onClick={handlePrint}>Imprimir</Button>
      </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Gasto`} size="2xl" footer={modalFooter}>
             <div className="p-6">
                <div className="border-b border-secondary-200 mb-4">
                    <nav className="-mb-px flex space-x-4">
                        <TabButton tab="details" label="Detalles" />
                        <TabButton tab="comments" label="Comentarios Internos" />
                        <TabButton tab="history" label="Historial de Cambios" />
                    </nav>
                </div>

                {activeTab === 'details' && (
                    <div id="expense-preview-content" className="text-secondary-800 space-y-6 animate-fade-in">
                        <header>
                           <h2 className="text-xl font-bold text-primary">Detalle del Gasto #{gasto.id}</h2>
                           <p className="text-sm text-secondary-500">Registrado en {selectedTenant?.nombre}</p>
                        </header>
                       
                        <dl>
                            <DetailRow label="Proveedor" value={gasto.proveedorNombre || 'N/A'} />
                            <DetailRow label="RNC Proveedor" value={gasto.rncProveedor || 'N/A'} />
                            <DetailRow label="NCF" value={gasto.ncf || 'N/A'} />
                            <DetailRow label="Fecha" value={new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-DO')} />
                            <DetailRow label="Categoría (606)" value={gasto.categoriaGasto} />
                            <DetailRow label="Descripción" value={<p className="whitespace-pre-wrap">{gasto.descripcion}</p>} />
                            <DetailRow label="Subtotal" value={formatCurrency(gasto.subtotal)} />
                            <DetailRow label="ITBIS" value={formatCurrency(gasto.itbis)} />
                            <DetailRow label="Monto Total" value={<span className="font-bold text-lg text-primary">{formatCurrency(gasto.monto)}</span>} />
                        </dl>
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
            </div>
        </Modal>
    );
};

export default VistaPreviaGastoModal;