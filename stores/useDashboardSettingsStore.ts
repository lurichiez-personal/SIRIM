import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const ALL_CARDS = [
    { id: 'kpi_cobrado', title: 'Total Cobrado (Periodo Fiscal)' },
    { id: 'kpi_gastos', title: 'Total Gastos (Periodo Fiscal)' },
    { id: 'kpi_beneficio', title: 'Beneficio/Pérdida (Periodo Fiscal)' },
    { id: 'kpi_por_cobrar', title: 'Cuentas por Cobrar' },
    { id: 'health_activos', title: 'Activos (Estimado)' },
    { id: 'health_anticipo_isr', title: 'Próximo Anticipo ISR' },
    { id: 'health_patrimonio', title: 'Patrimonio (Estimado)' },
    { id: 'health_impuestos', title: 'Proyección Impuestos (Periodo)' },
    { id: 'health_itbis_no_deducible', title: 'ITBIS No Deducible (B02)' },
];

interface DashboardSettingsState {
  hiddenCards: Set<string>;
  toggleCardVisibility: (cardId: string) => void;
}

export const useDashboardSettingsStore = create<DashboardSettingsState>()(
  persist(
    (set) => ({
      hiddenCards: new Set(),
      toggleCardVisibility: (cardId) => {
        set((state) => {
          const newHiddenCards = new Set(state.hiddenCards);
          if (newHiddenCards.has(cardId)) {
            newHiddenCards.delete(cardId);
          } else {
            newHiddenCards.add(cardId);
          }
          return { hiddenCards: newHiddenCards };
        });
      },
    }),
    {
      name: 'sirim-dashboard-settings-storage',
      partialize: (state) => ({ hiddenCards: state.hiddenCards }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            const data = JSON.parse(str);
            return {
              ...data,
              state: {
                ...data.state,
                hiddenCards: new Set(Array.isArray(data.state?.hiddenCards) ? data.state.hiddenCards : []),
              },
            };
          } catch (e) {
            console.error("Error al cargar configuración del dashboard", e);
            return null;
          }
        },
        setItem: (name, newValue) => {
          try {
            // Explicitly convert Set to Array for serialization
            // newValue contains { state: ..., version: ... }
            const serializedValue = {
                ...newValue,
                state: {
                    ...newValue.state,
                    hiddenCards: newValue.state.hiddenCards instanceof Set 
                        ? Array.from(newValue.state.hiddenCards) 
                        : []
                }
            };
            localStorage.setItem(name, JSON.stringify(serializedValue));
          } catch (e) {
            console.error("Error al guardar configuración del dashboard", e);
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);