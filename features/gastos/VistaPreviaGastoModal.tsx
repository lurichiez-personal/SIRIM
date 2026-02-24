import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Gasto } from '../../types.ts';
import Modal from '../../components/ui/Modal.tsx';
import Button from '../../components/ui/Button.tsx';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import Comments from '../../components/ui/Comments.tsx';
import AuditTrail from '../../components/ui/AuditTrail.tsx';
import { formatCurrency } from '../../utils/formatters.ts';
import { ShareIcon, DocumentArrowDownIcon, WhatsappIcon, EnvelopeIcon } from '../../components/icons/Icons.tsx';

interface VistaPreviaGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasto: Gasto | null;
}

const VistaPreviaGastoModal: React.FC<VistaPreviaGastoModalProps> = ({ isOpen, onClose, gasto }) => {
    const { selectedTenant } = useTenantStore();
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement>(null);
    
    const accentColor = useMemo(() => {
        return selectedTenant?.accentColor || '#005A9C';
    }, [selectedTenant]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
            setIsShareMenuOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    if (!isOpen || !gasto) return null;

    const handlePrintOrPdf = () => {
        const printContent = document.getElementById('expense-preview-content');
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow?.document.write('<html><head><title>Comprobante de Gasto</title>');
            printWindow?.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow?.document.write('</head><body class="p-8 font-sans">');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            setTimeout(() => { 
                printWindow?.print();
                printWindow?.close();
            }, 500);
        }
    };
    
    const handleShareWhatsApp = () => {
        const message = `Resumen de Gasto:\nProveedor: ${gasto.proveedorNombre}\nNCF: ${gasto.ncf}\nMonto Total: ${formatCurrency(gasto.monto)}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setIsShareMenuOpen(false);
    };
    
    const handleShareEmail = () => {
        const subject = `Comprobante de Gasto: ${gasto.ncf || gasto.descripcion}`;
        const body = `Hola,\n\nSe comparte el siguiente comprobante de gasto:\n\nProveedor: ${gasto.proveedorNombre}\nNCF: ${gasto.ncf}\nMonto Total: ${formatCurrency(gasto.monto)}\nFecha: ${new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-DO')}\n\nGracias,\n${selectedTenant?.nombre}`;
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        setIsShareMenuOpen(false);
    };

    const TabButton: React.FC<{tab: 'details' | 'comments' | 'history', label: string}> = ({tab, label}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === tab ? 'border-b-2 text-primary' : 'text-secondary-500 hover:text-secondary-700'}`}
             style={activeTab === tab ? {borderColor: accentColor} : {}}
        >
            {label}
        </button>
    );

    const DetailRow: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
      <div className="grid grid-cols-3 gap-4 py-2">
          <dt className="text-sm font-medium text-secondary-500">{label}</dt>
          <dd className="mt-1 text-sm text-secondary-900 sm:mt-0 sm:col-span-2">{value}</dd>
      </div>
    );

    const modalFooter = (
      <>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
         <div ref={shareMenuRef} className="relative">
          <Button variant="secondary" onClick={() => setIsShareMenuOpen(prev => !prev)} leftIcon={<ShareIcon className="h-5 w-5"/>}>
            Compartir
          </Button>
          {isShareMenuOpen && (
            <div className="absolute bottom-full mb-2 right-0 bg-white rounded-md shadow-lg z-20 border w-48 py-1">
              <button onClick={handleShareWhatsApp} className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100 flex items-center space-x-2">
                <WhatsappIcon className="h-5 w-5 text-green-500" />
                <span>Vía WhatsApp</span>
              </button>
              <button onClick={handleShareEmail} className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100 flex items-center space-x-2">
                <EnvelopeIcon className="h-5 w-5 text-secondary-500" />
                <span>Vía Correo</span>
              </button>
            </div>
          )}
        </div>
        <Button onClick={handlePrintOrPdf} leftIcon={<DocumentArrowDownIcon className="h-5 w-5"/>}>Imprimir / Guardar PDF</Button>
      </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Gasto`} size="2xl" footer={modalFooter}>
             <div className="p-6">
                <div className="border-b border-secondary-200 mb-4">
                    <nav className="-mb-px flex space-x-4">
                        <TabButton tab="details" label="Detalles" />
                        <TabButton tab="comments" label="Comentarios" />
                        <TabButton tab="history" label="Historial" />
                    </nav>
                </div>

                {activeTab === 'details' && (
                    <div id="expense-preview-content" className="text-secondary-800 space-y-6 animate-fade-in">
                        <header className="flex justify-between items-start pb-4 border-b">
                            <div>
                                <h2 className="text-xl font-bold" style={{color: accentColor}}>{selectedTenant?.nombre}</h2>
                                <p className="text-sm">RNC: {selectedTenant?.rnc}</p>
                            </div>
                            <div className="text-right">
                                <h1 className="text-2xl font-bold uppercase" style={{color: accentColor}}>Comprobante de Gasto</h1>
                            </div>
                        </header>
                       
                        <dl className="divide-y divide-secondary-200">
                            <DetailRow label="Proveedor" value={<span className="font-semibold">{gasto.proveedorNombre || 'N/A'}</span>} />
                            <DetailRow label="RNC Proveedor" value={gasto.rncProveedor || 'N/A'} />
                            <DetailRow label="NCF" value={gasto.ncf || 'N/A'} />
                            <DetailRow label="Fecha" value={new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-DO')} />
                            <DetailRow label="Categoría (606)" value={gasto.categoriaGasto} />
                            <DetailRow label="Descripción" value={<p className="whitespace-pre-wrap">{gasto.descripcion}</p>} />
                            <DetailRow label="Subtotal" value={formatCurrency(gasto.subtotal)} />
                            {gasto.montoDescuento && gasto.montoDescuento > 0 && (
                                <DetailRow 
                                    label={`Descuento (${gasto.descuentoPorcentaje || 0}%)`} 
                                    value={<span className="text-red-600">- {formatCurrency(gasto.montoDescuento)}</span>} 
                                />
                            )}
                            {gasto.isc && gasto.isc > 0 && <DetailRow label="ISC" value={formatCurrency(gasto.isc)} />}
                            <DetailRow label="ITBIS" value={formatCurrency(gasto.itbis)} />
                            {gasto.propinaLegal && gasto.propinaLegal > 0 && <DetailRow label="Propina Legal" value={formatCurrency(gasto.propinaLegal)} />}
                            <DetailRow label="Monto Total" value={<span className="font-bold text-lg" style={{color: accentColor}}>{formatCurrency(gasto.monto)}</span>} />
                            {gasto.imageUrl && (
                                <DetailRow 
                                    label="Comprobante Adjunto" 
                                    value={
                                        <a href={gasto.imageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                                            Ver Imagen
                                        </a>
                                    } 
                                />
                            )}
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