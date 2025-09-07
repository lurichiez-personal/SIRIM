
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useClientAuthStore } from './stores/useClientAuthStore';
import SmartRedirect from './components/SmartRedirect';

// Main App
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import { 
  DashboardPageLazy,
  ClientesPageLazy,
  FacturasPageLazy,
  CotizacionesPageLazy,
  GastosPageLazy,
  IngresosPageLazy,
  InventarioPageLazy,
  ReportesPageLazy,
  ConfiguracionPageLazy,
  ConciliacionPageLazy,
  NominaPageLazy,
  ContabilidadPageLazy,
  CuentasPorCobrarPageLazy,
  NotasPageLazy,
  LazyNCFPage,
  LazyPersonalizacionPage,
  LazyFacturacionRecurrentePage,
  LazyRolesPage,
  LazyGestionUsuariosPage,
  LazyTasasPage,
  LazyGestionEmpresasPage,
  LazyMarketingPage,
  LazyHistorialNominaPage,
  LazyAuditarNominaPage,
  LazyLibroDiarioPage,
  LazyCatalogoCuentasPage,
  LazyReportesContablesPage,
  LazyBackupPage,
  LazyDGIIReportsPage,
  LazyMicrosoftCallbackPage,
  LazyMicrosoftConfigPage,
  LazyMetasVentasPage,
  LazyBillingPage,
  LazyCheckoutPage,
  withLazyLoading
} from './components/LazyComponents';

// Master Dashboard - importación directa ya que no está en LazyComponents
const MasterDashboardLazy = React.lazy(() => import('./features/master/MasterDashboard'));
const MasterConfigPageLazy = React.lazy(() => import('./features/master/MasterConfigPage'));

// Client Portal
import ClientPortalLayout from './features/portal/ClientPortalLayout';
import ClientPortalLoginPage from './features/portal/ClientPortalLoginPage';
import { LazyPortalDashboardPage, LazyPortalFacturasPage, LazyPortalCotizacionesPage } from './components/LazyComponents';

// Public Landing
import LandingLayout from './features/landing/LandingLayout';
import { LazyHomePage, LazyPreciosPage, LazyRegistroPage } from './components/LazyComponents';

function App(): React.ReactNode {
  const { isAuthenticated } = useAuthStore();
  const { isClientAuthenticated } = useClientAuthStore();

  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<LandingLayout />}>
          <Route path="/" element={<LazyHomePage />} />
          <Route path="/precios" element={<LazyPreciosPage />} />
          <Route path="/registro" element={<LazyRegistroPage />} />
          <Route path="/checkout" element={<LazyCheckoutPage />} />
        </Route>
        
        {/* Auth Routes */}
        <Route path="/login" element={isAuthenticated ? <SmartRedirect /> : <LoginPage />} />
        
        {/* Master Redirect Route - redirect to dashboard/master */}
        <Route path="/master" element={<Navigate to="/dashboard/master" />} />
        
        <Route path="/auth/microsoft/callback" element={<LazyMicrosoftCallbackPage />} />
        
        {/* Client Portal Routes */}
        <Route path="/portal/login" element={isClientAuthenticated ? <Navigate to="/portal" /> : <ClientPortalLoginPage />} />
        <Route path="/portal/*" element={isClientAuthenticated ? (
            <ClientPortalLayout>
              <Routes>
                <Route path="/" element={<LazyPortalDashboardPage />} />
                <Route path="facturas" element={<LazyPortalFacturasPage />} />
                <Route path="cotizaciones" element={<LazyPortalCotizacionesPage />} />
                <Route path="*" element={<Navigate to="/portal" />} />
              </Routes>
            </ClientPortalLayout>
          ) : (
            <Navigate to="/portal/login" />
          )
        } />

        {/* Main App Routes */}
        <Route 
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPageLazy />} />
                  <Route path="clientes" element={<ClientesPageLazy />} />
                  <Route path="facturas" element={<FacturasPageLazy />} />
                  <Route path="cotizaciones" element={<CotizacionesPageLazy />} />
                  <Route path="notas" element={<NotasPageLazy />} />
                  <Route path="gastos" element={<GastosPageLazy />} />
                  <Route path="ingresos" element={<IngresosPageLazy />} />
                  <Route path="cuentas-por-cobrar" element={<CuentasPorCobrarPageLazy />} />
                  <Route path="inventario" element={<InventarioPageLazy />} />
                  <Route path="reportes" element={<ReportesPageLazy />} />
                  <Route path="reportes/dgii" element={<LazyDGIIReportsPage />} />
                  <Route path="conciliacion" element={<ConciliacionPageLazy />} />
                  <Route path="nomina" element={<NominaPageLazy />} />
                  <Route path="nomina/historial" element={<LazyHistorialNominaPage />} />
                  <Route path="nomina/auditar/:nominaId" element={<LazyAuditarNominaPage />} />
                  <Route path="contabilidad" element={<ContabilidadPageLazy />} />
                  <Route path="contabilidad/libro-diario" element={<LazyLibroDiarioPage />} />
                  <Route path="contabilidad/catalogo-cuentas" element={<LazyCatalogoCuentasPage />} />
                  <Route path="contabilidad/reportes" element={<LazyReportesContablesPage />} />
                  <Route path="configuracion" element={<ConfiguracionPageLazy />} />
                  <Route path="configuracion/ncf" element={<LazyNCFPage />} />
                  <Route path="configuracion/personalizacion" element={<LazyPersonalizacionPage />} />
                  <Route path="configuracion/facturacion-recurrente" element={<LazyFacturacionRecurrentePage />} />
                  <Route path="configuracion/roles" element={<LazyRolesPage />} />
                  <Route path="configuracion/usuarios" element={<LazyGestionUsuariosPage />} />
                  <Route path="configuracion/tasas" element={<LazyTasasPage />} />
                  <Route path="configuracion/empresas" element={<LazyGestionEmpresasPage />} />
                  <Route path="configuracion/marketing" element={<LazyMarketingPage />} />
                  <Route path="configuracion/backup" element={<LazyBackupPage />} />
                  <Route path="configuracion/microsoft" element={<LazyMicrosoftConfigPage />} />
                  <Route path="configuracion/metas-ventas" element={<LazyMetasVentasPage />} />
                  <Route path="billing" element={<LazyBillingPage />} />
                  {/* Master Routes */}
                  <Route path="master" element={<React.Suspense fallback={<div>Cargando...</div>}><MasterDashboardLazy /></React.Suspense>} />
                  <Route path="master/config" element={<React.Suspense fallback={<div>Cargando...</div>}><MasterConfigPageLazy /></React.Suspense>} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
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