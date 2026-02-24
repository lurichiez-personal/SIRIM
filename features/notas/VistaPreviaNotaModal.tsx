import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NotaCreditoDebito, NotaType, CodigoModificacionNCF } from '../../types.ts';
import Modal from '../../components/ui/Modal.tsx';
import Button from '../../components/ui/Button.tsx';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { ShareIcon, DocumentArrowDownIcon, WhatsappIcon, EnvelopeIcon } from '../../components/icons/Icons.tsx';
import { formatCurrency } from '../../utils/formatters.ts';

interface VistaPreviaNotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  nota: NotaCreditoDebito | null;
}

const VistaPreviaNotaModal: React.FC<VistaPreviaNotaModalProps> = ({ isOpen, onClose, nota }) => {
    const { selectedTenant } = useTenantStore();
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement>(null);
    
    const accentColor = useMemo(() => {
        return selectedTenant?.accentColor || '#005A9C';
    }, [selectedTenant]);

    // Logic for Logo: Use uploaded URL or generate a random one based on name
    const logoSrc = useMemo(() => {
        if (selectedTenant?.logoUrl) return selectedTenant.logoUrl;
        const name = selectedTenant?.nombre || 'Empresa';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128&bold=true`;
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

    if (!isOpen || !nota) return null;

    const handlePrintOrPdf = () => {
        const printContent = document.getElementById('nota-preview-content');
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow?.document.write('<html><head><title>Nota de Crédito/Débito</title>');
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
        const message = `Hola, le compartimos la Nota de ${nota.tipo === NotaType.Credito ? 'Crédito' : 'Débito'} ${nota.ncf} por un monto de ${formatCurrency(nota.montoTotal)}.`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setIsShareMenuOpen(false);
    };
    
    const handleShareEmail = () => {
        const tipoLabel = nota.tipo === NotaType.Credito ? 'Crédito' : 'Débito';
        const subject = `Nota de ${tipoLabel} ${nota.ncf} de ${selectedTenant?.nombre}`;
        const body = `Hola ${nota.clienteNombre},\n\nAdjunto encontrará la nota de ${tipoLabel.toLowerCase()} aplicada a su cuenta.\n\nNCF: ${nota.ncf}\nMonto: ${formatCurrency(nota.montoTotal)}\nFactura Afectada: ${nota.facturaAfectadaNCF}\n\nGracias,\n${selectedTenant?.nombre}`;
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        setIsShareMenuOpen(false);
    };

    const getCodigoText = (codigo: keyof typeof CodigoModificacionNCF) => {
        return CodigoModificacionNCF[codigo] || codigo;
    };

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
        <Button onClick={handlePrintOrPdf} leftIcon={<DocumentArrowDownIcon className="h-5 w-5"/>} style={{ backgroundColor: accentColor }}>
            Imprimir / Guardar PDF
        </Button>
      </>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Vista Previa: ${nota.ncf}`} 
            size="2xl" 
            footer={modalFooter}
        >
            <div className="p-6">
                <div id="nota-preview-content" className="text-secondary-800 space-y-6 animate-fade-in border p-8 bg-white rounded-sm">
                    {/* Header */}
                    <header className="flex justify-between items-start pb-4 border-b border-secondary-200">
                        <div className="flex items-center space-x-4">
                             <img src={logoSrc} alt="Logo" className="h-16 w-auto object-contain rounded-md" />
                            <div>
                                <h2 className="font-bold text-lg" style={{ color: accentColor }}>{selectedTenant?.nombre}</h2>
                                <p className="text-sm text-secondary-600">RNC: {selectedTenant?.rnc}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-xl font-bold uppercase" style={{ color: accentColor }}>
                                NOTA DE {nota.tipo === NotaType.Credito ? 'CRÉDITO' : 'DÉBITO'}
                            </h1>
                            <p className="font-mono font-semibold text-lg">{nota.ncf}</p>
                            <p className="text-xs text-secondary-500 mt-1">Fecha: {new Date(nota.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</p>
                        </div>
                    </header>

                    {/* Info Grid */}
                    <section className="grid grid-cols-2 gap-8 text-sm">
                        <div>
                            <h3 className="font-bold text-secondary-500 uppercase text-xs mb-1">Cliente</h3>
                            <p className="font-semibold text-base">{nota.clienteNombre}</p>
                        </div>
                        <div className="text-right">
                            <h3 className="font-bold text-secondary-500 uppercase text-xs mb-1">Comprobante Modificado</h3>
                            <p className="font-mono">{nota.facturaAfectadaNCF}</p>
                        </div>
                    </section>

                    {/* Reason */}
                    <section className="bg-secondary-50 p-4 rounded-md border border-secondary-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="block text-xs font-bold text-secondary-500 uppercase">Motivo de Modificación</span>
                                <span className="text-sm font-medium">{getCodigoText(nota.codigoModificacion)}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-secondary-500 uppercase">Descripción</span>
                                <span className="text-sm">{nota.descripcion}</span>
                            </div>
                        </div>
                    </section>

                    {/* Totals */}
                    <section className="flex justify-end mt-6 pt-4 border-t border-secondary-200">
                        <div className="w-full max-w-xs space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="font-medium text-secondary-600">Subtotal:</span>
                                <span>{formatCurrency(nota.subtotal)}</span>
                            </div>
                            {nota.isc && nota.isc > 0 && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-secondary-600">ISC:</span>
                                    <span>{formatCurrency(nota.isc)}</span>
                                </div>
                            )}
                            {nota.itbis > 0 && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-secondary-600">ITBIS:</span>
                                    <span>{formatCurrency(nota.itbis)}</span>
                                </div>
                            )}
                            {nota.propinaLegal && nota.propinaLegal > 0 && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-secondary-600">Propina Legal:</span>
                                    <span>{formatCurrency(nota.propinaLegal)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg border-t border-secondary-300 pt-2 mt-2">
                                <span>TOTAL:</span>
                                <span style={{ color: accentColor }}>{formatCurrency(nota.montoTotal)}</span>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    {selectedTenant?.footerText && (
                        <footer className="text-center text-xs text-secondary-400 pt-8 mt-4">
                            <p>{selectedTenant.footerText}</p>
                        </footer>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default VistaPreviaNotaModal;