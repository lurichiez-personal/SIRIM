
import { create } from 'zustand';
import { CustomizationSettings } from '../types';
import { apiClient } from '../services/apiClient';

interface SettingsState {
  settings: { [empresaId: number]: CustomizationSettings };
  getSettingsForTenant: (empresaId: number) => CustomizationSettings;
  updateSettings: (empresaId: number, newSettings: Partial<CustomizationSettings>) => Promise<void>;
  fetchSettings: (empresaId: number) => Promise<void>;
}

const defaultSettings = { accentColor: '#005A9C' };

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  
  fetchSettings: async (empresaId) => {
    try {
      const response = await apiClient.get('/settings', { empresaId });
      if (response.data) {
        set(state => ({
          settings: {
            ...state.settings,
            [empresaId]: response.data
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Set default if not found
      set(state => ({
        settings: {
          ...state.settings,
          [empresaId]: { empresaId, ...defaultSettings }
        }
      }));
    }
  },
  
  getSettingsForTenant: (empresaId) => {
    const allSettings = get().settings;
    return allSettings[empresaId] || { empresaId, ...defaultSettings };
  },
  
  updateSettings: async (empresaId, newSettings) => {
    try {
      const settingsData = { empresaId, ...newSettings };
      const response = await apiClient.post('/settings', settingsData);
      
      if (response.data) {
        set(state => ({
          settings: {
            ...state.settings,
            [empresaId]: response.data
          }
        }));
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      // Update locally as fallback
      set(state => ({
        settings: {
          ...state.settings,
          [empresaId]: {
            ...state.settings[empresaId],
            ...newSettings,
            empresaId,
          }
        }
      }));
    }
  }
}));
