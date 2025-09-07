
import { create } from 'zustand';
import { CustomizationSettings } from '../types';

interface SettingsState {
  settings: { [empresaId: number]: CustomizationSettings };
  getSettingsForTenant: (empresaId: number) => CustomizationSettings;
  updateSettings: (empresaId: number, newSettings: Partial<CustomizationSettings>) => void;
}

const mockSettings: { [empresaId: number]: CustomizationSettings } = {
    1: { empresaId: 1, accentColor: '#005A9C', footerText: 'Gracias por preferir a Empresa A S.R.L.' },
    2: { empresaId: 2, accentColor: '#38A169', footerText: 'Consultores B & Asociados - Su éxito es nuestro compromiso.'},
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: mockSettings,
  getSettingsForTenant: (empresaId) => {
    const allSettings = get().settings;
    return allSettings[empresaId] || { empresaId, accentColor: '#005A9C' };
  },
  updateSettings: (empresaId, newSettings) => {
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
}));
