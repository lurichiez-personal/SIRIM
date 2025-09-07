import React, { useState } from 'react';
import { Cotizacion, CotizacionEstado } from '../../types';
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
    const { settings } = useSettingsStore();
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');

    if (!isOpen || !cotizacion) return null;

    const tenantSettings = settings[selectedTenant?.id || 0];
    const accentColor = tenantSettings?.accentColor || '#005A9C';

    const handlePrint = () => {
        const printContent = document.getElementById('quote-preview-content');
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow?.document.write('<html><head><title>Cotización</title>');
            printWindow?.document.write('<link rel="stylesheet" href="/index.css">');
            printWindow?.document.write('</head><body class="p-8">');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.print();
        }
    };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    
    const getStatusBadge = (estado: CotizacionEstado) => {
        const statuses: { [key in CotizacionEstado]: string } = {
            [CotizacionEstado.Pendiente]: 'bg-yellow-100 text-yellow-800',
            [CotizacionEstado.Aprobada]: 'bg-blue-100 text-blue-800',
            [CotizacionEstado.Facturada]: 'bg-green-100 text-green-800',
            [CotizacionEstado.Rechazada]: 'bg-red-100 text-red-800',
            [CotizacionEstado.Anulada]: 'bg-gray-400 text-white',
        };
        return statuses[estado] || 'bg-secondary-100 text-secondary-800';
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
        <Button onClick={handlePrint} style={{ backgroundColor: accentColor }}>Imprimir</Button>
      </>
    );
    
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Vista Previa: Cotización #${cotizacion.id}`} 
            size="4xl" 
            footer={modalFooter}
        >
            <div className="p-6">
                <div className="border-b border-secondary-200 mb-4">
                    <nav className="-mb-px flex space-x-4">
                        <TabButton tab="details" label="Detalles" />
                        <TabButton tab="comments" label="Comentarios Internos" />
                        <TabButton tab="history" label="Historial de Cambios" />
                    </nav>
                </div>

                {activeTab === 'details' && (
                    <div id="quote-preview-content" className="text-secondary-800 animate-fade-in">
                        <header className="flex justify-between items-start pb-4">
                            <div className="flex items-center space-x-4">
                                {tenantSettings?.logoUrl && <img src={tenantSettings.logoUrl} alt="Logo de la empresa" className="h-16 w-auto object-contain" />}
                                <div>
                                    <h2 className="font-bold text-lg" style={{ color: accentColor }}>{selectedTenant?.nombre}</h2>
                                    <p className="text-sm">RNC: {selectedTenant?.rnc}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-2xl font-bold uppercase" style={{ color: accentColor }}>Cotización</h1>
                                <p># {cotizacion.id}</p>
                            </div>
                        </header>

                        <hr className="my-4"/>

                        <section className="flex justify-between text-sm mb-6">
                            <div>
                                <p className="font-bold text-secondary-500">CLIENTE:</p>
                                <p className="font-semibold">{cotizacion.clienteNombre}</p>
                                {cotizacion.clienteRNC && <p>RNC: {cotizacion.clienteRNC}</p>}
                            </div>
                            <div className="text-right">
                                <p><span className="font-bold text-secondary-500">FECHA DE EMISIÓN:</span> {new Date(cotizacion.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</p>
                                <p className="flex justify-end items-center">
                                    <span className="font-bold text-secondary-500 mr-2">ESTADO:</span> 
                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(cotizacion.estado)}`}>
                                        {cotizacion.estado.toUpperCase()}
                                    </span>
                                </p>
                            </div>
                        </section>

                        <section>
                            <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Código</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Descripción</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-secondary-500 uppercase">Cant.</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase">Precio Unit.</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {cotizacion.items.map(item => (
                                        <tr key={item.itemId}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">{item.codigo}</td>
                                            <td className="px-4 py-3 text-sm">{item.descripcion}</td>
                                            <td className="px-4 py-3 text-center text-sm">{item.cantidad}</td>
                                            <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.precioUnitario)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                        
                        <section className="flex justify-end mt-6">
                            <div className="w-full max-w-xs space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-secondary-600">Subtotal:</span>
                                    <span>{formatCurrency(cotizacion.subtotal)}</span>
                                </div>
                                {cotizacion.montoDescuento && cotizacion.montoDescuento > 0 && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-secondary-600">Descuento ({cotizacion.descuentoPorcentaje}%):</span>
                                        <span className="text-red-600">- {formatCurrency(cotizacion.montoDescuento)}</span>
                                    </div>
                                )}
                                {cotizacion.isc && cotizacion.isc > 0 && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-secondary-600">ISC:</span>
                                        <span>{formatCurrency(cotizacion.isc)}</span>
                                    </div>
                                )}
                                {cotizacion.itbis > 0 && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-secondary-600">ITBIS:</span>
                                    <span>{formatCurrency(cotizacion.itbis)}</span>
                                </div>
                                )}
                                {cotizacion.propinaLegal && cotizacion.propinaLegal > 0 && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-secondary-600">Propina Legal:</span>
                                        <span>{formatCurrency(cotizacion.propinaLegal)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                                    <span>TOTAL:</span>
                                    <span style={{ color: accentColor }}>{formatCurrency(cotizacion.montoTotal)}</span>
                                </div>
                            </div>
                        </section>

                        {tenantSettings?.footerText && (
                            <footer className="text-center text-xs text-secondary-500 pt-6 mt-6 border-t">
                                <p>{tenantSettings.footerText}</p>
                            </footer>
                        )}
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
            </div>
        </Modal>
    );
};

export default VistaPreviaCotizacionModal;