
import React, { useEffect } from 'react';
import { useOfflineStore } from '../../stores/useOfflineStore';

const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, actionQueue, processQueue } = useOfflineStore();

  useEffect(() => {
    if (isOnline && actionQueue.length > 0) {
      processQueue();
    }
  }, [isOnline, actionQueue.length, processQueue]);

  const getIndicatorText = () => {
    if (!isOnline) return "Modo Offline";
    if (isSyncing) return `Sincronizando (${actionQueue.length})...`;
    if (actionQueue.length > 0) return `${actionQueue.length} acciones pendientes`;
    return "En línea";
  };
  
  const getIndicatorColor = () => {
    if (!isOnline) return "bg-red-500";
    if (isSyncing || actionQueue.length > 0) return "bg-yellow-500";
    return "bg-green-500";
  }

  return (
    <div className="flex items-center space-x-2 text-xs font-medium text-white px-2 py-1 rounded-full"
      style={{ backgroundColor: getIndicatorColor() }}
      title={isOnline ? "Conectado" : "Trabajando sin conexión"}
    >
      <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-white' : 'animate-ping bg-white'}`}></span>
      <span>{getIndicatorText()}</span>
    </div>
  );
};

export default OfflineIndicator;
