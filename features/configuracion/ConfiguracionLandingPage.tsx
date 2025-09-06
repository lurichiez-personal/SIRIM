import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
// Input component inline for now
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${props.className || ''}`}
  />
);
import { useNavigate } from 'react-router-dom';

interface LandingConfig {
  id: number;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  pricingTitle: string;
  pricingSubtitle: string;
  trialDays: number;
  moduleTrialDays: number;
  supportEmail: string;
  supportPhone: string;
}

const ConfiguracionLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<LandingConfig>>({});

  useEffect(() => {
    fetchLandingConfig();
  }, []);

  const fetchLandingConfig = async () => {
    try {
      const response = await fetch('/api/admin/landing-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setFormData(data);
      }
    } catch (error) {
      console.error('Error fetching landing config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LandingConfig, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/landing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedConfig = await response.json();
        setConfig(updatedConfig);
        alert('Configuración actualizada exitosamente');
      }
    } catch (error) {
      console.error('Error updating landing config:', error);
      alert('Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Cargando configuración...</div>;
  }

  if (!config) {
    return <div className="flex justify-center py-8">Error al cargar la configuración</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-secondary-800">Configuración del Landing Page</h1>
        <Button 
          variant="secondary" 
          onClick={() => navigate('/configuracion')}
        >
          Volver
        </Button>
      </div>

      <div className="space-y-6">
        {/* Sección Hero */}
        <Card>
          <CardHeader>
            <CardTitle>Sección Principal (Hero)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título Principal</label>
              <Input
                type="text"
                value={formData.heroTitle || ''}
                onChange={(e) => handleInputChange('heroTitle', e.target.value)}
                placeholder="La Contabilidad de tu Negocio, Simplificada."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subtítulo</label>
              <textarea
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.heroSubtitle || ''}
                onChange={(e) => handleInputChange('heroSubtitle', e.target.value)}
                placeholder="Descripción de la plataforma..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Texto del Botón</label>
              <Input
                type="text"
                value={formData.heroButtonText || ''}
                onChange={(e) => handleInputChange('heroButtonText', e.target.value)}
                placeholder="Empieza tu prueba gratuita"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sección Precios */}
        <Card>
          <CardHeader>
            <CardTitle>Sección de Precios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título de Precios</label>
              <Input
                type="text"
                value={formData.pricingTitle || ''}
                onChange={(e) => handleInputChange('pricingTitle', e.target.value)}
                placeholder="Planes para cada etapa de tu negocio"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subtítulo de Precios</label>
              <Input
                type="text"
                value={formData.pricingSubtitle || ''}
                onChange={(e) => handleInputChange('pricingSubtitle', e.target.value)}
                placeholder="Empieza con una prueba gratuita..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Pruebas */}
        <Card>
          <CardHeader>
            <CardTitle>Períodos de Prueba</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Días de Prueba del Plan</label>
                <Input
                  type="number"
                  value={formData.trialDays || 30}
                  onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value) || 30)}
                  min="1"
                  max="90"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Días de Prueba de Módulos</label>
                <Input
                  type="number"
                  value={formData.moduleTrialDays || 7}
                  onChange={(e) => handleInputChange('moduleTrialDays', parseInt(e.target.value) || 7)}
                  min="1"
                  max="30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de Soporte */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Soporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email de Soporte</label>
                <Input
                  type="email"
                  value={formData.supportEmail || ''}
                  onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                  placeholder="soporte@sirim.do"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono de Soporte</label>
                <Input
                  type="tel"
                  value={formData.supportPhone || ''}
                  onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                  placeholder="+1 (809) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex gap-4">
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
          <Button 
            variant="secondary"
            onClick={() => navigate('/precios')}
            className="flex-1"
          >
            Ver Landing Page
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionLandingPage;