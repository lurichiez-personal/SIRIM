import { create } from 'zustand';

interface DGIIState {
  loading: boolean;
  lookupRNC: (rnc: string) => Promise<{ nombre: string; estadoDGII?: string } | null>;
}

const DGII_API_URL =
  import.meta.env.VITE_DGII_API_URL ??
  'https://www.dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx';

export const useDGIIDataStore = create<DGIIState>((set) => ({
  loading: false,
  lookupRNC: async (rnc: string) => {
    const cleanRNC = rnc.replace(/[^0-9]/g, '');
    if (!cleanRNC) return null;

    set({ loading: true });
    try {
      const response = await fetch(`${DGII_API_URL}?rnc=${cleanRNC}`);
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const data: any = await response.json();
      const nombre: string | undefined = data?.nombre ?? data?.name;
      const estadoDGII: string | undefined = data?.estadoDGII ?? data?.estado;
      if (nombre) {
        return { nombre, estadoDGII };
      }
      return null;
    } catch (err) {
      console.error('DGII lookup failed', err);
      return null;
    } finally {
      set({ loading: false });
    }
  },
  }));
