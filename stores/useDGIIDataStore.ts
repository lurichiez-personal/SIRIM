import { create } from 'zustand';
import JSZip from 'jszip';
import { findRNC, clearRNCData, appendRNCData, getDBInfo } from '../utils/rnc-database';

type RNCDataStatus = 'idle' | 'checking' | 'downloading' | 'processing' | 'ready' | 'error';

interface DGIIDataState {
  status: RNCDataStatus;
  lastUpdated: number; // timestamp
  recordCount: number;
  errorMessage: string | null;
  loading: boolean; // for compatibility with modals
  progress: number;
  init: () => void;
  triggerUpdate: () => Promise<void>;
  lookupRNC: (rnc: string) => Promise<{ nombre: string, status: string } | null>;
}

const DGII_RNC_URL = 'https://dgii.gov.do/app/WebApps/Consultas/RNC/DGII_RNC.zip';
const PROXY_URL = `https://corsproxy.io/?${encodeURIComponent(DGII_RNC_URL)}`;


export const useDGIIDataStore = create<DGIIDataState>((set, get) => ({
  status: 'idle',
  lastUpdated: 0,
  recordCount: 0,
  errorMessage: null,
  loading: false,
  progress: 0,

  init: async () => {
      set({ status: 'checking' });
      const info = await getDBInfo();
      if (info && info.count > 0) {
          set({ status: 'ready', recordCount: info.count, lastUpdated: info.lastUpdated });
      } else {
          set({ status: 'idle' });
          // If the DB is empty, trigger the update automatically.
          get().triggerUpdate();
      }
  },

  triggerUpdate: async () => {
    set({ status: 'downloading', errorMessage: null, loading: true, progress: 0 });
    try {
      // 1. Download ZIP file
      const response = await fetch(PROXY_URL);
      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.statusText}. El servicio proxy puede estar experimentando problemas. Por favor, intente más tarde.`);
      }
      const zipBlob = await response.blob();
      
      set({ status: 'processing', progress: 5 });

      // 2. Unzip and find the TXT file
      const zip = await JSZip.loadAsync(zipBlob);
      const txtFileName = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.txt'));
      if (!txtFileName) throw new Error('No se encontró el archivo .txt en el ZIP.');
      
      const txtFile = zip.file(txtFileName);
      if (!txtFile) throw new Error('No se pudo leer el archivo .txt.');
      const txtContent = await txtFile.async('text');

      // 3. Parse the content
      const lines = txtContent.split('\n');
      const dataToStore: { rnc: string, name: string, status: string }[] = [];
      lines.forEach(line => {
        const parts = line.split('|');
        // RNC|RAZON SOCIAL|NOMBRE COMERCIAL|CATEGORIA|REGIMEN DE PAGOS|ESTATUS
        const rnc = parts[0]?.trim();
        if (parts.length >= 6 && rnc && (rnc.length === 9 || rnc.length === 11) && /^\d+$/.test(rnc)) {
          dataToStore.push({ rnc, name: parts[1].trim(), status: parts[5].trim() });
        }
      });
      
      set({ progress: 15 });

      // 4. Save to IndexedDB in batches
      await clearRNCData();
      
      const batchSize = 5000;
      const totalBatches = Math.ceil(dataToStore.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
          const batch = dataToStore.slice(i * batchSize, (i + 1) * batchSize);
          await appendRNCData(batch);
          const currentProgress = 15 + Math.round(((i + 1) / totalBatches) * 85);
          set({ progress: currentProgress });
      }

      const updatedTimestamp = Date.now();
      localStorage.setItem('rncDBLastUpdated', updatedTimestamp.toString());

      set({
        status: 'ready',
        lastUpdated: updatedTimestamp,
        recordCount: dataToStore.length,
        loading: false,
        progress: 100,
      });

    } catch (error) {
      console.error("Error al actualizar la base de datos de RNC:", error);
      const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      set({ status: 'error', errorMessage: message, loading: false });
    }
  },

  lookupRNC: async (rnc: string) => {
    set({ loading: true });
    const cleanRNC = rnc.replace(/[^0-9]/g, '');
    if (!cleanRNC) {
        set({ loading: false });
        return null;
    }
    
    try {
      const result = await findRNC(cleanRNC);
      return result ? { nombre: result.name, status: result.status } : null;
    } catch (error) {
      console.error("Error buscando RNC en IndexedDB:", error);
      return null;
    } finally {
      set({ loading: false });
    }
  },
}));

useDGIIDataStore.getState().init();