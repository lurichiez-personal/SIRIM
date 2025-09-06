import React from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useTenantStore } from '../../stores/useTenantStore';

interface AnexoAModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // The result from calculateAnexoA
  period: string;
}

const AnexoAModal: React.FC<AnexoAModalProps> = ({ isOpen, onClose, data, period }) => {
    const { selectedTenant } = useTenantStore();

    if (!isOpen || !data) return null;

    const handlePrint = () => {
        const printContent = document.getElementById('anexo-a-preview-content');
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow?.document.write('<html><head><title>Anexo A / IT-1</title>');
            printWindow?.document.write('<style>body{font-family:sans-serif;padding:2rem;}.text-xl{font-size:1.25rem;}.font-bold{font-weight:700;}.text-center{text-align:center;}.mb-6{margin-bottom:1.5rem;}.text-md{font-size:1rem;}.space-y-6>*+*{margin-top:1.5rem;}</style>');
            printWindow?.document.write('</head><body class="p-8">');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.print();
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
    const formatPeriod = (p: string) => `${p.substring(4, 6)}/${p.substring(0, 4)}`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Vista Previa - Anexo A / IT-1"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                    <Button onClick={handlePrint}>Imprimir</Button>
                </>
            }
        >
            <div id="anexo-a-preview-content" className="text-secondary-800 space-y-6">
                <header className="text-center">
                    <h2 className="text-xl font-bold">Resumen para Declaración IT-1</h2>
                    <p className="text-md">Empresa: {selectedTenant?.nombre} (RNC: {selectedTenant?.rnc})</p>
                    <p className="text-md">Período Fiscal: {formatPeriod(period)}</p>
                </header>
                
                <section>
                    <h3 className="text-lg font-semibold mb-2 pb-1 border-b text-primary">I - Operaciones Reportadas en el 607 (Ventas)</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Total de Operaciones por Ventas y Servicios (Casilla 3):</span> <span className="font-bold">{formatCurrency(data.totalVentasNeto)}</span></div>
                        <div className="flex justify-between"><span>Total ITBIS Facturado (Casilla 11):</span> <span className="font-bold">{formatCurrency(data.itbisVentas)}</span></div>
                        <div className="flex justify-between"><span>Total ITBIS Percibido (Casilla 12):</span> <span className="font-bold">{formatCurrency(0)}</span></div>
                    </div>
                </section>
                
                <section>
                    <h3 className="text-lg font-semibold mb-2 pb-1 border-b text-primary">II - Compras y Gastos Reportados en el 606 (Compras)</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Total Compras y Servicios (Casilla 23):</span> <span className="font-bold">{formatCurrency(data.totalCompras)}</span></div>
                        <div className="flex justify-between"><span>Total ITBIS Pagado en Compras (Casilla 25):</span> <span className="font-bold">{formatCurrency(data.itbisCompras)}</span></div>
                        <div className="flex justify-between"><span>ITBIS Retenido por Terceros (Casilla 26):</span> <span className="font-bold">{formatCurrency(0)}</span></div>
                    </div>
                </section>

                <section className="p-4 bg-primary-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-primary-800">III - Resumen de Liquidación (IT-1)</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>(A) ITBIS por Pagar (Ventas):</span> <span>{formatCurrency(data.itbisVentas)}</span></div>
                        <div className="flex justify-between"><span>(B) ITBIS Deducible (Compras):</span> <span>- {formatCurrency(data.itbisCompras)}</span></div>
                        <div className="flex justify-between font-bold text-md border-t pt-2 mt-2">
                            <span>ITBIS A PAGAR / (SALDO A FAVOR):</span>
                            <span className={data.itbisAPagar >= 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatCurrency(data.itbisAPagar)}
                            </span>
                        </div>
                    </div>
                </section>

                 <footer className="mt-6 text-center text-xs text-secondary-500">
                    <p>Este es un resumen preliminar generado por SIRIM. Los valores deben ser verificados antes de la declaración final en la Oficina Virtual de la DGII.</p>
                </footer>
            </div>
        </Modal>
    );
};

export default AnexoAModal;