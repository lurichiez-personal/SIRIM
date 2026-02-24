import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import { BookOpenIcon, ReportesIcon, ChartPieIcon, ReceiptPercentIcon, UserTaxIcon, SparklesIcon, ArrowPathIcon } from '../../components/icons/Icons.tsx';
import Can from '../../components/Can.tsx';
import { Permission } from '../../types.ts';
import { useConfirmationStore } from '../../stores/useConfirmationStore.ts';
import { useDataStore } from '../../stores/useDataStore.ts';
import Button from '../../components/ui/Button.tsx';
import { formatCurrency } from '../../utils/formatters.ts';

interface AccountingCardProps {
    to: string;
    title: string;
    description: string;
    icon: React.ElementType;
}

const AccountingCard: React.FC<AccountingCardProps> = ({ to, title, description, icon: Icon }) => (
    <Link to={to} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
                <Icon className="h-6 w-6 text-secondary-400" />
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-secondary-600">{description}</p>
            </CardContent>
        </Card>
    </Link>
);

const ContabilidadPage: React.FC = () => {
    const { showConfirmation } = useConfirmationStore();
    const { sincronizarAsientosFaltantes, getContabilidadKpis, asientosContables } = useDataStore();
    const [isSyncing, setIsSyncing] = useState(false);

    const kpis = useMemo(() => getContabilidadKpis(), [asientosContables, getContabilidadKpis]);

    const handleSincronizar = () => {
        showConfirmation(
            'Sincronizar Asientos Contables',
            'Esta acción revisará todos los registros (facturas, gastos, etc.) y creará las entradas contables faltantes en el libro diario. Este proceso es seguro y no duplicará asientos existentes. ¿Desea continuar?',
            async () => {
                setIsSyncing(true);
                try {
                    await sincronizarAsientosFaltantes();
                } finally {
                    setIsSyncing(false);
                }
            }
        );
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Resumen de Contabilidad</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader><CardTitle>Total Activos</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-blue-600">{formatCurrency(kpis.totalActivos)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Pasivos</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-orange-600">{formatCurrency(kpis.totalPasivos)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Capital / Patrimonio</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-purple-600">{formatCurrency(kpis.totalCapital)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Beneficio / Pérdida (Período)</CardTitle></CardHeader>
                    <CardContent><p className={`text-2xl font-bold ${kpis.beneficioPerdida >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(kpis.beneficioPerdida)}</p></CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Can I={Permission.GESTIONAR_CONTABILIDAD}>
                    <AccountingCard
                        to="libro-diario"
                        title="Libro Diario"
                        description="Vea todos los asientos contables generados automáticamente por las operaciones del sistema."
                        icon={BookOpenIcon}
                    />
                </Can>
                <Can I={Permission.GESTIONAR_CATALOGO_CUENTAS}>
                    <AccountingCard
                        to="catalogo-cuentas"
                        title="Catálogo de Cuentas"
                        description="Explore el plan de cuentas contables que estructura la información financiera de su empresa."
                        icon={ReportesIcon}
                    />
                </Can>
                <Can I={Permission.VER_REPORTES_FINANCIEROS}>
                    <AccountingCard
                        to="reportes"
                        title="Reportes Financieros"
                        description="Genere el Estado de Situación y el Estado de Resultados para analizar la salud de su negocio."
                        icon={ChartPieIcon}
                    />
                </Can>
                <Can I={Permission.GESTIONAR_CIERRE_ITBIS}>
                    <AccountingCard
                        to="cierre-itbis"
                        title="Cierre Mensual de ITBIS"
                        description="Calcule y guarde el historial del ITBIS a pagar o el saldo a favor de cada período fiscal."
                        icon={ReceiptPercentIcon}
                    />
                </Can>
                <Can I={Permission.GESTIONAR_ANTICIPOS_ISR}>
                    <AccountingCard
                        to="anticipos-isr"
                        title="Anticipos ISR"
                        description="Proyecte, gestione y registre los pagos de anticipos del Impuesto Sobre la Renta."
                        icon={UserTaxIcon}
                    />
                </Can>
                <Can I={Permission.GESTIONAR_CONTABILIDAD}>
                    <Card className="h-full flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium">Herramientas Contables</CardTitle>
                            <SparklesIcon className="h-6 w-6 text-secondary-400" />
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between">
                            <p className="text-sm text-secondary-600">
                                Utilidades para mantener la integridad de los datos, como la sincronización de asientos faltantes en el libro diario.
                            </p>
                            <Button
                                onClick={handleSincronizar}
                                disabled={isSyncing}
                                leftIcon={<ArrowPathIcon className={isSyncing ? 'animate-spin' : ''} />}
                                className="mt-4 w-full"
                            >
                                {isSyncing ? 'Sincronizando...' : 'Sincronizar Asientos'}
                            </Button>
                        </CardContent>
                    </Card>
                </Can>
            </div>
        </div>
    );
};

export default ContabilidadPage;
