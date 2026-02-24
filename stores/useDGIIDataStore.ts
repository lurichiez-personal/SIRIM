import { create } from 'zustand';
import JSZip from 'jszip';
import { db } from '../firebase';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

type RNCDataStatus = 'idle' | 'checking' | 'processing' | 'ready' | 'error';

interface DGIIDataState {
  status: RNCDataStatus;
  lastUpdated: number; // timestamp
  recordCount: number;
  statusMessage: string | null;
  loading: boolean; // for compatibility with modals
  progress: number;
  init: () => void;
  processRNCFile: (file: Blob) => Promise<void>;
  lookupRNC: (rnc: string) => Promise<{ nombre: string, status: string } | null>;
}

export const useDGIIDataStore = create<DGIIDataState>((set, get) => ({
  status: 'idle',
  lastUpdated: 0,
  recordCount: 0,
  statusMessage: null,
  loading: false,
  progress: 0,

  init: async () => {
      set({ status: 'checking' });
      try {
          const metadataRef = doc(db, '_metadata', 'rnc_db');
          const snapshot = await getDoc(metadataRef);
          
          if (snapshot.exists()) {
              const dbInfo = snapshot.data();
              set({
                  status: 'ready',
                  recordCount: dbInfo.count,
                  lastUpdated: dbInfo.lastUpdated,
                  statusMessage: 'Base de datos en la nube está operativa.'
              });
          } else {
              set({ status: 'idle', recordCount: 0, lastUpdated: 0, statusMessage: 'La base de datos de RNC en la nube está vacía. Un administrador debe actualizarla.' });
          }
      } catch (error) {
          console.error("Error initializing RNC store from Firestore:", error);
          set({ status: 'error', statusMessage: 'No se pudo inicializar la base de datos de RNC.' });
      }
  },

  processRNCFile: async (zipBlob: Blob) => {
    set({ status: 'processing', statusMessage: 'Extrayendo archivo...', loading: true, progress: 5 });
    try {
      const zip = await JSZip.loadAsync(zipBlob);
      const txtFileName = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.txt'));
      if (!txtFileName) throw new Error('No se encontró el archivo .txt en el ZIP.');
      
      const txtFile = zip.file(txtFileName);
      if (!txtFile) throw new Error('No se pudo leer el archivo .txt.');
      
      set({ progress: 10, statusMessage: 'Decodificando archivo...' });
      const fileContentAsUint8Array = await txtFile.async('uint8array');
      const decoder = new TextDecoder('windows-1252');
      const txtContent = decoder.decode(fileContentAsUint8Array);

      set({ progress: 25, statusMessage: 'Preparando para analizar...' });
      const lines = txtContent.split(/\r?\n/);
      const dataToStore: { [key: string]: { name: string, status: string } } = {};
      let recordCount = 0;

      // Asynchronous chunk processing to avoid blocking the main thread
      const processChunks = () => new Promise<void>((resolve) => {
        let currentIndex = 0;
        const chunkSize = 50000; // Process 50,000 lines at a time

        function processNextChunk() {
          const end = Math.min(currentIndex + chunkSize, lines.length);
          for (let i = currentIndex; i < end; i++) {
            const line = lines[i];
            const cleanLine = line.trim();
            if (!cleanLine) continue;
            
            const parts = cleanLine.split('|');
            const rnc = parts[0]?.trim();

            if (parts.length >= 10 && rnc && (rnc.length === 9 || rnc.length === 11) && /^\d+$/.test(rnc)) {
              const rawStatus = parts[9]?.trim();
              const status = rawStatus && rawStatus.length > 0 ? rawStatus : 'DESCONOCIDO';
              
              dataToStore[rnc] = { 
                name: (parts[1] || '').trim(),
                status: status 
              };
              recordCount++;
            }
          }

          currentIndex = end;
          const currentProgress = 25 + Math.round((currentIndex / lines.length) * 55);
          set({ progress: currentProgress, statusMessage: `Analizando ${currentIndex.toLocaleString()} de ${lines.length.toLocaleString()} registros...` });

          if (currentIndex < lines.length) {
            setTimeout(processNextChunk, 0); // Yield to main thread to keep UI responsive
          } else {
            resolve();
          }
        }
        
        processNextChunk();
      });

      await processChunks();
      
      set({ progress: 80, statusMessage: 'Guardando nuevos registros en la base de datos... (puede tardar varios minutos)' });
      
      const entries = Object.entries(dataToStore);
      const FIRESTORE_CHUNK_SIZE = 490; // Firestore batch limit is 500 operations
      for (let i = 0; i < entries.length; i += FIRESTORE_CHUNK_SIZE) {
          const chunk = entries.slice(i, i + FIRESTORE_CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const [rnc, data] of chunk) {
              const docRef = doc(db, 'rnc_data', rnc);
              batch.set(docRef, data);
          }
          await batch.commit();
          const currentProgress = 80 + Math.round(((i + chunk.length) / entries.length) * 15);
          const batchNumber = Math.ceil(i / FIRESTORE_CHUNK_SIZE) + 1;
          const totalBatches = Math.ceil(entries.length / FIRESTORE_CHUNK_SIZE);
          set({ progress: currentProgress, statusMessage: `Escribiendo lote ${batchNumber} de ${totalBatches}...` });
      }

      set({ progress: 95, statusMessage: 'Actualizando metadatos...' });
      const now = Date.now();
      const metadataRef = doc(db, '_metadata', 'rnc_db');
      await setDoc(metadataRef, {
          lastUpdated: now,
          count: recordCount,
      });

      set({
        status: 'ready',
        lastUpdated: now,
        recordCount: recordCount,
        loading: false,
        progress: 100,
        statusMessage: '¡Base de datos actualizada con éxito!',
      });

    } catch (error) {
      console.error("Error al procesar el archivo RNC:", error);
      let message = 'Ocurrió un error desconocido durante el procesamiento.';
      if (error instanceof Error) {
        message = error.message;
      }
      set({ status: 'error', statusMessage: `Error: ${message}`, loading: false, progress: 0 });
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
      const rncRef = doc(db, 'rnc_data', cleanRNC);
      const snapshot = await getDoc(rncRef);
      
      if (snapshot.exists()) {
        const result = snapshot.data();
        return { nombre: result.name, status: result.status };
      }
      return null;
    } catch (error) {
      console.error("Error buscando RNC en Firestore:", error);
      return null;
    } finally {
      set({ loading: false });
    }
  },
}));

// Initialize the store on load
useDGIIDataStore.getState().init();