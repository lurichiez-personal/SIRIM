import { useState, useEffect } from 'react';
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
    status: string;
    plan: {
      name: string;
      price: number;
      currency: string;
    };
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
  const { user, isAuthenticated } = useAuthStore();
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

      // Obtener empresas (por ahora usar datos de prueba)
      const mockEmpresas: Empresa[] = [
        {
          id: 1,
          nombre: "Empresa Demo A",
          rnc: "123456789",
          createdAt: "2024-01-15T10:00:00Z",
          usuarios: [{
            user: {
              id: 1,
              email: "admin@empresa-a.com",
              nombre: "Admin Empresa A",
              role: "admin",
              active: true,
              createdAt: "2024-01-15T10:00:00Z"
            },
            role: "admin"
          }],
          suscripcion: {
            status: "active",
            plan: {
              name: "Pro",
              price: 99,
              currency: "USD"
            }
          },
          _count: {
            clientes: 25,
            empleados: 8
          }
        },
        {
          id: 2,
          nombre: "Empresa Demo B",
          rnc: "987654321",
          createdAt: "2024-02-01T10:00:00Z",
          usuarios: [{
            user: {
              id: 2,
              email: "admin@empresa-b.com",
              nombre: "Admin Empresa B",
              role: "admin",
              active: true,
              createdAt: "2024-02-01T10:00:00Z"
            },
            role: "admin"
          }],
          suscripcion: {
            status: "trial",
            plan: {
              name: "Basic",
              price: 49,
              currency: "USD"
            }
          },
          _count: {
            clientes: 12,
            empleados: 3
          }
        }
      ];

      const mockStats: MasterStats = {
        totalEmpresas: 2,
        totalUsuarios: 3,
        empresasActivas: 2,
        suscripcionesActivas: 1,
        ingresosMensuales: 148
      };

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));

      setEmpresas(mockEmpresas);
      setStats(mockStats);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
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
            Reintentar
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Panel Master - SIRIM
          </h1>
          <p className="text-gray-600">
            Bienvenido, {user.nombre}. Aquí puedes administrar todas las empresas del sistema.
          </p>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Empresas</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.totalEmpresas}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Usuarios</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsuarios}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Empresas Activas</h3>
              <p className="text-3xl font-bold text-green-600">{stats.empresasActivas}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Suscripciones</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.suscripcionesActivas}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Ingresos del Mes</h3>
              <p className="text-3xl font-bold text-green-600">
                ${stats.ingresosMensuales.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Lista de Empresas */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Empresas Registradas ({empresas.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RNC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario Principal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suscripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clientes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {empresas.map((empresa) => {
                  const usuarioPrincipal = empresa.usuarios.find(u => u.user.active);
                  return (
                    <tr key={empresa.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {empresa.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{empresa.rnc}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {usuarioPrincipal ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {usuarioPrincipal.user.nombre}
                            </div>
                            <div className="text-sm text-gray-500">
                              {usuarioPrincipal.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Sin usuario</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {empresa.suscripcion ? (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              empresa.suscripcion.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : empresa.suscripcion.status === 'trial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {empresa.suscripcion.status}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {empresa.suscripcion.plan.name} - 
                              ${empresa.suscripcion.plan.price}/{empresa.suscripcion.plan.currency}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Sin suscripción</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {empresa._count.clientes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {empresa._count.empleados}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(empresa.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => window.open(`/#/empresas/${empresa.id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Ver detalles
                        </button>
                        <button
                          onClick={() => {
                            if (usuarioPrincipal) {
                              window.open(`mailto:${usuarioPrincipal.user.email}`, '_blank');
                            }
                          }}
                          className="text-green-600 hover:text-green-900"
                          disabled={!usuarioPrincipal}
                        >
                          Contactar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {empresas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No hay empresas registradas aún.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}