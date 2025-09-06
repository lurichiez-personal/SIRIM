import React, { useState, useEffect } from 'react';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, TrashIcon } from '../../components/icons/Icons';
import { MetaVentas } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const MESES = [
  { num: 1, nombre: 'Enero' },
  { num: 2, nombre: 'Febrero' },
  { num: 3, nombre: 'Marzo' },
  { num: 4, nombre: 'Abril' },
  { num: 5, nombre: 'Mayo' },
  { num: 6, nombre: 'Junio' },
  { num: 7, nombre: 'Julio' },
  { num: 8, nombre: 'Agosto' },
  { num: 9, nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre' },
  { num: 11, nombre: 'Noviembre' },
  { num: 12, nombre: 'Diciembre' }
];

const MetasVentasPage: React.FC = () => {
  const { selectedTenant } = useTenantStore();
  const [metas, setMetas] = useState<MetaVentas[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear());
  
  // Estados para nueva meta o edición
  const [nuevaMeta, setNuevaMeta] = useState({
    mes: new Date().getMonth() + 1,
    metaMensual: '',
    notas: ''
  });

  const cargarMetas = async () => {
    if (!selectedTenant) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/metas-ventas?empresaId=${selectedTenant.id}&ano=${anoSeleccionado}`);
      if (response.ok) {
        const data = await response.json();
        setMetas(data);
      } else {
        console.error('Error cargando metas');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTenant) {
      cargarMetas();
    }
  }, [selectedTenant, anoSeleccionado]);

  const guardarMeta = async () => {
    if (!selectedTenant || !nuevaMeta.metaMensual) return;

    try {
      setSaving(true);
      const response = await fetch('/api/metas-ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: selectedTenant.id,
          ano: anoSeleccionado,
          mes: nuevaMeta.mes,
          metaMensual: parseFloat(nuevaMeta.metaMensual),
          notas: nuevaMeta.notas || null
        })
      });

      if (response.ok) {
        await cargarMetas();
        setNuevaMeta({ mes: new Date().getMonth() + 1, metaMensual: '', notas: '' });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error guardando meta:', error);
      alert('Error al guardar la meta');
    } finally {
      setSaving(false);
    }
  };

  const actualizarMeta = async (id: number, metaMensual: number, notas?: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/metas-ventas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaMensual, notas })
      });

      if (response.ok) {
        await cargarMetas();
        setEditingId(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error actualizando meta:', error);
      alert('Error al actualizar la meta');
    } finally {
      setSaving(false);
    }
  };

  const eliminarMeta = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta meta de ventas?')) return;

    try {
      const response = await fetch(`/api/metas-ventas/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await cargarMetas();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error eliminando meta:', error);
      alert('Error al eliminar la meta');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', { 
      style: 'currency', 
      currency: 'DOP' 
    }).format(value);
  };

  const getMesNombre = (mes: number) => {
    return MESES.find(m => m.num === mes)?.nombre || `Mes ${mes}`;
  };

  const metasExistentes = metas.map(m => m.mes);
  const mesesDisponibles = MESES.filter(m => !metasExistentes.includes(m.num));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-secondary-800">Metas de Ventas</h1>
        <div className="flex items-center space-x-4">
          <select 
            value={anoSeleccionado} 
            onChange={(e) => setAnoSeleccionado(parseInt(e.target.value))}
            className="px-3 py-2 border border-secondary-300 rounded-md"
          >
            {Array.from({length: 5}, (_, i) => {
              const ano = new Date().getFullYear() - 2 + i;
              return (
                <option key={ano} value={ano}>{ano}</option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Formulario para nueva meta */}
      {mesesDisponibles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Establecer Nueva Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Mes
                </label>
                <select
                  value={nuevaMeta.mes}
                  onChange={(e) => setNuevaMeta(prev => ({ ...prev, mes: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {mesesDisponibles.map(mes => (
                    <option key={mes.num} value={mes.num}>
                      {mes.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Meta Mensual (RD$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nuevaMeta.metaMensual}
                  onChange={(e) => setNuevaMeta(prev => ({ ...prev, metaMensual: e.target.value }))}
                  placeholder="500000.00"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Notas (Opcional)
                </label>
                <input
                  type="text"
                  value={nuevaMeta.notas}
                  onChange={(e) => setNuevaMeta(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas sobre la meta..."
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={guardarMeta}
                  disabled={!nuevaMeta.metaMensual || saving}
                  leftIcon={saving ? <LoadingSpinner size="small" /> : <PlusIcon />}
                  className="w-full"
                >
                  {saving ? 'Guardando...' : 'Guardar Meta'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de metas existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Metas Configuradas para {anoSeleccionado}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : metas.length === 0 ? (
            <div className="text-center py-8 text-secondary-500">
              No hay metas configuradas para este año.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Mes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Meta Mensual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Notas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {metas.map((meta) => (
                    <MetaRow
                      key={meta.id}
                      meta={meta}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      onUpdate={actualizarMeta}
                      onDelete={eliminarMeta}
                      saving={saving}
                      formatCurrency={formatCurrency}
                      getMesNombre={getMesNombre}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para cada fila de meta
interface MetaRowProps {
  meta: MetaVentas;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  onUpdate: (id: number, metaMensual: number, notas?: string) => void;
  onDelete: (id: number) => void;
  saving: boolean;
  formatCurrency: (value: number) => string;
  getMesNombre: (mes: number) => string;
}

const MetaRow: React.FC<MetaRowProps> = ({
  meta,
  editingId,
  setEditingId,
  onUpdate,
  onDelete,
  saving,
  formatCurrency,
  getMesNombre
}) => {
  const [editValues, setEditValues] = useState({
    metaMensual: meta.metaMensual.toString(),
    notas: meta.notas || ''
  });

  const isEditing = editingId === meta.id;

  const handleEdit = () => {
    setEditValues({
      metaMensual: meta.metaMensual.toString(),
      notas: meta.notas || ''
    });
    setEditingId(meta.id);
  };

  const handleSave = () => {
    onUpdate(meta.id, parseFloat(editValues.metaMensual), editValues.notas);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  return (
    <tr className="hover:bg-secondary-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
        {getMesNombre(meta.mes)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
        {isEditing ? (
          <input
            type="number"
            min="0"
            step="0.01"
            value={editValues.metaMensual}
            onChange={(e) => setEditValues(prev => ({ ...prev, metaMensual: e.target.value }))}
            className="w-full px-2 py-1 border border-secondary-300 rounded text-sm"
          />
        ) : (
          <span className="font-semibold">{formatCurrency(meta.metaMensual)}</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-secondary-500">
        {isEditing ? (
          <input
            type="text"
            value={editValues.notas}
            onChange={(e) => setEditValues(prev => ({ ...prev, notas: e.target.value }))}
            className="w-full px-2 py-1 border border-secondary-300 rounded text-sm"
            placeholder="Notas..."
          />
        ) : (
          <span>{meta.notas || '-'}</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving || !editValues.metaMensual}
              className="text-green-600 hover:text-green-900 disabled:opacity-50"
            >
              {saving ? <LoadingSpinner size="small" /> : '💾'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-secondary-600 hover:text-secondary-900 disabled:opacity-50"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              className="text-primary hover:text-primary-700"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(meta.id)}
              className="text-red-600 hover:text-red-900"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </>
        )}
      </td>
    </tr>
  );
};

export default MetasVentasPage;