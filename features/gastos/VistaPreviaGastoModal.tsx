import React from 'react';
import { Gasto } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useTenantStore } from '../../stores/useTenantStore';
import { LogoIcon } from '../../components/icons/Icons';

interface VistaPreviaGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasto: Gasto | null;
}

const VistaPreviaGastoModal: React.FC<VistaPreviaGastoModalProps> = ({ isOpen, onClose, gasto }) => {
    const { selectedTenant } = useTenantStore();

    if (!isOpen || !gasto) return null;

    const handlePrint = () => {
        const printContent = document.getElementById('expense-preview-content');
        const windowUrl = 'about:blank';
        const uniqueName = new Date().getTime();
        const windowName = 'Print' + uniqueName;
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        if (printWindow && printContent) {
            printWindow.document.write('<html><head><title>Imprimir Gasto</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }</style>');
            printWindow.document.write('</head><body class="p-4">');
            printWindow.document.write(printContent.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Gasto`} footer={
            <>
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                <Button onClick={handlePrint}>Imprimir</Button>
            </>
        }>
            <div id="expense-preview-content" className="text-secondary-800 space-y-6">
                <header className="flex justify-between items-start pb-4 border-b">
                    <div>
                        <div className="flex items-center mb-2">
                            <LogoIcon className="h-8 w-8 mr-2 text-primary" />
                            <h1 className="text-2xl font-bold text-primary">{selectedTenant?.nombre}</h1>
                        </div>
                        <p className="text-sm">RNC: {selectedTenant?.rnc}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-semibold">COMPROBANTE DE GASTO</h2>
                        <p className="text-sm">Fecha: {new Date(gasto.fecha).toLocaleDateString('es-DO')}</p>
                    </div>
                </header>
                
                <section className="grid grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-md font-semibold mb-2">Proveedor:</h3>
                        <p className="font-bold">{gasto.proveedorNombre || 'N/A'}</p>
                        <p className="text-sm">RNC: {gasto.rncProveedor || 'N/A'}</p>
                    </div>
                     <div className="text-right">
                        <h3 className="text-md font-semibold mb-2">Comprobante Fiscal:</h3>
                        <p className="font-mono font-bold">{gasto.ncf || 'Sin NCF'}</p>
                    </div>
                </section>

                <section>
                    <h3 className="text-md font-semibold mb-2">Detalles del Gasto:</h3>
                     <div className="p-4 bg-secondary-50 rounded-lg space-y-3">
                         <div>
                            <p className="text-xs font-semibold uppercase text-secondary-500">Categoría (606)</p>
                            <p>{gasto.categoriaGasto}</p>
                         </div>
                         <div>
                            <p className="text-xs font-semibold uppercase text-secondary-500">Descripción</p>
                            <p>{gasto.descripcion}</p>
                         </div>
                     </div>
                </section>

                <section className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-sm"><span>Subtotal:</span> <span>{formatCurrency(gasto.subtotal)}</span></div>
                        <div className="flex justify-between text-sm"><span>ITBIS:</span> <span>{formatCurrency(gasto.itbis)}</span></div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Total:</span> <span className="text-primary">{formatCurrency(gasto.monto)}</span></div>
                    </div>
                </section>
            </div>
        </Modal>
    );
};

export default VistaPreviaGastoModal;