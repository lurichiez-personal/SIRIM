// Página de administración del sistema de backup automático
// Control completo de backups, restauración y configuración

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useTenantStore } from '../../stores/useTenantStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { 
  backupSystem, 
  createManualBackup, 
  downloadBackupFile, 
  restoreFromFile, 
  getBackupHistory, 
  updateBackupConfig, 
  getBackupConfig,
  BackupData,
  BackupMetadata,
  BackupConfig
} from '../../utils/backupSystem';
import { ConfiguracionIcon, InformationCircleIcon } from '../../components/icons/Icons';

const BackupPage: React.FC = () => {
  const { selectedTenant } = useTenantStore();
  const { addNotification } = useNotificationStore();
  
  const [backupHistory, setBackupHistory] = useState<BackupMetadata[]>([]);
  const [config, setConfig] = useState<BackupConfig>(getBackupConfig());
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [backupDescription, setBackupDescription] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBackupHistory();
  }, [selectedTenant]);

  const loadBackupHistory = () => {
    const history = getBackupHistory();
    setBackupHistory(history.filter(b => b.empresaId === selectedTenant?.id));
  };

  // Crear backup manual
  const handleCreateBackup = async () => {
    if (!selectedTenant) return;
    
    setIsCreatingBackup(true);
    try {
      const description = backupDescription.trim() || `Backup manual - ${new Date().toLocaleDateString('es-DO')}`;
      const backup = await createManualBackup(description);
      
      addNotification({
        type: 'success',
        message: `Backup creado exitosamente: ${backup.metadata.description}`,
        duration: 5000
      });
      
      setBackupDescription('');
      loadBackupHistory();
      
      // Opción de descarga inmediata
      const shouldDownload = window.confirm('¿Desea descargar el backup ahora?');
      if (shouldDownload) {
        await downloadBackupFile(backup);
      }
      
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Error creando backup: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        duration: 5000
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Descargar backup existente
  const handleDownloadBackup = async (metadata: BackupMetadata) => {
    try {
      // Cargar backup completo desde localStorage
      const backupKey = `backup_${metadata.id}`;
      const backupString = localStorage.getItem(backupKey);
      
      if (!backupString) {
        throw new Error('Backup no encontrado en el almacenamiento local');
      }
      
      const backup: BackupData = JSON.parse(backupString);
      await downloadBackupFile(backup);
      
      addNotification({
        type: 'success',
        message: 'Backup descargado exitosamente',
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Error descargando backup: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        duration: 5000
      });
    }
  };

  // Subir archivo para restaurar
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      addNotification({
        type: 'error',
        message: 'Por favor seleccione un archivo ZIP válido',
        duration: 4000
      });
      return;
    }

    setIsRestoringBackup(true);
    try {
      const backup = await restoreFromFile(file);
      
      addNotification({
        type: 'success',
        message: `Backup restaurado exitosamente: ${backup.metadata.description}`,
        duration: 5000
      });
      
      loadBackupHistory();
      
      // Recargar página para reflejar los cambios
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Error restaurando backup: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        duration: 6000
      });
    } finally {
      setIsRestoringBackup(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Eliminar backup
  const handleDeleteBackup = async (metadata: BackupMetadata) => {
    if (!window.confirm(`¿Está seguro de eliminar el backup "${metadata.description}"?`)) {
      return;
    }

    try {
      localStorage.removeItem(`backup_${metadata.id}`);
      loadBackupHistory();
      
      addNotification({
        type: 'success',
        message: 'Backup eliminado exitosamente',
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Error eliminando backup',
        duration: 4000
      });
    }
  };

  // Actualizar configuración
  const handleConfigUpdate = (newConfig: Partial<BackupConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    updateBackupConfig(newConfig);
    
    addNotification({
      type: 'success',
      message: 'Configuración de backup actualizada',
      duration: 3000
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-DO');
  };

  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case 'automatic': return '🤖';
      case 'scheduled': return '⏰';
      case 'manual': return '👤';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-800">Sistema de Backup</h1>
          <p className="text-secondary-600 mt-2">
            Administre copias de seguridad automáticas y manuales de {selectedTenant?.nombre}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={() => setShowConfigModal(true)} 
            variant="secondary"
          >
            ⚙️ Configuración
          </Button>
          <Button 
            onClick={handleFileUpload}
            variant="secondary"
            disabled={isRestoringBackup}
          >
            <span className="mr-2">📁</span>
            {isRestoringBackup ? 'Restaurando...' : 'Restaurar Backup'}
          </Button>
        </div>
      </div>

      {/* Input oculto para selección de archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Estado del sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DatabaseIcon className="h-5 w-5" />
            <span>Estado del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{backupHistory.length}</div>
              <div className="text-sm text-secondary-600">Backups Totales</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${config.autoBackupEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {config.autoBackupEnabled ? 'Activo' : 'Inactivo'}
              </div>
              <div className="text-sm text-secondary-600">Backup Automático</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {config.backupFrequency === 'daily' ? 'Diario' : 
                 config.backupFrequency === 'weekly' ? 'Semanal' : 'Mensual'}
              </div>
              <div className="text-sm text-secondary-600">Frecuencia</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crear backup manual */}
      <Card>
        <CardHeader>
          <CardTitle>Crear Backup Manual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Descripción del Backup (opcional)
              </label>
              <input
                type="text"
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
                placeholder="Ej: Backup antes de actualización de sistema"
                className="w-full border border-secondary-300 rounded-md px-3 py-2"
                disabled={isCreatingBackup}
              />
            </div>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="w-full"
            >
              {isCreatingBackup ? '⏳ Creando Backup...' : '💾 Crear Backup Ahora'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial de backups */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Backups</CardTitle>
        </CardHeader>
        <CardContent>
          {backupHistory.length === 0 ? (
            <div className="text-center py-8 text-secondary-500">
              <div className="text-6xl mb-4 opacity-50">💾</div>
              <p>No hay backups disponibles</p>
              <p className="text-sm">Cree su primer backup usando el botón de arriba</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backupHistory.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4 hover:bg-secondary-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getBackupTypeIcon(backup.type)}</span>
                        <h3 className="font-medium text-secondary-800">{backup.description}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          backup.type === 'automatic' ? 'bg-blue-100 text-blue-800' :
                          backup.type === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {backup.type}
                        </span>
                      </div>
                      <div className="text-sm text-secondary-600">
                        <span className="mr-4">📅 {formatDate(backup.timestamp)}</span>
                        <span className="mr-4">💾 {formatFileSize(backup.size)}</span>
                        <span>🆔 {backup.id.substring(backup.id.length - 8)}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => handleDownloadBackup(backup)}
                      >
                        💾
                      </Button>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => handleDeleteBackup(backup)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de configuración */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Configuración de Backup"
        footer={
          <Button onClick={() => setShowConfigModal(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Backup automático */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-secondary-800">Backup Automático</h3>
              <p className="text-sm text-secondary-600">Crear backups automáticamente</p>
            </div>
            <ToggleSwitch
              enabled={config.autoBackupEnabled}
              onChange={(enabled) => handleConfigUpdate({ autoBackupEnabled: enabled })}
            />
          </div>

          {/* Frecuencia */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Frecuencia de Backup Automático
            </label>
            <select
              value={config.backupFrequency}
              onChange={(e) => handleConfigUpdate({ 
                backupFrequency: e.target.value as 'daily' | 'weekly' | 'monthly' 
              })}
              className="w-full border border-secondary-300 rounded-md px-3 py-2"
              disabled={!config.autoBackupEnabled}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>

          {/* Máximo de backups */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Máximo de Backups a Conservar
            </label>
            <select
              value={config.maxBackups}
              onChange={(e) => handleConfigUpdate({ maxBackups: parseInt(e.target.value) })}
              className="w-full border border-secondary-300 rounded-md px-3 py-2"
            >
              <option value={5}>5 backups</option>
              <option value={10}>10 backups</option>
              <option value={20}>20 backups</option>
              <option value={50}>50 backups</option>
            </select>
          </div>

          {/* Compresión */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-secondary-800">Compresión</h3>
              <p className="text-sm text-secondary-600">Reducir tamaño de backups</p>
            </div>
            <ToggleSwitch
              enabled={config.compressionEnabled}
              onChange={(enabled) => handleConfigUpdate({ compressionEnabled: enabled })}
            />
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-800">
              <InformationCircleIcon className="h-5 w-5" />
              <h4 className="font-medium">Información Importante</h4>
            </div>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Los backups se almacenan localmente en su navegador</li>
              <li>• Descargue backups importantes para almacenamiento externo</li>
              <li>• Los backups automáticos se ejecutan en segundo plano</li>
              <li>• La restauración sobrescribe todos los datos actuales</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BackupPage;