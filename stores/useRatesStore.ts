import { create } from 'zustand';
import { apiClient } from '../services/apiClient';

interface Rates {
  itbis: number; // e.g., 0.18 for 18%
  isc: number;   // e.g., 0.16 for 16%
  propina: number; // e.g., 0.10 for 10%
}

interface RatesState {
  ratesByCompany: { [empresaId: number]: Rates };
  getRatesForTenant: (empresaId: number) => Rates;
  updateRates: (empresaId: number, newRates: Rates) => Promise<void>;
  fetchRates: (empresaId: number) => Promise<void>;
}

const defaultRates: Rates = {
  itbis: 0.18,
  isc: 0.16,
  propina: 0.10,
};

export const useRatesStore = create<RatesState>((set, get) => ({
  ratesByCompany: {},
  
  fetchRates: async (empresaId) => {
    try {
      const response = await apiClient.getTaxRates(empresaId);
      if (response.data) {
        set(state => ({
          ratesByCompany: {
            ...state.ratesByCompany,
            [empresaId]: {
              itbis: Number(response.data.itbis),
              isc: Number(response.data.isc),
              propina: Number(response.data.propina)
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching tax rates:', error);
      // Set default if not found
      set(state => ({
        ratesByCompany: {
          ...state.ratesByCompany,
          [empresaId]: defaultRates
        }
      }));
    }
  },
  
  getRatesForTenant: (empresaId) => {
    const rates = get().ratesByCompany[empresaId];
    return rates || defaultRates;
  },
  
  updateRates: async (empresaId, newRates) => {
    try {
      const ratesData = { empresaId, ...newRates };
      const response = await apiClient.updateTaxRates(ratesData);
      
      if (response.data) {
        set(state => ({
          ratesByCompany: {
            ...state.ratesByCompany,
            [empresaId]: {
              itbis: Number(response.data.itbis),
              isc: Number(response.data.isc),
              propina: Number(response.data.propina)
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error updating tax rates:', error);
      // Update locally as fallback
      set(state => ({
        ratesByCompany: {
          ...state.ratesByCompany,
          [empresaId]: newRates,
        }
      }));
    }
  },
}));
