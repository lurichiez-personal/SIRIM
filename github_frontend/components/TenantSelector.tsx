
import React, { useEffect, useState } from 'react';
import { useTenantStore } from '../stores/useTenantStore';
import { BuildingOfficeIcon, ChevronDownIcon } from './icons/Icons';

const TenantSelector: React.FC = () => {
    const { selectedTenant, availableTenants, setTenant, fetchAvailableTenants } = useTenantStore();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchAvailableTenants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!selectedTenant) {
        return <div className="text-sm text-secondary-500">Cargando empresas...</div>;
    }

    const handleSelect = (tenantId: number) => {
        setTenant(tenantId);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-secondary-100 rounded-md hover:bg-secondary-200 transition-colors duration-200"
            >
                <BuildingOfficeIcon className="h-5 w-5 text-primary" />
                <span className="font-semibold text-secondary-800">{selectedTenant.nombre}</span>
                <ChevronDownIcon className={`h-5 w-5 text-secondary-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-secondary-200">
                    <ul className="py-1">
                        {availableTenants.map(tenant => (
                            <li key={tenant.id}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleSelect(tenant.id); }}
                                    className={`block px-4 py-2 text-sm ${selectedTenant.id === tenant.id ? 'font-bold text-primary bg-primary-50' : 'text-secondary-700 hover:bg-secondary-100'}`}
                                >
                                    {tenant.nombre}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default TenantSelector;