import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { DownloadIcon } from '../../components/icons/Icons';
import { useDataStore } from '../../stores/useDataStore';
import { useTenantStore } from '../../stores/useTenantStore';
import { generate606, generate607, generate608, calculateAnexoA } from '../../utils/dgiiReportUtils';
import AnexoAModal from './AnexoAModal';
import { Gasto, Factura, NotaCreditoDebito } from '../../types';

interface ReportDates {
    start: string;
    end: string;
}

const ReporteCard: React.FC<{ title: string, description: string, onGenerate: () => void, dates: ReportDates, onDateChange: (field: 'start' | 'end', value: string) => void, isTxt: boolean }> = 
({ title, description, onGenerate, dates, onDateChange, isTxt }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-secondary-600 mb-4 h-20">
                {description}
            </p>
            <div className="flex items-center space-x-4">
                <div className="flex-1">
                    <label className="text-xs text-secondary-500">Desde</label>
                    <input type="date" value={dates.start} onChange={e => onDateChange('start', e.target.value)} className="w-full border-secondary-300 rounded-md shadow-sm text-sm p-2"/>
                </div>
                <div className="flex-1">
                    <label className="text-xs text-secondary-500">Hasta</label>
                    <input type="date" value={dates.end} onChange={e => onDateChange('end', e.target.value)} className="w-full border-secondary-300 rounded-md shadow-sm text-sm p-2"/>
                </div>
            </div>
             <div className="mt-4">
                <Button onClick={onGenerate} leftIcon={<DownloadIcon />} className="w-full" disabled={!dates.start || !dates.end}>
                    {isTxt ? 'Generar y Descargar .txt' : 'Generar Vista Previa'}
                </Button>
            </div>
        </CardContent>
    </Card>
);


const ReportesPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { getGastosFor606, getVentasFor607, getAnuladosFor608 } = useDataStore();
    const [dates, setDates] = useState<Record<string, ReportDates>>({
        '606': { start: '', end: '' },
        '607': { start: '', end: '' },
        '608': { start: '', end: '' },
        'AnexoA': { start: '', end: '' },
    });
    const [isAnexoAModalOpen, setIsAnexoAModalOpen] = useState(false);
    const [anexoAData, setAnexoAData] = useState<any>(null);

    const handleDateChange = (reportKey: string, field: 'start' | 'end', value: string) => {
        setDates(prev => ({
            ...prev,
            [reportKey]: { ...prev[reportKey], [field]: value }
        }));
    };
    
    const getPeriod = (startDate: string) => {
        const date = new Date(startDate + 'T00:00:00');
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}${month}`;
    };

    const handleGenerate = (reporte: '606' | '607' | '608' | 'AnexoA') => {
        if (!selectedTenant) {
            alert('Por favor, seleccione una empresa.');
            return;
        }
        const { start, end } = dates[reporte];
        if (!start || !end) {
            alert('Por favor, seleccione un rango de fechas válido.');
            return;
        }
        
        const period = getPeriod(start);
        const rnc = selectedTenant.rnc;

        switch (reporte) {
            case '606': {
                const data = getGastosFor606(start, end);
                generate606(data, rnc, period);
                break;
            }
            case '607': {
                const { facturas, notas } = getVentasFor607(start, end);
                generate607(facturas, notas, rnc, period);
                break;
            }
            case '608': {
                const data = getAnuladosFor608(start, end);
                generate608(data, rnc, period);
                break;
            }
            case 'AnexoA': {
                const ventas = getVentasFor607(start, end);
                const gastos = getGastosFor606(start, end);
                const data = calculateAnexoA(ventas, gastos);
                setAnexoAData(data);
                setIsAnexoAModalOpen(true);
                break;
            }
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Reportes DGII</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ReporteCard 
                    title="Compras de Bienes y Servicios (606)"
                    description="Genere el archivo para el Formato 606 (Anexo A del IT-1) a partir de los gastos registrados con NCF."
                    onGenerate={() => handleGenerate('606')}
                    dates={dates['606']}
                    onDateChange={(f, v) => handleDateChange('606', f, v)}
                    isTxt
                />
                <ReporteCard 
                    title="Ventas de Bienes y Servicios (607)"
                    description="Genere el archivo para el Formato 607 a partir de las facturas de crédito fiscal, de consumo, notas de crédito y débito."
                    onGenerate={() => handleGenerate('607')}
                    dates={dates['607']}
                    onDateChange={(f, v) => handleDateChange('607', f, v)}
                    isTxt
                />
                <ReporteCard 
                    title="Comprobantes Anulados (608)"
                    description="Genere el archivo para el Formato 608 con el detalle de todos los NCF que fueron anulados en el período."
                    onGenerate={() => handleGenerate('608')}
                    dates={dates['608']}
                    onDateChange={(f, v) => handleDateChange('608', f, v)}
                    isTxt
                />
                 <Card>
                    <CardHeader><CardTitle>Pagos por Terceros (609)</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-secondary-600 mb-4 h-20">
                           Funcionalidad para registrar y reportar pagos realizados por cuenta de terceros.
                        </p>
                        <Button disabled className="w-full">Próximamente</Button>
                    </CardContent>
                </Card>
                 <ReporteCard 
                    title="Anexo A / IT-1 (Vista Previa)"
                    description="Genere una vista previa del Anexo A y el IT-1 con los datos calculados para facilitar la declaración."
                    onGenerate={() => handleGenerate('AnexoA')}
                    dates={dates['AnexoA']}
                    onDateChange={(f, v) => handleDateChange('AnexoA', f, v)}
                    isTxt={false}
                />
            </div>
            {isAnexoAModalOpen && (
                <AnexoAModal 
                    isOpen={isAnexoAModalOpen}
                    onClose={() => setIsAnexoAModalOpen(false)}
                    data={anexoAData}
                    period={getPeriod(dates.AnexoA.start)}
                />
            )}
        </div>
    );
};

export default ReportesPage;