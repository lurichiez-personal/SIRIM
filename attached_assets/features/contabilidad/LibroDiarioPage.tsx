import React from 'react';
import { Link } from 'react-router-dom';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const LibroDiarioPage: React.FC = () => {
    const { asientosContables } = useDataStore();
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <div>
            <div className="flex items-center mb-6">
                <Link to="/contabilidad" className="text-primary hover:underline">&larr; Volver a Contabilidad</Link>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Libro Diario</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Asientos Contables</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {[...asientosContables].reverse().map(asiento => (
                            <div key={asiento.id} className="border rounded-lg overflow-hidden">
                                <div className="bg-secondary-50 p-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{asiento.descripcion}</p>
                                        <p className="text-sm text-secondary-600">
                                            Fecha: {new Date(asiento.fecha + 'T00:00:00').toLocaleDateString('es-DO')} | Ref: {asiento.transaccionId} ({asiento.transaccionTipo})
                                        </p>
                                    </div>
                                </div>
                                <table className="min-w-full text-sm">
                                    <thead className="bg-white">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-secondary-500">Cuenta</th>
                                            <th className="px-4 py-2 text-left font-medium text-secondary-500">Descripción</th>
                                            <th className="px-4 py-2 text-right font-medium text-secondary-500">Débito</th>
                                            <th className="px-4 py-2 text-right font-medium text-secondary-500">Crédito</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {asiento.entradas.map((e, index) => (
                                            <tr key={index} className="border-t">
                                                <td className="px-4 py-2 font-mono">{e.cuentaId}</td>
                                                <td className="px-4 py-2">{e.descripcion}</td>
                                                <td className="px-4 py-2 text-right font-mono">{e.debito > 0 ? formatCurrency(e.debito) : ''}</td>
                                                <td className="px-4 py-2 text-right font-mono">{e.credito > 0 ? formatCurrency(e.credito) : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-secondary-50 font-bold">
                                        <tr>
                                            <td colSpan={2} className="px-4 py-2 text-right">Totales</td>
                                            <td className="px-4 py-2 text-right font-mono border-t-2 border-secondary-300">
                                                {formatCurrency(asiento.entradas.reduce((sum, e) => sum + e.debito, 0))}
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono border-t-2 border-secondary-300">
                                                {formatCurrency(asiento.entradas.reduce((sum, e) => sum + e.credito, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ))}
                        {asientosContables.length === 0 && (
                            <p className="text-center text-secondary-500 py-8">No hay asientos contables generados.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LibroDiarioPage;
