import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpenIcon, ReportesIcon, ChartPieIcon } from '../../components/icons/Icons';
import Can from '../../components/Can';
import { Permission } from '../../types';

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
    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Módulo de Contabilidad</h1>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Can I={Permission.GESTIONAR_CONTABILIDAD}>
                    <AccountingCard
                        to="/contabilidad/libro-diario"
                        title="Libro Diario"
                        description="Vea todos los asientos contables generados automáticamente por las operaciones del sistema."
                        icon={BookOpenIcon}
                    />
                </Can>
                <Can I={Permission.GESTIONAR_CATALOGO_CUENTAS}>
                    <AccountingCard
                        to="/contabilidad/catalogo-cuentas"
                        title="Catálogo de Cuentas"
                        description="Explore el plan de cuentas contables que estructura la información financiera de su empresa."
                        icon={ReportesIcon}
                    />
                </Can>
                <Can I={Permission.VER_REPORTES_FINANCIEROS}>
                    <AccountingCard
                        to="/contabilidad/reportes"
                        title="Reportes Financieros"
                        description="Genere el Estado de Situación y el Estado de Resultados para analizar la salud de su negocio."
                        icon={ChartPieIcon}
                    />
                </Can>
            </div>
        </div>
    );
};

export default ContabilidadPage;
