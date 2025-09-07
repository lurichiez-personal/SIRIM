
import React from 'react';
import { AuditLogEntry } from '../../types';

interface AuditTrailProps {
  auditLog: AuditLogEntry[];
}

const AuditTrail: React.FC<AuditTrailProps> = ({ auditLog }) => {
  return (
    <div className="p-4">
      <div className="max-h-80 overflow-y-auto space-y-4 pr-2">
         {auditLog.length === 0 ? (
             <p className="text-sm text-secondary-500 text-center py-4">No hay historial de cambios.</p>
         ) : (
            [...auditLog].reverse().map(entry => (
                <div key={entry.id} className="relative pl-8">
                    <div className="absolute left-3 top-1.5 h-full w-0.5 bg-secondary-200"></div>
                    <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary"></div>
                    <div>
                        <p className="text-sm text-secondary-800">
                            <span className="font-semibold">{entry.userName}</span> {entry.action}
                        </p>
                        <p className="text-xs text-secondary-500">{new Date(entry.timestamp).toLocaleString('es-DO')}</p>
                    </div>
                </div>
            ))
         )}
      </div>
    </div>
  );
};

export default AuditTrail;
