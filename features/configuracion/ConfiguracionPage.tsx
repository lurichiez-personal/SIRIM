
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FacturasIcon, UserCircleIcon, ClientesIcon, DocumentDuplicateIcon } from '../../components/icons/Icons';

interface SettingCardProps {
    to: string;
    title: string;
    description: string;
    icon: React.ElementType;
}

const SettingCard: React.FC<SettingCardProps> = ({ to, title, description, icon: Icon }) => (
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


const ConfiguracionPage: React.FC = () => {
  return (
    <div>
        <h1 className="text-3xl font-bold text-secondary-800 mb-6">Configuración</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <SettingCard
                to="/configuracion/ncf"
                title="Gestión de Secuencias NCF"
                description="Añada y administre las secuencias de comprobantes fiscales aprobadas por la DGII para su uso en facturación."
                icon={FacturasIcon}
            />
             <SettingCard
                to="/configuracion/personalizacion"
                title="Personalización de Plantillas"
                description="Suba el logo de su empresa, elija un color de acento y personalice el pie de página de sus facturas y cotizaciones."
                icon={ClientesIcon}
            />
            <SettingCard
                to="/configuracion/facturacion-recurrente"
                title="Facturación Recurrente"
                description="Configure facturas automáticas para clientes con pagos recurrentes, como igualas o suscripciones mensuales."
                icon={DocumentDuplicateIcon}
            />
            <SettingCard
                to="#"
                title="Gestión de Usuarios (Próximamente)"
                description="Invite y asigne roles a los miembros de su equipo para controlar el acceso a la aplicación."
                icon={UserCircleIcon}
            />
        </div>
    </div>
  );
};

export default ConfiguracionPage;
