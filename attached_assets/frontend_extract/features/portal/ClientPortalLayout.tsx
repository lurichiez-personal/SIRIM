import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useClientAuthStore } from '../../stores/useClientAuthStore';
import { useTenantStore } from '../../stores/useTenantStore';
import { LogOutIcon, DashboardIcon, FacturasIcon, CotizacionesIcon } from '../../components/icons/Icons';

interface ClientPortalLayoutProps {
  children: React.ReactNode;
}

const ClientPortalLayout: React.FC<ClientPortalLayoutProps> = ({ children }) => {
  const { clientUser, logout } = useClientAuthStore();
  const { getTenantById, fetchAvailableTenants } = useTenantStore();

  useEffect(() => {
    fetchAvailableTenants();
  }, [fetchAvailableTenants]);

  const tenant = clientUser ? getTenantById(1) : null; // Hardcoded for demo

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-primary">{tenant?.nombre} - Portal de Cliente</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-secondary-600">Bienvenido, {clientUser?.nombre}</span>
              <button onClick={logout} className="text-secondary-500 hover:text-primary"><LogOutIcon className="h-6 w-6" /></button>
            </div>
          </div>
          <nav className="flex space-x-4">
            <NavLink to="/portal" end className={({isActive}) => `py-2 px-3 text-sm font-medium ${isActive ? 'border-b-2 border-primary text-primary' : 'text-secondary-600 hover:text-primary'}`}>
                <DashboardIcon className="inline h-5 w-5 mr-1"/> Resumen
            </NavLink>
            <NavLink to="/portal/facturas" className={({isActive}) => `py-2 px-3 text-sm font-medium ${isActive ? 'border-b-2 border-primary text-primary' : 'text-secondary-600 hover:text-primary'}`}>
                <FacturasIcon className="inline h-5 w-5 mr-1"/> Facturas
            </NavLink>
             <NavLink to="/portal/cotizaciones" className={({isActive}) => `py-2 px-3 text-sm font-medium ${isActive ? 'border-b-2 border-primary text-primary' : 'text-secondary-600 hover:text-primary'}`}>
                <CotizacionesIcon className="inline h-5 w-5 mr-1"/> Cotizaciones
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default ClientPortalLayout;