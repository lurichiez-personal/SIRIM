import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import { CheckIcon, XMarkIcon, EnvelopeIcon, CogIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '../../components/icons/Icons';
import { apiClient } from '../../services/apiClient';

interface EmailConfig {
  id: number;
  name: string;
  provider: 'GMAIL' | 'OUTLOOK' | 'OFFICE365' | 'SENDGRID' | 'CUSTOM_SMTP';
  isDefault: boolean;
  isActive: boolean;
  email: string;
  fromName: string;
  replyTo?: string;
  lastUsedAt?: string;
  errorCount: number;
  lastError?: string;
  createdAt: string;
}

interface EmailConfigForm {
  name: string;
  provider: 'GMAIL' | 'OUTLOOK' | 'OFFICE365' | 'SENDGRID' | 'CUSTOM_SMTP';
  email: string;
  password: string;
  fromName: string;
  replyTo: string;
  isDefault: boolean;
}

const PROVIDER_INFO = {
  GMAIL: {
    name: 'Gmail',
    icon: '📧',
    description: 'Usar cuenta de Gmail con App Password',
    helpText: 'Necesitarás generar un App Password en tu cuenta de Google'
  },
  OUTLOOK: {
    name: 'Outlook.com',
    icon: '📮',
    description: 'Cuenta personal de Outlook/Hotmail',
    helpText: 'Usa tu email y contraseña normal de Outlook'
  },
  OFFICE365: {
    name: 'Office 365',
    icon: '🏢',
    description: 'Cuenta empresarial de Office 365',
    helpText: 'Para cuentas empresariales con dominio personalizado'
  },
  SENDGRID: {
    name: 'SendGrid',
    icon: '⚡',
    description: 'Servicio profesional de SendGrid',
    helpText: 'Necesitarás un API Key de SendGrid'
  },
  CUSTOM_SMTP: {
    name: 'SMTP Personalizado',
    icon: '🔧',
    description: 'Configurar servidor SMTP manualmente',
    helpText: 'Para proveedores de correo personalizados'
  }
};

const EmailConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmailConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [form, setForm] = useState<EmailConfigForm>({
    name: '',
    provider: 'GMAIL',
    email: 'lurichiez@gmail.com',
    password: '',
    fromName: 'SIRIM',
    replyTo: '',
    isDefault: false
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/email-config');
      setConfigs(response.data);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingConfig) {
        await apiClient.put(`/email-config/${editingConfig.id}`, form);
      } else {
        await apiClient.post('/email-config', form);
      }
      
      await loadConfigs();
      setShowForm(false);
      setEditingConfig(null);
      resetForm();
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  };

  const handleEdit = (config: EmailConfig) => {
    setEditingConfig(config);
    setForm({
      name: config.name,
      provider: config.provider,
      email: config.email,
      password: '',
      fromName: config.fromName,
      replyTo: config.replyTo || '',
      isDefault: config.isDefault
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta configuración?')) {
      return;
    }

    try {
      await apiClient.delete(`/email-config/${id}`);
      await loadConfigs();
    } catch (error) {
      console.error('Error eliminando configuración:', error);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await apiClient.post(`/email-config/set-default/${id}`);
      await loadConfigs();
    } catch (error) {
      console.error('Error estableciendo configuración por defecto:', error);
    }
  };

  const handleTest = async (id: number) => {
    try {
      setTesting(id);
      const result = await apiClient.post(`/email-config/${id}/test`, {
        testEmail: 'lurichiez@gmail.com'
      });
      
      if (result.data.success) {
        alert('✅ Correo de prueba enviado exitosamente');
      } else {
        alert(`❌ Error enviando correo: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Error probando configuración:', error);
      alert('❌ Error probando configuración');
    } finally {
      setTesting(null);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      provider: 'GMAIL',
      email: 'lurichiez@gmail.com',
      password: '',
      fromName: 'SIRIM',
      replyTo: '',
      isDefault: false
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConfig(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Configuración de Correo</h1>
        <div className="animate-pulse">
          <div className="h-32 bg-secondary-200 rounded mb-4"></div>
          <div className="h-32 bg-secondary-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Configuración de Correo</h1>
          <p className="text-secondary-600 mt-2">
            Gestiona las configuraciones de correo para envío de notificaciones desde el sistema.
          </p>
        </div>
        
        <Button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <EnvelopeIcon className="h-4 w-4" />
          Nueva Configuración
        </Button>
      </div>

      {/* Alerta sobre usuario master */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-600">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900">Usuario Master</h3>
            <p className="text-blue-800 text-sm">
              Todas las configuraciones de correo deben usar el email del usuario master: <strong>lurichiez@gmail.com</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Lista de configuraciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {configs.map((config) => (
          <Card key={config.id} className="relative">
            {config.isDefault && (
              <div className="absolute top-3 right-3">
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Por Defecto
                </span>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">
                  {PROVIDER_INFO[config.provider]?.icon}
                </span>
                <div>
                  <div className="font-semibold">{config.name}</div>
                  <div className="text-sm text-secondary-600">{PROVIDER_INFO[config.provider]?.name}</div>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-secondary-600">Email:</div>
                  <div className="font-mono text-sm">{config.email}</div>
                </div>
                
                <div>
                  <div className="text-sm text-secondary-600">Remitente:</div>
                  <div className="text-sm">{config.fromName}</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {config.isActive ? (
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <XMarkIcon className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {config.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  
                  {config.errorCount > 0 && (
                    <span className="text-xs text-red-600">
                      {config.errorCount} errores
                    </span>
                  )}
                </div>

                {config.lastUsedAt && (
                  <div className="text-xs text-secondary-500">
                    Usado: {new Date(config.lastUsedAt).toLocaleString('es-DO')}
                  </div>
                )}
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(config.id)}
                    disabled={testing === config.id}
                    className="flex-1 text-xs"
                  >
                    {testing === config.id ? 'Probando...' : 'Probar'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(config)}
                    className="px-2"
                  >
                    <CogIcon className="h-3 w-3" />
                  </Button>
                  
                  {!config.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                      className="px-2 text-red-600"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {!config.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(config.id)}
                    className="w-full text-xs"
                  >
                    Establecer como Predeterminada
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingConfig ? 'Editar' : 'Nueva'} Configuración de Correo
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Nombre de la configuración</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="Ej: Gmail Principal"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="provider">Proveedor de correo</Label>
                  <select
                    id="provider"
                    value={form.provider}
                    onChange={(e) => setForm({...form, provider: e.target.value as any})}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.icon} {info.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-secondary-600 mt-1">
                    {PROVIDER_INFO[form.provider]?.helpText}
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    required
                    disabled // Solo permite el email del master
                  />
                  <p className="text-sm text-secondary-600 mt-1">
                    Solo se permite el email del usuario master
                  </p>
                </div>

                <div>
                  <Label htmlFor="password">
                    {form.provider === 'SENDGRID' ? 'API Key' : 'Contraseña / App Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({...form, password: e.target.value})}
                      required={!editingConfig}
                      placeholder={editingConfig ? 'Dejar vacío para no cambiar' : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500"
                    >
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="fromName">Nombre del remitente</Label>
                  <Input
                    id="fromName"
                    value={form.fromName}
                    onChange={(e) => setForm({...form, fromName: e.target.value})}
                    placeholder="SIRIM"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="replyTo">Email de respuesta (opcional)</Label>
                  <Input
                    id="replyTo"
                    type="email"
                    value={form.replyTo}
                    onChange={(e) => setForm({...form, replyTo: e.target.value})}
                    placeholder="Dejar vacío para usar el email principal"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({...form, isDefault: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="isDefault">
                  Establecer como configuración predeterminada
                </Label>
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <Button type="submit" className="flex-1">
                  {editingConfig ? 'Actualizar' : 'Crear'} Configuración
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-secondary-800">📧 Gmail</h4>
              <p className="text-sm text-secondary-600">
                1. Ve a tu cuenta de Google → Seguridad<br/>
                2. Habilita la verificación en 2 pasos<br/>
                3. Genera un "App Password" específico para SIRIM<br/>
                4. Usa ese App Password en lugar de tu contraseña normal
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-secondary-800">📮 Outlook</h4>
              <p className="text-sm text-secondary-600">
                Usa tu email y contraseña normal de Outlook/Hotmail. Si tienes autenticación en dos pasos habilitada, 
                necesitarás generar una contraseña de aplicación.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-secondary-800">🏢 Office 365</h4>
              <p className="text-sm text-secondary-600">
                Para cuentas empresariales, contacta con tu administrador de IT para obtener las credenciales correctas 
                o permisos para envío de correo automático.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-secondary-800">⚡ SendGrid</h4>
              <p className="text-sm text-secondary-600">
                Regístrate en SendGrid, verifica tu dominio, y genera un API Key con permisos de envío de correo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfigPage;