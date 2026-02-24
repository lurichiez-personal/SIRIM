
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore.ts';
import { useClientAuthStore } from './stores/useClientAuthStore.ts';

// Main App
import Layout from './components/Layout.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import LoginPage from './features/auth/LoginPage.tsx';
import ChangePasswordPage from './features/auth/ChangePasswordPage.tsx';
import DashboardPage from './features/dashboard/DashboardPage.tsx';
import ClientesPage from './features/clientes/ClientesPage.tsx';
import FacturasPage from './features/facturas/FacturasPage.tsx';
import GastosPage from './features/gastos/GastosPage.tsx';
import CobrosPage from './features/ingresos/IngresosPage.tsx';
import PagosPage from './features/pagos/PagosPage.tsx';
import InventarioPage from './features/inventario/InventarioPage.tsx';
import ReportesPage from './features/reportes/ReportesPage.tsx';
import ConfiguracionPage from './features/configuracion/ConfiguracionPage.tsx';
import CotizacionesPage from './features/cotizaciones/CotizacionesPage.tsx';
import NCFPage from './features/configuracion/NCFPage.tsx';
import NotasPage from './features/notas/NotasPage.tsx';
import PersonalizacionPage from './features/configuracion/PersonalizacionPage.tsx';
import FacturacionRecurrentePage from './features/configuracion/FacturacionRecurrentePage.tsx';
import ConciliacionPage from './features/conciliacion/ConciliacionPage.tsx';
import RolesPage from './features/configuracion/RolesPage.tsx';
import GestionUsuariosPage from './features/configuracion/GestionUsuariosPage.tsx';
import TasasPage from './features/configuracion/TasasPage.tsx';
import GestionEmpresasPage from './features/configuracion/GestionEmpresasPage.tsx';
import NominaPage from './features/nomina/NominaPage.tsx';
import ContabilidadPage from './features/contabilidad/ContabilidadPage.tsx';
import LibroDiarioPage from './features/contabilidad/LibroDiarioPage.tsx';
import CatalogoCuentasPage from './features/contabilidad/CatalogoCuentasPage.tsx';
import ReportesContablesPage from './features/contabilidad/ReportesContablesPage.tsx';
import HistorialNominaPage from './features/nomina/HistorialNominaPage.tsx';
import AuditarNominaPage from './features/nomina/AuditarNominaPage.tsx';
import MarketingPage from './features/configuracion/MarketingPage.tsx';
import RNCManagementPage from './features/configuracion/RNCManagementPage.tsx';
import CierreITBISPage from './features/contabilidad/CierreITBISPage.tsx';
import CredencialesPage from './features/configuracion/CredencialesPage.tsx';
import AnticiposISRPage from './features/contabilidad/AnticiposISRPage.tsx';
import DeclaracionIR2Page from './features/reportes/DeclaracionIR2Page.tsx';

// Client Portal
import ClientPortalLayout from './features/portal/ClientPortalLayout.tsx';
import ClientPortalLoginPage from './features/portal/ClientPortalLoginPage.tsx';
import PortalDashboardPage from './features/portal/PortalDashboardPage.tsx';
import PortalFacturasPage from './features/portal/PortalFacturasPage.tsx';
import PortalCotizacionesPage from './features/portal/PortalCotizacionesPage.tsx';

// Public Landing
import LandingLayout from './features/landing/LandingLayout.tsx';
import HomePage from './features/landing/HomePage.tsx';
import PreciosPage from './features/landing/PreciosPage.tsx';
import RegistroPage from './features/auth/RegistroPage.tsx';
import { LogoIcon } from './components/icons/Icons.tsx';
import { useMarketingStore } from './stores/useMarketingStore.ts';
import { usePermissionsStore } from './stores/usePermissionsStore.ts';
import { Permission } from './types.ts';

function App(): React.ReactNode {
  const { isAuthenticated, isLoading, forcePasswordChange, user } = useAuthStore();
  const { isClientAuthenticated } = useClientAuthStore();
  
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user && usePermissionsStore.getState().hasPermission(user.roles, Permission.GESTIONAR_MARKETING)) {
        unsubscribe = useMarketingStore.getState().subscribeToMarketingContent();
    }
    return () => {
        if (unsubscribe) {
            unsubscribe(); 
        }
    };
  }, [user]); 

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-secondary-50">
        <div className="flex flex-col items-center">
          <LogoIcon className="h-16 w-16 text-primary animate-pulse" />
          <p className="mt-4 text-lg text-secondary-600">Cargando SIRIM...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && forcePasswordChange) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="*" element={<Navigate to="/change-password" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<LandingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/precios" element={<PreciosPage />} />
          <Route path="/registro" element={<RegistroPage />} />
        </Route>
        
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        
        <Route path="/portal/login" element={isClientAuthenticated ? <Navigate to="/portal" /> : <ClientPortalLoginPage />} />
        <Route path="/portal/*" element={isClientAuthenticated ? (
            <ClientPortalLayout>
              <Routes>
                <Route path="/" element={<PortalDashboardPage />} />
                <Route path="facturas" element={<PortalFacturasPage />} />
                <Route path="cotizaciones" element={<PortalCotizacionesPage />} />
                <Route path="*" element={<Navigate to="/portal" />} />
              </Routes>
            </ClientPortalLayout>
          ) : (
            <Navigate to="/portal/login" />
          )
        } />

        <Route 
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/dashboard/clientes" element={<ClientesPage />} />
                  <Route path="/dashboard/facturas" element={<FacturasPage />} />
                  <Route path="/dashboard/cotizaciones" element={<CotizacionesPage />} />
                  <Route path="/dashboard/notas" element={<NotasPage />} />
                  <Route path="/dashboard/gastos" element={<GastosPage />} />
                  <Route path="/dashboard/cobros" element={<CobrosPage />} />
                  <Route path="/dashboard/pagos" element={<PagosPage />} />
                  <Route path="/dashboard/inventario" element={<InventarioPage />} />
                  <Route path="/dashboard/reportes" element={<ReportesPage />} />
                  <Route path="/dashboard/reportes/ir2" element={<DeclaracionIR2Page />} />
                  <Route path="/dashboard/conciliacion" element={<ConciliacionPage />} />
                  <Route path="/dashboard/nomina" element={<NominaPage />} />
                  <Route path="/dashboard/nomina/historial" element={<HistorialNominaPage />} />
                  <Route path="/dashboard/nomina/auditar/:nominaId" element={<AuditarNominaPage />} />
                  <Route path="/dashboard/contabilidad" element={<ContabilidadPage />} />
                  <Route path="/dashboard/contabilidad/libro-diario" element={<LibroDiarioPage />} />
                  <Route path="/dashboard/contabilidad/catalogo-cuentas" element={<CatalogoCuentasPage />} />
                  <Route path="/dashboard/contabilidad/reportes" element={<ReportesContablesPage />} />
                  <Route path="/dashboard/contabilidad/cierre-itbis" element={<CierreITBISPage />} />
                  <Route path="/dashboard/contabilidad/anticipos-isr" element={<AnticiposISRPage />} />
                  <Route path="/dashboard/configuracion" element={<ConfiguracionPage />} />
                  <Route path="/dashboard/configuracion/ncf" element={<NCFPage />} />
                  <Route path="/dashboard/configuracion/personalizacion" element={<PersonalizacionPage />} />
                  <Route path="/dashboard/configuracion/facturacion-recurrente" element={<FacturacionRecurrentePage />} />
                  <Route path="/dashboard/configuracion/roles" element={<RolesPage />} />
                  <Route path="/dashboard/configuracion/usuarios" element={<GestionUsuariosPage />} />
                  <Route path="/dashboard/configuracion/tasas" element={<TasasPage />} />
                  <Route path="/dashboard/configuracion/empresas" element={<GestionEmpresasPage />} />
                  <Route path="/dashboard/configuracion/marketing" element={<MarketingPage />} />
                  <Route path="/dashboard/configuracion/rnc" element={<RNCManagementPage />} />
                  <Route path="/dashboard/configuracion/credenciales" element={<CredencialesPage />} />
                  <Route path="/*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
