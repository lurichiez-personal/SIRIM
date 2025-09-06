// Página de configuración de Microsoft Office 365 OAuth
// Permite a los usuarios configurar sus credenciales de Azure AD

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { InformationCircleIcon } from '../../components/icons/Icons';
import { useMicrosoftAuth, MicrosoftAuthConfig } from '../../utils/microsoftAuth';
import { useNotificationStore } from '../../stores/useNotificationStore';

const MicrosoftConfigPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const { configure, isReady, getConfiguration, loadConfiguration } = useMicrosoftAuth();
  
  const [config, setConfig] = useState<Partial<MicrosoftAuthConfig>>({
    clientId: '',
    tenantId: '',
    clientSecret: '',
    redirectUri: `${window.location.origin}/auth/microsoft/callback`
  });
  
  const [isConfigured, setIsConfigured] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    // Cargar configuración existente
    const loaded = loadConfiguration();
    if (loaded) {
      const existingConfig = getConfiguration();
      if (existingConfig) {
        setConfig(existingConfig);
        setIsConfigured(true);
      }
    }
  }, []);

  const handleSave = async () => {
    // Validar campos requeridos
    if (!config.clientId || !config.tenantId) {
      addNotification({
        type: 'error',
        message: 'Client ID y Tenant ID son requeridos',
        duration: 4000
      });
      return;
    }

    if (!config.redirectUri) {
      addNotification({
        type: 'error',
        message: 'URI de redirección es requerida',
        duration: 4000
      });
      return;
    }

    setIsSaving(true);
    try {
      const fullConfig: MicrosoftAuthConfig = {
        clientId: config.clientId.trim(),
        tenantId: config.tenantId.trim(),
        clientSecret: config.clientSecret?.trim(),
        redirectUri: config.redirectUri.trim()
      };

      configure(fullConfig);
      setIsConfigured(true);

      addNotification({
        type: 'success',
        message: 'Configuración de Microsoft guardada exitosamente',
        duration: 4000
      });
    } catch (error) {
      console.error('Error guardando configuración:', error);
      addNotification({
        type: 'error',
        message: 'Error guardando configuración de Microsoft',
        duration: 4000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = () => {
    if (!isConfigured) {
      addNotification({
        type: 'error',
        message: 'Primero debe guardar la configuración',
        duration: 4000
      });
      return;
    }

    addNotification({
      type: 'info',
      message: 'Será redirigido a Microsoft para probar la autenticación',
      duration: 3000
    });

    // Probar autenticación (esto redirigirá al usuario)
    setTimeout(() => {
      try {
        const { startAuthentication } = useMicrosoftAuth();
        startAuthentication();
      } catch (error) {
        console.error('Error iniciando autenticación:', error);
        addNotification({
          type: 'error',
          message: 'Error iniciando autenticación de Microsoft',
          duration: 4000
        });
      }
    }, 1000);
  };

  const handleReset = () => {
    if (window.confirm('¿Está seguro de que desea eliminar la configuración de Microsoft?')) {
      localStorage.removeItem('microsoft_auth_config');
      localStorage.removeItem('microsoft_token');
      setConfig({
        clientId: '',
        tenantId: '',
        clientSecret: '',
        redirectUri: `${window.location.origin}/auth/microsoft/callback`
      });
      setIsConfigured(false);
      
      addNotification({
        type: 'info',
        message: 'Configuración de Microsoft eliminada',
        duration: 3000
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-800">Microsoft Office 365</h1>
          <p className="text-secondary-600 mt-2">
            Configure la autenticación con Microsoft Azure AD para Office 365
          </p>
        </div>
        <Button 
          onClick={() => setShowGuideModal(true)}
          variant="secondary"
        >
          📖 Guía de Setup
        </Button>
      </div>

      {/* Estado de configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className={isConfigured ? '✅' : '⚠️'}></span>
            <span>Estado de Configuración</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${isConfigured ? 'text-green-600' : 'text-red-600'}`}>
                {isConfigured ? 'Configurado' : 'Sin configurar'}
              </div>
              <div className="text-sm text-secondary-600">Microsoft OAuth</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isReady() ? 'text-green-600' : 'text-yellow-600'}`}>
                {isReady() ? 'Listo' : 'Pendiente'}
              </div>
              <div className="text-sm text-secondary-600">Estado del Servicio</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Azure AD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Client ID (Application ID) *
              </label>
              <input
                type="text"
                value={config.clientId || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full border border-secondary-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Obténgalo del Azure Portal → App registrations → su aplicación → Overview
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Tenant ID (Directory ID) *
              </label>
              <input
                type="text"
                value={config.tenantId || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, tenantId: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full border border-secondary-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Obténgalo del Azure Portal → App registrations → su aplicación → Overview
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2 flex items-center">
                Client Secret (Opcional para aplicaciones públicas)
                <button 
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="ml-2 text-xs bg-secondary-100 px-2 py-1 rounded"
                >
                  {showSecrets ? '👁️ Ocultar' : '👀 Mostrar'}
                </button>
              </label>
              <input
                type={showSecrets ? "text" : "password"}
                value={config.clientSecret || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                placeholder="Client secret value (no el ID)"
                className="w-full border border-secondary-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Obténgalo del Azure Portal → App registrations → su aplicación → Certificates & secrets
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Redirect URI *
              </label>
              <input
                type="url"
                value={config.redirectUri || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, redirectUri: e.target.value }))}
                className="w-full border border-secondary-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Debe configurar esta misma URL en Azure Portal → App registrations → su aplicación → Authentication
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <InformationCircleIcon className="h-5 w-5" />
                <h4 className="font-medium">Información Importante</h4>
              </div>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Debe tener una aplicación registrada en Azure Portal</li>
                <li>• Configure los permisos necesarios: User.Read, openid, profile, email</li>
                <li>• Agregue la Redirect URI en la configuración de autenticación</li>
                <li>• Para aplicaciones web, configure como "Confidential client"</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
              </Button>
              {isConfigured && (
                <Button 
                  onClick={handleTest}
                  variant="secondary"
                  className="flex-1"
                >
                  🧪 Probar Autenticación
                </Button>
              )}
            </div>

            {isConfigured && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleReset}
                  variant="danger"
                  size="small"
                >
                  🗑️ Eliminar Configuración
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de guía */}
      <Modal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="Guía de Configuración - Microsoft Azure AD"
        footer={
          <Button onClick={() => setShowGuideModal(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold text-lg mb-3">Pasos para configurar Azure AD</h3>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold">1. Registrar Aplicación en Azure Portal</h4>
                <ul className="mt-2 space-y-1 text-secondary-600">
                  <li>• Vaya a portal.azure.com</li>
                  <li>• Azure Active Directory → App registrations → New registration</li>
                  <li>• Nombre: "SIRIM OAuth Client"</li>
                  <li>• Account types: Single tenant o Multi-tenant según necesidades</li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold">2. Configurar Authentication</h4>
                <ul className="mt-2 space-y-1 text-secondary-600">
                  <li>• Authentication → Add a platform → Web</li>
                  <li>• Redirect URI: <code className="bg-secondary-100 px-2 py-1 rounded">{config.redirectUri}</code></li>
                  <li>• Enable "Access tokens" and "ID tokens"</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold">3. Crear Client Secret (Opcional)</h4>
                <ul className="mt-2 space-y-1 text-secondary-600">
                  <li>• Certificates & secrets → New client secret</li>
                  <li>• Copie el VALUE (no el Secret ID)</li>
                  <li>• Guárdelo de forma segura</li>
                </ul>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold">4. Configurar API Permissions</h4>
                <ul className="mt-2 space-y-1 text-secondary-600">
                  <li>• API permissions → Add a permission</li>
                  <li>• Microsoft Graph → Delegated permissions</li>
                  <li>• Agregar: User.Read, openid, profile, email</li>
                  <li>• Grant admin consent (si es necesario)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Notas Importantes:</h4>
            <ul className="text-yellow-700 space-y-1">
              <li>• Client Secret es opcional para aplicaciones públicas (SPA)</li>
              <li>• Para aplicaciones confidenciales, el Client Secret es requerido</li>
              <li>• Mantenga las credenciales seguras y no las comparta</li>
              <li>• Los tokens expiran, el sistema maneja la renovación automáticamente</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MicrosoftConfigPage;