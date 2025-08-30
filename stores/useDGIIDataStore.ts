import { create } from 'zustand';

interface DGIIState {
  loading: boolean;
  lookupRNC: (rnc: string) => Promise<{ nombre: string; estadoDGII?: string } | null>;
}

// Data extracted from the user's provided image and existing mocks.
// In a real implementation, this would come from a local DB (IndexedDB)
// populated from the DGII's public data file.
const mockRNCDatabase: Record<string, string> = {
  '13400034305': 'ELVIS NICOLAS ALMONTE ESTEVEZ',
  '00104633805': 'ROSA JULIA SALDAÑA PEREZ DE LEROUX',
  '04800173793': 'LORENZO PERALTA MENDEZ',
  '00105691927': 'DOMINGO ANTONIO RODRIGUEZ MARTE',
  '40235221450': 'LUIS YINO MILANES DE LEON',
  // RNCs from existing mock data
  '130123456': 'Cliente A Corp',
  '131987654': 'Cliente B Industrial',
  '132112233': 'Asociados de Consultoría XYZ',
  '130778899': 'Comercial C & D',
  '132555666': 'Constructora Principal',
  '130999888': 'Proveedor de Oficina S.A.',
  '101555444': 'Compañía Eléctrica del Este',
  '131888777': 'Agencia de Marketing Digital',
  '130111222': 'Alquileres de Espacios Corp.',
};

const DGII_API_URL = import.meta.env.VITE_DGII_API_URL ?? '';

export const useDGIIDataStore = create<DGIIState>((set) => ({
  loading: false,
  lookupRNC: async (rnc: string) => {
    const cleanRNC = rnc.replace(/[^0-9]/g, '');
    if (!cleanRNC) return null;

    set({ loading: true });

    try {
      if (DGII_API_URL) {
        const response = await fetch(`${DGII_API_URL}?rnc=${cleanRNC}`);
        if (response.ok) {
          const data = await response.json();
          set({ loading: false });
          if (data?.nombre) {
            return { nombre: data.nombre, estadoDGII: data.estadoDGII };
          }
          return null;
        }
      }
    } catch (error) {
      console.error('Error fetching DGII data', error);
    }

    const nombre = mockRNCDatabase[cleanRNC];
    set({ loading: false });
    return nombre ? { nombre } : null;
  },
}));