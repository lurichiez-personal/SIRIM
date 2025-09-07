
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Permission } from '../types';
import Can from './Can';
import { useAuthStore } from '../stores/useAuthStore';
import { 
    DashboardIcon, ClientesIcon, FacturasIcon, GastosIcon, 
    IngresosIcon, ReportesIcon, ConfiguracionIcon, LogoIcon,
    InventarioIcon, CotizacionesIcon, DocumentDuplicateIcon, ScaleIcon,
    UsersGroupIcon, BookOpenIcon, ChevronDownIcon, ChartPieIcon, ClockIcon
} from './icons/Icons';
import { useUIStore } from '../stores/useUIStore';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface NavItem {
    to: string;
    label: string;
    icon: React.ElementType;
    permission: Permission;
    children?: Omit<NavItem, 'permission' | 'children'>[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon, permission: Permission.VER_DASHBOARD },
  { to: '/dashboard/clientes', label: 'Clientes', icon: ClientesIcon, permission: Permission.GESTIONAR_CLIENTES },
  { to: '/dashboard/facturas', label: 'Facturación', icon: FacturasIcon, permission: Permission.GESTIONAR_FACTURAS },
  { to: '/dashboard/cotizaciones', label: 'Cotizaciones', icon: CotizacionesIcon, permission: Permission.GESTIONAR_COTIZACIONES },
  { to: '/dashboard/notas', label: 'Notas de Crédito', icon: DocumentDuplicateIcon, permission: Permission.GESTIONAR_NOTAS },
  { to: '/dashboard/gastos', label: 'Gastos', icon: GastosIcon, permission: Permission.GESTIONAR_GASTOS },
  { to: '/dashboard/ingresos', label: 'Pagos y Cobros', icon: IngresosIcon, permission: Permission.GESTIONAR_PAGOS },
  { to: '/dashboard/cuentas-por-cobrar', label: 'Cuentas por Cobrar', icon: IngresosIcon, permission: Permission.GESTIONAR_PAGOS },
  { to: '/dashboard/inventario', label: 'Inventario', icon: InventarioIcon, permission: Permission.GESTIONAR_INVENTARIO },
  { 
    to: '/dashboard/nomina', 
    label: 'Nómina', 
    icon: UsersGroupIcon, 
    permission: Permission.GESTIONAR_NOMINA,
    children: [
        { to: '/dashboard/nomina', label: 'Empleados', icon: UsersGroupIcon },
        { to: '/dashboard/nomina/historial', label: 'Historial de Nóminas', icon: ClockIcon },
    ]
  },
  { 
    to: '/dashboard/contabilidad', 
    label: 'Contabilidad', 
    icon: BookOpenIcon, 
    permission: Permission.GESTIONAR_CONTABILIDAD,
    children: [
        { to: '/dashboard/contabilidad/libro-diario', label: 'Libro Diario', icon: BookOpenIcon },
        { to: '/dashboard/contabilidad/catalogo-cuentas', label: 'Catálogo de Cuentas', icon: ReportesIcon },
        { to: '/dashboard/contabilidad/reportes', label: 'Reportes Financieros', icon: ChartPieIcon },
    ]
  },
  { to: '/dashboard/conciliacion', label: 'Conciliación', icon: ScaleIcon, permission: Permission.GESTIONAR_CONCILIACION },
  { to: '/dashboard/reportes', label: 'Reportes DGII', icon: ReportesIcon, permission: Permission.VER_REPORTES_DGII },
  { to: '/dashboard/billing', label: 'Mi Suscripción', icon: ChartPieIcon, permission: Permission.VER_DASHBOARD },
  { to: '/dashboard/configuracion', label: 'Configuración', icon: ConfiguracionIcon, permission: Permission.GESTIONAR_CONFIGURACION_EMPRESA },
];

// Elementos específicos para usuario master
const masterNavItems: NavItem[] = [
  { to: '/dashboard/master', label: '👑 Panel Master', icon: DashboardIcon, permission: Permission.GESTIONAR_EMPRESAS },
  { to: '/dashboard/master/config', label: '⚙️ Config Master', icon: ConfiguracionIcon, permission: Permission.GESTIONAR_EMPRESAS },
];

const NavItemLink: React.FC<{ item: Omit<NavItem, 'permission'>, isSubmenu?: boolean }> = ({ item, isSubmenu = false }) => {
    const { closeSidebar } = useUIStore();
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    const navLinkClasses = `flex items-center w-full px-4 py-3 text-secondary-100 hover:bg-primary-700 rounded-lg transition-colors duration-200 ${isSubmenu ? 'pl-11' : ''}`;
    const activeNavLinkClasses = 'bg-primary-900 font-semibold';
    
    const handleClick = () => {
        if (isMobile) {
            closeSidebar();
        }
    };
    
    return (
         <NavLink
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}
            onClick={handleClick}
        >
            <item.icon className="h-5 w-5 mr-3" />
            <span>{item.label}</span>
        </NavLink>
    );
};

const Sidebar: React.FC = () => {
  const { isSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState<{[key: string]: boolean}>(() => {
      const activeMenu = navItems.find(item => item.children?.some(child => location.pathname.startsWith(child.to)));
      return activeMenu ? { [activeMenu.to]: true } : {};
  });

  const toggleSubmenu = (to: string) => {
      setOpenSubmenus(prev => ({...prev, [to]: !prev[to]}));
  }
  
  return (
    <aside className={`absolute md:relative inset-y-0 left-0 w-64 bg-primary flex flex-col p-4 text-white transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-40`}>
      <div className="flex items-center justify-center py-4 mb-6">
        <LogoIcon className="h-8 w-8 mr-2 text-white" />
        <span className="text-2xl font-bold tracking-wider">SIRIM</span>
      </div>
      <nav className="flex-1 flex flex-col space-y-2">
        {navItems.map(item => (
          <Can key={item.to} I={item.permission}>
            {item.children ? (
                <div>
                    <button onClick={() => toggleSubmenu(item.to)} className="flex items-center justify-between w-full px-4 py-3 text-secondary-100 hover:bg-primary-700 rounded-lg transition-colors duration-200">
                        <div className="flex items-center">
                            <item.icon className="h-5 w-5 mr-3" />
                            <span>{item.label}</span>
                        </div>
                        <ChevronDownIcon className={`h-5 w-5 transition-transform ${openSubmenus[item.to] ? 'rotate-180' : ''}`} />
                    </button>
                    {openSubmenus[item.to] && (
                        <div className="mt-1 space-y-1">
                            {item.children.map(child => <NavItemLink key={child.to} item={child} isSubmenu />)}
                        </div>
                    )}
                </div>
            ) : (
                <NavItemLink item={item} />
            )}
          </Can>
        ))}
        
        {/* Panel Master - Solo para lurichiez@gmail.com */}
        {user?.email === 'lurichiez@gmail.com' && (
          <div className="mt-4 pt-4 border-t border-primary-600">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary-300 uppercase tracking-wider px-4 py-1">
                👑 Master Panel
              </p>
            </div>
            <NavLink
              to="/dashboard/master"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-secondary-100 hover:bg-primary-700 rounded-lg transition-colors duration-200 ${
                  isActive ? 'bg-primary-900 font-semibold' : ''
                }`
              }
            >
              <DashboardIcon className="h-5 w-5 mr-3" />
              <span>Panel Master</span>
            </NavLink>
            <NavLink
              to="/dashboard/master/config"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-secondary-100 hover:bg-primary-700 rounded-lg transition-colors duration-200 ${
                  isActive ? 'bg-primary-900 font-semibold' : ''
                }`
              }
            >
              <ConfiguracionIcon className="h-5 w-5 mr-3" />
              <span>Configuración Master</span>
            </NavLink>
          </div>
        )}
      </nav>
      <div className="mt-auto text-center text-xs text-primary-200">
        <p>&copy; {new Date().getFullYear()} SIRIM</p>
        <p>Todos los derechos reservados.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
