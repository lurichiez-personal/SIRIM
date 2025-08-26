import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { UploadIcon } from '../../components/icons/Icons';
import { useDataStore } from '../../stores/useDataStore';
import { BankTransaction, FacturaEstado, MatchableRecord } from '../../types';
import { parseBankStatementCSV } from '../../utils/csvParser';
import { useToastStore } from '../../stores/useToastStore';

const ConciliacionPage: React.FC = () => {
    const { facturas, gastos, ingresos, setConciliadoStatus } = useDataStore();
    const { showError } = useToastStore();
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [matches, setMatches] = useState<any[]>([]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const parsed = parseBankStatementCSV(content);
                    setBankTransactions(parsed);
                    suggestMatches(parsed);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar el archivo';
                    showError(`Error al procesar el archivo: ${errorMessage}`);
                }
            };
            reader.readAsText(file);
        }
    };
    
    const suggestMatches = (transactions: BankTransaction[]) => {
        const suggestions: any[] = [];
        const records: MatchableRecord[] = [
            ...ingresos.map(i => ({...i, type: 'ingreso' as const})),
            ...gastos.map(g => ({...g, type: 'gasto' as const})),
            ...facturas
                .filter(f => f.estado !== FacturaEstado.Pagada && f.estado !== FacturaEstado.Anulada)
                .map(f => ({...f, type: 'factura' as const})),
        ];
        
        transactions.forEach(bt => {
            const potentialMatches = records.filter(r => {
                const recordMonto = r.type === 'factura' 
                    ? r.montoTotal - r.montoPagado // For invoices, match against the outstanding balance
                    : r.monto;

                // Match credits (money in) with ingresos/facturas, and debits (money out) with gastos
                if (bt.tipo === 'credito' && (r.type !== 'ingreso' && r.type !== 'factura')) return false;
                if (bt.tipo === 'debito' && r.type !== 'gasto') return false;

                return !r.conciliado &&
                       Math.abs(recordMonto - bt.monto) < 0.01 // Compare amounts with tolerance
            });
            
            if (potentialMatches.length > 0) {
                 suggestions.push({
                    bankTransaction: bt,
                    suggestedRecord: potentialMatches[0],
                    status: 'sugerido',
                });
            }
        });
        setMatches(suggestions);
    };

    const handleConfirmMatch = (match: any) => {
        setConciliadoStatus(match.suggestedRecord.type, match.suggestedRecord.id, true);
        setMatches(prev => prev.map(m => m.bankTransaction.id === match.bankTransaction.id ? {...m, status: 'confirmado'} : m));
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Conciliación Bancaria</h1>
                <div>
                     <Button leftIcon={<UploadIcon/>} variant="secondary" onClick={() => document.getElementById('csv-upload')?.click()}>
                        Subir Estado de Cuenta (.csv)
                    </Button>
                    <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleFileUpload} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transacciones a Conciliar</CardTitle>
                </CardHeader>
                <CardContent>
                    {bankTransactions.length === 0 ? (
                        <p className="text-center text-secondary-500 py-8">Suba un estado de cuenta para comenzar.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha Banco</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Descripción Banco</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Monto</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Registro Sugerido en SIRIM</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {matches.map(match => (
                                        <tr key={match.bankTransaction.id}>
                                            <td className="px-4 py-4">{new Date(match.bankTransaction.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</td>
                                            <td className="px-4 py-4">{match.bankTransaction.descripcion}</td>
                                            <td className={`px-4 py-4 text-right font-semibold ${match.bankTransaction.tipo === 'credito' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(match.bankTransaction.monto)}</td>
                                            <td className="px-4 py-4">
                                                {match.suggestedRecord ? (
                                                    <div>
                                                        <p className="font-semibold capitalize">{match.suggestedRecord.type}: #{match.suggestedRecord.id}</p>
                                                        <p className="text-sm text-secondary-600">
                                                            {
                                                                match.suggestedRecord.type === 'ingreso' ? `Pago de ${match.suggestedRecord.clienteNombre}` :
                                                                match.suggestedRecord.type === 'gasto' ? `Gasto a ${match.suggestedRecord.proveedorNombre}` :
                                                                match.suggestedRecord.type === 'factura' ? `Factura a ${match.suggestedRecord.clienteNombre}` : ''
                                                            }
                                                        </p>
                                                    </div>
                                                ) : <p className="text-secondary-500">Sin sugerencia</p>}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {match.status === 'sugerido' ? (
                                                     <Button size="sm" onClick={() => handleConfirmMatch(match)}>Confirmar</Button>
                                                ) : (
                                                    <span className="text-sm font-semibold text-green-600">Conciliado</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ConciliacionPage;