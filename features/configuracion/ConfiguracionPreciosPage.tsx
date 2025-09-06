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

interface Plan {
  id: number;
  name: string;
  price: number;
  description: string;
}

interface Module {
  id: string;
  name: string;
  price: number;
  category: string;
}

const ConfiguracionPreciosPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      const response = await fetch('/api/admin/pricing');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
        setModules(data.modules);
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePlanPrice = async (planId: number, price: number, description: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/pricing/plan/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price, description })
      });

      if (response.ok) {
        setPlans(prev => prev.map(plan => 
          plan.id === planId ? { ...plan, price, description } : plan
        ));
      }
    } catch (error) {
      console.error('Error updating plan price:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateModulePrice = async (moduleId: string, price: number) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/pricing/module/${moduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price })
      });

      if (response.ok) {
        setModules(prev => prev.map(module => 
          module.id === moduleId ? { ...module, price } : module
        ));
      }
    } catch (error) {
      console.error('Error updating module price:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Cargando configuración...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-secondary-800">Configuración de Precios</h1>
        <Button 
          variant="secondary" 
          onClick={() => navigate('/configuracion')}
        >
          Volver
        </Button>
      </div>

      {/* Planes de Suscripción */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Planes de Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {plans.map((plan) => (
              <PlanEditor
                key={plan.id}
                plan={plan}
                onUpdate={updatePlanPrice}
                saving={saving}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Módulos Adicionales */}
      <Card>
        <CardHeader>
          <CardTitle>Precios de Módulos Adicionales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {modules.filter(m => m.price && m.price > 0).map((module) => (
              <ModuleEditor
                key={module.id}
                module={module}
                onUpdate={updateModulePrice}
                saving={saving}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface PlanEditorProps {
  plan: Plan;
  onUpdate: (id: number, price: number, description: string) => void;
  saving: boolean;
}

const PlanEditor: React.FC<PlanEditorProps> = ({ plan, onUpdate, saving }) => {
  const [price, setPrice] = useState(plan.price.toString());
  const [description, setDescription] = useState(plan.description);

  const handleSave = () => {
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice) && numPrice >= 0) {
      onUpdate(plan.id, numPrice, description);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold text-lg mb-3">{plan.name}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Precio Mensual (USD)</label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3">
        <Button 
          onClick={handleSave}
          size="sm"
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Actualizar'}
        </Button>
      </div>
    </div>
  );
};

interface ModuleEditorProps {
  module: Module;
  onUpdate: (id: string, price: number) => void;
  saving: boolean;
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({ module, onUpdate, saving }) => {
  const [price, setPrice] = useState(module.price.toString());

  const handleSave = () => {
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice) && numPrice >= 0) {
      onUpdate(module.id, numPrice);
    }
  };

  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div>
        <h4 className="font-medium">{module.name}</h4>
        <p className="text-sm text-secondary-600">{module.category}</p>
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          min="0"
          step="0.01"
          className="w-24"
        />
        <span className="text-sm text-secondary-600">USD/mes</span>
        <Button 
          onClick={handleSave}
          size="sm"
          disabled={saving}
        >
          {saving ? '...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
};

export default ConfiguracionPreciosPage;