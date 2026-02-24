import React from 'react';
import Modal from '../../components/ui/Modal';
import { useDashboardSettingsStore, ALL_CARDS } from '../../stores/useDashboardSettingsStore';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import Button from '../../components/ui/Button';

interface CustomizeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomizeDashboardModal: React.FC<CustomizeDashboardModalProps> = ({ isOpen, onClose }) => {
  const { hiddenCards, toggleCardVisibility } = useDashboardSettingsStore();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personalizar Dashboard">
      <div className="p-6">
        <p className="text-sm text-secondary-600 mb-4">Seleccione las tarjetas que desea mostrar en el dashboard.</p>
        <div className="space-y-3">
          {ALL_CARDS.map(card => (
            <ToggleSwitch
              key={card.id}
              id={`toggle-${card.id}`}
              label={card.title}
              checked={!hiddenCards.has(card.id)}
              onChange={() => toggleCardVisibility(card.id)}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end p-4 bg-secondary-50 border-t">
        <Button onClick={onClose}>Hecho</Button>
      </div>
    </Modal>
  );
};

export default CustomizeDashboardModal;
