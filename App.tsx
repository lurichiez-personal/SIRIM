
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useClientAuthStore } from './stores/useClientAuthStore';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import ClientesPage from './features/clientes/ClientesPage';
import FacturasPage from './features/facturas/FacturasPage';
import GastosPage from './features/gastos/GastosPage';
import IngresosPage from './features/ingresos/IngresosPage';
import InventarioPage from './features/inventario/InventarioPage';
import ReportesPage from './features/reportes/ReportesPage';
import ConfiguracionPage from './features/configuracion/ConfiguracionPage';
import CotizacionesPage from './features/cotizaciones/CotizacionesPage';
import NCFPage from './features/configuracion/NCFPage';
import NotasPage from './features/notas/NotasPage';
import PersonalizacionPage from './features/configuracion/PersonalizacionPage';
import FacturacionRecurrentePage from './features/configuracion/FacturacionRecurrentePage';
import ConciliacionPage from './features/conciliacion/ConciliacionPage';
import RolesPage from './features/configuracion/RolesPage';
import GestionUsuariosPage from './features/configuracion/GestionUsuariosPage';

// Client Portal
import ClientPortalLayout from './features/portal/ClientPortalLayout';
import ClientPortalLoginPage from './features/portal/ClientPortalLoginPage';
import PortalDashboardPage from './features/portal/PortalDashboardPage';
import PortalFacturasPage from './features/portal/PortalFacturasPage';
import PortalCotizacionesPage from './features/portal/PortalCotizacionesPage';

function App(): React.ReactNode {
  const { isAuthenticated } = useAuthStore();
  const { isClientAuthenticated } = useClientAuthStore();

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        
        {/* Client Portal Routes */}
        <Route path="/portal/login" element={isClientAuthenticated ? <Navigate to="/portal" /> : <ClientPortalLoginPage />} />
        <Route path="/portal/*" element={isClientAuthenticated ? (
            <ClientPortalLayout>
              <Routes>
                <Route path="/" element={<PortalDashboardPage />} />
                <Route path="/facturas" element={<PortalFacturasPage />} />
                <Route path="/cotizaciones" element={<PortalCotizacionesPage />} />
                <Route path="*" element={<Navigate to="/portal" />} />
              </Routes>
            </ClientPortalLayout>
          ) : (
            <Navigate to="/portal/login" />
          )
        } />

        {/* Main App Routes */}
        <Route 
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/clientes" element={<ClientesPage />} />
                  <Route path="/facturas" element={<FacturasPage />} />
                  <Route path="/cotizaciones" element={<CotizacionesPage />} />
                  <Route path="/notas" element={<NotasPage />} />
                  <Route path="/gastos" element={<GastosPage />} />
                  <Route path="/ingresos" element={<IngresosPage />} />
                  <Route path="/inventario" element={<InventarioPage />} />
                  <Route path="/reportes" element={<ReportesPage />} />
                  <Route path="/conciliacion" element={<ConciliacionPage />} />
                  <Route path="/configuracion" element={<ConfiguracionPage />} />
                  <Route path="/configuracion/ncf" element={<NCFPage />} />
                  <Route path="/configuracion/personalizacion" element={<PersonalizacionPage />} />
                  <Route path="/configuracion/facturacion-recurrente" element={<FacturacionRecurrentePage />} />
                  <Route path="/configuracion/roles" element={<RolesPage />} />
                  <Route path="/configuracion/usuarios" element={<GestionUsuariosPage />} />
                  <Route path="*" element={<Navigate to="/" />} />
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
