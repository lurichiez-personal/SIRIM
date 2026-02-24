import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { DownloadIcon, UserTaxIcon } from '../../components/icons/Icons.tsx';
import { useDataStore } from '../../stores/useDataStore.ts';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { generate606, generate607, generate608, generateIR3, calculate607Summary, generateAnexoAandIT1Excel, calculateAnexoAandIT1 } from '../../utils/dgiiReportUtils.ts';
import Anexo607Modal from './Anexo607Modal.tsx';
import AnexoAModal from './AnexoAModal.tsx';
import { useAlertStore } from '../../stores/useAlertStore.ts';
import Checkbox from '../../components/ui/Checkbox.tsx';
import { useTaskStore } from '../../stores/useTaskStore.ts';
import Can from '../../components/Can.tsx';
import { Permission } from '../../types.ts';
import { Link } from 'react-router-dom';

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
    const { getGastosFor606, getVentasFor607, getAnuladosFor608, getNominaForPeriodo, ingresos, cierresITBIS, clientes, empleados } = useDataStore();
    const { showAlert } = useAlertStore();
    const { addTask, updateTaskProgress, completeTask, failTask } = useTaskStore();

    const [dates, setDates] = useState<Record<string, ReportDates>>({
        '606': { start: '', end: '' },
        '607': { start: '', end: '' },
        '608': { start: '', end: '' },
        'AnexoA': { start: '', end: '' },
        'IR3': { start: '', end: '' },
    });
    const [generateAll, setGenerateAll] = useState(false);
    const [isAnexo607ModalOpen, setIsAnexo607ModalOpen] = useState(false);
    const [anexo607Data, setAnexo607Data] = useState<any>(null);
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

    const execute606 = (start: string, end: string, suppressAlerts = false) => {
        const data = getGastosFor606(start, end);
        if (data.length === 0) {
            if (!suppressAlerts) showAlert('Sin Datos', 'No hay datos para generar el Reporte 606 en el período seleccionado.');
            return false;
        }
        generate606(data, selectedTenant!.rnc, getPeriod(start));
        return true;
    };

    const execute607 = (start: string, end: string, suppressAlerts = false) => {
        const ventas = getVentasFor607(start, end);
        if (ventas.facturas.length === 0 && ventas.notas.length === 0) {
            if (!suppressAlerts) showAlert('Sin Datos', 'No hay datos para generar el Reporte 607 en el período seleccionado.');
            return false;
        }
        generate607(ventas.facturas, ventas.notas, ingresos, clientes, selectedTenant!.rnc, getPeriod(start));
        
        if (!generateAll) {
            const summaryData = calculate607Summary(ventas, ingresos, start, end);
            setAnexo607Data(summaryData);
            setIsAnexo607ModalOpen(true);
        }
        return true;
    };
    
    const execute608 = (start: string, end: string, suppressAlerts = false) => {
        const data = getAnuladosFor608(start, end);
        if (data.length === 0) {
            if (!suppressAlerts) showAlert('Sin Datos', 'No hay datos para generar el Reporte 608 en el período seleccionado.');
            return false;
        }
        generate608(data, selectedTenant!.rnc, getPeriod(start));
        return true;
    };

    const executeAnexoA = (start: string, end: string, suppressAlerts = false) => {
        const period = getPeriod(start);
        const ventasData = getVentasFor607(start, end);
        const gastosData = getGastosFor606(start, end);
        if (ventasData.facturas.length === 0 && ventasData.notas.length === 0 && gastosData.length === 0) {
            if (!suppressAlerts) showAlert('Sin Datos', 'No hay datos de ventas ni gastos para generar el IT-1 en el período seleccionado.');
            return false;
        }
        
        if (!generateAll) {
            const calculatedData = calculateAnexoAandIT1(ventasData, gastosData, cierresITBIS, selectedTenant!, period);
            setAnexoAData(calculatedData);
            setIsAnexoAModalOpen(true);
        } else {
            generateAnexoAandIT1Excel(ventasData, gastosData, cierresITBIS, selectedTenant!, period);
        }
        return true;
    };
    
    const executeIR3 = (start: string, end: string, suppressAlerts = false) => {
        const period = getPeriod(start);
        const nominaPeriod = `${start.substring(0, 4)}-${start.substring(5, 7)}`;
        const nomina = getNominaForPeriodo(nominaPeriod);
        if (!nomina) {
            if (!suppressAlerts) showAlert('Sin Datos', `No se encontró una nómina procesada para el período ${nominaPeriod}.`);
            return false;
        }
        generateIR3(nomina, empleados, selectedTenant!.rnc, period);
        return true;
    };

    const handleGenerate = (reporte: '606' | '607' | '608' | 'AnexoA' | 'IR3') => {
        if (!selectedTenant) {
            showAlert('Información', 'Por favor, seleccione una empresa.');
            return;
        }
        const { start, end } = dates[reporte];
        if (!start || !end) {
            showAlert('Información', 'Por favor, seleccione un rango de fechas válido.');
            return;
        }
        
        if (generateAll) {
            const taskId = `generate-all-${Date.now()}`;
            addTask(taskId, `Generando todos los reportes para ${getPeriod(start)}...`);

            setTimeout(() => {
                try {
                    let generatedCount = 0;
                    if (execute606(start, end, true)) generatedCount++;
                    updateTaskProgress(taskId, 20);
                    
                    if (execute607(start, end, true)) generatedCount++;
                    updateTaskProgress(taskId, 40);

                    if (execute608(start, end, true)) generatedCount++;
                    updateTaskProgress(taskId, 60);
                    
                    if (executeAnexoA(start, end, true)) generatedCount++;
                    updateTaskProgress(taskId, 80);

                    if (executeIR3(start, end, true)) generatedCount++;
                    updateTaskProgress(taskId, 100);

                    if (generatedCount > 0) {
                       completeTask(taskId, `Se generaron ${generatedCount} reportes.`);
                    } else {
                        failTask(taskId, 'No se encontraron datos para generar ningún reporte en el período seleccionado.');
                    }
                } catch (e) {
                    console.error("Error generating all reports:", e);
                    failTask(taskId, 'Ocurrió un error al generar los reportes.');
                }
            }, 100);
            
        } else {
             switch (reporte) {
                case '606': execute606(start, end); break;
                case '607': execute607(start, end); break;
                case '608': execute608(start, end); break;
                case 'AnexoA': executeAnexoA(start, end); break;
                case 'IR3': executeIR3(start, end); break;
            }
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Reportes DGII</h1>
            
            <h2 className="text-xl font-semibold text-secondary-700 mb-4">Reportes Anuales</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                 <Can I={Permission.GESTIONAR_DECLARACION_IR2}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Declaración Anual de ISR (IR-2)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-secondary-600 mb-4 h-20">
                                Asistente guiado para generar el formulario IR-2 y sus anexos principales para la declaración anual de Impuesto Sobre la Renta.
                            </p>
                            <Link to="/dashboard/reportes/ir2">
                                <Button leftIcon={<UserTaxIcon />} className="w-full">
                                    Iniciar Declaración IR-2
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </Can>
             </div>


            <h2 className="text-xl font-semibold text-secondary-700 mb-4">Reportes Mensuales</h2>
            <div className="bg-primary-50 border border-primary-200 p-4 rounded-lg mb-6 flex items-center space-x-3">
                <Checkbox id="generateAll" checked={generateAll} onChange={setGenerateAll} />
                <label htmlFor="generateAll" className="font-semibold text-primary-800 cursor-pointer select-none">
                    Generar todos los reportes mensuales para el mismo período.
                </label>
            </div>

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
                <ReporteCard 
                    title="Retenciones Asalariados (IR-3)"
                    description="Genere el archivo para el Formato IR-3 con el detalle de las retenciones de ISR aplicadas en la nómina del mes."
                    onGenerate={() => handleGenerate('IR3')}
                    dates={dates['IR3']}
                    onDateChange={(f, v) => handleDateChange('IR3', f, v)}
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
                    title="Anexo A / IT-1"
                    description="Genere un resumen preliminar del Anexo A y el formulario IT-1 para facilitar la declaración."
                    onGenerate={() => handleGenerate('AnexoA')}
                    dates={dates['AnexoA']}
                    onDateChange={(f, v) => handleDateChange('AnexoA', f, v)}
                    isTxt={false}
                />
            </div>
            {isAnexo607ModalOpen && (
                 <Anexo607Modal 
                    isOpen={isAnexo607ModalOpen}
                    onClose={() => setIsAnexo607ModalOpen(false)}
                    data={anexo607Data}
                    period={getPeriod(dates['607'].start)}
                />
            )}
            {isAnexoAModalOpen && (
                <AnexoAModal
                    isOpen={isAnexoAModalOpen}
                    onClose={() => setIsAnexoAModalOpen(false)}
                    data={anexoAData}
                />
            )}
        </div>
    );
};

export default ReportesPage;
