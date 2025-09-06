import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAlertStore } from '../../stores/useAlertStore';

interface Plan {
  id: string;
  name: string;
  planType: 'BASICO' | 'PRO' | 'PREMIUM';
  price: string;
  currency: string;
  billingCycle: string;
  trialDays: number;
  description: string;
  features: Record<string, any>;
  modules: PlanModule[];
}

interface Module {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  basePrice: string;
  isCore: boolean;
  features: string[];
}

interface PlanModule {
  id: string;
  included: boolean;
  extraPrice: string | null;
  maxUsage: number | null;
  module: Module;
}

interface Subscription {
  id: string;
  plan: Plan;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  modules: SubscriptionModule[];
}

interface SubscriptionModule {
  id: string;
  status: string;
  activatedAt: string;
  additionalPrice: string | null;
  module: Module;
}

const SuscripcionesPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [availableModules, setAvailableModules] = useState<Record<string, Module[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const { user } = useAuthStore();
  const { showAlert } = useAlertStore();

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    fetchAvailableModules();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans');
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/subscriptions/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 404) {
        setCurrentSubscription(null);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setCurrentSubscription(data.data);
      }
    } catch (error) {
      console.error('Error fetching current subscription:', error);
    }
  };

  const fetchAvailableModules = async () => {
    try {
      const response = await fetch('/api/modules/');
      const data = await response.json();
      if (data.success) {
        setAvailableModules(data.data.categories);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/subscriptions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId,
          paymentMethodId: 'card_demo', // En producción, esto vendría de un formulario de pago
          billingAddress: {
            country: 'DO',
            city: 'Santo Domingo'
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        showAlert('Suscripción creada exitosamente. ¡Disfruta de tu período de prueba!', 'success');
        fetchCurrentSubscription();
      } else {
        showAlert(data.message || 'Error al crear suscripción', 'error');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      showAlert('Error al procesar la suscripción', 'error');
    }
  };

  const handleActivateModule = async (moduleId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/modules/${moduleId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          trialDays: 7
        })
      });

      const data = await response.json();
      if (data.success) {
        showAlert(data.message, 'success');
        fetchCurrentSubscription();
      } else {
        showAlert(data.message || 'Error al activar módulo', 'error');
      }
    } catch (error) {
      console.error('Error activating module:', error);
      showAlert('Error al activar módulo', 'error');
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'BASICO': return 'bg-blue-50 border-blue-200';
      case 'PRO': return 'bg-green-50 border-green-200 ring-2 ring-green-300';
      case 'PREMIUM': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getPlanTextColor = (planType: string) => {
    switch (planType) {
      case 'BASICO': return 'text-blue-600';
      case 'PRO': return 'text-green-600';
      case 'PREMIUM': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-secondary-600">Cargando información de suscripciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 mb-4">
          Gestión de Suscripciones y Módulos
        </h1>
        <p className="text-secondary-600 text-lg">
          Personaliza tu experiencia SIRIM activando solo los módulos que necesitas
        </p>
      </div>

      {/* Suscripción Actual */}
      {currentSubscription && (
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
            <CardHeader>
              <h2 className="text-xl font-semibold text-primary-800">Tu Suscripción Actual</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-primary-600">Plan</p>
                  <p className="font-semibold text-primary-900">{currentSubscription.plan.name}</p>
                </div>
                <div>
                  <p className="text-sm text-primary-600">Estado</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentSubscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    currentSubscription.status === 'TRIAL' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentSubscription.status === 'ACTIVE' ? 'Activo' :
                     currentSubscription.status === 'TRIAL' ? 'Período de Prueba' :
                     currentSubscription.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-primary-600">Próximo Pago</p>
                  <p className="font-semibold text-primary-900">
                    {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('es-DO')}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-primary-600 mb-2">Módulos Activos: {currentSubscription.modules.filter(m => m.status === 'ACTIVE').length}</p>
                <div className="flex flex-wrap gap-2">
                  {currentSubscription.modules.filter(m => m.status === 'ACTIVE').slice(0, 5).map(module => (
                    <span key={module.id} className="px-2 py-1 bg-primary-200 text-primary-800 rounded text-xs">
                      {module.module.displayName}
                    </span>
                  ))}
                  {currentSubscription.modules.filter(m => m.status === 'ACTIVE').length > 5 && (
                    <span className="px-2 py-1 bg-primary-200 text-primary-800 rounded text-xs">
                      +{currentSubscription.modules.filter(m => m.status === 'ACTIVE').length - 5} más
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Planes Disponibles */}
      {!currentSubscription && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6">Elige tu Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={getPlanColor(plan.planType)}>
                <CardHeader className="text-center">
                  <h3 className={`text-xl font-bold ${getPlanTextColor(plan.planType)}`}>
                    {plan.name}
                  </h3>
                  {plan.planType === 'PRO' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        RECOMENDADO
                      </span>
                    </div>
                  )}
                  <div className="mt-4">
                    <span className={`text-3xl font-bold ${getPlanTextColor(plan.planType)}`}>
                      ${plan.price}
                    </span>
                    <span className="text-secondary-500 text-sm ml-1">DOP/mes</span>
                  </div>
                  <p className="text-secondary-600 text-sm mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span>Empresas:</span>
                      <span className="font-semibold">{plan.features.empresas}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Usuarios:</span>
                      <span className="font-semibold">{plan.features.usuarios}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Facturas/mes:</span>
                      <span className="font-semibold">{plan.features.facturas_mensuales}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Período de prueba:</span>
                      <span className="font-semibold">{plan.trialDays} días gratis</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    className="w-full"
                    variant={plan.planType === 'PRO' ? 'primary' : 'secondary'}
                  >
                    Comenzar Prueba Gratis
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Módulos Disponibles */}
      <div>
        <h2 className="text-2xl font-bold text-secondary-900 mb-6">Módulos Disponibles</h2>
        {Object.entries(availableModules).map(([category, modules]) => (
          <div key={category} className="mb-8">
            <h3 className="text-lg font-semibold text-secondary-800 mb-4 capitalize">
              {String(category).replace('_', ' ')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Array.isArray(modules) ? modules : []).filter(module => !module.isCore).map((module) => {
                const isActive = currentSubscription?.modules?.some(
                  sm => sm.module.id === module.id && sm.status === 'ACTIVE'
                ) || false;
                
                return (
                  <Card key={module.id} className={isActive ? 'border-green-300 bg-green-50' : ''}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-secondary-900">{module.displayName}</h4>
                        {isActive ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            ACTIVO
                          </span>
                        ) : (
                          <span className="text-primary-600 font-semibold text-sm">
                            +${module.basePrice} DOP/mes
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-secondary-600 text-sm mb-4">{module.description}</p>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {module.features.slice(0, 3).map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded text-xs">
                            {feature}
                          </span>
                        ))}
                        {module.features.length > 3 && (
                          <span className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded text-xs">
                            +{module.features.length - 3}
                          </span>
                        )}
                      </div>
                      {!isActive && currentSubscription && (
                        <Button
                          onClick={() => handleActivateModule(module.id)}
                          size="sm"
                          variant="secondary"
                          className="w-full"
                        >
                          Probar 7 días gratis
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuscripcionesPage;