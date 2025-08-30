import { create } from 'zustand';

interface DGIIState {
  loading: boolean;
  lookupRNC: (rnc: string) => Promise<{ nombre: string } | null>;
}

// Simple in-memory cache to avoid duplicate lookups during a session
const cache: Record<string, string> = {};

export const useDGIIDataStore = create<DGIIState>((set) => ({
  loading: false,
  lookupRNC: async (rnc: string) => {
    // Normalize: keep only digits
    const cleanRNC = rnc.replace(/\D/g, '');
    if (!cleanRNC) return null;

    // Return from cache if available
    if (cache[cleanRNC]) {
      return { nombre: cache[cleanRNC] };
    }

    set({ loading: true });

    try {
      const res = await fetch(
        `https://www.dgii.gov.do/app/WebApps/Consultas/RNC/DGII_RNC.asmx/ConsultaRNC?RNC=${cleanRNC}`
      );

      if (!res.ok) {
        return null;
      }

      const text = await res.text();
      let nombre: string | undefined;

      try {
        const data = JSON.parse(text);
        nombre =
          data?.nombre ||
          data?.RGE_RAZON_SOCIAL ||
          data?.RGE_NOMBRE_COMERCIAL;
      } catch {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        nombre =
          doc.querySelector('RGE_RAZON_SOCIAL')?.textContent?.trim() ||
          doc.querySelector('RGE_NOMBRE_COMERCIAL')?.textContent?.trim() ||
          undefined;
      }

      if (nombre) {
        cache[cleanRNC] = nombre;
        return { nombre };
      }

      return null;
    } catch {
      return null;
    } finally {
      set({ loading: false });
    }
  },
}));

