import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Factura, FacturaEstado } from '../../types.ts';
import Modal from '../../components/ui/Modal.tsx';
import Button from '../../components/ui/Button.tsx';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { useDataStore } from '../../stores/useDataStore.ts';
import Comments from '../../components/ui/Comments.tsx';
import AuditTrail from '../../components/ui/AuditTrail.tsx';
import { ShareIcon, DocumentArrowDownIcon, WhatsappIcon, EnvelopeIcon } from '../../components/icons/Icons.tsx';

interface VistaPreviaFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  factura: Factura | null;
}

const VistaPreviaFacturaModal: React.FC<VistaPreviaFacturaModalProps> = ({ isOpen, onClose, factura }) => {
    const { selectedTenant } = useTenantStore();
    const { clientes, ingresos } = useDataStore();
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    const accentColor = useMemo(() => {
        return selectedTenant?.accentColor || '#005A9C';
    }, [selectedTenant]);
    
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

    if (!isOpen || !factura) return null;

    const cliente = clientes.find(c => c.id === factura.clienteId);
    const pagosRelacionados = ingresos.filter(i => i.facturaId === factura.id);

    const handlePrintOrPdf = () => {
        const printContent = document.getElementById('invoice-preview-content');
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow?.document.write('<html><head><title>Factura</title>');
            printWindow?.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow?.document.write('</head><body class="p-8">');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.print();
        }
    };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    
    const handleShareWhatsApp = () => {
        const message = `Hola, le compartimos un resumen de la factura ${factura.ncf} por un monto de ${formatCurrency(factura.montoTotal)}. Gracias.`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setIsShareMenuOpen(false);
    };
    
    const handleShareEmail = () => {
        const subject = `Factura ${factura.ncf} de ${selectedTenant?.nombre}`;
        const body = `Hola ${factura.clienteNombre},\n\nAdjunto encontrará un resumen de su factura.\n\nNúmero de Factura: ${factura.ncf}\nMonto Total: ${formatCurrency(factura.montoTotal)}\nFecha: ${new Date(factura.fecha + 'T00:00:00').toLocaleDateString('es-DO')}\n\nGracias,\n${selectedTenant?.nombre}`;
        const mailtoLink = `mailto:${cliente?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        setIsShareMenuOpen(false);
    };

    const getStatusBadge = (estado: FacturaEstado) => {
        const map = {
            [FacturaEstado.Pagada]: 'bg-green-100 text-green-800',
            [FacturaEstado.Emitida]: 'bg-blue-100 text-blue-800',
            [FacturaEstado.PagadaParcialmente]: 'bg-yellow-100 text-yellow-800',
            [FacturaEstado.Vencida]: 'bg-red-100 text-red-800',
            [FacturaEstado.Anulada]: 'bg-gray-400 text-white',
        };
        return map[estado] || 'bg-secondary-100 text-secondary-800';
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
        <Button variant="secondary" onClick={handlePrintOrPdf} leftIcon={<DocumentArrowDownIcon className="h-5 w-5"/>}>
            PDF
        </Button>
        <Button onClick={handlePrintOrPdf} style={{ backgroundColor: accentColor }}>Imprimir</Button>
      </>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Vista Previa: Factura ${factura.ncf}`} 
            size="4xl" 
            footer={modalFooter}
        >
            <div className="p-6">
                <div className="border-b border-secondary-200 mb-4">
                    <nav className="-mb-px flex space-x-4">
                        <TabButton tab="details" label="Detalles" />
                        <TabButton tab="comments" label="Comentarios" />
                        <TabButton tab="history" label="Historial" />
                    </nav>
                </div>

                {activeTab === 'details' && (
                    <div id="invoice-preview-content" className="text-secondary-800 animate-fade-in">
                        <header className="flex justify-between items-start pb-4">
                            <div className="flex items-center space-x-4">
                                 <img src={logoSrc} alt="Logo" className="h-16 w-auto object-contain rounded-md" />
                                <div>
                                    <h2 className="font-bold text-lg" style={{ color: accentColor }}>{selectedTenant?.nombre}</h2>
                                    <p className="text-sm">RNC: {selectedTenant?.rnc}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-2xl font-bold uppercase" style={{ color: accentColor }}>Factura</h1>
                                <p className="font-mono font-bold">{factura.ncf}</p>
                            </div>
                        </header>

                        <hr className="my-4"/>

                        <section className="flex justify-between text-sm mb-6">
                            <div>
                                <p className="font-bold text-secondary-500">CLIENTE:</p>
                                <p className="font-semibold text-base">{factura.clienteNombre}</p>
                                {cliente?.rnc && <p className="font-mono">RNC: {cliente.rnc}</p>}
                                {cliente?.telefono && <p>Tel: {cliente.telefono}</p>}
                            </div>
                            <div className="text-right">
                                <p><span className="font-bold text-secondary-500">FECHA DE EMISIÓN:</span> {new Date(factura.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</p>
                                <p><span className="font-bold text-secondary-500">CONDICIONES:</span> {cliente?.condicionesPago || 'N/A'}</p>
                                <p className="flex justify-end items-center mt-1">
                                    <span className="font-bold text-secondary-500 mr-2 uppercase text-xs">ESTADO:</span> 
                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-bold uppercase rounded-full ${getStatusBadge(factura.estado)}`}>
                                        {factura.estado}
                                    </span>
                                </p>
                            </div>
                        </section>

                        <section className="mt-4">
                            <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Descripción</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-secondary-500 uppercase">Cant.</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase">Precio Unit.</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {factura.items.map(item => (
                                        <tr key={item.itemId}>
                                            <td className="px-4 py-3 text-sm">
                                                <p className="font-medium">{item.descripcion}</p>
                                                <p className="text-xs text-secondary-400 font-mono">{item.codigo}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm">{item.cantidad}</td>
                                            <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.precioUnitario)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start mt-8 pt-4 border-t border-secondary-200">
                            <div className="w-full md:w-1/2 mb-6 md:mb-0">
                                <h4 className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-3">Información de Pagos</h4>
                                {pagosRelacionados.length > 0 ? (
                                    <div className="space-y-2">
                                        {pagosRelacionados.map(pago => (
                                            <div key={pago.id} className="flex items-center text-sm bg-secondary-50 p-2 rounded border border-secondary-100">
                                                <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-secondary-700">{pago.metodoPago.substring(3)}</p>
                                                    <p className="text-xs text-secondary-500">{new Date(pago.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</p>
                                                </div>
                                                <div className="text-right font-bold text-secondary-800">
                                                    {formatCurrency(pago.monto)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-secondary-400 italic bg-secondary-50 p-3 rounded border border-dashed border-secondary-300">
                                        Esta factura se encuentra pendiente de cobro (Venta a Crédito).
                                    </p>
                                )}
                            </div>

                            <div className="w-full md:w-1/3 space-y-2 text-sm bg-secondary-50/50 p-4 rounded-lg">
                                <div className="flex justify-between">
                                    <span className="font-medium text-secondary-600">Subtotal:</span>
                                    <span>{formatCurrency(factura.subtotal)}</span>
                                </div>
                                 {factura.montoDescuento > 0 && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-secondary-600">Descuento ({factura.descuentoPorcentaje}%):</span>
                                        <span className="text-red-600 font-mono">- {formatCurrency(factura.montoDescuento)}</span>
                                    </div>
                                )}
                                {factura.itbis > 0 && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-secondary-600">ITBIS (18%):</span>
                                        <span>{formatCurrency(factura.itbis)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg border-t border-secondary-200 pt-2 mt-2">
                                    <span>TOTAL:</span>
                                    <span style={{ color: accentColor }}>{formatCurrency(factura.montoTotal)}</span>
                                </div>
                                {factura.itbisRetenido > 0 && (
                                    <div className="flex justify-between pt-1 text-red-700">
                                        <span className="font-bold text-xs uppercase tracking-tighter">(-) ITBIS Retenido por Tercero:</span>
                                        <span className="font-mono font-bold">{formatCurrency(factura.itbisRetenido)}</span>
                                    </div>
                                )}
                                { factura.montoPagado > 0 && (
                                    <div className="flex justify-between text-secondary-600">
                                        <span className="font-medium text-xs uppercase tracking-tighter">Total Cobrado:</span>
                                        <span className="font-mono">{formatCurrency(factura.montoPagado)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-2 mt-2 bg-primary-50 p-2 rounded-md border-2 border-primary/10">
                                    <span className="text-primary-800">Balance Pendiente:</span>
                                    <span className="text-primary-900">{formatCurrency(Math.max(0, factura.montoTotal - factura.montoPagado - (factura.itbisRetenido || 0)))}</span>
                                </div>
                            </div>
                        </div>

                        {selectedTenant?.footerText && (
                            <footer className="text-center text-xs text-secondary-500 pt-12 mt-12 border-t border-dotted">
                                <p className="italic">{selectedTenant.footerText}</p>
                                <p className="mt-4 text-[10px] text-secondary-300 uppercase tracking-widest font-black">Generado por SIRIM - Inteligencia Fiscal</p>
                            </footer>
                        )}
                    </div>
                )}
                {activeTab === 'comments' && (
                    <div className="animate-fade-in">
                        <Comments comments={factura.comments} documentId={factura.id} documentType="factura" />
                    </div>
                )}
                {activeTab === 'history' && (
                     <div className="animate-fade-in">
                        <AuditTrail auditLog={factura.auditLog} />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default VistaPreviaFacturaModal;