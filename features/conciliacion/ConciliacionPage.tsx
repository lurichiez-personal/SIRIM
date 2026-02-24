import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { UploadIcon } from '../../components/icons/Icons.tsx';
import { useDataStore } from '../../stores/useDataStore.ts';
import { BankTransaction, Factura, FacturaEstado, Gasto, Ingreso, MatchableRecord } from '../../types.ts';
import { parseBankStatementCSV } from '../../utils/csvParser.ts';
import { useAlertStore } from '../../stores/useAlertStore.ts';

const ConciliacionPage: React.FC = () => {
    const { facturas, gastos, ingresos, setConciliadoStatus, reconcileWithAI } = useDataStore();
    const { showAlert } = useAlertStore();

    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    setIsProcessing(true);
                    
                    const parsedTransactions = parseBankStatementCSV(content);
                    setBankTransactions(parsedTransactions);

                    const aiMatches = await reconcileWithAI(content);
                    
                    const records: MatchableRecord[] = [
                        ...ingresos.map(i => ({...i, type: 'ingreso' as const})),
                        ...gastos.map(g => ({...g, type: 'gasto' as const})),
                    ];

                    const suggestions = parsedTransactions.map(bt => {
                        const aiMatch = aiMatches.find(m => m.bank_transaction_line === bt.line);
                        let suggestedRecord = null;
                        if (aiMatch) {
                            suggestedRecord = records.find(r => r.id === aiMatch.sirim_record_id && !r.conciliado);
                        }

                        return {
                            bankTransaction: bt,
                            suggestedRecord: suggestedRecord,
                            status: suggestedRecord ? 'sugerido' : 'sin-match',
                        };
                    });

                    setMatches(suggestions);
                } catch (error) {
                    showAlert('Error al procesar el archivo', error instanceof Error ? error.message : 'Error desconocido');
                } finally {
                    setIsProcessing(false);
                }
            };
            reader.readAsText(file, 'windows-1252'); // Use correct encoding
        }
    };
    
    const handleConfirmMatch = (match: any) => {
        setConciliadoStatus(match.suggestedRecord.type, match.suggestedRecord.id, true);
        setMatches(prev => prev.map(m => m.bankTransaction.id === match.bankTransaction.id ? {...m, status: 'confirmado'} : m));
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Conciliación Bancaria con IA</h1>
                <div>
                     <Button leftIcon={<UploadIcon/>} variant="secondary" onClick={() => document.getElementById('csv-upload')?.click()} disabled={isProcessing}>
                        {isProcessing ? 'Procesando con IA...' : 'Subir Estado de Cuenta (.csv)'}
                    </Button>
                    <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleFileUpload} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transacciones a Conciliar</CardTitle>
                </CardHeader>
                <CardContent>
                    {isProcessing ? (
                         <div className="text-center py-8">
                            <svg className="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="mt-4 text-secondary-600">Analizando transacciones y buscando coincidencias con IA...</p>
                        </div>
                    ) : bankTransactions.length === 0 ? (
                        <p className="text-center text-secondary-500 py-8">Suba un estado de cuenta para comenzar la conciliación inteligente.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha Banco</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Descripción Banco</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Monto</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Sugerencia de la IA en SIRIM</th>
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
                                                        <p className="font-semibold capitalize">{match.suggestedRecord.type}: #{match.suggestedRecord.id.substring(0, 8)}...</p>
                                                        <p className="text-sm text-secondary-600">
                                                            {
                                                                match.suggestedRecord.type === 'ingreso' ? `Pago de ${match.suggestedRecord.clienteNombre}` :
                                                                match.suggestedRecord.type === 'gasto' ? `${match.suggestedRecord.descripcion}` : ''
                                                            }
                                                        </p>
                                                    </div>
                                                ) : <p className="text-secondary-500 text-xs">Sin sugerencia clara</p>}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {match.status === 'sugerido' ? (
                                                     <Button size="sm" onClick={() => handleConfirmMatch(match)}>Confirmar</Button>
                                                ) : match.status === 'confirmado' ? (
                                                    <span className="text-sm font-semibold text-green-600">Conciliado</span>
                                                ) : null}
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
