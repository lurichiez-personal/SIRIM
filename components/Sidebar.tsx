
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    DashboardIcon, ClientesIcon, FacturasIcon, GastosIcon, 
    IngresosIcon, ReportesIcon, ConfiguracionIcon, LogoIcon,
    InventarioIcon, CotizacionesIcon, DocumentDuplicateIcon
} from './icons/Icons';

const navItems = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/clientes', label: 'Clientes', icon: ClientesIcon },
  { to: '/facturas', label: 'Facturación', icon: FacturasIcon },
  { to: '/cotizaciones', label: 'Cotizaciones', icon: CotizacionesIcon },
  { to: '/notas', label: 'Notas de Crédito', icon: DocumentDuplicateIcon },
  { to: '/gastos', label: 'Gastos', icon: GastosIcon },
  { to: '/ingresos', label: 'Pagos y Cobros', icon: IngresosIcon },
  { to: '/inventario', label: 'Inventario', icon: InventarioIcon },
  { to: '/reportes', label: 'Reportes', icon: ReportesIcon },
  { to: '/configuracion', label: 'Configuración', icon: ConfiguracionIcon },
];

const Sidebar: React.FC = () => {
  const navLinkClasses = 'flex items-center px-4 py-3 text-secondary-100 hover:bg-primary-700 rounded-lg transition-colors duration-200';
  const activeNavLinkClasses = 'bg-primary-900 font-semibold';

  return (
    <aside className="w-64 bg-primary flex flex-col p-4 text-white">
      <div className="flex items-center justify-center py-4 mb-6">
        <LogoIcon className="h-8 w-8 mr-2 text-white" />
        <span className="text-2xl font-bold tracking-wider">SIRIM</span>
      </div>
      <nav className="flex-1 flex flex-col space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}
          >
            <item.icon className="h-5 w-5 mr-3" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto text-center text-xs text-primary-200">
        <p>&copy; {new Date().getFullYear()} SIRIM</p>
        <p>Todos los derechos reservados.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
