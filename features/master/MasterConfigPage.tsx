import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ConfiguracionIcon, ReceiptPercentIcon } from '../../components/icons/Icons';
import { useAuthStore } from '../../stores/useAuthStore';

interface MasterConfig {
  // Configuración de precios
  pricing: {
    basicPlan: {
      monthlyPrice: number;
      yearlyPrice: number;
      maxUsers: number;
      maxCompanies: number;
    };
    proPlan: {
      monthlyPrice: number;
      yearlyPrice: number;
      maxUsers: number;
      maxCompanies: number;
    };
    premiumPlan: {
      monthlyPrice: number;
      yearlyPrice: number;
      maxUsers: number;
      maxCompanies: number;
    };
  };
  
  // Configuración de notificaciones
  notifications: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
    supportEmail: string;
    enableEmailNotifications: boolean;
    enableSmsNotifications: boolean;
  };
  
  // Configuración de Stripe
  stripe: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    enablePayments: boolean;
    currency: string;
    enabled: boolean;
  };

  // Configuración general
  general: {
    appName: string;
    supportPhone: string;
    maxFileUploadSize: number;
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
  };
}

const MasterConfigPage: React.FC = () => {
  const { user } = useAuthStore();
  const [config, setConfig] = useState<MasterConfig>({
    pricing: {
      basicPlan: { monthlyPrice: 1500, yearlyPrice: 15000, maxUsers: 3, maxCompanies: 1 },
      proPlan: { monthlyPrice: 3000, yearlyPrice: 30000, maxUsers: 10, maxCompanies: 5 },
      premiumPlan: { monthlyPrice: 5000, yearlyPrice: 50000, maxUsers: 50, maxCompanies: 20 }
    },
    notifications: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@sirim.do',
      fromName: 'SIRIM - Sistema de Registros',
      supportEmail: 'soporte@sirim.do',
      enableEmailNotifications: true,
      enableSmsNotifications: false
    },
    stripe: {
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      enablePayments: false,
      currency: 'usd',
      enabled: false
    },
    general: {
      appName: 'SIRIM',
      supportPhone: '(809) 000-0000',
      maxFileUploadSize: 10,
      maintenanceMode: false,
      allowNewRegistrations: true
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pricing' | 'notifications' | 'stripe' | 'general'>('pricing');

  // Solo permitir acceso al usuario master
  if (!user || user.email !== 'lurichiez@gmail.com') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p className="text-gray-600 mt-2">Solo el usuario master puede acceder a esta configuración.</p>
      </div>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      // Aquí iría la llamada a la API para guardar la configuración
      const token = localStorage.getItem('token');
      const response = await fetch('/api/master/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        alert('Configuración guardada exitosamente');
      } else {
        throw new Error('Error al guardar la configuración');
      }
    } catch (error) {
      alert('Error al guardar: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-secondary-800 flex items-center">
          <ConfiguracionIcon className="w-8 h-8 mr-3" />
          Configuración Master
        </h1>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'pricing', label: 'Precios', icon: ReceiptPercentIcon },
            { key: 'notifications', label: 'Notificaciones', icon: ConfiguracionIcon },
            { key: 'stripe', label: 'Stripe / Pagos', icon: ReceiptPercentIcon },
            { key: 'general', label: 'General', icon: ConfiguracionIcon }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(config.pricing) as [string, any][]).map(([planKey, planData]) => (
            <Card key={planKey}>
              <CardHeader>
                <CardTitle className="capitalize">{planKey.replace('Plan', ' Plan')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Precio Mensual (DOP)</label>
                  <input
                    type="number"
                    value={planData.monthlyPrice}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        [planKey]: { ...planData, monthlyPrice: Number(e.target.value) }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Precio Anual (DOP)</label>
                  <input
                    type="number"
                    value={planData.yearlyPrice}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        [planKey]: { ...planData, yearlyPrice: Number(e.target.value) }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Máx. Usuarios</label>
                  <input
                    type="number"
                    value={planData.maxUsers}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        [planKey]: { ...planData, maxUsers: Number(e.target.value) }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Máx. Empresas</label>
                  <input
                    type="number"
                    value={planData.maxCompanies}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        [planKey]: { ...planData, maxCompanies: Number(e.target.value) }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    Mensual: {formatCurrency(planData.monthlyPrice)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Anual: {formatCurrency(planData.yearlyPrice)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración SMTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servidor SMTP</label>
                <input
                  type="text"
                  value={config.notifications.smtpHost}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, smtpHost: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Puerto SMTP</label>
                <input
                  type="number"
                  value={config.notifications.smtpPort}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, smtpPort: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usuario SMTP</label>
                <input
                  type="text"
                  value={config.notifications.smtpUser}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, smtpUser: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña SMTP</label>
                <input
                  type="password"
                  value={config.notifications.smtpPassword}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, smtpPassword: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración de Correos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Remitente</label>
                <input
                  type="email"
                  value={config.notifications.fromEmail}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, fromEmail: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Remitente</label>
                <input
                  type="text"
                  value={config.notifications.fromName}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, fromName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email de Soporte</label>
                <input
                  type="email"
                  value={config.notifications.supportEmail}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, supportEmail: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.notifications.enableEmailNotifications}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, enableEmailNotifications: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  Habilitar notificaciones por email
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.notifications.enableSmsNotifications}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, enableSmsNotifications: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  Habilitar notificaciones SMS
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stripe Tab */}
      {activeTab === 'stripe' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Stripe / Pagos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Activar Pagos con Stripe</h3>
                  <p className="text-sm text-gray-500">Habilitar procesamiento de pagos y suscripciones</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.stripe.enabled}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      stripe: { ...prev.stripe, enabled: e.target.checked }
                    }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {config.stripe.enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stripe Publishable Key</label>
                      <input
                        type="text"
                        placeholder="pk_test_..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={config.stripe.publishableKey}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          stripe: { ...prev.stripe, publishableKey: e.target.value }
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">Clave pública para el frontend</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stripe Secret Key</label>
                      <input
                        type="password"
                        placeholder="sk_test_..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={config.stripe.secretKey}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          stripe: { ...prev.stripe, secretKey: e.target.value }
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">Clave secreta para el backend (se guardará como variable de entorno)</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                    <input
                      type="password"
                      placeholder="whsec_..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={config.stripe.webhookSecret}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        stripe: { ...prev.stripe, webhookSecret: e.target.value }
                      }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Secret para validar webhooks de Stripe</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={config.stripe.currency}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          stripe: { ...prev.stripe, currency: e.target.value }
                        }))}
                      >
                        <option value="usd">USD - Dólar Americano</option>
                        <option value="dop">DOP - Peso Dominicano</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={config.stripe.enablePayments}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            stripe: { ...prev.stripe, enablePayments: e.target.checked }
                          }))}
                        />
                        <span className="ml-2 text-sm text-gray-700">Habilitar Pagos</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Instrucciones:</h4>
                    <ol className="text-sm text-blue-700 space-y-1">
                      <li>1. Crea una cuenta en <a href="https://stripe.com" target="_blank" className="underline">stripe.com</a></li>
                      <li>2. Ve al Dashboard → Desarrolladores → Claves API</li>
                      <li>3. Copia la clave publicable (pk_test_) y secreta (sk_test_)</li>
                      <li>4. Para webhooks: Desarrolladores → Webhooks → Agregar endpoint</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Tab */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Aplicación</label>
              <input
                type="text"
                value={config.general.appName}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  general: { ...prev.general, appName: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono de Soporte</label>
              <input
                type="text"
                value={config.general.supportPhone}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  general: { ...prev.general, supportPhone: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tamaño máx. archivo (MB)</label>
              <input
                type="number"
                value={config.general.maxFileUploadSize}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  general: { ...prev.general, maxFileUploadSize: Number(e.target.value) }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.general.maintenanceMode}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    general: { ...prev.general, maintenanceMode: e.target.checked }
                  }))}
                  className="mr-2"
                />
                Modo mantenimiento
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.general.allowNewRegistrations}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    general: { ...prev.general, allowNewRegistrations: e.target.checked }
                  }))}
                  className="mr-2"
                />
                Permitir nuevos registros
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MasterConfigPage;