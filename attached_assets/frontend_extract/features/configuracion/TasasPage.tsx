import React, { useState, useEffect, useMemo } from 'react';
import { useTenantStore } from '../../stores/useTenantStore';
import { useRatesStore } from '../../stores/useRatesStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const TasasPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { getRatesForTenant, updateRates } = useRatesStore();

    const [itbis, setItbis] = useState('18');
    const [isc, setIsc] = useState('16');
    const [propina, setPropina] = useState('10');
    const [isSaved, setIsSaved] = useState(false);

    const tenantRates = useMemo(() => {
        return selectedTenant ? getRatesForTenant(selectedTenant.id) : { itbis: 0.18, isc: 0.16, propina: 0.10 };
    }, [selectedTenant, getRatesForTenant]);

    useEffect(() => {
        setItbis((tenantRates.itbis * 100).toString());
        setIsc((tenantRates.isc * 100).toString());
        setPropina((tenantRates.propina * 100).toString());
    }, [tenantRates]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenant) return;
        
        const newRates = {
            itbis: parseFloat(itbis) / 100 || 0,
            isc: parseFloat(isc) / 100 || 0,
            propina: parseFloat(propina) / 100 || 0,
        };
        
        updateRates(selectedTenant.id, newRates);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const renderInput = (label: string, value: string, setter: (val: string) => void) => (
        <div>
            <label className="block text-sm font-medium text-secondary-700">{label}</label>
            <div className="relative mt-1 rounded-md shadow-sm">
                <input
                    type="number"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="block w-full rounded-md border-secondary-300 pl-3 pr-12 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="0"
                    step="0.01"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-secondary-500 sm:text-sm">%</span>
                </div>
            </div>
        </div>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Impuestos y Tasas</h1>
            <Card className="max-w-xl">
                 <form onSubmit={handleSave}>
                    <CardHeader>
                        <CardTitle>Tasas Predeterminadas</CardTitle>
                        <p className="mt-1 text-sm text-secondary-500">
                            Configure los porcentajes que se usarán por defecto en los cálculos de facturas, cotizaciones y otros documentos.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {renderInput('ITBIS (Impuesto sobre Transferencia de Bienes Industrializados y Servicios)', itbis, setItbis)}
                        {renderInput('ISC (Impuesto Selectivo al Consumo)', isc, setIsc)}
                        {renderInput('Propina Legal', propina, setPropina)}
                    </CardContent>
                    <div className="flex items-center justify-end p-4 bg-secondary-50 border-t rounded-b-lg">
                        {isSaved && <span className="text-sm text-green-600 mr-4">¡Guardado!</span>}
                        <Button type="submit">Guardar Cambios</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default TasasPage;
