import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Rates {
  itbis: number; // e.g., 0.18 for 18%
  isc: number;   // e.g., 0.16 for 16%
  propina: number; // e.g., 0.10 for 10%
}

interface RatesState {
  ratesByCompany: { [empresaId: number]: Rates };
  getRatesForTenant: (empresaId: number) => Rates;
  updateRates: (empresaId: number, newRates: Rates) => void;
}

const defaultRates: Rates = {
  itbis: 0.18,
  isc: 0.16,
  propina: 0.10,
};

export const useRatesStore = create<RatesState>()(
  persist(
    (set, get) => ({
      ratesByCompany: {
          1: defaultRates,
          2: defaultRates,
          3: defaultRates,
      },
      getRatesForTenant: (empresaId) => {
        const rates = get().ratesByCompany[empresaId];
        return rates || defaultRates;
      },
      updateRates: (empresaId, newRates) => {
        set(state => ({
          ratesByCompany: {
            ...state.ratesByCompany,
            [empresaId]: newRates,
          }
        }));
      },
    }),
    {
      name: 'sirim-rates-storage',
    }
  )
);
