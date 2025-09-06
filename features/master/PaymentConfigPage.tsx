// Módulo de configuración de cuentas de pago para master user
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

interface PaymentConfig {
  id?: number;
  supportEmail: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  taxId: string;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankRoutingNumber: string;
  webhookEndpoint?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function PaymentConfigPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [config, setConfig] = useState<PaymentConfig>({
    supportEmail: '',
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    taxId: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankRoutingNumber: '',
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPaymentConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/master/payment-config', { headers });
      
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      } else {
        // Si no existe configuración, usar la configuración por defecto
        console.log('No existe configuración previa, usando defaults');
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const savePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/master/payment-config', {
        method: 'POST',
        headers,
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok) {
        setConfig(data.config);
        setSuccess('Configuración guardada exitosamente');
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'Error al guardar la configuración');
      }
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setError('Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  useEffect(() => {
    if (isAuthenticated && user?.email === 'lurichiez@gmail.com') {
      fetchPaymentConfig();
    }
  }, [user, isAuthenticated]);

  if (!isAuthenticated || user?.email !== 'lurichiez@gmail.com') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">Solo el usuario master puede acceder a esta configuración.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración de Pagos</h1>
          <p className="text-gray-600">Configura las cuentas que recibirán los pagos recurrentes de tus clientes</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={savePaymentConfig} className="space-y-8">
          {/* Información del Negocio */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Negocio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Negocio *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={config.businessName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SIRIM - Servicios Contables"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email de Soporte *
                  </label>
                  <input
                    type="email"
                    name="supportEmail"
                    value={config.supportEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="soporte@sirim.do"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección del Negocio *
                </label>
                <textarea
                  name="businessAddress"
                  value={config.businessAddress}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Calle Principal #123, Sector Los Jardines, Santo Domingo, República Dominicana"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono del Negocio *
                  </label>
                  <input
                    type="tel"
                    name="businessPhone"
                    value={config.businessPhone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (809) 555-0123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RNC / Tax ID *
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={config.taxId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración de Stripe */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Stripe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stripe Publishable Key
                  </label>
                  <input
                    type="text"
                    name="stripePublishableKey"
                    value={config.stripePublishableKey || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="pk_live_..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Clave pública de Stripe para procesar pagos</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stripe Secret Key
                  </label>
                  <input
                    type="password"
                    name="stripeSecretKey"
                    value={config.stripeSecretKey || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sk_live_..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Clave secreta de Stripe (se almacena encriptada)</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook Endpoint
                </label>
                <input
                  type="url"
                  name="webhookEndpoint"
                  value={config.webhookEndpoint || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://tudominio.com/api/stripe/webhook"
                />
                <p className="text-xs text-gray-500 mt-1">URL donde Stripe enviará las notificaciones de eventos</p>
              </div>
            </CardContent>
          </Card>

          {/* Información Bancaria */}
          <Card>
            <CardHeader>
              <CardTitle>Cuenta Bancaria para Depósitos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Cuenta *
                  </label>
                  <input
                    type="text"
                    name="bankAccountName"
                    value={config.bankAccountName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Luis Richiez - SIRIM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Cuenta *
                  </label>
                  <input
                    type="text"
                    name="bankAccountNumber"
                    value={config.bankAccountNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234567890"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Banco *
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={config.bankName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Banco Popular Dominicano"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Routing / Swift
                  </label>
                  <input
                    type="text"
                    name="bankRoutingNumber"
                    value={config.bankRoutingNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="021000021"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estado */}
          <Card>
            <CardHeader>
              <CardTitle>Estado de la Configuración</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={config.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Configuración activa (los pagos se procesarán con esta configuración)
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Desactiva esto temporalmente si necesitas pausar el procesamiento de pagos.
              </p>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={fetchPaymentConfig}
              disabled={saving}
            >
              Cancelar Cambios
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>

        {/* Información Adicional */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Información Importante</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>🔒 Seguridad:</strong> Las claves secretas se almacenan de forma encriptada en la base de datos.
              </p>
              <p>
                <strong>💳 Pagos Automáticos:</strong> Una vez configurado, los pagos se procesarán automáticamente según el plan de cada cliente.
              </p>
              <p>
                <strong>📧 Notificaciones:</strong> Recibirás un email cada vez que se registre un nuevo cliente.
              </p>
              <p>
                <strong>🏦 Depósitos:</strong> Stripe depositará los fondos directamente en tu cuenta bancaria configurada.
              </p>
              <p>
                <strong>⚙️ Webhooks:</strong> Asegúrate de configurar el webhook en tu panel de Stripe para recibir actualizaciones automáticas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}