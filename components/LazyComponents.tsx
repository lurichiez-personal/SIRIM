// Sistema de lazy loading para optimización de performance

import React, { Suspense, ComponentType } from 'react';
import LoadingSpinner from './ui/LoadingSpinner';

// HOC para envolver componentes con lazy loading y error boundary
export const withLazyLoading = <P extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>,
  fallback?: React.ReactNode
) => {
  return (props: P) => (
    <Suspense fallback={fallback || <PageLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Componente de carga para páginas completas
export const PageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <LoadingSpinner size="large" />
      <p className="mt-2 text-sm text-secondary-500">Cargando...</p>
    </div>
  </div>
);

// Componente de carga para secciones
export const SectionLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-32">
    <LoadingSpinner size="medium" />
  </div>
);

// Componente de carga para modales
export const ModalLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-24">
    <LoadingSpinner size="small" />
  </div>
);

// Lazy loading de páginas principales
export const LazyDashboardPage = React.lazy(() => import('../features/dashboard/DashboardPage'));
export const LazyClientesPage = React.lazy(() => import('../features/clientes/ClientesPage'));
export const LazyFacturasPage = React.lazy(() => import('../features/facturas/FacturasPage'));
export const LazyCotizacionesPage = React.lazy(() => import('../features/cotizaciones/CotizacionesPage'));
export const LazyGastosPage = React.lazy(() => import('../features/gastos/GastosPage'));
export const LazyIngresosPage = React.lazy(() => import('../features/ingresos/IngresosPage'));
export const LazyInventarioPage = React.lazy(() => import('../features/inventario/InventarioPage'));
export const LazyReportesPage = React.lazy(() => import('../features/reportes/ReportesPage'));
export const LazyDGIIReportsPage = React.lazy(() => import('../features/reportes/DGIIReportsPage'));
export const LazyConfiguracionPage = React.lazy(() => import('../features/configuracion/ConfiguracionPage'));
export const LazyConciliacionPage = React.lazy(() => import('../features/conciliacion/ConciliacionPage'));
export const LazyNominaPage = React.lazy(() => import('../features/nomina/NominaPage'));
export const LazyContabilidadPage = React.lazy(() => import('../features/contabilidad/ContabilidadPage'));
export const LazyCuentasPorCobrarPage = React.lazy(() => import('../features/cuentas-por-cobrar/CuentasPorCobrarPage'));
export const LazyNotasPage = React.lazy(() => import('../features/notas/NotasPage'));

// Lazy loading de sub-páginas de configuración
export const LazyNCFPage = React.lazy(() => import('../features/configuracion/NCFPage'));
export const LazyPersonalizacionPage = React.lazy(() => import('../features/configuracion/PersonalizacionPage'));
export const LazyFacturacionRecurrentePage = React.lazy(() => import('../features/configuracion/FacturacionRecurrentePage'));
export const LazyRolesPage = React.lazy(() => import('../features/configuracion/RolesPage'));
export const LazyGestionUsuariosPage = React.lazy(() => import('../features/configuracion/GestionUsuariosPage'));
export const LazyTasasPage = React.lazy(() => import('../features/configuracion/TasasPage'));
export const LazyGestionEmpresasPage = React.lazy(() => import('../features/configuracion/GestionEmpresasPage'));
export const LazyMarketingPage = React.lazy(() => import('../features/configuracion/MarketingPage'));

// Lazy loading de sub-páginas de nómina
export const LazyHistorialNominaPage = React.lazy(() => import('../features/nomina/HistorialNominaPage'));
export const LazyAuditarNominaPage = React.lazy(() => import('../features/nomina/AuditarNominaPage'));

// Lazy loading de sub-páginas de contabilidad
export const LazyLibroDiarioPage = React.lazy(() => import('../features/contabilidad/LibroDiarioPage'));
export const LazyCatalogoCuentasPage = React.lazy(() => import('../features/contabilidad/CatalogoCuentasPage'));
export const LazyReportesContablesPage = React.lazy(() => import('../features/contabilidad/ReportesContablesPage'));

// Portal del cliente (lazy loading)
export const LazyPortalDashboardPage = React.lazy(() => import('../features/portal/PortalDashboardPage'));
export const LazyPortalFacturasPage = React.lazy(() => import('../features/portal/PortalFacturasPage'));
export const LazyPortalCotizacionesPage = React.lazy(() => import('../features/portal/PortalCotizacionesPage'));

// Landing pages (lazy loading)
export const LazyHomePage = React.lazy(() => import('../features/landing/HomePage'));
export const LazyPreciosPage = React.lazy(() => import('../features/landing/PreciosPage'));
export const LazyRegistroPage = React.lazy(() => import('../features/auth/RegistroPage'));

// Componentes de lazy loading con fallbacks preconfigurados
export const DashboardPageLazy = withLazyLoading(LazyDashboardPage);
export const ClientesPageLazy = withLazyLoading(LazyClientesPage);
export const FacturasPageLazy = withLazyLoading(LazyFacturasPage);
export const CotizacionesPageLazy = withLazyLoading(LazyCotizacionesPage);
export const GastosPageLazy = withLazyLoading(LazyGastosPage);
export const IngresosPageLazy = withLazyLoading(LazyIngresosPage);
export const InventarioPageLazy = withLazyLoading(LazyInventarioPage);
export const ReportesPageLazy = withLazyLoading(LazyReportesPage);
export const ConfiguracionPageLazy = withLazyLoading(LazyConfiguracionPage);
export const ConciliacionPageLazy = withLazyLoading(LazyConciliacionPage);
export const NominaPageLazy = withLazyLoading(LazyNominaPage);
export const ContabilidadPageLazy = withLazyLoading(LazyContabilidadPage);
export const CuentasPorCobrarPageLazy = withLazyLoading(LazyCuentasPorCobrarPage);
export const NotasPageLazy = withLazyLoading(LazyNotasPage);