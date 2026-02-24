import React from 'react';
import Modal from '../../components/ui/Modal.tsx';
import Button from '../../components/ui/Button.tsx';
import { generateAnexoAandIT1Excel } from '../../utils/dgiiReportUtils.ts';
import { useDataStore } from '../../stores/useDataStore.ts';
import { DownloadIcon } from '../../components/icons/Icons.tsx';

interface AnexoAModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // The result from calculateAnexoAandIT1
}

const formatCurrency = (value: number) => {
  if (value === null || value === undefined || isNaN(value)) {
    value = 0;
  }
  const formatted = new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
  return value < 0 ? `- ${formatted}` : formatted;
};

const formatPeriod = (p: string) => `${p.substring(4, 6)}/${p.substring(0, 4)}`;

const DetailRow: React.FC<{ label: string, value: string | number, isSub?: boolean, isTotal?: boolean }> = ({ label, value, isSub = false, isTotal = false }) => (
    <div className={`flex justify-between py-1.5 ${isTotal ? 'font-bold border-t pt-2' : ''} ${isSub ? 'pl-4' : ''}`}>
        <span className={isTotal ? 'text-secondary-800' : 'text-secondary-600'}>{label}</span>
        <span className={`font-mono ${isTotal ? 'text-primary' : 'text-secondary-800'}`}>{formatCurrency(Number(value))}</span>
    </div>
);

const AnexoAModal: React.FC<AnexoAModalProps> = ({ isOpen, onClose, data }) => {
    const { getVentasFor607, getGastosFor606, cierresITBIS } = useDataStore();

    if (!isOpen || !data) return null;
    
    const { empresa, period, ventas, compras, liquidacion } = data;

    const handlePrint = () => {
        const printContent = document.getElementById('anexo-a-printable-content');
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow?.document.write('<html><head><title>Resumen para Declaración IT-1</title>');
            printWindow?.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow?.document.write('</head><body class="p-8 font-sans">');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            
            setTimeout(() => { // Allow content to render before printing
                printWindow?.print();
                printWindow?.close();
            }, 500);
        }
    };
    
    const handleDownloadExcel = () => {
        const start = `${period.substring(0,4)}-${period.substring(4,6)}-01`;
        const end = new Date(parseInt(period.substring(0,4)), parseInt(period.substring(4,6)), 0).toISOString().split('T')[0];
        
        const ventasData = getVentasFor607(start, end);
        const gastosData = getGastosFor606(start, end);
        
        generateAnexoAandIT1Excel(ventasData, gastosData, cierresITBIS, empresa, period);
    };

    const modalFooter = (
      <>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleDownloadExcel}>Descargar Excel</Button>
        <Button onClick={handlePrint}>Imprimir</Button>
      </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Vista Previa - Anexo A / IT-1"
            size="2xl"
            footer={modalFooter}
        >
            <div id="anexo-a-printable-content" className="p-6 text-sm">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold">Resumen para Declaración IT-1</h2>
                    <p className="text-secondary-600">Empresa: {empresa.nombre} (RNC: {empresa.rnc})</p>
                    <p className="text-secondary-600">Período Fiscal: {formatPeriod(period)}</p>
                </div>

                <div className="space-y-6">
                    {/* Ventas */}
                    <section>
                        <h3 className="text-base font-semibold text-primary border-b-2 border-primary-200 pb-1 mb-2">I - Operaciones Reportadas en el 607 (Ventas)</h3>
                        <DetailRow label="Total de Operaciones por Ventas y Servicios (Casilla 3)" value={ventas.totalOperaciones} />
                        <DetailRow label="Total ITBIS Facturado (Casilla 11)" value={ventas.totalItbisFacturado} />
                        <DetailRow label="Total ITBIS Percibido (Casilla 12)" value={ventas.itbisPercibido} />
                    </section>
                    
                    {/* Compras */}
                    <section>
                        <h3 className="text-base font-semibold text-primary border-b-2 border-primary-200 pb-1 mb-2">II - Compras y Gastos Reportados en el 606 (Compras)</h3>
                        <DetailRow label="Total Compras y Servicios (Casilla 23)" value={compras.totalComprasBienes + compras.totalComprasServicios} />
                        <DetailRow label="Total ITBIS Pagado en Compras (Casilla 25)" value={compras.totalItbisPagado} />
                        <DetailRow label="ITBIS Retenido por Terceros (Casilla 26)" value={compras.itbisRetenido} />
                    </section>

                    {/* Liquidación */}
                    <section>
                        <h3 className="text-base font-semibold text-primary border-b-2 border-primary-200 pb-1 mb-2">III - Resumen de Liquidación (IT-1)</h3>
                        <DetailRow label="(A) ITBIS por Pagar (Ventas)" value={liquidacion.itbisPorPagar > 0 ? liquidacion.itbisPorPagar : 0} />
                        <DetailRow label="(B) ITBIS Deducible (Compras)" value={-liquidacion.itbisDeducible} />
                        <DetailRow label="Saldo a Favor Anterior (Casilla 29)" value={-liquidacion.saldoFavorAnterior} />
                        <DetailRow label="Retenciones de ITBIS (Norma 02-05) (Casilla 30)" value={-liquidacion.itbisRetenidoPorTerceros} />
                        
                        <div className="flex justify-between font-bold text-base py-2 mt-2 bg-secondary-100 rounded-md px-2">
                            <span>ITBIS A PAGAR / (SALDO A FAVOR):</span>
                            <span className={`font-mono ${liquidacion.impuestoAPagar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(liquidacion.impuestoAPagar > 0 ? liquidacion.impuestoAPagar : -liquidacion.nuevoSaldoAFavor)}
                            </span>
                        </div>
                    </section>
                </div>
                
                 <footer className="text-center text-xs text-secondary-400 pt-6 mt-6 border-t">
                    <p>Este es un resumen preliminar generado por SIRIM. Los valores deben ser verificados antes de la declaración final en la Oficina Virtual de la DGII.</p>
                </footer>
            </div>
        </Modal>
    );
};

export default AnexoAModal;