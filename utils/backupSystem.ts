// Sistema de Backup Automático para SIRIM
// Estrategia híbrida: Base de datos + Descargas + Almacenamiento externo opcional

import { useDataStore } from '../stores/useDataStore';
import { useTenantStore } from '../stores/useTenantStore';
import { useAuthStore } from '../stores/useAuthStore';

export interface BackupMetadata {
  id: string;
  empresaId: number;
  usuarioId: number;
  timestamp: string;
  type: 'automatic' | 'manual' | 'scheduled';
  size: number;
  description: string;
  dataHash: string;
  version: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    facturas: any[];
    clientes: any[];
    gastos: any[];
    inventario: any[];
    nomina: any[];
    configuracion: any;
    usuarios: any[];
    notasCredito: any[];
    pagos: any[];
    empresaConfig: any;
  };
}

export interface BackupConfig {
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  maxBackups: number;
  includeSensitiveData: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

class BackupSystem {
  private static instance: BackupSystem;
  private config: BackupConfig;
  private backupHistory: BackupMetadata[] = [];

  private constructor() {
    this.config = {
      autoBackupEnabled: true,
      backupFrequency: 'weekly',
      maxBackups: 10,
      includeSensitiveData: false,
      compressionEnabled: true,
      encryptionEnabled: false
    };
    
    this.loadBackupHistory();
    this.setupAutoBackup();
  }

  public static getInstance(): BackupSystem {
    if (!BackupSystem.instance) {
      BackupSystem.instance = new BackupSystem();
    }
    return BackupSystem.instance;
  }

  // Crear backup completo de la empresa
  public async createBackup(type: 'automatic' | 'manual' | 'scheduled' = 'manual', description?: string): Promise<BackupData> {
    const { selectedTenant } = useTenantStore.getState();
    const { user } = useAuthStore.getState();
    const dataStore = useDataStore.getState();

    if (!selectedTenant || !user) {
      throw new Error('No hay empresa o usuario seleccionado para el backup');
    }

    // Generar ID único para el backup
    const backupId = `backup_${selectedTenant.id}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Recopilar todos los datos de la empresa
    const backupData: BackupData['data'] = {
      facturas: dataStore.facturas.filter(f => f.empresaId === selectedTenant.id),
      clientes: dataStore.clientes.filter(c => c.empresaId === selectedTenant.id),
      gastos: dataStore.gastos.filter(g => g.empresaId === selectedTenant.id),
      inventario: dataStore.productos.filter(p => p.empresaId === selectedTenant.id),
      nomina: dataStore.nominas.filter(n => n.empresaId === selectedTenant.id),
      configuracion: {
        ncfConfig: dataStore.ncfConfig,
        tasasConfig: dataStore.tasas,
        personalizacion: selectedTenant
      },
      usuarios: dataStore.usuarios.filter(u => u.empresaIds?.includes(selectedTenant.id)),
      notasCredito: dataStore.notasCredito.filter(n => n.empresaId === selectedTenant.id),
      pagos: dataStore.pagos.filter(p => p.empresaId === selectedTenant.id),
      empresaConfig: selectedTenant
    };

    // Calcular hash de los datos para verificación de integridad
    const dataString = JSON.stringify(backupData);
    const dataHash = await this.calculateHash(dataString);
    const size = new Blob([dataString]).size;

    const metadata: BackupMetadata = {
      id: backupId,
      empresaId: selectedTenant.id,
      usuarioId: user.id,
      timestamp,
      type,
      size,
      description: description || `Backup ${type} - ${new Date().toLocaleDateString('es-DO')}`,
      dataHash,
      version: '1.0'
    };

    const backup: BackupData = {
      metadata,
      data: backupData
    };

    // Guardar backup en base de datos
    await this.saveBackupToDatabase(backup);

    // Mantener historial y limpiar backups antiguos
    this.backupHistory.push(metadata);
    await this.cleanOldBackups();

    return backup;
  }

  // Restaurar backup desde datos
  public async restoreBackup(backupData: BackupData): Promise<void> {
    const { selectedTenant } = useTenantStore.getState();
    
    if (!selectedTenant || backupData.metadata.empresaId !== selectedTenant.id) {
      throw new Error('No se puede restaurar backup de otra empresa');
    }

    // Verificar integridad del backup
    const dataString = JSON.stringify(backupData.data);
    const currentHash = await this.calculateHash(dataString);
    
    if (currentHash !== backupData.metadata.dataHash) {
      throw new Error('Backup corrupto: Hash de verificación no coincide');
    }

    // Restaurar datos en el store
    const { 
      setFacturas, setClientes, setGastos, setProductos, 
      setNominas, setUsuarios, setNotasCredito, setPagos 
    } = useDataStore.getState();

    // Restaurar cada tipo de dato
    setFacturas(backupData.data.facturas);
    setClientes(backupData.data.clientes);
    setGastos(backupData.data.gastos);
    setProductos(backupData.data.inventario);
    setNominas(backupData.data.nomina);
    setUsuarios(backupData.data.usuarios);
    setNotasCredito(backupData.data.notasCredito);
    setPagos(backupData.data.pagos);

    // Restaurar configuraciones
    if (backupData.data.configuracion.ncfConfig) {
      // Restaurar configuración NCF
    }
  }

  // Descargar backup como archivo ZIP
  public async downloadBackup(backup: BackupData, filename?: string): Promise<void> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Crear estructura de archivos en el ZIP
    zip.file('metadata.json', JSON.stringify(backup.metadata, null, 2));
    
    // Separar datos por tipo para mejor organización
    zip.file('data/facturas.json', JSON.stringify(backup.data.facturas, null, 2));
    zip.file('data/clientes.json', JSON.stringify(backup.data.clientes, null, 2));
    zip.file('data/gastos.json', JSON.stringify(backup.data.gastos, null, 2));
    zip.file('data/inventario.json', JSON.stringify(backup.data.inventario, null, 2));
    zip.file('data/nomina.json', JSON.stringify(backup.data.nomina, null, 2));
    zip.file('data/configuracion.json', JSON.stringify(backup.data.configuracion, null, 2));
    zip.file('data/usuarios.json', JSON.stringify(backup.data.usuarios, null, 2));
    zip.file('data/notas-credito.json', JSON.stringify(backup.data.notasCredito, null, 2));
    zip.file('data/pagos.json', JSON.stringify(backup.data.pagos, null, 2));

    // Agregar archivo README con instrucciones
    const readmeContent = `
# Backup SIRIM - ${backup.metadata.description}

## Información del Backup
- ID: ${backup.metadata.id}
- Fecha: ${new Date(backup.metadata.timestamp).toLocaleString('es-DO')}
- Tipo: ${backup.metadata.type}
- Tamaño: ${(backup.metadata.size / 1024 / 1024).toFixed(2)} MB
- Empresa: ${backup.data.empresaConfig.nombre}
- RNC: ${backup.data.empresaConfig.rnc}

## Contenido
- ${backup.data.facturas.length} Facturas
- ${backup.data.clientes.length} Clientes
- ${backup.data.gastos.length} Gastos
- ${backup.data.inventario.length} Productos
- ${backup.data.nomina.length} Registros de Nómina
- ${backup.data.usuarios.length} Usuarios
- ${backup.data.notasCredito.length} Notas de Crédito
- ${backup.data.pagos.length} Pagos

## Restauración
Para restaurar este backup, importe el archivo completo en SIRIM.

## Verificación de Integridad
Hash: ${backup.metadata.dataHash}
Versión: ${backup.metadata.version}
    `.trim();
    
    zip.file('README.txt', readmeContent);

    // Generar y descargar ZIP
    const content = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const finalFilename = filename || 
      `sirim_backup_${backup.data.empresaConfig.nombre.replace(/\s+/g, '_')}_${
        new Date(backup.metadata.timestamp).toISOString().split('T')[0]
      }.zip`;

    // Crear y activar descarga
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar URL del blob
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  // Cargar backup desde archivo ZIP
  public async loadBackupFromFile(file: File): Promise<BackupData> {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);

    // Leer metadata
    const metadataFile = zip.file('metadata.json');
    if (!metadataFile) {
      throw new Error('Archivo de backup inválido: falta metadata.json');
    }
    
    const metadataText = await metadataFile.async('text');
    const metadata: BackupMetadata = JSON.parse(metadataText);

    // Leer cada archivo de datos
    const data: BackupData['data'] = {
      facturas: await this.readZipJsonFile(zip, 'data/facturas.json'),
      clientes: await this.readZipJsonFile(zip, 'data/clientes.json'),
      gastos: await this.readZipJsonFile(zip, 'data/gastos.json'),
      inventario: await this.readZipJsonFile(zip, 'data/inventario.json'),
      nomina: await this.readZipJsonFile(zip, 'data/nomina.json'),
      configuracion: await this.readZipJsonFile(zip, 'data/configuracion.json'),
      usuarios: await this.readZipJsonFile(zip, 'data/usuarios.json'),
      notasCredito: await this.readZipJsonFile(zip, 'data/notas-credito.json'),
      pagos: await this.readZipJsonFile(zip, 'data/pagos.json'),
      empresaConfig: metadata // Temporal, se sobrescribirá con datos reales
    };

    return { metadata, data };
  }

  // Configurar backup automático
  public setupAutoBackup(): void {
    if (!this.config.autoBackupEnabled) return;

    const interval = this.getBackupIntervalMs();
    
    setInterval(async () => {
      try {
        await this.createBackup('automatic', 'Backup automático programado');
        console.log('Backup automático completado exitosamente');
      } catch (error) {
        console.error('Error en backup automático:', error);
      }
    }, interval);
  }

  // Obtener historial de backups
  public getBackupHistory(): BackupMetadata[] {
    return [...this.backupHistory].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Configuración del sistema de backup
  public updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('sirim_backup_config', JSON.stringify(this.config));
  }

  public getConfig(): BackupConfig {
    return { ...this.config };
  }

  // --- Métodos privados ---

  private async saveBackupToDatabase(backup: BackupData): Promise<void> {
    try {
      // Guardar en localStorage como fallback si no hay API
      const key = `backup_${backup.metadata.id}`;
      localStorage.setItem(key, JSON.stringify(backup));
      
      // TODO: Implementar guardado en API cuando esté disponible
      // await fetch('/api/backups', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(backup)
      // });
    } catch (error) {
      console.error('Error guardando backup:', error);
      throw error;
    }
  }

  private async loadBackupHistory(): Promise<void> {
    try {
      // Cargar desde localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith('backup_'));
      const backups: BackupMetadata[] = [];

      for (const key of keys) {
        try {
          const backupData = JSON.parse(localStorage.getItem(key) || '{}');
          if (backupData.metadata) {
            backups.push(backupData.metadata);
          }
        } catch (error) {
          console.warn(`Error cargando backup ${key}:`, error);
        }
      }

      this.backupHistory = backups;
    } catch (error) {
      console.error('Error cargando historial de backups:', error);
    }
  }

  private async cleanOldBackups(): Promise<void> {
    const sortedBackups = this.backupHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const backupsToRemove = sortedBackups.slice(this.config.maxBackups);
    
    for (const backup of backupsToRemove) {
      try {
        localStorage.removeItem(`backup_${backup.id}`);
        this.backupHistory = this.backupHistory.filter(b => b.id !== backup.id);
      } catch (error) {
        console.warn(`Error eliminando backup ${backup.id}:`, error);
      }
    }
  }

  private async calculateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getBackupIntervalMs(): number {
    switch (this.config.backupFrequency) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private async readZipJsonFile(zip: any, filename: string): Promise<any> {
    const file = zip.file(filename);
    if (!file) return [];
    
    const text = await file.async('text');
    return JSON.parse(text);
  }
}

// Instancia singleton del sistema de backup
export const backupSystem = BackupSystem.getInstance();

// Funciones de conveniencia para usar en componentes
export const createManualBackup = (description?: string) => 
  backupSystem.createBackup('manual', description);

export const downloadBackupFile = (backup: BackupData, filename?: string) =>
  backupSystem.downloadBackup(backup, filename);

export const restoreFromFile = async (file: File) => {
  const backup = await backupSystem.loadBackupFromFile(file);
  await backupSystem.restoreBackup(backup);
  return backup;
};

export const getBackupHistory = () => backupSystem.getBackupHistory();

export const updateBackupConfig = (config: Partial<BackupConfig>) => 
  backupSystem.updateConfig(config);

export const getBackupConfig = () => backupSystem.getConfig();