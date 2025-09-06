
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FacturasIcon, UserCircleIcon, ClientesIcon, DocumentDuplicateIcon, ConfiguracionIcon, ReceiptPercentIcon, BuildingStorefrontIcon } from '../../components/icons/Icons';
import { Permission } from '../../types';
import Can from '../../components/Can';

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
            <Can I={Permission.GESTIONAR_EMPRESAS}>
                 <SettingCard
                    to="/configuracion/empresas"
                    title="Gestión de Empresas"
                    description="Cree y administre las empresas disponibles en el sistema."
                    icon={BuildingStorefrontIcon}
                />
            </Can>
            <SettingCard
                to="/configuracion/ncf"
                title="Gestión de Secuencias NCF"
                description="Añada y administre las secuencias de comprobantes fiscales aprobadas por la DGII."
                icon={FacturasIcon}
            />
             <SettingCard
                to="/configuracion/personalizacion"
                title="Personalización de Plantillas"
                description="Suba el logo de su empresa, elija un color de acento y personalice sus documentos."
                icon={ClientesIcon}
            />
            <Can I={Permission.GESTIONAR_EMPRESAS}>
                <SettingCard
                    to="/configuracion/precios"
                    title="Configuración de Precios"
                    description="Administre los precios de planes y módulos adicionales del sistema."
                    icon={ReceiptPercentIcon}
                />
            </Can>
            <Can I={Permission.GESTIONAR_EMPRESAS}>
                <SettingCard
                    to="/configuracion/landing"
                    title="Configuración del Landing Page"
                    description="Edite el contenido y textos de la página principal de marketing."
                    icon={DocumentDuplicateIcon}
                />
            </Can>
            <SettingCard
                to="/configuracion/facturacion-recurrente"
                title="Facturación Recurrente"
                description="Configure facturas automáticas para clientes con pagos recurrentes."
                icon={DocumentDuplicateIcon}
            />
            <Can I={Permission.GESTIONAR_CONFIGURACION_EMPRESA}>
                 <SettingCard
                    to="/configuracion/tasas"
                    title="Impuestos y Tasas"
                    description="Configure las tasas de impuestos como ITBIS, ISC y la propina legal."
                    icon={ReceiptPercentIcon}
                />
            </Can>
            <Can I={Permission.GESTIONAR_USUARIOS}>
                <SettingCard
                    to="/configuracion/usuarios"
                    title="Gestión de Usuarios"
                    description="Invite, cree y asigne roles a los miembros de su equipo para controlar el acceso."
                    icon={UserCircleIcon}
                />
            </Can>
             <Can I={Permission.GESTIONAR_ROLES}>
                <SettingCard
                    to="/configuracion/roles"
                    title="Gestión de Roles y Permisos"
                    description="Defina qué puede hacer cada rol en la aplicación con permisos granulares."
                    icon={ConfiguracionIcon}
                />
            </Can>
        </div>
    </div>
  );
};

export default ConfiguracionPage;