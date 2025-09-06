import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

interface Empresa {
  id: number;
  nombre: string;
  rnc: string;
  createdAt: string;
  usuarios: Array<{
    user: {
      id: number;
      email: string;
      nombre: string;
      role: string;
      active: boolean;
      createdAt: string;
    };
    role: string;
  }>;
  suscripcion?: {
    id: number;
    status: string;
    plan: {
      id: number;
      name: string;
      price: number;
      currency: string;
      planType: string;
    };
    currentPeriodStart: string;
    currentPeriodEnd: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  _count: {
    clientes: number;
    empleados: number;
  };
}

interface MasterStats {
  totalEmpresas: number;
  totalUsuarios: number;
  empresasActivas: number;
  suscripcionesActivas: number;
  ingresosMensuales: number;
}

export default function MasterDashboard() {
  const { user, isAuthenticated, switchToCompany } = useAuthStore();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [stats, setStats] = useState<MasterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json'
      };

      // Obtener empresas reales desde el backend
      const empresasResponse = await fetch('/api/master/empresas', { headers });
      
      if (!empresasResponse.ok) {
        throw new Error('Error al cargar datos de empresas');
      }

      const empresasData = await empresasResponse.json();
      
      // Obtener estadísticas
      const statsResponse = await fetch('/api/master/stats', { headers });
      let statsData = null;
      
      if (statsResponse.ok) {
        statsData = await statsResponse.json();
      } else {
        // Calcular stats básicas desde los datos de empresas
        statsData = {
          totalEmpresas: empresasData.length,
          totalUsuarios: empresasData.reduce((acc: number, emp: Empresa) => acc + emp.usuarios.length, 0),
          empresasActivas: empresasData.filter((emp: Empresa) => emp.usuarios.some(u => u.user.active)).length,
          suscripcionesActivas: empresasData.filter((emp: Empresa) => emp.suscripcion?.status === 'active').length,
          ingresosMensuales: empresasData.reduce((acc: number, emp: Empresa) => acc + (emp.suscripcion?.plan?.price || 0), 0)
        };
      }

      setEmpresas(empresasData);
      setStats(statsData);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessCompany = async (empresa: Empresa) => {
    try {
      // Cambiar al contexto de la empresa seleccionada
      const success = await switchToCompany(empresa.id);
      
      if (success) {
        // Navegar al dashboard de la empresa
        navigate('/dashboard', { 
          state: { 
            message: `Trabajando en el espacio de ${empresa.nombre}`,
            masterMode: true 
          }
        });
      } else {
        throw new Error('No se pudo cambiar a la empresa seleccionada');
      }
    } catch (error) {
      console.error('Error cambiando de empresa:', error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'trial': return 'Prueba';
      case 'cancelled': return 'Cancelado';
      case 'past_due': return 'Vencido';
      default: return status;
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.email === 'lurichiez@gmail.com') {
      fetchMasterData();
    }
  }, [user, isAuthenticated]);

  if (!isAuthenticated || user?.email !== 'lurichiez@gmail.com') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">Solo el usuario master puede acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel master...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchMasterData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel Master - SIRIM</h1>
          <p className="text-gray-600">Gestión completa de todos los clientes y suscripciones</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Empresas</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalEmpresas}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalUsuarios}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Empresas Activas</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.empresasActivas}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Suscripciones Activas</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.suscripcionesActivas}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Ingresos Mensuales</p>
                  <p className="text-2xl font-semibold text-gray-900">${stats.ingresosMensuales}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Companies Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Empresas Clientes</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Gestiona todas las empresas registradas en la plataforma
              </p>
            </div>
            <button
              onClick={fetchMasterData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>

          {empresas.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay empresas registradas</h3>
              <p className="mt-1 text-sm text-gray-500">Las nuevas empresas aparecerán aquí cuando se registren.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario Principal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suscripción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registro</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {empresas.map((empresa) => {
                    const primaryUser = empresa.usuarios.find(u => u.role === 'admin')?.user || empresa.usuarios[0]?.user;
                    return (
                      <tr key={empresa.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{empresa.nombre}</div>
                            <div className="text-sm text-gray-500">RNC: {empresa.rnc}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {primaryUser && (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{primaryUser.nombre}</div>
                              <div className="text-sm text-gray-500">{primaryUser.email}</div>
                              <div className={`inline-flex px-2 py-1 text-xs rounded-full ${primaryUser.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {primaryUser.active ? 'Activo' : 'Inactivo'}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {empresa.suscripcion ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{empresa.suscripcion.plan.name}</div>
                              <div className="text-sm text-gray-500">${empresa.suscripcion.plan.price}/mes</div>
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(empresa.suscripcion.status)}`}>
                                {getStatusText(empresa.suscripcion.status)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin suscripción</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Clientes: {empresa._count.clientes}</div>
                          <div>Empleados: {empresa._count.empleados}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(empresa.createdAt).toLocaleDateString('es-DO')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAccessCompany(empresa)}
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                            >
                              Trabajar Aquí
                            </button>
                            <button
                              onClick={() => navigate(`/master/company/${empresa.id}`)}
                              className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 text-xs"
                            >
                              Ver Detalles
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}