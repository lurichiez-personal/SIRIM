import { create } from 'zustand';

interface DGIIState {
  loading: boolean;
  lookupRNC: (rnc: string) => Promise<{ nombre: string } | null>;
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

export const useDGIIDataStore = create<DGIIState>((set) => ({
  loading: false,
  lookupRNC: async (rnc: string) => {
    // Sanitize input to only contain numbers
    const cleanRNC = rnc.replace(/[^0-9]/g, '');
    if (!cleanRNC) return null;

    set({ loading: true });
    
    // Simulate async network/DB lookup
    await new Promise(resolve => setTimeout(resolve, 750));
    
    const nombre = mockRNCDatabase[cleanRNC];
    
    set({ loading: false });
    
    if (nombre) {
      return { nombre };
    }
    
    return null;
  },
}));