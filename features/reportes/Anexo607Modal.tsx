// src/features/reportes/Anexo607Modal.tsx
import React, { useState, useMemo } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useDataStore } from '../../stores/useDataStore';
import { Factura, NotaCreditoDebito } from '../../types';
import { InformationCircleIcon } from '../../components/icons/Icons';

interface Anexo607ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // El resultado de calculate607Summary
  period: string;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
const formatPeriod = (p: string) => `${p.substring(4, 6)}/${p.substring(0, 4)}`;

const SummaryRow: React.FC<{ label: string; value: string | number; isBold?: boolean }> = ({ label, value, isBold = false }) => (
    <div className="flex items-center justify-between">
        <label className={`text-sm ${isBold ? 'font-bold text-secondary-900' : 'text-secondary-700'}`}>{label}:</label>
        <input 
            type="text" 
            readOnly 
            value={typeof value === 'number' ? formatCurrency(value) : value} 
            className={`w-48 text-right bg-secondary-100 border border-secondary-300 rounded-md px-2 py-1 text-sm font-mono ${isBold ? 'font-bold' : ''}`}
        />
    </div>
);

const DetailRowItem: React.FC<{ rec: any, onUpdate: (id: string, ncfMod: string) => Promise<void> }> = ({ rec, onUpdate }) => {
    const isNota = rec.ncf?.startsWith('B04') || rec.ncf?.startsWith('E34');
    const missingMod = isNota && (!rec.modNCF || rec.modNCF === '-' || rec.modNCF.trim() === '');
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(rec.modNCF && rec.modNCF !== '-' ? rec.modNCF : '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!tempValue.trim()) return;
        setIsSaving(true);
        await onUpdate(rec.id, tempValue.trim().toUpperCase());
        setIsSaving(false);
        setIsEditing(false);
    };

    return (
        <tr id={`row-${rec.id}`} className={`hover:bg-secondary-50 ${isNota ? 'bg-purple-50/20' : ''} ${missingMod ? 'bg-red-50/50' : ''}`}>
            <td className="px-3 py-2">{rec.clienteRNC || rec.rnc || '---'}</td>
            <td className="px-3 py-2 font-bold">
                {rec.ncf}
                {isNota && <span className="ml-1 text-[9px] bg-purple-200 text-purple-800 px-1 rounded font-black">NOTA</span>}
            </td>
            <td className={`px-3 py-2 font-bold ${missingMod && !isEditing ? 'text-red-700 bg-red-100/50' : (rec.modNCF && rec.modNCF !== '-' ? 'text-primary-700 bg-primary-50/30' : 'text-secondary-300')}`}>
                {isEditing ? (
                    <div className="flex items-center space-x-1">
                        <input 
                            type="text" 
                            value={tempValue} 
                            onChange={(e) => setTempValue(e.target.value.toUpperCase())}
                            className="border border-primary-500 rounded px-1 py-1 w-full text-[11px] focus:ring-2 focus:ring-primary shadow-sm"
                            placeholder="NCF de la factura original"
                            autoFocus
                        />
                        <button onClick={handleSave} disabled={isSaving || !tempValue.trim()} className="bg-green-600 text-white font-bold px-2 py-1 rounded shadow-sm hover:bg-green-700">OK</button>
                        <button onClick={() => setIsEditing(false)} className="bg-secondary-200 text-secondary-600 font-bold px-2 py-1 rounded shadow-sm hover:bg-secondary-300">X</button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className={missingMod ? 'animate-pulse font-black' : ''}>
                            {missingMod ? '!!! NCF REQUERIDO !!!' : (rec.modNCF || '---')}
                        </span>
                        {isNota && (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className={`text-[9px] px-2 py-1 rounded font-black transition-all shadow-sm ${missingMod ? 'bg-red-600 text-white hover:bg-red-700 animate-bounce' : 'bg-primary text-white hover:bg-primary-700 opacity-0 group-hover:opacity-100'}`}
                            >
                                {missingMod ? 'CORREGIR' : 'EDITAR'}
                            </button>
                        )}
                    </div>
                )}
            </td>
            <td className="px-3 py-2">{rec.fecha}</td>
            <td className="px-3 py-2 text-right font-bold">{formatCurrency(rec.montoTotal)}</td>
        </tr>
    );
};

const Anexo607Modal: React.FC<Anexo607ModalProps> = ({ isOpen, onClose, data, period }) => {
    const { updateFactura, updateNota, facturas, notas } = useDataStore();
    if (!isOpen || !data) return null;

    const { resumen, tipoVenta, records } = data;

    const missingModNCFCount = useMemo(() => {
        if (!records) return 0;
        return records.filter((r: any) => {
            const isNota = r.ncf?.startsWith('B04') || r.ncf?.startsWith('E34');
            return isNota && (!r.modNCF || r.modNCF === '-' || r.modNCF.trim() === '');
        }).length;
    }, [records]);

    const handleUpdateNCFMod = async (id: string, ncfMod: string) => {
        const factura = facturas.find(f => f.id === id);
        if (factura) {
            await updateFactura({ ...factura, ncfModificado: ncfMod });
            return;
        }
        const nota = notas.find(n => n.id === id);
        if (nota) {
            await updateNota({ ...nota, facturaAfectadaNCF: ncfMod });
            return;
        }
    };

    const scrollToPending = () => {
        const firstMissing = records.find((r: any) => {
            const isNota = r.ncf?.startsWith('B04') || r.ncf?.startsWith('E34');
            return isNota && (!r.modNCF || r.modNCF === '-' || r.modNCF.trim() === '');
        });
        if (firstMissing) {
            document.getElementById(`row-${firstMissing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Resumen de Ventas para 607 - Período ${formatPeriod(period)}`}
            size="5xl"
            footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
        >
            <div className="p-6 space-y-8 text-secondary-800">
                {/* Banner de Advertencia Activo */}
                {missingModNCFCount > 0 && (
                    <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between animate-fade-in ring-4 ring-red-100">
                        <div className="flex items-center">
                            <div className="bg-white/20 p-2 rounded-full mr-4">
                                <InformationCircleIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-black uppercase tracking-tight text-lg leading-none">Inconsistencia Detectada</h4>
                                <p className="text-sm text-red-100 mt-1 font-medium">Se han encontrado <span className="font-black bg-white text-red-600 px-1.5 rounded">{missingModNCFCount} Notas de Crédito</span> sin el NCF que modifican. Este dato es obligatorio para la DGII.</p>
                            </div>
                        </div>
                        <button 
                            onClick={scrollToPending}
                            className="bg-white text-red-600 px-4 py-2 rounded-md font-black text-sm hover:bg-red-50 transition-colors shadow-md uppercase tracking-wider"
                        >
                            Solicitar Comprobantes Ahora
                        </button>
                    </div>
                )}

                {/* Sección 1: Totales */}
                <div>
                    <h3 className="text-lg font-bold mb-4 pb-2 border-b border-primary-600 flex justify-between items-center">
                        <span>1. Resumen General de Operaciones</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Válido para Declaración</span>
                    </h3>
                    <div className="space-y-2 max-w-lg mx-auto">
                        <SummaryRow label="Cantidad NCFs Emitidos" value={resumen.cantidad} />
                        <SummaryRow label="Total Monto Facturado" value={resumen.montoFacturado} isBold />
                        <SummaryRow label="Total ITBIS Facturado" value={resumen.itbisFacturado} />
                        <SummaryRow label="Total ITBIS Retenido por Terceros" value={resumen.itbisRetenido} isBold />
                        <SummaryRow label="Impuesto Selectivo al Consumo" value={resumen.isc} />
                        <SummaryRow label="Total Otros Impuestos/Tasas" value={resumen.otrosImpuestos} />
                        <SummaryRow label="Total Monto Propina Legal" value={resumen.propina} />
                    </div>
                </div>

                {/* Sección 2: Formas de Pago */}
                <div>
                    <h3 className="text-sm font-black text-secondary-500 uppercase tracking-widest mb-4">2. Desglose por Formas de Pago</h3>
                    <div className="bg-secondary-50 p-4 rounded-lg border border-secondary-200 shadow-inner">
                        <table className="min-w-full">
                            <thead>
                                <tr className="text-[10px] text-secondary-400 font-black uppercase tracking-tighter">
                                    <th className="px-2 py-1 text-left">TIPO DE VENTA</th>
                                    <th className="px-2 py-1 text-right">MONTO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-200">
                                <tr><td className="px-2 py-2 text-xs font-medium">EFECTIVO</td><td className="px-2 py-2 text-right text-sm font-mono">{formatCurrency(tipoVenta.efectivo)}</td></tr>
                                <tr><td className="px-2 py-2 text-xs font-medium">CHEQUE/TRANSFERENCIA/DEPOSITO</td><td className="px-2 py-2 text-right text-sm font-mono">{formatCurrency(tipoVenta.cheque)}</td></tr>
                                <tr><td className="px-2 py-2 text-xs font-medium">TARJETA DEBITO / CREDITO</td><td className="px-2 py-2 text-right text-sm font-mono">{formatCurrency(tipoVenta.tarjeta)}</td></tr>
                                <tr className="bg-primary-50/50"><td className="px-2 py-2 text-xs font-black text-primary-800">VENTA A CREDITO</td><td className="px-2 py-2 text-right text-sm font-mono font-black text-primary-800">{formatCurrency(tipoVenta.credito)}</td></tr>
                                <tr><td className="px-2 py-2 text-xs font-medium text-secondary-400">BONOS O CERTIFICADOS</td><td className="px-2 py-2 text-right text-sm font-mono text-secondary-400">{formatCurrency(tipoVenta.bonos)}</td></tr>
                                <tr><td className="px-2 py-2 text-xs font-medium text-secondary-400">PERMUTA</td><td className="px-2 py-2 text-right text-sm font-mono text-secondary-400">{formatCurrency(tipoVenta.permuta)}</td></tr>
                                <tr><td className="px-2 py-2 text-xs font-medium text-secondary-400">OTRAS FORMAS</td><td className="px-2 py-2 text-right text-sm font-mono text-secondary-400">{formatCurrency(tipoVenta.otras)}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sección 3: Detalle de registros (Línea por Línea) */}
                <div className="group">
                    <h3 className="text-sm font-black text-secondary-500 uppercase tracking-widest mb-4">3. Detalle de Registros para el Archivo .TXT (Columnas 1-4-6)</h3>
                    <div className="overflow-x-auto border rounded-lg shadow-sm max-h-96 scrollbar-thin scrollbar-thumb-secondary-300">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-secondary-500 uppercase">RNC/Cédula (Col 1)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-secondary-500 uppercase">NCF (Col 3)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-primary-600 uppercase bg-primary-50">NCF Modificado (Col 4)</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-secondary-500 uppercase">Fecha (Col 6)</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-black text-secondary-500 uppercase">Monto Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-100 font-mono text-[11px]">
                                {records && records.length > 0 ? (
                                    records.map((rec: any) => (
                                        <DetailRowItem key={rec.id} rec={rec} onUpdate={handleUpdateNCFMod} />
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="px-3 py-8 text-center text-secondary-400 italic">No hay registros detallados para este período.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[10px] text-secondary-400 mt-2 italic">
                        * Esta tabla muestra exactamente lo que se exportará en las columnas 1, 3, 4, 6 del archivo .txt generado. Verifique que las Notas de Crédito tengan su NCF Modificado (Resaltadas en Rojo si faltan).
                    </p>
                </div>

                {/* Nota Normativa */}
                <div className="p-3 bg-blue-50 text-[11px] text-blue-800 rounded-md border border-blue-200">
                    <p className="font-bold mb-1">Nota Normativa DGII:</p>
                    El archivo .txt generado ya incluye el detalle línea por línea para NCFs de Crédito Fiscal (B01) y Notas de Crédito (B04). Las facturas de consumo (B02) se remiten de forma consolidada en el segmento de totales del formulario 607.
                </div>
            </div>
        </Modal>
    );
};

export default Anexo607Modal;